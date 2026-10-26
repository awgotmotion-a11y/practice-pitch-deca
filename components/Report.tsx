"use client";
import Link from "next/link";
import { useMemo } from "react";
import type { Metrics } from "@/lib/room";
import type { Trial } from "@/lib/store";
import { Bar } from "./Bar";

type Tone = "good" | "ok" | "bad";
const TONE: Record<Tone, string> = { good: "text-good", ok: "text-amber", bad: "text-danger" };
const band = (v: number | null, good: [number, number], ok: [number, number]): Tone =>
  v === null ? "ok" : v >= good[0] && v <= good[1] ? "good" : v >= ok[0] && v <= ok[1] ? "ok" : "bad";
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

function tiles(m: Metrics): { k: string; v: string; hint: string; tone: Tone }[] {
  const out = [
    { k: "Words per minute", v: m.wpm === null ? "n/a" : String(m.wpm), hint: "aim 130 to 160", tone: m.wpm === null ? "ok" : band(m.wpm, [130, 160], [110, 180]) },
    { k: "Fillers per minute", v: String(m.fillersPerMin), hint: "under 2 is clean", tone: band(m.fillersPerMin, [0, 2], [0, 5]) },
    { k: "Long pauses", v: String(m.longPauses), hint: "2.5 seconds or more", tone: band(m.longPauses, [0, 1], [0, 3]) },
    { k: "Seconds to start answering", v: m.avgResponseSec === null ? "n/a" : String(m.avgResponseSec), hint: "under 2 is confident", tone: band(m.avgResponseSec, [0, 2], [0, 4]) },
    { k: "Hedges", v: String(m.hedgeCount), hint: "I think, maybe, probably", tone: band(m.hedgeCount, [0, 3], [0, 8]) },
    { k: "Numbers cited", v: String(m.numbersCited), hint: "specifics win points", tone: m.numbersCited >= 5 ? "good" : m.numbersCited >= 2 ? "ok" : "bad" },
  ] as { k: string; v: string; hint: string; tone: Tone }[];
  if (m.presentSec !== null) out.push({ k: "Presentation length", v: mmss(m.presentSec), hint: "time before questions", tone: "ok" });
  if (m.avgAnswerWords !== null) out.push({ k: "Average answer", v: `${m.avgAnswerWords} words`, hint: "25 to 90 works", tone: band(m.avgAnswerWords, [25, 90], [15, 130]) });
  return out;
}

export function Report({ trial, audio, onAgain }: { trial: Trial; audio?: Blob | null; onAgain?: () => void }) {
  const r = trial.report;
  // ponytail: object URL is never revoked (a few per page visit); revoke on unmount if sessions get long.
  const url = useMemo(() => (audio && audio.size ? URL.createObjectURL(audio) : null), [audio]);

  const groups = r ? [...new Set(r.rows.map((x) => x.group))] : [];
  const doc = trial.mode === "written";
  return (
    <article className="space-y-12">
      <header className="grid gap-6 border-b border-line pb-8 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-3">
          <p className="mono text-xs text-muted">{trial.title} · {new Date(trial.date).toLocaleDateString()} · {r?.form}</p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{r?.verdict ?? "No score saved"}</h1>
        </div>
        {r && (
          <div className="sm:text-right">
            <div className="mono text-6xl font-semibold tabular-nums">{r.total}<span className="text-2xl text-muted"> / {r.max}</span></div>
            <div className="mono mt-1 text-sm text-amber">{r.outcome}</div>
          </div>
        )}
      </header>

      {r && groups.map((g) => {
        const rows = r.rows.filter((x) => x.group === g);
        return (
          <section key={g} aria-label={g} className="space-y-1">
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-semibold">{g}</h2>
              <span className="mono text-sm text-muted">{rows.reduce((n, x) => n + x.score, 0)} / {rows.reduce((n, x) => n + x.max, 0)}</span>
            </div>
            <ul>
              {rows.map((x, i) => (
                <li key={i} className="space-y-2 border-t border-line py-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <b className="text-lg font-semibold">{x.name}</b>
                    <span className="mono shrink-0 text-sm">{x.score} / {x.max} <span className="text-muted">· {x.level}</span></span>
                  </div>
                  <div className="flex"><Bar pct={x.max ? (100 * x.score) / x.max : 0} tone={x.level === "Exemplary" ? "amber" : "accent"} /></div>
                  <p className="text-[15px] text-[#c4d4e6]">{x.why}</p>
                  {x.quote && <blockquote className="border-l-2 border-line-strong pl-3 text-sm italic text-muted">&ldquo;{x.quote}&rdquo;</blockquote>}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {r && r.strengths.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">What worked</h2>
          <ul className="list-disc space-y-2 pl-5 text-[#c4d4e6]">{r.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </section>
      )}

      {r && r.fixes.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">{doc ? "Revise it like this" : "Next time, say it like this"}</h2>
          {r.fixes.map((f, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-line bg-card p-4 sm:p-5">
              <p><span className="label !mb-0 inline text-amber">{f.said.startsWith("(") ? (doc ? "Missing from your entry" : "You never said this") : (doc ? "Your entry says" : "You said")}</span>{!f.said.startsWith("(") && <span className="ml-2 text-muted">&ldquo;{f.said}&rdquo;</span>}</p>
              <p><span className="label !mb-0 inline text-accent">Try</span><span className="ml-2">&ldquo;{f.try}&rdquo;</span></p>
              <p className="text-sm text-muted">{f.why}</p>
            </div>
          ))}
        </section>
      )}

      {r?.drill && (
        <section className="rounded-xl border border-accent p-5">
          <h2 className="mb-2 text-xl font-semibold">{doc ? "Fix this first" : "Drill for next time"}</h2>
          <p className="text-[#c4d4e6]">{r.drill}</p>
        </section>
      )}

      {r?.questions?.length ? (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Questions a judge will likely ask</h2>
          <ol className="list-decimal space-y-2 pl-5 text-[#c4d4e6]">{r.questions.map((q, i) => <li key={i}>{q}</li>)}</ol>
        </section>
      ) : null}

      {trial.scenario?.questions?.length ? (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">The judge&apos;s two questions</h2>
          <ol className="list-decimal space-y-2 pl-5 text-[#c4d4e6]">{trial.scenario.questions.map((q, i) => <li key={i}>{q}</li>)}</ol>
        </section>
      ) : null}

      {trial.metrics && <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Delivery</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles(trial.metrics).map((t) => (
            <div key={t.k} className="rounded-xl border border-line p-4">
              <div className="mono text-[11px] uppercase tracking-wider text-muted">{t.k}</div>
              <div className={`mono mt-1 text-2xl font-semibold ${TONE[t.tone]}`}>{t.v}</div>
              <div className="text-xs text-muted">{t.hint}</div>
            </div>
          ))}
        </div>
      </section>}

      {!doc && <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Recording</h2>
        {url ? <audio controls src={url} className="w-full" /> : <p className="text-muted">Recordings are not saved. Only this session&apos;s recording is playable, and only until you leave this page.</p>}
      </section>}

      {!doc && <section>
        <details className="rounded-xl border border-line p-4">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">Full transcript</summary>
          <div className="mt-3 space-y-3">
            {trial.transcript.map((l, i) => (
              <div key={i}>
                <span className={`mono text-[11px] uppercase tracking-wider ${l.who === "judge" ? "text-accent" : "text-amber"}`}>{l.who === "judge" ? "Judge" : "You"}</span>
                <p className="text-[15px] text-[#c4d4e6]">{l.text}</p>
              </div>
            ))}
          </div>
        </details>
      </section>}

      <div className="flex flex-wrap gap-3">
        {onAgain && <button className="btn-primary" onClick={onAgain}>{doc ? "Grade another draft" : "Practice again"}</button>}
        <Link className="btn" href="/history">All trials</Link>
      </div>
    </article>
  );
}
