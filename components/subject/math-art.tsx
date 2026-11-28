"use client";

import { useReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Math pack art: login = unit circle that draws the sine wave, register =
 * Fibonacci squares + golden spiral, 404 = the graph of 1/x with a point that
 * never reaches x = 0. SVG + SMIL / CSS only; static under reduced motion.
 */

const SYMBOLS = ["π", "∑", "√", "∫", "∞", "θ", "Δ", "≈", "x²", "±", "÷", "%"];
const SIZES = ["text-xl", "text-2xl", "text-3xl"];

function floaters(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    glyph: SYMBOLS[i % SYMBOLS.length],
    left: ((i * 37 + 8) % 88) + 4,
    top: ((i * 53 + 5) % 82) + 6,
    delay: (i % 8) * 0.55,
    duration: 5 + (i % 5),
    size: SIZES[i % 3],
  }));
}

function samples(fn: (t: number) => number, n = 48) {
  return Array.from({ length: n + 1 }, (_, i) => fn(i / n).toFixed(2)).join(";");
}

/* ---------- login: unit circle -> sine wave ---------- */
function UnitCircleWave({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();
  const cx = 80, cy = 115, r = 58, x0 = 170, W = 210, dur = "6s";
  const wavePts = Array.from({ length: 85 }, (_, i) => {
    const t = i / 84;
    return `${i ? "L" : "M"}${(x0 + W * t).toFixed(1)} ${(cy - r * Math.sin(2 * Math.PI * t)).toFixed(1)}`;
  }).join(" ");
  const tipX = samples((t) => cx + r * Math.cos(2 * Math.PI * t));
  const tipY = samples((t) => cy - r * Math.sin(2 * Math.PI * t));
  const waveX = samples((t) => x0 + W * t);
  return (
    <svg viewBox="0 0 400 230" className={className} fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true">
      {/* axes */}
      <g className="text-white" strokeWidth="1" opacity="0.3">
        <path d={`M20 ${cy} H392`} />
        <path d={`M${cx} 40 V190`} />
        <path d={`M${x0} 52 V178`} strokeDasharray="2 5" />
      </g>
      <circle cx={cx} cy={cy} r={r} className="text-white" strokeWidth="1.4" opacity="0.5" />
      {/* faint full wave, then the traced one */}
      <path d={wavePts} className="text-white" strokeWidth="1.2" opacity="0.18" />
      <path d={wavePts} pathLength={1} className="text-brand-primary" strokeWidth="2.6" strokeDasharray="1" strokeDashoffset={reduced ? 0 : 1}>
        {!reduced && <animate attributeName="stroke-dashoffset" from="1" to="0" dur={dur} repeatCount="indefinite" />}
      </path>
      {!reduced && (
        <>
          <g>
            <line x1={cx} y1={cy} x2={cx + r} y2={cy} className="text-brand-accent" strokeWidth="2.4" />
            <circle cx={cx + r} cy={cy} r="5" fill="currentColor" stroke="none" className="text-brand-accent" />
            <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`-360 ${cx} ${cy}`} dur={dur} repeatCount="indefinite" />
          </g>
          <line className="text-brand-accent" strokeWidth="1.2" strokeDasharray="3 4" opacity="0.8">
            <animate attributeName="x1" values={tipX} dur={dur} repeatCount="indefinite" />
            <animate attributeName="y1" values={tipY} dur={dur} repeatCount="indefinite" />
            <animate attributeName="x2" values={waveX} dur={dur} repeatCount="indefinite" />
            <animate attributeName="y2" values={tipY} dur={dur} repeatCount="indefinite" />
          </line>
          <circle r="5" fill="currentColor" stroke="none" className="text-white">
            <animate attributeName="cx" values={waveX} dur={dur} repeatCount="indefinite" />
            <animate attributeName="cy" values={tipY} dur={dur} repeatCount="indefinite" />
          </circle>
        </>
      )}
      {reduced && <circle cx={cx + r} cy={cy} r="5" fill="currentColor" stroke="none" className="text-brand-accent" />}
      <text x="352" y="44" fontSize="13" fill="currentColor" stroke="none" className="text-white" opacity="0.6" fontFamily="monospace">y = sin θ</text>
    </svg>
  );
}

/* ---------- register: Fibonacci squares + golden spiral ---------- */
const FIB = [
  { x: 0, y: 0, s: 1, arc: "M0 1 A1 1 0 0 1 1 0" },
  { x: 1, y: 0, s: 1, arc: "M1 0 A1 1 0 0 1 2 1" },
  { x: 0, y: 1, s: 2, arc: "M2 1 A2 2 0 0 1 0 3" },
  { x: -3, y: 0, s: 3, arc: "M0 3 A3 3 0 0 1 -3 0" },
  { x: -3, y: -5, s: 5, arc: "M-3 0 A5 5 0 0 1 2 -5" },
  { x: 2, y: -5, s: 8, arc: "M2 -5 A8 8 0 0 1 10 3" },
];

function Fibonacci({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="-3.3 -5.3 13.6 8.6" className={className} fill="none" aria-hidden="true">
      {FIB.map((f, i) => (
        <g key={i}>
          <rect
            x={f.x} y={f.y} width={f.s} height={f.s}
            className="mth-seq text-white"
            stroke="currentColor" strokeWidth="0.05" opacity="0.45"
            fill={i % 2 ? "var(--color-brand-primary)" : "none"} fillOpacity="0.14"
            style={{ animationDelay: i * 0.9 + "s" }}
          />
          <text
            x={f.x + f.s / 2} y={f.y + f.s / 2 + f.s * 0.13}
            textAnchor="middle" fontSize={Math.max(0.5, f.s * 0.4)} fill="currentColor"
            className="mth-seq text-white" opacity="0.55" fontFamily="monospace" stroke="none"
            style={{ animationDelay: i * 0.9 + 0.3 + "s" }}
          >
            {[1, 1, 2, 3, 5, 8][i]}
          </text>
        </g>
      ))}
      {FIB.map((f, i) => (
        <path
          key={"a" + i} d={f.arc} pathLength={1}
          className="mth-arc text-brand-accent" stroke="currentColor" strokeWidth="0.11" strokeLinecap="round"
          style={{ animationDelay: i * 0.9 + 0.2 + "s" }}
        />
      ))}
    </svg>
  );
}

export function MathAuthArt({ variant, compact = false }: { variant: "login" | "register"; compact?: boolean }) {
  const items = floaters(compact ? 10 : 16);
  const chips = ["١", "١", "٢", "٣", "٥"];
  return (
    <div className="relative h-full w-full overflow-hidden" aria-hidden="true">
      <div className="mth-grid absolute inset-0" />
      {items.map((it, i) => (
        <span
          key={i}
          className={"subj-float absolute font-bold text-white/60 " + it.size}
          style={{ left: `${it.left}%`, top: `${it.top}%`, animationDelay: `${it.delay}s`, animationDuration: `${it.duration}s` }}
        >
          {it.glyph}
        </span>
      ))}

      <div className={"absolute inset-0 flex items-center justify-center " + (compact ? "flex-row gap-3 px-3" : "flex-col gap-3")}>
        {variant === "login" ? (
          <>
            <div className="flex flex-col items-center rounded-2xl bg-brand-ink/60 px-7 py-3 backdrop-blur-sm">
              <p className={"font-extrabold text-white " + (compact ? "text-3xl" : "text-5xl")}>أهلًا</p>
            </div>
            <UnitCircleWave className={compact ? "h-24 w-auto" : "w-[22rem] max-w-full"} />
          </>
        ) : (
          <>
            <Fibonacci className={compact ? "h-28 w-auto" : "w-[21rem] max-w-full"} />
            <div className="flex flex-col items-center rounded-2xl bg-brand-ink/60 px-7 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-1.5">
                {chips.map((c, i) => (
                  <span
                    key={i}
                    className={
                      "subj-rise grid place-items-center rounded-lg border border-white/30 bg-white/10 font-bold text-white " +
                      (compact ? "h-7 w-7 text-base" : "h-9 w-9 text-xl")
                    }
                    style={{ animationDelay: `${i * 0.35}s` }}
                  >
                    {c}
                  </span>
                ))}
              </div>
              <p className={"mt-2 font-extrabold text-white " + (compact ? "text-xl" : "text-4xl")}>ابدأ</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- 404: f(x) = 1/x, and a point that never reaches x = 0 ---------- */
export function MathNotFoundArt() {
  const reduced = useReducedMotion();
  const ox = 210, oy = 110, kx = 60, ky = 40;
  const branch = (from: number, to: number, n = 60) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const x = from + ((to - from) * i) / n;
      return `${i ? "L" : "M"}${(ox + kx * x).toFixed(1)} ${(oy - ky / x).toFixed(1)}`;
    }).join(" ");
  // x goes 3 -> 0.28 on a log scale, so the point slows then rockets up the asymptote
  const xs = Array.from({ length: 41 }, (_, i) => 3 * Math.pow(0.28 / 3, i / 40));
  const px = xs.map((x) => (ox + kx * x).toFixed(1)).join(";");
  const py = xs.map((x) => (oy - ky / x).toFixed(1)).join(";");
  return (
    <div className="relative mx-auto w-full max-w-md py-4" aria-hidden="true">
      <svg viewBox="0 0 420 220" className="w-full" fill="none" strokeLinecap="round">
        <defs>
          <clipPath id="mth-404-clip"><rect x="0" y="0" width="420" height="220" /></clipPath>
        </defs>
        <g className="text-brand-muted" strokeWidth="1.2" opacity="0.5">
          <path d={`M14 ${oy} H406`} />
          <path d={`M${ox} 8 V212`} />
        </g>
        {[-3, -2, -1, 1, 2, 3].map((t) => (
          <path key={t} d={`M${ox + kx * t} ${oy - 3} v6`} className="text-brand-muted" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        ))}
        {/* x = 0 is not in the domain */}
        <path d={`M${ox} 8 V212`} className="text-brand-accent" stroke="currentColor" strokeWidth="1.6" strokeDasharray="4 6" opacity="0.8" />
        <g clipPath="url(#mth-404-clip)" className="text-brand-primary" stroke="currentColor" strokeWidth="2.6">
          <path d={branch(0.27, 3.3)} />
          <path d={branch(-3.3, -0.27)} />
        </g>
        {!reduced ? (
          <circle r="5.5" fill="currentColor" className="text-brand-accent">
            <animate attributeName="cx" values={px} dur="4.5s" repeatCount="indefinite" />
            <animate attributeName="cy" values={py} dur="4.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;1;1;0" keyTimes="0;0.08;0.7;0.92;1" dur="4.5s" repeatCount="indefinite" />
          </circle>
        ) : (
          <circle cx={ox + kx * 1.2} cy={oy - ky / 1.2} r="5.5" fill="currentColor" className="text-brand-accent" />
        )}
        <text x={ox + 8} y="22" fontSize="12" fill="currentColor" className="text-brand-accent" fontFamily="monospace">x = 0</text>
        <text x="352" y="196" fontSize="13" fill="currentColor" className="text-brand-muted" fontFamily="monospace">f(x) = 1/x</text>
      </svg>
      <div className="pointer-events-none absolute left-[22%] top-3 sm:top-5">
        <span className="subj-wander rounded-lg border border-dashed border-brand-accent/60 bg-brand-bg/80 px-3 py-0.5 text-2xl font-extrabold text-brand-accent backdrop-blur-sm sm:text-4xl">
          ٤٠٤
        </span>
      </div>
    </div>
  );
}
