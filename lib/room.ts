"use client";
// Live voice session against the AI judge: listens, detects when you stop talking, sends the turn,
// plays the judge's voice, records the whole thing and measures delivery. Ported from Pitch Room.
import type { Judge, Mode, Prospect, Scenario } from "./judge";

export type Who = "you" | "judge";
export type Line = { who: Who; text: string; t0: number; t1?: number; phase?: "present" | "qa" };
export type Metrics = {
  words: number; speakingSec: number; wpm: number | null; fillers: Record<string, number>; fillersPerMin: number;
  hedges: Record<string, number>; hedgeCount: number; numbersCited: number; longPauses: number; longestPause: number;
  avgResponseSec: number | null; answers: number; avgAnswerWords: number | null; longestAnswerWords: number | null; presentSec: number | null;
};
export type RoomConfig = {
  mode: Mode; difficulty: "friendly" | "realistic" | "tough"; event?: string; scenario?: Scenario; plan?: string;
  judge?: Judge; prospect?: Prospect; accessCode: string;
  limitSec: number; present: boolean; presentMaxSec?: number; interruptAfterSec?: number;
  opener?: string; firstMessage?: string; rate?: number;
};
export type RoomResult = { transcript: Line[]; metrics: Metrics; durationSec: number; audio: Blob; reason?: string };

const FILLERS = ["um", "uh", "erm", "ah", "like", "you know", "kind of", "sort of", "basically", "literally", "i mean", "so yeah"];
const HEDGES = ["i think", "i guess", "maybe", "probably", "hopefully", "i feel like", "pretty much", "i believe"];
const SILENCE_END = 1.8; // seconds of quiet that end your answer
const LONG_PAUSE = 2.5; // seconds of quiet mid-answer that count as dead air

type Rec = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null; start(): void; stop(): void;
};
const recognizer = (): (new () => Rec) | undefined => {
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};
export const speechSupported = () => typeof window !== "undefined" && !!recognizer();

export class ApiError extends Error {
  constructor(msg: string, public code: string, public status: number) { super(msg); }
}
export async function api<T>(body: object, accessCode: string): Promise<T> {
  const r = await fetch("/api/ai", { method: "POST", headers: { "content-type": "application/json", "x-access-code": accessCode }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(data.error === "budget" ? "Today's free AI budget is used up. It resets at 8 PM Eastern." : data.error ?? `Request failed (${r.status})`, data.error ?? "", r.status);
  return data as T;
}

function count(text: string, list: string[]) {
  const out: Record<string, number> = {};
  for (const p of list) {
    const n = (text.match(new RegExp(`\\b${p}\\b`, "g")) || []).length;
    if (n) out[p] = n;
  }
  return out;
}
const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
const r1 = (x: number) => Math.round(x * 10) / 10;

export function computeMetrics(transcript: Line[], floorSec: number, pauses: number[], latencies: number[], presentSec: number | null): Metrics {
  const you = transcript.filter((x) => x.who === "you");
  const text = " " + you.map((x) => x.text).join(" ").toLowerCase().replace(/[^\w$%'\s.-]/g, " ") + " ";
  const words = text.split(/\s+/).filter(Boolean).length;
  const min = Math.max(floorSec, 1) / 60;
  const fillers = count(text, FILLERS), hedges = count(text, HEDGES);
  const answers = you.filter((x) => x.phase !== "present").map((x) => x.text.split(/\s+/).length);
  return {
    words, speakingSec: Math.round(floorSec), wpm: floorSec > 10 ? Math.round(words / min) : null,
    fillers, fillersPerMin: r1(sum(fillers) / min), hedges, hedgeCount: sum(hedges),
    numbersCited: (text.match(/\$?\d[\d,.]*%?|\b(hundred|thousand|million|percent)\b/g) || []).length,
    longPauses: pauses.length, longestPause: r1(Math.max(0, ...pauses)),
    avgResponseSec: latencies.length ? r1(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
    answers: answers.length, avgAnswerWords: answers.length ? Math.round(answers.reduce((a, b) => a + b, 0) / answers.length) : null,
    longestAnswerWords: answers.length ? Math.max(...answers) : null, presentSec,
  };
}

export type RoomView = {
  phase: "intro" | "present" | "qa"; status: string; log: Line[]; live: string; timeLeft: number;
  myFloor: boolean; thinking: boolean; muted: boolean; done: boolean; canFinishPresenting: boolean; srBlocked: boolean;
};

export class Room {
  view: RoomView = { phase: "intro", status: "", log: [], live: "", timeLeft: 0, myFloor: false, thinking: false, muted: false, done: false, canFinishPresenting: false, srBlocked: false };
  private history: { role: "user" | "assistant"; content: string }[] = [];
  private t0 = 0; private turn: string[] = []; private turnT0: number | null = null; private interim = ""; private segStart: number | null = null;
  private floorSec = 0; private floorStart = 0; private awaitFirst = false; private spoke = false; private lastVoice = 0; private silentSince: number | null = null;
  private pauses: number[] = []; private latencies: number[] = []; private presentStart = 0; private presentEnd = 0;
  private busy = false; private ending = false; private listening = false; private recOn = false; private noise: number | null = null;
  private tick?: ReturnType<typeof setInterval>; private silenceT?: ReturnType<typeof setTimeout>; private raf = 0; private last = 0;
  private actx?: AudioContext; private micAn?: AnalyserNode; private judgeAn?: AnalyserNode; private stream?: MediaStream;
  private recorder?: MediaRecorder; private chunks: Blob[] = []; private rec?: Rec; private audioEl: HTMLAudioElement;
  private resolveDone!: (r: RoomResult) => void;
  readonly finished: Promise<RoomResult>;
  /** 0..1 loudness of the judge's voice and the student's mic, for the orb. */
  levels = { judge: 0, mic: 0 };

  constructor(private cfg: RoomConfig, private onChange: () => void) {
    this.audioEl = new Audio();
    this.finished = new Promise((r) => (this.resolveDone = r));
  }

  private clock = () => (performance.now() - this.t0) / 1000;
  private set(patch: Partial<RoomView>) { this.view = { ...this.view, ...patch }; this.onChange(); }
  private status(s: string) { this.set({ status: s }); }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    this.actx = new AudioContext();
    this.judgeAn = this.actx.createAnalyser(); this.judgeAn.fftSize = 1024;
    this.actx.createMediaElementSource(this.audioEl).connect(this.judgeAn); this.judgeAn.connect(this.actx.destination);
    await this.actx.resume();
    this.micAn = this.actx.createAnalyser(); this.micAn.fftSize = 1024;
    this.actx.createMediaStreamSource(this.stream).connect(this.micAn);
    const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((t) => MediaRecorder.isTypeSupported?.(t));
    this.recorder = new MediaRecorder(this.stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 32000 });
    this.recorder.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.recorder.start(1000);
    this.initRec();
    this.t0 = performance.now();
    this.tick = setInterval(() => this.onTick(), 250);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);

    if (this.cfg.firstMessage) {
      this.history.push({ role: "user", content: this.cfg.firstMessage });
      this.set({ phase: "qa" });
      return this.ask();
    }
    const opener = this.cfg.opener ?? "Hello. Go ahead whenever you're ready.";
    this.status("…");
    let audio: string | null = null;
    try { audio = (await api<{ audio: string | null }>({ kind: "speak", text: opener }, this.cfg.accessCode)).audio; } catch (e) { if ((e as ApiError).code === "budget") return this.finish("budget"); }
    this.history.push({ role: "assistant", content: opener });
    await this.judgeSay(opener, audio);
    if (this.cfg.present) {
      this.presentStart = this.clock();
      this.set({ phase: "present", canFinishPresenting: true });
      this.openFloor("Presenting. The judge is listening.");
    } else {
      this.set({ phase: "qa" });
      this.openFloor();
    }
  }

  // ------------------------------------------------ speech recognition
  private initRec() {
    const Ctor = recognizer();
    if (!Ctor) return this.set({ srBlocked: true });
    const rec = new Ctor(); rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
    rec.onresult = (e) => {
      if (!this.listening) return;
      const now = this.clock();
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i], t = r[0].transcript.trim();
        if (!t) continue;
        if (r.isFinal) { this.addSpeech(t, this.segStart ?? now, now); this.segStart = null; this.interim = ""; }
        else { if (this.segStart == null) this.segStart = now; this.interim = t; }
      }
      this.renderLive(); this.armSilence();
    };
    rec.onend = () => { this.recOn = false; if (this.listening) this.startRec(); }; // Chrome stops on its own; keep it alive
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") { this.set({ srBlocked: true }); this.status("Speech recognition is blocked. Type your answers below."); }
    };
    this.rec = rec;
  }
  private startRec() { if (!this.rec || this.recOn || this.view.srBlocked) return; try { this.rec.start(); this.recOn = true; } catch {} }
  private listen(on: boolean) { this.listening = on; if (on) this.startRec(); else { try { this.rec?.stop(); } catch {} } }

  private openFloor(msg = "Your turn.") {
    if (this.view.done) return;
    this.floorStart = this.clock(); this.awaitFirst = this.view.phase !== "present"; this.spoke = false; this.silentSince = null;
    this.turn = []; this.turnT0 = null;
    this.set({ myFloor: true, status: msg });
    this.listen(true);
  }
  private addSpeech(text: string, t0: number, t1: number) {
    if (this.view.phase === "present") this.pushLine({ who: "you", text, t0, t1, phase: "present" });
    else { if (this.turnT0 == null) this.turnT0 = t0; this.turn.push(text); }
  }
  private pushLine(l: Line) { this.set({ log: [...this.view.log, l] }); }
  private renderLive() { this.set({ live: this.view.phase === "present" ? this.interim : [...this.turn, this.interim].join(" ") }); }
  private armSilence() {
    clearTimeout(this.silenceT);
    if (this.view.phase === "present") return;
    const check = () => {
      if (!this.view.myFloor) return;
      if (this.clock() - this.lastVoice < SILENCE_END) { this.silenceT = setTimeout(check, 400); return; } // still talking, recognizer lagging
      this.endTurn();
    };
    this.silenceT = setTimeout(check, SILENCE_END * 1000);
  }

  // ------------------------------------------------ turns
  async endTurn(force = false) {
    if (!this.view.myFloor || this.busy) return;
    const text = [...this.turn, this.interim].join(" ").replace(/\s+/g, " ").trim();
    if (!text && !force) return;
    this.listen(false); clearTimeout(this.silenceT);
    this.interim = "";
    this.set({ myFloor: false, live: "" });
    if (text) this.pushLine({ who: "you", text, t0: this.turnT0 ?? this.floorStart, t1: this.clock(), phase: "qa" });
    this.history.push({ role: "user", content: text || "(silence)" });
    await this.ask();
  }

  async donePresenting() {
    if (this.view.phase !== "present") return;
    this.listen(false);
    if (this.interim) { this.addSpeech(this.interim, this.segStart ?? this.clock(), this.clock()); this.interim = ""; }
    this.presentEnd = this.clock();
    this.set({ phase: "qa", canFinishPresenting: false, myFloor: false, live: "" });
    const said = this.view.log.filter((x) => x.phase === "present").map((x) => x.text).join(" ");
    this.history.push({ role: "user", content: `[The participant's presentation, transcribed from speech]\n${said || "(nothing was heard)"}\n[End of presentation. Ask your first question.]` });
    await this.ask();
  }

  typed(v: string) {
    if (!v.trim() || this.view.done) return;
    if (this.view.phase === "present") return this.addSpeech(v, this.clock(), this.clock());
    if (!this.view.myFloor) return;
    this.turn.push(v); if (this.turnT0 == null) this.turnT0 = this.clock();
    this.endTurn();
  }

  private async ask() {
    this.busy = true; this.set({ thinking: true, status: "Thinking…" });
    const c = this.cfg;
    try {
      const r = await api<{ reply: string; end: boolean; audio: string | null }>({
        kind: "turn", mode: c.mode, difficulty: c.difficulty, event: c.event, scenario: c.scenario, plan: c.plan ?? "",
        judge: c.judge, prospect: c.prospect, history: this.history, voice: !this.view.muted,
      }, c.accessCode);
      this.history.push({ role: "assistant", content: r.reply });
      this.busy = false; this.set({ thinking: false });
      await this.judgeSay(r.reply, r.audio);
      if (r.end || this.ending) return this.finish();
      this.openFloor();
    } catch (e) {
      this.busy = false; this.set({ thinking: false });
      if ((e as ApiError).code === "budget") return this.finish("budget");
      this.status(`Connection problem, try answering again. (${(e as Error).message})`);
      this.history.pop();
      this.openFloor();
    }
  }

  private judgeSay(text: string, audio: string | null) {
    this.listen(false);
    const entry: Line = { who: "judge", text, t0: this.clock() };
    this.pushLine(entry);
    this.set({ myFloor: false, status: "Speaking…" });
    const rate = this.cfg.rate ?? 1;
    return new Promise<void>((res) => {
      const done = () => { entry.t1 = this.clock(); res(); };
      const fallback = () => {
        if (this.view.muted || !("speechSynthesis" in window)) return done();
        const u = new SpeechSynthesisUtterance(text); u.rate = rate;
        u.voice = speechSynthesis.getVoices().find((v) => /en-US/.test(v.lang) && /Google|Samantha|Aaron|Natural/i.test(v.name)) ?? null;
        u.onend = done; u.onerror = done; speechSynthesis.speak(u);
      };
      if (audio && !this.view.muted) {
        this.audioEl.src = (audio.startsWith("UklGR") ? "data:audio/wav;base64," : "data:audio/mpeg;base64,") + audio;
        this.audioEl.defaultPlaybackRate = this.audioEl.playbackRate = rate;
        this.audioEl.onended = done; this.audioEl.onerror = fallback;
        this.audioEl.play().catch(fallback);
      } else if (this.view.muted) setTimeout(done, Math.min(6000, 400 + text.length * 25)); // muted: time to read
      else fallback();
    });
  }

  toggleMute() {
    const muted = !this.view.muted;
    this.set({ muted });
    if (muted) { this.audioEl.pause(); this.audioEl.onended?.(new Event("ended")); speechSynthesis?.cancel(); }
  }

  private onTick() {
    if (this.view.done) return;
    const t = this.clock(), c = this.cfg;
    this.set({ timeLeft: Math.max(0, c.limitSec - t) });
    if (this.view.phase === "present" && c.presentMaxSec && t - this.presentStart >= c.presentMaxSec) this.donePresenting();
    if (c.interruptAfterSec && this.view.myFloor && this.view.phase === "qa" && this.turnT0 != null && t - this.turnT0 > c.interruptAfterSec) this.endTurn();
    if (t >= c.limitSec && !this.ending) this.timeUp();
  }

  private async timeUp() {
    this.ending = true;
    await new Promise<void>((r) => { const i = setInterval(() => { if (this.view.done || (!this.busy && (this.view.myFloor || this.view.phase === "present"))) { clearInterval(i); r(); } }, 200); });
    if (this.view.done) return;
    this.listen(false);
    const text = [...this.turn, this.interim].join(" ").trim();
    if (this.view.phase === "present") {
      this.presentEnd = this.clock();
      const said = this.view.log.filter((x) => x.phase === "present").map((x) => x.text).join(" ");
      this.history.push({ role: "user", content: `[The participant's presentation]\n${said}\n(TIME IS UP)` });
      this.set({ canFinishPresenting: false });
    } else {
      if (text) this.pushLine({ who: "you", text, t0: this.turnT0 ?? this.floorStart, t1: this.clock(), phase: "qa" });
      this.history.push({ role: "user", content: (text ? text + "\n\n" : "") + (this.cfg.mode === "cold" ? "(You have to go now. Wrap up and end the call.)" : "(TIME IS UP)") });
    }
    this.set({ myFloor: false });
    await this.ask();
  }

  // ------------------------------------------------ audio levels + delivery timing
  private level(an?: AnalyserNode) {
    if (!an) return 0;
    const a = new Float32Array(an.fftSize); an.getFloatTimeDomainData(a);
    let s = 0; for (const v of a) s += v * v;
    return Math.sqrt(s / a.length);
  }
  private frame = (now: number) => {
    if (this.view.done) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    const mic = this.level(this.micAn), jud = this.level(this.judgeAn);
    // adaptive noise floor so "voiced" works in a quiet room and a loud one
    this.noise = this.noise == null ? mic : mic < this.noise * 2.5 ? this.noise * 0.98 + mic * 0.02 : this.noise;
    const voiced = mic > Math.max(0.012, this.noise * 3);
    const t = this.clock();
    if (this.view.myFloor) {
      this.floorSec += dt;
      if (voiced) {
        if (this.awaitFirst) { this.latencies.push(t - this.floorStart); this.awaitFirst = false; }
        if (this.silentSince != null && this.spoke && t - this.silentSince >= LONG_PAUSE) this.pauses.push(t - this.silentSince);
        this.silentSince = null; this.spoke = true; this.lastVoice = t;
      } else if (this.silentSince == null) this.silentSince = t;
    }
    this.levels.judge += (Math.min(1, jud * 6) - this.levels.judge) * 0.25;
    this.levels.mic += (Math.min(1, (this.view.myFloor ? mic : 0) * 8) - this.levels.mic) * 0.3;
  };

  async finish(reason?: string) {
    if (this.view.done) return;
    clearInterval(this.tick); clearTimeout(this.silenceT); cancelAnimationFrame(this.raf);
    this.listen(false); speechSynthesis?.cancel(); this.audioEl.pause();
    const text = [...this.turn, this.interim].join(" ").trim();
    const log = [...this.view.log];
    if (text && this.view.phase !== "present") log.push({ who: "you", text, t0: this.turnT0 ?? this.floorStart, t1: this.clock(), phase: "qa" });
    if (this.view.phase === "present" && !this.presentEnd) this.presentEnd = this.clock();
    this.set({ done: true, myFloor: false, log });
    const audio = await new Promise<Blob>((res) => {
      const out = () => { this.stream?.getTracks().forEach((t) => t.stop()); this.actx?.close(); res(new Blob(this.chunks, { type: this.recorder?.mimeType || "audio/webm" })); };
      if (this.recorder && this.recorder.state !== "inactive") { this.recorder.onstop = out; this.recorder.stop(); } else out();
    });
    const presentSec = this.presentEnd ? Math.round(this.presentEnd - this.presentStart) : null;
    this.resolveDone({ transcript: log, metrics: computeMetrics(log, this.floorSec, this.pauses, this.latencies, presentSec), durationSec: Math.round(this.clock()), audio, reason });
  }
}
