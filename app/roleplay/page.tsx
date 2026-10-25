"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { areasFor, eventByCode, timing, LEVELS, type Level } from "@/lib/deca";
import {
  now, useStored, useHydrated, accuracyByArea, DEFAULT_PROFILE,
  type Attempt, type Delivery, type Line, type Profile, type Scenario, type ScoreResult, type Session,
} from "@/lib/store";
import { useDictation, useSpeechSupported, speak, deliveryStats } from "@/lib/speech";

type Phase = "setup" | "loading" | "prep" | "present" | "judge" | "answer" | "scoring" | "results" | "error";
const MAX_QUESTIONS: Record<Level, number> = { district: 2, association: 2, icdc: 3 };

export default function RoleplayPage() {
  return (
    <Suspense>
      <Roleplay />
    </Suspense>
  );
}

function Roleplay() {
  const params = useSearchParams();
  const hydrated = useHydrated();
  const [profile, setProfile] = useStored<Profile>("profile", DEFAULT_PROFILE);
  const [attempts] = useStored<Attempt[]>("attempts", []);
  const [, setSessions] = useStored<Session[]>("sessions", []);
  const [accessCode, setAccessCode] = useStored<string>("accessCode", "");
  const event = eventByCode(profile.event);
  const areas = areasFor(event.cluster);
  const weak = accuracyByArea(attempts).filter((a) => areas.includes(a.ia) && a.pct < 80).slice(0, 3).map((a) => a.ia);
  const t = timing(event);
  const speechOk = useSpeechSupported();

  const [phase, setPhase] = useState<Phase>("setup");
  const [error, setError] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const [useFocus, setUseFocus] = useState(params.get("focus") === "weak");
  const [voiceJudge, setVoiceJudge] = useState(true);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [notes, setNotes] = useState("");
  const [transcript, setTranscript] = useState<Line[]>([]);
  const [deadline, setDeadline] = useState(0);
  const [result, setResult] = useState<Session | null>(null);
  const dict = useDictation();
  const [typed, setTyped] = useState("");
  const studentText = useRef("");

  async function ai<T>(body: object): Promise<T> {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "content-type": "application/json", "x-access-code": accessCode },
      body: JSON.stringify({ event, level: profile.level, areas, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) setNeedCode(true);
    if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
    return data as T;
  }

  const fail = (e: unknown) => {
    setError((e as Error).message);
    setPhase("error");
  };

  async function generate() {
    setPhase("loading");
    try {
      const s = await ai<Scenario>({ kind: "scenario", focus: useFocus ? weak : [] });
      setScenario(s);
      setNotes("");
      setTranscript([]);
      setDeadline(now() + t.prep * 60_000);
      setPhase("prep");
    } catch (e) {
      fail(e);
    }
  }

  function startPresenting() {
    dict.reset();
    setTyped("");
    setDeadline(now() + t.present * 60_000);
    setPhase("present");
    if (speechOk) dict.start();
  }

  /** Take whatever the student said/typed in this turn and append it to the transcript. */
  function takeTurn(): Line[] {
    dict.stop();
    const said = (dict.final + " " + dict.interim + " " + typed).trim();
    studentText.current += " " + said;
    dict.reset();
    setTyped("");
    const next = [...transcript, { who: "student" as const, text: said || "(no response)" }];
    setTranscript(next);
    return next;
  }

  async function handToJudge(lines: Line[]) {
    const asked = lines.filter((l) => l.who === "judge").length;
    if (asked >= MAX_QUESTIONS[profile.level] || now() >= deadline) return finish(lines);
    setPhase("judge");
    try {
      const { say } = await ai<{ say: string }>({ kind: "question", scenario, transcript: lines });
      const withQ = [...lines, { who: "judge" as const, text: say }];
      setTranscript(withQ);
      setPhase("answer");
      if (voiceJudge) await speak(say);
      if (speechOk) dict.start();
    } catch (e) {
      fail(e);
    }
  }

  async function finish(lines: Line[]) {
    dict.stop();
    setPhase("scoring");
    const closing = `Thank you, that's all the questions I have.`;
    if (voiceJudge) speak(closing);
    const voiced = speechOk && dict.stats.current.speakingMs > 0;
    const delivery: Delivery = voiced
      ? deliveryStats(studentText.current, dict.stats.current.speakingMs, dict.stats.current.longPauses)
      : { wpm: 0, fillersPerMin: 0, longPauses: 0 };
    try {
      const score = await ai<ScoreResult>({ kind: "score", scenario, transcript: lines, delivery: voiced ? delivery : undefined });
      const total = Math.round(score.pis.reduce((n, p) => n + p.score, 0) + score.skills.reduce((n, s) => n + s.score, 0));
      const session: Session = { date: now(), event: event.code, level: profile.level, scenario: scenario!, transcript: lines, delivery, score, total };
      setSessions((prev) => [...prev, session].slice(-50));
      setResult(session);
      setPhase("results");
    } catch (e) {
      fail(e);
    }
  }

  // Hard time limit, like the real event.
  const remaining = useCountdown(deadline, phase === "prep" || phase === "present" || phase === "answer");
  useEffect(() => {
    if (remaining > 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the clock running out advances the phase
    if (phase === "prep") startPresenting();
    else if (phase === "present" || phase === "answer") finish(takeTurn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  if (!hydrated) return null;

  if (needCode)
    return (
      <div className="card mx-auto max-w-md space-y-3">
        <h2 className="font-semibold">Beta access code</h2>
        <p className="text-sm text-muted">Ask your chapter officer or advisor for the code.</p>
        <input className="field" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} aria-label="Access code" />
        <button className="btn-primary" onClick={() => { setNeedCode(false); setPhase("setup"); }}>Save</button>
      </div>
    );

  if (phase === "setup" || phase === "error")
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">AI role-play judge</h1>
        {phase === "error" && <p className="rounded-lg border border-rose-500 bg-rose-500/10 p-3 text-sm">{error}</p>}
        <div className="card space-y-4">
          <p className="text-sm">
            <b>{event.name}</b> · {event.team ? "Team decision making" : "Individual"} · {t.prep} min prep, {t.present} min with the judge
          </p>
          <div>
            <label className="label" htmlFor="lvl">Judge difficulty</label>
            <select id="lvl" className="field" value={profile.level} onChange={(e) => setProfile({ ...profile, level: e.target.value as Level })}>
              {LEVELS.map((l) => <option key={l.id} value={l.id}>{l.label} judge — {MAX_QUESTIONS[l.id]} follow-up questions</option>)}
            </select>
          </div>
          {weak.length > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={useFocus} onChange={(e) => setUseFocus(e.target.checked)} />
              Target my weak areas: {weak.join(", ")}
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={voiceJudge} onChange={(e) => setVoiceJudge(e.target.checked)} />
            Judge speaks questions out loud
          </label>
          {!speechOk && <p className="text-sm text-amber-600">This browser can&apos;t transcribe speech. Use Chrome or Edge to present out loud, or type your answers here.</p>}
          <button className="btn-primary" onClick={generate}>Generate scenario & start prep</button>
        </div>
        <p className="text-xs text-muted">
          Change your event on the Dashboard. Scores are AI estimates meant for practice, not official results. Your answers are sent to
          an AI service for scoring, so leave out personal details. <a href="/privacy" className="underline">Privacy</a>
        </p>
      </div>
    );

  if (phase === "loading") return <Waiting text="Writing an original scenario for your event…" />;
  if (phase === "scoring") return <Waiting text="The judge is filling out your evaluation form…" />;
  if (phase === "results" && result) return <Results s={result} onAgain={() => setPhase("setup")} />;
  if (!scenario) return null;

  const live = (dict.final + " " + dict.interim).trim();
  const lastJudge = [...transcript].reverse().find((l) => l.who === "judge");

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <ScenarioCard s={scenario} collapsed={phase !== "prep"} />
      <div className="space-y-4">
        <div className="card flex items-center justify-between">
          <span className="label mb-0">{phase === "prep" ? "Prep time" : "Time with judge"}</span>
          <span className={`text-3xl font-bold tabular-nums ${remaining < 60_000 ? "text-rose-500" : ""}`}>{fmt(remaining)}</span>
        </div>
        <div className="card">
          <label className="label" htmlFor="notes">Your notes</label>
          <textarea id="notes" className="field h-40 font-mono" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Outline your plan for each PI…" />
        </div>
        {phase === "prep" && <button className="btn-primary w-full" onClick={startPresenting}>I&apos;m ready — start presenting</button>}

        {(phase === "present" || phase === "answer" || phase === "judge") && (
          <div className="card space-y-3">
            {phase === "judge" && <p className="text-sm text-muted">{scenario.judgeName} is thinking…</p>}
            {phase === "answer" && lastJudge && (
              <div className="rounded-lg bg-accent-soft p-3 text-sm">
                <b>{scenario.judgeName}:</b> {lastJudge.text}
                {voiceJudge && <button className="ml-2 text-xs underline" onClick={() => speak(lastJudge.text)}>replay</button>}
              </div>
            )}
            {phase !== "judge" && (
              <>
                <div className="flex items-center gap-2">
                  {speechOk && (
                    <button className={dict.listening ? "btn border-rose-500 text-rose-500" : "btn"} onClick={dict.listening ? dict.stop : dict.start}>
                      {dict.listening ? "● Recording — pause" : "🎤 Resume mic"}
                    </button>
                  )}
                  <span className="text-xs text-muted">{phase === "present" ? "Present to the judge" : "Answer the question"}</span>
                </div>
                {dict.error && <p className="text-sm text-rose-500">{dict.error}</p>}
                {live && <p className="max-h-40 overflow-y-auto rounded-lg border border-line p-3 text-sm">{live}</p>}
                <textarea className="field h-24" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={speechOk ? "…or type here" : "Type your response"} aria-label="Typed response" />
                <button className="btn-primary w-full" onClick={() => handToJudge(takeTurn())}>
                  {phase === "present" ? "Done presenting — judge's questions" : "Submit answer"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function useCountdown(deadline: number, active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [active]);
  return active ? Math.max(deadline - now, 0) : Infinity;
}

const fmt = (ms: number) => (Number.isFinite(ms) ? `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}` : "--:--");

function Waiting({ text }: { text: string }) {
  return (
    <div className="card mx-auto flex max-w-md items-center gap-3">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

function ScenarioCard({ s, collapsed }: { s: Scenario; collapsed: boolean }) {
  return (
    <details open={!collapsed} className="card space-y-3 self-start">
      <summary className="cursor-pointer text-lg font-semibold">{s.title}</summary>
      <p className="text-sm text-muted">You are a <b>{s.studentRole}</b> meeting with <b>{s.judgeName}</b>, {s.judgeRole} at {s.company}.</p>
      <div className="mt-3 whitespace-pre-line text-sm leading-relaxed">{s.situation}</div>
      <p className="mt-3 rounded-lg bg-accent-soft p-3 text-sm"><b>Your task:</b> {s.task}</p>
      <div className="mt-3">
        <div className="label">Performance indicators</div>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {s.pis.map((p) => <li key={p.text}>{p.text} <span className="text-muted">({p.ia})</span></li>)}
        </ol>
      </div>
    </details>
  );
}

function Results({ s, onAgain }: { s: Session; onAgain: () => void }) {
  const { score } = s;
  const piTotal = score.pis.reduce((n, p) => n + p.score, 0);
  const skillTotal = score.skills.reduce((n, k) => n + k.score, 0);
  return (
    <div className="space-y-6">
      <section className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="label">{s.scenario.title}</div>
          <div className="text-5xl font-bold tabular-nums">{s.total}<span className="text-xl text-muted">/100</span></div>
          <p className="text-sm text-muted">Performance indicators {piTotal}/{score.piMax * score.pis.length} · 21st Century Skills {skillTotal}/{score.skills.reduce((n, k) => n + k.max, 0)}</p>
        </div>
        <button className="btn-primary" onClick={onAgain}>New role-play</button>
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">Judge&apos;s summary</h2>
        <p className="text-sm">{score.summary}</p>
        <h3 className="mb-1 mt-4 text-sm font-semibold">Fix these first</h3>
        <ol className="list-decimal space-y-1 pl-5 text-sm">{score.topFixes.map((f) => <li key={f}>{f}</li>)}</ol>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Performance indicators</h2>
        {score.pis.map((p) => (
          <div key={p.pi} className="border-t border-line pt-3 text-sm first:border-0 first:pt-0">
            <div className="flex justify-between gap-3">
              <b>{p.pi}</b>
              <span className="shrink-0 tabular-nums">{p.score}/{score.piMax} · <span className="text-muted">{p.level}</span></span>
            </div>
            {p.quote && <blockquote className="my-2 border-l-2 border-accent pl-3 italic text-muted">“{p.quote}”</blockquote>}
            <p>{p.feedback}</p>
            <p className="mt-1"><b>Next time:</b> {p.fix}</p>
          </div>
        ))}
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">21st Century Skills</h2>
        {score.skills.map((k) => (
          <div key={k.skill} className="text-sm">
            <div className="flex justify-between"><b>{k.skill}</b><span className="tabular-nums">{k.score}/{k.max}</span></div>
            <p className="text-muted">{k.feedback}</p>
          </div>
        ))}
      </section>

      {s.delivery.wpm > 0 && (
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="card"><div className="label">Pace</div><div className="text-2xl font-bold">{s.delivery.wpm} wpm</div><p className="text-xs text-muted">Aim for 130–160</p></div>
          <div className="card"><div className="label">Filler words</div><div className="text-2xl font-bold">{s.delivery.fillersPerMin}/min</div><p className="text-xs text-muted">Aim for under 2</p></div>
          <div className="card"><div className="label">Long pauses</div><div className="text-2xl font-bold">{s.delivery.longPauses}</div><p className="text-xs text-muted">Gaps over 3 seconds</p></div>
        </section>
      )}

      <details className="card">
        <summary className="cursor-pointer font-semibold">Full transcript</summary>
        <div className="mt-3 space-y-3 text-sm">
          {s.transcript.map((l, i) => (
            <p key={i}><b>{l.who === "judge" ? s.scenario.judgeName : "You"}:</b> {l.text}</p>
          ))}
        </div>
      </details>
    </div>
  );
}
