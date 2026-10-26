"use client";
import { useEffect, useRef, type ReactNode } from "react";
import type { Room } from "@/lib/room";

const CYAN = "#3FD8FF", AMBER = "#FFB547", LINE = "#16304A", PANEL = "#0A1220";

/** The judge orb: rings and arcs spin (fast while the judge thinks), the core follows the judge's voice, the outer ring follows your mic. */
export function Orb({ room }: { room?: Room | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const roomRef = useRef(room);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let size = 0, raf = 0, last = performance.now(), a1 = 0, a2 = 0, a3 = 0, a4 = 0;
    const fit = () => {
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      size = r.width;
      cv.width = cv.height = Math.round(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(() => { fit(); draw(performance.now()); });
    ro.observe(cv);
    const arc = (r: number, from: number, len: number, color: string, w: number) => {
      ctx.beginPath(); ctx.arc(size / 2, size / 2, r * size, from, from + len);
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.stroke();
    };
    function draw(now: number) {
      const rm = mq.matches, dt = Math.min(0.1, (now - last) / 1000); last = now;
      const rr = roomRef.current, v = rr?.view, lv = rr?.levels ?? { judge: 0, mic: 0 };
      const speed = rm ? 0 : v?.thinking ? 5 : rr ? 0.5 : 0.35;
      a1 += dt * speed; a2 -= dt * speed * 1.4; a3 += dt * speed * 2.2; a4 += dt * speed * 0.1;
      const c = size / 2, judge = rm ? 0 : lv.judge, mic = rm ? 0 : lv.mic;
      ctx.clearRect(0, 0, size, size);
      ctx.lineWidth = 1; ctx.strokeStyle = LINE; ctx.setLineDash([]);
      for (const r of [0.47, 0.38]) { ctx.beginPath(); ctx.arc(c, c, r * size, 0, 7); ctx.stroke(); }
      ctx.setLineDash([3, 7]); ctx.beginPath(); ctx.arc(c, c, 0.33 * size, a4, a4 + 6.2832); ctx.stroke(); ctx.setLineDash([]);
      arc(0.43, a1, 2.1, CYAN, 2); arc(0.35, a2, 1.3, AMBER, 2); arc(0.27, a3, 1.7, CYAN, 2);
      if (v?.myFloor) { ctx.globalAlpha = 0.45 + 0.55 * mic; arc(0.49, 0, 7, CYAN, 1 + mic * 5); ctx.globalAlpha = 1; }
      const core = (0.17 + judge * 0.05) * size;
      ctx.beginPath(); ctx.arc(c, c, core, 0, 7); ctx.fillStyle = PANEL; ctx.fill();
      ctx.beginPath(); ctx.arc(c, c, core * (0.35 + judge * 0.6), 0, 7); ctx.fillStyle = CYAN; ctx.globalAlpha = 0.18 + judge * 0.6; ctx.fill(); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(c, c, core, 0, 7); ctx.strokeStyle = CYAN; ctx.lineWidth = 1.5; ctx.stroke();
    }
    const loop = (now: number) => { draw(now); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="block aspect-square w-full" />;
}

export type Readout = { k: string; v: ReactNode; tone?: "amber" | "big" };
const cell = (r: Readout) => (
  <div className="mono text-xs leading-[1.7] text-muted">
    {r.k}
    <br />
    <span className={r.tone === "amber" ? "text-[26px] leading-none text-amber" : "text-sm text-foreground"}>{r.v}</span>
  </div>
);

/** Orb with four mono readouts: in the corners from sm up, in a 2x2 grid below on phones. */
export function OrbStage({ room, tl, tr, bl, br }: { room?: Room | null; tl: Readout; tr: Readout; bl: Readout; br: Readout }) {
  return (
    <div className="w-full">
      <div className="relative mx-auto w-full max-w-[460px] sm:py-2">
        <Orb room={room} />
        <div className="pointer-events-none absolute inset-0 hidden sm:block">
          <div className="absolute left-0 top-2">{cell(tl)}</div>
          <div className="absolute right-0 top-2 text-right">{cell(tr)}</div>
          <div className="absolute bottom-2 left-0">{cell(bl)}</div>
          <div className="absolute bottom-2 right-0 text-right">{cell(br)}</div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 sm:hidden">
        {[tl, tr, bl, br].map((r) => <div key={r.k}>{cell(r)}</div>)}
      </div>
    </div>
  );
}
