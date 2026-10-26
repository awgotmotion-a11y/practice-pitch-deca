"use client";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { startSession, useMe } from "@/lib/store";
import { OrbStage } from "./Orb";

/** Members only: loads the signed-in member's own data, or shows sign-in. The privacy page stays public. */
export function Gate({ children }: { children: ReactNode }) {
  const path = usePathname();
  const me = useMe();
  const [state, setState] = useState<"loading" | "out" | "error">("loading");
  const [invite, setInvite] = useState("");

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) {
          setInvite(new URLSearchParams(location.hash.slice(1)).get("invite") ?? "");
          return setState("out");
        }
        if (!r.ok) throw new Error();
        const d = await r.json();
        startSession({ email: d.email, name: d.name, admin: d.admin }, d.data);
      })
      .catch(() => setState("error"));
  }, []);

  if (me || path === "/privacy") return children;
  if (state === "loading") return <p role="status" className="mono text-sm text-muted">LOADING…</p>;
  return (
    <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
      <div className="flex flex-col gap-6">
        <h1 className="text-[clamp(40px,6.4vw,92px)] font-bold leading-[0.95] tracking-tight">
          Walk in having<br />already competed.
        </h1>
        {state === "error" ? <p role="alert" className="text-amber">Couldn&apos;t reach the server. Refresh to try again.</p> : <SignIn invite={invite} />}
      </div>
      <OrbStage tl={{ k: "ACCESS", v: "Members only" }} tr={{ k: "SEASON", v: "2026-27" }} bl={{ k: "HISTORY", v: "Private to you" }} br={{ k: "FORMS", v: "Official" }} />
    </section>
  );
}

function SignIn({ invite }: { invite: string }) {
  const [who, setWho] = useState<{ name: string; email: string } | null>(null);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // An invite link says who it's for, so the page can greet them by name.
  useEffect(() => {
    if (!invite) return;
    fetch("/api/auth/invite", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: invite }) })
      .then(async (r) => (r.ok ? setWho(await r.json()) : setErr((await r.json()).error)))
      .catch(() => setErr("Couldn't check that link. Refresh to try again."));
  }, [invite]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const r = await fetch(who ? "/api/auth/invite" : "/api/auth/login", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(who ? { token: invite, password: pw } : { email, password: pw }),
    }).catch(() => null);
    if (r?.ok) return location.replace("/"); // a full load drops the invite from the address bar and starts the session clean
    setErr(r ? (await r.json().catch(() => ({}))).error ?? "That didn't work. Try again." : "Couldn't reach the server. Try again.");
    setBusy(false);
  }

  return (
    <form className="flex max-w-[440px] flex-col gap-4" onSubmit={submit}>
      {who ? (
        <p className="text-[19px] leading-normal text-soft">
          <b className="block text-2xl text-accent">Hey {who.name}, welcome to PitchPrep.</b>
          Set a password for {who.email}. You&apos;ll use it to sign in on any device.
        </p>
      ) : invite ? (
        !err && <p role="status" className="mono text-sm text-muted">CHECKING YOUR INVITE…</p>
      ) : (
        <>
          <p className="text-[19px] leading-normal text-soft">Sign in with the email your chapter admin added. Your history and progress are yours alone.</p>
          <div>
            <label className="label" htmlFor="si-email">Email</label>
            <input id="si-email" type="email" required autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </>
      )}
      {(who || !invite) && (
        <div>
          <label className="label" htmlFor="si-pw">{who ? "New password (8+ characters)" : "Password"}</label>
          <input
            id="si-pw" type="password" required minLength={who ? 8 : 1} autoComplete={who ? "new-password" : "current-password"}
            className="field" value={pw} onChange={(e) => setPw(e.target.value)}
          />
        </div>
      )}
      {err && <p role="alert" className="border-l-2 border-amber pl-3 text-amber">{err}</p>}
      {(who || !invite) && <button className="btn-primary self-start !px-6 !py-4 !text-base" disabled={busy}>{who ? "Set password and sign in" : "Sign in"}</button>}
      {!who && !invite && <p className="text-sm text-muted">New, or forgot your password? Ask your chapter admin for an invite link.</p>}
      {invite && !who && err && <button type="button" className="btn self-start" onClick={() => location.replace("/")}>Go to sign in</button>}
    </form>
  );
}
