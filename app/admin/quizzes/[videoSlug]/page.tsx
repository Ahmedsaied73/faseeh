import { redirect } from 'next/navigation';

export default function AdminQuizAuthoringPage({ params }: { params: { videoSlug: string } }) {
  redirect(`/admin/quizzes/new?video=${encodeURIComponent(params.videoSlug)}`);
}