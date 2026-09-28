CREATE TABLE `business_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`is_enabled` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chat_rules` (
	`chat_id` integer PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chats` (
	`chat_id` integer PRIMARY KEY NOT NULL,
	`title` text,
	`last_seen` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `message_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`chat_id` integer NOT NULL,
	`business_connection_id` text NOT NULL,
	`version` integer NOT NULL,
	`text` text,
	`caption` text,
	`edit_date` integer,
	`stored_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_versions_key` ON `message_versions` (`key`,`version`);--> statement-breakpoint
CREATE INDEX `idx_versions_stored_at` ON `message_versions` (`stored_at`);--> statement-breakpoint
CREATE INDEX `idx_versions_chat` ON `message_versions` (`chat_id`);--> statement-breakpoint
CREATE INDEX `idx_versions_connection` ON `message_versions` (`business_connection_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`key` text PRIMARY KEY NOT NULL,
	`message_id` integer NOT NULL,
	`chat_id` integer NOT NULL,
	`business_connection_id` text NOT NULL,
	`from_json` text,
	`date` integer NOT NULL,
	`text` text,
	`caption` text,
	`photo` text,
	`video` text,
	`document` text,
	`sticker` text,
	`voice` text,
	`audio` text,
	`animation` text,
	`stored_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_messages_stored_at` ON `messages` (`stored_at`);--> statement-breakpoint
CREATE INDEX `idx_messages_connection` ON `messages` (`business_connection_id`);--> statement-breakpoint
CREATE INDEX `idx_messages_chat` ON `messages` (`chat_id`,`date`);--> statement-breakpoint
CREATE TABLE `notification_details` (
	`token` text PRIMARY KEY NOT NULL,
	`chat_id` integer NOT NULL,
	`compact` text NOT NULL,
	`expanded` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_details_created` ON `notification_details` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_details_chat` ON `notification_details` (`chat_id`);