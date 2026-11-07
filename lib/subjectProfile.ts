// Keep identical to the other repo's copy. Contract fixtures: rich-contract-fixtures.json.

export type AnswerFormat = "PLAIN" | "RICH";

export type SubjectProfile = {
  defaultFormat: AnswerFormat;
  allowChem: boolean;
};

const warnedSubjects = new Set<string>();

function warnUnknownSubject(raw: string) {
  if (!warnedSubjects.has(raw)) {
    warnedSubjects.add(raw);
    // eslint-disable-next-line no-console
    console.warn(`[subjectProfile] Unknown or unsupported subject "${raw}", falling back to PLAIN profile.`);
  }
}

function normalizeSubjectKey(raw: string): string {
  const s = raw.trim();

  // Arabic synonyms
  if (/^رياض(ة|يات)?$/i.test(s) || /^(ال)?رياض(ة|يات)$/i.test(s)) return "MATH";
  if (/^(ال)?فيزياء$/i.test(s)) return "PHYSICS";
  if (/^(ال)?كيمياء$/i.test(s)) return "CHEMISTRY";
  if (/^(اللغة\s+)?(ال)?عربي(ة)?$/i.test(s) || /^عربي$/i.test(s)) return "ARABIC";
  if (/^(اللغة\s+)?(ال)?(إ|ا)نجليزي(ة)?$/i.test(s) || /^(إ|ا)نجليزي$/i.test(s)) return "ENGLISH";

  // English synonyms
  const upper = s.toUpperCase();
  if (upper === "MATH" || upper === "MATHEMATICS") return "MATH";
  if (upper === "PHYSICS") return "PHYSICS";
  if (upper === "CHEMISTRY") return "CHEMISTRY";
  if (upper === "ARABIC") return "ARABIC";
  if (upper === "ENGLISH") return "ENGLISH";

  return upper;
}

/**
 * Resolves the subject profile for a given subject name.
 * Behavior is driven exclusively by the subject value, never by UI language or locale.
 * If subject is omitted/null, falls back to the central env config:
 * NEXT_PUBLIC_SUBJECT_NAME (frontend) or AI_STUDENT_SUBJECT (backend).
 */
export function subjectProfile(subject?: string | null): SubjectProfile {
  let target = subject;
  if (!target || typeof target !== "string" || target.trim() === "") {
    target =
      (typeof process !== "undefined" &&
        (process.env?.NEXT_PUBLIC_SUBJECT_NAME || process.env?.AI_STUDENT_SUBJECT)) ||
      "";
  }

  if (!target || target.trim() === "") {
    warnUnknownSubject("<empty>");
    return { defaultFormat: "PLAIN", allowChem: false };
  }

  const key = normalizeSubjectKey(target);
  switch (key) {
    case "MATH":
      return { defaultFormat: "RICH", allowChem: false };
    case "PHYSICS":
      return { defaultFormat: "RICH", allowChem: false };
    case "CHEMISTRY":
      return { defaultFormat: "RICH", allowChem: true };
    case "ARABIC":
      return { defaultFormat: "PLAIN", allowChem: false };
    case "ENGLISH":
      return { defaultFormat: "PLAIN", allowChem: false };
    default:
      warnUnknownSubject(target);
      return { defaultFormat: "PLAIN", allowChem: false };
  }
}

/**
 * Resolves effective format: explicit stored format on question wins;
 * otherwise defaults to subjectProfile(subject).defaultFormat.
 */
export function resolveEffectiveFormat(
  questionFormat: AnswerFormat | null | undefined,
  subject?: string | null
): AnswerFormat {
  if (questionFormat === "PLAIN" || questionFormat === "RICH") {
    return questionFormat;
  }
  return subjectProfile(subject).defaultFormat;
}
