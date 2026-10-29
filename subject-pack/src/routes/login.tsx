import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthArt } from "@/components/subject/subject-art";
import { subject } from "@/lib/subject-theme";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/profile" });
  }

  return (
    <div className="grid min-h-dvh bg-brand-bg lg:grid-cols-2">
      <div className="relative hidden items-center justify-center overflow-hidden bg-brand-ink p-10 lg:flex">
        <div className="hero-glow absolute -inset-24 rounded-full bg-brand-primary/20 blur-3xl" aria-hidden="true" />
        <div className="relative flex w-full flex-col items-center text-center">
          <div className="h-96 w-96">
            <AuthArt variant="login" />
          </div>
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-white/70">{subject.login.sideLine}</p>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="relative h-36 overflow-hidden bg-brand-ink lg:hidden">
          <AuthArt variant="login" compact />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            <Link to="/" className="text-lg font-extrabold text-brand-primary">أكاديميا</Link>
            <h1 className="mt-6 text-2xl font-extrabold text-brand-text">{subject.login.title}</h1>
            <p className="mt-1.5 text-sm text-brand-muted">{subject.login.subtitle}</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-brand-text">البريد الإلكتروني</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-brand-border bg-brand-surface px-4 py-2.5 text-sm text-brand-text outline-none transition focus:border-brand-primary"
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-sm font-semibold text-brand-text">كلمة المرور</label>
                  <a href="#" className="text-xs font-semibold text-brand-primary hover:underline">نسيت كلمة المرور؟</a>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-brand-border bg-brand-surface px-4 py-2.5 text-sm text-brand-text outline-none transition focus:border-brand-primary"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-brand-primary py-3 text-sm font-bold text-white transition hover:bg-brand-primary/90"
              >
                تسجيل الدخول
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-brand-muted">
              ليس لديك حساب؟{" "}
              <Link to="/register" className="font-semibold text-brand-primary hover:underline">أنشئ حسابًا</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
