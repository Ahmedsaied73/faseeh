'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowLeft, Clock, BookOpenCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getEnrolledCourses } from '@/services/courseService';
import { CourseListItem } from '@/services/courseService';
import { PageTitle } from '@/components/page-title';
import { withTeacher } from '@/lib/site-config';
import { PAGE_TITLES } from '@/lib/page-titles';

const GRADE_LABELS: Record<string, string> = {
  FIRST_SECONDARY: 'الأول الثانوي',
  SECOND_SECONDARY: 'الثاني الثانوي',
  THIRD_SECONDARY: 'الثالث الثانوي',
};

function formatGrade(grade?: string | null): string {
  if (!grade) return 'دورة تعليمية';
  return GRADE_LABELS[grade] || grade;
}

function EnrolledCourseThumbnail({ thumbnail, title }: { thumbnail?: string; title?: string }) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [thumbnail]);

  const showImage = !imageError && Boolean(
    thumbnail &&
    typeof thumbnail === 'string' &&
    thumbnail.trim() &&
    !thumbnail.includes('placeholder.com') &&
    !thumbnail.includes('via.placeholder')
  );

  return (
    <div className="relative w-full h-40 mb-4 overflow-hidden rounded-md bg-gradient-to-br from-brand-primary to-brand-secondary group flex items-center justify-center">
      {showImage ? (
        <Image 
          src={thumbnail!} 
          alt={title || 'Course'} 
          fill 
          unoptimized
          className="object-cover transition-transform group-hover:scale-105" 
          onError={() => setImageError(true)}
        />
      ) : (
        <BookOpen className="h-10 w-10 text-white/80" />
      )}
    </div>
  );
}

export default function UserCoursesPage() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      try {
        const data = await getEnrolledCourses();
        setCourses(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error('خطأ في جلب الكورسات المسجلة:', err);
        setError(err.message || 'حدث خطأ أثناء جلب الكورسات المسجلة');
      } finally {
        setLoading(false);
      }
    };

    fetchEnrolledCourses();
  }, []);

  return (
    <div className="account-page">
      <PageTitle title={withTeacher(PAGE_TITLES.courses)} />
      {/* Header with courses icon */}
      <div className="flex flex-col items-center justify-center mb-8">
        <div className="bg-primary-color rounded-full p-3 mb-2">
          <BookOpen className="text-on-surface h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-on-surface text-center">كورساتي</h1>
      </div>

      {/* Back to profile button */}
      <div className="mb-6">
        <Link href="/me/user">
          <Button variant="outline" className="text-on-surface border-outline-variant hover:bg-surface-container-low">
            <ArrowLeft className="mr-2 h-4 w-4" />
            العودة إلى ملف المستخدم
          </Button>
        </Link>
      </div>

      {/* Courses list */}
      <Card className="shadow-level-2 text-on-surface">
        <CardHeader>
          <CardTitle className="text-center">
            <span className="text-primary-color">★</span> الكورسات المسجلة <span className="text-primary-color">★</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10">
              <p className="text-xl">جاري تحميل الكورسات...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-xl text-error">حدث خطأ</p>
              <p className="text-on-surface-variant mt-2">{error}</p>
            </div>
          ) : courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Link href={`/course/${course.slug}`} key={course.slug}>
                  <div className="bg-surface-container rounded-lg p-4 h-full hover:bg-surface-container transition-colors cursor-pointer">
                    <EnrolledCourseThumbnail thumbnail={course.thumbnail} title={course.title} />
                    <h3 className="text-xl font-bold mb-2 text-primary-color line-clamp-1">{course.title}</h3>
                    <p className="text-on-surface-variant mb-3 line-clamp-2 h-12">{course.description}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center text-on-surface-variant">
                        <Clock className="h-4 w-4 ml-1" />
                        <span>{course.price && course.price > 0 ? `${course.price} ج.م` : 'مجاني'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center text-on-surface-variant">
                          <BookOpenCheck className="h-4 w-4 ml-1" />
                          <span className="text-sm">{formatGrade(course.grade)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-xl">لا يوجد كورسات مسجلة حالياً</p>
              <p className="text-on-surface-variant mt-2">يمكنك التسجيل في الكورسات من صفحة الكورسات الرئيسية</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}