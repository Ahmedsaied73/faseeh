import { ACTIVE_SUBJECT } from "@/lib/subject-theme";
import { ArabicAuthArt, ArabicNotFoundArt } from "@/components/subject/arabic-art";
import { ChemistryAuthArt, ChemistryNotFoundArt } from "@/components/subject/chemistry-art";

/** Picks the art set for the active subject pack. */
export function AuthArt({ variant, compact = false }: { variant: "login" | "register"; compact?: boolean }) {
  return ACTIVE_SUBJECT === "arabic" ? (
    <ArabicAuthArt variant={variant} compact={compact} />
  ) : (
    <ChemistryAuthArt variant={variant} compact={compact} />
  );
}

export function NotFoundArt() {
  return ACTIVE_SUBJECT === "arabic" ? <ArabicNotFoundArt /> : <ChemistryNotFoundArt />;
}
