import { env } from "cloudflare:workers";
import { z } from "zod";
import { newInvite, unauthorized, userFrom } from "@/lib/auth";

// Who may sign in. Only admins can see or change the list.
async function admin(req: Request) {
  const u = await userFrom(req);
  return u?.admin ? u : null;
}

export async function GET(req: Request) {
  if (!(await admin(req))) return unauthorized();
  const { results } = await env.DB.prepare("SELECT email, name, admin, pw IS NOT NULL AS active FROM members ORDER BY admin DESC, name").all();
  return Response.json(results, { headers: { "cache-control": "no-store" } });
}

const Add = z.object({ email: z.email().max(200), name: z.string().trim().min(1).max(40) });

/** Adds a member (or renames one) and returns a fresh invite link. Also how a forgotten password gets reset. */
export async function POST(req: Request) {
  if (!(await admin(req))) return unauthorized();
  const p = Add.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: "Enter a valid email and a first name." }, { status: 400 });
  const email = p.data.email.toLowerCase();
  await env.DB.prepare("INSERT INTO members (email, name, admin, added) VALUES (?, ?, 0, ?) ON CONFLICT (email) DO UPDATE SET name = excluded.name")
    .bind(email, p.data.name, Date.now()).run();
  return Response.json({ link: await newInvite(email, req.url) });
}

/** Removes access and signs them out. Their saved history is kept, so re-adding them brings it back. */
export async function DELETE(req: Request) {
  const me = await admin(req);
  if (!me) return unauthorized();
  const email = String((await req.json().catch(() => ({})))?.email ?? "").toLowerCase();
  if (email === me.email) return Response.json({ error: "You can't remove yourself." }, { status: 400 });
  await env.DB.batch([
    env.DB.prepare("DELETE FROM members WHERE email = ? AND admin = 0").bind(email),
    env.DB.prepare("DELETE FROM sessions WHERE email = ?").bind(email),
  ]);
  return Response.json({ ok: true });
}
