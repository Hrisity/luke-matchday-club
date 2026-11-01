import { z } from "zod";
import { fixtures } from "./game.ts";
const name = z.string().trim().min(1).max(60);
const choice = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
  name,
  image: z.union([z.string().url().max(500), z.literal("")]).optional(),
  team: z.string().trim().max(60).optional(),
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
      { id: "russell", name: "George Russell", team: "Mercedes", image: "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/mercedes/georus01/2026mercedesgeorus01right.webp" },
      { id: "antonelli", name: "Kimi Antonelli", team: "Mercedes", image: "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/mercedes/andant01/2026mercedesandant01right.webp" },
      { id: "leclerc", name: "Charles Leclerc", team: "Ferrari", image: "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/ferrari/chalec01/2026ferrarichalec01right.webp" },
      { id: "hamilton", name: "Lewis Hamilton", team: "Ferrari", image: "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/ferrari/lewham01/2026ferrarilewham01right.webp" },
      { id: "verstappen", name: "Max Verstappen", team: "Red Bull Racing", image: "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/redbullracing/maxver01/2026redbullracingmaxver01right.webp" },
      { id: "hadjar", name: "Isack Hadjar", team: "Red Bull Racing", image: "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/redbullracing/isahad01/2026redbullracingisahad01right.webp" },
      { id: "norris", name: "Lando Norris", team: "McLaren", image: "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/mclaren/lannor01/2026mclarenlannor01right.webp" },
      { id: "piastri", name: "Oscar Piastri", team: "McLaren", image: "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/mclaren/oscpia01/2026mclarenoscpia01right.webp" },
      { id: "lawson", name: "Liam Lawson", team: "Racing Bulls", image: "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/racingbulls/lialaw01/2026racingbullslialaw01right.webp" },
      { id: "lindblad", name: "Arvid Lindblad", team: "Racing Bulls", image: "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/racingbulls/arvlin01/2026racingbullsarvlin01right.webp" },
      { id: "gasly", name: "Pierre Gasly", team: "Alpine", image: "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/alpine/piegas01/2026alpinepiegas01right.webp" },
      { id: "colapinto", name: "Franco Colapinto", team: "Alpine", image: "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/alpine/fracol01/2026alpinefracol01right.webp" },
      { id: "ocon", name: "Esteban Ocon", team: "Haas", image: "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/haasf1team/estoco01/2026haasf1teamestoco01right.webp" },
      { id: "bearman", name: "Oliver Bearman", team: "Haas", image: "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/haasf1team/olibea01/2026haasf1teamolibea01right.webp" },
      { id: "hulkenberg", name: "Nico Hulkenberg", team: "Audi", image: "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/audi/nichul01/2026audinichul01right.webp" },
      { id: "bortoleto", name: "Gabriel Bortoleto", team: "Audi", image: "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/audi/gabbor01/2026audigabbor01right.webp" },
      { id: "sainz", name: "Carlos Sainz", team: "Williams", image: "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/williams/carsai01/2026williamscarsai01right.webp" },
      { id: "albon", name: "Alexander Albon", team: "Williams", image: "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/williams/alealb01/2026williamsalealb01right.webp" },
      { id: "alonso", name: "Fernando Alonso", team: "Aston Martin", image: "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/astonmartin/feralo01/2026astonmartinferalo01right.webp" },
      { id: "stroll", name: "Lance Stroll", team: "Aston Martin", image: "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/astonmartin/lanstr01/2026astonmartinlanstr01right.webp" },
      { id: "perez", name: "Sergio Perez", team: "Cadillac", image: "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/cadillac/serper01/2026cadillacserper01right.webp" },
      { id: "bottas", name: "Valtteri Bottas", team: "Cadillac", image: "https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/cadillac/valbot01/2026cadillacvalbot01right.webp" },
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
