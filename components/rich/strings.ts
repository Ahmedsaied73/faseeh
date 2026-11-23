import { richMessages, tRich, type RichMessageKey } from "@/lib/richContent/i18n";

export type Locale = "ar" | "en";
export type RichKey = RichMessageKey;
export type RichT = (key: RichKey) => string;

export const RICH_STRINGS = richMessages;

export function makeT(locale: Locale): RichT {
  return (key: RichKey) => tRich(key, locale);
}
