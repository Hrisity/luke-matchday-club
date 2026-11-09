import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await env.DB!.prepare("SELECT 1 AS ok").first();
    return Response.json({ ok: Number(result?.ok) === 1, service: "luke-matchday-club" });
  } catch {
    return Response.json({ ok: false, service: "luke-matchday-club" }, { status: 503 });
  }
}
