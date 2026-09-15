import { ensureProfile } from "@/lib/auth";

export async function GET(request: Request) {
  const authenticated = await ensureProfile(request);
  return Response.json({ user: authenticated?.user ?? null, profile: authenticated?.profile ?? null }, { status: authenticated ? 200 : 401 });
}
