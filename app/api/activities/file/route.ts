import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { activities } from "@/db/schema";
import { requireProfile } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireProfile(request);
  if (!auth) return new Response("로그인이 필요합니다.", { status: 401 });
  const [activity] = await getDb().select().from(activities).where(eq(activities.id, new URL(request.url).searchParams.get("id") ?? "")).limit(1);
  if (!activity || (auth.profile.role !== "teacher" && activity.ownerId !== auth.profile.id)) return new Response("접근 권한이 없습니다.", { status: 403 });
  const file = activity.fileKey && env.BUCKET ? await env.BUCKET.get(activity.fileKey) : null;
  if (!file) return new Response("첨부파일을 찾지 못했습니다.", { status: 404 });
  return new Response(file.body, { headers: { "content-type": "application/octet-stream", "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(activity.fileName ?? "report")}`, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}
