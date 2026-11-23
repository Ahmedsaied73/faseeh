"use client";

import React, { useState } from "react";
import { notFound } from "next/navigation";
import { RichEditor } from "@/components/rich/RichEditor";
import { RichView } from "@/components/rich/RichView";
import {
  looksRich,
  hasMath,
  toGraderText,
  toPlainPreview,
  serializeRich,
} from "@/lib/richContent";

const LADDER_SAMPLE = serializeRich([
  { t: "text", v: "نفرض أن بُعد الطرف السفلي عن الحائط x وارتفاع الطرف العلوي y. من فيثاغورث:" },
  { t: "math", v: "x^{2}+y^{2}=25" },
  { t: "text", v: "نشتق الطرفين بالنسبة للزمن:" },
  { t: "math", v: "2x\\frac{dx}{dt}+2y\\frac{dy}{dt}=0" },
]);

export default function DevRichInputPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const [value, setValue] = useState<string>(LADDER_SAMPLE);
  const [locale, setLocale] = useState<"ar" | "en">("ar");
  const [numbered, setNumbered] = useState<boolean>(true);
  const [isDark, setIsDark] = useState<boolean>(false);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    document.documentElement.setAttribute("data-theme", nextDark ? "dark" : "light");
  };

  const presets = [
    {
      label: "مسألة السلم (ورقة حل)",
      val: LADDER_SAMPLE,
    },
    {
      label: "نص بسيط (Plain)",
      val: "هذا نص عادي بدون أي معادلات رياضية ويجب أن يحفظ كسلسلة نصية عادية.",
    },
    {
      label: "معادلة كسر وجذر (Math)",
      val: '{"v":1,"blocks":[{"t":"text","v":"حل المعادلة التربيعية:"},{"t":"math","v":"x=\\\\frac{-b\\\\pm\\\\sqrt{b^2-4ac}}{2a}"}]}',
    },
    {
      label: "معادلة تفاعل كيميائي (Chem)",
      val: '{"v":1,"blocks":[{"t":"text","v":"معادلة احتراق الميثان:"},{"t":"chem","v":"CH4 + 2O2 -> CO2 + 2H2O"}]}',
    },
    {
      label: "رياضيات عربية (Arabic Math)",
      val: '{"v":1,"blocks":[{"t":"text","v":"معادلة الدائرة:"},{"t":"math","v":"\\\\text{س}^2+\\\\text{ص}^2=25"}]}',
    },
  ];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            محرر الأسئلة المقالية — ورقة الحل (Solution Sheet)
          </h1>
          <p className="text-sm text-muted-foreground">
            بيئة تجريبية لاختبار RichEditor و RichView (Numbered) والتصميم الجديد.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="theme-toggle"
            onClick={toggleTheme}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            {isDark ? "☀️ نهار" : "🌙 ليل"}
          </button>
          <button
            type="button"
            id="locale-toggle"
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            {locale === "ar" ? "English (LTR)" : "العربية (RTL)"}
          </button>
          <button
            type="button"
            id="numbered-toggle"
            onClick={() => setNumbered(!numbered)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              numbered
                ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                : "border-border bg-card text-foreground"
            }`}
          >
            {numbered ? "ترقيم: مفعل" : "ترقيم: معطل"}
          </button>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        <span className="self-center text-xs font-medium text-muted-foreground">
          نماذج سريعة:
        </span>
        {presets.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setValue(p.val)}
            className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Editor Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">المحرر: ورقة الحل (RichEditor)</h2>
            <button
              type="button"
              onClick={() => setValue("")}
              className="text-xs text-brand-muted hover:text-brand-primary"
            >
              مسح الورقة
            </button>
          </div>
          <div className="rounded-2xl border border-brand-border bg-brand-surface p-4 sm:p-6 shadow-sm">
            <RichEditor
              value={value}
              onChange={setValue}
              locale={locale}
              ariaLabel="ورقة الحل"
            />
          </div>
        </div>

        {/* Read-Only View Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              العرض بعد التسليم (RichView {numbered ? "Numbered" : ""})
            </h2>
          </div>
          <div className="min-h-[160px] rounded-2xl border border-brand-border bg-brand-surface p-5 sm:p-6 shadow-sm">
            <RichView value={value} numbered={numbered} locale={locale} />
          </div>

          {/* Inspection Details */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-4 text-xs font-mono space-y-2">
            <div>
              <span className="font-semibold text-muted-foreground">looksRich: </span>
              <span className={looksRich(value) ? "text-emerald-500 font-bold" : "text-amber-500"}>
                {String(looksRich(value))}
              </span>
            </div>
            <div>
              <span className="font-semibold text-muted-foreground">hasMath: </span>
              <span className={hasMath(value) ? "text-brand-primary font-bold" : "text-muted-foreground"}>
                {String(hasMath(value))}
              </span>
            </div>
            <div>
              <span className="font-semibold text-muted-foreground">toPlainPreview(60): </span>
              <span className="text-foreground">{toPlainPreview(value, 60)}</span>
            </div>
            <div>
              <span className="font-semibold text-muted-foreground">toGraderText: </span>
              <pre className="mt-1 whitespace-pre-wrap rounded bg-background p-2 text-[11px] text-foreground">
                {toGraderText(value)}
              </pre>
            </div>
            <div>
              <span className="font-semibold text-muted-foreground">Raw Storage Value: </span>
              <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-background p-2 text-[11px] text-foreground" dir="ltr">
                {value}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
