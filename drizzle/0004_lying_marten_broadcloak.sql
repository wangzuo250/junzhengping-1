CREATE TABLE `submission_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`projectName` varchar(255),
	`progress` enum('未开始','已开始','已结束','暂停'),
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `submission_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `submission_topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`content` text,
	`suggestedFormat` text,
	`creativeIdea` text,
	`creator` varchar(100),
	`relatedLink` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `submission_topics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `topic_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`selectedTopicId` int NOT NULL,
	`fieldName` varchar(50) NOT NULL,
	`oldValue` varchar(50),
	`newValue` varchar(50) NOT NULL,
	`changedBy` int NOT NULL,
	`changedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `topic_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `submissions` ADD `submitterName` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `submissions` ADD `longTermPlan` text;--> statement-breakpoint
ALTER TABLE `submissions` ADD `workSuggestion` text;--> statement-breakpoint
ALTER TABLE `submissions` ADD `riskWarning` text;--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('active','suspended') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `submissions` DROP COLUMN `content`;--> statement-breakpoint
ALTER TABLE `submissions` DROP COLUMN `suggestedFormat`;