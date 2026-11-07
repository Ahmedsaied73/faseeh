// Keep identical to the other repo's copy. Contract fixtures: rich-contract-fixtures.json.

import type { RichBlock, RichContent } from "./types";

export const ENVELOPE_PREFIX = '{"v":1,"blocks":[';

export function looksRich(raw: unknown): raw is string {
  return typeof raw === "string" && raw.startsWith(ENVELOPE_PREFIX);
}

export function sanitizeBlocks(input: unknown): RichBlock[] | null {
  if (!Array.isArray(input)) return null;
  const out: RichBlock[] = [];
  for (const b of input) {
    if (!b || typeof b !== "object") return null;
    const { t, v } = b as { t?: unknown; v?: unknown };
    if ((t === "text" || t === "math" || t === "chem") && typeof v === "string") {
      out.push({ t, v });
    } else {
      return null;
    }
  }
  return out;
}

/** Plain strings (legacy or text-only) become a single text block. Never throws. */
export function parseRich(raw: string | null | undefined): RichContent {
  if (!raw) return { v: 1, blocks: [] };
  if (looksRich(raw)) {
    try {
      const data = JSON.parse(raw);
      const blocks = data && data.v === 1 ? sanitizeBlocks(data.blocks) : null;
      if (blocks) return { v: 1, blocks };
    } catch {
      /* fall through: treat as plain text */
    }
  }
  return { v: 1, blocks: [{ t: "text", v: raw }] };
}

export function isEmptyRich(raw: string | null | undefined): boolean {
  return parseRich(raw).blocks.every((b) => b.v.trim() === "");
}

export function hasMath(raw: string | null | undefined): boolean {
  return parseRich(raw).blocks.some((b) => b.t !== "text");
}
