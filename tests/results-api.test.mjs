import "./support/register.mjs";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { env, reset, signIn, failDatabase } from "./support/runtime.mjs";
import { GET, POST } from "../app/api/results/route.ts";
import { POST as gamePost } from "../app/api/game/route.ts";
import { POST as racePost } from "../app/api/f1/route.ts";
import { POST as adminPost } from "../app/api/admin/route.ts";
import { defaultConfig } from "../lib/config.ts";
const tenant = "luke-owned",
  base = "http://localhost",
  outcome = { home: 2, away: 1, first: "HOME" };
const req = (path, body, origin = base) =>
  new Request(base + path, {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const publish = (results, expectedVersion = 0, revision = 0, t = tenant) =>
  POST(req("/api/results", { tenant: t, revision, expectedVersion, results }));
const read = async (query = "") => {
  const r = await GET(new Request(base + "/api/results" + query));
  return { status: r.status, data: await r.json() };
};
const run = (sql, ...args) =>
  env.DB.prepare(sql)
    .bind(...args)
    .run();
const staff = async () => {
  await run(
    "INSERT INTO staff_memberships VALUES(?,?,?)",
    tenant,
    "admin",
    "admin",
  );
  signIn("admin");
};
const result = () => ({ football: { f1: outcome }, f1: null });
const answers = () => {
  const [a, b, c] = defaultConfig.f1.drivers;
  const [t, u] = defaultConfig.f1.teams;
  return {
    winner: a.id,
    second: b.id,
    third: c.id,
    pole: a.id,
    fastest: b.id,
    team: t.id,
    pitFirst: u.id,
  };
};
beforeEach(reset);
test("empty round returns no fabricated players or results", async () => {
  const r = await read();
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.rows, []);
  assert.equal(r.data.version, 0);
});
test("write authentication and same-origin protection", async () => {
  assert.equal((await publish(result())).status, 401);
  signIn("player");
  assert.equal((await publish(result())).status, 403);
  await staff();
  assert.equal(
    (await POST(req("/api/results", {}, "https://evil.example"))).status,
    403,
  );
});
test("validates JSON, limits, schema, fixture, result consistency and missing round", async () => {
  await staff();
  assert.equal(
    (
      await POST(
        new Request(base + "/api/results", {
          method: "POST",
          headers: { origin: base },
          body: "{",
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await POST(
        new Request(base + "/api/results", {
          method: "POST",
          headers: { origin: base },
          body: "x".repeat(16001),
        }),
      )
    ).status,
    413,
  );
  assert.equal(
    (
      await publish({
        football: { f1: { home: 0, away: 0, first: "HOME" } },
        f1: null,
      })
    ).status,
    422,
  );
  assert.equal(
    (await publish({ football: { unknown: outcome }, f1: null })).status,
    422,
  );
  assert.equal((await publish(result(), 0, 999)).status, 404);
  assert.equal((await publish(result(), 0, 0, "other")).status, 403);
});
test("corrections replace scores, stale editors fail, audit history retained, withdrawal removes points", async () => {
  await staff();
  await run(
    "INSERT INTO submissions VALUES(?,?,?,?,?,?)",
    tenant,
    "player",
    "demo-football-v2-r0",
    "receipt",
    JSON.stringify({ f1: outcome }),
    "2026-01-01",
  );
  await run("INSERT INTO profiles VALUES(?,?,?)", tenant, "player", "Alice");
  assert.equal((await publish(result())).status, 200);
  assert.equal((await read()).data.rows[0].points, 7);
  assert.equal((await publish(result())).status, 409);
  assert.equal(
    (
      await publish(
        { football: { f1: { home: 0, away: 1, first: "AWAY" } }, f1: null },
        1,
      )
    ).status,
    200,
  );
  assert.equal((await read()).data.rows[0].points, 0);
  assert.equal((await read()).data.history.length, 2);
  await publish({ football: {}, f1: null }, 2);
  assert.equal((await read()).data.rows[0].settled, 0);
});
test("drafts do not score; F1 submissions score 30 plus separate tiebreaker", async () => {
  await staff();
  await run(
    "INSERT INTO picks VALUES(?,?,?,?,?,?,?,?)",
    tenant,
    "draft",
    "demo-football-v2-r0",
    "f1",
    2,
    1,
    "HOME",
    "2026-01-01",
  );
  await run(
    "INSERT INTO race_picks VALUES(?,?,?,?,?,?)",
    tenant,
    "racer",
    "demo-f1-v2-r0",
    JSON.stringify(answers()),
    "receipt",
    "2026-01-01",
  );
  assert.equal((await publish({ football: {}, f1: answers() })).status, 200);
  assert.deepEqual((await read()).data.rows, []);
  const r = (await read("?sport=f1")).data.rows[0];
  assert.equal(r.points, 30);
  assert.equal(r.tiebreaker, 1);
  assert.equal("user" in r, false);
});
test("private league and tenant reads enforce membership and isolate scores", async () => {
  await staff();
  await run(
    "INSERT INTO submissions VALUES(?,?,?,?,?,?)",
    tenant,
    "player",
    "demo-football-v2-r0",
    "r",
    JSON.stringify({ f1: outcome }),
    "2026-01-01",
  );
  await publish(result());
  assert.equal((await read("?tenant=other")).status, 403);
  assert.equal((await read("?league=private")).status, 403);
  await run(
    "INSERT INTO leagues VALUES(?,?,?,?,?,?)",
    "private",
    tenant,
    "admin",
    "Club",
    "CODE123",
    "2026-01-01",
  );
  await run("INSERT INTO members VALUES(?,?,?)", tenant, "private", "admin");
  assert.deepEqual((await read("?league=private")).data.rows, []);
  await run("INSERT INTO members VALUES(?,?,?)", tenant, "private", "player");
  assert.equal((await read("?league=private")).data.rows.length, 1);
});
test("query validation and unavailable database return controlled errors", async () => {
  for (const query of [
    "?revision=-1",
    "?revision=abc",
    "?sport=unknown",
    "?scope=unknown",
  ])
    assert.equal((await read(query)).status, 422);
  assert.equal((await read("?revision=99")).status, 404);
  failDatabase(true);
  assert.equal((await read()).status, 503);
  signIn("admin");
  assert.equal((await publish(result())).status, 503);
});
test("full journey: CMS publishes, players submit, locked outcomes settle, next round preserves totals", async () => {
  await staff();
  const config = structuredClone(defaultConfig);
  config.football.fixtures.forEach((f) => (f.kickoff = "2099-01-01T00:00:00Z"));
  config.f1.locksAt = "2099-01-01T00:00:00Z";
  assert.equal(
    (
      await adminPost(
        req("/api/admin", { tenant, expectedRevision: 0, config }),
      )
    ).status,
    200,
  );
  signIn("player");
  const picks = Object.fromEntries(
    config.football.fixtures.map((f) => [f.id, outcome]),
  );
  assert.equal(
    (await gamePost(req("/api/game", { action: "submit", revision: 1, picks })))
      .status,
    200,
  );
  assert.equal(
    (await racePost(req("/api/f1", { revision: 1, answers: answers() })))
      .status,
    200,
  );
  signIn("admin");
  assert.equal(
    (await publish({ football: picks, f1: answers() }, 0, 1)).status,
    422,
  );
  // Simulate elapsed time without altering the published round or waiting for a clock.
  const original = Date.now;
  Date.now = () => Date.parse("2099-01-02T00:00:00Z");
  try {
    assert.equal(
      (await publish({ football: picks, f1: answers() }, 0, 1)).status,
      200,
    );
  } finally {
    Date.now = original;
  }
  signIn("player");
  const r = (await read()).data;
  assert.equal(r.rows[0].points, 42);
  assert.equal(r.rows[0].isYou, true);
  assert.equal((await read("?sport=f1")).data.rows[0].points, 30);
  signIn("admin");
  assert.equal(
    (
      await adminPost(
        req("/api/admin", { tenant, expectedRevision: 1, config }),
      )
    ).status,
    200,
  );
  assert.deepEqual((await read()).data.rows, []);
  assert.equal((await read("?scope=all")).data.rows[0].points, 42);
  assert.equal((await read("?revision=1")).data.rows[0].points, 42);
});
test("ignores unrelated legacy rounds and allows authorised partner reads", async () => {
  await staff();
  await run(
    "INSERT INTO submissions VALUES(?,?,?,?,?,?)",
    tenant,
    "legacy",
    "legacy-round",
    "r",
    "{}",
    "2026-01-01",
  );
  assert.deepEqual((await read("?scope=all")).data.rows, []);
  await run(
    "INSERT INTO staff_memberships VALUES(?,?,?)",
    "partner",
    "admin",
    "owner",
  );
  assert.equal((await read("?tenant=partner")).status, 200);
  signIn(null);
  assert.equal((await read("?league=private")).status, 403);
});
test("submitted entries remain pending until results are published", async () => {
  await run(
    "INSERT INTO submissions VALUES(?,?,?,?,?,?)",
    tenant,
    "player",
    "demo-football-v2-r0",
    "r",
    JSON.stringify({ f1: outcome }),
    "2026-01-01",
  );
  const row = (await read()).data.rows[0];
  assert.equal(row.points, 0);
  assert.equal(row.settled, 0);
});
