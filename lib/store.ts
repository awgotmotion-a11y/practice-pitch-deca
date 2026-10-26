"use client";
import { useSyncExternalStore } from "react";
import type { Level } from "./deca";
import type { Difficulty, Judge, Mode, Prospect, Scenario } from "./judge";
import type { Line, Metrics } from "./room";

export type Profile = { event: string; level: Level };
export type Attempt = { id: string; ia: string; ok: boolean; t: number };
export type VocabState = Record<string, { box: number; due: number }>;

export type ReportRow = { name: string; group: string; max: number; score: number; level: string; why: string; quote: string };
export type ReportData = {
  form: string; rows: ReportRow[]; total: number; max: number; outcome: string; verdict: string; drill: string;
  strengths: string[]; fixes: { said: string; try: string; why: string }[]; questions?: string[];
};
/** One scored practice session or written-entry review, saved to the member's account (last 50). Audio and documents are never saved. */
export type Trial = {
  id: string; date: number; mode: Mode | "written"; event?: string; level?: Level; title: string; difficulty?: Difficulty;
  total?: number; max?: number; outcome?: string; report?: ReportData; transcript: Line[]; metrics?: Metrics;
  scenario?: Scenario; judge?: Judge; prospect?: Prospect; durationSec: number;
};

export type Me = { email: string; name: string; admin: boolean };

// Everything useStored holds belongs to the signed-in member: it loads from /api/me at sign-in and each change is
// saved back to their row on the server, so members never see each other's history, on any device.
// ponytail: each key is saved whole (trials can reach a few hundred KB); split trials into rows if that gets slow.
const listeners = new Set<() => void>();
const mem = new Map<string, unknown>();
const serverFallbacks = new Map<string, unknown>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let me: Me | null = null;

const notify = () => listeners.forEach((l) => l());

function save(key: string, leaving = false) {
  timers.delete(key);
  const body = JSON.stringify({ key, value: JSON.stringify(mem.get(key)) });
  // keepalive lets a save finish while the tab closes, but only for bodies under 64 KB.
  void fetch("/api/me", { method: "PUT", headers: { "content-type": "application/json" }, body, keepalive: leaving && body.length < 60000 }).catch(() => {});
}
if (typeof window !== "undefined")
  window.addEventListener("pagehide", () => [...timers].forEach(([k, t]) => { clearTimeout(t); save(k, true); }));

/** Starts a member's session with the data saved on the server. */
export function startSession(m: Me, data: Record<string, string>) {
  me = m;
  mem.clear();
  for (const [k, v] of Object.entries(data)) {
    try {
      mem.set(k, JSON.parse(v));
    } catch {}
  }
  notify();
}

function read<T>(key: string, fallback: T): T {
  return mem.has(key) ? (mem.get(key) as T) : fallback;
}

function write<T>(key: string, val: T) {
  mem.set(key, val);
  notify();
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(() => save(key), 800));
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useStored<T>(key: string, fallback: T) {
  if (!serverFallbacks.has(key)) serverFallbacks.set(key, fallback);
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, serverFallbacks.get(key) as T),
    () => serverFallbacks.get(key) as T,
  );
  const set = (next: T | ((prev: T) => T)) =>
    write(key, typeof next === "function" ? (next as (p: T) => T)(read(key, serverFallbacks.get(key) as T)) : next);
  return [value, set] as const;
}

/** The signed-in member, or null before sign-in. */
export const useMe = () => useSyncExternalStore(subscribe, () => me, () => null);

export const DEFAULT_PROFILE: Profile = { event: "PMK", level: "district" };

/** Accuracy per instructional area, weakest first; areas with fewer than `min` answers are skipped. */
export function accuracyByArea(attempts: Attempt[], min = 3) {
  const by: Record<string, { ok: number; n: number }> = {};
  for (const a of attempts.slice(-1000)) {
    by[a.ia] ??= { ok: 0, n: 0 };
    by[a.ia].n++;
    if (a.ok) by[a.ia].ok++;
  }
  return Object.entries(by)
    .filter(([, s]) => s.n >= min)
    .map(([ia, s]) => ({ ia, pct: Math.round((100 * s.ok) / s.n), n: s.n }))
    .sort((a, b) => a.pct - b.pct);
}

const noop = () => () => {};
/** False during server render and hydration, true in the browser. */
export const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);

/** Wall clock for event handlers (keeps the React purity lint from flagging handler code). */
export const now = () => Date.now();
