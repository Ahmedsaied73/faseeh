import { ACTIVE_SUBJECT } from "@/lib/subject-theme";
import { ArabicAuthArt, ArabicNotFoundArt } from "@/components/subject/arabic-art";
import { ChemistryAuthArt, ChemistryNotFoundArt } from "@/components/subject/chemistry-art";
import { MathAuthArt, MathNotFoundArt } from "@/components/subject/math-art";

/** Picks the art set for the active subject pack. */
export function AuthArt({ variant, compact = false }: { variant: "login" | "register"; compact?: boolean }) {
  if (ACTIVE_SUBJECT === "math") {
    return <MathAuthArt variant={variant} compact={compact} />;
  }
  return ACTIVE_SUBJECT === "arabic" ? (
    <ArabicAuthArt variant={variant} compact={compact} />
  ) : (
    <ChemistryAuthArt variant={variant} compact={compact} />
  );
}

export function NotFoundArt() {
  if (ACTIVE_SUBJECT === "math") {
    return <MathNotFoundArt />;
  }
  return ACTIVE_SUBJECT === "arabic" ? <ArabicNotFoundArt /> : <ChemistryNotFoundArt />;
}
