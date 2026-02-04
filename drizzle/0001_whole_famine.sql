CREATE TABLE `collection_forms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`formDate` date NOT NULL,
	`title` varchar(255) NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collection_forms_id` PRIMARY KEY(`id`),
	CONSTRAINT `collection_forms_formDate_unique` UNIQUE(`formDate`)
);
--> statement-breakpoint
CREATE TABLE `selected_topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`content` text NOT NULL,
	`suggestion` varchar(255),
	`submitters` text NOT NULL,
	`leaderComment` text,
	`creators` text,
	`progress` enum('未开始','进行中','已完成','已暂停') NOT NULL DEFAULT '未开始',
	`status` enum('未发布','已发布','否决') NOT NULL DEFAULT '未发布',
	`remark` text,
	`selectedDate` date NOT NULL,
	`monthKey` varchar(7) NOT NULL,
	`sourceSubmissionId` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `selected_topics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`collectionFormId` int NOT NULL,
	`content` text NOT NULL,
	`suggestedFormat` varchar(100) NOT NULL,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(100) NOT NULL,
	`target` varchar(255),
	`details` json,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `system_logs_id` PRIMARY KEY(`id`)
);
