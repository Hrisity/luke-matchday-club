import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultConfig,
  configSchema,
  scoreF1,
  validF1,
  type F1Pick,
} from "../lib/config.ts";
const [d1, d2, d3, d4] = defaultConfig.f1.drivers.map((d) => d.id);
const [t1, t2, t3] = defaultConfig.f1.teams.map((t) => t.id);
const result: F1Pick = {
  winner: d1,
  second: d2,
  third: d3,
  pole: d1,
  fastest: d3,
  team: t1,
  pitFirst: t2,
};
test("F1 perfect picks score 30 main points plus a separate tiebreaker", () =>
  assert.deepEqual(scoreF1(result, result), { points: 30, tiebreaker: 1 }));
test("pit-first never outranks an additional correct main prediction", () => {
  const wrong = {
    winner: d2,
    second: d3,
    third: d4,
    pole: d2,
    fastest: d2,
    team: t2,
    pitFirst: t2,
  };
  assert.deepEqual(scoreF1(wrong, result), { points: 0, tiebreaker: 1 });
  assert.deepEqual(
    scoreF1({ ...wrong, winner: d1, pitFirst: t3 }, result),
    { points: 5, tiebreaker: 0 },
  );
});
test("F1 allows same driver for race winner and pole but distinct podium slots", () => {
  assert.equal(validF1(result, defaultConfig.f1), true);
  assert.equal(validF1({ ...result, second: d1 }, defaultConfig.f1), false);
});
test("unknown drivers, unknown teams and missing answers rejected", () => {
  for (const answer of [
    { ...result, winner: "forged" },
    { ...result, team: "unknown" },
    { ...result, pitFirst: "" },
  ])
    assert.equal(validF1(answer, defaultConfig.f1), false);
});
test("football config requires exactly six unique fixtures", () => {
  assert.equal(configSchema.safeParse(defaultConfig).success, true);
  assert.equal(
    configSchema.safeParse({
      ...defaultConfig,
      football: {
        ...defaultConfig.football,
        fixtures: defaultConfig.football.fixtures.slice(1),
      },
    }).success,
    false,
  );
  assert.equal(
    configSchema.safeParse({
      ...defaultConfig,
      football: {
        ...defaultConfig.football,
        fixtures: Array(6).fill(defaultConfig.football.fixtures[0]),
      },
    }).success,
    false,
  );
});
test("config rejects injected colours and invalid dates", () => {
  const c = structuredClone(defaultConfig);
  c.football.fixtures[0].hc = "url(javascript:bad)";
  assert.equal(configSchema.safeParse(c).success, false);
  c.football.fixtures[0].hc = "#112233";
  c.f1.locksAt = "not-a-date";
  assert.equal(configSchema.safeParse(c).success, false);
});
test("CMS sports configuration accepts a valid sport and rejects duplicate IDs", () => {
  const sport = { id: "tennis", name: "Tennis", title: "Grand Slam", enabled: true, rules: "Winner 5 points", events: [{ id: "winner", label: "Tournament winner", detail: "Pick one" }] };
  assert.equal(configSchema.safeParse({ ...defaultConfig, sports: [sport] }).success, true);
  assert.equal(configSchema.safeParse({ ...defaultConfig, sports: [sport, sport] }).success, false);
  assert.equal(configSchema.safeParse({ ...defaultConfig, sports: [{ ...sport, events: [{ ...sport.events[0], id: "bad id" }] }] }).success, false);
});
