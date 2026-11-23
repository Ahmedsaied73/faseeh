"use client";
import type { ReactNode } from "react";
import type { RichKey, RichT } from "./strings";

type Chip = { id: string; key: RichKey; glyph: ReactNode; latex: string; struct?: boolean };

const sup = (b: string, s: string) => (
  <span>
    {b}
    <sup style={{ fontSize: "0.62em" }}>{s}</sup>
  </span>
);
const SQRT = (
  <svg width="24" height="22" viewBox="0 0 24 22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12l3-1.5 3.5 8L14 3h8" />
  </svg>
);

const FRAC = (
  <span className="rs-g-frac" aria-hidden="true">
    <i />
    <b />
    <i />
  </span>
);

// "struct" chips build a structure with empty boxes (tinted); the others insert a symbol.
const GROUPS: Chip[][] = [
  [
    { id: "frac", key: "rich.sym.frac", glyph: FRAC, latex: "\\frac{#@}{#?}", struct: true },
    { id: "sqrt", key: "rich.sym.sqrt", glyph: SQRT, latex: "\\sqrt{#?}", struct: true },
    { id: "sq", key: "rich.sym.pow", glyph: sup("x", "2"), latex: "^{2}", struct: true },
    { id: "pow", key: "rich.sym.pow", glyph: <span>x<i className="rs-g-box" /></span>, latex: "^{#?}", struct: true },
    { id: "sub", key: "rich.sym.sub", glyph: <span>x<i className="rs-g-box rs-g-sub" /></span>, latex: "_{#?}", struct: true },
    { id: "paren", key: "rich.sym.paren", glyph: "( )", latex: "\\left(#?\\right)", struct: true },
  ],
  [
    { id: "times", key: "rich.sym.times", glyph: "×", latex: "\\times" },
    { id: "div", key: "rich.sym.div", glyph: "÷", latex: "\\div" },
    { id: "pm", key: "rich.sym.pm", glyph: "±", latex: "\\pm" },
    { id: "deg", key: "rich.sym.deg", glyph: "°", latex: "^{\\circ}" },
  ],
  [
    { id: "pi", key: "rich.sym.pi", glyph: "π", latex: "\\pi" },
    { id: "theta", key: "rich.sym.theta", glyph: "θ", latex: "\\theta" },
    { id: "delta", key: "rich.sym.delta", glyph: "Δ", latex: "\\Delta" },
    { id: "omega", key: "rich.sym.omega", glyph: "ω", latex: "\\omega" },
    { id: "alpha", key: "rich.sym.alpha", glyph: "α", latex: "\\alpha" },
  ],
  [
    { id: "le", key: "rich.sym.le", glyph: "≤", latex: "\\le" },
    { id: "ge", key: "rich.sym.ge", glyph: "≥", latex: "\\ge" },
    { id: "ne", key: "rich.sym.ne", glyph: "≠", latex: "\\ne" },
    { id: "approx", key: "rich.sym.approx", glyph: "≈", latex: "\\approx" },
    { id: "arrow", key: "rich.sym.arrow", glyph: "→", latex: "\\to" },
    { id: "inf", key: "rich.sym.inf", glyph: "∞", latex: "\\infty" },
  ],
  [
    { id: "int", key: "rich.sym.int", glyph: "∫", latex: "\\int_{#?}^{#?}#?\\,dx", struct: true },
    { id: "sum", key: "rich.sym.sum", glyph: "∑", latex: "\\sum_{#?}^{#?}#?", struct: true },
  ],
];

type Props = {
  t: RichT;
  bottom: number; // px above the bottom edge (OS keyboard height)
  onInsert: (latex: string) => void;
  onMove: (dir: "left" | "right") => void;
  onFull: () => void;
};

const Arrow = ({ dir }: { dir: "left" | "right" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {dir === "left" ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
  </svg>
);

export function SymbolTray({ t, bottom, onInsert, onMove, onFull }: Props) {
  // Pointer-down on any tray control must not steal focus from the equation field.
  const keep = (e: React.PointerEvent | React.MouseEvent) => e.preventDefault();
  return (
    <div
      className="rs-tray"
      role="toolbar"
      aria-label={t("rich.symbols")}
      style={{ ["--rs-inset" as string]: `${bottom}px`, ["--rs-safe" as string]: bottom > 0 ? "0px" : "env(safe-area-inset-bottom, 0px)" }}
      onPointerDown={keep}
      onMouseDown={keep}
    >
      <div className="rs-strip" dir="ltr">
        {GROUPS.map((g, gi) => (
          <div className="rs-group" key={gi}>
            {g.map((c) => (
              <button
                key={c.id}
                type="button"
                className={"rs-chip" + (c.struct ? " rs-chip--struct" : "")}
                aria-label={t(c.key)}
                title={t(c.key)}
                onClick={() => onInsert(c.latex)}
              >
                {c.glyph}
              </button>
            ))}
            {gi < GROUPS.length - 1 && <span className="rs-sep" aria-hidden="true" />}
          </div>
        ))}
      </div>
      <div className="rs-nav" dir="ltr">
        <button type="button" className="rs-chip rs-chip--nav" aria-label="←" onClick={() => onMove("left")}>
          <Arrow dir="left" />
        </button>
        <button type="button" className="rs-chip rs-chip--nav" aria-label="→" onClick={() => onMove("right")}>
          <Arrow dir="right" />
        </button>
        <button type="button" className="rs-chip rs-chip--all" aria-label={t("rich.allSymbols")} onClick={onFull}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
            <path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M7 14h10" />
          </svg>
          <span className="rs-all-label">{t("rich.allSymbols")}</span>
        </button>
      </div>
    </div>
  );
}
