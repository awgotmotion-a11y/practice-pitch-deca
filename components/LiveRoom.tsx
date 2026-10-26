"use client";
import { useEffect, useRef, useState } from "react";
import { Room, speechSupported, type RoomConfig, type RoomResult } from "@/lib/room";
import { OrbStage } from "./Orb";

const PHASE: Record<string, string> = { intro: "INTRO", present: "PRESENTING", qa: "Q&A" };
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Live voice session. The Room is created on the Start click because the mic permission prompt needs a user gesture. */
export function LiveRoom({ cfg, judgeName, judgeRole, subtitle, startMuted, onDone }: {
  cfg: RoomConfig; judgeName: string; judgeRole: string; subtitle?: string; startMuted?: boolean; onDone: (r: RoomResult) => void;
}) {
  const [room, setRoom] = useState<Room | null>(null);
  const [, bump] = useState(0);
  const [err, setErr] = useState("");
  const [starting, setStarting] = useState(false);
  const [typed, setTyped] = useState("");
  const [srOk, setSrOk] = useState(true);
  const roomRef = useRef<Room | null>(null);
  const alive = useRef(true);
  const logEnd = useRef<HTMLDivElement>(null);
  const v = room?.view;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      void roomRef.current?.finish();
    };
  }, []);
  const nLog = v?.log.length ?? 0, live = v?.live;
  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: "nearest" });
  }, [nLog, live]);

  async function start() {
    setErr(""); setStarting(true); setSrOk(speechSupported());
    const r = new Room(cfg, () => alive.current && bump((n) => n + 1));
    if (startMuted) r.toggleMute();
    roomRef.current = r;
    setRoom(r);
    let failed = false;
    r.finished.then((res) => alive.current && !failed && onDone(res));
    try {
      await r.start();
      setStarting(false);
    } catch (e) {
      failed = true;
      roomRef.current = null; setRoom(null); setStarting(false);
      void r.finish();
      const name = (e as Error).name;
      setErr(name === "NotAllowedError" || name === "SecurityError" ? "Microphone access was blocked. Allow the microphone in your browser's site settings, then try again." : name === "NotFoundError" ? "No microphone was found. Plug one in and try again." : `Could not start the session: ${(e as Error).message}`);
    }
  }

  if (!room || !v)
    return (
      <div className="grid items-center gap-8 lg:grid-cols-2">
        <OrbStage tl={{ k: "JUDGE", v: judgeName }} tr={{ k: "TIME LIMIT", v: mmss(cfg.limitSec), tone: "amber" }} bl={{ k: "ROLE", v: judgeRole }} br={{ k: "STATUS", v: "Standing by" }} />
        <div className="space-y-4">
          <h2 className="text-3xl font-semibold">Ready when you are</h2>
          {subtitle && <p className="text-soft">{subtitle}</p>}
          <p className="text-muted">
            Your browser will ask for the microphone. The judge speaks first, then you talk normally. Pause for about two seconds and the judge answers.
            You can also type. The recording stays on this device.
          </p>
          {err && <p role="alert" className="rounded-lg border border-danger p-3 text-sm text-danger">{err}</p>}
          <button className="btn-primary" onClick={start} disabled={starting}>{starting ? "Starting..." : "Allow microphone and start"}</button>
        </div>
      </div>
    );

  const t = v.log.length === 0 && v.timeLeft === 0 ? cfg.limitSec : v.timeLeft;
  const tone = t <= 30 ? "text-danger" : t <= 60 ? "text-amber" : "text-foreground";
  const canType = !v.done && (v.phase === "present" || v.myFloor);
  const end = () => {
    if (v.log.length > 2 && !window.confirm("End the session now and get your score?")) return;
    void room.finish();
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
      <OrbStage
        room={room}
        tl={{ k: "JUDGE", v: <>{judgeName}<br />{judgeRole}</> }}
        tr={{ k: "TIME LEFT", v: mmss(t), tone: "amber" }}
        bl={{ k: "PHASE", v: PHASE[v.phase] }}
        br={{ k: "STATUS", v: v.status || "..." }}
      />
      <section aria-label="Session" className="flex min-h-0 flex-col gap-4 rounded-xl border border-line bg-card p-4 sm:p-5">
        <div className="flex items-baseline justify-between">
          <span className="tag">{PHASE[v.phase]}</span>
          <span className={`mono text-4xl font-semibold tabular-nums ${tone}`} aria-label="Time left">{mmss(t)}</span>
        </div>
        {(v.srBlocked || !srOk) && (
          <p role="alert" className="rounded-lg border border-amber p-3 text-sm text-amber">
            {srOk ? "Speech recognition is blocked." : "This browser can't transcribe speech (try Chrome or Edge)."} Type your answers below.
          </p>
        )}
        <div role="log" aria-label="Transcript" className="max-h-[38vh] min-h-40 space-y-3 overflow-y-auto pr-1 lg:max-h-[44vh]">
          {v.log.map((l, i) => (
            <div key={i}>
              <span className={`mono text-[11px] uppercase tracking-wider ${l.who === "judge" ? "text-accent" : "text-amber"}`}>{l.who === "judge" ? judgeName : "You"}</span>
              <p className="text-[15px] leading-relaxed text-[#c4d4e6]">{l.text}</p>
            </div>
          ))}
          {v.live && (
            <div>
              <span className="mono text-[11px] uppercase tracking-wider text-amber">You</span>
              <p className="text-[15px] leading-relaxed text-muted">{v.live}</p>
            </div>
          )}
          <div ref={logEnd} />
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); room.typed(typed); setTyped(""); }}
        >
          <input className="field" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={!canType} placeholder="Or type instead" aria-label="Type instead of speaking" />
          <button className="btn" type="submit" disabled={!canType || !typed.trim()}>Send</button>
        </form>
        <div className="flex flex-wrap gap-2">
          {v.canFinishPresenting && <button className="btn-primary" onClick={() => void room.donePresenting()}>Done presenting, take questions</button>}
          {v.phase === "qa" && v.myFloor && <button className="btn-primary" onClick={() => void room.endTurn(true)}>I&apos;m done answering</button>}
          <button className="btn" onClick={() => room.toggleMute()} aria-pressed={v.muted}>{v.muted ? "Unmute" : "Mute judge"}</button>
          <button className="btn" onClick={end} disabled={v.done}>End session</button>
        </div>
      </section>
    </div>
  );
}
