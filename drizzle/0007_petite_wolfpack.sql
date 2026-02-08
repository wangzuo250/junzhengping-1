CREATE TABLE `topic_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`topicId` int NOT NULL,
	`commentBy` varchar(100) NOT NULL,
	`comment` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `topic_comments_id` PRIMARY KEY(`id`)
);
