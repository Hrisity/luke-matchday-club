import { z } from "zod";
import { scorePick, validatePick, type Pick } from "./game.ts";
import { scoreF1, validF1, type GameConfig, type F1Pick } from "./config.ts";
const pick = z
  .object({
    home: z.number().int().min(0).max(20),
    away: z.number().int().min(0).max(20),
    first: z.enum(["HOME", "AWAY", "NONE"]),
  })
  .strict()
  .refine(validatePick, "Score and first scorer disagree");
const id = z.string().min(1).max(40);
export const resultsSchema = z
  .object({
    football: z.record(pick),
    f1: z
      .object({
        winner: id,
        second: id,
        third: id,
        pole: id,
        fastest: id,
        team: id,
        pitFirst: id,
      })
      .strict()
      .nullable(),
  })
  .strict();
export type Results = z.infer<typeof resultsSchema>;
export const emptyResults = (): Results => ({ football: {}, f1: null });
export function validateResults(
  results: Results,
  config: GameConfig,
  now: number,
) {
  for (const fixture of Object.keys(results.football)) {
    const f = config.football.fixtures.find((x) => x.id === fixture);
    if (!f) throw Error("Unknown fixture");
    if (now < Date.parse(f.kickoff))
      throw Error("Results cannot be published before kick-off");
  }
  if (
    results.f1 &&
    (!validF1(results.f1, config.f1) || now < Date.parse(config.f1.locksAt))
  )
    throw Error("Invalid F1 results or race not locked");
}
export type Entry = {
  user: string;
  name: string;
  sport: "football" | "f1";
  answers: Record<string, Pick> | F1Pick;
  results: Results;
};
export type Standing = {
  rank: number;
  user: string;
  name: string;
  points: number;
  exact: number;
  first: number;
  tiebreaker: number;
  settled: number;
};
export function standings(entries: Entry[]): Standing[] {
  const scores = new Map<string, Standing>();
  for (const e of entries) {
    const row = scores.get(e.user) ?? {
      rank: 0,
      user: e.user,
      name: e.name,
      points: 0,
      exact: 0,
      first: 0,
      tiebreaker: 0,
      settled: 0,
    };
    if (e.sport === "football") {
      for (const [id, result] of Object.entries(e.results.football)) {
        const p = (e.answers as Record<string, Pick>)[id];
        if (!p || !validatePick(p)) continue;
        const score = scorePick(p, result);
        row.points += score.points;
        row.exact += Number(score.exact);
        row.first += Number(score.first);
        row.settled++;
      }
    } else if (e.results.f1) {
      const score = scoreF1(e.answers as F1Pick, e.results.f1);
      row.points += score.points;
      row.tiebreaker += Number(score.tiebreaker);
      row.settled++;
    }
    scores.set(e.user, row);
  }
  const rows = [...scores.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.exact - a.exact ||
      b.first - a.first ||
      b.tiebreaker - a.tiebreaker ||
      a.user.localeCompare(b.user),
  );
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    r.rank =
      prev &&
      r.points === prev.points &&
      r.exact === prev.exact &&
      r.first === prev.first &&
      r.tiebreaker === prev.tiebreaker
        ? prev.rank
        : i + 1;
  });
  return rows;
}
