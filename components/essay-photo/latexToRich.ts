import { parseRich, serializeRich, type RichBlock } from '@/lib/richContent';

const MATH_TOKEN_RE = /(\$\$[\s\S]*?\$\$|\$(?:\\\$|[^$])+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;

/**
 * Converts Gemini `$...$` / `$$...$$` output into Envelope v1 JSON (via `serializeRich`)
 * when `isRich` is true, or normalized plain text when `isRich` is false.
 * Always preserves `[?]` uncertainty markers.
 */
export function latexToRich(rawText: string, isRich: boolean): string {
  const trimmed = rawText.trim();
  if (!trimmed) return '';

  if (!isRich) {
    return trimmed;
  }

  const parts = trimmed.split(MATH_TOKEN_RE);
  const blocks: RichBlock[] = [];

  for (const part of parts) {
    if (!part) continue;

    let mathContent: string | null = null;
    if (part.startsWith('$$') && part.endsWith('$$')) {
      mathContent = part.slice(2, -2).trim();
    } else if (part.startsWith('$') && part.endsWith('$')) {
      mathContent = part.slice(1, -1).trim();
    } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
      mathContent = part.slice(2, -2).trim();
    } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
      mathContent = part.slice(2, -2).trim();
    }

    if (mathContent !== null) {
      if (mathContent) {
        blocks.push({ t: 'math', v: mathContent });
      }
    } else {
      const textVal = part.trim();
      if (textVal) {
        blocks.push({ t: 'text', v: textVal });
      }
    }
  }

  if (blocks.length === 0) return '';
  return serializeRich(blocks);
}

/**
 * Counts literal `[?]` markers across both plain text and Envelope v1 `blocks[].v`.
 */
export function countUnreadableMarkers(value: string | null | undefined): number {
  if (!value) return 0;
  const { blocks } = parseRich(value);
  let count = 0;
  for (const b of blocks) {
    const matches = b.v.match(/\[\?\]/g);
    if (matches) count += matches.length;
  }
  return count;
}

export function hasUnreadableMarkers(value: string | null | undefined): boolean {
  return countUnreadableMarkers(value) > 0;
}
