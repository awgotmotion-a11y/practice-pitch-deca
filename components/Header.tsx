"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LEVELS } from "@/lib/deca";
import { DEFAULT_PROFILE, useHydrated, useStored, type Profile } from "@/lib/store";

const NAV = [
  ["/", "Dashboard"],
  ["/exam", "Exams"],
  ["/vocab", "Vocab"],
  ["/roleplay", "Role-play"],
  ["/room", "Pitch Room"],
  ["/written", "Writtens"],
  ["/history", "History"],
] as const;

export function Header() {
  const path = usePathname();
  const [profile] = useStored<Profile>("profile", DEFAULT_PROFILE);
  const hydrated = useHydrated();
  const [pct, setPct] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/ai", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { used: number; cap: number }) => setPct(Math.min(100, Math.round((100 * d.used) / d.cap))))
      .catch(() => {});
  }, []);
  const level = LEVELS.find((l) => l.id === profile.level)?.label.split(" ")[0].toUpperCase();
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line py-5">
      <Link href="/" className="flex min-h-11 items-center gap-3 text-foreground no-underline hover:text-foreground">
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
          <circle cx="14" cy="14" r="12" fill="none" stroke="#3FD8FF" strokeWidth="1.5" />
          <circle cx="14" cy="14" r="6" fill="none" stroke="#FFB547" strokeWidth="1.5" />
          <circle cx="14" cy="14" r="2" fill="#3FD8FF" />
        </svg>
        <span className="text-[15px] font-bold tracking-[0.24em]">PITCHPREP</span>
      </Link>
      <div className="mono flex items-center gap-3 text-xs text-muted sm:order-3">
        <Link href="/" className="inline-flex min-h-11 items-center rounded-md border border-amber px-3 text-amber no-underline hover:text-amber" aria-label="Your event, change on dashboard">
          {hydrated ? `${profile.event} · ${level}` : "EVENT"}
        </Link>
        <span>AI TODAY <b className="text-foreground">{pct === null ? "--" : `${pct}%`}</b></span>
      </div>
      <nav aria-label="Main" className="flex w-full flex-wrap gap-1 rounded-3xl border border-line p-1 sm:order-2 sm:w-auto sm:rounded-full">
        {NAV.map(([href, label]) => {
          const on = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm no-underline ${on ? "bg-accent font-semibold text-background hover:text-background" : "text-[#c4d4e6] hover:text-foreground"}`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
