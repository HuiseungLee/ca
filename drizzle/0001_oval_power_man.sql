ALTER TABLE `activities` ADD `owner_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_activities_owner_created` ON `activities` (`owner_id`,`created_at`);