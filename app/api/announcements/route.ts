import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { announcements } from "@/db/schema";
import { requireProfile } from "@/lib/auth";

const fallback = [
  { id: "notice-default", title: "2학기 진로 연계 활동 보고서 안내", content: "수업·동아리·자율 활동 중 진로와 연결해 탐구한 경험을 기록해 주세요.", status: "published", createdAt: "2026-09-15 00:00:00" },
];

export async function GET(request: Request) {
  try {
    const teacher = new URL(request.url).searchParams.get("all") === "1" ? await requireProfile(request, "teacher") : null;
    const rows = await getDb().select().from(announcements).where(teacher ? undefined : eq(announcements.status, "published")).orderBy(desc(announcements.createdAt)).limit(30);
    return Response.json({ announcements: rows.length ? rows : fallback });
  } catch { return Response.json({ announcements: fallback }); }
}

export async function POST(request: Request) {
  const authenticated = await requireProfile(request, "teacher");
  if (!authenticated) return Response.json({ error: "교사 계정만 공지사항을 작성할 수 있습니다." }, { status: 403 });
  const input = await request.json() as { id?: string; title?: string; content?: string; status?: string };
  if (!input.title?.trim() || !input.content?.trim()) return Response.json({ error: "제목과 내용을 입력해 주세요." }, { status: 400 });
  const id = input.id || crypto.randomUUID();
  const values = { id, title: input.title.trim(), content: input.content.trim(), status: input.status === "draft" ? "draft" : "published", authorId: authenticated.profile.id, updatedAt: new Date().toISOString() };
  await getDb().insert(announcements).values(values).onConflictDoUpdate({ target: announcements.id, set: values });
  const [announcement] = await getDb().select().from(announcements).where(eq(announcements.id, id)).limit(1);
  return Response.json({ announcement }, { status: input.id ? 200 : 201 });
}
