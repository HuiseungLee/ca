import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { activityForms, type FormQuestion } from "@/db/schema";
import { requireProfile } from "@/lib/auth";
import { defaultActivityForm } from "@/lib/default-content";

function validQuestions(value: unknown): FormQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const row = item as Partial<FormQuestion>;
    return { id: row.id || `q-${index + 1}`, label: String(row.label ?? "").trim(), type: row.type === "short_text" ? "short_text" : "long_text", required: Boolean(row.required), placeholder: String(row.placeholder ?? "") } as FormQuestion;
  }).filter((item) => item.label).slice(0, 20);
}

export async function GET(request: Request) {
  try {
    const isPublic = new URL(request.url).searchParams.get("public") === "1";
    if (!isPublic && !await requireProfile(request)) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const rows = await getDb().select().from(activityForms)
      .where(isPublic ? eq(activityForms.status, "published") : undefined)
      .orderBy(desc(activityForms.updatedAt)).limit(50);
    return Response.json({ forms: rows.length ? rows : [defaultActivityForm] });
  } catch (error) {
    return Response.json({ forms: [defaultActivityForm], warning: error instanceof Error ? error.message : "기본 양식을 표시합니다." });
  }
}

export async function POST(request: Request) {
  const authenticated = await requireProfile(request, "teacher");
  if (!authenticated) return Response.json({ error: "교사 계정만 양식을 저장할 수 있습니다." }, { status: 403 });
  const input = await request.json() as { id?: string; title?: string; description?: string; category?: string; status?: string; questions?: unknown };
  const questions = validQuestions(input.questions);
  if (!input.title?.trim() || !questions.length) return Response.json({ error: "양식 제목과 문항을 한 개 이상 입력해 주세요." }, { status: 400 });
  const id = input.id?.trim() || crypto.randomUUID();
  const values = { id, title: input.title.trim(), description: input.description?.trim() ?? "", category: input.category?.trim() || "공통 활동지", status: input.status === "published" ? "published" : "draft", questions, updatedBy: authenticated.profile.id, updatedAt: new Date().toISOString() };
  await getDb().insert(activityForms).values(values).onConflictDoUpdate({ target: activityForms.id, set: values });
  const [form] = await getDb().select().from(activityForms).where(eq(activityForms.id, id)).limit(1);
  return Response.json({ form }, { status: input.id ? 200 : 201 });
}
