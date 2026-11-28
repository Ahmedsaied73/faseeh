"use client";

import { useRef, type CSSProperties } from "react";
import { ACTIVE_SUBJECT } from "@/lib/subject-theme";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Hero stage with a glow, a slowly turning geometric ring and a few floating
 * "lesson fragments" that belong to the active subject.
 * Motion is transform/opacity only and is off under prefers-reduced-motion.
 */

const par = (d: number, extra: CSSProperties = {}): CSSProperties =>
  ({ "--d": d, ...extra }) as CSSProperties;

function Square({ size }: { size: number }) {
  const h = size / 2;
  return (
    <>
      <rect x={-h} y={-h} width={size} height={size} />
      <rect x={-h} y={-h} width={size} height={size} transform="rotate(45)" />
    </>
  );
}

function ArabicRing() {
  return (
    <svg viewBox="-200 -200 400 400" className="h-full w-full text-brand-primary" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
      <g className="subj-spin-slow" opacity="0.38"><Square size={300} /></g>
      <g className="subj-spin-rev" opacity="0.5"><Square size={220} /></g>
      <g className="subj-spin-slow" opacity="0.6"><Square size={140} /></g>
      <circle r="196" strokeDasharray="2 7" opacity="0.5" />
      <circle r="150" opacity="0.16" />
    </svg>
  );
}

function ChemRing() {
  return (
    <svg viewBox="-200 -200 400 400" className="h-full w-full text-brand-primary" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
      <g className="subj-spin-slow" opacity="0.5">
        {[0, 60, 120].map((a) => (
          <ellipse key={a} rx="190" ry="70" transform={"rotate(" + a + ")"} />
        ))}
      </g>
      <g className="subj-spin-rev" opacity="0.9" fill="var(--color-brand-accent)" stroke="none">
        <circle cx="190" cy="0" r="5" />
        <circle cx="-95" cy="-61" r="5" />
        <circle cx="-95" cy="61" r="5" />
      </g>
      <circle r="196" strokeDasharray="2 7" opacity="0.5" />
    </svg>
  );
}

function Pill({ children, tone = "primary" }: { children: React.ReactNode; tone?: "primary" | "accent" }) {
  return (
    <span
      className={
        "rounded-full px-2 py-0.5 text-[0.7rem] font-bold shadow-sm " +
        (tone === "accent" ? "bg-brand-accent/15 text-brand-accent" : "bg-brand-primary/15 text-brand-primary")
      }
    >
      {children}
    </span>
  );
}

function Float({
  className,
  depth,
  enter,
  drift = 0,
  children,
}: {
  className: string;
  depth: number;
  enter: number;
  drift?: number;
  children: React.ReactNode;
}) {
  return (
    <div className={"stage-par absolute z-20 " + className} style={par(depth)}>
      <div className="subj-tag-in" style={{ animationDelay: enter + "s" }}>
        <div className="stage-drift" style={{ animationDelay: drift + "s" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

const card =
  "rounded-xl border border-brand-border bg-brand-surface/80 p-2.5 shadow-lg backdrop-blur-md";

function ArabicFloaters() {
  return (
    <>
      {/* huge ghost letter: the "language of the Dad" */}
      <span
        aria-hidden="true"
        className="stage-par pointer-events-none absolute start-[6%] top-[4%] z-0 select-none text-[13rem] font-extrabold leading-none text-brand-primary/[0.06] sm:text-[17rem]"
        style={par(-8)}
      >
        ض
      </span>

      <Float className="start-[-2%] top-[0%] w-32 origin-top-right max-sm:scale-[0.68] sm:top-[6%] sm:w-36" depth={16} enter={0.5} drift={0}>
        <div className={card}>
          <p className="text-[0.7rem] font-semibold text-brand-muted">إعراب</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-brand-text">قَرَأَ</span>
            <span className="subj-tag-in" style={{ animationDelay: "1.1s" }}><Pill>فعل ماضٍ</Pill></span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-brand-text">الطَّالِبُ</span>
            <span className="subj-tag-in" style={{ animationDelay: "1.7s" }}><Pill tone="accent">فاعل</Pill></span>
          </div>
        </div>
      </Float>

      <Float className="end-[-2%] bottom-[0%] w-36 origin-bottom-left max-sm:scale-[0.68] sm:bottom-[16%] sm:w-40" depth={22} enter={1.0} drift={1.2}>
        <div className={card}>
          <p className="text-[0.7rem] font-semibold text-brand-muted">بلاغة · تشبيه</p>
          <div className="mt-2 flex items-start justify-between gap-1 text-center">
            {[
              ["العِلمُ", "مُشبَّه"],
              ["كَـ", "أداة"],
              ["النُّورِ", "مُشبَّه به"],
            ].map(([w, t], i) => (
              <div key={w} className="subj-tag-in flex-1" style={{ animationDelay: 1.6 + i * 0.35 + "s" }}>
                <p className="text-xs font-bold text-brand-text">{w}</p>
                <p className="mt-0.5 text-[0.65rem] text-brand-muted">{t}</p>
              </div>
            ))}
          </div>
          <svg viewBox="0 0 100 8" className="mt-1.5 h-2 w-full text-brand-accent" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M3 5 C 25 0, 45 8, 65 4 S 90 3, 97 4" pathLength={1} className="subj-draw" />
          </svg>
        </div>
      </Float>
    </>
  );
}

function ChemistryFloaters() {
  return (
    <>
      <span
        aria-hidden="true"
        className="stage-par pointer-events-none absolute start-[8%] top-[8%] z-0 select-none text-[11rem] font-extrabold leading-none text-brand-primary/10 sm:text-[14rem]"
        style={par(-8)}
      >
        Na
      </span>
      <Float className="start-[-2%] top-[0%] w-40 origin-top-right max-sm:scale-[0.68] sm:top-[6%] sm:w-40" depth={16} enter={0.5}>
        <div className={card + " font-mono"} dir="ltr">
          <p className="text-[0.7rem] text-brand-muted">balanced</p>
          <p className="mt-1.5 text-sm font-bold text-brand-text">2H₂ + O₂ → 2H₂O</p>
        </div>
      </Float>
      <Float className="end-[-2%] bottom-[0%] w-28 origin-bottom-left max-sm:scale-[0.68] sm:bottom-[16%] sm:w-36" depth={22} enter={1.0} drift={1.2}>
        <div className={card}>
          <p className="text-[0.7rem] text-brand-muted">pH</p>
          <p className="mt-1 text-lg font-extrabold text-brand-primary">7 <span className="text-xs font-bold text-brand-accent">متعادل</span></p>
        </div>
      </Float>
    </>
  );
}

function MathRing() {
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg viewBox="-200 -200 400 400" className="h-full w-full text-brand-primary" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
      <path d="M-196 0 H196 M0 -196 V196" opacity="0.18" />
      <circle r="196" strokeDasharray="2 7" opacity="0.5" />
      <circle r="150" opacity="0.3" />
      <circle r="96" opacity="0.14" />
      {ticks.map((a) => (
        <path key={a} d="M150 0 H162" transform={"rotate(" + a + ")"} opacity="0.55" />
      ))}
      <g className="subj-spin-slow" opacity="0.5"><Square size={212} /></g>
      <g className="subj-spin-rev" opacity="0.9">
        <path d="M0 0 H150" className="text-brand-accent" strokeWidth="1.6" />
        <circle cx="150" r="5" fill="var(--color-brand-accent)" stroke="none" />
      </g>
    </svg>
  );
}

function MathFloaters() {
  const reduced = useReducedMotion();
  return (
    <>
      <span
        aria-hidden="true"
        className="stage-par pointer-events-none absolute start-[10%] top-[4%] z-0 select-none text-[13rem] font-extrabold leading-none text-brand-primary/[0.06] sm:text-[17rem]"
        style={par(-8)}
      >
        π
      </span>

      <Float className="start-[-2%] top-[0%] w-36 origin-top-right max-sm:scale-[0.68] sm:top-[6%] sm:w-40" depth={16} enter={0.5}>
        <div className={card}>
          <p className="text-[0.7rem] font-semibold text-brand-muted">معادلة</p>
          <div className="mt-2 space-y-1 font-mono text-xs font-bold text-brand-text" dir="ltr">
            <p>x² − 5x + 6 = 0</p>
            <p className="stage-in" style={{ animationDelay: "1.1s" }}>(x − 2)(x − 3) = 0</p>
            <p className="stage-in text-brand-accent" style={{ animationDelay: "1.9s" }}>x = 2 , x = 3</p>
          </div>
        </div>
      </Float>

      <Float className="end-[-2%] bottom-[0%] w-36 origin-bottom-left max-sm:scale-[0.68] sm:bottom-[16%] sm:w-40" depth={22} enter={1.0} drift={1.2}>
        <div className={card}>
          <p className="text-[0.7rem] font-semibold text-brand-muted">دوال · y = x²</p>
          <svg viewBox="0 0 100 64" className="mt-1.5 w-full" fill="none" strokeLinecap="round" aria-hidden="true">
            <path d="M6 52 H94 M50 6 V58" className="text-brand-muted" stroke="currentColor" strokeWidth="1" opacity="0.6" />
            <path d="M20 6 Q50 100 80 6" pathLength={1} className="stage-draw text-brand-primary" stroke="currentColor" strokeWidth="2.2" />
            {!reduced && (
              <circle r="2.8" fill="var(--color-brand-accent)">
                <animateMotion dur="5s" repeatCount="indefinite" path="M20 6 Q50 100 80 6" />
              </circle>
            )}
          </svg>
        </div>
      </Float>
    </>
  );
}

export function TeacherStage() {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", String(((e.clientX - r.left) / r.width - 0.5) * 2));
    el.style.setProperty("--py", String(((e.clientY - r.top) / r.height - 0.5) * 2));
  }
  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--px", "0");
    el.style.setProperty("--py", "0");
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative aspect-square w-72 sm:w-96 lg:w-[27rem]"
    >
      {/* gradient glow behind the teacher */}
      <div aria-hidden="true" className="hero-glow absolute inset-[6%] z-0 rounded-full bg-[radial-gradient(circle_at_50%_38%,var(--color-brand-primary),transparent_68%)] opacity-30 blur-2xl" />
      <div aria-hidden="true" className="hero-glow absolute inset-x-[18%] bottom-[8%] top-[48%] z-0 rounded-full bg-[radial-gradient(circle,var(--color-brand-accent),transparent_70%)] opacity-20 blur-3xl" style={{ animationDelay: "1.5s" }} />

      {/* turning geometry */}
      <div aria-hidden="true" className="stage-par absolute inset-[2%] z-0" style={par(10)}>
        {ACTIVE_SUBJECT === "arabic" ? <ArabicRing /> : ACTIVE_SUBJECT === "math" ? <MathRing /> : <ChemRing />}
      </div>

      {ACTIVE_SUBJECT === "arabic" ? <ArabicFloaters /> : ACTIVE_SUBJECT === "math" ? <MathFloaters /> : <ChemistryFloaters />}
    </div>
  );
}
