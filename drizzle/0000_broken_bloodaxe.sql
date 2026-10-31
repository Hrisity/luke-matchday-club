CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leagues` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leagues_code_unique` ON `leagues` (`code`);--> statement-breakpoint
CREATE TABLE `members` (
	`tenant` text NOT NULL,
	`league` text NOT NULL,
	`user` text NOT NULL,
	PRIMARY KEY(`tenant`, `league`, `user`),
	FOREIGN KEY (`league`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `picks` (
	`tenant` text NOT NULL,
	`user` text NOT NULL,
	`round` text NOT NULL,
	`fixture` text NOT NULL,
	`home` integer NOT NULL,
	`away` integer NOT NULL,
	`first` text,
	`updated` text NOT NULL,
	PRIMARY KEY(`tenant`, `user`, `round`, `fixture`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`tenant` text NOT NULL,
	`user` text NOT NULL,
	`name` text NOT NULL,
	PRIMARY KEY(`tenant`, `user`)
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`tenant` text NOT NULL,
	`user` text NOT NULL,
	`round` text NOT NULL,
	`receipt` text NOT NULL,
	`snapshot` text NOT NULL,
	`submitted` text NOT NULL,
	PRIMARY KEY(`tenant`, `user`, `round`)
);
