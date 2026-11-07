// Keep identical to the other repo's copy. Contract fixtures: rich-contract-fixtures.json.

export type RichBlock =
  | { t: "text"; v: string }
  | { t: "math"; v: string }
  | { t: "chem"; v: string };

export interface RichContent {
  v: 1;
  blocks: RichBlock[];
}

export const RICH_LIMITS = {
  maxBlocks: 60,
  maxTextChars: 4000,
  maxMathChars: 2000,
  maxChemChars: 500,
  maxTotalChars: 20000,
} as const;

export type AnswerFormat = "PLAIN" | "RICH";
