"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useHydrated, useStored, type Trial } from "@/lib/store";
import { Report } from "@/components/Report";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function HistoryPage() {
  return (
    <Suspense>
      <History />
    </Suspense>
  );
}

function Trend({ trials }: { trials: Trial[] }) {
  const pts = trials.filter((t) => t.total !== undefined && t.max).map((t) => (100 * t.total!) / t.max!).reverse();
  if (pts.length < 2) return null;
  const W = 600, H = 120, x = (i: number) => (i / (pts.length - 1)) * (W - 20) + 10, y = (v: number) => H - 10 - (v / 100) * (H - 20);
  return (
    <figure className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full" role="img" aria-label={`Score trend over ${pts.length} trials, from ${Math.round(pts[0])} to ${Math.round(pts[pts.length - 1])} percent`}>
        {[25, 50, 75].map((g) => <line key={g} x1="0" x2={W} y1={y(g)} y2={y(g)} stroke="#16304A" strokeWidth="1" />)}
        <polyline fill="none" stroke="#3FD8FF" strokeWidth="2" points={pts.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
        {pts.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill="#050912" stroke={i === pts.length - 1 ? "#FFB547" : "#3FD8FF"} strokeWidth="2" />)}
      </svg>
      <figcaption className="mono text-xs text-muted">SCORE % OVER TIME · OLDEST TO NEWEST</figcaption>
    </figure>
  );
}

function History() {
  const id = useSearchParams().get("id");
  const hydrated = useHydrated();
  const [trials, setTrials] = useStored<Trial[]>("trials", []);
  const open = trials.find((t) => t.id === id);

  if (open)
    return (
      <div className="space-y-6">
        <Link href="/history" className="inline-flex min-h-11 items-center">All trials</Link>
        <Report trial={open} />
      </div>
    );
  if (!hydrated) return null;
  return (
    <div className="space-y-10">
      <h1 className="text-4xl font-bold">History</h1>
      {trials.length === 0 ? (
        <p className="text-muted">No trials yet. Finish a <Link href="/roleplay">role-play</Link> or a <Link href="/room">Pitch Room</Link> session and it shows up here.</p>
      ) : (
        <>
          <Trend trials={trials} />
          <ul className="border-b border-line">
            {trials.map((t) => {
              const m = t.metrics;
              return (
                <li key={t.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-line">
                  <Link href={`/history?id=${t.id}`} className="grid min-h-11 gap-x-6 gap-y-1 py-4 text-foreground no-underline hover:text-foreground sm:grid-cols-[1.6fr_repeat(4,1fr)]">
                    <span className="min-w-0">
                      <b className="block truncate text-lg font-semibold">{t.title}</b>
                      <span className="mono text-xs text-muted">{t.mode.toUpperCase()}{t.event ? ` · ${t.event}` : ""} · {new Date(t.date).toLocaleDateString()}</span>
                    </span>
                    <span className="mono text-sm"><span className="text-muted">LEN </span>{mmss(t.durationSec)}</span>
                    <span className="mono text-sm"><span className="text-muted">WPM </span>{m.wpm ?? "n/a"} · <span className="text-muted">F/M </span>{m.fillersPerMin}</span>
                    <span className="mono text-sm text-amber">{t.outcome ?? ""}</span>
                    <b className="mono text-lg tabular-nums">{t.total ?? "--"}/{t.max ?? 100}</b>
                  </Link>
                  <button className="btn" aria-label={`Delete ${t.title}`} onClick={() => setTrials((p) => p.filter((x) => x.id !== t.id))}>Delete</button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
