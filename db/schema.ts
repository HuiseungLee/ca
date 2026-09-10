import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const activities = sqliteTable("activities", {
  id: text("id").primaryKey(),
  studentName: text("student_name").notNull().default("김민서"),
  title: text("title").notNull(),
  category: text("category").notNull().default("자율 탐구"),
  career: text("career").notNull(),
  summary: text("summary").notNull().default(""),
  keywords: text("keywords", { mode: "json" }).$type<string[]>().notNull().default([]),
  fitScore: integer("fit_score").notNull().default(0),
  status: text("status").notNull().default("분석 중"),
  evidence: text("evidence").notNull().default(""),
  nextStep: text("next_step").notNull().default(""),
  teacherClue: text("teacher_clue").notNull().default(""),
  fileKey: text("file_key"),
  fileName: text("file_name"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_activities_student_created").on(table.studentName, table.createdAt)]);
