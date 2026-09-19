CREATE TABLE `announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`author_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_announcements_status_created` ON `announcements` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`applicant_ids` text DEFAULT '[]' NOT NULL,
	`selected_ids` text DEFAULT '[]' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_projects_status_created` ON `projects` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `student_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`member_ids` text DEFAULT '[]' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `activities` ADD `revised_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `activity_forms` ADD `distribution_mode` text DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE `activity_forms` ADD `target_ids` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `activity_forms` ADD `project_id` text;