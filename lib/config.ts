import { z } from "zod";
import { fixtures } from "./game.ts";
const name = z.string().trim().min(1).max(60);
const choice = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
  name,
});
const unique = (v: { id: string }[]) =>
  new Set(v.map((x) => x.id)).size === v.length;
export const configSchema = z
  .object({
    football: z.object({
      title: name,
      fixtures: z
        .array(
          z
            .object({
              id: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
              home: name,
              away: name,
              h: z.string().min(2).max(4),
              a: z.string().min(2).max(4),
              hc: z.string().regex(/^#[0-9a-fA-F]{6}$/),
              ac: z.string().regex(/^#[0-9a-fA-F]{6}$/),
              kickoff: z.string().datetime(),
              venue: name,
            })
            .refine((f) => f.home !== f.away, "Teams must differ"),
        )
        .length(6)
        .refine(unique, "Fixture IDs must be unique"),
    }),
    f1: z.object({
      title: name,
      locksAt: z.string().datetime(),
      drivers: z
        .array(choice)
        .min(3)
        .max(30)
        .refine(unique, "Driver IDs must be unique"),
      teams: z
        .array(choice)
        .min(2)
        .max(15)
        .refine(unique, "Team IDs must be unique"),
    }),
  })
  .strict();
export type GameConfig = z.infer<typeof configSchema>;
export const defaultConfig: GameConfig = {
  football: { title: "Matchweek 11", fixtures },
  f1: {
    title: "Luke Grand Prix · Demo",
    locksAt: "2026-11-07T12:00:00Z",
    drivers: [
      { id: "d1", name: "Alex Taylor" },
      { id: "d2", name: "Jamie Costa" },
      { id: "d3", name: "Sam Laurent" },
      { id: "d4", name: "Robin Silva" },
      { id: "d5", name: "Charlie Rossi" },
      { id: "d6", name: "Morgan Park" },
    ],
    teams: [
      { id: "t1", name: "Atlas Racing" },
      { id: "t2", name: "Northstar GP" },
      { id: "t3", name: "Apex Motorsport" },
    ],
  },
};
export const RULES_VERSION = "luke-2026-v2";
export const footballRules = {
  fixtures: 6,
  exact: 5,
  outcome: 2,
  first: 2,
  max: 42,
};
export const f1Fields = [
  { key: "winner", label: "Race winner", kind: "driver" },
  { key: "second", label: "Second place", kind: "driver" },
  { key: "third", label: "Third place", kind: "driver" },
  { key: "pole", label: "Pole position", kind: "driver" },
  { key: "fastest", label: "Fastest lap", kind: "driver" },
  { key: "team", label: "Highest-scoring team", kind: "team" },
  { key: "pitFirst", label: "First team to pit", kind: "team" },
] as const;
export type F1Pick = Record<(typeof f1Fields)[number]["key"], string>;
export const blankF1 = (): F1Pick => ({
  winner: "",
  second: "",
  third: "",
  pole: "",
  fastest: "",
  team: "",
  pitFirst: "",
});
export function validF1(p: F1Pick, config: GameConfig["f1"]): boolean {
  return (
    f1Fields.every(
      (f) =>
        typeof p[f.key] === "string" &&
        (f.kind === "driver" ? config.drivers : config.teams).some(
          (v) => v.id === p[f.key],
        ),
    ) && new Set([p.winner, p.second, p.third]).size === 3
  );
}
// The pit-first answer breaks ties on the 30 main points; it is not added to main points.
export function scoreF1(p: F1Pick, result: F1Pick) {
  const points = f1Fields
    .filter((f) => f.key !== "pitFirst")
    .reduce((n, f) => n + (p[f.key] && p[f.key] === result[f.key] ? 5 : 0), 0);
  return {
    points,
    tiebreaker: p.pitFirst && p.pitFirst === result.pitFirst ? 1 : 0,
  };
}
