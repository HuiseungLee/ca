import { resolvedSupabasePublicConfig } from "@/lib/supabase-auth";

export async function GET() {
  const config = await resolvedSupabasePublicConfig();
  return Response.json({ ...config, configured: Boolean(config.url && config.key) });
}
