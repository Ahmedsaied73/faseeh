// Keep identical to the other repo's copy. Contract fixtures: rich-contract-fixtures.json.

import { parseRich } from "./parse";

/** For the AI grader. Plain strings are returned unchanged. */
export function toGraderText(raw: string | null | undefined): string {
  const { blocks } = parseRich(raw);
  const hasNonText = blocks.some((b) => b.t !== "text");
  if (!hasNonText) return raw ?? "";
  return blocks
    .map((b) => (b.t === "text" ? b.v : b.t === "math" ? `$$ ${b.v} $$` : `$$ \\ce{${b.v}} $$`))
    .join("\n");
}

/** One-line snippet for lists and logs. Not for display of equations. */
export function toPlainPreview(raw: string | null | undefined, max = 120): string {
  const s = parseRich(raw)
    .blocks.map((b) => b.v)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
