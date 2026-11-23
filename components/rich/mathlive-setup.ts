// One-time MathLive configuration. Browser only: call from useEffect / event handlers.
// MathLive is imported dynamically so it never lands in routes that don't render a math field.
import type { MathfieldElement } from "mathlive";
import { KEYBOARD_LAYOUTS } from "./keyboards";

let loading: Promise<typeof import("mathlive")> | null = null;

// Keep only shortcuts that cannot collide with ordinary variable names or Arabic/English words.
// (MathLive's default list turns words like "in", "to", "all" into symbols, which surprises students.)
export const SAFE_INLINE_SHORTCUTS: Record<string, string> = {
  "/": "\\frac{#@}{#?}",
  "sqrt": "\\sqrt{#0}",
  "pi": "\\pi",
  "theta": "\\theta",
  "alpha": "\\alpha",
  "beta": "\\beta",
  "gamma": "\\gamma",
  "delta": "\\delta",
  "Delta": "\\Delta",
  "omega": "\\omega",
  "Omega": "\\Omega",
  "lambda": "\\lambda",
  "rho": "\\rho",
  "sigma": "\\sigma",
  "phi": "\\phi",
  "infty": "\\infty",
  "<=": "\\le",
  ">=": "\\ge",
  "!=": "\\ne",
  "->": "\\to",
  "+-": "\\pm",
  "*": "\\cdot",
  "sin": "\\sin",
  "cos": "\\cos",
  "tan": "\\tan",
  "log": "\\log",
  "ln": "\\ln",
  "'": "^{\\prime}",
  "''": "^{\\prime\\prime}",
  "'''": "^{\\prime\\prime\\prime}",
};

export function loadMathlive() {
  if (!loading) {
    loading = import("mathlive").then((m) => {
      // Self-hosted fonts (copy node_modules/mathlive/fonts to /public/mathlive/fonts). No CDN at runtime.
      const override = (window as unknown as { __MATHLIVE_FONTS__?: string | null }).__MATHLIVE_FONTS__;
      m.MathfieldElement.fontsDirectory = override === undefined ? "/mathlive/fonts" : override;
      m.MathfieldElement.soundsDirectory = null;
      if (typeof window !== "undefined" && window.mathVirtualKeyboard) {
        window.mathVirtualKeyboard.layouts = [...KEYBOARD_LAYOUTS];
      }
      return m;
    });
  }
  return loading;
}

export function configureField(mf: MathfieldElement) {
  mf.mathVirtualKeyboardPolicy = "manual";
  mf.smartMode = false;
  mf.defaultMode = "math";
  mf.inlineShortcuts = SAFE_INLINE_SHORTCUTS;
  mf.setAttribute("dir", "ltr");
}
