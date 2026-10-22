"use client";
import { useRef, useState, useSyncExternalStore } from "react";

// ponytail: browser Web Speech API (free, Chrome/Edge/Safari). Swap for Deepgram/Whisper streaming if accuracy or Firefox support matters.

type Result = { isFinal: boolean; 0: { transcript: string } };
type Recognizer = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { resultIndex: number; results: ArrayLike<Result> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
};
type RecognizerCtor = new () => Recognizer;

function getCtor(): RecognizerCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognizerCtor; webkitSpeechRecognition?: RecognizerCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const noop = () => () => {};
export const useSpeechSupported = () => useSyncExternalStore(noop, () => !!getCtor(), () => false);

const PAUSE_MS = 3000;

/** Live speech-to-text. `final` accumulates across start/stop; speaking time and long pauses feed delivery stats. */
export function useDictation() {
  const [final, setFinal] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const rec = useRef<Recognizer | null>(null);
  const want = useRef(false);
  const stats = useRef({ speakingMs: 0, segStart: 0, lastHeard: 0, longPauses: 0 });

  const start = () => {
    const Ctor = getCtor();
    if (!Ctor || want.current) return;
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e) => {
      const s = stats.current;
      const now = Date.now();
      if (s.lastHeard && now - s.lastHeard > PAUSE_MS) s.longPauses++;
      s.lastHeard = now;
      let fin = "";
      let mid = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) fin += res[0].transcript;
        else mid += res[0].transcript;
      }
      if (fin) setFinal((f) => (f + " " + fin).trim());
      setInterim(mid);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed") {
        want.current = false;
        setError("Microphone permission was denied. Allow mic access or type instead.");
      }
    };
    // Browsers end recognition after silence; restart while the user still wants to talk.
    r.onend = () => {
      if (want.current) r.start();
      else setListening(false);
    };
    want.current = true;
    stats.current.segStart = Date.now();
    stats.current.lastHeard = Date.now();
    rec.current = r;
    setError("");
    setListening(true);
    r.start();
  };

  const stop = () => {
    if (!want.current) return;
    want.current = false;
    stats.current.speakingMs += Date.now() - stats.current.segStart;
    stats.current.lastHeard = 0;
    rec.current?.stop();
    setInterim("");
  };

  const reset = () => {
    setFinal("");
    setInterim("");
  };

  return { final, setFinal, interim, listening, error, start, stop, reset, stats };
}

export function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return resolve();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

const FILLERS = /\b(um+|uh+|erm|like|you know|basically|literally|kind of|sort of|i mean)\b/gi;

export function deliveryStats(text: string, speakingMs: number, longPauses: number) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const mins = Math.max(speakingMs / 60000, 0.25);
  return {
    wpm: Math.round(words / mins),
    fillersPerMin: Math.round(((text.match(FILLERS)?.length ?? 0) / mins) * 10) / 10,
    longPauses,
  };
}

/** Self-check: run `npx tsx lib/speech.ts` (no browser APIs touched). */
if (typeof window === "undefined" && typeof process !== "undefined" && process.argv[1]?.endsWith("speech.ts")) {
  const d = deliveryStats("um so basically we will like grow sales", 60000, 2);
  console.assert(d.wpm === 8, "wpm", d);
  console.assert(d.fillersPerMin === 3, "fillers", d);
  console.log("speech self-check ok", d);
}
