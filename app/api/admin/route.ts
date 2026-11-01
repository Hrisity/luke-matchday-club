import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import {
  canManage,
  readConfig,
  staffTenants,
} from "../../../lib/config-server";
import { configSchema, RULES_VERSION } from "../../../lib/config";
import { z } from "zod";
export const dynamic = "force-dynamic";
const json = (v: unknown, status = 200) =>
  Response.json(v, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(req: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return json({ error: "Sign in to access the Game CMS." }, 401);
    const memberships = await staffTenants(user.userId);
    if (!memberships.length)
      return json(
        {
          error:
            "Your account has no CMS staff membership. Ask the platform operator to provision access.",
          subject: user.userId,
        },
        403,
      );
    const tenant =
      new URL(req.url).searchParams.get("tenant") || memberships[0].tenant;
    if (!(await canManage(user.userId, tenant)))
      return json({ error: "Tenant access denied." }, 403);
    const data = await readConfig(tenant);
    const history = await env
      .DB!.prepare(
        "SELECT revision,rules,published FROM game_configs WHERE tenant=? ORDER BY revision DESC LIMIT 10",
      )
      .bind(tenant)
      .all();
    return json({ ...data, tenant, memberships, history: history.results });
  } catch (e) {
    console.error("cms.read.failed", String(e));
    return json({ error: "CMS could not be loaded." }, 503);
  }
}
export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return json({ error: "Request origin rejected." }, 403);
  try {
    const user = await getChatGPTUser();
    if (!user) return json({ error: "Sign in required." }, 401);
    const raw = await req.text();
    if (raw.length > 24000)
      return json({ error: "Configuration too large." }, 413);
    let value;
    try {
      value = JSON.parse(raw);
    } catch {
      return json({ error: "Invalid JSON." }, 400);
    }
    const b = z
      .object({
        tenant: z.string().min(1).max(80),
        expectedRevision: z.number().int().min(0),
        config: configSchema,
      })
      .strict()
      .safeParse(value);
    if (!b.success)
      return json(
        { error: b.error.issues.map((i) => i.message).join("; ") },
        422,
      );
    if (!(await canManage(user.userId, b.data.tenant)))
      return json({ error: "Tenant access denied." }, 403);
    if (
      b.data.config.football.fixtures.some(
        (f) => Date.parse(f.kickoff) <= Date.now(),
      ) ||
      Date.parse(b.data.config.f1.locksAt) <= Date.now()
    )
      return json({ error: "New rounds must have future deadlines." }, 422);
    const { tenant, expectedRevision, config } = b.data,
      revision = expectedRevision + 1;
    // Immutable insert with a compare-and-swap guard. Concurrent editors cannot overwrite each other.
    const inserted = await env
      .DB!.prepare(
        "INSERT INTO game_configs(tenant,revision,config,rules,published,actor) SELECT ?,?,?,?,?,? WHERE COALESCE((SELECT MAX(revision) FROM game_configs WHERE tenant=?),0)=?",
      )
      .bind(
        tenant,
        revision,
        JSON.stringify(config),
        RULES_VERSION,
        new Date().toISOString(),
        user.userId,
        tenant,
        expectedRevision,
      )
      .run();
    if (inserted.meta.changes !== 1)
      return json(
        {
          error:
            "Another editor published first. Reload the CMS before publishing.",
        },
        409,
      );
    return json({ ok: true, revision });
  } catch (e) {
    console.error("cms.publish.failed", String(e));
    return json({ error: "Could not publish configuration." }, 503);
  }
}
