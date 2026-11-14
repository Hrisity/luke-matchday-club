CREATE TABLE `round_results` (
	`tenant` text NOT NULL,
	`revision` integer NOT NULL,
	`version` integer NOT NULL,
	`payload` text NOT NULL,
	`actor` text NOT NULL,
	`published` text NOT NULL,
	PRIMARY KEY(`tenant`, `revision`, `version`)
);
