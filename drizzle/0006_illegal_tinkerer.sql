ALTER TABLE `inquiry_entries` ADD `field_snapshot` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiry_entries` ADD `form_revision` integer DEFAULT 1 NOT NULL;