import { env } from "cloudflare:workers";

export async function GET() {
  try {
    const database = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
    await env.BUCKET.list({ limit: 1 });
    if (database?.ok !== 1) throw new Error("Database check failed");
    return Response.json({ status: "ok", database: true, uploads: true });
  } catch {
    return Response.json({ status: "unavailable", database: false, uploads: false }, { status: 503 });
  }
}
