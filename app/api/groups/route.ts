import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { studentGroups } from "@/db/schema";
import { requireProfile } from "@/lib/auth";

export async function GET(request: Request) {
  const authenticated = await requireProfile(request, "teacher");
  if (!authenticated) return Response.json({ error: "교사 계정만 그룹을 관리할 수 있습니다." }, { status: 403 });
  return Response.json({ groups: await getDb().select().from(studentGroups).orderBy(desc(studentGroups.updatedAt)).limit(100) });
}

export async function POST(request: Request) {
  const authenticated = await requireProfile(request, "teacher");
  if (!authenticated) return Response.json({ error: "교사 계정만 그룹을 관리할 수 있습니다." }, { status: 403 });
  const input = await request.json() as { id?: string; name?: string; memberIds?: string[] };
  if (!input.name?.trim()) return Response.json({ error: "그룹 이름을 입력해 주세요." }, { status: 400 });
  const id = input.id || crypto.randomUUID();
  const values = { id, name: input.name.trim(), memberIds: [...new Set(input.memberIds ?? [])], createdBy: authenticated.profile.id, updatedAt: new Date().toISOString() };
  await getDb().insert(studentGroups).values(values).onConflictDoUpdate({ target: studentGroups.id, set: values });
  const [group] = await getDb().select().from(studentGroups).where(eq(studentGroups.id, id)).limit(1);
  return Response.json({ group }, { status: input.id ? 200 : 201 });
}
