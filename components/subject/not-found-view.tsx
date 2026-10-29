import Link from "next/link";
import { NotFoundArt } from "@/components/subject/subject-art";
import { subject } from "@/lib/subject-theme";

export function NotFoundView() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-brand-bg px-4 py-10">
      <div className="mx-auto max-w-xl text-center">
        <NotFoundArt />
        <p className="mt-8 font-mono text-xs uppercase tracking-widest text-brand-muted">{subject.notFound.kicker}</p>
        <h1 className="mt-2 text-2xl font-extrabold text-brand-text sm:text-3xl">{subject.notFound.title}</h1>
        <p className="mt-2 text-sm text-brand-muted">{subject.notFound.body}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="rounded-full bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primary/90">
            العودة للرئيسية
          </Link>
          <Link href="/grades/1" className="text-sm font-semibold text-brand-muted-strong hover:text-brand-primary">
            تصفح الدورات
          </Link>
        </div>
      </div>
    </div>
  );
}
