import { env } from "cloudflare:workers";
import { z } from "zod";
import { hashPassword, sha, startSession } from "@/lib/auth";

const Body = z.object({ token: z.string().min(20).max(100), password: z.string().min(8).max(200).optional() });

/** With just the token: who the invite is for. With a password: sets it, uses up the link and signs them in. */
export async function POST(req: Request) {
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: "Use at least 8 characters." }, { status: 400 });
  const m = await env.DB.prepare("SELECT email, name FROM members WHERE invite = ? AND invite_expires > ?").bind(await sha(p.data.token), Date.now())
    .first<{ email: string; name: string }>();
  if (!m) return Response.json({ error: "This invite link has expired or was already used. Ask your chapter admin for a new one." }, { status: 404 });
  if (!p.data.password) return Response.json(m);
  // A new password also signs out every other device, in case the old one leaked.
  await env.DB.batch([
    env.DB.prepare("UPDATE members SET pw = ?, invite = NULL, invite_expires = 0, fails = 0, locked_until = 0 WHERE email = ?").bind(await hashPassword(p.data.password), m.email),
    env.DB.prepare("DELETE FROM sessions WHERE email = ?").bind(m.email),
  ]);
  return Response.json({ ok: true }, { headers: { "set-cookie": await startSession(m.email) } });
}
