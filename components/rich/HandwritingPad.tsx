"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  StrokesData,
  STROKES_LIMITS,
  validateStrokes,
  tRich,
  RichMessageKey,
} from "@/lib/richContent";
import { Undo2, RotateCcw, Check, X, AlertCircle, Loader2 } from "lucide-react";

export interface HandwritingPadProps {
  onConvert?: (latex: string) => void;
  onClose?: () => void;
  onStrokesChange?: (strokes: StrokesData) => void;
  recognizeFn?: (
    strokes: StrokesData
  ) => Promise<{ latex: string | null; error?: string }>;
  locale?: "ar" | "en";
  className?: string;
  readOnly?: boolean;
  forceEnable?: boolean;
}

export function HandwritingPad({
  onConvert,
  onClose,
  onStrokesChange,
  recognizeFn,
  locale = "ar",
  className = "",
  readOnly = false,
  forceEnable = false,
}: HandwritingPadProps) {
  const isEnabled =
    forceEnable ||
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_HANDWRITING_ENABLED === "true");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<StrokesData>({ x: [], y: [] });
  const [isDrawing, setIsDrawing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentStrokeRef = useRef<{ x: number[]; y: number[] } | null>(null);

  const t = useCallback((key: RichMessageKey) => tRich(key, locale), [locale]);

  // Redraw all strokes on canvas
  const redraw = useCallback((currentStrokes: StrokesData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b";

    for (let i = 0; i < currentStrokes.x.length; i++) {
      const xs = currentStrokes.x[i];
      const ys = currentStrokes.y[i];
      if (!xs || !ys || xs.length === 0) continue;

      ctx.beginPath();
      if (xs.length === 1) {
        ctx.arc(xs[0], ys[0], 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "#1e293b";
        ctx.fill();
      } else {
        ctx.moveTo(xs[0], ys[0]);
        for (let j = 1; j < xs.length; j++) {
          ctx.lineTo(xs[j], ys[j]);
        }
        ctx.stroke();
      }
    }
  }, []);

  // Update canvas resolution on mount / resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Set internal resolution matching element display width
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width;
      canvas.height = rect.height;
      redraw(strokes);
    }
  }, [redraw, strokes]);

  if (!isEnabled) {
    return null;
  }

  const getCoordinates = (
    e: React.PointerEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly || converting) return;
    const coords = getCoordinates(e);
    if (!coords) return;

    if (strokes.x.length >= STROKES_LIMITS.maxStrokes) {
      setErrorMessage(t("rich.handwritingTooManyStrokes"));
      return;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }

    setIsDrawing(true);
    setErrorMessage(null);
    currentStrokeRef.current = { x: [coords.x], y: [coords.y] };

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#1e293b";
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStrokeRef.current || readOnly || converting)
      return;
    const coords = getCoordinates(e);
    if (!coords) return;

    const stroke = currentStrokeRef.current;
    const prevX = stroke.x[stroke.x.length - 1];
    const prevY = stroke.y[stroke.y.length - 1];

    stroke.x.push(coords.x);
    stroke.y.push(coords.y);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#1e293b";
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      }
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const finished = currentStrokeRef.current;
    currentStrokeRef.current = null;

    if (finished && finished.x.length > 0) {
      const nextStrokes: StrokesData = {
        x: [...strokes.x, finished.x],
        y: [...strokes.y, finished.y],
      };
      setStrokes(nextStrokes);
      onStrokesChange?.(nextStrokes);
    }
  };

  const handleUndo = () => {
    if (strokes.x.length === 0 || readOnly || converting) return;
    const nextStrokes: StrokesData = {
      x: strokes.x.slice(0, -1),
      y: strokes.y.slice(0, -1),
    };
    setStrokes(nextStrokes);
    setErrorMessage(null);
    redraw(nextStrokes);
    onStrokesChange?.(nextStrokes);
  };

  const handleClear = () => {
    if (readOnly || converting) return;
    const emptyStrokes: StrokesData = { x: [], y: [] };
    setStrokes(emptyStrokes);
    setErrorMessage(null);
    redraw(emptyStrokes);
    onStrokesChange?.(emptyStrokes);
  };

  const handleConvert = async () => {
    if (readOnly || converting) return;

    const validation = validateStrokes(strokes);
    if (!validation.ok) {
      if (validation.error === "STROKES_EMPTY") {
        setErrorMessage(t("rich.handwritingEmpty"));
      } else if (validation.error === "STROKES_TOO_MANY") {
        setErrorMessage(t("rich.handwritingTooManyStrokes"));
      } else {
        setErrorMessage(t("rich.handwritingError"));
      }
      return;
    }

    setConverting(true);
    setErrorMessage(null);

    try {
      if (recognizeFn) {
        const res = await recognizeFn(strokes);
        if (res.latex) {
          onConvert?.(res.latex);
          onClose?.();
        } else {
          setErrorMessage(res.error || t("rich.handwritingError"));
        }
      } else {
        // Attempt backend endpoint /api/handwriting/recognize
        const res = await fetch("/api/handwriting/recognize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ strokes }),
        });

        if (!res.ok) {
          if (res.status === 404 || res.status === 503) {
            setErrorMessage(t("rich.handwritingUnavailable"));
          } else {
            setErrorMessage(t("rich.handwritingError"));
          }
          return;
        }

        const data = await res.json();
        if (data && typeof data.latex === "string" && data.latex.trim()) {
          onConvert?.(data.latex.trim());
          onClose?.();
        } else {
          setErrorMessage(t("rich.handwritingError"));
        }
      }
    } catch {
      setErrorMessage(t("rich.handwritingUnavailable"));
    } finally {
      setConverting(false);
    }
  };

  const hasStrokes = strokes.x.length > 0;

  return (
    <div
      role="region"
      aria-label={t("rich.handwritingTitle")}
      className={`handwriting-pad rounded-xl border border-brand-primary/30 bg-muted/20 p-3 shadow-inner ${className}`}
    >
      {/* Pad Header */}
      <div className="mb-2 flex items-center justify-between border-b border-border/40 pb-2 text-xs">
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">
            {t("rich.handwritingTitle")}
          </span>
          <span className="text-muted-foreground">
            {t("rich.handwritingInstruction")}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("rich.handwritingClose")}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Canvas Area with touch-action: none */}
      <div className="relative overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <canvas
          ref={canvasRef}
          aria-label={t("rich.handwritingTitle")}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="h-[180px] w-full cursor-crosshair"
          style={{ touchAction: "none" }}
        />
        {!hasStrokes && !isDrawing && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/50">
            {t("rich.handwritingInstruction")}
          </div>
        )}
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="mt-2 flex items-center gap-1.5 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Pad Controls */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/30 pt-2 text-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!hasStrokes || readOnly || converting}
            aria-label={t("rich.handwritingUndo")}
            className="flex min-h-[36px] items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <Undo2 className="h-3.5 w-3.5" />
            <span>{t("rich.handwritingUndo")}</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasStrokes || readOnly || converting}
            aria-label={t("rich.handwritingClear")}
            className="flex min-h-[36px] items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{t("rich.handwritingClear")}</span>
          </button>
          <span className="ms-2 text-muted-foreground">
            {strokes.x.length} / {STROKES_LIMITS.maxStrokes}
          </span>
        </div>

        <button
          type="button"
          onClick={handleConvert}
          disabled={!hasStrokes || readOnly || converting}
          aria-label={t("rich.handwritingConvert")}
          className="flex min-h-[36px] items-center gap-1.5 rounded-md bg-brand-primary px-3.5 py-1.5 font-medium text-white shadow-sm transition-colors hover:bg-brand-primary/90 disabled:opacity-50"
        >
          {converting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{t("rich.handwritingConverting")}</span>
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>{t("rich.handwritingConvert")}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
