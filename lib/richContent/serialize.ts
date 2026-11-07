// Keep identical to the other repo's copy. Contract fixtures: rich-contract-fixtures.json.

import type { RichBlock } from "./types";
import { looksRich } from "./parse";

export function cleanBlocks(blocks: RichBlock[]): RichBlock[] {
  const out: RichBlock[] = [];
  for (const b of blocks) {
    if (b.v.trim() === "") continue;
    const last = out[out.length - 1];
    if (b.t === "text" && last && last.t === "text") {
      out[out.length - 1] = { t: "text", v: last.v + "\n" + b.v };
    } else {
      out.push({ t: b.t, v: b.v });
    }
  }
  return out;
}

/** Text-only content is stored as a plain string. Anything with math/chem is stored as the envelope. */
export function serializeRich(blocks: RichBlock[]): string {
  const cleaned = cleanBlocks(blocks);
  if (cleaned.length === 0) return "";
  if (cleaned.every((b) => b.t === "text")) {
    const plain = cleaned.map((b) => b.v).join("\n");
    return looksRich(plain) ? JSON.stringify({ v: 1, blocks: cleaned }) : plain;
  }
  return JSON.stringify({ v: 1, blocks: cleaned });
}
