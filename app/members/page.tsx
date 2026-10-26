"use client";
import { useCallback, useEffect, useState } from "react";
import { useMe } from "@/lib/store";

type Member = { email: string; name: string; admin: number; active: number };

/** Admins choose who can sign in. Each member gets a private account with their own history. */
export default function MembersPage() {
  const me = useMe();
  const [list, setList] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [link, setLink] = useState<{ name: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    fetch("/api/members", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])).then(setList).catch(() => {});
  }, []);
  useEffect(() => {
    if (me?.admin) load();
  }, [me, load]);

  async function send(method: "POST" | "DELETE", body: object) {
    setMsg("");
    const r = await fetch("/api/members", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(d.error ?? "That didn't work. Try again.");
    return r.ok ? d : null;
  }
  async function invite(email: string, name: string) {
    const d = await send("POST", { email, name });
    if (d?.link) { setLink({ name, url: d.link }); setCopied(false); load(); }
    return !!d;
  }

  if (!me?.admin) return <p className="text-muted">Only the chapter admin can manage members.</p>;
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Members</h1>
        <p className="text-soft">Only these emails can sign in. Each person starts with a fresh, private history. Add someone, then send them their invite link to set a password.</p>
      </div>
      <form
        className="card grid gap-4 sm:grid-cols-[1.4fr_1fr_auto] sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await invite(email.trim(), name.trim())) { setEmail(""); setName(""); }
        }}
      >
        <div>
          <label className="label" htmlFor="m-email">Email</label>
          <input id="m-email" type="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </div>
        <div>
          <label className="label" htmlFor="m-name">First name</label>
          <input id="m-name" required maxLength={40} className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </div>
        <button className="btn-primary" type="submit">Add</button>
      </form>
      {msg && <p role="alert" className="text-danger">{msg}</p>}
      {link && (
        <div className="space-y-3 rounded-xl border border-accent p-4 sm:p-5">
          <p className="font-semibold">Send this link to {link.name}. It works once and expires in 7 days.</p>
          <input className="field mono text-sm" readOnly value={link.url} aria-label={`Invite link for ${link.name}`} onFocus={(e) => e.target.select()} />
          <button className="btn" onClick={() => navigator.clipboard.writeText(link.url).then(() => setCopied(true))}>{copied ? "Copied" : "Copy link"}</button>
        </div>
      )}
      <ul className="border-b border-line">
        {list.map((m) => (
          <li key={m.email} className="flex min-h-11 items-center justify-between gap-4 border-t border-line py-3">
            <span className="min-w-0">
              <b className="block font-semibold">{m.name}{m.admin ? <span className="mono ml-2 text-xs text-amber">ADMIN</span> : null}</b>
              <span className="mono block truncate text-xs text-muted">{m.email} · {m.active ? "active" : "invite pending"}</span>
            </span>
            <span className="flex shrink-0 gap-2">
              <button className="btn" aria-label={`New invite link for ${m.name}`} onClick={() => void invite(m.email, m.name)}>New link</button>
              {!m.admin && (
                <button className="btn" aria-label={`Remove ${m.name}`} onClick={async () => { if (await send("DELETE", { email: m.email })) load(); }}>Remove</button>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">Forgot their password? Click New link and send it; setting a new password signs them out everywhere else. Removing someone signs them out right away; their history is kept, so adding them back restores it.</p>
    </div>
  );
}
