"use client";

import { useRef, type CSSProperties } from "react";

/**
 * Hero teacher stage (standalone, Arabic).
 * The photo is a transparent cut-out. It sits on a soft gradient glow, a slowly
 * turning eight-point star, and two floating "lesson cards" (grammar + rhetoric).
 * Motion = transform/opacity only; fully off under prefers-reduced-motion.
 * Colors come only from the design tokens: brand-primary / accent / surface /
 * border / text / muted. No hex values.
 */

const par = (d: number): CSSProperties => ({ "--d": d }) as CSSProperties;

function Square({ size }: { size: number }) {
  const h = size / 2;
  return (
    <>
      <rect x={-h} y={-h} width={size} height={size} />
      <rect x={-h} y={-h} width={size} height={size} transform="rotate(45)" />
    </>
  );
}

function StarRing() {
  return (
    <svg viewBox="-200 -200 400 400" className="h-full w-full text-brand-primary" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
      <g className="stage-spin" opacity="0.38"><Square size={300} /></g>
      <g className="stage-spin-rev" opacity="0.5"><Square size={220} /></g>
      <g className="stage-spin" opacity="0.6"><Square size={140} /></g>
      <circle r="196" strokeDasharray="2 7" opacity="0.5" />
      <circle r="150" opacity="0.16" />
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

/** outer = position + mouse parallax, middle = entrance, inner = slow drift */
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
      <div className="stage-in" style={{ animationDelay: enter + "s" }}>
        <div className="stage-drift" style={{ animationDelay: drift + "s" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

const card =
  "rounded-xl border border-brand-border bg-brand-surface/80 p-2.5 shadow-lg backdrop-blur-md";

export function TeacherStage({ src, alt }: { src: string; alt: string }) {
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
      <div aria-hidden="true" className="stage-glow absolute inset-[6%] z-0 rounded-full bg-[radial-gradient(circle_at_50%_38%,var(--color-brand-primary),transparent_68%)] opacity-30 blur-2xl" />
      <div aria-hidden="true" className="stage-glow absolute inset-x-[18%] bottom-[8%] top-[48%] z-0 rounded-full bg-[radial-gradient(circle,var(--color-brand-accent),transparent_70%)] opacity-20 blur-3xl" style={{ animationDelay: "1.5s" }} />

      {/* turning eight-point star */}
      <div aria-hidden="true" className="stage-par absolute inset-[2%] z-0" style={par(10)}>
        <StarRing />
      </div>

      {/* huge ghost letter: the "language of the Dad" */}
      <span
        aria-hidden="true"
        className="stage-par pointer-events-none absolute start-[6%] top-[4%] z-0 select-none text-[13rem] font-extrabold leading-none text-brand-primary/[0.06] sm:text-[17rem]"
        style={par(-8)}
      >
        ض
      </span>

      {/* card 1: i'rab */}
      <Float className="start-[-2%] top-[0%] w-32 origin-top-right max-sm:scale-[0.68] sm:top-[6%] sm:w-36" depth={16} enter={0.5}>
        <div className={card}>
          <p className="text-[0.7rem] font-semibold text-brand-muted">إعراب</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-brand-text">قَرَأَ</span>
            <span className="stage-in" style={{ animationDelay: "1.1s" }}><Pill>فعل ماضٍ</Pill></span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-brand-text">الطَّالِبُ</span>
            <span className="stage-in" style={{ animationDelay: "1.7s" }}><Pill tone="accent">فاعل</Pill></span>
          </div>
        </div>
      </Float>

      {/* card 2: rhetoric (simile) */}
      <Float className="end-[-2%] bottom-[0%] w-36 origin-bottom-left max-sm:scale-[0.68] sm:bottom-[16%] sm:w-40" depth={22} enter={1.0} drift={1.2}>
        <div className={card}>
          <p className="text-[0.7rem] font-semibold text-brand-muted">بلاغة · تشبيه</p>
          <div className="mt-2 flex items-start justify-between gap-1 text-center">
            {[
              ["العِلمُ", "مُشبَّه"],
              ["كَـ", "أداة"],
              ["النُّورِ", "مُشبَّه به"],
            ].map(([w, t], i) => (
              <div key={w} className="stage-in flex-1" style={{ animationDelay: 1.6 + i * 0.35 + "s" }}>
                <p className="text-xs font-bold text-brand-text">{w}</p>
                <p className="mt-0.5 text-[0.65rem] text-brand-muted">{t}</p>
              </div>
            ))}
          </div>
          <svg viewBox="0 0 100 8" className="mt-1.5 h-2 w-full text-brand-accent" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M3 5 C 25 0, 45 8, 65 4 S 90 3, 97 4" pathLength={1} className="stage-draw" />
          </svg>
        </div>
      </Float>

      {/* the teacher: transparent cut-out, body fades into the page */}
      <div className="stage-par absolute inset-x-[16%] bottom-0 top-[8%] z-10" style={par(-5)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          width={900}
          height={900}
          decoding="async"
          fetchPriority="high"
          className="h-full w-full object-contain object-bottom drop-shadow-[0_18px_30px_rgba(0,0,0,0.25)]"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, #000 80%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, #000 80%, transparent 100%)",
          }}
        />
      </div>
    </div>
  );
}
