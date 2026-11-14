import { env } from "cloudflare:workers";
import { defaultConfig, configSchema, RULES_VERSION } from "./config";
import { TENANT } from "./game";
export async function readConfig(tenant = TENANT) {
  const row = await env
    .DB!.prepare(
      "SELECT revision,config,rules FROM game_configs WHERE tenant=? ORDER BY revision DESC LIMIT 1",
    )
    .bind(tenant)
    .first();
  return row
    ? {
        config: configSchema.parse(JSON.parse(String(row.config))),
        revision: Number(row.revision),
        rulesVersion: String(row.rules),
      }
    : { config: defaultConfig, revision: 0, rulesVersion: RULES_VERSION };
}
export function roundId(revision: number, sport: "football" | "f1") {
  return `demo-${sport}-v2-r${revision}`;
}
export async function staffTenants(user: string) {
  const rows = await env
    .DB!.prepare(
      "SELECT tenant,role FROM staff_memberships WHERE user=? AND role IN ('owner','admin','competition_manager') ORDER BY tenant",
    )
    .bind(user)
    .all();
  const memberships = rows.results as { tenant: string; role: string }[];
  // Operator-managed grant; never accept an account ID from a request parameter.
  if (env.CMS_ADMIN_USER_ID && user === env.CMS_ADMIN_USER_ID &&
      !memberships.some((m) => m.tenant === TENANT)) {
    memberships.push({ tenant: TENANT, role: "admin" });
  }
  return memberships;
}
export async function canManage(user: string, tenant: string) {
  return (await staffTenants(user)).some((m) => m.tenant === tenant);
}
