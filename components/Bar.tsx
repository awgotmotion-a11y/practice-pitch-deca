export function Bar({ pct, tone }: { pct: number; tone?: "accent" | "amber" }) {
  const color = tone === "accent" ? "bg-accent" : tone === "amber" ? "bg-amber" : pct >= 80 ? "bg-good" : pct >= 60 ? "bg-amber" : "bg-danger";
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}
