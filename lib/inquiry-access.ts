import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  inquiryComments,
  inquiryEntries,
  inquiryTeams,
  inquiryWorkflows,
  profiles,
  projects,
} from "@/db/schema";
import type {
  InquiryBoard,
  InquiryEntry,
  InquiryProject,
  StageSettings,
} from "@/lib/inquiry";

export type InquiryProfile = { id: string; role: string; displayName: string };
export type InquiryContext = {
  project: typeof projects.$inferSelect;
  workflow: typeof inquiryWorkflows.$inferSelect;
  teams: (typeof inquiryTeams.$inferSelect)[];
};
export class InquiryError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function inquiryJson(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
export function inquiryFailure(error: unknown) {
  if (error instanceof InquiryError)
    return inquiryJson({ error: error.message }, error.status);
  return inquiryJson(
    {
      error: "탐구 프로젝트를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    },
    503,
  );
}
export function assertInquiryOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (origin &&
      ![
        new URL(request.url).origin,
        "https://ca.lhsstart.synology.me",
      ].includes(origin))
  )
    throw new InquiryError("같은 사이트에서 다시 시도해 주세요.", 403);
}
export function assertTeacher(profile: InquiryProfile) {
  if (profile.role !== "teacher")
    throw new InquiryError("교사 계정만 프로젝트를 관리할 수 있습니다.", 403);
}
export async function inquiryContext(
  projectId: string,
  profile: InquiryProfile,
  requireMembership = true,
): Promise<InquiryContext> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(projects)
    .innerJoin(inquiryWorkflows, eq(inquiryWorkflows.projectId, projects.id))
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!row) throw new InquiryError("탐구 프로젝트를 찾을 수 없습니다.", 404);
  if (
    requireMembership &&
    profile.role !== "teacher" &&
    !row.projects.selectedIds.includes(profile.id)
  )
    throw new InquiryError(
      "참가자로 선발된 뒤 활동 공간에 들어갈 수 있습니다.",
      403,
    );
  const teams = await db
    .select()
    .from(inquiryTeams)
    .where(eq(inquiryTeams.projectId, projectId));
  return { project: row.projects, workflow: row.inquiry_workflows, teams };
}
export function assertWritable(context: InquiryContext) {
  if (context.workflow.archived)
    throw new InquiryError(
      "보관된 프로젝트입니다. 교사가 다시 열면 활동할 수 있습니다.",
      409,
    );
}
export function visibleInquiryProject(
  context: Pick<InquiryContext, "project" | "workflow">,
  profile: InquiryProfile,
): InquiryProject {
  const { project, workflow } = context;
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status,
    applicantIds:
      profile.role === "teacher"
        ? project.applicantIds
        : project.applicantIds.filter((id) => id === profile.id),
    selectedIds:
      profile.role === "teacher"
        ? project.selectedIds
        : project.selectedIds.filter((id) => id === profile.id),
    stages: workflow.stages as StageSettings[],
    archived: workflow.archived,
  };
}
export function canReadInquiryEntry(
  entry: typeof inquiryEntries.$inferSelect,
  context: InquiryContext,
  profile: InquiryProfile,
) {
  if (entry.projectId !== context.project.id) return false;
  if (profile.role === "teacher") return true;
  if (!context.project.selectedIds.includes(profile.id)) return false;
  if (entry.stageId === "reflection") return entry.ownerId === profile.id;
  const team = context.teams.find((item) => item.id === entry.teamId);
  return (
    !!team && (team.memberIds.includes(profile.id) || entry.status !== "draft")
  );
}
export function assertEntryWriter(
  entry: typeof inquiryEntries.$inferSelect,
  context: InquiryContext,
  profile: InquiryProfile,
) {
  if (!context.project.selectedIds.includes(profile.id))
    throw new InquiryError("프로젝트 참가자만 작성할 수 있습니다.", 403);
  if (entry.stageId === "reflection") {
    if (entry.ownerId !== profile.id)
      throw new InquiryError("본인의 성찰만 작성할 수 있습니다.", 403);
  } else {
    const team = context.teams.find((item) => item.id === entry.teamId);
    if (
      !team ||
      team.representativeId !== profile.id ||
      !team.memberIds.includes(profile.id)
    )
      throw new InquiryError(
        "모둠 대표만 모둠 활동을 저장할 수 있습니다.",
        403,
      );
  }
}
export function serializeInquiryEntry(
  entry: typeof inquiryEntries.$inferSelect,
): InquiryEntry {
  return {
    id: entry.id,
    projectId: entry.projectId,
    teamId: entry.teamId,
    ownerId: entry.stageId === "reflection" ? entry.ownerId : null,
    stageId: entry.stageId as InquiryEntry["stageId"],
    answers: entry.answers,
    status: entry.status as InquiryEntry["status"],
    version: entry.version,
    feedback: entry.reviewHistory.map((review) => ({
      text: review.feedback,
      authorName: review.authorName,
      createdAt: review.createdAt,
      status: review.status as "revision" | "approved",
    })),
    fileName: entry.fileName,
    updatedAt: entry.updatedAt,
  };
}
export async function inquiryBoard(
  context: InquiryContext,
  profile: InquiryProfile,
): Promise<InquiryBoard> {
  const db = getDb();
  const entries = await db
    .select()
    .from(inquiryEntries)
    .where(eq(inquiryEntries.projectId, context.project.id));
  const comments = await db
    .select()
    .from(inquiryComments)
    .where(eq(inquiryComments.projectId, context.project.id))
    .orderBy(desc(inquiryComments.createdAt));
  const visibleEntries = entries.filter((entry) =>
    canReadInquiryEntry(entry, context, profile),
  );
  const sharedTeamIds = new Set(
    visibleEntries
      .filter(
        (entry) => entry.stageId !== "reflection" && entry.status !== "draft",
      )
      .map((entry) => entry.teamId),
  );
  const peopleIds =
    profile.role === "teacher"
      ? [
          ...new Set([
            ...context.project.applicantIds,
            ...context.project.selectedIds,
            ...entries.map((entry) => entry.ownerId),
          ]),
        ]
      : context.project.selectedIds;
  const people = peopleIds.length
    ? await db
        .select({
          id: profiles.id,
          displayName: profiles.displayName,
          career: profiles.career,
        })
        .from(profiles)
        .where(inArray(profiles.id, peopleIds))
    : [];
  return {
    project: visibleInquiryProject(context, profile),
    teams: context.teams.map((team) => ({
      id: team.id,
      projectId: team.projectId,
      name: team.name,
      representativeId: context.project.selectedIds.includes(
        team.representativeId,
      )
        ? team.representativeId
        : "",
      memberIds: team.memberIds.filter((id) =>
        context.project.selectedIds.includes(id),
      ),
    })),
    entries: visibleEntries.map(serializeInquiryEntry),
    comments: comments
      .filter(
        (comment) =>
          profile.role === "teacher" ||
          sharedTeamIds.has(comment.teamId) ||
          context.teams.some(
            (team) =>
              team.id === comment.teamId && team.memberIds.includes(profile.id),
          ),
      )
      .map((comment) => ({
        id: comment.id,
        projectId: comment.projectId,
        teamId: comment.teamId,
        authorId: comment.authorId,
        authorName: comment.authorName,
        kind: comment.kind as InquiryBoard["comments"][number]["kind"],
        content: comment.body,
        createdAt: comment.createdAt,
      })),
    people,
  };
}
