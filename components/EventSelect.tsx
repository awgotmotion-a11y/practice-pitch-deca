import { EVENTS, type EventKind } from "@/lib/deca";

export const KIND_LABEL: Record<EventKind, string> = {
  principles: "Principles",
  series: "Series",
  tdm: "Team Decision Making",
  pfl: "Personal Financial Literacy",
  selling: "Professional Selling and Consulting",
  plan: "Business Plans",
};

/** Event dropdown grouped by event kind. `only` limits the choices. */
export function EventSelect({ id, value, onChange, only }: { id: string; value: string; onChange: (code: string) => void; only?: (k: EventKind) => boolean }) {
  return (
    <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      {(Object.keys(KIND_LABEL) as EventKind[]).filter((k) => !only || only(k)).map((k) => (
        <optgroup key={k} label={KIND_LABEL[k]}>
          {EVENTS.filter((e) => e.kind === k).map((e) => (
            <option key={e.code} value={e.code}>{e.name} ({e.code})</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
