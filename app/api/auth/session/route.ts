import { getSharedUserFromRequest } from "@/lib/supabase-auth";

export async function GET(request: Request) { return Response.json({ user: await getSharedUserFromRequest(request) }); }
