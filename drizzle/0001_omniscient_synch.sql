CREATE TABLE `game_configs` (
	`tenant` text NOT NULL,
	`revision` integer NOT NULL,
	`config` text NOT NULL,
	`rules` text NOT NULL,
	`published` text NOT NULL,
	`actor` text NOT NULL,
	PRIMARY KEY(`tenant`, `revision`)
);
--> statement-breakpoint
CREATE TABLE `race_picks` (
	`tenant` text NOT NULL,
	`user` text NOT NULL,
	`round` text NOT NULL,
	`answers` text NOT NULL,
	`receipt` text NOT NULL,
	`submitted` text NOT NULL,
	PRIMARY KEY(`tenant`, `user`, `round`)
);
--> statement-breakpoint
CREATE TABLE `staff_memberships` (
	`tenant` text NOT NULL,
	`user` text NOT NULL,
	`role` text NOT NULL,
	PRIMARY KEY(`tenant`, `user`)
);
