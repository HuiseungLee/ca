ALTER TABLE `activities` ADD `teacher_feedback` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `feedback_by` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `feedback_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `parent_activity_ids` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `question_snapshot` text DEFAULT '[]' NOT NULL;