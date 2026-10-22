"use client";
import Link from "next/link";
import { EVENTS, LEVELS, ITEMS, areasFor, eventByCode, type Level } from "@/lib/deca";
import { useStored, DEFAULT_PROFILE, accuracyByArea, type Attempt, type Profile, type Session } from "@/lib/store";
import { Bar } from "@/components/Bar";

export default function Dashboard() {
  const [profile, setProfile] = useStored<Profile>("profile", DEFAULT_PROFILE);
  const [attempts] = useStored<Attempt[]>("attempts", []);
  const [sessions] = useStored<Session[]>("sessions", []);
  const event = eventByCode(profile.event);
  const areas = areasFor(event.cluster);
  const acc = accuracyByArea(attempts).filter((a) => areas.includes(a.ia));
  const weak = acc.slice(0, 3).filter((a) => a.pct < 80);
  const overall = attempts.length ? Math.round((100 * attempts.filter((a) => a.ok).length) / attempts.length) : null;
  const bankSize = ITEMS.filter((i) => areas.includes(i.ia)).length;

  return (
    <div className="space-y-6">
      <section className="card grid gap-4 sm:grid-cols-[2fr_1fr]">
        <div>
          <label className="label" htmlFor="event">Your event</label>
          <select id="event" className="field" value={profile.event} onChange={(e) => setProfile({ ...profile, event: e.target.value })}>
            {EVENTS.map((e) => (
              <option key={e.code} value={e.code}>{e.name} ({e.code})</option>
            ))}
          </select>
          <p className="mt-2 text-sm text-muted">Exam cluster: <b className="text-foreground">{event.cluster}</b> · {bankSize} questions in bank</p>
        </div>
        <div>
          <label className="label" htmlFor="level">Competition level</label>
          <select id="level" className="field" value={profile.level} onChange={(e) => setProfile({ ...profile, level: e.target.value as Level })}>
            {LEVELS.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Questions answered" value={attempts.length} />
        <Stat label="Overall accuracy" value={overall === null ? "—" : `${overall}%`} />
        <Stat label="Role-plays completed" value={sessions.length} />
      </section>

      <section className="card">
        <h2 className="mb-1 font-semibold">Your next rep</h2>
        {weak.length ? (
          <>
            <p className="mb-4 text-sm text-muted">Your weakest areas for this cluster. Drill them, then run a role-play that tests them.</p>
            <ul className="mb-4 space-y-2">
              {weak.map((w) => (
                <li key={w.ia} className="flex items-center gap-3 text-sm">
                  <span className="w-56 truncate">{w.ia}</span>
                  <Bar pct={w.pct} />
                  <span className="w-10 text-right tabular-nums">{w.pct}%</span>
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
            <p className="mb-4 text-sm text-muted">Take a mock exam so we can find your weak areas, or jump straight into a role-play.</p>
            <div className="flex flex-wrap gap-2">
              <Link className="btn-primary" href="/exam?mode=mock">Start mock exam</Link>
              <Link className="btn" href="/roleplay">Practice a role-play</Link>
            </div>
          </>
        )}
      </section>

      {acc.length > 0 && (
        <section className="card">
          <h2 className="mb-3 font-semibold">Accuracy by instructional area</h2>
          <ul className="space-y-2">
            {acc.map((a) => (
              <li key={a.ia} className="flex items-center gap-3 text-sm">
                <span className="w-56 truncate">{a.ia}</span>
                <Bar pct={a.pct} />
                <span className="w-24 text-right tabular-nums text-muted">{a.pct}% · {a.n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sessions.length > 0 && (
        <section className="card">
          <h2 className="mb-3 font-semibold">Recent role-plays</h2>
          <ul className="divide-y divide-line text-sm">
            {sessions.slice(-5).reverse().map((s) => (
              <li key={s.date} className="flex justify-between py-2">
                <span>{s.scenario.title} <span className="text-muted">· {s.event} · {new Date(s.date).toLocaleDateString()}</span></span>
                <b className="tabular-nums">{s.total}/100</b>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className="text-3xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
