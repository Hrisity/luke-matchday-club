import { test } from "node:test";
import assert from "node:assert/strict";
import {
  standings,
  emptyResults,
  resultsSchema,
  validateResults,
  type Entry,
} from "../lib/settlement.ts";
import { defaultConfig, blankF1 } from "../lib/config.ts";
const result = { home: 2, away: 1, first: "HOME" as const };
const entry = (
  user: string,
  answers: Entry["answers"] = { f1: result },
): Entry => ({
  user,
  name: user,
  sport: "football",
  answers,
  results: { football: { f1: result }, f1: null },
});
test("empty results are independent and no entrants fabricates no rankings", () => {
  assert.deepEqual(standings([]), []);
  const a = emptyResults();
  a.football.f1 = result;
  assert.deepEqual(emptyResults(), { football: {}, f1: null });
});
test("aggregates rounds and ranks football ties by exact then first scorers", () => {
  const rows = standings([
    entry("a"),
    entry("a"),
    entry("b", { f1: { home: 1, away: 0, first: "HOME" } }),
    entry("c", { f1: { home: 2, away: 1, first: "AWAY" } }),
  ]);
  assert.deepEqual(
    rows.map((r) => [r.name, r.points, r.rank]),
    [
      ["a", 14, 1],
      ["c", 5, 2],
      ["b", 4, 3],
    ],
  );
});
test("shared ranks skip places and name ordering is deterministic", () => {
  const rows = standings([entry("z"), entry("a"), entry("b", {})]);
  assert.deepEqual(
    rows.map((r) => [r.name, r.rank]),
    [
      ["a", 1],
      ["z", 1],
      ["b", 3],
    ],
  );
});
test("missing and invalid submitted picks are not scored", () => {
  assert.equal(
    standings([
      entry("a", {}),
      entry("b", { f1: { home: -1, away: 0, first: null } }),
    ])[0].settled,
    0,
  );
});
test("unsettled F1 and incorrect answers earn no points", () => {
  const e: Entry = {
    ...entry("a"),
    sport: "f1",
    answers: blankF1(),
    results: emptyResults(),
  };
  assert.equal(standings([e])[0].points, 0);
  e.results.f1 = {
    winner: "a",
    second: "b",
    third: "c",
    pole: "a",
    fastest: "a",
    team: "t",
    pitFirst: "t",
  };
  assert.equal(standings([e])[0].points, 0);
});
test("F1 tie break decides equal main points", () => {
  const f1 = {
    winner: "a",
    second: "b",
    third: "c",
    pole: "a",
    fastest: "a",
    team: "t",
    pitFirst: "t",
  };
  const e: Entry = {
    ...entry("a"),
    sport: "f1",
    answers: f1,
    results: { football: {}, f1 },
  };
  const rows = standings([
    e,
    { ...e, user: "b", answers: { ...f1, pitFirst: "wrong" } },
  ]);
  assert.deepEqual(
    rows.map((r) => [r.points, r.tiebreaker, r.rank]),
    [
      [30, 1, 1],
      [30, 0, 2],
    ],
  );
});
test("all publication validation branches", () => {
  const c = structuredClone(defaultConfig),
    r = { football: { f1: result }, f1: null };
  assert.throws(() => validateResults(r, c, 0), /kick-off/);
  assert.throws(
    () =>
      validateResults(
        { football: { unknown: result }, f1: null },
        c,
        Date.now(),
      ),
    /Unknown/,
  );
  validateResults(r, c, Date.parse(c.football.fixtures[0].kickoff));
  assert.throws(
    () => validateResults({ football: {}, f1: blankF1() }, c, Date.now()),
    /Invalid/,
  );
  const [a, b, d] = c.f1.drivers;
  const [t] = c.f1.teams;
  const f1 = {
    winner: a.id,
    second: b.id,
    third: d.id,
    pole: a.id,
    fastest: a.id,
    team: t.id,
    pitFirst: t.id,
  };
  assert.throws(() => validateResults({ football: {}, f1 }, c, 0), /locked/);
  validateResults({ football: {}, f1 }, c, Date.parse(c.f1.locksAt));
  assert.equal(resultsSchema.safeParse({ ...r, extra: true }).success, false);
});
