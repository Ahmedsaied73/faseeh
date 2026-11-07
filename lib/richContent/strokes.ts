// lib/richContent/strokes.ts
// Shared stroke data contracts and validation for Phase 8 HandwritingPad

export interface StrokesData {
  x: number[][];
  y: number[][];
}

export const STROKES_LIMITS = {
  maxStrokes: 80,
  maxPoints: 6000,
} as const;

export type StrokeValidationError =
  | "STROKES_EMPTY"
  | "STROKES_MISMATCHED_ARRAYS"
  | "STROKES_TOO_MANY"
  | "STROKES_TOO_MANY_POINTS"
  | "STROKES_NON_FINITE_COORDINATE";

export function validateStrokes(
  strokes: unknown
): { ok: true; strokes: StrokesData } | { ok: false; error: StrokeValidationError } {
  if (!strokes || typeof strokes !== "object") {
    return { ok: false, error: "STROKES_MISMATCHED_ARRAYS" };
  }
  const s = strokes as { x?: unknown; y?: unknown };
  if (!Array.isArray(s.x) || !Array.isArray(s.y)) {
    return { ok: false, error: "STROKES_MISMATCHED_ARRAYS" };
  }
  if (s.x.length !== s.y.length) {
    return { ok: false, error: "STROKES_MISMATCHED_ARRAYS" };
  }
  if (s.x.length === 0) {
    return { ok: false, error: "STROKES_EMPTY" };
  }
  if (s.x.length > STROKES_LIMITS.maxStrokes) {
    return { ok: false, error: "STROKES_TOO_MANY" };
  }

  let totalPoints = 0;
  for (let i = 0; i < s.x.length; i++) {
    const strokeX = s.x[i];
    const strokeY = s.y[i];
    if (!Array.isArray(strokeX) || !Array.isArray(strokeY)) {
      return { ok: false, error: "STROKES_MISMATCHED_ARRAYS" };
    }
    if (strokeX.length !== strokeY.length) {
      return { ok: false, error: "STROKES_MISMATCHED_ARRAYS" };
    }
    totalPoints += strokeX.length;
    if (totalPoints > STROKES_LIMITS.maxPoints) {
      return { ok: false, error: "STROKES_TOO_MANY_POINTS" };
    }
    for (let j = 0; j < strokeX.length; j++) {
      const px = strokeX[j];
      const py = strokeY[j];
      if (
        typeof px !== "number" ||
        typeof py !== "number" ||
        !Number.isFinite(px) ||
        !Number.isFinite(py)
      ) {
        return { ok: false, error: "STROKES_NON_FINITE_COORDINATE" };
      }
    }
  }

  return { ok: true, strokes: { x: s.x as number[][], y: s.y as number[][] } };
}
