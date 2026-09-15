import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { getSharedUserFromRequest } from "@/lib/supabase-auth";

export async function ensureProfile(request: Request) {
  const user = await getSharedUserFromRequest(request);
  if (!user) return null;
  const db = getDb();
  const [existing] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  const values = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    career: existing?.career ?? "진로 탐색 중",
    interests: existing?.interests ?? [],
    updatedAt: new Date().toISOString(),
  };
  await db.insert(profiles).values(values).onConflictDoUpdate({
    target: profiles.id,
    set: { email: values.email, displayName: values.displayName, role: values.role, updatedAt: values.updatedAt },
  });
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  return { user, profile };
}

export async function requireProfile(request: Request, role?: "teacher") {
  const authenticated = await ensureProfile(request);
  if (!authenticated || role && authenticated.profile.role !== role) return null;
  return authenticated;
}
