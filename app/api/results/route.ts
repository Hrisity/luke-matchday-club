import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { readConfig, canManage, roundId } from "../../../lib/config-server";
import { TENANT } from "../../../lib/game";
import { configSchema, defaultConfig } from "../../../lib/config";
import {
  resultsSchema,
  emptyResults,
  validateResults,
  standings,
  type Entry,
} from "../../../lib/settlement";
import { z } from "zod";
export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function configAt(tenant: string, revision: number) {
  if (revision === 0) return defaultConfig;
  const row = await env
    .DB!.prepare(
      "SELECT config FROM game_configs WHERE tenant=? AND revision=?",
    )
    .bind(tenant, revision)
    .first();
  return row ? configSchema.parse(JSON.parse(String(row.config))) : null;
}
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams,
      user = await getChatGPTUser(),
      tenant = params.get("tenant") || TENANT;
    if (tenant !== TENANT && (!user || !(await canManage(user.userId, tenant))))
      return json({ error: "Tenant access denied" }, 403);
    const current = await readConfig(tenant),
      revision = Number(params.get("revision") ?? current.revision),
      sport = params.get("sport") || "football",
      scope = params.get("scope") || "round";
    if (
      !Number.isInteger(revision) ||
      revision < 0 ||
      !["football", "f1"].includes(sport) ||
      !["round", "all"].includes(scope)
    )
      return json({ error: "Invalid results query" }, 422);
    const config = await configAt(tenant, revision);
    if (!config) return json({ error: "Round not found" }, 404);
    const league = params.get("league");
    if (
      league &&
      (!user ||
        !(await env
          .DB!.prepare(
            "SELECT 1 FROM members WHERE tenant=? AND league=? AND user=?",
          )
          .bind(tenant, league, user.userId)
          .first()))
    )
      return json({ error: "League membership required" }, 403);
    const history = await env
      .DB!.prepare(
        "SELECT revision,version,payload,published FROM round_results WHERE tenant=? ORDER BY revision DESC,version DESC",
      )
      .bind(tenant)
      .all();
    const latest = new Map<number, (typeof history.results)[number]>();
    for (const r of history.results)
      if (!latest.has(Number(r.revision))) latest.set(Number(r.revision), r);
    const round = latest.get(revision),
      results = round
        ? resultsSchema.parse(JSON.parse(String(round.payload)))
        : emptyResults();
    const table = sport === "football" ? "submissions" : "race_picks",
      column = sport === "football" ? "snapshot" : "answers";
    const submissions = await env
      .DB!.prepare(
        `SELECT s.user,s.round,s.${column} AS answers,p.name FROM ${table} s LEFT JOIN profiles p ON p.tenant=s.tenant AND p.user=s.user WHERE s.tenant=? ${league ? "AND EXISTS(SELECT 1 FROM members m WHERE m.tenant=s.tenant AND m.user=s.user AND m.league=?)" : ""}`,
      )
      .bind(...(league ? [tenant, league] : [tenant]))
      .all();
    const entries: Entry[] = [];
    for (const s of submissions.results) {
      const r = Number(String(s.round).split("-r").pop());
      if (
        s.round !== roundId(r, sport as "football" | "f1") ||
        (scope === "round" && r !== revision)
      )
        continue;
      const outcome = latest.get(r);
      entries.push({
        user: String(s.user),
        name: String(s.name || "Player"),
        sport: sport as "football" | "f1",
        answers: JSON.parse(String(s.answers)),
        results: outcome
          ? resultsSchema.parse(JSON.parse(String(outcome.payload)))
          : emptyResults(),
      });
    }
    const rows = standings(entries);
    return json({
      revision,
      config,
      results,
      version: Number(round?.version || 0),
      published: round?.published || null,
      rows: rows.map(({ user: id, ...r }) => ({
        ...r,
        isYou: id === user?.userId,
      })),
      history: history.results
        .filter((r) => Number(r.revision) === revision)
        .map(({ version, published }) => ({ version, published })),
    });
  } catch (e) {
    console.error("results.read", e);
    return json({ error: "Results unavailable" }, 503);
  }
}
const mutation = z
  .object({
    tenant: z.string().min(1).max(80),
    revision: z.number().int().min(0),
    expectedVersion: z.number().int().min(0),
    results: resultsSchema,
  })
  .strict();
export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return json({ error: "Request origin rejected" }, 403);
  try {
    const user = await getChatGPTUser();
    if (!user) return json({ error: "Sign in required" }, 401);
    const raw = await req.text();
    if (raw.length > 16000) return json({ error: "Request too large" }, 413);
    let value;
    try {
      value = JSON.parse(raw);
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    const parsed = mutation.safeParse(value);
    if (!parsed.success)
      return json(
        { error: parsed.error.issues.map((i) => i.message).join("; ") },
        422,
      );
    const b = parsed.data;
    if (!(await canManage(user.userId, b.tenant)))
      return json({ error: "Staff access required" }, 403);
    const config = await configAt(b.tenant, b.revision);
    if (!config) return json({ error: "Round not found" }, 404);
    try {
      validateResults(b.results, config, Date.now());
    } catch (e) {
      return json({ error: (e as Error).message }, 422);
    }
    const written = await env
      .DB!.prepare(
        "INSERT INTO round_results(tenant,revision,version,payload,actor,published) SELECT ?,?,?,?,?,? WHERE COALESCE((SELECT MAX(version) FROM round_results WHERE tenant=? AND revision=?),0)=?",
      )
      .bind(
        b.tenant,
        b.revision,
        b.expectedVersion + 1,
        JSON.stringify(b.results),
        user.userId,
        new Date().toISOString(),
        b.tenant,
        b.revision,
        b.expectedVersion,
      )
      .run();
    if (written.meta.changes !== 1)
      return json({ error: "Results changed. Reload before publishing." }, 409);
    return json({ ok: true, version: b.expectedVersion + 1 });
  } catch (e) {
    console.error("results.write", e);
    return json({ error: "Could not publish results" }, 503);
  }
}
