import { cookies } from "next/headers";
import { z } from "zod";
const accounts = { hrisi: { password: "demo", name: "Hrisi" }, luke: { password: "demo", name: "Luke" }, samo: { password: "demo", name: "Samo" } } as const;
export async function POST(req: Request) {
  const body = z.object({ username: z.enum(["hrisi", "luke", "samo"]), password: z.string().max(64) }).safeParse(await req.json().catch(() => null));
  if (!body.success || accounts[body.data.username].password !== body.data.password) return Response.json({ error: "Use one of the demo accounts and the demo password." }, { status: 401 });
  (await cookies()).set("simply_predict_demo_user", body.data.username, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 12 });
  return Response.json({ ok: true, user: accounts[body.data.username].name });
}
export async function DELETE() { (await cookies()).delete("simply_predict_demo_user"); return Response.json({ ok: true }); }
