import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { inquiryWorkflows, projects } from "@/db/schema";
import { requireProfile } from "@/lib/auth";
import { env } from "cloudflare:workers";

function visibleProject(project: typeof projects.$inferSelect, profile: { id: string; role: string }) {
  return profile.role === "teacher" ? project : { ...project, createdBy: "", applicantIds: project.applicantIds.filter((id) => id === profile.id), selectedIds: project.selectedIds.filter((id) => id === profile.id) };
}

export async function GET(request: Request) {
  const authenticated = await requireProfile(request);
  if (!authenticated) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const rows = await getDb().select().from(projects).orderBy(desc(projects.createdAt)).limit(100);
  return Response.json({ projects: rows.map((project) => visibleProject(project, authenticated.profile)) });
}

export async function POST(request: Request) {
  const authenticated = await requireProfile(request);
  if (!authenticated) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const input = await request.json() as { action?: string; id?: string; title?: string; description?: string };
  if (input.action === "apply") {
    const [project] = await getDb().select().from(projects).where(eq(projects.id, input.id ?? "")).limit(1);
    if (!project || project.status !== "open") return Response.json({ error: "신청할 수 없는 프로젝트입니다." }, { status: 400 });
    const [workflow] = await getDb().select().from(inquiryWorkflows).where(eq(inquiryWorkflows.projectId, project.id)).limit(1);
    if (workflow?.archived) return Response.json({ error: "보관된 프로젝트는 신청할 수 없습니다." }, { status: 409 });
    if (!env.DB) return Response.json({ error: "저장소에 연결하지 못했습니다." }, { status: 503 });
    await env.DB.prepare("UPDATE projects SET applicant_ids = json_insert(applicant_ids, '$[#]', ?), updated_at = ? WHERE id = ? AND status = 'open' AND NOT EXISTS (SELECT 1 FROM json_each(projects.applicant_ids) WHERE value = ?)").bind(authenticated.profile.id, new Date().toISOString(), project.id, authenticated.profile.id).run();
    const [updated] = await getDb().select().from(projects).where(eq(projects.id, project.id)).limit(1);
    return Response.json({ project: visibleProject(updated, authenticated.profile) });
  }
  if (authenticated.profile.role !== "teacher") return Response.json({ error: "교사 계정만 프로젝트를 만들 수 있습니다." }, { status: 403 });
  if (!input.title?.trim()) return Response.json({ error: "프로젝트 이름을 입력해 주세요." }, { status: 400 });
  const id = input.id || crypto.randomUUID();
  const values = { id, title: input.title.trim(), description: input.description?.trim() ?? "", createdBy: authenticated.profile.id, updatedAt: new Date().toISOString() };
  await getDb().insert(projects).values(values).onConflictDoUpdate({ target: projects.id, set: values });
  const [project] = await getDb().select().from(projects).where(eq(projects.id, id)).limit(1);
  return Response.json({ project }, { status: input.id ? 200 : 201 });
}

export async function PUT(request: Request) {
  const authenticated = await requireProfile(request, "teacher");
  if (!authenticated) return Response.json({ error: "교사 계정만 선발할 수 있습니다." }, { status: 403 });
  const input = await request.json() as { id?: string; selectedIds?: string[]; status?: string };
  const [project] = await getDb().select().from(projects).where(eq(projects.id, input.id ?? "")).limit(1);
  if (!project) return Response.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  const [workflow] = await getDb().select().from(inquiryWorkflows).where(eq(inquiryWorkflows.projectId, project.id)).limit(1);
  if (workflow?.archived) return Response.json({ error: "탐구 프로젝트 운영에서 보관을 해제한 뒤 선발을 변경해 주세요." }, { status: 409 });
  const selectedIds = [...new Set(input.selectedIds ?? [])].filter((id) => project.applicantIds.includes(id));
  await getDb().update(projects).set({ selectedIds, status: input.status === "closed" ? "closed" : "open", updatedAt: new Date().toISOString() }).where(eq(projects.id, project.id));
  return Response.json({ project: { ...project, selectedIds, status: input.status === "closed" ? "closed" : "open" } });
}
