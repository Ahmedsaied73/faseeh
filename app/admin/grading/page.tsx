'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getAdminAttemptResult, gradeQuizAttempt, listAllAdminAttempts } from '@/services/adminQuizService';
import type { AdminGlobalAttempt } from '@/types/admin';
import type { EssayResultQuestion, QuizResultData } from '@/types/quiz';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTitle } from '@/components/page-title';
import { adminTitle } from '@/lib/page-titles';
import { RichView } from '@/components/rich/RichView';

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return 'الآن';
  if (diffMinutes < 60) return `منذ ${diffMinutes.toLocaleString('ar-EG')} دقيقة`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `منذ ${diffHours.toLocaleString('ar-EG')} ساعة`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'أمس';
  return `منذ ${diffDays.toLocaleString('ar-EG')} أيام`;
}

export default function AdminGradingPage() {
  const [attempts, setAttempts] = useState<AdminGlobalAttempt[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [result, setResult] = useState<QuizResultData | null>(null);
  const [resultLoading, setResultLoading] = useState(false);

  // Active question index in the essay questions array
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Scores and feedback mapped by question name: { [qName]: number | string }
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const [approvedIds, setApprovedIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadAttempts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAllAdminAttempts({
        status: 'GRADING',
        limit: 50,
      });
      setAttempts(res.data);
      setTotal(res.meta.total);
      if (res.data.length > 0 && selectedId === null) {
        setSelectedId(res.data[0].id);
      }
    } catch {
      setError('تعذر تحميل محاولات صندوق التصحيح.');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void loadAttempts();
  }, [loadAttempts]);

  // Load result details when selectedId changes
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    async function loadResult() {
      setResultLoading(true);
      try {
        const data = await getAdminAttemptResult(selectedId!);
        if (!cancelled) {
          setResult(data);
          setActiveQuestionIndex(0);

          // Extract all essay questions from the attempt
          const essays = (data.questions || []).filter(
            (q): q is EssayResultQuestion =>
              q.type === 'comment' || (q as { type: string }).type === 'richanswer'
          );

          const initialScores: Record<string, number> = {};
          const initialNotes: Record<string, string> = {};

          for (const q of essays) {
            const hasAnswer = Boolean(q.studentAnswer && q.studentAnswer.trim() !== '');

            if (q.earnedPoints != null) {
              initialScores[q.name] = q.earnedPoints;
            } else if (!hasAnswer) {
              // Unanswered question defaults to 0
              initialScores[q.name] = 0;
            } else {
              // Answered question defaults to AI suggestion if present, or ~80% of max
              const maxPts = q.maxPoints || 5;
              initialScores[q.name] = Math.round(maxPts * 0.8);
            }

            if (q.feedback) {
              initialNotes[q.name] = q.feedback;
            }
          }

          setScores(initialScores);
          setNotes(initialNotes);
        }
      } catch {
        if (!cancelled) {
          toast.error('تعذر تحميل تفاصيل المحاولة.');
        }
      } finally {
        if (!cancelled) setResultLoading(false);
      }
    }

    void loadResult();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selectedAttempt = useMemo(
    () => attempts.find((a) => a.id === selectedId),
    [attempts, selectedId]
  );

  // Extract all essay questions for this student attempt
  const essayQuestions = useMemo(() => {
    if (!result?.questions) return [];
    return result.questions.filter(
      (q): q is EssayResultQuestion =>
        q.type === 'comment' || (q as { type: string }).type === 'richanswer'
    );
  }, [result]);

  const currentQuestion = useMemo(() => {
    if (essayQuestions.length === 0) return null;
    const clampedIndex = Math.min(Math.max(0, activeQuestionIndex), essayQuestions.length - 1);
    return essayQuestions[clampedIndex] || null;
  }, [essayQuestions, activeQuestionIndex]);

  const isApproved = selectedId ? approvedIds.includes(selectedId) : false;
  const maxScore = currentQuestion?.maxPoints || 5;

  const hasStudentAnswer = Boolean(
    currentQuestion?.studentAnswer && currentQuestion.studentAnswer.trim() !== ''
  );

  // AI suggestion calculation for active question
  const aiSuggested =
    currentQuestion?.earnedPoints != null
      ? currentQuestion.earnedPoints
      : hasStudentAnswer
      ? Math.round(maxScore * 0.8)
      : 0;

  const aiConfidence =
    currentQuestion?.confidence && currentQuestion.confidence >= 0.8
      ? 'عالية'
      : 'متوسطة';

  const currentScore =
    currentQuestion && scores[currentQuestion.name] !== undefined
      ? scores[currentQuestion.name]
      : aiSuggested;

  const currentNote = currentQuestion ? notes[currentQuestion.name] || '' : '';

  // Summary counts
  const totalEssayMax = useMemo(() => {
    return essayQuestions.reduce((sum, q) => sum + (q.maxPoints || 5), 0);
  }, [essayQuestions]);

  const totalEssayEarned = useMemo(() => {
    return essayQuestions.reduce((sum, q) => sum + (scores[q.name] ?? 0), 0);
  }, [essayQuestions, scores]);

  const handleApproveGrading = async () => {
    if (!selectedId || essayQuestions.length === 0) return;

    // Validate that every essay question has a valid numeric score
    const finalEssayScores: Record<string, number> = {};
    const finalEssayFeedback: Record<string, string> = {};

    for (let i = 0; i < essayQuestions.length; i++) {
      const q = essayQuestions[i];
      const val = scores[q.name];
      const maxPts = q.maxPoints || 5;

      if (val === undefined || Number.isNaN(val) || val < 0 || val > maxPts) {
        toast.error(`يرجى تحديد درجة صحيحة (بين 0 و ${maxPts}) للسؤال رقم ${i + 1}`);
        setActiveQuestionIndex(i);
        return;
      }

      finalEssayScores[q.name] = val;
      if (notes[q.name] && notes[q.name].trim()) {
        finalEssayFeedback[q.name] = notes[q.name].trim();
      }
    }

    setSubmitting(true);
    try {
      await gradeQuizAttempt(selectedId, {
        essayScores: finalEssayScores,
        essayFeedback: Object.keys(finalEssayFeedback).length > 0 ? finalEssayFeedback : undefined,
      });

      toast.success('تم اعتماد تصحيح جميع الأسئلة المقالية بنجاح.');
      setApprovedIds((prev) => [...prev, selectedId]);

      // Refresh attempts list
      const res = await listAllAdminAttempts({ status: 'GRADING', limit: 50 });
      setAttempts(res.data);
      setTotal(res.meta.total);

      // Select next attempt if available
      const nextAttempt = res.data.find((a) => a.id !== selectedId);
      if (nextAttempt) {
        setSelectedId(nextAttempt.id);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل اعتماد التصحيح.');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = attempts.filter((a) => !approvedIds.includes(a.id)).length;

  return (
    <>
      <PageTitle title={adminTitle('تصحيح المقالي')} />
      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-8 sm:py-8">
        {/* Header matching design */}
        <div className="mb-6">
          <h1 className="text-lg font-extrabold sm:text-xl text-brand-text">صندوق تصحيح المقالي</h1>
          <p className="mt-1 text-sm text-brand-muted">
            {pendingCount.toLocaleString('ar-EG')} محاولة بانتظار الاعتماد — اختر الطالب وتنقّل بين كافة إجاباته المقالية لاعتماد التصحيح بدقة.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-brand-accent/30 bg-brand-accent/10 p-4 text-xs font-semibold text-brand-accent">
            {error}
          </div>
        )}

        {/* 2-Column Layout */}
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Right Column: Attempt Queue */}
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:block lg:space-y-2 lg:px-0 lg:pb-0">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-64 shrink-0 rounded-xl border border-brand-border bg-brand-surface p-3 lg:w-full">
                  <Skeleton className="h-4 w-28 bg-brand-chip" />
                  <Skeleton className="mt-2 h-3 w-40 bg-brand-chip" />
                </div>
              ))
            ) : attempts.length === 0 ? (
              <p className="py-8 text-center text-xs text-brand-muted">
                لا توجد محاولات بانتظار التصحيح حالياً.
              </p>
            ) : (
              attempts.map((a) => {
                const done = approvedIds.includes(a.id);
                const active = a.id === selectedId;

                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    className={
                      'w-64 shrink-0 rounded-xl border-s-2 px-4 py-3 text-start transition lg:w-full ' +
                      (active
                        ? 'border-s-brand-primary bg-brand-primary/5 shadow-sm'
                        : 'border-s-transparent bg-brand-surface hover:bg-brand-hover')
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-brand-text">{a.student.name}</p>
                      {done ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                          معتمد
                        </span>
                      ) : (
                        <span className="rounded-full bg-brand-accent/10 px-2 py-0.5 text-xs font-bold text-brand-accent">
                          بانتظار
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-brand-muted">
                      {a.quizTitle || 'اختبار'}
                    </p>
                    <p className="mt-1 text-xs text-brand-muted">
                      {formatRelativeTime(a.submittedAt || a.startedAt)}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          {/* Left Column: Grading Details & Multiple Questions Navigation */}
          <div className="rounded-2xl border border-brand-border bg-brand-surface p-4 shadow-sm sm:p-6">
            {resultLoading ? (
              <div className="space-y-4 py-8">
                <Skeleton className="h-4 w-32 bg-brand-chip" />
                <Skeleton className="h-6 w-3/4 bg-brand-chip" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Skeleton className="h-28 w-full rounded-xl bg-brand-chip" />
                  <Skeleton className="h-28 w-full rounded-xl bg-brand-chip" />
                </div>
              </div>
            ) : !selectedAttempt || !currentQuestion ? (
              <p className="py-16 text-center text-sm text-brand-muted">
                {attempts.length === 0
                  ? 'صندوق التصحيح فارغ حالياً — كل شيء مصحح!'
                  : 'إجابة الطالب لم تُسجَّل لهذه المحاولة أو لا يوجد سؤال مقالي.'}
              </p>
            ) : (
              <>
                {/* Question Navigation Bar (Tabs/Pills for all essay questions) */}
                {essayQuestions.length > 0 && (
                  <div className="mb-5 border-b border-brand-border pb-4">
                    <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-brand-muted">
                        الأسئلة المقالية ({activeQuestionIndex + 1} من {essayQuestions.length}):
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={activeQuestionIndex === 0}
                          onClick={() => setActiveQuestionIndex((i) => Math.max(0, i - 1))}
                          className="rounded-lg border border-brand-border px-2.5 py-1 text-xs font-bold text-brand-text transition hover:bg-brand-hover disabled:opacity-30"
                        >
                          ← السابق
                        </button>
                        <button
                          type="button"
                          disabled={activeQuestionIndex >= essayQuestions.length - 1}
                          onClick={() => setActiveQuestionIndex((i) => Math.min(essayQuestions.length - 1, i + 1))}
                          className="rounded-lg border border-brand-border px-2.5 py-1 text-xs font-bold text-brand-text transition hover:bg-brand-hover disabled:opacity-30"
                        >
                          التالي →
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {essayQuestions.map((q, idx) => {
                        const isActive = idx === activeQuestionIndex;
                        const score = scores[q.name];
                        const answered = Boolean(q.studentAnswer && q.studentAnswer.trim() !== '');

                        return (
                          <button
                            key={q.name}
                            type="button"
                            onClick={() => setActiveQuestionIndex(idx)}
                            className={
                              'relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ' +
                              (isActive
                                ? 'bg-brand-primary text-white shadow-sm ring-2 ring-brand-primary/20'
                                : 'border border-brand-border bg-brand-bg text-brand-text hover:bg-brand-hover')
                            }
                          >
                            <span>سؤال {idx + 1}</span>
                            {score !== undefined ? (
                              <span
                                className={
                                  'rounded px-1.5 py-0.5 text-[10px] font-mono ' +
                                  (isActive
                                    ? 'bg-white/20 text-white'
                                    : 'bg-brand-chip text-brand-text')
                                }
                              >
                                {score}/{q.maxPoints || 5}
                              </span>
                            ) : (
                              <span
                                className={
                                  'h-1.5 w-1.5 rounded-full ' +
                                  (answered ? 'bg-amber-500' : 'bg-slate-300')
                                }
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Question Info Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-brand-primary">
                    {selectedAttempt.quizTitle || 'اختبار'} • سؤال {activeQuestionIndex + 1} من {essayQuestions.length}
                  </p>
                  <span className="rounded-full bg-brand-chip px-2.5 py-0.5 text-xs font-bold text-brand-muted">
                    الدرجة القصوى: {maxScore} درجات
                  </span>
                </div>

                {/* Question Prompt Title rendered via RichView */}
                <div className="mt-2 text-base font-bold leading-relaxed text-brand-text">
                  <RichView value={(currentQuestion as { title?: string }).title || currentQuestion.name} />
                </div>

                {/* Answers Comparison Cards */}
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-xs font-bold text-brand-muted">إجابة الطالب</p>
                      {!hasStudentAnswer && (
                        <span className="rounded bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">
                          فارغ (لم يجب)
                        </span>
                      )}
                    </div>
                    <div className="min-h-[120px] rounded-xl border border-brand-border/60 bg-brand-bg p-4 text-sm leading-relaxed text-brand-text">
                      {hasStudentAnswer ? (
                        <RichView value={currentQuestion.studentAnswer} numbered />
                      ) : (
                        <span className="italic text-brand-muted">لم يكتب الطالب إجابة لهذا السؤال.</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-bold text-brand-muted">الإجابة النموذجية المعتمدة</p>
                    <div className="min-h-[120px] rounded-xl border border-brand-border/60 bg-brand-bg/50 p-4 text-sm leading-relaxed text-brand-text">
                      {currentQuestion.modelAnswer ? (
                        <RichView value={currentQuestion.modelAnswer} numbered />
                      ) : (
                        <span className="italic text-brand-muted">لا توجد إجابة نموذجية مسجلة.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Suggestion Box */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border-s-2 border-s-brand-secondary bg-brand-secondary/5 px-4 py-3">
                  <div>
                    <p className="text-xs font-bold text-brand-secondary">اقتراح الذكاء الاصطناعي</p>
                    <p className="mt-0.5 text-sm text-brand-text">
                      درجة مقترحة:{' '}
                      <span className="font-extrabold">
                        {aiSuggested} / {maxScore}
                      </span>
                      <span className="ms-2 text-xs text-brand-muted">ثقة {aiConfidence}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentQuestion) {
                        setScores((s) => ({ ...s, [currentQuestion.name]: aiSuggested }));
                      }
                    }}
                    className="rounded-full border border-brand-secondary px-3.5 py-1.5 text-xs font-bold text-brand-secondary transition hover:bg-brand-secondary/10"
                  >
                    قبول الاقتراح ({aiSuggested}/{maxScore})
                  </button>
                </div>

                {/* Score & Notes Form */}
                <div className="mt-5 flex flex-wrap items-end gap-4 rounded-xl border border-brand-border bg-brand-surface p-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-brand-text">
                      درجة السؤال {activeQuestionIndex + 1}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={maxScore}
                        value={currentScore}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (currentQuestion) {
                            setScores((s) => ({
                              ...s,
                              [currentQuestion.name]: Math.min(maxScore, Math.max(0, val)),
                            }));
                          }
                        }}
                        className="w-24 rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-center text-sm font-bold text-brand-text outline-none focus:border-brand-primary"
                      />
                      <span className="text-sm font-semibold text-brand-muted">/ {maxScore}</span>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <label className="mb-1.5 block text-xs font-bold text-brand-text">
                      ملاحظات وتوجيهات الطالب لهذا السؤال (اختياري)
                    </label>
                    <input
                      value={currentNote}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (currentQuestion) {
                          setNotes((n) => ({ ...n, [currentQuestion.name]: val }));
                        }
                      }}
                      placeholder="مثال: أحسنت، راجع خطوات الاشتقاق أو إشارة الحد الأخير"
                      className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary"
                    />
                  </div>
                </div>

                {/* Bottom Action & Submit Bar */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-brand-border pt-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-brand-chip px-3 py-1.5 text-xs font-bold text-brand-text">
                      إجمالي درجات المقالي:{' '}
                      <span className="font-extrabold text-brand-primary font-mono">
                        {totalEssayEarned} / {totalEssayMax}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={activeQuestionIndex === 0}
                        onClick={() => setActiveQuestionIndex((i) => Math.max(0, i - 1))}
                        className="rounded-lg border border-brand-border px-3 py-1.5 text-xs font-bold text-brand-text transition hover:bg-brand-hover disabled:opacity-40"
                      >
                        ← السؤال السابق
                      </button>
                      <button
                        type="button"
                        disabled={activeQuestionIndex >= essayQuestions.length - 1}
                        onClick={() => setActiveQuestionIndex((i) => Math.min(essayQuestions.length - 1, i + 1))}
                        className="rounded-lg border border-brand-border px-3 py-1.5 text-xs font-bold text-brand-text transition hover:bg-brand-hover disabled:opacity-40"
                      >
                        السؤال التالي →
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApproveGrading}
                    disabled={isApproved || submitting}
                    className={
                      'w-full rounded-full px-6 py-2.5 text-sm font-bold shadow-sm transition sm:w-auto ' +
                      (isApproved
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50')
                    }
                  >
                    {submitting
                      ? 'جارٍ اعتماد درجات كافة الأسئلة...'
                      : isApproved
                      ? 'تم اعتماد التصحيح بنجاح ✓'
                      : `اعتماد تصحيح الـ ${essayQuestions.length} أسئلة وإنهاء المحاولة`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
