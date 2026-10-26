"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { areasFor, blueprintFor, buildDrill, buildMockExam, eventByCode, LEVELS, ITEMS, type Item } from "@/lib/deca";
import { now, useStored, useHydrated, DEFAULT_PROFILE, type Attempt, type Profile } from "@/lib/store";
import { Bar } from "@/components/Bar";

type Run = { kind: "mock" | "drill"; items: Item[]; answers: (number | null)[]; i: number; start: number; done: boolean };

export default function ExamPage() {
  return (
    <Suspense>
      <Exam />
    </Suspense>
  );
}

function Exam() {
  const params = useSearchParams();
  const [profile] = useStored<Profile>("profile", DEFAULT_PROFILE);
  const [, setAttempts] = useStored<Attempt[]>("attempts", []);
  const event = eventByCode(profile.event);
  const areas = areasFor(event.cluster);
  const [picked, setPicked] = useState<string[]>([]);
  const [size, setSize] = useState(20);
  const [run, setRun] = useState<Run | null>(null);

  const start = (kind: Run["kind"], items: Item[]) =>
    setRun({ kind, items, answers: items.map(() => null), i: 0, start: now(), done: false });

  // Deep links from the dashboard: ?mode=mock or ?drill=Area|Area
  const drillParam = params.get("drill");
  const modeParam = params.get("mode");
  const hydrated = useHydrated();
  useEffect(() => {
    if (!hydrated || run) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot start from URL
    if (modeParam === "mock") start("mock", buildMockExam(event.cluster, profile.level));
    else if (drillParam) start("drill", buildDrill(drillParam.split("|"), 20));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, drillParam, modeParam]);

  if (run && !run.done) return <Runner run={run} setRun={setRun} onFinish={finish} />;
  if (run?.done) return <Results run={run} onRestart={() => setRun(null)} />;

  function finish(r: Run) {
    const t = now();
    setAttempts((prev) => [
      ...prev,
      ...r.items.flatMap((it, k) => (r.answers[k] === null ? [] : [{ id: it.id, ia: it.ia, ok: r.answers[k] === it.a, t }])),
    ].slice(-5000));
    setRun({ ...r, done: true });
  }

  const bp = blueprintFor(event.cluster, profile.level);
  const levelLabel = LEVELS.find((l) => l.id === profile.level)?.label;
  const mockCount = Object.entries(bp).reduce((n, [ia, k]) => n + Math.min(k, ITEMS.filter((i) => i.ia === ia).length), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">Cluster exams</h1>
      <section className="card">
        <h2 className="text-2xl font-semibold">Mock exam: {event.cluster}, {levelLabel}</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          {mockCount} questions drawn to match the official 2026–27 blueprint for this level{mockCount < 100 ? " (the real exam has 100; this area of the bank is still growing)" : ", the same length as the real exam"}.
        </p>
        <button className="btn-primary" onClick={() => start("mock", buildMockExam(event.cluster, profile.level))}>Start mock exam</button>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-muted">See the blueprint</summary>
          <ul className="mt-2 grid gap-x-6 sm:grid-cols-2">
            {Object.entries(bp).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([ia, n]) => (
              <li key={ia} className="flex justify-between border-b border-line py-1"><span>{ia}</span><span className="tabular-nums">{n}</span></li>
            ))}
          </ul>
        </details>
      </section>

      <section className="card">
        <h2 className="text-2xl font-semibold">Topic drill</h2>
        <p className="mb-3 mt-1 text-sm text-muted">Pick one or more instructional areas.</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {areas.map((ia) => {
            const on = picked.includes(ia);
            const n = ITEMS.filter((i) => i.ia === ia).length;
            return (
              <button key={ia} disabled={!n} onClick={() => setPicked(on ? picked.filter((p) => p !== ia) : [...picked, ia])}
                className={`min-h-11 rounded-full border px-4 text-sm ${on ? "border-accent bg-accent-soft text-accent" : "border-line-strong text-soft hover:border-accent"} disabled:opacity-40`}>
                {ia} <span className="text-muted">({n})</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <select className="field w-auto" value={size} onChange={(e) => setSize(+e.target.value)} aria-label="Number of questions">
            {[10, 20, 50].map((n) => <option key={n} value={n}>{n} questions</option>)}
          </select>
          <button className="btn-primary" disabled={!picked.length} onClick={() => start("drill", buildDrill(picked, size))}>Start drill</button>
        </div>
      </section>
    </div>
  );
}

function Runner({ run, setRun, onFinish }: { run: Run; setRun: (r: Run) => void; onFinish: (r: Run) => void }) {
  const item = run.items[run.i];
  const chosen = run.answers[run.i];
  const instant = run.kind === "drill"; // drills reveal answers immediately; mocks wait until the end
  const last = run.i === run.items.length - 1;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.floor((now - run.start) / 1000);

  if (!item) return <p className="card">No questions available for this selection yet.</p>;

  const pick = (k: number) => {
    if (instant && chosen !== null) return;
    const answers = [...run.answers];
    answers[run.i] = k;
    setRun({ ...run, answers });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>Question {run.i + 1} of {run.items.length} · {item.ia}</span>
        <span className="tabular-nums">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</span>
      </div>
      <div className="h-1 overflow-hidden rounded bg-line"><div className="h-full bg-accent" style={{ width: `${(100 * (run.i + 1)) / run.items.length}%` }} /></div>
      <div className="card space-y-3">
        <p className="text-lg font-medium">{item.q}</p>
        {item.c.map((c, k) => {
          const reveal = instant && chosen !== null;
          const style = reveal && k === item.a ? "border-good bg-good/10"
            : reveal && k === chosen ? "border-danger bg-danger/10"
            : chosen === k ? "border-accent bg-accent-soft" : "border-line-strong hover:border-accent";
          return (
            <button key={k} onClick={() => pick(k)} className={`flex w-full gap-3 min-h-11 rounded-lg border p-3 text-left text-sm ${style}`}>
              <b className="mono">{"ABCD"[k]}.</b> {c}
            </button>
          );
        })}
        {instant && chosen !== null && (
          <p className="rounded-lg bg-accent-soft p-3 text-sm"><b>{chosen === item.a ? "Correct." : `Answer: ${"ABCD"[item.a]}.`}</b> {item.e}</p>
        )}
      </div>
      <div className="flex justify-between">
        <button className="btn" disabled={run.i === 0} onClick={() => setRun({ ...run, i: run.i - 1 })}>Back</button>
        <div className="flex gap-2">
          <button className="btn" onClick={() => onFinish(run)}>Finish now</button>
          {last ? (
            <button className="btn-primary" onClick={() => onFinish(run)}>Submit</button>
          ) : (
            <button className="btn-primary" onClick={() => setRun({ ...run, i: run.i + 1 })}>Next</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Results({ run, onRestart }: { run: Run; onRestart: () => void }) {
  const answered = run.items.filter((_, k) => run.answers[k] !== null);
  const correct = run.items.filter((it, k) => run.answers[k] === it.a).length;
  const byIa: Record<string, { ok: number; n: number }> = {};
  run.items.forEach((it, k) => {
    byIa[it.ia] ??= { ok: 0, n: 0 };
    byIa[it.ia].n++;
    if (run.answers[k] === it.a) byIa[it.ia].ok++;
  });
  const missed = run.items.map((it, k) => ({ it, a: run.answers[k] })).filter(({ it, a }) => a !== it.a);
  const weakest = Object.entries(byIa).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).slice(0, 3).map(([ia]) => ia);

  return (
    <div className="space-y-6">
      <section className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="label">Score</div>
          <div className="mono text-4xl font-semibold tabular-nums">{correct}/{run.items.length} <span className="text-xl text-muted">({Math.round((100 * correct) / run.items.length)}%)</span></div>
          <p className="text-sm text-muted">{answered.length} answered</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn-primary" href={`/exam?drill=${encodeURIComponent(weakest.join("|"))}`} onClick={onRestart}>Drill weakest areas</Link>
          <button className="btn" onClick={onRestart}>Back to exams</button>
        </div>
      </section>
      <section className="card">
        <h2 className="mb-3 text-2xl font-semibold">By instructional area</h2>
        <ul className="space-y-2">
          {Object.entries(byIa).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).map(([ia, s]) => (
            <li key={ia} className="flex items-center gap-3 text-sm">
              <span className="w-56 truncate">{ia}</span>
              <Bar pct={Math.round((100 * s.ok) / s.n)} />
              <span className="w-12 text-right tabular-nums">{s.ok}/{s.n}</span>
            </li>
          ))}
        </ul>
      </section>
      {missed.length > 0 && (
        <section className="card">
          <h2 className="mb-3 text-2xl font-semibold">Review missed questions</h2>
          <ol className="space-y-4">
            {missed.map(({ it, a }) => (
              <li key={it.id} className="text-sm">
                <p className="font-medium">{it.q}</p>
                {a !== null && <p className="text-danger">Your answer: {it.c[a]}</p>}
                <p className="text-good">Correct: {it.c[it.a]}</p>
                <p className="text-muted">{it.e}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
