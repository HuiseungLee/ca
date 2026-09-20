import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activities } from "@/db/schema";
import { requireProfile } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const auth = await requireProfile(request, "teacher");
    if (!auth) return Response.json({ error: "교사만 피드백을 작성할 수 있습니다." }, { status: 403 });
    const parsed = z.object({ id: z.string(), teacherFeedback: z.string().trim().max(6000) }).safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "피드백은 6,000자 이내로 입력해 주세요." }, { status: 400 });
    const [activity] = await getDb().update(activities).set({ teacherFeedback: parsed.data.teacherFeedback, feedbackBy: auth.profile.displayName, feedbackAt: new Date().toISOString() }).where(eq(activities.id, parsed.data.id)).returning();
    return activity ? Response.json({ activity }) : Response.json({ error: "활동을 찾지 못했습니다." }, { status: 404 });
  } catch (error) { console.error("Feedback storage failed", error instanceof Error ? error.name : "Unknown error"); return Response.json({ error: "피드백을 저장하지 못했습니다. 입력한 내용을 유지하고 다시 시도해 주세요." }, { status: 500 }); }
}
