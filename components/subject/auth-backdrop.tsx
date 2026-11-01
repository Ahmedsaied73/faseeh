import type { CSSProperties } from "react";

/**
 * Soft grey backdrop for the white side of login / register.
 * Layers (back to front): grey tint gradient, faint "#" lattice that fades out
 * behind the form, two slow blobs, and a few larger "#" marks that draw
 * themselves and drift. Transform / opacity / stroke-dashoffset only.
 * Colors come from tokens, so dark mode works with no extra code.
 */

type Mark = {
  left?: string; right?: string; top?: string; bottom?: string;
  size: number; rot: number; delay: number; tone: "muted" | "primary" | "accent";
};

const MARKS: Mark[] = [
  { left: "6%", top: "7%", size: 64, rot: -8, delay: 0, tone: "muted" },
  { right: "8%", top: "10%", size: 40, rot: 10, delay: 1.2, tone: "primary" },
  { left: "14%", top: "34%", size: 30, rot: 6, delay: 2.4, tone: "muted" },
  { right: "5%", top: "38%", size: 72, rot: -12, delay: 0.6, tone: "muted" },
  { left: "4%", bottom: "26%", size: 46, rot: 12, delay: 3.1, tone: "accent" },
  { right: "14%", bottom: "20%", size: 34, rot: -6, delay: 1.8, tone: "muted" },
  { left: "20%", bottom: "6%", size: 70, rot: 4, delay: 2.9, tone: "muted" },
  { right: "6%", bottom: "5%", size: 44, rot: -10, delay: 0.3, tone: "primary" },
  { left: "44%", top: "3%", size: 26, rot: 9, delay: 3.6, tone: "muted" },
  { left: "52%", bottom: "2%", size: 28, rot: -9, delay: 1.5, tone: "muted" },
];

const toneClass = {
  muted: "text-brand-muted-strong",
  primary: "text-brand-primary",
  accent: "text-brand-accent",
};

function Hash({ m }: { m: Mark }) {
  const style: CSSProperties = {
    left: m.left, right: m.right, top: m.top, bottom: m.bottom,
    width: m.size, height: m.size,
    ["--rot" as string]: m.rot + "deg",
    animationDelay: m.delay + "s",
  };
  return (
    <svg
      viewBox="0 0 40 40"
      className={"bk-mark absolute " + toneClass[m.tone]}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {/* slightly slanted "#" so it reads hand-set, not like a UI icon */}
      <path d="M15 5 L12.5 35" pathLength={1} className="bk-trace" style={{ animationDelay: m.delay + "s" }} />
      <path d="M27.5 5 L25 35" pathLength={1} className="bk-trace" style={{ animationDelay: m.delay + 0.25 + "s" }} />
      <path d="M5 15 L35 14" pathLength={1} className="bk-trace" style={{ animationDelay: m.delay + 0.5 + "s" }} />
      <path d="M5 26.5 L35 25.5" pathLength={1} className="bk-trace" style={{ animationDelay: m.delay + 0.75 + "s" }} />
    </svg>
  );
}

export function AuthBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[linear-gradient(165deg,var(--color-brand-bg)_0%,color-mix(in_oklab,var(--color-brand-muted)_14%,var(--color-brand-bg))_100%)]">
      {/* faint lattice, hidden behind the form so inputs stay clean */}
      <div className="bk-fade absolute inset-0">
        <div className="bk-lattice absolute inset-0" />
      </div>

      {/* slow grey / blue blobs */}
      <div className="bk-blob absolute -start-24 top-[18%] h-72 w-72 rounded-full bg-brand-muted/25 blur-3xl" />
      <div className="bk-blob absolute -end-20 bottom-[8%] h-80 w-80 rounded-full bg-brand-primary/10 blur-3xl" style={{ animationDelay: "-6s" }} />

      {MARKS.map((m, i) => (
        <Hash key={i} m={m} />
      ))}
    </div>
  );
}
