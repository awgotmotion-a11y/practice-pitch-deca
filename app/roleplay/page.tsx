"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LEVELS, areasFor, eventByCode, isRoleplay, timing, type Level } from "@/lib/deca";
import { api, type RoomResult } from "@/lib/room";
import type { Difficulty, Scenario } from "@/lib/judge";
import { DEFAULT_PROFILE, accuracyByArea, now, useStored, type Attempt, type Profile } from "@/lib/store";
import { Debrief } from "@/components/Debrief";
import { EventSelect } from "@/components/EventSelect";
import { LiveRoom } from "@/components/LiveRoom";
import { Orb } from "@/components/Orb";

// Same mapping as LEVEL_TO_DIFFICULTY in lib/judge.ts (copied so the client bundle skips that server module).
const DIFF: Record<Level, Difficulty> = { district: "friendly", association: "realistic", icdc: "tough" };
type Phase = "setup" | "loading" | "prep" | "live" | "debrief";
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function RoleplayPage() {
  return (
    <Suspense>
      <Roleplay />
    </Suspense>
  );
}

function Roleplay() {
  const params = useSearchParams();
  const [profile, setProfile] = useStored<Profile>("profile", DEFAULT_PROFILE);
  const [attempts] = useStored<Attempt[]>("attempts", []);
  const ev = eventByCode(profile.event);
  const t = timing(ev);
  const weak = accuracyByArea(attempts).filter((a) => areasFor(ev.cluster).includes(a.ia) && a.pct < 80).slice(0, 3).map((a) => a.ia);

  const [phase, setPhase] = useState<Phase>("setup");
  const [error, setError] = useState("");
  const [useFocus, setUseFocus] = useState(params.get("focus") === "weak");
  const [voice, setVoice] = useState(true);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [notes, setNotes] = useState("");
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState<RoomResult | null>(null);
  const prepEnd = useRef(0);

  async function generate() {
    setError(""); setPhase("loading");
    try {
      const s = await api<Scenario>({ kind: "scenario", event: ev.code, level: profile.level, focus: useFocus ? weak : [] });
      setScenario(s); setNotes("");
      prepEnd.current = now() + t.prep * 60_000;
      setLeft(t.prep * 60);
      setPhase("prep");
    } catch (e) {
      setError((e as Error).message);
      setPhase("setup");
    }
  }

  useEffect(() => {
    if (phase !== "prep") return;
    const i = setInterval(() => {
      const s = Math.max(0, Math.ceil((prepEnd.current - now()) / 1000));
      setLeft(s);
      if (s <= 0) setPhase("live");
    }, 500);
    return () => clearInterval(i);
  }, [phase]);

  const again = () => { setResult(null); setScenario(null); setPhase("setup"); };

  if (phase === "debrief" && result && scenario)
    return (
      <Debrief
        result={result}
        onAgain={again}
        base={{ mode: "roleplay", event: ev.code, level: profile.level, title: scenario.title, difficulty: DIFF[profile.level], scenario }}
        body={{ mode: "roleplay", event: ev.code, scenario }}
      />
    );

  if (phase === "loading")
    return (
      <div className="grid items-center gap-8 lg:grid-cols-2">
        <div className="mx-auto w-full max-w-[360px]"><Orb /></div>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold">Writing your scenario</h1>
          <p role="status" className="text-muted">Building a fresh {ev.code} situation at {LEVELS.find((l) => l.id === profile.level)?.label} level. This takes about 20 seconds.</p>
        </div>
      </div>
    );

  if ((phase === "prep" || phase === "live") && scenario) {
    const card = (
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold">{scenario.title}</h2>
          <p className="mt-1 text-soft">You are {scenario.studentRole} meeting {scenario.judgeName}, {scenario.judgeRole} at {scenario.company}.</p>
        </div>
        <div><span className="label">Situation</span><p className="text-[15px] leading-relaxed text-[#c4d4e6]">{scenario.situation}</p></div>
        <div><span className="label">Your task</span><p className="text-[15px] leading-relaxed text-[#c4d4e6]">{scenario.task}</p></div>
        <div>
          <span className="label">Performance indicators</span>
          <ol className="space-y-2">
            {scenario.pis.map((p, i) => (
              <li key={i} className="grid grid-cols-[2rem_1fr] text-[15px]"><span className="mono text-accent">{String(i + 1).padStart(2, "0")}</span><span>{p.text}</span></li>
            ))}
          </ol>
        </div>
      </div>
    );
    if (phase === "prep")
      return (
        <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
          <section className="card">{card}</section>
          <section className="flex flex-col gap-4">
            <div className="rounded-xl border border-line p-5">
              <div className="label">Prep time left</div>
              <div className={`mono text-6xl font-semibold tabular-nums ${left <= 60 ? "text-danger" : "text-amber"}`} role="timer">{mmss(left)}</div>
              <p className="mt-2 text-sm text-muted">The judge starts automatically at zero.{ev.team ? " Team event: both partners present, one device." : ""}</p>
            </div>
            <label className="label !mb-0" htmlFor="notes">Your notes</label>
            <textarea id="notes" className="field min-h-48 flex-1" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Jot an opening, one point per indicator, and the numbers you will cite." />
            <button className="btn-primary" onClick={() => setPhase("live")}>I&apos;m ready</button>
          </section>
        </div>
      );
    return (
      <div className="space-y-8">
        <LiveRoom
          cfg={{
            mode: "roleplay", difficulty: DIFF[profile.level], event: ev.code, scenario, limitSec: t.present * 60, present: true,
            opener: `Hi, I'm ${scenario.judgeName}. Thanks for coming in. I'd like to hear your ideas.`,
          }}
          judgeName={scenario.judgeName}
          judgeRole={scenario.judgeRole}
          startMuted={!voice}
          subtitle={ev.team ? "Team event: both partners present, one device." : undefined}
          onDone={(r) => { setResult(r); setPhase("debrief"); }}
        />
        <details open className="rounded-xl border border-line p-5">
          <summary className="min-h-11 cursor-pointer py-2 text-lg font-semibold">Scenario and your notes</summary>
          <div className="mt-4 grid gap-8 lg:grid-cols-2">
            {card}
            <div className="whitespace-pre-wrap text-[15px] text-muted">{notes || "No notes taken."}</div>
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Role-play judge</h1>
        <p className="text-soft">A fresh scenario, prep time, then a judge who talks back and asks the questions. Scored on the official form.</p>
      </div>
      {error && <p role="alert" className="rounded-lg border border-danger p-3 text-sm text-danger">{error}</p>}
      <div className="card space-y-5">
        <div>
          <label className="label" htmlFor="event">Event</label>
          <EventSelect id="event" value={profile.event} onChange={(code) => setProfile({ ...profile, event: code })} only={(k) => k !== "selling" && k !== "plan"} />
        </div>
        <div>
          <label className="label" htmlFor="level">Level</label>
          <select id="level" className="field" value={profile.level} onChange={(e) => setProfile({ ...profile, level: e.target.value as Level })}>
            {LEVELS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>
        {isRoleplay(ev) ? (
          <p className="mono text-xs text-muted">{t.prep} MIN PREP · {t.present} MIN WITH THE JUDGE{ev.team ? " · BOTH PARTNERS PRESENT, ONE DEVICE" : ""}</p>
        ) : (
          <p className="text-sm text-amber">This event has no role-play. Use the <Link href={`/room?mode=${ev.kind}`}>Pitch Room</Link> instead.</p>
        )}
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" className="size-5 accent-[#3FD8FF]" checked={useFocus} onChange={(e) => setUseFocus(e.target.checked)} />
          Target my weak areas{weak.length ? `: ${weak.join(", ")}` : " (answer some exam questions first)"}
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" className="size-5 accent-[#3FD8FF]" checked={voice} onChange={(e) => setVoice(e.target.checked)} />
          Judge voice on
        </label>
        <button className="btn-primary" disabled={!isRoleplay(ev)} onClick={() => void generate()}>Get my scenario</button>
      </div>
    </div>
  );
}
