// Custom MathLive keyboard layouts.
// Merges the project's existing "علوم" and "1 2 3" layouts with the new "تفاضل" (Calculus) layout.
import type { VirtualKeyboardLayout } from "mathlive";
import { getScienceKeyboardLayout, getNumericKeyboardLayout } from "@/lib/richContent/scienceKeyboard";

const k = (latex: string, extra: Record<string, unknown> = {}) => ({ latex, ...extra });
const fx = (latex: string, label: string) => ({ latex, label, class: "small tex" });

export const CALCULUS_LAYOUT: VirtualKeyboardLayout = {
  id: "calculus",
  label: "تفاضل",
  tooltip: "Calculus",
  rows: [
    [
      fx("f\\left(x\\right)", "f(x)"),
      fx("f'\\left(x\\right)", "f′(x)"),
      fx("f''\\left(x\\right)", "f″(x)"),
      fx("f^{-1}\\left(x\\right)", "f⁻¹"),
      k("y'"),
      k("y''"),
      k("\\frac{dy}{dx}"),
      k("\\frac{d}{dx}"),
      k("\\frac{d^{2}y}{dx^{2}}"),
      "[backspace]",
    ],
    [
      k("\\frac{\\partial}{\\partial x}"),
      k("\\int #?\\,dx"),
      k("\\int_{#?}^{#?}#?\\,dx"),
      k("\\left[#?\\right]_{#?}^{#?}"),
      k("dx"),
      k("dy"),
      k("dt"),
      k("\\Delta x"),
      k("\\lim_{x\\to #?}#?"),
      k("\\lim_{x\\to\\infty}"),
    ],
    [
      k("\\sum_{#?}^{#?}#?"),
      k("e^{#?}"),
      fx("\\ln\\left(#?\\right)", "ln"),
      fx("\\sin\\left(#?\\right)", "sin"),
      fx("\\cos\\left(#?\\right)", "cos"),
      fx("\\tan\\left(#?\\right)", "tan"),
      k("\\sin^{2}"),
      k("\\cos^{2}"),
      fx("\\log_{#?}\\left(#?\\right)", "log"),
      k("\\left|#0\\right|"),
    ],
    [
      k("\\frac{#@}{#?}"),
      k("\\sqrt{#0}"),
      k("#@^{#?}"),
      k("\\left(#0\\right)"),
      k("x"),
      k("y"),
      k("t"),
      fx("g\\left(x\\right)", "g(x)"),
      "[=]",
      "[+]",
    ],
    [
      "[undo]",
      "[redo]",
      "[-]",
      k("\\times"),
      k("\\div"),
      "[left]",
      "[right]",
      "[return]",
    ],
  ],
};

export const SCIENCE_LAYOUT: VirtualKeyboardLayout = getScienceKeyboardLayout("ar") as unknown as VirtualKeyboardLayout;
export const NUMERIC_LAYOUT: VirtualKeyboardLayout = getNumericKeyboardLayout("ar") as unknown as VirtualKeyboardLayout;

export const KEYBOARD_LAYOUTS = [
  SCIENCE_LAYOUT,
  CALCULUS_LAYOUT,
  NUMERIC_LAYOUT,
  "symbols",
  "alphabetic",
  "greek",
] as const;
