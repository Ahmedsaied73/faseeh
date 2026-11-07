// lib/richContent/scienceKeyboard.ts
// Custom MathLive virtual keyboard layout "Science" for high school science & math.
import { tRich } from "./i18n";

export interface ScienceKeycap {
  latex?: string;
  insert?: string;
  label?: string;
  tooltip?: string;
  class?: string;
  aside?: string;
  width?: number;
  variants?: (string | Partial<ScienceKeycap>)[];
  shift?: string | Partial<ScienceKeycap>;
  command?: string | string[];
}

export interface ScienceKeyboardLayout {
  id: string;
  label: string;
  labelClass?: string;
  tooltip: string;
  rows: (string | ScienceKeycap)[][];
}

/**
 * Returns the "Science" layout keycap definitions.
 */
export function getScienceKeyboardLayout(locale: "ar" | "en" = "ar"): ScienceKeyboardLayout {
  return {
    id: "science",
    label: tRich("rich.keyboardScience", locale),
    labelClass: "MLK__tex-math",
    tooltip: tRich("rich.keyboardScienceTooltip", locale),
    rows: [
      // Row 1: Structures & Calculus
      [
        { latex: "\\frac{#@}{#?}", label: "\\frac{\\Box}{\\Box}", class: "small", tooltip: "Fraction" },
        { latex: "\\sqrt{#0}", label: "\\sqrt{\\Box}", tooltip: "Square root" },
        { latex: "\\sqrt[#0]{#?}", label: "\\sqrt[n]{\\Box}", class: "small", tooltip: "n-th root" },
        { latex: "#@^{#?}", label: "\\Box^{\\Box}", tooltip: "Power" },
        { latex: "#@_{#?}", label: "\\Box_{\\Box}", tooltip: "Subscript" },
        { latex: "\\int_{#?}^{#?}", label: "\\int", class: "small", variants: ["\\int", "\\iint", "\\oint"], tooltip: "Definite integral" },
        { latex: "\\sum_{#?}^{#?}", label: "\\sum", class: "small", tooltip: "Summation" },
        { latex: "\\lim_{#?\\to #?}", label: "\\lim", class: "small", tooltip: "Limit" },
        { latex: "\\vec{#?}", label: "\\vec{v}", tooltip: "Vector" },
        { latex: "\\left(#0\\right)", label: "(\\Box)", tooltip: "Parentheses" },
        { latex: "\\left[#0\\right]", label: "[\\Box]", tooltip: "Square brackets" },
        { latex: "\\left|#0\\right|", label: "|\\Box|", tooltip: "Absolute value" },
      ],
      // Row 2: Greek letters
      [
        { latex: "\\pi", label: "\\pi" },
        { latex: "\\Delta", label: "\\Delta" },
        { latex: "\\theta", label: "\\theta" },
        { latex: "\\omega", label: "\\omega" },
        { latex: "\\alpha", label: "\\alpha" },
        { latex: "\\beta", label: "\\beta" },
        { latex: "\\lambda", label: "\\lambda" },
        { latex: "\\mu", label: "\\mu" },
        { latex: "\\rho", label: "\\rho" },
        { latex: "\\sigma", label: "\\sigma" },
        { latex: "\\phi", label: "\\phi", variants: ["\\varphi"] },
        "[backspace]",
      ],
      // Row 3: Operators & Relations
      [
        { latex: "\\pm", label: "\\pm" },
        { latex: "\\times", label: "\\times" },
        { latex: "\\cdot", label: "\\cdot" },
        { latex: "\\div", label: "\\div" },
        { latex: "\\neq", label: "\\neq" },
        { latex: "\\leq", label: "\\leq" },
        { latex: "\\geq", label: "\\geq" },
        { latex: "\\approx", label: "\\approx" },
        { latex: "\\to", label: "\\to" },
        { latex: "\\rightleftharpoons", label: "\\rightleftharpoons" },
        { latex: "\\infty", label: "\\infty" },
        { latex: "^{\\circ}", label: "^{\\circ}", tooltip: "Degree" },
      ],
      // Row 4: Controls, Equations & Navigation
      [
        "[undo]",
        "[redo]",
        "[separator-5]",
        { latex: "=", label: "=" },
        { latex: "+", label: "+" },
        { latex: "-", label: "-" },
        "[separator-5]",
        "[left]",
        "[right]",
      ],
    ],
  };
}

/**
 * Registers the Science keyboard into MathLive's virtual keyboard.
 * Safe to call multiple times (idempotent).
 */
export function registerScienceKeyboard(locale: "ar" | "en" = "ar"): void {
  if (typeof window === "undefined" || !window.mathVirtualKeyboard) return;

  const scienceLayout = getScienceKeyboardLayout(locale);
  // Place science layout at the start, followed by built-in layouts
  window.mathVirtualKeyboard.layouts = [
    scienceLayout as any,
    "numeric",
    "symbols",
    "alphabetic",
    "greek",
  ];
}
