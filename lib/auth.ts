// Members, passwords, invite links, sessions and the signed-in user. Server-only.
// Session and invite tokens are random; only their SHA-256 is stored, so a database leak can't be replayed as a login.
import { env } from "cloudflare:workers";

export type User = { email: string; name: string; admin: boolean };

const SESSION = "pp_session";
const DAYS = 30;

const b64url = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const randomToken = () => b64url(crypto.getRandomValues(new Uint8Array(32)));
const enc = new TextEncoder();
const unb64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
export const sha = async (s: string) => b64url(await crypto.subtle.digest("SHA-256", enc.encode(s)));

// PBKDF2-SHA256 at 100k rounds, the most Workers allows. Stored as "salt.hash".
async function pbkdf2(pw: string, salt: Uint8Array<ArrayBuffer>) {
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  return b64url(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100_000 }, key, 256));
}
export async function hashPassword(pw: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `${b64url(salt)}.${await pbkdf2(pw, salt)}`;
}
export async function checkPassword(pw: string, stored: string) {
  const [salt, hash] = stored.split(".");
  return (await pbkdf2(pw, unb64url(salt))) === hash;
}

/** A one-time link to set (or reset) a password. Valid 7 days; replaces any earlier link. */
export async function newInvite(email: string, origin: string) {
  const t = randomToken();
  await env.DB.prepare("UPDATE members SET invite = ?, invite_expires = ? WHERE email = ?").bind(await sha(t), Date.now() + 7 * 86400_000, email).run();
  // In the fragment, so the token never reaches server logs.
  return new URL(`/#invite=${t}`, origin).href;
}

export const cookie = (req: Request, name: string) =>
  req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(name + "="))?.slice(name.length + 1);
export const setCookie = (name: string, value: string, maxAge: number) =>
  `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

/** The signed-in member, or null. Removing someone from members signs them out everywhere at once. */
export async function userFrom(req: Request): Promise<User | null> {
  const t = cookie(req, SESSION);
  if (!t) return null;
  const row = await env.DB.prepare(
    "SELECT m.email, m.name, m.admin FROM sessions s JOIN members m ON m.email = s.email WHERE s.token = ? AND s.expires > ?",
  ).bind(await sha(t), Date.now()).first<{ email: string; name: string; admin: number }>();
  return row ? { email: row.email, name: row.name, admin: !!row.admin } : null;
}

export async function startSession(email: string) {
  const t = randomToken();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires < ?").bind(Date.now()),
    env.DB.prepare("INSERT INTO sessions (token, email, expires) VALUES (?, ?, ?)").bind(await sha(t), email, Date.now() + DAYS * 86400_000),
  ]);
  return setCookie(SESSION, t, DAYS * 86400);
}

export async function endSession(req: Request) {
  const t = cookie(req, SESSION);
  if (t) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(await sha(t)).run();
  return setCookie(SESSION, "", 0);
}

export const unauthorized = () => Response.json({ error: "Sign in required" }, { status: 401 });
