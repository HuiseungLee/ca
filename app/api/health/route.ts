import { env } from "cloudflare:workers";
import { accountServiceAvailable } from "@/lib/supabase-auth";

export async function GET() {
  try {
    if (!env.DB || !env.BUCKET) throw new Error("Storage unavailable");
    const [database, accountService, , inquirySchema] = await Promise.all([
      env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>(),
      accountServiceAvailable(),
      env.BUCKET.list({ limit: 1 }),
      env.DB.prepare(
        "SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name IN ('inquiry_workflows', 'inquiry_teams', 'inquiry_entries', 'inquiry_comments')",
      ).first<{ count: number }>(),
    ]);
    if (database?.ok !== 1) throw new Error("Database check failed");
    if (inquirySchema?.count !== 4)
      throw new Error("Inquiry schema unavailable");
    return Response.json({
      status: accountService ? "ok" : "degraded",
      database: true,
      uploads: true,
      accountService,
      inquiryProjects: true,
      schemaVersion: 6,
    });
  } catch {
    return Response.json(
      {
        status: "unavailable",
        database: false,
        uploads: false,
        accountService: false,
      },
      { status: 503 },
    );
  }
}
