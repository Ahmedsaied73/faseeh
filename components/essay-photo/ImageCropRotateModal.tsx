"use client";

import React, { useEffect, useRef, useState } from "react";
import { RotateCw, Crop, AlertTriangle, Loader2, X, Check } from "lucide-react";
import {
  checkImageQuality,
  processEssayImage,
  type NormalizedCropRect,
} from "./imageUtils";

export interface ImageCropRotateModalProps {
  file: File;
  onConfirm: (processedFile: File) => void;
  onCancel: () => void;
}

const DEFAULT_CROP: NormalizedCropRect = { x: 0, y: 0, width: 1, height: 1 };

export function ImageCropRotateModal({
  file,
  onConfirm,
  onCancel,
}: ImageCropRotateModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [crop, setCrop] = useState<NormalizedCropRect>(DEFAULT_CROP);
  const [showCropControls, setShowCropControls] = useState(false);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleImageLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const warning = checkImageQuality(
      img,
      img.naturalWidth || img.width,
      img.naturalHeight || img.height,
    );
    setQualityWarning(warning);
  };

  const handleRotate = () => {
    setRotationDeg((prev) => (prev + 90) % 360);
  };

  const updateEdgeCrop = (edge: "top" | "bottom" | "left" | "right", percent: number) => {
    const frac = Math.max(0, Math.min(0.4, percent / 100));
    setCrop((prev) => {
      const top = edge === "top" ? frac : prev.y;
      const left = edge === "left" ? frac : prev.x;
      const rightTrim = edge === "right" ? frac : 1 - (prev.x + prev.width);
      const bottomTrim = edge === "bottom" ? frac : 1 - (prev.y + prev.height);
      const width = Math.max(0.2, 1 - left - rightTrim);
      const height = Math.max(0.2, 1 - top - bottomTrim);
      return { x: left, y: top, width, height };
    });
  };

  const handleConfirm = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setProcessError(null);
    try {
      const processed = await processEssayImage(file, { rotationDeg, crop });
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      onConfirm(processed.file);
    } catch (err: unknown) {
      setProcessError(
        err instanceof Error ? err.message : "تعذر معالجة الصورة، يرجى المحاولة مرة أخرى.",
      );
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    onCancel();
  };

  const topPct = Math.round(crop.y * 100);
  const leftPct = Math.round(crop.x * 100);
  const rightPct = Math.round((1 - (crop.x + crop.width)) * 100);
  const bottomPct = Math.round((1 - (crop.y + crop.height)) * 100);

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="تعديل صورة الحل"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-brand-border px-4 py-3">
          <h3 className="text-sm font-bold text-brand-text">تجهيز صورة الحل</h3>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isProcessing}
            aria-label="إغلاق"
            className="rounded-lg p-1.5 text-brand-muted hover:bg-brand-bg hover:text-brand-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {qualityWarning && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{qualityWarning}</span>
            </div>
          )}

          {processError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-brand-accent">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{processError}</span>
            </div>
          )}

          <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl border border-brand-border bg-black/5 p-2">
            {previewUrl && (
              <div className="relative inline-block max-h-[45dvh] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                <img
                  ref={imgRef}
                  src={previewUrl}
                  alt="معاينة صورة الحل"
                  onLoad={handleImageLoad}
                  style={{ transform: `rotate(${rotationDeg}deg)` }}
                  className="max-h-[45dvh] w-auto rounded-lg object-contain transition-transform duration-150"
                />
                {(topPct > 0 || bottomPct > 0 || leftPct > 0 || rightPct > 0) && (
                  <div
                    aria-hidden="true"
                    style={{
                      top: `${topPct}%`,
                      left: `${leftPct}%`,
                      width: `${Math.round(crop.width * 100)}%`,
                      height: `${Math.round(crop.height * 100)}%`,
                    }}
                    className="pointer-events-none absolute border-2 border-dashed border-brand-primary bg-brand-primary/10"
                  />
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRotate}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-border bg-brand-bg px-3 py-2 text-xs font-semibold text-brand-text hover:border-brand-primary/40"
            >
              <RotateCw className="h-3.5 w-3.5" />
              تدوير 90°
            </button>
            <button
              type="button"
              onClick={() => setShowCropControls((s) => !s)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-border bg-brand-bg px-3 py-2 text-xs font-semibold text-brand-text hover:border-brand-primary/40"
            >
              <Crop className="h-3.5 w-3.5" />
              {showCropControls ? "إخفاء القص" : "قص الأطراف"}
            </button>
            {(topPct > 0 || bottomPct > 0 || leftPct > 0 || rightPct > 0) && (
              <button
                type="button"
                onClick={() => setCrop(DEFAULT_CROP)}
                disabled={isProcessing}
                className="text-xs font-semibold text-brand-primary hover:underline"
              >
                إعادة ضبط القص
              </button>
            )}
          </div>

          {showCropControls && (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-brand-border bg-brand-bg p-3 text-xs">
              <label className="space-y-1">
                <span className="text-brand-muted">قص أعلى ({topPct}%)</span>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={topPct}
                  onChange={(e) => updateEdgeCrop("top", Number(e.target.value))}
                  className="w-full"
                />
              </label>
              <label className="space-y-1">
                <span className="text-brand-muted">قص أسفل ({bottomPct}%)</span>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={bottomPct}
                  onChange={(e) => updateEdgeCrop("bottom", Number(e.target.value))}
                  className="w-full"
                />
              </label>
              <label className="space-y-1">
                <span className="text-brand-muted">قص يسار ({leftPct}%)</span>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={leftPct}
                  onChange={(e) => updateEdgeCrop("left", Number(e.target.value))}
                  className="w-full"
                />
              </label>
              <label className="space-y-1">
                <span className="text-brand-muted">قص يمين ({rightPct}%)</span>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={rightPct}
                  onChange={(e) => updateEdgeCrop("right", Number(e.target.value))}
                  className="w-full"
                />
              </label>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-brand-border px-4 py-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isProcessing}
            className="rounded-xl border border-brand-border px-4 py-2 text-xs font-semibold text-brand-muted-strong hover:bg-brand-bg"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-primary/90 disabled:opacity-60"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                جاري التجهيز...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                استخراج النص
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
