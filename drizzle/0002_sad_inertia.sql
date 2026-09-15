CREATE TABLE `activity_forms` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`category` text DEFAULT '공통 활동지' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`questions` text DEFAULT '[]' NOT NULL,
	`updated_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_activity_forms_status_updated` ON `activity_forms` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'student' NOT NULL,
	`career` text DEFAULT '진로 탐색 중' NOT NULL,
	`interests` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_profiles_email` ON `profiles` (`email`);--> statement-breakpoint
ALTER TABLE `activities` ADD `form_id` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `answers` text DEFAULT '{}' NOT NULL;