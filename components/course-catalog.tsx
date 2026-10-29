'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { CourseListItem, fetchAllCourses } from '@/services/courseService';
import { Reveal } from '@/components/reveal';

const FILTERS = ['الكل', 'مجاني', 'مدفوع'] as const;
type Filter = (typeof FILTERS)[number];

function isFree(c: CourseListItem): boolean {
  return !c.price || c.price <= 0;
}

const GRADE_LABELS: Record<string, string> = {
  FIRST_SECONDARY: 'الصف الأول الثانوي',
  SECOND_SECONDARY: 'الصف الثاني الثانوي',
  THIRD_SECONDARY: 'الصف الثالث الثانوي',
};

function formatGrade(grade?: string | null): string {
  if (!grade) return 'دورة تعليمية';
  return GRADE_LABELS[grade] || grade;
}

function isValidThumbnail(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.includes('placeholder.com')) return false;
  if (trimmed.includes('via.placeholder')) return false;
  return true;
}

function CourseCardThumbnail({
  thumbnail,
  title,
  grade,
}: {
  thumbnail?: string;
  title: string;
  grade?: string;
}) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [thumbnail]);

  const showImage = !imageError && isValidThumbnail(thumbnail);

  return (
    <div className="relative flex h-40 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-brand-primary to-brand-secondary">
      {showImage ? (
        <>
          <Image
            src={thumbnail!}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
            onError={() => setImageError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 pointer-events-none" />
        </>
      ) : (
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" className="text-white/90">
          <path d="M4 5.5C6.5 4.2 9 4 12 5v14c-3-1-5.5-.8-8 .5V5.5Z" stroke="currentColor" strokeWidth="1.4" />
          <path d="M20 5.5C17.5 4.2 15 4 12 5v14c3-1 5.5-.8 8 .5V5.5Z" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )}
      <span className="absolute top-3 start-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-brand-primary shadow-sm backdrop-blur-xs">
        {formatGrade(grade)}
      </span>
    </div>
  );
}

export function CourseCatalog() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Filter>('الكل');
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchAllCourses().then((result) => setCourses(result.data)).catch(() => setCourses([])).finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    let list = courses;
    if (active === 'مجاني') list = list.filter(isFree);
    else if (active === 'مدفوع') list = list.filter((c) => !isFree(c));
    const q = query.trim();
    if (q) list = list.filter((c) => c.title.includes(q) || (c.description ?? '').includes(q) || (c.grade ?? '').includes(q));
    return list;
  }, [courses, active, query]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Reveal className="text-center">
        <h1 className="text-2xl font-extrabold text-brand-text sm:text-3xl">الدورات المتاحة</h1>
        <p className="mt-2 text-brand-muted">اختر دورتك وابدأ التعلم بخطوات واضحة.</p>
      </Reveal>

      <Reveal delayMs={60} className="mx-auto mt-8 max-w-lg">
        <div className="flex items-center gap-2 rounded-full border border-brand-border bg-brand-surface px-4 py-2.5 shadow-sm transition focus-within:border-brand-primary/50">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-brand-muted" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            placeholder="ابحث عن دورة بالاسم أو الوصف…"
            className="w-full bg-transparent text-sm text-brand-muted-strong outline-none placeholder:text-brand-muted"
          />
        </div>
      </Reveal>

      <Reveal delayMs={80} className="mt-5 flex flex-wrap justify-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActive(f)}
            className={
              'rounded-full border px-4 py-1.5 text-sm font-medium transition ' +
              (active === f
                ? 'border-brand-primary bg-brand-primary text-white'
                : 'border-brand-border bg-brand-surface text-brand-muted-strong hover:border-brand-primary/40')
            }
          >
            {f}
          </button>
        ))}
      </Reveal>

      {loading ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="جارٍ تحميل الدورات">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-80 animate-pulse rounded-xl bg-brand-chip" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Reveal className="mt-14 text-center text-sm text-brand-muted">
          لا توجد دورات مطابقة لبحثك. جرّب كلمة مختلفة أو اختر تصنيفًا آخر.
        </Reveal>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((course, i) => (
            <Reveal key={course.slug} delayMs={i * 70}>
              <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-brand-border bg-brand-surface transition hover:-translate-y-0.5 hover:shadow-md">
                <CourseCardThumbnail
                  thumbnail={course.thumbnail}
                  title={course.title}
                  grade={course.grade}
                />
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-base font-bold text-brand-text">{course.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-brand-muted">
                    {course.description || 'محتوى تعليمي منظم لمساعدتك على التقدم بثقة.'}
                  </p>
                  <div className="mt-5 flex items-center justify-between border-t border-brand-border pt-4">
                    <span className={'text-sm font-bold ' + (isFree(course) ? 'text-emerald-600' : 'text-brand-muted-strong')}>
                      {isFree(course) ? 'مجاني' : `${course.price} جنيه`}
                    </span>
                    <Link
                      href={`/course/${course.slug}`}
                      className="text-sm font-semibold text-brand-primary hover:underline"
                    >
                      عرض الدورة
                    </Link>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
