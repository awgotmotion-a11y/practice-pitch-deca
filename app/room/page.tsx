"use client";
import { Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { eventByCode, SELLING_BRIEFS } from "@/lib/deca";
import { CATEGORIES, ATTITUDES, JUDGES, makeJudge, makeProspect } from "@/lib/personas";
import type { Difficulty, Judge, Mode, Prospect } from "@/lib/judge";
import type { RoomConfig, RoomResult } from "@/lib/room";
import { DEFAULT_PROFILE, useStored, type Profile } from "@/lib/store";
import { Debrief } from "@/components/Debrief";
import { EventSelect } from "@/components/EventSelect";
import { LiveRoom } from "@/components/LiveRoom";

type RoomMode = Exclude<Mode, "roleplay">;
const MODES: { id: RoomMode; n: string; title: string; desc: string; time: string; tip: string }[] = [
  { id: "plan", n: "04", title: "DECA Judge", desc: "Present your business plan, then a lender approves or declines it.", time: "15 MIN", tip: "Open with the problem and the ask. Put real numbers behind every claim, and answer the question you were asked first." },
  { id: "drill", n: "05", title: "Q&A Drill", desc: "No presentation. Just hard questions about your plan.", time: "10 MIN", tip: "Give a one-sentence answer, then the evidence. Do not contradict your plan notes." },
  { id: "shark", n: "06", title: "Shark Tank", desc: "Two minutes to pitch, then investors interrupt.", time: "8 MIN", tip: "Say who you are, what you want and why it matters in the first 20 seconds. Know your margins." },
  { id: "cold", n: "07", title: "Cold Call", desc: "Call a skeptical business owner and earn a next step.", time: "5 MIN", tip: "Say who you are and why you called in 15 seconds, ask one good question, then ask for something small." },
  { id: "selling", n: "07", title: "Professional Selling", desc: "Run the full sales meeting from the official event prompt.", time: "15 MIN", tip: "Ask about needs before you pitch. Tie every feature to something the buyer said they want." },
];
const DIFFS: [Difficulty, string][] = [["friendly", "Friendly"], ["realistic", "Realistic"], ["tough", "Tough"]];
const SELLING = ["PSE", "HTPS", "FCE"];

export default function RoomPage() {
  return (
    <Suspense>
      <Room />
    </Suspense>
  );
}

type Run = { cfg: RoomConfig; judgeName: string; judgeRole: string; subtitle?: string; title: string; judge?: Judge; prospect?: Prospect; event?: string; plan: string; pitch?: string };

function Room() {
  const param = useSearchParams().get("mode");
  const mode = MODES.find((m) => m.id === param) ?? null;
  const [profile] = useStored<Profile>("profile", DEFAULT_PROFILE);
  const [plan, setPlan] = useStored<string>("planNotes", "");
  const [pitch, setPitch] = useStored<string>("pitch", "");
  const [diff, setDiff] = useState<Difficulty>("realistic");
  const [judgeIdx, setJudgeIdx] = useState(-1);
  const [cat, setCat] = useState("");
  const [att, setAtt] = useState("");
  const [sellEv, setSellEv] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [result, setResult] = useState<RoomResult | null>(null);

  const selEv = sellEv ?? (SELLING.includes(profile.event) ? profile.event : "PSE");

  if (run && result)
    return (
      <Debrief
        result={result}
        onAgain={() => { setRun(null); setResult(null); }}
        base={{ mode: run.cfg.mode, event: run.event, title: run.title, difficulty: run.cfg.difficulty, judge: run.judge, prospect: run.prospect }}
        body={{ mode: run.cfg.mode, event: run.event, plan: run.plan, pitch: run.pitch, judge: run.judge, prospect: run.prospect }}
      />
    );

  if (run)
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-semibold">{run.title}</h1>
          {run.prospect && <span className="mono text-sm text-soft">{run.prospect.person} · {run.prospect.name}, a {run.prospect.type}</span>}
        </div>
        <LiveRoom cfg={run.cfg} judgeName={run.judgeName} judgeRole={run.judgeRole} subtitle={run.subtitle} onDone={setResult} />
      </div>
    );

  if (!mode)
    return (
      <div className="space-y-10">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Pitch Room</h1>
          <p className="max-w-xl text-soft">Talk to a judge, investor or prospect out loud. They interrupt, push back and score you on a real form.</p>
        </div>
        <div className="border-b border-line">
          {MODES.map((m) => (
            <Link key={m.id} href={`/room?mode=${m.id}`} className="row-link">
              <span className="mono text-amber">{m.n}</span>
              <span><b className="block text-xl font-semibold">{m.title}</b><span className="text-[15px] text-muted">{m.desc}</span></span>
              <span className="mono text-xs text-soft">{m.time}</span>
            </Link>
          ))}
        </div>
      </div>
    );

  const planOk = mode.id !== "plan" && mode.id !== "drill" ? true : plan.trim().length >= 20;
  const cold = mode.id === "cold";
  const ready = planOk && (!cold || pitch.trim().length > 0);

  function go() {
    if (!mode) return;
    const base = { difficulty: diff, plan: plan.trim() };
    let r: Run;
    if (mode.id === "plan" || mode.id === "drill") {
      const { rate, ...judge } = makeJudge("plan", judgeIdx >= 0 ? judgeIdx : undefined);
      const drill = mode.id === "drill";
      r = {
        title: drill ? "Q&A Drill" : "DECA Judge", judge, judgeName: judge.name, judgeRole: judge.role, plan: plan.trim(),
        cfg: {
          ...base, mode: mode.id, judge, rate, limitSec: drill ? 600 : 900, present: !drill,
          ...(drill ? { firstMessage: "(The student sits down across from you. Ask your first question.)" } : { opener: "Good morning, and thank you for coming in. Whenever you're ready, go ahead with your presentation." }),
        },
      };
    } else if (mode.id === "shark") {
      const { rate, ...judge } = makeJudge("shark");
      r = {
        title: "Shark Tank", judge, judgeName: judge.name, judgeRole: judge.role, plan: plan.trim(),
        cfg: { ...base, mode: "shark", judge, rate, limitSec: 480, present: true, presentMaxSec: 120, interruptAfterSec: 60, opener: "Hi. Tell me who you are, what you're asking for, and why I should care." },
      };
    } else if (mode.id === "cold") {
      const prospect = makeProspect(cat || undefined, att || undefined);
      r = {
        title: `${prospect.person} · ${prospect.name}`, prospect, judgeName: prospect.person, judgeRole: `${prospect.role}, ${prospect.name}`, plan: "", pitch: pitch.trim(),
        subtitle: `You are calling ${prospect.name}, a ${prospect.type}. You are selling: ${pitch.trim()}`,
        cfg: { ...base, plan: "", mode: "cold", prospect, limitSec: 300, present: false, opener: prospect.opener, rate: +prospect.rate },
      };
    } else {
      const { rate, ...judge } = makeJudge("selling");
      const ev = eventByCode(selEv);
      r = {
        title: ev.name, judge, event: ev.code, judgeName: judge.name, judgeRole: judge.role, plan: "",
        subtitle: `You are ${SELLING_BRIEFS[ev.code].you}. The buyer is ${SELLING_BRIEFS[ev.code].buyer}.`,
        cfg: { ...base, plan: "", mode: "selling", event: ev.code, judge, rate, limitSec: 900, present: false, opener: "Hi, thanks for coming in. I have about fifteen minutes. What did you want to show me?" },
      };
    }
    setRun(r);
  }

  const brief = SELLING_BRIEFS[selEv];
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <Link href="/room" className="mono text-xs">PITCH ROOM</Link>
        <h1 className="text-4xl font-bold">{mode.title}</h1>
        <p className="text-soft">{mode.desc}</p>
      </div>
      <div className="card space-y-6">
        {mode.id === "selling" && (
          <>
            <div>
              <label className="label" htmlFor="sell-ev">Event</label>
              <EventSelect id="sell-ev" value={selEv} onChange={setSellEv} only={(k) => k === "selling"} />
            </div>
            <dl className="space-y-3 rounded-lg border border-line p-4 text-[15px]">
              <Brief k="You are" v={brief.you} />
              <Brief k="The buyer" v={brief.buyer} />
              <Brief k="They want" v={brief.wants} />
            </dl>
          </>
        )}
        {mode.id === "plan" && (
          <div>
            <label className="label" htmlFor="judge">Judge</label>
            <select id="judge" className="field" value={judgeIdx} onChange={(e) => setJudgeIdx(+e.target.value)}>
              <option value={-1}>Random</option>
              {JUDGES.plan.map((j, i) => <option key={j.name} value={i}>{j.name}, {j.role}</option>)}
            </select>
          </div>
        )}
        {cold && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="cat">Industry</label>
                <select id="cat" className="field" value={cat} onChange={(e) => setCat(e.target.value)}>
                  <option value="">Any</option>
                  {Object.entries(CATEGORIES).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="att">Attitude</label>
                <select id="att" className="field" value={att} onChange={(e) => setAtt(e.target.value)}>
                  <option value="">Surprise me</option>
                  {ATTITUDES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="pitch">What are you selling?</label>
              <input id="pitch" className="field" value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder="One line, e.g. monthly social media management for local shops" />
            </div>
          </>
        )}
        <div>
          <span className="label" id="diff-l">Difficulty</span>
          <div className="seg" role="group" aria-labelledby="diff-l">
            {DIFFS.map(([id, label]) => <button key={id} aria-pressed={diff === id} onClick={() => setDiff(id)}>{label}</button>)}
          </div>
        </div>
        {(mode.id === "plan" || mode.id === "drill" || mode.id === "shark") && (
          <details open={!planOk}>
            <summary className="min-h-11 cursor-pointer py-2 font-semibold">Your plan notes{mode.id === "shark" ? " (optional)" : ""}</summary>
            <textarea
              className="field mt-2 min-h-44" aria-label="Your plan notes" value={plan} onChange={(e) => setPlan(e.target.value)}
              placeholder="Business name, the problem, your customers, prices, the numbers (costs, sales, margins), and the ask. Saved in this browser."
            />
            {!planOk && <p className="mt-2 text-sm text-amber">The judge needs your plan to ask about. Write at least a few lines.</p>}
          </details>
        )}
        <p className="border-l-2 border-amber pl-3 text-sm text-soft">{mode.tip}</p>
        <button className="btn-primary" disabled={!ready} onClick={go}>Go to the room</button>
      </div>
    </div>
  );
}

function Brief({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[6rem_1fr]">
      <dt className="mono text-[11px] uppercase tracking-wider text-muted">{k}</dt>
      <dd className="text-[#c4d4e6]">{v}</dd>
    </div>
  );
}
