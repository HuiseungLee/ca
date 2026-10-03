import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { InquiryField, StageSettings } from "@/lib/inquiry";

export const profiles = sqliteTable(
  "profiles",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role").notNull().default("student"),
    career: text("career").notNull().default("진로 탐색 중"),
    interests: text("interests", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("idx_profiles_email").on(table.email)],
);

export type FormQuestion = {
  id: string;
  label: string;
  type: "short_text" | "long_text";
  required: boolean;
  placeholder?: string;
};

export const activityForms = sqliteTable(
  "activity_forms",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull().default("공통 활동지"),
    status: text("status").notNull().default("draft"),
    questions: text("questions", { mode: "json" })
      .$type<FormQuestion[]>()
      .notNull()
      .default([]),
    distributionMode: text("distribution_mode").notNull().default("all"),
    targetIds: text("target_ids", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    projectId: text("project_id"),
    updatedBy: text("updated_by"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_activity_forms_status_updated").on(
      table.status,
      table.updatedAt,
    ),
  ],
);

export const activities = sqliteTable(
  "activities",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().default(""),
    formId: text("form_id"),
    studentName: text("student_name").notNull().default("김민서"),
    title: text("title").notNull(),
    category: text("category").notNull().default("자율 탐구"),
    career: text("career").notNull(),
    summary: text("summary").notNull().default(""),
    answers: text("answers", { mode: "json" })
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    keywords: text("keywords", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    fitScore: integer("fit_score").notNull().default(0),
    status: text("status").notNull().default("분석 중"),
    evidence: text("evidence").notNull().default(""),
    nextStep: text("next_step").notNull().default(""),
    teacherClue: text("teacher_clue").notNull().default(""),
    teacherFeedback: text("teacher_feedback").notNull().default(""),
    feedbackBy: text("feedback_by").notNull().default(""),
    feedbackAt: text("feedback_at").notNull().default(""),
    parentActivityIds: text("parent_activity_ids", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    questionSnapshot: text("question_snapshot", { mode: "json" })
      .$type<FormQuestion[]>()
      .notNull()
      .default([]),
    fileKey: text("file_key"),
    fileName: text("file_name"),
    revisedAt: text("revised_at").notNull().default(""),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_activities_student_created").on(
      table.studentName,
      table.createdAt,
    ),
    index("idx_activities_owner_created").on(table.ownerId, table.createdAt),
  ],
);

export const announcements = sqliteTable(
  "announcements",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    status: text("status").notNull().default("published"),
    authorId: text("author_id").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_announcements_status_created").on(table.status, table.createdAt),
  ],
);

export const studentGroups = sqliteTable("student_groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  memberIds: text("member_ids", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("open"),
    applicantIds: text("applicant_ids", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    selectedIds: text("selected_ids", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_projects_status_created").on(table.status, table.createdAt),
  ],
);

export const inquiryWorkflows = sqliteTable("inquiry_workflows", {
  projectId: text("project_id")
    .primaryKey()
    .references(() => projects.id),
  drivingQuestion: text("driving_question").notNull().default(""),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  stages: text("stages", { mode: "json" })
    .$type<StageSettings[]>()
    .notNull()
    .default([]),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const inquiryTeams = sqliteTable(
  "inquiry_teams",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    name: text("name").notNull(),
    representativeId: text("representative_id").notNull(),
    memberIds: text("member_ids", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_inquiry_teams_project").on(table.projectId)],
);

export const inquiryEntries = sqliteTable(
  "inquiry_entries",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    teamId: text("team_id").references(() => inquiryTeams.id),
    ownerId: text("owner_id").notNull(),
    scopeKey: text("scope_key").notNull(),
    stageId: text("stage_id").notNull(),
    answers: text("answers", { mode: "json" })
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    status: text("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    reviewHistory: text("review_history", { mode: "json" })
      .$type<
        Array<{
          status: string;
          feedback: string;
          authorId: string;
          authorName: string;
          createdAt: string;
        }>
      >()
      .notNull()
      .default([]),
    instructionSnapshot: text("instruction_snapshot").notNull().default(""),
    fieldSnapshot: text("field_snapshot", { mode: "json" })
      .$type<InquiryField[]>()
      .notNull()
      .default([]),
    formRevision: integer("form_revision").notNull().default(1),
    fileKey: text("file_key"),
    fileName: text("file_name"),
    submittedAt: text("submitted_at").notNull().default(""),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_inquiry_entries_scope_stage").on(
      table.projectId,
      table.scopeKey,
      table.stageId,
    ),
    index("idx_inquiry_entries_project").on(table.projectId),
  ],
);

export const inquiryComments = sqliteTable(
  "inquiry_comments",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    teamId: text("team_id")
      .notNull()
      .references(() => inquiryTeams.id),
    authorId: text("author_id").notNull(),
    authorName: text("author_name").notNull(),
    kind: text("kind").notNull().default("question"),
    body: text("body").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_inquiry_comments_project").on(table.projectId)],
);
