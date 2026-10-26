"use client";
import { useSyncExternalStore } from "react";
import type { Level } from "./deca";
import type { Difficulty, Judge, Mode, Prospect, Scenario } from "./judge";
import type { Line, Metrics } from "./room";

// ponytail: progress lives in this browser only; move to a DB (Supabase) when accounts/advisor dashboards land.

export type Profile = { event: string; level: Level };
export type Attempt = { id: string; ia: string; ok: boolean; t: number };
export type VocabState = Record<string, { box: number; due: number }>;

export type ReportRow = { name: string; group: string; max: number; score: number; level: string; why: string; quote: string };
export type ReportData = {
  form: string; rows: ReportRow[]; total: number; max: number; outcome: string; verdict: string; drill: string;
  strengths: string[]; fixes: { said: string; try: string; why: string }[];
};
/** One scored practice session, saved in this browser (last 50). Audio is never saved. */
export type Trial = {
  id: string; date: number; mode: Mode; event?: string; level?: Level; title: string; difficulty: Difficulty;
  total?: number; max?: number; outcome?: string; report?: ReportData; transcript: Line[]; metrics: Metrics;
  scenario?: Scenario; judge?: Judge; prospect?: Prospect; durationSec: number;
};

const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; val: unknown }>();
const serverFallbacks = new Map<string, unknown>();

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function read<T>(key: string, fallback: T): T {
  const raw = safeGet(key);
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.val as T;
  let val: T = fallback;
  try {
    if (raw) val = JSON.parse(raw);
  } catch {}
  cache.set(key, { raw, val });
  return val;
}

function write<T>(key: string, val: T) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
  cache.delete(key);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  window.addEventListener("storage", l);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", l);
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
/** False during server render and hydration, true once browser storage is readable. */
export const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);

/** Wall clock for event handlers (keeps the React purity lint from flagging handler code). */
export const now = () => Date.now();
