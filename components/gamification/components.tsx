'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BADGE_DEFINITIONS,
  TEACHER_CHALLENGE_PRESETS,
  levelName,
  type CourseChallengeData,
  type GamificationAward,
  type GamificationNextAction,
  type GamificationSummary,
  type TeacherChallengeKind,
} from '@/lib/gamification.config';
import {
  useCourseChallenge,
  useGamificationSummary,
  useUpdateCourseChallenge,
} from './api';
import { BadgeArt, Currency, Mascot } from './art';
import { useTween } from './hooks';
import { useGamification } from './provider';
import { ProgressBar, Ring, UIcon } from './ui';

function resolveResumeTarget(nextAction: GamificationNextAction | null | undefined): {
  href: string;
  kicker: string;
  title: string;
  ctaLabel: string;
  isAccent: boolean;
  isLine?: boolean;
} {
  if (nextAction?.type === 'challenge' && nextAction.courseSlug && nextAction.videoSlug) {
    return {
      href: `/course/${nextAction.courseSlug}/video/${nextAction.videoSlug}/quiz`,
      kicker: 'تحدي المدرس مفتوح',
      title: nextAction.title,
      ctaLabel: 'ادخل التحدي',
      isAccent: true,
    };
  }
  if (nextAction?.type === 'lesson' && nextAction.courseSlug && nextAction.videoSlug) {
    return {
      href: `/course/${nextAction.courseSlug}/video/${nextAction.videoSlug}`,
      kicker: 'كمّل من حيث وقفت',
      title: nextAction.title,
      ctaLabel: 'كمّل الدرس',
      isAccent: false,
    };
  }
  if (nextAction?.type === 'course' && nextAction.courseSlug) {
    return {
      href: `/course/${nextAction.courseSlug}`,
      kicker: 'كمّل من حيث وقفت',
      title: nextAction.title,
      ctaLabel: 'افتح الدورة',
      isAccent: false,
      isLine: true,
    };
  }
  return {
    href: '/courses',
    kicker: 'ابدأ رحلة المذاكرة',
    title: nextAction?.title ?? 'استكشف الدورات المتاحة',
    ctaLabel: 'عرض الدورات',
    isAccent: false,
    isLine: true,
  };
}

/* ---------- small bar in the site header ---------- */
export function HudPill() {
  const { enabled, isAuthenticated, hud } = useGamification();
  const xp = useTween(hud?.xp ?? 0);

  if (!enabled || !isAuthenticated || !hud || !hud.enabled) {
    return null;
  }

  return (
    <Link
      href="/me/user/achievements"
      className="g-hud"
      aria-label={`المستوى ${hud.level}، ${hud.xp} نقطة، سلسلة ${hud.streak} يوم. افتح إنجازاتي`}
    >
      <span className="g-hud-lv" key={hud.level}>
        {hud.level}
      </span>
      <span className="g-hud-bar">
        <i style={{ transform: `scaleX(${Math.max(0, Math.min(100, hud.pct)) / 100})` }} />
      </span>
      <span className="g-hud-xp">
        {xp}
        <small>XP</small>
      </span>
      <span className={`g-hud-st${hud.doneToday ? ' is-lit' : ''}`} key={hud.streak}>
        <Currency name="flame" style="mascot" size={16} />
        {hud.streak}
      </span>
    </Link>
  );
}

/* ---------- strip on the courses page ---------- */
export function DashboardStrip({
  summary: summaryProp,
  nextAction: nextActionProp,
}: {
  summary?: GamificationSummary | null;
  nextAction?: GamificationNextAction | null;
} = {}) {
  const { enabled, isAuthenticated, hud } = useGamification();
  const shouldFetchSummary = Boolean(enabled && isAuthenticated && !summaryProp && !nextActionProp);
  const { data: fetchedSummary } = useGamificationSummary(shouldFetchSummary);

  if (!enabled || !isAuthenticated || !hud || !hud.enabled) {
    return null;
  }

  const activeSummary = summaryProp ?? fetchedSummary;
  const nextAction = nextActionProp ?? activeSummary?.nextAction ?? null;
  const done = hud.doneToday ? Math.min(hud.streak, 7) : Math.min(hud.streak, 6);
  const dots = Array.from({ length: 7 }, (_, i) => {
    if (hud.doneToday) return i >= 7 - done ? 'done' : 'none';
    if (i === 6) return 'today';
    return i >= 6 - done ? 'done' : 'none';
  });

  const resume = resolveResumeTarget(nextAction);

  return (
    <section className="g-strip" aria-label="تقدمك">
      <div>
        <Ring size={72} stroke={8} pct={hud.pct} label={`المستوى ${hud.level}`}>
          <span className="g-ring-num" style={{ fontSize: '1.4rem' }}>
            {hud.level}
          </span>
        </Ring>
        <span>
          <small>المستوى</small>
          <strong>{levelName(hud.level)}</strong>
          <p>
            باقي {hud.left} XP للمستوى {hud.level + 1}
          </p>
        </span>
      </div>
      <div>
        <span className="g-flame g-flame-badge">
          <Currency name="flame" style="mascot" size={30} />
        </span>
        <span>
          <small>سلسلة المذاكرة</small>
          <strong>{hud.streak} يوم</strong>
          <span className="g-dots" aria-hidden="true">
            {dots.map((d, i) => (
              <i key={i} className={d === 'done' ? 'is-done' : d === 'today' ? 'is-today' : ''}>
                {d === 'done' && <UIcon name="check" />}
              </i>
            ))}
          </span>
        </span>
      </div>
      <div>
        <span style={{ display: 'grid', gap: 6, justifyItems: 'start' }}>
          <small className={resume.isAccent ? 'g-kicker-accent' : undefined}>
            {resume.kicker}
          </small>
          <strong>{resume.title}</strong>
          <Link
            href={resume.href}
            className={
              resume.isLine
                ? 'g-btn-line'
                : `g-btn${resume.isAccent ? ' is-accent' : ''}`
            }
          >
            {resume.ctaLabel}
            {!resume.isLine && <UIcon name="arrow" />}
          </Link>
        </span>
      </div>
    </section>
  );
}

/* ---------- after a lesson is marked complete ---------- */
export function LessonEnd({
  courseSlug,
  lessonSlug,
  award: awardProp,
  nextLesson,
  challengeVideoSlug,
  completedCount,
  totalCount,
}: {
  courseSlug: string;
  lessonSlug: string;
  award?: GamificationAward | null;
  nextLesson?: { slug: string; title: string } | null;
  challengeVideoSlug?: string | null;
  completedCount?: number;
  totalCount?: number;
}) {
  const { enabled, latestAward } = useGamification();
  const activeAward =
    awardProp ??
    (latestAward?.kind === 'lesson' && latestAward.refId === lessonSlug ? latestAward : null);
  const totalTween = useTween(activeAward?.totalGain ?? 0, 550);

  if (!enabled || !activeAward || activeAward.kind !== 'lesson') {
    return null;
  }

  const doneCount = completedCount ?? activeAward.completedLessonsCount;
  const allCount = totalCount ?? activeAward.totalLessonsCount;
  const hasCounts = typeof doneCount === 'number' && typeof allCount === 'number' && allCount > 0;

  return (
    <section className="g-end" aria-live="polite">
      <Mascot mood="happy" size={68} />
      <div className="g-end-tx">
        <div className="g-end-head">
          <strong>
            {hasCounts ? `خلّصت الدرس، ${doneCount} من ${allCount}` : 'خلّصت الدرس'}
          </strong>
          <span className="g-end-pill">+{totalTween} XP</span>
        </div>
        {activeAward.lines.length > 0 && (
          <ul className="g-lines">
            {activeAward.lines.map((l) => (
              <li key={l.label} className={l.accent ? 'is-accent' : undefined}>
                <span>{l.label}</span>
                <b>+{l.value}</b>
              </li>
            ))}
          </ul>
        )}
      </div>
      {nextLesson ? (
        <Link href={`/course/${courseSlug}/video/${nextLesson.slug}`} className="g-btn">
          الدرس الجاي: {nextLesson.title}
          <UIcon name="arrow" />
        </Link>
      ) : challengeVideoSlug ? (
        <Link
          href={`/course/${courseSlug}/video/${challengeVideoSlug}/quiz`}
          className="g-btn is-accent"
        >
          ادخل تحدي المدرس
          <UIcon name="arrow" />
        </Link>
      ) : (
        <Link href={`/course/${courseSlug}`} className="g-btn">
          ارجع للدورة
          <UIcon name="arrow" />
        </Link>
      )}
    </section>
  );
}

/* ---------- teacher challenge: node on the course map ---------- */
export function ChallengeNode({
  courseSlug,
  challenge: challengeProp,
}: {
  courseSlug: string;
  challenge?: CourseChallengeData | null;
}) {
  const { enabled } = useGamification();
  const { data: fetched } = useCourseChallenge(courseSlug, enabled && !challengeProp);
  const active = challengeProp ?? fetched;

  if (!enabled || !active || !active.enabled) {
    return null;
  }

  const st = active.status;
  const remaining = active.remainingLessons;
  const canOpenQuiz = st === 'open' && Boolean(active.videoSlug);

  return (
    <div className={`g-ch is-${st}`}>
      <span className="g-ch-ic">
        <UIcon name={st === 'done' ? 'check' : st === 'locked' ? 'lock' : 'target'} />
      </span>
      <span className="g-ch-tx">
        <small className={st === 'open' ? 'is-accent' : undefined}>
          {st === 'open' ? 'تحدي المدرس · مفتوح الآن' : 'تحدي المدرس'}
        </small>
        <strong>{active.title}</strong>
        <em>
          {st === 'locked' &&
            `بيتفتح بعد ما تخلّص ${remaining} ${remaining === 1 ? 'درس' : 'دروس'} متبقية`}
          {st === 'open' && `${active.rule} الجايزة ${active.rewardXp} XP وشارة خبير المادة`}
          {st === 'done' && 'أتقنت التحدي وشارة خبير المادة معاك'}
        </em>
      </span>
      {canOpenQuiz && active.videoSlug && (
        <Link
          href={`/course/${courseSlug}/video/${active.videoSlug}/quiz`}
          className="g-btn is-accent"
        >
          ادخل التحدي
        </Link>
      )}
    </div>
  );
}

/* ---------- teacher mode editor on the course page ---------- */
export function TeacherChallengeEditor({
  courseSlug,
  initialChallenge,
  quizzes,
  onSaved,
}: {
  courseSlug: string;
  initialChallenge?: CourseChallengeData | null;
  quizzes?: Array<{ slug: string; title: string }>;
  onSaved?: (updated: CourseChallengeData) => void;
}) {
  const { data: fetchedChallenge } = useCourseChallenge(courseSlug, !initialChallenge);
  const resolvedChallenge = initialChallenge ?? fetchedChallenge;

  const defaultPreset = TEACHER_CHALLENGE_PRESETS[0];
  const [challengeEnabled, setChallengeEnabled] = useState<boolean>(
    resolvedChallenge?.enabled ?? true,
  );
  const [selectedKind, setSelectedKind] = useState<TeacherChallengeKind>(
    resolvedChallenge?.kind ?? defaultPreset.kind,
  );
  const [quizSlug, setQuizSlug] = useState<string>(
    resolvedChallenge?.quizSlug ?? quizzes?.[0]?.slug ?? '',
  );
  const [masteryPercent, setMasteryPercent] = useState<number>(
    resolvedChallenge?.masteryPercent ?? defaultPreset.masteryPercent,
  );
  const [rewardXp, setRewardXp] = useState<number>(
    resolvedChallenge?.rewardXp ?? defaultPreset.rewardXp,
  );
  const [savedNotice, setSavedNotice] = useState(false);

  const { mutateAsync, isPending, error } = useUpdateCourseChallenge(courseSlug);

  useEffect(() => {
    if (!resolvedChallenge) return;
    setChallengeEnabled(resolvedChallenge.enabled);
    setSelectedKind(resolvedChallenge.kind);
    setQuizSlug(resolvedChallenge.quizSlug ?? quizzes?.[0]?.slug ?? '');
    setMasteryPercent(resolvedChallenge.masteryPercent);
    setRewardXp(resolvedChallenge.rewardXp);
  }, [resolvedChallenge, quizzes]);

  const activePreset =
    TEACHER_CHALLENGE_PRESETS.find((p) => p.kind === selectedKind) ?? defaultPreset;

  const handleSelectPreset = (kind: TeacherChallengeKind) => {
    const preset = TEACHER_CHALLENGE_PRESETS.find((p) => p.kind === kind);
    if (!preset) return;
    setSelectedKind(preset.kind);
    setMasteryPercent(preset.masteryPercent);
    setRewardXp(preset.rewardXp);
    setSavedNotice(false);
  };

  const handleSave = async () => {
    setSavedNotice(false);
    const clampedMastery = Math.max(50, Math.min(100, Math.round(masteryPercent)));
    const clampedXp = Math.max(10, Math.min(300, Math.round(rewardXp)));
    try {
      const updated = await mutateAsync({
        kind: activePreset.kind,
        quizSlug: quizSlug || quizzes?.[0]?.slug || null,
        title: activePreset.title,
        rule: activePreset.rule,
        masteryPercent: clampedMastery,
        rewardXp: clampedXp,
        enabled: challengeEnabled,
      });
      setSavedNotice(true);
      onSaved?.(updated);
    } catch {
      // Error surfaced via hook state.
    }
  };

  return (
    <div className="g-teacher-panel" role="region" aria-label="اختيار نوع تحدي المدرس">
      <div className="g-teacher-head">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <strong>اختار نوع التحدي اللي يتحط في آخر الوحدة</strong>
          <label className="inline-flex cursor-pointer select-none items-center gap-2 text-xs font-bold text-brand-text">
            <input
              type="checkbox"
              checked={challengeEnabled}
              onChange={(e) => {
                setChallengeEnabled(e.target.checked);
                setSavedNotice(false);
              }}
              className="h-4 w-4 accent-[var(--color-brand-accent)]"
            />
            <span>{challengeEnabled ? 'التحدي مفعّل' : 'التحدي معطّل'}</span>
          </label>
        </div>
        <small>التغيير بيسمّع فورًا عند الطالب في خريطة الدورة وصفحة الاختبار.</small>
      </div>

      <div className="g-teacher-grid">
        {TEACHER_CHALLENGE_PRESETS.map((t) => {
          const on = t.kind === selectedKind;
          return (
            <button
              key={t.kind}
              type="button"
              onClick={() => handleSelectPreset(t.kind)}
              className={`g-teacher-opt${on ? ' is-on' : ''}`}
            >
              <span className="g-teacher-opt-top">
                <strong>{t.label}</strong>
                <b>+{t.rewardXp} XP</b>
              </span>
              <small>{t.rule}</small>
            </button>
          );
        })}
      </div>

      <div className="g-teacher-controls">
        {quizzes && quizzes.length > 0 && (
          <div className="g-teacher-field">
            <label htmlFor="g-ch-quiz">الاختبار المستهدف</label>
            <select
              id="g-ch-quiz"
              className="g-teacher-input"
              value={quizSlug}
              onChange={(e) => {
                setQuizSlug(e.target.value);
                setSavedNotice(false);
              }}
            >
              {quizzes.map((q) => (
                <option key={q.slug} value={q.slug}>
                  {q.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="g-teacher-field">
          <label htmlFor="g-ch-mastery">نسبة الإتقان المطلوبة (٪)</label>
          <input
            id="g-ch-mastery"
            type="number"
            min={50}
            max={100}
            className="g-teacher-input"
            value={masteryPercent}
            onChange={(e) => {
              setMasteryPercent(Number(e.target.value) || 50);
              setSavedNotice(false);
            }}
          />
        </div>

        <div className="g-teacher-field">
          <label htmlFor="g-ch-xp">مكافأة التحدي (XP)</label>
          <input
            id="g-ch-xp"
            type="number"
            min={10}
            max={300}
            className="g-teacher-input"
            value={rewardXp}
            onChange={(e) => {
              setRewardXp(Number(e.target.value) || 10);
              setSavedNotice(false);
            }}
          />
        </div>
      </div>

      <div className="g-teacher-foot">
        <button
          type="button"
          className="g-btn is-accent"
          onClick={() => void handleSave()}
          disabled={isPending}
        >
          {isPending ? 'جاري الحفظ...' : 'حفظ إعدادات التحدي'}
        </button>
        {savedNotice && <span className="g-teacher-msg">تم حفظ التحدي بنجاح</span>}
        {Boolean(error) && (
          <span className="g-teacher-msg is-err">
            {error instanceof Error ? error.message : 'تعذر حفظ إعدادات التحدي'}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- points + unlocks on the quiz result page ---------- */
export function QuizAward({
  quizSlug,
  award: awardProp,
}: {
  quizSlug: string;
  award?: GamificationAward | null;
}) {
  const { enabled, latestAward } = useGamification();
  const activeAward =
    awardProp ??
    (latestAward?.kind === 'quiz' && latestAward.refId === quizSlug ? latestAward : null);
  const totalTween = useTween(activeAward?.totalGain ?? 0, 650);

  if (!enabled || !activeAward || activeAward.kind !== 'quiz') {
    return null;
  }

  const pct = activeAward.pct ?? 0;
  const mood = pct >= 80 ? 'cheer' : pct >= 50 ? 'happy' : 'neutral';
  const challenge = activeAward.challengeResult ?? 'none';
  const masteryTarget = activeAward.challengeMasteryPercent ?? 80;

  return (
    <section className="g-award" aria-label="النقط والإنجازات">
      {challenge !== 'none' && (
        <div className={`g-status is-${challenge}`}>
          <UIcon
            name={challenge === 'passed' ? 'check' : challenge === 'failed' ? 'target' : 'lock'}
          />
          {challenge === 'passed' && 'أتقنت تحدي المدرس'}
          {challenge === 'failed' &&
            `محتاج ${masteryTarget}٪ عشان تتقن التحدي. راجع الأخطاء وعيد المحاولة`}
          {challenge === 'already' && 'التحدي اتقفل قبل كده، فالنقط هنا على الإجابات بس'}
        </div>
      )}
      <div className="g-card">
        <h3>النقط اللي كسبتها</h3>
        {activeAward.lines.length === 0 ? (
          <p className="g-note">
            المحاولة دي ما زوّدتش على أحسن نتيجة ليك، فمفيش نقط جديدة. حاول تجيب أكتر.
          </p>
        ) : (
          <>
            <ul className="g-lines">
              {activeAward.lines.map((l) => (
                <li key={l.label} className={l.accent ? 'is-accent' : undefined}>
                  <span>{l.label}</span>
                  <b>+{l.value}</b>
                </li>
              ))}
            </ul>
            <div className="g-total">
              <span>المجموع</span>
              <strong>+{totalTween} XP</strong>
            </div>
          </>
        )}
        <div style={{ position: 'absolute', top: 10, insetInlineEnd: 14 }}>
          <Mascot mood={mood} size={56} />
        </div>
      </div>
      {(activeAward.unlockedBadges.length > 0 || activeAward.levelUp !== null) && (
        <div className="g-card">
          <h3>اللي اتفتح</h3>
          <ul className="g-unlocks">
            {activeAward.levelUp !== null && (
              <li>
                <Ring size={52} stroke={6} pct={100} label={`المستوى ${activeAward.levelUp}`}>
                  <span className="g-ring-num" style={{ fontSize: '1rem' }}>
                    {activeAward.levelUp}
                  </span>
                </Ring>
                <span>
                  <strong>مستوى جديد: {levelName(activeAward.levelUp)}</strong>
                  <small>اتفتح تلقائي مع النقط</small>
                </span>
              </li>
            )}
            {activeAward.unlockedBadges.map((id) => {
              const b = BADGE_DEFINITIONS.find((x) => x.id === id);
              if (!b) return null;
              return (
                <li key={id}>
                  <BadgeArt id={id} style="mascot" tone={b.tone} locked={false} size={52} />
                  <span>
                    <strong>{b.title}</strong>
                    <small>{b.how}</small>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ---------- achievements page body ---------- */
function examGradeTone(pct: number): 'perfect' | 'good' | 'low' {
  if (pct >= 90) return 'perfect';
  if (pct >= 65) return 'good';
  return 'low';
}

export function AchievementsView({
  initialSummary,
}: {
  initialSummary?: GamificationSummary | null;
} = {}) {
  const { enabled, isAuthenticated } = useGamification();
  const { data: fetchedSummary, loading } = useGamificationSummary(
    Boolean(enabled && isAuthenticated && !initialSummary),
  );
  const summary = initialSummary ?? fetchedSummary;
  const xp = useTween(summary?.hud.xp ?? 0, 650);

  if (!enabled || !isAuthenticated) {
    return null;
  }

  if (loading && !summary) {
    return (
      <div className="g-ach">
        <div className="g-card">
          <p className="g-note">جاري تحميل إنجازاتك...</p>
        </div>
      </div>
    );
  }

  if (!summary || !summary.enabled) {
    return null;
  }

  const { hud, courses, exams, badges: badgeStates, log, nextAction } = summary;
  const badgeMap = new Map(badgeStates.map((b) => [b.id, b]));
  const unlockedCount = BADGE_DEFINITIONS.filter((b) => badgeMap.get(b.id)?.unlocked).length;

  const totalVideosDone = courses.reduce((sum, c) => sum + c.completedVideos, 0);
  const totalVideosAll = courses.reduce((sum, c) => sum + c.totalVideos, 0);
  const avgExam =
    typeof summary.averageExamPct === 'number'
      ? Math.round(summary.averageExamPct)
      : exams.length > 0
        ? Math.round(exams.reduce((sum, e) => sum + e.pct, 0) / exams.length)
        : 0;

  const resume = resolveResumeTarget(nextAction);
  const resumeLabel =
    nextAction?.type === 'challenge'
      ? 'ادخل التحدي'
      : nextAction?.type === 'lesson'
        ? 'كمّل مذاكرة'
        : resume.ctaLabel;

  return (
    <div className="g-ach">
      <header className="g-ach-head">
        <div>
          <h1>إنجازاتي</h1>
          <p>كل حاجة بتتحسب لوحدها وإنت بتذاكر. هنا بتتابع تقدّم دوراتك ودرجاتك وشاراتك.</p>
        </div>
        <div className="g-ach-actions">
          <Link href={resume.href} className="g-btn is-accent">
            {resumeLabel}
            <UIcon name="arrow" />
          </Link>
        </div>
      </header>

      <section className="g-card g-sum">
        <Ring size={96} stroke={9} pct={hud.pct} label={`المستوى ${hud.level}`}>
          <span className="g-ring-num">{hud.level}</span>
        </Ring>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h2>{levelName(hud.level)}</h2>
          <p>
            {xp} XP، وباقي {hud.left} للمستوى {hud.level + 1} · {unlockedCount} من{' '}
            {BADGE_DEFINITIONS.length} شارة
          </p>
        </div>
        <div className="g-sum-st">
          <span className="g-flame g-flame-badge">
            <Currency name="flame" style="mascot" size={28} />
          </span>
          <strong>{hud.streak} يوم</strong>
          <small>{hud.doneToday ? 'سلسلتك محفوظة النهارده' : 'ذاكر درس وحافظ على السلسلة'}</small>
        </div>
      </section>

      <section className="g-academic" aria-label="تقدم الدورات ودرجات الاختبارات">
        <div className="g-card g-courses">
          <div className="g-sec-head">
            <div>
              <h3>تقدمك في الدورات</h3>
              <p className="g-sec-sub">متابعة الفيديوهات المكتملة في كل دورة</p>
            </div>
            <span className="g-sec-pill">
              {totalVideosDone} / {totalVideosAll} فيديو
            </span>
          </div>

          {courses.length === 0 ? (
            <p className="g-note">لسه مش مشترك في دورات. ابدأ بأول دورة ليك دلوقتي.</p>
          ) : (
            <ul className="g-course-list">
              {courses.map((c) => (
                <li key={c.courseSlug} className="g-course-item">
                  <div className="g-course-top">
                    <div>
                      <Link href={`/course/${c.courseSlug}`} className="g-course-title">
                        {c.title}
                      </Link>
                      <small className="g-course-meta">
                        {c.grade ? `${c.grade} · ` : ''}خلّصت {c.completedVideos} من {c.totalVideos}{' '}
                        فيديوهات
                      </small>
                    </div>
                    <span className={`g-course-pct${c.pct === 100 ? ' is-complete' : ''}`}>
                      {c.pct}٪
                    </span>
                  </div>
                  <ProgressBar
                    pct={c.pct}
                    tone={c.pct === 100 ? 'complete' : 'primary'}
                    label={`${c.title}: ${c.pct}٪`}
                  />
                </li>
              ))}
            </ul>
          )}

          <Link href="/courses" className="g-inline-link">
            عرض كل الدورات
            <UIcon name="arrow" />
          </Link>
        </div>

        <div className="g-card g-exams">
          <div className="g-sec-head">
            <div>
              <h3>درجات الاختبارات</h3>
              <p className="g-sec-sub">آخر محاولاتك ونتائج التقييم</p>
            </div>
            <span className="g-sec-pill is-accent">متوسط {avgExam}٪</span>
          </div>

          {exams.length === 0 ? (
            <p className="g-note">لسه مفيش اختبارات متصححة. خلّص أول اختبار وهتظهر نتيجتك هنا.</p>
          ) : (
            <ul className="g-exam-list">
              {exams.map((ex) => {
                const tone = examGradeTone(ex.pct);
                const examHref =
                  ex.courseSlug && ex.videoSlug
                    ? `/course/${ex.courseSlug}/video/${ex.videoSlug}/quiz`
                    : '/me/user';
                return (
                  <li key={ex.id} className="g-exam-item">
                    <div className="g-exam-top">
                      <div className="g-exam-info">
                        <Link href={examHref} className="g-exam-title">
                          {ex.title}
                        </Link>
                        <small className="g-exam-meta">
                          {ex.correct} من {ex.count} إجابات صحيحة · {ex.date}
                          {ex.isChallenge ? ' · تحدي المدرس' : ''}
                        </small>
                      </div>
                      <span className={`g-grade is-${tone}`}>{ex.pct}٪</span>
                    </div>
                    <ProgressBar pct={ex.pct} tone={tone} size="sm" />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <div className="g-badges-head">
        <h2>خزانة الشارات</h2>
        <p className="g-how">
          الشارات بتتفتح لوحدها وإنت بتذاكر ومفيش حاجة تضغط عليها. تحت كل شارة مكتوب شرطها وبتتفتح فين.
        </p>
      </div>

      <ul className="g-grid">
        {BADGE_DEFINITIONS.map((b) => {
          const state = badgeMap.get(b.id);
          const on = Boolean(state?.unlocked);
          const target = state?.target ?? b.target;
          const v = Math.min(target, state?.current ?? 0);
          const isAcc = b.tone === 'accent';
          return (
            <li
              key={b.id}
              className={`${on ? 'is-on' : 'is-locked'}${isAcc ? ' is-accent' : ''}`}
            >
              <BadgeArt id={b.id} style="mascot" tone={b.tone} locked={!on} size={78} />
              <div>
                <strong>{b.title}</strong>
                <p>{b.how}</p>
                <small>{b.where}</small>
                <span className="g-bst">{on ? 'مفتوحة' : `${v} من ${target}`}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <section className="g-card g-log">
        <h3>آخر نشاط</h3>
        {log.length === 0 ? (
          <p className="g-note">لسه مفيش نشاط جديد. خلّص درس أو اختبار وهتلاقيه هنا.</p>
        ) : (
          <ul>
            {log.map((l) => (
              <li key={l.id}>
                <span>{l.label}</span>
                <b>+{l.gain} XP</b>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
