"use client";

import React, { useEffect, useRef, useState } from "react";
import type { MathfieldElement } from "mathlive";
import { normalizeMathLatex, hasPlaceholder } from "@/lib/richContent";

type Props = {
  value: string;
  onChange: (latex: string, incomplete: boolean) => void;
  ariaLabel: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  className?: string;
};

export function MathBlockEditor({
  value,
  onChange,
  ariaLabel,
  readOnly,
  autoFocus,
  className,
}: Props) {
  const ref = useRef<MathfieldElement>(null);
  const [ready, setReady] = useState(false);

  // Load MathLive client-side only
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { MathfieldElement } = await import("mathlive");
        if (cancelled) return;
        MathfieldElement.fontsDirectory = "/mathlive/fonts";
        MathfieldElement.soundsDirectory = null;
        setReady(true);
      } catch (err) {
        console.error("Failed to load MathLive:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Field -> Parent event listener
  useEffect(() => {
    const mf = ref.current;
    if (!ready || !mf) return;

    mf.mathVirtualKeyboardPolicy = "auto";
    mf.readOnly = !!readOnly;

    const handleInput = () => {
      const raw = mf.getValue("latex-expanded");
      const normalized = normalizeMathLatex(raw);
      const incomplete = hasPlaceholder(raw);
      onChange(normalized, incomplete);
    };

    mf.addEventListener("input", handleInput);
    return () => {
      mf.removeEventListener("input", handleInput);
    };
  }, [ready, onChange, readOnly]);

  // Parent -> Field sync (only when different, silently)
  useEffect(() => {
    const mf = ref.current;
    if (!ready || !mf) return;

    const currentNormalized = normalizeMathLatex(mf.getValue("latex-expanded"));
    if (currentNormalized !== value) {
      mf.setValue(value, { silenceNotifications: true });
    }
  }, [ready, value]);

  // Autofocus when element becomes ready
  useEffect(() => {
    if (ready && autoFocus && ref.current) {
      ref.current.focus();
    }
  }, [ready, autoFocus]);

  return (
    <div className={`relative ${className || ""}`}>
      <math-field
        ref={ref}
        dir="ltr"
        aria-label={ariaLabel}
        style={{
          display: "block",
          width: "100%",
          minHeight: "44px",
          padding: "8px 12px",
          borderRadius: "0.5rem",
          fontSize: "1.25rem",
          outline: "none",
        }}
      />
    </div>
  );
}
