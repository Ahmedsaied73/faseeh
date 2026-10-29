import type { Metadata } from 'next';
import { CourseCatalog } from '@/components/course-catalog';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: `الدورات التعليمية — ${siteConfig.subjectName}`,
  description: `تصفح جميع دورات ${siteConfig.subjectName} — ${siteConfig.tagline}`,
};

export default function CoursesPage() {
  return <CourseCatalog />;
}
