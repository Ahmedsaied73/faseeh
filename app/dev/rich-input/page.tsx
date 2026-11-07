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
} from "@/lib/richContent";

export default function DevRichInputPage() {
  // Gate: dev-only page, 404 in production
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const [value, setValue] = useState<string>(
    '{"v":1,"blocks":[{"t":"text","v":"أوجد حل المعادلة التالية:"},{"t":"math","v":"x_{1,2}=\\\\frac{-b\\\\pm\\\\sqrt{b^{2}-4ac}}{2a}"}]}'
  );
  const [locale, setLocale] = useState<"ar" | "en">("ar");

  const presets = [
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
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            لوحة تجربة الإدخال الرياضي والكيميائي (Dev Playground)
          </h1>
          <p className="text-sm text-muted-foreground">
            صفحة تجريبية لاختبار RichEditor و RichView في بيئة التطوير فقط.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">اللغة:</span>
          <button
            type="button"
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            className="rounded border border-border bg-card px-3 py-1 text-xs font-medium"
          >
            {locale === "ar" ? "العربية (RTL)" : "English (LTR)"}
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Editor Column */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">المحرر (RichEditor)</h2>
          <RichEditor
            value={value}
            onChange={setValue}
            allowChem={true}
            locale={locale}
            ariaLabel="محرر تجريبي"
          />
        </div>

        {/* Read-Only View Column */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            العرض للقراءة فقط (RichView)
          </h2>
          <div className="min-h-[160px] rounded-xl border border-brand-border bg-card p-4">
            <RichView value={value} />
          </div>

          {/* Inspection Details */}
          <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-xs font-mono space-y-2">
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
              <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-background p-2 text-[11px] text-foreground">
                {value}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
