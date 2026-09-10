CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`student_name` text DEFAULT '김민서' NOT NULL,
	`title` text NOT NULL,
	`category` text DEFAULT '자율 탐구' NOT NULL,
	`career` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`keywords` text DEFAULT '[]' NOT NULL,
	`fit_score` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT '분석 중' NOT NULL,
	`evidence` text DEFAULT '' NOT NULL,
	`next_step` text DEFAULT '' NOT NULL,
	`teacher_clue` text DEFAULT '' NOT NULL,
	`file_key` text,
	`file_name` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_activities_student_created` ON `activities` (`student_name`,`created_at`);