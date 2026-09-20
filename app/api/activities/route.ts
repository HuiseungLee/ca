import { desc, eq, inArray } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { getDb } from "@/db";
import { activities, profiles } from "@/db/schema";
import { analyzeActivity } from "@/lib/analyze-activity";
import { requireProfile } from "@/lib/auth";
import { submissionForm } from "@/lib/form-access";
import { individualActivityForm } from "@/lib/default-content";

const contentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  answers: z
    .record(z.string().max(12000))
    .refine((answers) => Object.keys(answers).length <= 30),
  parentActivityIds: z.array(z.string()).max(10).default([]),
});
async function validateParents(
  ids: string[],
  ownerId: string,
  current?: typeof activities.$inferSelect,
) {
  if (!ids.length) return [];
  const rows = await getDb()
    .select()
    .from(activities)
    .where(inArray(activities.id, [...new Set(ids)]));
  if (
    rows.length !== new Set(ids).size ||
    rows.some(
      (row) =>
        row.ownerId !== ownerId ||
        row.id === current?.id ||
        (current && new Date(row.createdAt) > new Date(current.createdAt)),
    )
  )
    throw new Error("이전에 작성한 본인의 활동만 연결할 수 있습니다.");
  if (current) {
    const own = await getDb()
      .select()
      .from(activities)
      .where(eq(activities.ownerId, ownerId));
    const parents = new Map(own.map((row) => [row.id, row.parentActivityIds]));
    const queue = [...ids];
    const visited = new Set<string>();
    while (queue.length) {
      const id = queue.pop()!;
      if (id === current.id)
        throw new Error(
          "이전에 작성한 활동과 순환하는 연결은 저장할 수 없습니다.",
        );
      if (visited.has(id)) continue;
      visited.add(id);
      queue.push(...(parents.get(id) ?? []));
    }
  }
  return rows.map((row) => row.id);
}
export async function GET(request: Request) {
  try {
    const auth = await requireProfile(request);
    if (!auth)
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const studentId = new URL(request.url).searchParams.get("studentId");
    const ownerId =
      auth.profile.role === "teacher" ? studentId : auth.profile.id;
    const rows = await getDb()
      .select()
      .from(activities)
      .where(ownerId ? eq(activities.ownerId, ownerId) : undefined)
      .orderBy(desc(activities.createdAt));
    const people =
      auth.profile.role === "teacher"
        ? await getDb().select().from(profiles)
        : [auth.profile];
    return Response.json(
      {
        activities: rows.map((row) => {
          const profile = people.find((person) => person.id === row.ownerId);
          return {
            ...row,
            ...analyzeActivity(
              row.title,
              row.summary,
              profile?.career ?? row.career,
            ),
            career: profile?.career ?? row.career,
          };
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "결과물을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    );
  }
}
export async function PUT(request: Request) {
  try {
    const auth = await requireProfile(request);
    if (!auth)
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const input = z
      .object({ id: z.string() })
      .and(contentSchema)
      .safeParse(await request.json());
    if (!input.success)
      return Response.json(
        { error: "제목·답변·연결 활동을 확인해 주세요." },
        { status: 400 },
      );
    const [existing] = await getDb()
      .select()
      .from(activities)
      .where(eq(activities.id, input.data.id))
      .limit(1);
    if (!existing || existing.ownerId !== auth.profile.id)
      return Response.json(
        { error: "본인의 결과물만 수정할 수 있습니다." },
        { status: 403 },
      );
    const { title, answers } = input.data;
    if (
      existing.questionSnapshot.some(
        (question) => question.required && !answers[question.id]?.trim(),
      )
    )
      return Response.json(
        { error: "필수 문항에 답변해 주세요." },
        { status: 400 },
      );
    const summary = Object.values(answers).filter(Boolean).join("\n\n");
    if (!summary.trim())
      return Response.json(
        { error: "활동 내용을 입력해 주세요." },
        { status: 400 },
      );
    const parentActivityIds = await validateParents(
      input.data.parentActivityIds,
      existing.ownerId,
      existing,
    );
    const [activity] = await getDb()
      .update(activities)
      .set({
        title,
        answers,
        summary,
        parentActivityIds,
        career: auth.profile.career,
        revisedAt: new Date().toISOString(),
        ...analyzeActivity(title, summary, auth.profile.career),
      })
      .where(eq(activities.id, existing.id))
      .returning();
    return Response.json({ activity });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error && error.message.startsWith("이전에")
            ? error.message
            : "수정 내용을 저장하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
export async function POST(request: Request) {
  let uploadedKey: string | null = null;
  try {
    const auth = await requireProfile(request);
    if (!auth)
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const data = await request.formData();
    const form = await submissionForm(
      String(data.get("formId") ?? individualActivityForm.id),
      auth.profile,
    );
    if (!form)
      return Response.json(
        { error: "배포받은 활동지에만 제출할 수 있습니다." },
        { status: 403 },
      );
    const parsed = contentSchema.safeParse({
      title: data.get("title"),
      answers: JSON.parse(String(data.get("answers") ?? "{}")),
      parentActivityIds: JSON.parse(
        String(data.get("parentActivityIds") ?? "[]"),
      ),
    });
    if (!parsed.success)
      return Response.json(
        { error: "제목과 답변을 확인해 주세요." },
        { status: 400 },
      );
    const { title, answers } = parsed.data;
    if (
      form.questions.some(
        (question) => question.required && !answers[question.id]?.trim(),
      )
    )
      return Response.json(
        { error: "필수 문항에 답변해 주세요." },
        { status: 400 },
      );
    const summary = Object.values(answers).filter(Boolean).join("\n\n");
    if (!summary.trim())
      return Response.json(
        { error: "활동 내용을 입력해 주세요." },
        { status: 400 },
      );
    const parentActivityIds = await validateParents(
      parsed.data.parentActivityIds,
      auth.profile.id,
    );
    const id = crypto.randomUUID();
    const file = data.get("file");
    let fileName: string | null = null;
    if (file instanceof File && file.size) {
      if (file.size > 20 * 1024 * 1024)
        return Response.json(
          { error: "파일은 20MB 이하만 첨부할 수 있습니다." },
          { status: 400 },
        );
      if (!env.BUCKET)
        return Response.json(
          { error: "파일 저장소에 연결하지 못했습니다." },
          { status: 503 },
        );
      uploadedKey = `activities/${id}/${file.name.replace(/[^\p{L}\p{N}._-]/gu, "-")}`;
      fileName = file.name;
      await env.BUCKET.put(uploadedKey, await file.arrayBuffer(), {
        httpMetadata: { contentType: "application/octet-stream" },
      });
    }
    const career = auth.profile.career;
    const [activity] = await getDb()
      .insert(activities)
      .values({
        id,
        createdAt: new Date().toISOString(),
        ownerId: auth.profile.id,
        studentName: auth.profile.displayName,
        formId: form.id,
        title,
        category: form.category,
        career,
        summary,
        answers,
        questionSnapshot: form.questions,
        parentActivityIds,
        fileKey: uploadedKey,
        fileName,
        ...analyzeActivity(title, summary, career),
      })
      .returning();
    return Response.json({ activity }, { status: 201 });
  } catch (error) {
    if (uploadedKey && env.BUCKET)
      await env.BUCKET.delete(uploadedKey).catch(() => undefined);
    return Response.json(
      {
        error:
          error instanceof Error && error.message.startsWith("이전에")
            ? error.message
            : "활동을 저장하지 못했습니다. 입력한 내용을 확인하고 다시 시도해 주세요.",
      },
      { status: 400 },
    );
  }
}
