import { env } from "cloudflare:workers";
import { z } from "zod";
import { unauthorized, userFrom } from "@/lib/auth";

/** The signed-in member and everything they've saved (history, progress, settings), as JSON strings by key. */
export async function GET(req: Request) {
  const u = await userFrom(req);
  if (!u) return unauthorized();
  const { results } = await env.DB.prepare("SELECT key, value FROM data WHERE email = ?").bind(u.email).all<{ key: string; value: string }>();
  return Response.json({ ...u, data: Object.fromEntries(results.map((r) => [r.key, r.value])) }, { headers: { "cache-control": "no-store" } });
}

const Put = z.object({ key: z.string().regex(/^[A-Za-z]{1,32}$/), value: z.string().max(1_000_000) });

/** Saves one key for the signed-in member only; nobody can write to another member's data. */
export async function PUT(req: Request) {
  const u = await userFrom(req);
  if (!u) return unauthorized();
  const p = Put.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: "Bad request" }, { status: 400 });
  await env.DB.prepare(
    "INSERT INTO data (email, key, value, updated) VALUES (?, ?, ?, ?) ON CONFLICT (email, key) DO UPDATE SET value = excluded.value, updated = excluded.updated",
  ).bind(u.email, p.data.key, p.data.value, Date.now()).run();
  return Response.json({ ok: true });
}
