import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { readConfig, roundId } from "../../../lib/config-server";
import { validF1, f1Fields, type F1Pick } from "../../../lib/config";
import { TENANT } from "../../../lib/game";
export const dynamic = "force-dynamic";
const json = (v: unknown, status = 200) =>
  Response.json(v, { status, headers: { "Cache-Control": "no-store" } });
export async function GET() {
  try {
    const user = await getChatGPTUser(),
      current = await readConfig();
    const saved = user
      ? await env
          .DB!.prepare(
            "SELECT answers,receipt,submitted FROM race_picks WHERE tenant=? AND user=? AND round=?",
          )
          .bind(TENANT, user.userId, roundId(current.revision, "f1"))
          .first()
      : null;
    return json({
      ...current,
      signedIn: !!user,
      saved: saved
        ? { ...saved, answers: JSON.parse(String(saved.answers)) }
        : null,
    });
  } catch (e) {
    console.error("f1.read.failed", String(e));
    return json({ error: "Could not load the race." }, 503);
  }
}
export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return json({ error: "Request origin rejected." }, 403);
  try {
    const user = await getChatGPTUser();
    if (!user)
      return json({ error: "Sign in to submit your race predictions." }, 401);
    const raw = await req.text();
    if (raw.length > 4000) return json({ error: "Request too large." }, 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: "Invalid JSON." }, 400);
    }
    const current = await readConfig(),
      round = roundId(current.revision, "f1");
    if (body.revision !== current.revision)
      return json(
        { error: "The race configuration changed. Reload before submitting." },
        409,
      );
    if (Date.now() >= Date.parse(current.config.f1.locksAt))
      return json({ error: "This race is locked." }, 409);
    const p = body.answers as F1Pick;
    if (!p || Object.keys(p).length !== 7 || !validF1(p, current.config.f1))
      return json(
        {
          error: "Choose all seven answers and three different podium drivers.",
        },
        422,
      );
    const snapshot = JSON.stringify(
      Object.fromEntries(f1Fields.map((f) => [f.key, p[f.key]])),
    );
    const old = await env
      .DB!.prepare(
        "SELECT answers,receipt,submitted FROM race_picks WHERE tenant=? AND user=? AND round=?",
      )
      .bind(TENANT, user.userId, round)
      .first();
    if (old?.answers === snapshot)
      return json({ ok: true, receipt: old.receipt, submitted: old.submitted });
    const receipt = "F1-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
      submitted = new Date().toISOString();
    const write = await env
      .DB!.prepare(
        "INSERT INTO race_picks(tenant,user,round,answers,receipt,submitted) SELECT ?,?,?,?,?,? WHERE unixepoch('now')<unixepoch(?) ON CONFLICT(tenant,user,round) DO UPDATE SET answers=excluded.answers,receipt=excluded.receipt,submitted=excluded.submitted",
      )
      .bind(
        TENANT,
        user.userId,
        round,
        snapshot,
        receipt,
        submitted,
        current.config.f1.locksAt,
      )
      .run();
    if (write.meta.changes !== 1)
      return json({ error: "The deadline passed while saving." }, 409);
    return json({ ok: true, receipt, submitted });
  } catch (e) {
    console.error("f1.write.failed", String(e));
    return json({ error: "Race predictions could not be saved." }, 503);
  }
}
