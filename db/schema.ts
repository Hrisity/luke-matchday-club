import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";
export const picks = sqliteTable(
  "picks",
  {
    tenant: text("tenant").notNull(),
    user: text("user").notNull(),
    round: text("round").notNull(),
    fixture: text("fixture").notNull(),
    home: integer("home").notNull(),
    away: integer("away").notNull(),
    first: text("first"),
    updated: text("updated").notNull(),
  },
  (t) => [primaryKey({ columns: [t.tenant, t.user, t.round, t.fixture] })],
);
export const submissions = sqliteTable(
  "submissions",
  {
    tenant: text("tenant").notNull(),
    user: text("user").notNull(),
    round: text("round").notNull(),
    receipt: text("receipt").notNull(),
    snapshot: text("snapshot").notNull(),
    submitted: text("submitted").notNull(),
  },
  (t) => [primaryKey({ columns: [t.tenant, t.user, t.round] })],
);
export const leagues = sqliteTable("leagues", {
  id: text("id").primaryKey(),
  tenant: text("tenant").notNull(),
  owner: text("owner").notNull(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  created: text("created").notNull(),
});
export const members = sqliteTable(
  "members",
  {
    tenant: text("tenant").notNull(),
    league: text("league")
      .notNull()
      .references(() => leagues.id),
    user: text("user").notNull(),
  },
  (t) => [primaryKey({ columns: [t.tenant, t.league, t.user] })],
);
export const profiles = sqliteTable(
  "profiles",
  {
    tenant: text("tenant").notNull(),
    user: text("user").notNull(),
    name: text("name").notNull(),
  },
  (t) => [primaryKey({ columns: [t.tenant, t.user] })],
);
export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  tenant: text("tenant").notNull(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  at: text("at").notNull(),
});
