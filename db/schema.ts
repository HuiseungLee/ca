import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("student"),
  career: text("career").notNull().default("진로 탐색 중"),
  interests: text("interests", { mode: "json" }).$type<string[]>().notNull().default([]),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_profiles_email").on(table.email)]);

export type FormQuestion = {
  id: string;
  label: string;
  type: "short_text" | "long_text";
  required: boolean;
  placeholder?: string;
};

export const activityForms = sqliteTable("activity_forms", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("공통 활동지"),
  status: text("status").notNull().default("draft"),
  questions: text("questions", { mode: "json" }).$type<FormQuestion[]>().notNull().default([]),
  distributionMode: text("distribution_mode").notNull().default("all"),
  targetIds: text("target_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
  projectId: text("project_id"),
  updatedBy: text("updated_by"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_activity_forms_status_updated").on(table.status, table.updatedAt)]);

export const activities = sqliteTable("activities", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().default(""),
  formId: text("form_id"),
  studentName: text("student_name").notNull().default("김민서"),
  title: text("title").notNull(),
  category: text("category").notNull().default("자율 탐구"),
  career: text("career").notNull(),
  summary: text("summary").notNull().default(""),
  answers: text("answers", { mode: "json" }).$type<Record<string, string>>().notNull().default({}),
  keywords: text("keywords", { mode: "json" }).$type<string[]>().notNull().default([]),
  fitScore: integer("fit_score").notNull().default(0),
  status: text("status").notNull().default("분석 중"),
  evidence: text("evidence").notNull().default(""),
  nextStep: text("next_step").notNull().default(""),
  teacherClue: text("teacher_clue").notNull().default(""),
  fileKey: text("file_key"),
  fileName: text("file_name"),
  revisedAt: text("revised_at").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_activities_student_created").on(table.studentName, table.createdAt),
  index("idx_activities_owner_created").on(table.ownerId, table.createdAt),
]);

export const announcements = sqliteTable("announcements", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  status: text("status").notNull().default("published"),
  authorId: text("author_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_announcements_status_created").on(table.status, table.createdAt)]);

export const studentGroups = sqliteTable("student_groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  memberIds: text("member_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("open"),
  applicantIds: text("applicant_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
  selectedIds: text("selected_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_projects_status_created").on(table.status, table.createdAt)]);
