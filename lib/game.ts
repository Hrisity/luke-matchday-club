export type First = "HOME" | "AWAY" | "NONE";
export type Pick = { home: number; away: number; first: First | null };
export type Fixture = {
  id: string;
  home: string;
  away: string;
  h: string;
  a: string;
  hc: string;
  ac: string;
  kickoff: string;
  venue: string;
};
export const TENANT = "luke-owned";
export const ROUND = "demo-2026-11";
export const fixtures: Fixture[] = [
  {
    id: "f1",
    home: "Arsenal",
    away: "Chelsea",
    h: "ARS",
    a: "CHE",
    hc: "#ac3539",
    ac: "#345aa0",
    kickoff: "2026-11-07T12:30:00Z",
    venue: "North London",
  },
  {
    id: "f2",
    home: "Man City",
    away: "Newcastle",
    h: "MCI",
    a: "NEW",
    hc: "#76a7bb",
    ac: "#343b39",
    kickoff: "2026-11-07T15:00:00Z",
    venue: "Manchester",
  },
  {
    id: "f3",
    home: "Liverpool",
    away: "Aston Villa",
    h: "LIV",
    a: "AVL",
    hc: "#b64542",
    ac: "#7c4054",
    kickoff: "2026-11-07T15:00:00Z",
    venue: "Liverpool",
  },
  {
    id: "f4",
    home: "Tottenham",
    away: "Brighton",
    h: "TOT",
    a: "BHA",
    hc: "#293853",
    ac: "#4f7aaf",
    kickoff: "2026-11-07T17:30:00Z",
    venue: "North London",
  },
  {
    id: "f5",
    home: "Man United",
    away: "Everton",
    h: "MUN",
    a: "EVE",
    hc: "#b5493b",
    ac: "#3c5799",
    kickoff: "2026-11-08T14:00:00Z",
    venue: "Manchester",
  },
  {
    id: "f6",
    home: "West Ham",
    away: "Fulham",
    h: "WHU",
    a: "FUL",
    hc: "#874958",
    ac: "#323b3a",
    kickoff: "2026-11-08T14:00:00Z",
    venue: "East London",
  },
  {
    id: "f7",
    home: "Crystal Palace",
    away: "Brentford",
    h: "CRY",
    a: "BRE",
    hc: "#4c649a",
    ac: "#b94e48",
    kickoff: "2026-11-08T14:00:00Z",
    venue: "South London",
  },
  {
    id: "f8",
    home: "Wolves",
    away: "Nottingham Forest",
    h: "WOL",
    a: "NFO",
    hc: "#a57923",
    ac: "#b54141",
    kickoff: "2026-11-08T16:30:00Z",
    venue: "Wolverhampton",
  },
];
export function emptyPick(): Pick {
  return { home: 0, away: 0, first: null };
}
export function validatePick(p: Pick): boolean {
  return (
    Number.isInteger(p.home) &&
    Number.isInteger(p.away) &&
    p.home >= 0 &&
    p.home <= 20 &&
    p.away >= 0 &&
    p.away <= 20 &&
    ["HOME", "AWAY", "NONE"].includes(p.first as string) &&
    (p.first !== "NONE" || (p.home === 0 && p.away === 0)) &&
    (p.first !== "HOME" || p.home > 0) &&
    (p.first !== "AWAY" || p.away > 0)
  );
}
export function isLocked(f: Fixture, now = Date.now()): boolean {
  return now >= Date.parse(f.kickoff);
}
export function scorePick(p: Pick, r: Pick) {
  if (!validatePick(p) || !validatePick(r))
    throw new Error("Invalid pick or result");
  const exact = p.home === r.home && p.away === r.away;
  const outcome = Math.sign(p.home - p.away) === Math.sign(r.home - r.away);
  const first = p.first === r.first;
  return {
    points: (exact ? 5 : outcome ? 2 : 0) + (first ? 1 : 0),
    exact,
    outcome,
    first,
  };
}
export const sampleTable = [
  {
    name: "Offside & thriving",
    initials: "OT",
    points: 186,
    exact: 24,
    change: 2,
    color: "#d9debf",
  },
  {
    name: "The Sunday Gaffer",
    initials: "SG",
    points: 179,
    exact: 23,
    change: 1,
    color: "#ead3bc",
  },
  {
    name: "Net Six & Chill",
    initials: "NC",
    points: 174,
    exact: 21,
    change: -2,
    color: "#d1dce0",
  },
  {
    name: "Annie’s XI",
    initials: "AX",
    points: 168,
    exact: 20,
    change: 3,
    color: "#e3d1dc",
  },
  {
    name: "Expected Vibes",
    initials: "EV",
    points: 162,
    exact: 19,
    change: 0,
    color: "#dedac4",
  },
  {
    name: "Top Bins Only",
    initials: "TB",
    points: 156,
    exact: 18,
    change: 1,
    color: "#cbdacf",
  },
  {
    name: "VAR from home",
    initials: "VH",
    points: 152,
    exact: 18,
    change: -1,
    color: "#e5d3c9",
  },
  {
    name: "The Late Winner",
    initials: "LW",
    points: 148,
    exact: 17,
    change: 2,
    color: "#d4d4e1",
  },
];
