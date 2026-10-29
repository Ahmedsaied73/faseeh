'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, Film, HelpCircle, ListChecks, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { PageTitle } from '@/components/page-title';
import { adminTitle } from '@/lib/page-titles';
import { getAdminCourses } from '@/services/adminCoursesService';
import { getCourseVideos } from '@/services/adminVideoService';
import QuizAuthoringForm from '@/components/admin/quiz/QuizAuthoringForm';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdminCourse } from '@/types/admin';
import type { BunnyVideo } from '@/types/bunny';
import type { StudentSafeQuiz } from '@/types/quiz';

const GRADE_LABELS: Record<string, string> = {
  FIRST_SECONDARY: 'الصف الأول الثانوي',
  SECOND_SECONDARY: 'الصف الثاني الثانوي',
  THIRD_SECONDARY: 'الصف الثالث الثانوي',
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function AddQuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const paramCourse = searchParams?.get('course') || '';
  const paramVideo = searchParams?.get('video') || '';

  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseError, setCourseError] = useState<string | null>(null);

  const [selectedCourseSlug, setSelectedCourseSlug] = useState<string>(paramCourse);
  const [videos, setVideos] = useState<BunnyVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const [selectedVideoSlug, setSelectedVideoSlug] = useState<string>(paramVideo);

  // Load all courses
  const loadCourses = useCallback(async () => {
    setLoadingCourses(true);
    setCourseError(null);
    try {
      const res = await getAdminCourses({ limit: 100 });
      setCourses(res.data);

      // If video was provided without course, search courses to find its parent course
      if (paramVideo && !paramCourse) {
        for (const c of res.data) {
          if (c._count?.videos > 0) {
            try {
              const vids = await getCourseVideos(c.slug);
              if (vids.some((v) => v.slug === paramVideo)) {
                setSelectedCourseSlug(c.slug);
                setVideos(vids);
                setSelectedVideoSlug(paramVideo);
                router.replace(`/admin/quizzes/new?course=${c.slug}&video=${paramVideo}`, { scroll: false });
                return;
              }
            } catch {
              // continue search
            }
          }
        }
      }
    } catch {
      setCourseError('تعذر تحميل الدورات التدريبية.');
    } finally {
      setLoadingCourses(false);
    }
  }, [paramVideo, paramCourse, router]);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  // When selectedCourseSlug changes, load its videos
  useEffect(() => {
    if (!selectedCourseSlug) {
      setVideos([]);
      setSelectedVideoSlug('');
      return;
    }

    let isMounted = true;
    setLoadingVideos(true);
    setVideoError(null);

    getCourseVideos(selectedCourseSlug)
      .then((vids) => {
        if (!isMounted) return;
        setVideos(vids);
        setSelectedVideoSlug((prev) => {
          if (prev && vids.some((v) => v.slug === prev)) return prev;
          if (paramVideo && vids.some((v) => v.slug === paramVideo)) return paramVideo;
          return '';
        });
      })
      .catch(() => {
        if (!isMounted) return;
        setVideoError('تعذر تحميل فيديوهات هذه الدورة.');
        setVideos([]);
      })
      .finally(() => {
        if (isMounted) setLoadingVideos(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCourseSlug, paramVideo]);

  const handleCourseChange = (courseSlug: string) => {
    setSelectedCourseSlug(courseSlug);
    setSelectedVideoSlug('');
    if (courseSlug) {
      router.replace(`/admin/quizzes/new?course=${encodeURIComponent(courseSlug)}`, { scroll: false });
    } else {
      router.replace('/admin/quizzes/new', { scroll: false });
    }
  };

  const handleVideoChange = (videoSlug: string) => {
    setSelectedVideoSlug(videoSlug);
    if (videoSlug && selectedCourseSlug) {
      router.replace(
        `/admin/quizzes/new?course=${encodeURIComponent(selectedCourseSlug)}&video=${encodeURIComponent(videoSlug)}`,
        { scroll: false }
      );
    } else if (selectedCourseSlug) {
      router.replace(`/admin/quizzes/new?course=${encodeURIComponent(selectedCourseSlug)}`, { scroll: false });
    }
  };

  const handleQuizSaved = (savedQuiz: StudentSafeQuiz) => {
    toast.success('تم حفظ الاختبار بنجاح!');
    setVideos((prev) =>
      prev.map((v) => (v.slug === selectedVideoSlug ? { ...v, quizSlug: savedQuiz.slug } : v))
    );
  };

  const selectedCourse = useMemo(
    () => courses.find((c) => c.slug === selectedCourseSlug),
    [courses, selectedCourseSlug]
  );

  const selectedVideo = useMemo(
    () => videos.find((v) => v.slug === selectedVideoSlug),
    [videos, selectedVideoSlug]
  );

  return (
    <main className="mx-auto max-w-5xl px-3 py-4 sm:px-8 sm:py-8">
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Link
          href="/admin/quizzes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-muted hover:text-brand-text transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
          العودة إلى قائمة الاختبارات
        </Link>
      </div>

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl text-brand-text">إضافة / إعداد اختبار</h1>
          <p className="mt-1 text-sm text-brand-muted">
            اختر الدورة التدريبية والمحاضرة (الفيديو) لإنشاء اختبار جديد أو تعديل اختباره الحالي.
          </p>
        </div>
      </div>

      {/* Step 1: Selection Card */}
      <section className="mt-6 rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-brand-border pb-4">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-brand-primary" />
            <h2 className="text-base font-bold text-brand-text">تحديد المحاضرة والدورة</h2>
          </div>
          <button
            type="button"
            onClick={() => void loadCourses()}
            disabled={loadingCourses}
            title="تحديث قائمة الدورات"
            className="inline-flex items-center gap-1 rounded-lg border border-brand-border px-2.5 py-1 text-xs font-semibold text-brand-muted hover:text-brand-text hover:bg-brand-hover transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingCourses ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {/* Course select */}
          <div>
            <label htmlFor="course-select" className="block text-xs font-semibold text-brand-text mb-1.5">
              الدورة التدريبية *
            </label>
            {loadingCourses ? (
              <Skeleton className="h-10 w-full rounded-lg bg-brand-chip" />
            ) : courses.length === 0 ? (
              <div className="rounded-lg border border-brand-border bg-brand-bg p-2.5 text-xs text-brand-muted">
                لا توجد دورات تدريبية بعد.{' '}
                <Link href="/admin/courses" className="font-bold text-brand-primary underline">
                  أضف دورة تدريبية من هنا
                </Link>
              </div>
            ) : (
              <select
                id="course-select"
                value={selectedCourseSlug}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              >
                <option value="">-- اختر الدورة التدريبية --</option>
                {courses.map((c) => {
                  const gradeText = GRADE_LABELS[c.grade] || c.grade || '';
                  const countVideos = c._count?.videos ?? 0;
                  return (
                    <option key={c.slug} value={c.slug}>
                      {c.title} ({gradeText}) — {countVideos} فيديو
                    </option>
                  );
                })}
              </select>
            )}
            {courseError && (
              <p className="mt-1.5 text-xs font-medium text-brand-accent">{courseError}</p>
            )}
          </div>

          {/* Video select */}
          <div>
            <label htmlFor="video-select" className="block text-xs font-semibold text-brand-text mb-1.5">
              المحاضرة / الفيديو *
            </label>
            {!selectedCourseSlug ? (
              <select
                id="video-select"
                disabled
                className="w-full rounded-lg border border-brand-border bg-brand-bg/60 px-3 py-2 text-sm text-brand-muted outline-none cursor-not-allowed"
              >
                <option>يرجى اختيار الدورة أولاً</option>
              </select>
            ) : loadingVideos ? (
              <Skeleton className="h-10 w-full rounded-lg bg-brand-chip" />
            ) : videos.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                لا توجد فيديوهات في هذه الدورة بعد.{' '}
                <Link
                  href={`/admin/courses/${selectedCourseSlug}/videos`}
                  className="font-bold underline hover:text-amber-950"
                >
                  أضف فيديو من هنا
                </Link>
              </div>
            ) : (
              <select
                id="video-select"
                value={selectedVideoSlug}
                onChange={(e) => handleVideoChange(e.target.value)}
                className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              >
                <option value="">-- اختر المحاضرة --</option>
                {videos.map((v) => {
                  const hasQuiz = Boolean(v.quizSlug);
                  const duration = formatDuration(v.duration);
                  const pos = v.position != null ? `#${v.position} ` : '';
                  return (
                    <option key={v.slug} value={v.slug}>
                      {pos}{v.title} ({duration}) {hasQuiz ? '— [يوجد اختبار بالفعل]' : '— [متاح لاختبار جديد]'}
                    </option>
                  );
                })}
              </select>
            )}
            {videoError && (
              <p className="mt-1.5 text-xs font-medium text-brand-accent">{videoError}</p>
            )}
          </div>
        </div>

        {/* Selected video notice */}
        {selectedVideo && (
          <div className="mt-4 pt-4 border-t border-brand-border">
            {selectedVideo.quizSlug ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-bold">تنبيه: هذا الفيديو مرتبط باختبار مسبقاً</p>
                  <p className="mt-0.5 text-amber-800">
                    يمكنك تعديل أسئلة الاختبار أدناه وتحديث نسب النجاح ومدة الاختبار. حفظ النموذج سيقوم بتحديث الاختبار الحالي.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>هذا الفيديو متاح حالياً بدون اختبار — اكتب أسئلة الاختبار أدناه لإنشائه.</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Step 2: Quiz Authoring Form or Empty Guidance State */}
      <section className="mt-8">
        {selectedVideoSlug && selectedVideo ? (
          <div className="space-y-4">
            <QuizAuthoringForm
              key={selectedVideoSlug}
              videoSlug={selectedVideoSlug}
              videoTitle={selectedVideo.title}
              courseTitle={selectedCourse?.title}
              onSuccess={handleQuizSaved}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-brand-border bg-brand-surface/40 p-10 sm:p-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
              <ListChecks className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-bold text-brand-text">اختر الدورة والمحاضرة أولاً</h3>
            <p className="mt-1.5 text-sm text-brand-muted max-w-md mx-auto">
              يرجى اختيار الدورة التدريبية ثم تحديد المحاضرة (الفيديو) من القائمة أعلاه لعرض محرر أسئلة الاختبار والبدء في وضع الخيارات والإجابات النموذجية.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

export default function AdminNewQuizPage() {
  return (
    <>
      <PageTitle title={adminTitle('إضافة / إعداد اختبار')} />
      <Suspense
        fallback={
          <main className="mx-auto max-w-5xl px-4 py-8">
            <Skeleton className="h-8 w-48 bg-brand-chip mb-6" />
            <Skeleton className="h-40 w-full rounded-2xl bg-brand-chip mb-8" />
            <Skeleton className="h-64 w-full rounded-2xl bg-brand-chip" />
          </main>
        }
      >
        <AddQuizContent />
      </Suspense>
    </>
  );
}
