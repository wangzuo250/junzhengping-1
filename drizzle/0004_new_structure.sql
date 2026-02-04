-- 重构 submissions 表结构
ALTER TABLE `submissions` DROP COLUMN `content`;
ALTER TABLE `submissions` DROP COLUMN `suggestedFormat`;
ALTER TABLE `submissions` ADD `submitterName` varchar(100) NOT NULL;
ALTER TABLE `submissions` ADD `longTermPlan` text;
ALTER TABLE `submissions` ADD `workSuggestion` text;
ALTER TABLE `submissions` ADD `riskWarning` text;

-- 创建 submission_topics 子表
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

-- 创建 submission_projects 子表
CREATE TABLE `submission_projects` (
`id` int AUTO_INCREMENT NOT NULL,
`submissionId` int NOT NULL,
`projectName` varchar(255),
`progress` enum('未开始','已开始','已结束','暂停'),
`note` text,
`createdAt` timestamp NOT NULL DEFAULT (now()),
CONSTRAINT `submission_projects_id` PRIMARY KEY(`id`)
);
