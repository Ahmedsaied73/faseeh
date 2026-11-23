"use client";
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { MathfieldElement } from "mathlive";
import { hasPlaceholder, normalizeMathLatex } from "@/lib/richContent";
import { configureField, loadMathlive } from "./mathlive-setup";

export type MathHandle = {
  focus: () => void;
  insert: (latex: string) => void;
  /** Caret movement for external navigation */
  command: (name: "moveToNextChar" | "moveToPreviousChar") => void;
};

export interface MathBlockEditorProps {
  value: string;
  onChange: (latex: string, incomplete: boolean) => void;
  ariaLabel: string;
  placeholder?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  /** Enter pressed in a non-empty field: parent adds a new equation line. */
  onEnter?: () => void;
  /** Backspace pressed in an empty field: parent removes the line. */
  onBackspaceEmpty?: () => void;
  onFocus?: () => void;
  locale?: "ar" | "en";
  className?: string;
}

export const MathBlockEditor = forwardRef<MathHandle, MathBlockEditorProps>(function MathBlockEditor(
  { value, onChange, ariaLabel, placeholder = "", readOnly, autoFocus, onEnter, onBackspaceEmpty, onFocus, className },
  handle
) {
  const ref = useRef<MathfieldElement | null>(null);
  const [ready, setReady] = useState(false);
  const [empty, setEmpty] = useState(value.trim() === "");

  // Keep latest callbacks without re-binding listeners
  const cb = useRef({ onChange, onEnter, onBackspaceEmpty, onFocus });
  cb.current = { onChange, onEnter, onBackspaceEmpty, onFocus };

  useEffect(() => {
    let cancelled = false;
    loadMathlive().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useImperativeHandle(handle, () => ({
    focus: () => ref.current?.focus(),
    insert: (latex: string) => {
      const mf = ref.current;
      if (!mf) return;
      mf.focus();
      mf.insert(latex, { selectionMode: "placeholder", format: "latex" });
    },
    command: (name: "moveToNextChar" | "moveToPreviousChar") => {
      ref.current?.executeCommand(name);
    },
  }));

  useEffect(() => {
    const mf = ref.current;
    if (!ready || !mf) return;
    configureField(mf);
    mf.readOnly = !!readOnly;

    const read = () => {
      const raw = mf.getValue("latex-expanded");
      const norm = normalizeMathLatex(raw);
      setEmpty(norm === "" || norm === "{}");
      cb.current.onChange(norm, hasPlaceholder(raw));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if (e.key === "Enter" && !e.shiftKey && cb.current.onEnter) {
        if (mf.getValue("latex-expanded").trim() !== "") {
          e.preventDefault();
          e.stopPropagation();
          cb.current.onEnter();
        }
      } else if (e.key === "Backspace" && cb.current.onBackspaceEmpty) {
        if (mf.getValue("latex-expanded").trim() === "") {
          e.preventDefault();
          e.stopPropagation();
          cb.current.onBackspaceEmpty();
        }
      }
    };

    const onFocusHandler = () => {
      cb.current.onFocus?.();
    };

    mf.addEventListener("input", read);
    mf.addEventListener("keydown", onKeyDown, true);
    mf.addEventListener("focus", onFocusHandler);
    return () => {
      mf.removeEventListener("input", read);
      mf.removeEventListener("keydown", onKeyDown, true);
      mf.removeEventListener("focus", onFocusHandler);
    };
  }, [ready, readOnly]);

  // Parent -> field, only when different (silent, avoids loops)
  useEffect(() => {
    const mf = ref.current;
    if (!ready || !mf) return;
    if (normalizeMathLatex(mf.getValue("latex-expanded")) !== value) {
      mf.setValue(value, { silenceNotifications: true });
      setEmpty(value.trim() === "");
    }
  }, [ready, value]);

  useEffect(() => {
    if (ready && autoFocus) ref.current?.focus();
  }, [ready, autoFocus]);

  return (
    <div className={`rs-math ${className || ""}`} data-empty={empty ? "true" : "false"}>
      <math-field ref={ref as never} aria-label={ariaLabel} dir="ltr" />
      {empty && placeholder && (
        <span className="rs-ph" aria-hidden="true">
          {placeholder}
        </span>
      )}
    </div>
  );
});
