import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { activities, profiles } from "@/db/schema";
import { requireProfile } from "@/lib/auth";
import { analyzeActivity } from "@/lib/analyze-activity";

export async function GET(request: Request) {
  const authenticated = await requireProfile(request, "teacher");
  if (!authenticated) return Response.json({ error: "교사 계정만 학생 목록을 볼 수 있습니다." }, { status: 403 });
  const students = await getDb().select().from(profiles).where(eq(profiles.role, "student")).orderBy(desc(profiles.updatedAt)).limit(200);
  const rows = await getDb().select().from(activities).orderBy(desc(activities.createdAt));
  return Response.json({ students: students.map((student) => ({ ...student, activities: rows.filter((activity) => activity.ownerId === student.id).map((activity) => ({ ...activity, ...analyzeActivity(activity.title, activity.summary, student.career), career: student.career })) })) });
}
