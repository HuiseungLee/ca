import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { getDb } from "@/db";
import {
  inquiryComments,
  inquiryEntries,
  inquiryTeams,
  inquiryWorkflows,
  profiles,
  projects,
} from "@/db/schema";
import { requireProfile } from "@/lib/auth";
import {
  defaultStageSettings,
  entryStageFields,
  inquiryFieldType,
  stageIds,
} from "@/lib/inquiry";
import {
  assertEntryWriter,
  assertInquiryOrigin,
  assertTeacher,
  assertWritable,
  inquiryBoard,
  inquiryContext,
  InquiryError,
  inquiryFailure,
  inquiryJson,
  visibleInquiryProject,
} from "@/lib/inquiry-access";

const id = z.string().min(1).max(100);
const fieldSchema = z
  .object({
    id: z
      .string()
      .regex(/^[A-Za-z][A-Za-z0-9_-]{0,63}$/)
      .refine(
        (value) =>
          value !== "prototype" &&
          !Object.prototype.hasOwnProperty.call(Object.prototype, value),
      ),
    label: z.string().trim().min(1).max(300),
    placeholder: z.string().trim().max(1500),
    required: z.boolean(),
    type: z.enum(["short_text", "long_text", "select", "url"]).optional(),
    options: z
      .array(z.string().trim().min(1).max(300))
      .min(1)
      .max(20)
      .refine((values) => new Set(values).size === values.length)
      .optional(),
  })
  .strict()
  .refine(
    (field) => inquiryFieldType(field) !== "select" || !!field.options?.length,
    "선택형 문항에는 선택지가 필요합니다.",
  );
const fieldsSchema = z
  .array(fieldSchema)
  .min(1)
  .max(20)
  .refine(
    (fields) => new Set(fields.map((field) => field.id)).size === fields.length,
  );
const settings = z
  .array(
    z.object({
      id: z.enum(stageIds),
      instruction: z.string().trim().max(4000),
      dueDate: z
        .string()
        .refine(
          (value) =>
            !value ||
            (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
              !Number.isNaN(Date.parse(value))),
          "날짜를 확인해 주세요.",
        ),
    }),
  )
  .length(6)
  .refine((items) => new Set(items.map((item) => item.id)).size === 6);
const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(8000),
    projectId: id.optional(),
  }),
  z.object({
    action: z.literal("update"),
    projectId: id,
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(8000),
    stages: settings,
    archived: z.boolean(),
    status: z.enum(["open", "closed"]),
  }),
  z.object({ action: z.literal("apply"), projectId: id }),
  z.object({
    action: z.literal("publish_form"),
    projectId: id,
    stageId: z.enum(stageIds),
    fields: fieldsSchema,
    revision: z.number().int().min(1),
  }),
  z.object({
    action: z.literal("select"),
    projectId: id,
    selectedIds: z.array(id).max(1000),
  }),
  z.object({
    action: z.literal("team"),
    projectId: id,
    id: id.optional(),
    name: z.string().trim().min(1).max(100),
    memberIds: z.array(id).min(1).max(100),
    representativeId: id,
  }),
  z.object({
    action: z.literal("save"),
    projectId: id,
    teamId: id.optional(),
    stageId: z.enum(stageIds),
    answers: z
      .record(z.string().max(12000))
      .refine((value) => Object.keys(value).length <= 20),
    status: z.enum(["draft", "submitted"]),
    version: z.number().int().min(0),
    formRevision: z.number().int().min(1).optional().default(1),
  }),
  z.object({
    action: z.literal("review"),
    projectId: id,
    entryId: id,
    version: z.number().int().min(1),
    status: z.enum(["revision", "approved"]),
    text: z.string().trim().min(1).max(8000),
  }),
  z.object({
    action: z.literal("comment"),
    projectId: id,
    teamId: id,
    kind: z.enum(["question", "counter", "evidence", "reply"]),
    content: z.string().trim().min(1).max(6000),
  }),
]);

export async function GET(request: Request) {
  try {
    const auth = await requireProfile(request);
    if (!auth) return inquiryJson({ error: "로그인이 필요합니다." }, 401);
    const projectId = new URL(request.url).searchParams.get("projectId");
    if (projectId)
      return inquiryJson({
        board: await inquiryBoard(
          await inquiryContext(projectId, auth.profile),
          auth.profile,
        ),
      });
    const rows = await getDb()
      .select()
      .from(projects)
      .innerJoin(inquiryWorkflows, eq(inquiryWorkflows.projectId, projects.id))
      .orderBy(desc(projects.createdAt));
    return inquiryJson({
      projects: rows
        .filter(
          (row) =>
            auth.profile.role === "teacher" ||
            row.projects.selectedIds.includes(auth.profile.id) ||
            row.projects.applicantIds.includes(auth.profile.id) ||
            (!row.inquiry_workflows.archived && row.projects.status === "open"),
        )
        .map((row) =>
          visibleInquiryProject(
            { project: row.projects, workflow: row.inquiry_workflows },
            auth.profile,
          ),
        ),
    });
  } catch (error) {
    return inquiryFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    assertInquiryOrigin(request);
    const auth = await requireProfile(request);
    if (!auth) return inquiryJson({ error: "로그인이 필요합니다." }, 401);
    const raw = await request.text();
    if (raw.length > 250000) throw new InquiryError("입력 내용이 너무 깁니다.");
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new InquiryError("입력 내용을 확인해 주세요.");
    }
    const parsed = actionSchema.safeParse(json);
    if (!parsed.success)
      throw new InquiryError("입력한 내용과 필수 항목을 확인해 주세요.");
    const input = parsed.data;
    const profile = auth.profile;
    const db = getDb();
    const now = new Date().toISOString();
    let projectId = input.projectId;
    if (input.action === "create") {
      assertTeacher(profile);
      projectId = input.projectId ?? crypto.randomUUID();
      if (input.projectId) {
        const [project] = await db
          .select()
          .from(projects)
          .where(eq(projects.id, projectId))
          .limit(1);
        if (!project)
          throw new InquiryError("연결할 프로젝트를 찾을 수 없습니다.", 404);
        const [existing] = await db
          .select()
          .from(inquiryWorkflows)
          .where(eq(inquiryWorkflows.projectId, projectId))
          .limit(1);
        if (existing)
          throw new InquiryError(
            "이미 탐구 단계가 설정된 프로젝트입니다.",
            409,
          );
        await db.insert(inquiryWorkflows).values({
          projectId,
          stages: defaultStageSettings(),
          createdAt: now,
          updatedAt: now,
        });
      } else {
        await db.batch([
          db.insert(projects).values({
            id: projectId,
            title: input.title,
            description: input.description,
            createdBy: profile.id,
            createdAt: now,
            updatedAt: now,
          }),
          db.insert(inquiryWorkflows).values({
            projectId,
            stages: defaultStageSettings(),
            createdAt: now,
            updatedAt: now,
          }),
        ]);
      }
      return inquiryJson(
        {
          board: await inquiryBoard(
            await inquiryContext(projectId, profile),
            profile,
          ),
        },
        201,
      );
    }
    const context = await inquiryContext(
      input.projectId,
      profile,
      input.action !== "apply",
    );
    if (input.action === "update") {
      assertTeacher(profile);
      const stages = stageIds.map((stageId) => ({
        ...context.workflow.stages.find((stage) => stage.id === stageId),
        ...input.stages.find((stage) => stage.id === stageId)!,
      }));
      const [, changed] = await db.batch([
        db
          .update(projects)
          .set({
            title: input.title,
            description: input.description,
            status: input.status,
            updatedAt: now,
          })
          .where(
            and(
              eq(projects.id, input.projectId),
              sql`EXISTS (SELECT 1 FROM inquiry_workflows WHERE project_id = ${input.projectId} AND stages = ${JSON.stringify(context.workflow.stages)})`,
            ),
          ),
        db
          .update(inquiryWorkflows)
          .set({
            stages,
            archived: input.archived,
            updatedAt: now,
          })
          .where(
            and(
              eq(inquiryWorkflows.projectId, input.projectId),
              eq(inquiryWorkflows.stages, context.workflow.stages),
            ),
          )
          .returning({ projectId: inquiryWorkflows.projectId }),
      ]);
      if (!changed.length)
        throw new InquiryError(
          "다른 화면에서 프로젝트를 수정했습니다. 새로고침 후 다시 저장해 주세요.",
          409,
        );
    } else if (input.action === "publish_form") {
      assertTeacher(profile);
      assertWritable(context);
      const settings = context.workflow.stages.find(
        (stage) => stage.id === input.stageId,
      );
      if (input.revision !== (settings?.revision ?? 1))
        throw new InquiryError(
          "다른 화면에서 문항을 배포했습니다. 새로고침 후 최신 양식을 확인해 주세요.",
          409,
        );
      const stages = stageIds.map((stageId) => {
        const current =
          context.workflow.stages.find((stage) => stage.id === stageId) ??
          defaultStageSettings().find((stage) => stage.id === stageId)!;
        return stageId === input.stageId
          ? {
              ...current,
              fields: input.fields,
              revision: input.revision + 1,
              publishedAt: now,
            }
          : current;
      });
      const changed = await db
        .update(inquiryWorkflows)
        .set({ stages, updatedAt: now })
        .where(
          and(
            eq(inquiryWorkflows.projectId, input.projectId),
            eq(inquiryWorkflows.stages, context.workflow.stages),
            eq(inquiryWorkflows.archived, false),
          ),
        )
        .returning({ projectId: inquiryWorkflows.projectId });
      if (!changed.length)
        throw new InquiryError(
          "다른 화면에서 프로젝트나 문항을 수정했습니다. 새로고침 후 다시 배포해 주세요.",
          409,
        );
    } else if (input.action === "apply") {
      assertWritable(context);
      if (context.project.status !== "open" || profile.role === "teacher")
        throw new InquiryError(
          "학생 모집 중인 프로젝트에만 신청할 수 있습니다.",
        );
      if (!env.DB) throw new InquiryError("저장소에 연결하지 못했습니다.", 503);
      await env.DB.prepare(
        "UPDATE projects SET applicant_ids = json_insert(applicant_ids, '$[#]', ?), updated_at = ? WHERE id = ? AND status = 'open' AND NOT EXISTS (SELECT 1 FROM json_each(projects.applicant_ids) WHERE value = ?) AND EXISTS (SELECT 1 FROM inquiry_workflows WHERE project_id = projects.id AND archived = 0)",
      )
        .bind(profile.id, now, input.projectId, profile.id)
        .run();
      const refreshed = await inquiryContext(input.projectId, profile, false);
      return inquiryJson({
        project: visibleInquiryProject(refreshed, profile),
      });
    } else if (input.action === "select") {
      assertTeacher(profile);
      assertWritable(context);
      const selectedIds = [...new Set(input.selectedIds)];
      if (
        selectedIds.some(
          (studentId) => !context.project.applicantIds.includes(studentId),
        )
      )
        throw new InquiryError("참가 신청한 학생만 선발할 수 있습니다.");
      const students = selectedIds.length
        ? await db
            .select()
            .from(profiles)
            .where(inArray(profiles.id, selectedIds))
        : [];
      if (
        students.length !== selectedIds.length ||
        students.some((student) => student.role !== "student")
      )
        throw new InquiryError("학생 참가자 목록을 확인해 주세요.");
      await db
        .update(projects)
        .set({ selectedIds, updatedAt: now })
        .where(eq(projects.id, input.projectId));
    } else if (input.action === "team") {
      assertTeacher(profile);
      assertWritable(context);
      const memberIds = [...new Set(input.memberIds)];
      if (
        memberIds.some(
          (studentId) => !context.project.selectedIds.includes(studentId),
        ) ||
        !memberIds.includes(input.representativeId)
      )
        throw new InquiryError(
          "선발된 학생으로 모둠을 구성하고 모둠원 중 대표를 지정해 주세요.",
        );
      if (input.id && !context.teams.some((team) => team.id === input.id))
        throw new InquiryError("모둠을 찾을 수 없습니다.", 404);
      if (
        context.teams.some(
          (team) =>
            team.id !== input.id &&
            team.memberIds.some((studentId) => memberIds.includes(studentId)),
        )
      )
        throw new InquiryError(
          "학생은 한 프로젝트에서 한 모둠에만 참여할 수 있습니다.",
        );
      const values = {
        name: input.name,
        representativeId: input.representativeId,
        memberIds,
        updatedAt: now,
      };
      if (input.id)
        await db
          .update(inquiryTeams)
          .set(values)
          .where(
            and(
              eq(inquiryTeams.id, input.id),
              eq(inquiryTeams.projectId, input.projectId),
            ),
          );
      else
        await db.insert(inquiryTeams).values({
          id: crypto.randomUUID(),
          projectId: input.projectId,
          createdAt: now,
          ...values,
        });
    } else if (input.action === "save") {
      assertWritable(context);
      const team = context.teams.find((item) =>
        input.stageId === "reflection"
          ? item.memberIds.includes(profile.id)
          : item.id === input.teamId,
      );
      if (
        !team ||
        !team.memberIds.includes(profile.id) ||
        !context.project.selectedIds.includes(profile.id)
      )
        throw new InquiryError(
          "배정된 모둠에서만 활동을 작성할 수 있습니다.",
          403,
        );
      if (
        input.stageId !== "reflection" &&
        team.representativeId !== profile.id
      )
        throw new InquiryError(
          "모둠 대표만 모둠 활동을 저장할 수 있습니다.",
          403,
        );
      const scopeKey =
        input.stageId === "reflection"
          ? `person:${profile.id}`
          : `team:${team.id}`;
      const [existing] = await db
        .select()
        .from(inquiryEntries)
        .where(
          and(
            eq(inquiryEntries.projectId, input.projectId),
            eq(inquiryEntries.scopeKey, scopeKey),
            eq(inquiryEntries.stageId, input.stageId),
          ),
        )
        .limit(1);
      if (input.version !== (existing?.version ?? 0))
        throw new InquiryError(
          "다른 화면에서 수정된 내용이 있습니다. 새로고침 후 확인해 주세요.",
          409,
        );
      if (existing?.status === "approved" && input.status !== "draft")
        throw new InquiryError(
          "확인된 활동은 먼저 임시저장으로 수정한 뒤 다시 제출해 주세요.",
          409,
        );
      const setting = context.workflow.stages.find(
        (item) => item.id === input.stageId,
      );
      const formRevision = existing?.formRevision ?? setting?.revision ?? 1;
      if (input.formRevision !== formRevision)
        throw new InquiryError(
          "활동지 문항이 변경되었습니다. 새로고침 후 배포된 양식을 확인해 주세요.",
          409,
        );
      const fields = entryStageFields(input.stageId, setting, existing);
      if (
        Object.keys(input.answers).some(
          (key) => !fields.some((field) => field.id === key),
        )
      )
        throw new InquiryError("이 단계에 포함되지 않은 문항이 있습니다.");
      const answers = Object.fromEntries(
        fields.map((field) => [
          field.id,
          input.answers[field.id]?.trim() ?? "",
        ]),
      );
      if (input.status === "submitted") {
        if (fields.some((field) => field.required && !answers[field.id]))
          throw new InquiryError("필수 문항을 작성한 뒤 제출해 주세요.");
        if (
          fields.some(
            (field) =>
              inquiryFieldType(field) === "select" &&
              !!answers[field.id] &&
              !field.options?.includes(answers[field.id]),
          )
        )
          throw new InquiryError(
            "선택형 문항에서 제시된 항목을 선택해 주세요.",
          );
        for (const field of fields.filter(
          (field) => inquiryFieldType(field) === "url" && answers[field.id],
        )) {
          const links = answers[field.id]
            .split(/\r?\n/)
            .map((link) => link.trim())
            .filter(Boolean);
          if (
            links.length > 20 ||
            links.some((link) => {
              try {
                return !["http:", "https:"].includes(new URL(link).protocol);
              } catch {
                return true;
              }
            })
          )
            throw new InquiryError(
              "출처 링크는 http:// 또는 https:// 주소를 한 줄에 하나씩 입력해 주세요.",
            );
        }
        const position = stageIds.indexOf(input.stageId);
        if (position > 0) {
          const [previous] = await db
            .select()
            .from(inquiryEntries)
            .where(
              and(
                eq(inquiryEntries.projectId, input.projectId),
                eq(inquiryEntries.teamId, team.id),
                eq(inquiryEntries.stageId, stageIds[position - 1]),
              ),
            )
            .limit(1);
          if (!previous || previous.status === "draft")
            throw new InquiryError(
              "바로 앞 단계의 모둠 활동을 먼저 제출해 주세요.",
              409,
            );
        }
      }
      const values = {
        answers,
        fieldSnapshot: fields,
        formRevision,
        status: input.status,
        version: input.version + 1,
        updatedAt: now,
        submittedAt:
          input.status === "submitted" ? now : (existing?.submittedAt ?? ""),
      };
      if (existing) {
        assertEntryWriter(existing, context, profile);
        const changed = await db
          .update(inquiryEntries)
          .set(values)
          .where(
            and(
              eq(inquiryEntries.id, existing.id),
              eq(inquiryEntries.version, input.version),
            ),
          )
          .returning({ id: inquiryEntries.id });
        if (!changed.length)
          throw new InquiryError(
            "다른 화면에서 수정된 내용이 있습니다. 새로고침 후 확인해 주세요.",
            409,
          );
      } else {
        if (!env.DB)
          throw new InquiryError("저장소에 연결하지 못했습니다.", 503);
        const inserted = await env.DB.prepare(
          `
          INSERT INTO inquiry_entries
          (id, project_id, team_id, owner_id, scope_key, stage_id, answers, status, version, instruction_snapshot, field_snapshot, form_revision, submitted_at, created_at, updated_at)
          SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          WHERE EXISTS (SELECT 1 FROM inquiry_workflows WHERE project_id = ? AND stages = ? AND archived = 0)
          ON CONFLICT DO NOTHING
        `,
        )
          .bind(
            crypto.randomUUID(),
            input.projectId,
            input.stageId === "reflection" ? null : team.id,
            profile.id,
            scopeKey,
            input.stageId,
            JSON.stringify(answers),
            input.status,
            input.version + 1,
            setting?.instruction ?? "",
            JSON.stringify(fields),
            formRevision,
            values.submittedAt,
            now,
            now,
            input.projectId,
            JSON.stringify(context.workflow.stages),
          )
          .run();
        if (!inserted.meta.changes)
          throw new InquiryError(
            "다른 화면에서 활동이나 문항이 변경되었습니다. 새로고침 후 확인해 주세요.",
            409,
          );
      }
    } else if (input.action === "review") {
      assertTeacher(profile);
      assertWritable(context);
      const [entry] = await db
        .select()
        .from(inquiryEntries)
        .where(
          and(
            eq(inquiryEntries.id, input.entryId),
            eq(inquiryEntries.projectId, input.projectId),
          ),
        )
        .limit(1);
      if (!entry) throw new InquiryError("활동을 찾을 수 없습니다.", 404);
      if (entry.status === "draft")
        throw new InquiryError("제출된 활동에 피드백을 남길 수 있습니다.", 409);
      const reviewHistory = [
        ...entry.reviewHistory,
        {
          status: input.status,
          feedback: input.text,
          authorId: profile.id,
          authorName: profile.displayName,
          createdAt: now,
        },
      ];
      const changed = await db
        .update(inquiryEntries)
        .set({
          status: input.status,
          reviewHistory,
          version: input.version + 1,
          updatedAt: now,
        })
        .where(
          and(
            eq(inquiryEntries.id, entry.id),
            eq(inquiryEntries.version, input.version),
          ),
        )
        .returning({ id: inquiryEntries.id });
      if (!changed.length)
        throw new InquiryError(
          "학생이 내용을 수정했습니다. 새로고침 후 피드백해 주세요.",
          409,
        );
    } else if (input.action === "comment") {
      assertWritable(context);
      const team = context.teams.find((item) => item.id === input.teamId);
      if (!team) throw new InquiryError("모둠을 찾을 수 없습니다.", 404);
      if (profile.role !== "teacher" && !team.memberIds.includes(profile.id)) {
        const shared = await db
          .select()
          .from(inquiryEntries)
          .where(
            and(
              eq(inquiryEntries.projectId, input.projectId),
              eq(inquiryEntries.teamId, team.id),
            ),
          );
        if (!shared.some((entry) => entry.status !== "draft"))
          throw new InquiryError(
            "모둠이 활동을 제출한 뒤 토론에 참여할 수 있습니다.",
            403,
          );
      }
      await db.insert(inquiryComments).values({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        teamId: team.id,
        authorId: profile.id,
        authorName: profile.displayName,
        kind: input.kind,
        body: input.content,
        createdAt: now,
      });
    }
    return inquiryJson({
      board: await inquiryBoard(
        await inquiryContext(input.projectId, profile),
        profile,
      ),
    });
  } catch (error) {
    return inquiryFailure(error);
  }
}
