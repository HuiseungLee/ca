import { desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { activities } from "@/db/schema";
import { analyzeActivity } from "@/lib/analyze-activity";
import { getSharedUserFromRequest } from "@/lib/supabase-auth";

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "결과물을 처리하지 못했습니다.";
  if (message.includes("no such table")) return "활동 저장소를 준비하는 중입니다. 잠시 후 다시 시도해 주세요.";
  return message;
}

export async function GET(request: Request) {
  try {
    const user = await getSharedUserFromRequest(request);
    if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const query = getDb().select().from(activities);
    const rows = user.role === "teacher"
      ? await query.orderBy(desc(activities.createdAt)).limit(50)
      : await query.where(eq(activities.ownerId, user.id)).orderBy(desc(activities.createdAt)).limit(50);
    return Response.json({ activities: rows });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSharedUserFromRequest(request);
    if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    if (user.role !== "student") return Response.json({ error: "학생 계정만 결과물을 등록할 수 있습니다." }, { status: 403 });
    const form = await request.formData();
    const title = String(form.get("title") ?? "").trim();
    const career = String(form.get("career") ?? "").trim();
    const summary = String(form.get("summary") ?? "").trim();
    const category = String(form.get("category") ?? "자율 탐구").trim();
    const file = form.get("file");
    if (!title || !career || !summary) return Response.json({ error: "제목, 진로 분야, 핵심 내용을 모두 입력해 주세요." }, { status: 400 });
    if (file instanceof File && file.size > 20 * 1024 * 1024) return Response.json({ error: "파일은 20MB 이하만 첨부할 수 있습니다." }, { status: 400 });
    const id = crypto.randomUUID();
    let fileKey: string | null = null;
    let fileName: string | null = null;
    if (file instanceof File && file.size > 0) {
      fileKey = `activities/${id}/${file.name.replace(/[^\p{L}\p{N}._-]/gu, "-")}`;
      fileName = file.name;
      await env.BUCKET.put(fileKey, await file.arrayBuffer(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
    }
    const analysis = analyzeActivity(title, summary, career);
    const [activity] = await getDb().insert(activities).values({ id, ownerId: user.id, studentName: user.displayName, title, category, career, summary, fileKey, fileName, ...analysis }).returning();
    return Response.json({ activity }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
