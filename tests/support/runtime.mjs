import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
export let user = null;
export function signIn(id) {
  user = id
    ? { userId: id, fullName: id, displayName: id, email: id + "@test.local" }
    : null;
}
export let fail = false;
export function failDatabase(value) {
  fail = value;
}
const sqlite = new DatabaseSync(":memory:");
for (const file of readdirSync(new URL("../../drizzle/", import.meta.url))
  .filter((x) => x.endsWith(".sql"))
  .sort())
  sqlite.exec(
    readFileSync(new URL("../../drizzle/" + file, import.meta.url), "utf8"),
  );
export const env = {
  DB: {
    prepare(sql) {
      return {
        bind(...args) {
          return statement(sql, args);
        },
        ...statement(sql, []),
      };
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const result = [];
        for (const s of statements) result.push(await s.run());
        sqlite.exec("COMMIT");
        return result;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  },
};
function statement(sql, args) {
  return {
    async all() {
      if (fail) throw Error("offline");
      return { results: sqlite.prepare(sql).all(...args) };
    },
    async first() {
      if (fail) throw Error("offline");
      return sqlite.prepare(sql).get(...args) || null;
    },
    async run() {
      if (fail) throw Error("offline");
      const r = sqlite.prepare(sql).run(...args);
      return { meta: { changes: Number(r.changes) } };
    },
  };
}
export function reset() {
  for (const t of [
    "round_results",
    "submissions",
    "race_picks",
    "picks",
    "members",
    "leagues",
    "profiles",
    "events",
    "game_configs",
    "staff_memberships",
  ])
    sqlite.exec("DELETE FROM " + t);
  fail = false;
  delete env.CMS_ADMIN_USER_ID;
  signIn(null);
}
