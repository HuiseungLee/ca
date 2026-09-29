CREATE TABLE `inquiry_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`team_id` text NOT NULL,
	`author_id` text NOT NULL,
	`author_name` text NOT NULL,
	`kind` text DEFAULT 'question' NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `inquiry_teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_inquiry_comments_project` ON `inquiry_comments` (`project_id`);--> statement-breakpoint
CREATE TABLE `inquiry_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`team_id` text,
	`owner_id` text NOT NULL,
	`scope_key` text NOT NULL,
	`stage_id` text NOT NULL,
	`answers` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`review_history` text DEFAULT '[]' NOT NULL,
	`instruction_snapshot` text DEFAULT '' NOT NULL,
	`file_key` text,
	`file_name` text,
	`submitted_at` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `inquiry_teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_inquiry_entries_scope_stage` ON `inquiry_entries` (`project_id`,`scope_key`,`stage_id`);--> statement-breakpoint
CREATE INDEX `idx_inquiry_entries_project` ON `inquiry_entries` (`project_id`);--> statement-breakpoint
CREATE TABLE `inquiry_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`representative_id` text NOT NULL,
	`member_ids` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_inquiry_teams_project` ON `inquiry_teams` (`project_id`);--> statement-breakpoint
CREATE TABLE `inquiry_workflows` (
	`project_id` text PRIMARY KEY NOT NULL,
	`driving_question` text DEFAULT '' NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`stages` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
