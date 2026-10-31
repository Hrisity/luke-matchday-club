import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import {
  fixtures,
  TENANT,
  ROUND,
  validatePick,
  type Pick,
} from "../../../lib/game";
import { z } from "zod";
export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const pickSchema = z
  .object({
    home: z.number().int().min(0).max(20),
    away: z.number().int().min(0).max(20),
    first: z.enum(["HOME", "AWAY", "NONE"]).nullable(),
  })
  .strict();
const mutation = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("draft"),
    fixture: z.string(),
    pick: pickSchema,
  }),
  z.object({ action: z.literal("submit"), picks: z.record(pickSchema) }),
  z.object({
    action: z.literal("createLeague"),
    name: z.string().trim().min(3).max(40),
  }),
  z.object({
    action: z.literal("joinLeague"),
    code: z.string().trim().min(6).max(24),
  }),
  z.object({
    action: z.literal("profile"),
    name: z.string().trim().min(2).max(32),
  }),
]);
export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user)
      return json({ user: null, picks: {}, receipt: null, leagues: [] });
    const db = env.DB!;
    const [p, s, l, profile] = await Promise.all([
      db
        .prepare(
          "SELECT fixture,home,away,first FROM picks WHERE tenant=? AND user=? AND round=?",
        )
        .bind(TENANT, user.userId, ROUND)
        .all(),
      db
        .prepare(
          "SELECT receipt,snapshot,submitted FROM submissions WHERE tenant=? AND user=? AND round=?",
        )
        .bind(TENANT, user.userId, ROUND)
        .first(),
      db
        .prepare(
          "SELECT l.id,l.name,l.code,l.owner,(SELECT COUNT(*) FROM members x WHERE x.tenant=l.tenant AND x.league=l.id) AS count FROM leagues l JOIN members m ON m.league=l.id AND m.tenant=l.tenant WHERE m.user=? AND m.tenant=? ORDER BY l.created DESC",
        )
        .bind(user.userId, TENANT)
        .all(),
      db
        .prepare("SELECT name FROM profiles WHERE tenant=? AND user=?")
        .bind(TENANT, user.userId)
        .first(),
    ]);
    return json({
      user: { name: profile?.name || user.fullName || "Matchday fan" },
      picks: Object.fromEntries(
        p.results.map((x) => [
          x.fixture,
          { home: x.home, away: x.away, first: x.first },
        ]),
      ),
      receipt: s,
      leagues: l.results,
    });
  } catch (error) {
    console.error("game.read.failed", String(error));
    return json(
      { error: "We couldn’t load your saved game. Please try again." },
      503,
    );
  }
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    return json({ error: "Request origin rejected." }, 403);
  const user = await getChatGPTUser();
  if (!user) return json({ error: "Sign in to save your predictions." }, 401);
  try {
    if (Number(request.headers.get("content-length")) > 16000)
      return json({ error: "Request too large." }, 413);
    const raw = await request.text();
    if (raw.length > 16000) return json({ error: "Request too large." }, 413);
    const parsed = mutation.safeParse(JSON.parse(raw));
    if (!parsed.success)
      return json({ error: "Please check your entries and try again." }, 422);
    const b = parsed.data,
      db = env.DB!,
      uid = user.userId,
      now = new Date().toISOString();
    const audit = db
      .prepare(
        "INSERT INTO events(id,tenant,actor,action,at) VALUES(?,?,?,?,?)",
      )
      .bind(crypto.randomUUID(), TENANT, uid, b.action, now);
    if (b.action === "draft" || b.action === "submit") {
      const data = b.action === "draft" ? { [b.fixture]: b.pick } : b.picks;
      if (
        b.action === "submit" &&
        (Object.keys(data).length !== 8 ||
          !fixtures.every(
            (f) => data[f.id] && validatePick(data[f.id] as Pick),
          ))
      )
        return json(
          { error: "Complete all eight scorelines and first-scoring teams." },
          422,
        );
      const statements = [];
      for (const [id, p] of Object.entries(data)) {
        const fixture = fixtures.find((f) => f.id === id);
        if (!fixture) return json({ error: "Fixture not found." }, 404);
        if (Date.now() >= Date.parse(fixture.kickoff))
          return json(
            {
              error:
                "This fixture has locked. Your saved prediction is unchanged.",
            },
            409,
          );
        // The SQL clock condition is authoritative at write time, not just request validation.
        statements.push(
          db
            .prepare(
              "INSERT INTO picks(tenant,user,round,fixture,home,away,first,updated) SELECT ?,?,?,?,?,?,?,? WHERE unixepoch('now') < unixepoch(?) ON CONFLICT(tenant,user,round,fixture) DO UPDATE SET home=excluded.home,away=excluded.away,first=excluded.first,updated=excluded.updated",
            )
            .bind(
              TENANT,
              uid,
              ROUND,
              id,
              p.home,
              p.away,
              p.first,
              now,
              fixture.kickoff,
            ),
        );
      }
      let receipt: string | null = null;
      if (b.action === "submit") {
        const snapshot = JSON.stringify(
          Object.fromEntries(fixtures.map((f) => [f.id, data[f.id]])),
        );
        const prior = await db
          .prepare(
            "SELECT receipt,snapshot,submitted FROM submissions WHERE tenant=? AND user=? AND round=?",
          )
          .bind(TENANT, uid, ROUND)
          .first();
        if (prior?.snapshot === snapshot)
          return json({ ok: true, receipt: prior });
        receipt = "LK-" + crypto.randomUUID().slice(0, 8).toUpperCase();
        statements.push(
          db
            .prepare(
              "INSERT INTO submissions(tenant,user,round,receipt,snapshot,submitted) SELECT ?,?,?,?,?,? WHERE unixepoch('now') < unixepoch(?) ON CONFLICT(tenant,user,round) DO UPDATE SET receipt=excluded.receipt,snapshot=excluded.snapshot,submitted=excluded.submitted",
            )
            .bind(
              TENANT,
              uid,
              ROUND,
              receipt,
              snapshot,
              now,
              fixtures[0].kickoff,
            ),
        );
      }
      statements.push(audit);
      const written = await db.batch(statements);
      if (written.slice(0, -1).some((r) => r.meta.changes === 0))
        return json(
          {
            error:
              "The deadline passed while saving. Refresh to see your saved picks.",
          },
          409,
        );
      return json({
        ok: true,
        savedAt: now,
        ...(receipt
          ? {
              receipt: {
                receipt,
                submitted: now,
                snapshot: JSON.stringify(data),
              },
            }
          : {}),
      });
    }
    if (b.action === "createLeague") {
      const count = await db
        .prepare("SELECT COUNT(*) AS n FROM leagues WHERE tenant=? AND owner=?")
        .bind(TENANT, uid)
        .first();
      if (Number(count?.n) >= 10)
        return json({ error: "You can create up to 10 demo leagues." }, 422);
      const id = crypto.randomUUID(),
        code = crypto
          .randomUUID()
          .replaceAll("-", "")
          .slice(0, 16)
          .toUpperCase();
      await db.batch([
        db
          .prepare(
            "INSERT INTO leagues(id,tenant,owner,name,code,created) VALUES(?,?,?,?,?,?)",
          )
          .bind(id, TENANT, uid, b.name, code, now),
        db
          .prepare("INSERT INTO members(tenant,league,user) VALUES(?,?,?)")
          .bind(TENANT, id, uid),
        audit,
      ]);
      return json({ ok: true });
    }
    if (b.action === "joinLeague") {
      const league = await db
        .prepare("SELECT id FROM leagues WHERE tenant=? AND code=?")
        .bind(TENANT, b.code.toUpperCase())
        .first();
      if (!league)
        return json(
          {
            error:
              "That invite code wasn’t found. Check it with your league owner.",
          },
          404,
        );
      await db.batch([
        db
          .prepare(
            "INSERT OR IGNORE INTO members(tenant,league,user) VALUES(?,?,?)",
          )
          .bind(TENANT, league.id, uid),
        audit,
      ]);
      return json({ ok: true });
    }
    await db.batch([
      db
        .prepare(
          "INSERT INTO profiles(tenant,user,name) VALUES(?,?,?) ON CONFLICT(tenant,user) DO UPDATE SET name=excluded.name",
        )
        .bind(TENANT, uid, b.name),
      audit,
    ]);
    return json({ ok: true });
  } catch (error) {
    console.error("game.write.failed", String(error));
    return json(
      { error: "Your changes could not be saved. Please try again." },
      503,
    );
  }
}
