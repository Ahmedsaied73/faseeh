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
 * Cleaned of all raw unrendered LaTeX markup so MathLive properly renders
 * all mathematical symbols with full typography.
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
        { latex: "\\frac{#@}{#?}", class: "small", tooltip: "Fraction" },
        { latex: "\\sqrt{#0}", tooltip: "Square root" },
        { latex: "\\sqrt[#0]{#?}", class: "small", tooltip: "n-th root" },
        { latex: "#@^{#?}", tooltip: "Power" },
        { latex: "#@_{#?}", tooltip: "Subscript" },
        { latex: "\\int_{#?}^{#?}", class: "small", variants: ["\\int", "\\iint", "\\oint"], tooltip: "Definite integral" },
        { latex: "\\sum_{#?}^{#?}", class: "small", tooltip: "Summation" },
        {
          latex: "\\lim_{#?\\to #?}",
          class: "small",
          shift: "\\lim_{x\\to\\infty}",
          variants: [
            "\\lim_{#?\\to #?}",
            "\\lim_{x\\to 0}",
            "\\lim_{x\\to\\infty}",
            "\\lim_{x\\to 0^+}",
            "\\lim_{x\\to 0^-}",
          ],
          tooltip: "Limit",
        },
        { latex: "\\vec{#?}", tooltip: "Vector", variants: ["\\vec{v}", "\\vec{#@}", "\\overrightarrow{#@}"] },
        { latex: "\\left(#0\\right)", tooltip: "Parentheses" },
        { latex: "\\left[#0\\right]", tooltip: "Square brackets" },
        { latex: "\\left|#0\\right|", tooltip: "Absolute value" },
      ],
      // Row 2: Greek letters
      [
        { latex: "\\pi" },
        { latex: "\\Delta" },
        { latex: "\\theta" },
        { latex: "\\omega" },
        { latex: "\\alpha" },
        { latex: "\\beta" },
        { latex: "\\lambda" },
        { latex: "\\mu" },
        { latex: "\\rho" },
        { latex: "\\sigma" },
        { latex: "\\phi", variants: ["\\varphi"] },
        "[backspace]",
      ],
      // Row 3: Operators & Relations
      [
        { latex: "\\pm" },
        { latex: "\\times" },
        { latex: "\\cdot" },
        { latex: "\\div" },
        { latex: "\\neq" },
        { latex: "\\leq" },
        { latex: "\\geq" },
        { latex: "\\approx" },
        { latex: "\\to" },
        { latex: "\\rightleftharpoons" },
        { latex: "\\infty" },
        { latex: "^{\\circ}", tooltip: "Degree" },
      ],
      // Row 4: Controls, Equations, Derivatives & Navigation
      [
        "[undo]",
        "[redo]",
        "[separator-5]",
        { latex: "=", label: "=" },
        { latex: "+", label: "+" },
        { latex: "-", label: "&#x2212;" },
        {
          latex: "#@^{\\prime}",
          class: "small",
          shift: "#@^{\\prime\\prime}",
          variants: [
            "#@^{\\prime\\prime}",
            "#@^{\\prime\\prime\\prime}",
            { latex: "f(x)", insert: "f\\left(x\\right)" },
            { latex: "f'(x)", insert: "f^{\\prime}(x)" },
            { latex: "y'", insert: "y^{\\prime}" },
            { latex: "\\frac{dy}{dx}", insert: "\\frac{dy}{dx}" },
            { latex: "\\frac{\\mathrm{d}}{\\mathrm{d}x}", insert: "\\frac{\\mathrm{d}}{\\mathrm{d}x}" },
          ],
          tooltip: "Derivative (f')",
        },
        "[separator-5]",
        "[left]",
        "[right]",
        {
          label: "\u23CE",
          command: "addRowAfter",
          tooltip: "New line / Return",
          class: "action hide-shift",
        },
      ],
    ],
  };
}

/**
 * Returns the enhanced "1 2 3" primary numeric keyboard layout keycap definitions.
 * Built specifically for students taking high school math and calculus exams:
 * Includes all essential numbers, arithmetic operators (+, -, *, /),
 * relations (=, !=, \in, \notin, \infty), trigonometry (sin, cos, tan and their reciprocals csc, sec, cot),
 * powers, square root, absolute value (|x|), integral, Euler's number (e), pi, comma (,),
 * dedicated derivative / prime notation (f'(x), y'), and return for multiline equations.
 */
export function getNumericKeyboardLayout(locale: "ar" | "en" = "ar"): ScienceKeyboardLayout {
  return {
    id: "numeric",
    label: "1 2 3",
    labelClass: "MLK__tex-math",
    tooltip: locale === "ar" ? "لوحة الأرقام والعمليات الأساسية" : "Numbers and basic operations",
    rows: [
      // Row 1: Variables, Derivatives, Digits 7-9, Division, Constants (e, pi, infty)
      [
        { latex: "x", shift: "y", variants: ["y", "z", "t", "r"], tooltip: "Variable x (shift: y)" },
        {
          latex: "#@^{\\prime}",
          class: "small",
          shift: "#@^{\\prime\\prime}",
          variants: [
            "#@^{\\prime\\prime}",
            "#@^{\\prime\\prime\\prime}",
            { latex: "f(x)", insert: "f\\left(x\\right)" },
            { latex: "f'(x)", insert: "f^{\\prime}(x)" },
            { latex: "y'", insert: "y^{\\prime}" },
            { latex: "\\frac{dy}{dx}", insert: "\\frac{dy}{dx}" },
            { latex: "\\frac{\\mathrm{d}}{\\mathrm{d}x}", insert: "\\frac{\\mathrm{d}}{\\mathrm{d}x}" },
          ],
          tooltip: "Derivative (f')",
        },
        "[separator-5]",
        "[7]",
        "[8]",
        "[9]",
        "[/]",
        "[separator-5]",
        {
          latex: "\\exponentialE",
          shift: "\\ln",
          variants: ["\\exp", "\\times 10^{#?}", "\\ln", "\\log_{10}", "\\log"],
          tooltip: "Euler's number e (shift: ln)",
        },
        {
          latex: "\\pi",
          shift: "\\theta",
          variants: ["\\theta", "\\Delta", "\\alpha", "\\beta"],
          tooltip: "Pi (shift: theta)",
        },
        {
          latex: "\\infty",
          shift: "\\in",
          variants: ["\\in", "\\notin", "\\neq", "\\approx", "\\varpropto"],
          tooltip: "Infinity (shift: in)",
        },
      ],
      // Row 2: Trig sin/cos with reciprocals (csc, sec), Digits 4-6, Multiplication, Powers & Roots
      [
        {
          latex: "\\sin",
          shift: "\\csc",
          variants: ["\\csc", "\\sin^{-1}", "\\sinh"],
          tooltip: "Sine (shift: Csc)",
        },
        {
          latex: "\\cos",
          shift: "\\sec",
          variants: ["\\sec", "\\cos^{-1}", "\\cosh"],
          tooltip: "Cosine (shift: Sec)",
        },
        "[separator-5]",
        "[4]",
        "[5]",
        "[6]",
        "[*]",
        "[separator-5]",
        { latex: "#@^2", shift: "#@^{#?}", variants: ["#@^3", "#@^n", "#@^{#?}"], tooltip: "Square" },
        { latex: "#@^{#?}", shift: "#@_{#?}", variants: ["#@_{#?}", "#@_n"], tooltip: "Power / Subscript" },
        { latex: "\\sqrt{#0}", shift: "\\sqrt[#0]{#?}", variants: ["\\sqrt[#0]{#?}", "\\sqrt[3]{#0}"], tooltip: "Square root" },
      ],
      // Row 3: Trig tan/cot, Absolute Value, Digits 1-3, Subtraction, Integral, Not Equal / In, Backspace
      [
        {
          latex: "\\tan",
          shift: "\\cot",
          variants: ["\\cot", "\\tan^{-1}", "\\tanh"],
          tooltip: "Tangent (shift: Cot)",
        },
        {
          latex: "\\left|#0\\right|",
          shift: "\\Vert #0 \\Vert",
          variants: ["|#0|", "\\Vert #0 \\Vert"],
          tooltip: "Absolute value",
        },
        "[separator-5]",
        "[1]",
        "[2]",
        "[3]",
        "[-]",
        "[separator-5]",
        {
          latex: "\\int",
          shift: "\\int_{#?}^{#?}",
          variants: ["\\int_{#?}^{#?}", "\\iint", "\\oint", "\\mathrm{d}x"],
          tooltip: "Integral",
        },
        {
          latex: "\\neq",
          shift: "\\in",
          variants: ["\\in", "\\notin", "\\leq", "\\geq", "\\approx"],
          tooltip: "Not equal (shift: in)",
        },
        "[backspace]",
      ],
      // Row 4: Shift, Parentheses, 0, Decimal Point, Comma, Equals, Addition, Arrows, Return
      [
        "[shift]",
        "[(]",
        "[)]",
        "[0]",
        "[.]",
        {
          latex: ",",
          insert: ",\\,",
          label: ",",
          tooltip: "Comma",
        },
        "[=]",
        "[+]",
        "[left]",
        "[right]",
        {
          label: "\u23CE",
          command: "addRowAfter",
          tooltip: "New line / Return",
          class: "action hide-shift",
        },
      ],
    ],
  };
}

/**
 * Registers the enhanced keyboards into MathLive's virtual keyboard.
 * Numeric (1 2 3) comes first as the primary student default tab,
 * followed by Science (علوم), Symbols, Alphabetic, and Greek.
 * Safe to call multiple times (idempotent).
 */
export function registerScienceKeyboard(locale: "ar" | "en" = "ar"): void {
  if (typeof window === "undefined" || !window.mathVirtualKeyboard) return;

  const numericLayout = getNumericKeyboardLayout(locale);
  const scienceLayout = getScienceKeyboardLayout(locale);

  // Place numeric (1 2 3) layout FIRST, followed by science and built-in layouts
  window.mathVirtualKeyboard.layouts = [
    numericLayout as any,
    scienceLayout as any,
    "symbols",
    "alphabetic",
    "greek",
  ];
}

