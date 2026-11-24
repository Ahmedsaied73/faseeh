"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronUp, ArrowDownLeft, X } from "lucide-react";
import { RichEditor } from "@/components/rich/RichEditor";
import { countUnreadableMarkers } from "./latexToRich";

export interface ExtractionReviewPanelProps {
  imageFile: File;
  initialValue: string;
  isRich: boolean;
  allowChem: boolean;
  warnings?: string[];
  onConfirm: (finalValue: string, meta: { wasEdited: boolean }) => void;
  onCancel: () => void;
}

export function ExtractionReviewPanel({
  imageFile,
  initialValue,
  isRich,
  allowChem,
  warnings = [],
  onConfirm,
  onCancel,
}: ExtractionReviewPanelProps) {
  const [draftValue, setDraftValue] = useState(initialValue);
  const [confirmed, setConfirmed] = useState(false);
  const [mobileImageOpen, setMobileImageOpen] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const plainTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastJumpIndexRef = useRef(-1);

  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  const markerCount = useMemo(() => countUnreadableMarkers(draftValue), [draftValue]);
  const wasEdited = draftValue !== initialValue;

  const revokePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleConfirm = () => {
    if (!confirmed || markerCount > 0) return;
    revokePreview();
    onConfirm(draftValue, { wasEdited });
  };

  const handleCancel = () => {
    revokePreview();
    onCancel();
  };

  const jumpToNextMarker = () => {
    if (!isRich && plainTextareaRef.current) {
      const ta = plainTextareaRef.current;
      const text = ta.value;
      const from = lastJumpIndexRef.current + 1;
      let idx = text.indexOf("[?]", from);
      if (idx === -1) idx = text.indexOf("[?]");
      if (idx !== -1) {
        lastJumpIndexRef.current = idx;
        ta.focus();
        ta.setSelectionRange(idx, idx + 3);
      }
      return;
    }

    const container = editorContainerRef.current;
    if (!container) return;
    const fields = Array.from(
      container.querySelectorAll<HTMLElement>("textarea, math-field, input"),
    );
    const matching = fields.filter((el) => {
      const val = (el as HTMLTextAreaElement | HTMLInputElement).value ?? "";
      return val.includes("[?]");
    });
    if (matching.length === 0) return;

    const nextIdx = (lastJumpIndexRef.current + 1) % matching.length;
    lastJumpIndexRef.current = nextIdx;
    const target = matching[nextIdx];
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.focus();
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      const pos = target.value.indexOf("[?]");
      if (pos !== -1) target.setSelectionRange(pos, pos + 3);
    }
  };

  return (
    <div
      dir="rtl"
      data-testid="extraction-review-panel"
      className="mt-4 rounded-2xl border-2 border-brand-primary/30 bg-brand-surface p-4 shadow-sm"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-brand-text">مراجعة النص المستخرج من الصورة</h4>
          <p className="text-xs text-brand-muted">
            تأكد من مطابقة النص المكتوب مع حلك في الصورة قبل الاعتماد.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMobileImageOpen((o) => !o)}
          className="inline-flex items-center gap-1 rounded-lg border border-brand-border px-2.5 py-1 text-xs font-semibold text-brand-muted-strong md:hidden"
        >
          {mobileImageOpen ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              إخفاء الصورة
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              إظهار الصورة
            </>
          )}
        </button>
      </div>

      {warnings.length > 0 && (
        <div className="mb-3 space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}

      {markerCount > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              يوجد {markerCount} موضع غير واضح{" "}
              <code className="rounded bg-amber-200/70 px-1 font-mono font-bold">[?]</code> — يرجى
              تعديلها قبل الاعتماد
            </span>
          </div>
          <button
            type="button"
            onClick={jumpToNextMarker}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-700"
          >
            <ArrowDownLeft className="h-3.5 w-3.5" />
            انتقل للعلامة التالية
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Image preview: collapsible top on mobile, side-by-side on desktop */}
        <div className={mobileImageOpen ? "block" : "hidden md:block"}>
          <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-bg p-2">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview
              <img
                src={previewUrl}
                alt="صورة الحل المرفوعة"
                className="max-h-80 w-full rounded-lg object-contain"
              />
            )}
          </div>
        </div>

        {/* Editor */}
        <div ref={editorContainerRef} className="flex flex-col">
          {isRich ? (
            <RichEditor
              value={draftValue}
              onChange={setDraftValue}
              ariaLabel="محرر مراجعة النص المستخرج"
              allowChem={allowChem}
            />
          ) : (
            <textarea
              ref={plainTextareaRef}
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              rows={8}
              dir="rtl"
              aria-label="محرر مراجعة النص المستخرج"
              className="min-h-[180px] w-full resize-y rounded-xl border border-brand-border bg-brand-bg p-3 text-sm font-medium text-brand-text focus:border-brand-primary focus:outline-none"
            />
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-brand-border pt-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-brand-text">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="h-4 w-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary"
          />
          <span>راجعت النص وهو مطابق لحلي</span>
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-1 rounded-xl border border-brand-border px-3.5 py-2 text-xs font-semibold text-brand-muted-strong hover:bg-brand-bg"
          >
            <X className="h-3.5 w-3.5" />
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!confirmed || markerCount > 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            اعتماد الإجابة
          </button>
        </div>
      </div>
    </div>
  );
}
