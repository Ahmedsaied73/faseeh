"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, Loader2, AlertTriangle, XCircle } from "lucide-react";
import { extractEssayPhoto, EssayPhotoError } from "./api";
import { latexToRich } from "./latexToRich";
import { ImageCropRotateModal } from "./ImageCropRotateModal";
import { ExtractionReviewPanel } from "./ExtractionReviewPanel";

export interface EssayPhotoEntryProps {
  attemptId: number;
  questionId: string;
  isRich: boolean;
  allowChem: boolean;
  remainingAttempts: number;
  onRemainingAttemptsChange: (next: number) => void;
  onDraftStateChange: (hasPendingDraft: boolean) => void;
  onConfirmAnswer: (value: string, meta: { wasEdited: boolean }) => void;
}

const MAX_ATTEMPTS_PER_EXAM = 10;
const PRIVACY_SEEN_KEY = "essay_photo_privacy_seen";

export function EssayPhotoEntry({
  attemptId,
  questionId,
  isRich,
  allowChem,
  remainingAttempts,
  onRemainingAttemptsChange,
  onDraftStateChange,
  onConfirmAnswer,
}: EssayPhotoEntryProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(true);

  const [reviewState, setReviewState] = useState<{
    file: File;
    initialValue: string;
    warnings: string[];
  } | null>(null);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && sessionStorage.getItem(PRIVACY_SEEN_KEY) === "1") {
        setShowPrivacyNotice(false);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (!isExtracting) {
      setElapsedSec(0);
      return;
    }
    const id = window.setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [isExtracting]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const markPrivacySeen = () => {
    setShowPrivacyNotice(false);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(PRIVACY_SEEN_KEY, "1");
      }
    } catch {
      // ignore
    }
  };

  const handleTriggerCapture = () => {
    if (remainingAttempts <= 0 || isExtracting) return;
    setErrorMsg(null);
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    markPrivacySeen();
    setErrorMsg(null);
    setPendingCropFile(file);
  };

  const handleCancelExtraction = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsExtracting(false);
  };

  const handleCropConfirmed = async (processedFile: File) => {
    setPendingCropFile(null);
    setErrorMsg(null);
    setIsExtracting(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await extractEssayPhoto({
        file: processedFile,
        attemptId,
        questionId,
        signal: controller.signal,
      });

      if (typeof result.remainingExamAttempts === "number") {
        onRemainingAttemptsChange(result.remainingExamAttempts);
      }

      const converted = latexToRich(result.text, isRich);
      setReviewState({
        file: processedFile,
        initialValue: converted,
        warnings: result.warnings ?? [],
      });
      onDraftStateChange(true);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      if (err instanceof EssayPhotoError) {
        if (err.status === 429) {
          onRemainingAttemptsChange(0);
        }
        setErrorMsg(err.message);
      } else {
        setErrorMsg("تعذر استخراج النص من الصورة. يمكنك المتابعة بالكتابة بالكيبورد.");
      }
    } finally {
      setIsExtracting(false);
      abortRef.current = null;
    }
  };

  const handleReviewConfirm = (finalValue: string, meta: { wasEdited: boolean }) => {
    setReviewState(null);
    onDraftStateChange(false);
    onConfirmAnswer(finalValue, meta);
  };

  const handleReviewCancel = () => {
    setReviewState(null);
    onDraftStateChange(false);
  };

  const exhausted = remainingAttempts <= 0;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-border bg-brand-bg/60 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelected}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleTriggerCapture}
            disabled={exhausted || isExtracting}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-primary/40 bg-brand-surface px-3.5 py-2 text-xs font-bold text-brand-primary transition hover:bg-brand-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
            صوّر حلك
          </button>

          <span className="text-xs text-brand-muted">
            متبقي {Math.max(0, remainingAttempts)} من {MAX_ATTEMPTS_PER_EXAM} محاولات تصوير في هذا
            الامتحان
          </span>
        </div>

        {isExtracting && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              جاري استخراج النص... ({elapsedSec} ث)
            </span>
            <button
              type="button"
              onClick={handleCancelExtraction}
              className="inline-flex items-center gap-1 rounded-lg border border-brand-border bg-brand-surface px-2.5 py-1 text-xs font-semibold text-brand-muted-strong hover:bg-brand-bg"
            >
              <XCircle className="h-3.5 w-3.5" />
              إلغاء والكتابة بالكيبورد
            </button>
          </div>
        )}
      </div>

      {showPrivacyNotice && (
        <p className="mt-1.5 text-[11px] text-brand-muted">
          ملاحظة خصوصية: تُستخدم الصورة لاستخراج نص حلك فقط ولا يتم حفظها بعد المعالجة.
        </p>
      )}

      {errorMsg && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="shrink-0 font-bold text-amber-800 hover:underline"
          >
            الكتابة بالكيبورد
          </button>
        </div>
      )}

      {pendingCropFile && (
        <ImageCropRotateModal
          file={pendingCropFile}
          onConfirm={(processed) => void handleCropConfirmed(processed)}
          onCancel={() => setPendingCropFile(null)}
        />
      )}

      {reviewState && (
        <ExtractionReviewPanel
          imageFile={reviewState.file}
          initialValue={reviewState.initialValue}
          isRich={isRich}
          allowChem={allowChem}
          warnings={reviewState.warnings}
          onConfirm={handleReviewConfirm}
          onCancel={handleReviewCancel}
        />
      )}
    </div>
  );
}
