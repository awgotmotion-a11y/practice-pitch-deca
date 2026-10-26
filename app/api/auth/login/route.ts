import { env } from "cloudflare:workers";
import { z } from "zod";
import { checkPassword, startSession } from "@/lib/auth";

const Body = z.object({ email: z.string().trim().toLowerCase().max(200), password: z.string().max(200) });
const LOCK_AFTER = 10, LOCK_MIN = 15;

/** Email + password sign-in. Ten wrong passwords in a row lock that account for 15 minutes. */
export async function POST(req: Request) {
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: "Enter your email and password." }, { status: 400 });
  const { email, password } = p.data;
  const m = await env.DB.prepare("SELECT pw, fails, locked_until FROM members WHERE email = ?").bind(email)
    .first<{ pw: string | null; fails: number; locked_until: number }>();
  if (m && m.locked_until > Date.now())
    return Response.json({ error: `Too many wrong tries. Wait ${LOCK_MIN} minutes, or ask your chapter admin for a new link.` }, { status: 429 });
  if (!m?.pw || !(await checkPassword(password, m.pw))) {
    if (m) await env.DB.prepare(
      "UPDATE members SET fails = fails + 1, locked_until = CASE WHEN fails + 1 >= ? THEN ? ELSE locked_until END WHERE email = ?",
    ).bind(LOCK_AFTER, Date.now() + LOCK_MIN * 60_000, email).run();
    return Response.json({ error: m && !m.pw ? "You haven't set a password yet. Open the invite link your chapter admin sent you." : "That email and password don't match." }, { status: 401 });
  }
  await env.DB.prepare("UPDATE members SET fails = 0, locked_until = 0 WHERE email = ?").bind(email).run();
  return Response.json({ ok: true }, { headers: { "set-cookie": await startSession(email) } });
}
