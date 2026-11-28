export const LEVEL_NAMES = [
  'مستكشف',
  'متحمّس',
  'مثابر',
  'متقن',
  'نجم الفصل',
  'أسطورة',
] as const;

export const MAX_LEVEL = 30;

export function levelFloor(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return 50 * safeLevel * (safeLevel - 1);
}

export function levelOf(xp: number): number {
  const safeXp = Math.max(0, xp);
  let level = 1;
  while (level < MAX_LEVEL && safeXp >= levelFloor(level + 1)) {
    level++;
  }
  return level;
}

export function progressOf(xp: number): { level: number; pct: number; left: number } {
  const safeXp = Math.max(0, xp);
  const level = levelOf(safeXp);
  if (level >= MAX_LEVEL) {
    return { level, pct: 100, left: 0 };
  }
  const floor = levelFloor(level);
  const next = levelFloor(level + 1);
  const span = Math.max(1, next - floor);
  const pct = Math.max(0, Math.min(100, Math.round(((safeXp - floor) / span) * 100)));
  const left = Math.max(0, next - safeXp);
  return { level, pct, left };
}

export function levelName(level: number): string {
  const index = Math.min(Math.max(1, Math.floor(level)), LEVEL_NAMES.length) - 1;
  return LEVEL_NAMES[index];
}

export const XP_WEIGHTS = {
  lessonComplete: 20,
  streakDaily: 10,
  quizCorrectDelta: 10,
  quizPerfect: 30,
  quizImprovement: 20,
  quizImprovementMinPct: 10,
} as const;

export type BadgeTone = 'primary' | 'accent';
export type IconStyle = 'mascot';

export type TeacherChallengeKind =
  | 'MASTERY'
  | 'STREAK_ANSWERS'
  | 'IMPROVE'
  | 'MISTAKES'
  | 'NO_SKIP'
  | 'AI_ESSAY';

export type ChallengeResult = 'none' | 'passed' | 'failed' | 'already';
export type CourseChallengeStatus = 'locked' | 'open' | 'done';

export interface BadgeDefinition {
  id: string;
  title: string;
  how: string;
  where: string;
  target: number;
  tone: BadgeTone;
}

export const BADGE_DEFINITIONS: readonly BadgeDefinition[] = [
  {
    id: 'first',
    title: 'أول خطوة',
    how: 'أكمل أول درس في أي كورس',
    where: 'بتتفتح لما تحدد الدرس كمكتمل',
    target: 1,
    tone: 'primary',
  },
  {
    id: 'week',
    title: 'نَفَس طويل',
    how: 'ذاكر 7 أيام متتالية',
    where: 'بتتفتح أول نشاط في اليوم السابع',
    target: 7,
    tone: 'accent',
  },
  {
    id: 'perfect',
    title: 'عين الصقر',
    how: 'خد الدرجة النهائية في اختبار',
    where: 'بتظهر في صفحة نتيجة الاختبار',
    target: 1,
    tone: 'accent',
  },
  {
    id: 'steady',
    title: 'صديق المعرفة',
    how: 'أكمل كل دروس الدورة',
    where: 'بتتفتح بعد آخر درس',
    target: 1,
    tone: 'primary',
  },
  {
    id: 'hunter',
    title: 'صايد الأسئلة',
    how: 'أنهِ 3 اختبارات',
    where: 'بتتفتح لما تسلّم الاختبار التالت',
    target: 3,
    tone: 'primary',
  },
  {
    id: 'learner',
    title: 'بتتحسّن',
    how: 'ارفع نتيجتك 10% عن أحسن محاولة ليك',
    where: 'بتظهر بعد إعادة اختبار',
    target: 1,
    tone: 'primary',
  },
  {
    id: 'master',
    title: 'خبير المادة',
    how: 'أتقن تحدي المدرس في الدورة',
    where: 'بتتفتح لما تنجح في التحدي',
    target: 1,
    tone: 'accent',
  },
  {
    id: 'momentum',
    title: 'انطلاقة قوية',
    how: 'اجمع 300 نقطة XP من المذاكرة',
    where: 'بتتفتح تلقائي مع تقدّمك',
    target: 300,
    tone: 'primary',
  },
  {
    id: 'star',
    title: 'قمة التركيز',
    how: 'وصّل المستوى 5',
    where: 'بتتفتح تلقائي مع النقط',
    target: 5,
    tone: 'primary',
  },
] as const;

export interface TeacherChallengePreset {
  kind: TeacherChallengeKind;
  label: string;
  title: string;
  rule: string;
  rewardXp: number;
  masteryPercent: number;
}

export const TEACHER_CHALLENGE_PRESETS: readonly TeacherChallengePreset[] = [
  {
    kind: 'MASTERY',
    label: 'إتقان اختبار الوحدة',
    title: 'إتقان اختبار الوحدة',
    rule: 'هات 80٪ أو أكتر في اختبار الوحدة عشان تتقن التحدي.',
    rewardXp: 120,
    masteryPercent: 80,
  },
  {
    kind: 'STREAK_ANSWERS',
    label: 'إجابات صح ورا بعض',
    title: 'تحدي التركيز المتواصل',
    rule: 'جاوب 5 أسئلة صح ورا بعض بدون خطأ في اختبار الوحدة.',
    rewardXp: 100,
    masteryPercent: 80,
  },
  {
    kind: 'IMPROVE',
    label: 'تحسّن الدرجة',
    title: 'تحدي التطور عن المحاولة السابقة',
    rule: 'ارفع درجتك بنسبة 15٪ على الأقل عن محاولتك الأولى.',
    rewardXp: 90,
    masteryPercent: 75,
  },
  {
    kind: 'MISTAKES',
    label: 'مراجعة الأخطاء',
    title: 'تحدي تصحيح الأخطاء السابقة',
    rule: 'راجع الأسئلة اللي غلطت فيها قبل كده وحلّها صح كلها.',
    rewardXp: 100,
    masteryPercent: 80,
  },
  {
    kind: 'NO_SKIP',
    label: 'وحدة بدون تخطي',
    title: 'تحدي الالتزام الكامل بالوحدة',
    rule: 'كمّل كل دروس الوحدة بدون تخطي قبل ميعاد الامتحان.',
    rewardXp: 110,
    masteryPercent: 80,
  },
  {
    kind: 'AI_ESSAY',
    label: 'تحسين المقال بالـ AI',
    title: 'تحدي تحسين الإجابة المقالية',
    rule: 'طوّر إجابتك المقالية بعد ملاحظات المصحح الذكي للوصول لـ 85٪.',
    rewardXp: 130,
    masteryPercent: 85,
  },
] as const;

export interface GamificationLine {
  label: string;
  value: number;
  accent?: boolean;
}

export interface GamificationAward {
  eventId?: string | number;
  kind: 'lesson' | 'quiz';
  refId: string;
  title?: string;
  lines: GamificationLine[];
  totalGain: number;
  newTotalXp?: number;
  newStreak?: number;
  doneToday?: boolean;
  unlockedBadges: string[];
  levelUp: number | null;
  correct?: number;
  count?: number;
  pct?: number;
  prevBest?: number | null;
  challengeResult?: ChallengeResult;
  challengeMasteryPercent?: number;
  completedLessonsCount?: number;
  totalLessonsCount?: number;
}

export interface GamificationEvent {
  id: number;
  gain: number;
  levelUp: number | null;
  badges: string[];
  kind: 'lesson' | 'quiz';
}

export interface GamificationHud {
  enabled: boolean;
  xp: number;
  level: number;
  pct: number;
  left: number;
  streak: number;
  doneToday: boolean;
}

export interface GamificationNextAction {
  type: 'lesson' | 'challenge' | 'course' | 'courses';
  title: string;
  courseSlug?: string | null;
  videoSlug?: string | null;
  quizSlug?: string | null;
}

export interface GamificationCourseProgress {
  courseSlug: string;
  title: string;
  grade?: string | null;
  completedVideos: number;
  totalVideos: number;
  pct: number;
}

export interface GamificationExamRecord {
  id: string;
  quizSlug: string;
  videoSlug?: string | null;
  courseSlug?: string | null;
  title: string;
  correct: number;
  count: number;
  pct: number;
  date: string;
  isChallenge?: boolean;
}

export interface GamificationBadgeProgress {
  id: string;
  unlocked: boolean;
  unlockedAt?: string | null;
  current: number;
  target: number;
}

export interface GamificationLogItem {
  id: string;
  label: string;
  gain: number;
  createdAt?: string;
}

export interface GamificationSummary {
  enabled: boolean;
  hud: GamificationHud;
  courses: GamificationCourseProgress[];
  exams: GamificationExamRecord[];
  averageExamPct?: number;
  badges: GamificationBadgeProgress[];
  log: GamificationLogItem[];
  nextAction: GamificationNextAction | null;
}

export interface CourseChallengeData {
  enabled: boolean;
  courseSlug: string;
  kind: TeacherChallengeKind;
  title: string;
  rule: string;
  masteryPercent: number;
  rewardXp: number;
  quizSlug?: string | null;
  videoSlug?: string | null;
  status: CourseChallengeStatus;
  remainingLessons: number;
}

export interface TeacherChallengeInput {
  kind: TeacherChallengeKind;
  quizSlug?: string | null;
  title: string;
  rule: string;
  masteryPercent: number;
  rewardXp: number;
  enabled?: boolean;
}
