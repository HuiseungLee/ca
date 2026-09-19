import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { requireProfile } from "@/lib/auth";

export async function GET(request: Request) {
  const authenticated = await requireProfile(request);
  if (!authenticated) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  return Response.json({ projects: await getDb().select().from(projects).orderBy(desc(projects.createdAt)).limit(100) });
}

export async function POST(request: Request) {
  const authenticated = await requireProfile(request);
  if (!authenticated) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const input = await request.json() as { action?: string; id?: string; title?: string; description?: string };
  if (input.action === "apply") {
    const [project] = await getDb().select().from(projects).where(eq(projects.id, input.id ?? "")).limit(1);
    if (!project || project.status !== "open") return Response.json({ error: "신청할 수 없는 프로젝트입니다." }, { status: 400 });
    const applicantIds = [...new Set([...project.applicantIds, authenticated.profile.id])];
    await getDb().update(projects).set({ applicantIds, updatedAt: new Date().toISOString() }).where(eq(projects.id, project.id));
    return Response.json({ project: { ...project, applicantIds } });
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
  const selectedIds = [...new Set(input.selectedIds ?? [])].filter((id) => project.applicantIds.includes(id));
  await getDb().update(projects).set({ selectedIds, status: input.status === "closed" ? "closed" : "open", updatedAt: new Date().toISOString() }).where(eq(projects.id, project.id));
  return Response.json({ project: { ...project, selectedIds, status: input.status === "closed" ? "closed" : "open" } });
}
