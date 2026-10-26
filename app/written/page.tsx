"use client";
import { useState } from "react";
import { formMax, WRITTEN_EVENTS, writtenByCode } from "@/lib/forms";
import { ApiError, api } from "@/lib/room";
import { DEFAULT_PROFILE, now, useStored, type Profile, type ReportData, type Trial } from "@/lib/store";
import { AccessCodeForm, useAccessCode } from "@/components/AccessCode";
import { Report } from "@/components/Report";

type Status = "idle" | "grading" | "error" | "code";
const GROUPS = [...new Set(WRITTEN_EVENTS.map((e) => e.group))];

export default function WrittenPage() {
  const [accessCode, setAccessCode] = useAccessCode();
  const [profile] = useStored<Profile>("profile", DEFAULT_PROFILE);
  const [picked, setPicked] = useStored<string>("writtenEvent", "");
  const [, setTrials] = useStored<Trial[]>("trials", []);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState<{ trial: Trial; cut: boolean } | null>(null);

  const ev = writtenByCode(picked) ?? writtenByCode(profile.event) ?? WRITTEN_EVENTS[0];
  const pasted = text.trim().length >= 300;
  const ready = !!file || pasted;
  // Section points on this form, in order, for the "what the judge scores" strip.
  const sections = [...new Set(ev.form.rows.map((r) => r.group))].map((g) => [g, formMax({ ...ev.form, rows: ev.form.rows.filter((r) => r.group === g) })] as const);

  async function grade() {
    setStatus("grading");
    const fd = new FormData();
    fd.set("event", ev.code);
    if (pasted) fd.set("text", text.trim());
    else if (file) fd.set("file", file);
    try {
      const report = await api<ReportData & { cut: boolean }>(fd, accessCode);
      const trial: Trial = {
        id: crypto.randomUUID(), date: now(), mode: "written", event: ev.code, title: `${ev.name}${!pasted && file ? ` · ${file.name}` : ""}`,
        total: report.total, max: report.max, outcome: report.outcome, report, transcript: [], durationSec: 0,
      };
      setTrials((prev) => [trial, ...prev].slice(0, 50));
      setResult({ trial, cut: report.cut });
      setStatus("idle");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setStatus("code");
      else { setMsg((e as Error).message); setStatus("error"); }
    }
  }

  if (result)
    return (
      <div className="space-y-6">
        {result.cut && <p className="border-l-2 border-amber pl-3 text-sm text-soft">Your entry was longer than 20 pages of text, so the judge read the first 20. DECA takes 5 penalty points per page over the limit.</p>}
        <Report trial={result.trial} onAgain={() => { setResult(null); setFile(null); setText(""); }} />
      </div>
    );
  if (status === "code") return <AccessCodeForm onSaved={() => void grade()} />;
  if (status === "grading")
    return (
      <div className="card mx-auto max-w-xl space-y-4">
        <h2 className="text-2xl font-semibold">Reading your entry</h2>
        <p role="status" className="text-muted">The judge is reading every section and filling out the official form. This takes about a minute.</p>
        <div className="h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full w-1/3 animate-pulse bg-accent" /></div>
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Writtens</h1>
        <p className="text-soft">Upload your written entry or pitch deck. A judge scores it on this year&apos;s official form, explains every score and shows you what to fix before you present.</p>
      </div>
      <div className="card space-y-6">
        <div>
          <label className="label" htmlFor="w-ev">Event</label>
          <select id="w-ev" className="field" value={ev.code} onChange={(e) => setPicked(e.target.value)}>
            {GROUPS.map((g) => (
              <optgroup key={g} label={g}>
                {WRITTEN_EVENTS.filter((e) => e.group === g).map((e) => <option key={e.code} value={e.code}>{e.name} ({e.code})</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-line p-4">
          <p className="mono mb-3 text-[11px] uppercase tracking-wider text-muted">{ev.form.title} · {formMax(ev.form)} pts</p>
          <ul className="grid gap-x-6 gap-y-1.5 text-[15px] sm:grid-cols-2">
            {sections.map(([g, pts]) => (
              <li key={g} className="flex justify-between gap-3 border-b border-line pb-1.5 text-[#c4d4e6]"><span>{g}</span><span className="mono text-amber">{pts}</span></li>
            ))}
          </ul>
          {ev.deck && <p className="mt-3 text-sm text-muted">Pitch decks have no separate written score. This grades the deck against the presentation form. Delivery and Overall Impression (10 pts) are scored when you present it in the Pitch Room.</p>}
        </div>

        <div>
          <label className="label" htmlFor="w-file">Your {ev.deck ? "pitch deck" : "written entry"} (PDF or Word)</label>
          <input
            id="w-file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="field file:mr-4 file:min-h-9 file:cursor-pointer file:rounded-md file:border-0 file:bg-accent file:px-3 file:font-semibold file:text-background"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className="mt-2 text-sm text-muted">{ev.deck ? "Slides in PowerPoint, Keynote or Google Slides? Export them as a PDF first." : "Google Docs: File, Download, PDF."} Text is read from the file; charts and images aren&apos;t, so the judge can only score layout from what the text shows.</p>
        </div>

        <details open={!file && text.length > 0}>
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">Or paste the text</summary>
          <textarea className="field mt-2 min-h-44" aria-label="Entry text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the whole entry, section titles included." />
          {text.length > 0 && !pasted && <p className="mt-2 text-sm text-amber">Paste the full entry. That&apos;s too short to grade.</p>}
          {pasted && file && <p className="mt-2 text-sm text-muted">Using the pasted text instead of the file.</p>}
        </details>

        <p className="border-l-2 border-amber pl-3 text-sm text-soft">Leave out names, your school and contact details. The file is read once to grade it and is never stored.</p>
        {status === "error" && <p role="alert" className="text-danger">{msg}</p>}
        <details>
          <summary className="min-h-11 cursor-pointer py-2 text-sm text-muted">Access code (only if your advisor gave you one)</summary>
          <input className="field mt-2" aria-label="Access code" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} autoComplete="off" />
        </details>
        <button className="btn-primary" disabled={!ready} onClick={() => void grade()}>Grade my {ev.deck ? "deck" : "entry"}</button>
      </div>
    </div>
  );
}
