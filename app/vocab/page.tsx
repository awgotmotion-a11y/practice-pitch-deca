"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import vocab from "@/data/vocab.json";
import { areasFor, eventByCode, shuffle } from "@/lib/deca";
import { useStored, useHydrated, DEFAULT_PROFILE, type Profile, type VocabState } from "@/lib/store";

type Term = { t: string; d: string; ia: string };
const TERMS = vocab as Term[];
// ponytail: Leitner boxes instead of FSRS; swap in FSRS when we track review history server-side.
const INTERVAL_DAYS = [0, 1, 3, 7, 21];
const DAY = 86_400_000;

export default function VocabPage() {
  return (
    <Suspense>
      <Vocab />
    </Suspense>
  );
}

function Vocab() {
  const params = useSearchParams();
  const [profile] = useStored<Profile>("profile", DEFAULT_PROFILE);
  const areas = areasFor(eventByCode(profile.event).cluster);
  const [ia, setIa] = useState(params.get("ia") ?? "all");
  const [mode, setMode] = useState<"cards" | "blitz">("cards");
  const hydrated = useHydrated();
  const pool = TERMS.filter((t) => (ia === "all" ? areas.includes(t.ia) : t.ia === ia));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-bold">Vocab</h1>
        <div className="flex flex-wrap gap-2">
          <select className="field w-auto" value={ia} onChange={(e) => setIa(e.target.value)} aria-label="Instructional area">
            <option value="all">All areas in my cluster</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button className={mode === "cards" ? "btn-primary" : "btn"} onClick={() => setMode("cards")}>Flashcards</button>
          <button className={mode === "blitz" ? "btn-primary" : "btn"} onClick={() => setMode("blitz")}>60s Blitz</button>
        </div>
      </div>
      {!hydrated ? null : pool.length === 0 ? <p className="card">No terms for this area yet.</p> : mode === "cards" ? <Cards key={ia} pool={pool} /> : <Blitz key={ia} pool={pool} />}
    </div>
  );
}

function Cards({ pool }: { pool: Term[] }) {
  const [state, setState] = useStored<VocabState>("vocab", {});
  const [flipped, setFlipped] = useState(false);
  const [now] = useState(() => Date.now());
  // Freeze the session queue so cards don't jump around as boxes update.
  const [queue] = useState(() =>
    shuffle(pool).sort((a, b) => (state[a.t]?.due ?? 0) - (state[b.t]?.due ?? 0)).filter((t) => (state[t.t]?.due ?? 0) <= now),
  );
  const [i, setI] = useState(0);
  const mastered = pool.filter((t) => (state[t.t]?.box ?? 0) >= 3).length;
  const card = queue[i];

  const grade = (ok: boolean) => {
    const box = ok ? Math.min((state[card.t]?.box ?? 0) + 1, INTERVAL_DAYS.length - 1) : 0;
    setState((s) => ({ ...s, [card.t]: { box, due: Date.now() + INTERVAL_DAYS[box] * DAY } }));
    setFlipped(false);
    setI(i + 1);
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <p className="text-sm text-muted">{mastered} of {pool.length} mastered · {Math.max(queue.length - i, 0)} due now</p>
      {card ? (
        <>
          <button onClick={() => setFlipped(!flipped)} className="card flex min-h-56 w-full flex-col items-center justify-center gap-3 text-center hover:border-accent">
            <span className="mono text-xs uppercase tracking-wider text-muted">{card.ia}</span>
            <span className="text-2xl font-semibold">{card.t}</span>
            {flipped ? <span className="text-base">{card.d}</span> : <span className="text-sm text-muted">Tap to reveal</span>}
          </button>
          {flipped && (
            <div className="flex justify-center gap-3">
              <button className="btn" onClick={() => grade(false)}>Again</button>
              <button className="btn-primary" onClick={() => grade(true)}>Got it</button>
            </div>
          )}
        </>
      ) : (
        <p className="card text-center">All caught up for this set. Come back later or try the Blitz.</p>
      )}
    </div>
  );
}

function makeQuestion(pool: Term[]) {
  const answer = shuffle(pool)[0];
  // Distractors from the whole bank so small areas still get 4 options.
  const others = shuffle(TERMS.filter((t) => t.t !== answer.t)).slice(0, 3);
  return { answer, options: shuffle([answer, ...others]) };
}

function Blitz({ pool }: { pool: Term[] }) {
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(60);
  const [score, setScore] = useState({ ok: 0, n: 0 });
  const [best, setBest] = useStored<number>("blitzBest", 0);
  const [flash, setFlash] = useState<null | boolean>(null);

  const [q, setQ] = useState(() => makeQuestion(pool));

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (running && left <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- timer expiry ends the round
      setRunning(false);
      if (score.ok > best) setBest(score.ok);
    }
  }, [left, running, score.ok, best, setBest]);

  const answer = (t: Term) => {
    const ok = t.t === q.answer.t;
    setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), n: s.n + 1 }));
    setFlash(ok);
    setTimeout(() => setFlash(null), 250);
    setQ(makeQuestion(pool));
  };

  if (!running)
    return (
      <div className="card mx-auto max-w-xl space-y-3 text-center">
        <p className="text-sm text-muted">Match as many definitions to terms as you can in 60 seconds.</p>
        {score.n > 0 && <p className="text-2xl font-bold">{score.ok} correct of {score.n}</p>}
        <p className="text-sm text-muted">Personal best: {best}</p>
        <button className="btn-primary" onClick={() => { setScore({ ok: 0, n: 0 }); setLeft(60); setRunning(true); }}>
          {score.n ? "Play again" : "Start"}
        </button>
      </div>
    );

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex justify-between text-sm"><span>Score: <b>{score.ok}</b></span><span className="tabular-nums">{left}s</span></div>
      <div className={`card text-lg transition ${flash === true ? "border-good" : flash === false ? "border-danger" : ""}`}>{q.answer.d}</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {q.options.map((o) => <button key={o.t} className="btn justify-start" onClick={() => answer(o)}>{o.t}</button>)}
      </div>
    </div>
  );
}
