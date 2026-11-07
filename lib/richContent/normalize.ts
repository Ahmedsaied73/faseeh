// Keep identical to the other repo's copy. Contract fixtures: rich-contract-fixtures.json.

const PLACEHOLDER = /\\placeholder(?:\[[^\]]*\])?(?:\{[^{}]*\})?/g;

export function hasPlaceholder(latex: string): boolean {
  return /\\placeholder\b/.test(latex);
}

/**
 * Store only latex-expanded output from MathLive.
 * Empty slots become {}.
 * Substitutes MathLive non-standard macros with KaTeX-compatible equivalents:
 * - \differentialD -> \mathrm{d}
 * - \exponentialE  -> \mathrm{e}
 * - \imaginaryI    -> \mathrm{i}
 * - \placeholder   -> {}
 */
export function normalizeMathLatex(latex: string): string {
  if (!latex) return "";
  let out = latex;

  // Substitute MathLive non-standard macros
  out = out
    .replace(/\\differentialD\b/g, "\\mathrm{d}")
    .replace(/\\exponentialE\b/g, "\\mathrm{e}")
    .replace(/\\imaginaryI\b/g, "\\mathrm{i}");

  // Replace placeholders with empty braces
  out = out.replace(PLACEHOLDER, "{}");

  // Fallback for any remaining bare \placeholder
  out = out.replace(/\\placeholder\b/g, "{}");

  return out.trim();
}
