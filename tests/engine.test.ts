import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scorePick,
  validatePick,
  isLocked,
  fixtures,
  type Pick,
} from "../lib/game.ts";
const p = (home: number, away: number, first: Pick["first"]): Pick => ({
  home,
  away,
  first,
});
test("exact score plus first scorer is seven, never nine", () =>
  assert.equal(scorePick(p(2, 1, "HOME"), p(2, 1, "HOME")).points, 7));
test("right outcome plus first scorer is four", () =>
  assert.equal(scorePick(p(1, 0, "HOME"), p(2, 1, "HOME")).points, 4));
test("wrong outcome and first scorer gives zero", () =>
  assert.equal(scorePick(p(1, 1, "AWAY"), p(2, 1, "HOME")).points, 0));
test("nil-nil with neither is seven", () =>
  assert.equal(scorePick(p(0, 0, "NONE"), p(0, 0, "NONE")).points, 7));
test("exact score without first scorer gives five", () =>
  assert.equal(scorePick(p(2, 1, "AWAY"), p(2, 1, "HOME")).points, 5));
test("invalid goal bounds, fractions and incomplete picks fail", () => {
  for (const v of [-1, 21, 1.5, NaN, Infinity])
    assert.equal(validatePick(p(v, 0, "HOME")), false);
  assert.equal(validatePick(p(0, 0, null)), false);
  assert.equal(validatePick(p(1, 0, "NONE")), false);
  assert.equal(validatePick(p(0, 1, "HOME")), false);
});
test("lock boundary is inclusive and deterministic", () => {
  const f = fixtures[0],
    t = Date.parse(f.kickoff);
  assert.equal(isLocked(f, t - 1), false);
  assert.equal(isLocked(f, t), true);
  assert.equal(isLocked(f, t + 1), true);
});
test("all valid results remain in the zero to seven point range", () => {
  for (let h = 0; h < 5; h++)
    for (let a = 0; a < 5; a++)
      for (const first of ["HOME", "AWAY", "NONE"] as const) {
        const pick = p(h, a, first);
        if (!validatePick(pick)) continue;
        const result = scorePick(pick, p(2, 1, "HOME"));
        assert.ok(result.points >= 0 && result.points <= 7);
        if (result.exact)
          assert.equal(result.points, 5 + 2 * Number(result.first));
      }
});
