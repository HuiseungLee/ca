import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { requireProfile } from "@/lib/auth";

export async function PUT(request: Request) {
  const authenticated = await requireProfile(request);
  if (!authenticated) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const input = await request.json() as { displayName?: string; career?: string; interests?: string[] };
  const displayName = input.displayName?.trim();
  const career = input.career?.trim();
  if (!displayName || !career) return Response.json({ error: "이름과 희망 진로를 입력해 주세요." }, { status: 400 });
  await getDb().update(profiles).set({ displayName, career, interests: (input.interests ?? []).filter(Boolean).slice(0, 10), updatedAt: new Date().toISOString() }).where(eq(profiles.id, authenticated.profile.id));
  const [profile] = await getDb().select().from(profiles).where(eq(profiles.id, authenticated.profile.id)).limit(1);
  return Response.json({ profile });
}
