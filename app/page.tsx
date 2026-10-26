"use client";
import Link from "next/link";
import { EVENTS, LEVELS, ITEMS, areasFor, eventByCode, isRoleplay, timing, type Level } from "@/lib/deca";
import { PI_COUNT } from "@/lib/forms";
import { useStored, DEFAULT_PROFILE, accuracyByArea, useHydrated, type Attempt, type Profile, type Trial } from "@/lib/store";
import { Bar } from "@/components/Bar";
import { EventSelect } from "@/components/EventSelect";
import { OrbStage } from "@/components/Orb";

const PTS = { principles: 12, series: 10, tdm: 10, pfl: 17 } as const;

function Row({ n, href, title, desc, time, tone }: { n: string; href: string; title: string; desc: string; time: string; tone: "accent" | "amber" }) {
  return (
    <Link href={href} className="row-link">
      <span className={`mono ${tone === "accent" ? "text-accent" : "text-amber"}`}>{n}</span>
      <span>
        <b className="block text-xl font-semibold">{title}</b>
        <span className="text-[15px] text-muted">{desc}</span>
      </span>
      <span className="mono text-xs text-soft">{time}</span>
    </Link>
  );
}

export default function Dashboard() {
  const [profile, setProfile] = useStored<Profile>("profile", DEFAULT_PROFILE);
  const [attempts] = useStored<Attempt[]>("attempts", []);
  const [trials] = useStored<Trial[]>("trials", []);
  const hydrated = useHydrated();
  const event = eventByCode(profile.event);
  const areas = areasFor(event.cluster);
  const acc = accuracyByArea(attempts).filter((a) => areas.includes(a.ia));
  const weak = acc.slice(0, 3).filter((a) => a.pct < 80);
  const overall = attempts.length ? Math.round((100 * attempts.filter((a) => a.ok).length) / attempts.length) : null;
  const bankSize = ITEMS.filter((i) => areas.includes(i.ia)).length;
  const t = timing(event);
  const roleplays = trials.filter((x) => x.mode === "roleplay").length;
  const levelLabel = LEVELS.find((l) => l.id === profile.level)?.label ?? "";
  const rpHref = event.kind === "selling" || event.kind === "plan" ? `/room?mode=${event.kind}` : "/roleplay";
  const form = isRoleplay(event) ? `${PI_COUNT[event.kind]} PIs × ${PTS[event.kind]} pts` : "15 min presentation form";

  return (
    <div className="flex flex-col gap-16 sm:gap-20">
      <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col gap-6">
          <h1 className="text-[clamp(40px,6.4vw,92px)] font-bold leading-[0.95] tracking-tight">
            Walk in having<br />already competed.
          </h1>
          <p className="max-w-[520px] text-[19px] leading-normal text-soft">
            A judge that talks back, the real 2026-27 scoring forms, and exams weighted to the blueprint for your event.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={rpHref} className="btn-primary !px-6 !py-4 !text-base">Start a role-play</Link>
            <Link href="/exam?mode=mock" className="btn !px-6 !py-4 !text-base">Take a mock exam</Link>
          </div>
        </div>
        <OrbStage
          tl={{ k: "EVENT", v: hydrated ? profile.event : "..." }}
          tr={{ k: "LEVEL", v: hydrated ? levelLabel : "..." }}
          bl={{ k: "ACCURACY", v: overall === null ? "no answers yet" : `${overall}%` }}
          br={{ k: "ROLE-PLAYS", v: String(roleplays) }}
        />
      </section>

      <section aria-label="Your event" className="rounded-xl border border-line">
        <div className="grid gap-4 p-5 sm:grid-cols-[2fr_1fr] sm:p-6">
          <div>
            <label className="label" htmlFor="event">Your event</label>
            <EventSelect id="event" value={profile.event} onChange={(code) => setProfile({ ...profile, event: code })} />
          </div>
          <div>
            <label className="label" htmlFor="level">Competition level</label>
            <select id="level" className="field" value={profile.level} onChange={(e) => setProfile({ ...profile, level: e.target.value as Level })}>
              {LEVELS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-b-xl border-t border-line bg-line sm:grid-cols-4">
          {[
            ["EXAM", `${event.cluster} · ${bankSize} Q in bank`],
            ["PREP", t.prep ? `${t.prep} min` : "Ahead of time"],
            ["PRESENT", `${t.present} min`],
            ["FORM", form],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1.5 bg-background p-5">
              <dt className="mono text-[11px] text-muted">{k}</dt>
              <dd className="text-[17px] font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid gap-12 lg:grid-cols-2 lg:gap-10">
        <div>
          <h2 className="mb-4 text-3xl font-semibold">Compete</h2>
          <Row n="01" tone="accent" href={rpHref} title="Role-play judge" desc={event.kind === "selling" || event.kind === "plan" ? "Your event has no role-play, so this opens the matching Pitch Room judge." : "A fresh scenario, prep time, then a judge who asks the questions."} time={t.prep ? `${t.prep} + ${t.present} MIN` : `${t.present} MIN`} />
          <Row n="02" tone="accent" href="/exam?mode=mock" title="Mock exam" desc="Questions drawn to match the blueprint for your cluster and level." time="100 Q" />
          <div className="border-b border-line"><Row n="03" tone="accent" href="/vocab" title="Vocab blitz" desc="Match terms to definitions against a 60 second clock." time="60 SEC" /></div>
        </div>
        <div>
          <h2 className="mb-4 text-3xl font-semibold">Pitch Room</h2>
          <Row n="04" tone="amber" href="/room?mode=plan" title="DECA Judge" desc="Present your business plan, then field a lender's questions." time="15 MIN" />
          <Row n="05" tone="amber" href="/room?mode=drill" title="Q&A Drill" desc="No presentation. Just hard questions about your plan." time="10 MIN" />
          <Row n="06" tone="amber" href="/room?mode=shark" title="Shark Tank" desc="Two minutes to pitch, then investors interrupt." time="8 MIN" />
          <Row n="07" tone="amber" href="/room?mode=cold" title="Cold call and Pro Selling" desc="Call a skeptical owner, or run a full sales meeting." time="5 OR 15 MIN" />
          <div className="border-b border-line"><Row n="08" tone="amber" href="/written" title="Written entry review" desc="Upload your written or pitch deck and get it scored on the official form." time="100 PTS" /></div>
        </div>
      </section>

      <section className="grid gap-12 lg:grid-cols-2 lg:gap-10">
        <div>
          <h2 className="mb-2 text-3xl font-semibold">Your next rep</h2>
          {weak.length ? (
            <>
              <p className="mb-5 text-muted">Your weakest areas for this cluster. Drill them, then run a role-play that tests them.</p>
              <ul className="mb-5 space-y-3">
                {weak.map((w) => (
                  <li key={w.ia} className="flex items-center gap-3 text-sm">
                    <span className="w-40 shrink-0 truncate sm:w-56">{w.ia}</span>
                    <Bar pct={w.pct} />
                    <span className="mono w-10 text-right">{w.pct}%</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Link className="btn-primary" href={`/exam?drill=${encodeURIComponent(weak.map((w) => w.ia).join("|"))}`}>Drill weak areas</Link>
                <Link className="btn" href={`/vocab?ia=${encodeURIComponent(weak[0].ia)}`}>{weak[0].ia} vocab</Link>
                <Link className="btn" href="/roleplay?focus=weak">Role-play targeting these</Link>
              </div>
            </>
          ) : (
            <>
              <p className="mb-5 text-muted">Take a mock exam so we can find your weak areas, or jump straight into a role-play.</p>
              <div className="flex flex-wrap gap-2">
                <Link className="btn-primary" href="/exam?mode=mock">Start mock exam</Link>
                <Link className="btn" href={rpHref}>Practice a role-play</Link>
              </div>
            </>
          )}
          {acc.length > 0 && (
            <div className="mt-10">
              <h3 className="mb-3 text-xl font-semibold">Accuracy by instructional area</h3>
              <ul className="space-y-3">
                {acc.map((a) => (
                  <li key={a.ia} className="flex items-center gap-3 text-sm">
                    <span className="w-40 shrink-0 truncate sm:w-56">{a.ia}</span>
                    <Bar pct={a.pct} />
                    <span className="mono w-16 text-right text-muted">{a.pct}% · {a.n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-3xl font-semibold">Recent trials</h2>
            <Link href="/history" className="text-sm">All trials</Link>
          </div>
          {hydrated && trials.length > 0 ? (
            <ul>
              {trials.slice(0, 5).map((x) => (
                <li key={x.id}>
                  <Link href={`/history?id=${x.id}`} className="flex min-h-11 items-center justify-between gap-4 border-t border-line py-3 text-foreground no-underline hover:bg-accent-soft hover:text-foreground">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{x.title}</span>
                      <span className="mono text-xs text-muted">{x.mode.toUpperCase()} · {new Date(x.date).toLocaleDateString()}</span>
                    </span>
                    <b className="mono tabular-nums">{x.total ?? "--"}/{x.max ?? 100}</b>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-t border-line pt-4 text-muted">No trials yet. Your scored sessions show up here.</p>
          )}
          <p className="mono mt-6 text-xs text-muted">{attempts.length} QUESTIONS ANSWERED · {EVENTS.length} EVENTS</p>
        </div>
      </section>
    </div>
  );
}
