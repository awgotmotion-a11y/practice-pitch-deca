"use client";
import { useEffect, useRef, useState } from "react";
import { ApiError, api, type RoomResult } from "@/lib/room";
import { now, useStored, type ReportData, type Trial } from "@/lib/store";
import { AccessCodeForm, useAccessCode } from "./AccessCode";
import { Report } from "./Report";

type Base = Pick<Trial, "mode" | "event" | "level" | "title" | "difficulty" | "scenario" | "judge" | "prospect">;
type Status = "scoring" | "short" | "error" | "code" | "done";

/** Scores a finished session and saves it as a trial. Sessions with under 20 spoken words are neither scored nor saved. */
export function Debrief({ base, body, result, onAgain }: { base: Base; body: object; result: RoomResult; onAgain: () => void }) {
  const [accessCode] = useAccessCode();
  const [, setTrials] = useStored<Trial[]>("trials", []);
  const words = result.metrics.words;
  const [status, setStatus] = useState<Status>(words < 20 ? "short" : "scoring");
  const [msg, setMsg] = useState("");
  const [trial, setTrial] = useState<Trial | null>(null);
  const started = useRef(false);

  async function run() {
    try {
      const report = await api<ReportData>({
        kind: "score", ...body, metrics: result.metrics,
        transcript: result.transcript.map((l) => ({ who: l.who, text: l.text })),
      }, accessCode);
      const t: Trial = {
        ...base, id: crypto.randomUUID(), date: now(), total: report.total, max: report.max, outcome: report.outcome, report,
        transcript: result.transcript, metrics: result.metrics, durationSec: result.durationSec,
      };
      setTrials((prev) => [t, ...prev].slice(0, 50));
      setTrial(t); setStatus("done");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setStatus("code");
      else { setMsg((e as Error).message); setStatus("error"); }
    }
  }
  useEffect(() => {
    if (started.current || status !== "scoring") return;
    started.current = true;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "done" && trial) return <Report trial={trial} audio={result.audio} onAgain={onAgain} />;
  if (status === "code") return <AccessCodeForm onSaved={() => { setStatus("scoring"); void run(); }} />;
  return (
    <div className="card mx-auto max-w-xl space-y-4">
      {status === "scoring" && (
        <>
          <h2 className="text-2xl font-semibold">Scoring your session</h2>
          <p role="status" className="text-muted">The judge is filling out the official form. This takes about 30 seconds.</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full w-1/3 animate-pulse bg-accent" /></div>
        </>
      )}
      {status === "short" && (
        <>
          <h2 className="text-2xl font-semibold">Not saved</h2>
          <p className="text-muted">Not saved: you said {words} word{words === 1 ? "" : "s"}, and a score needs at least 20. Try again and talk (or type) through your answers.</p>
        </>
      )}
      {status === "error" && (
        <>
          <h2 className="text-2xl font-semibold">Could not score this session</h2>
          <p role="alert" className="text-danger">{msg}</p>
          {!/budget/i.test(msg) && <button className="btn" onClick={() => { setStatus("scoring"); void run(); }}>Try scoring again</button>}
        </>
      )}
      {status !== "scoring" && <button className="btn-primary" onClick={onAgain}>Practice again</button>}
    </div>
  );
}
