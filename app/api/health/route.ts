import { env } from "cloudflare:workers";
import { accountServiceAvailable } from "@/lib/supabase-auth";

export async function GET() {
  try {
    const [database, accountService] = await Promise.all([
      env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>(),
      accountServiceAvailable(),
      env.BUCKET.list({ limit: 1 }),
    ]);
    if (database?.ok !== 1) throw new Error("Database check failed");
    return Response.json({ status: accountService ? "ok" : "degraded", database: true, uploads: true, accountService });
  } catch {
    return Response.json({ status: "unavailable", database: false, uploads: false, accountService: false }, { status: 503 });
  }
}
