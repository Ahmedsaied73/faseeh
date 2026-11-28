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
  const upper = s.toUpperCase();

  // Arabic math & branches (رياضيات، تفاضل، تكامل، جبر، هندسة، استاتيكا، ديناميكا، إحصاء)
  if (
    /^(ال)?رياض(ة|يات)(\s+(بحتة|تطبيقية))?$/i.test(s) ||
    /^(ال)?(تفاضل|تكامل|جبر|هندسة|استاتيكا|ديناميكا|ميكانيكا|إحصاء|احصاء)(\s+و(ال)?(تكامل|هندسة(\s+فراغية)?))?$/i.test(s) ||
    upper === "MATH" ||
    upper === "MATHS" ||
    upper === "MATHEMATICS" ||
    upper === "STATISTICS"
  ) {
    return "MATH";
  }

  // Physics
  if (/^(ال)?فيزياء$/i.test(s) || upper === "PHYSICS") return "PHYSICS";

  // Chemistry
  if (/^(ال)?كيمياء$/i.test(s) || upper === "CHEMISTRY") return "CHEMISTRY";

  // Known PLAIN ثانوية عامة subjects (Biology, Geology, Languages, Humanities)
  if (/^(ال)?(أحياء|احياء)$/i.test(s) || upper === "BIOLOGY") return "PLAIN_KNOWN";
  if (/^(ال)?جيولوجيا(\s+وعلوم\s+بيئية)?$/i.test(s) || upper === "GEOLOGY") return "PLAIN_KNOWN";
  if (/^(اللغة\s+)?(ال)?عربي(ة)?$/i.test(s) || /^عربي$/i.test(s) || upper === "ARABIC") return "ARABIC";
  if (/^(اللغة\s+)?(ال)?(إ|ا)نجليزي(ة)?$/i.test(s) || /^(إ|ا)نجليزي$/i.test(s) || upper === "ENGLISH") return "ENGLISH";
  if (/^(اللغة\s+)?(ال)?فرنسي(ة)?$/i.test(s) || /^فرنساوي$/i.test(s) || upper === "FRENCH") return "PLAIN_KNOWN";
  if (/^(اللغة\s+)?(ال)?ألماني(ة)?$/i.test(s) || /^(أ|ا)لماني$/i.test(s) || upper === "GERMAN") return "PLAIN_KNOWN";
  if (/^(اللغة\s+)?(ال)?إيطالي(ة)?$/i.test(s) || /^(إ|ا)يطالي$/i.test(s) || upper === "ITALIAN") return "PLAIN_KNOWN";
  if (/^(اللغة\s+)?(ال)?إسباني(ة)?$/i.test(s) || upper === "SPANISH") return "PLAIN_KNOWN";
  if (/^(ال)?تاريخ$/i.test(s) || upper === "HISTORY") return "PLAIN_KNOWN";
  if (/^(ال)?جغرافيا$/i.test(s) || upper === "GEOGRAPHY") return "PLAIN_KNOWN";
  if (/^(ال)?فلسفة(\s+ومنطق)?$/i.test(s) || upper === "PHILOSOPHY") return "PLAIN_KNOWN";
  if (/^علم\s+(ال)?نفس(\s+و(ال)?اجتماع)?$/i.test(s) || upper === "PSYCHOLOGY") return "PLAIN_KNOWN";

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
    let envSubject = "";
    try {
      envSubject = process.env.NEXT_PUBLIC_SUBJECT_NAME || "";
    } catch {
      envSubject = "";
    }
    if (!envSubject && typeof process !== "undefined") {
      envSubject = process.env?.AI_STUDENT_SUBJECT || "";
    }
    target = envSubject;
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
    case "ENGLISH":
    case "PLAIN_KNOWN":
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
