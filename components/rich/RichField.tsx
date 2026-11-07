"use client";

import React, { useState } from "react";
import { RichEditor } from "./RichEditor";
import { RichView } from "./RichView";
import { tRich, RichMessageKey } from "@/lib/richContent";
import { Eye, Edit3, ShieldAlert } from "lucide-react";

/**
 * components/rich/RichField.tsx
 *
 * Reusable Admin & Teacher Authoring Field for Rich Equations & Content.
 *
 * PROPS CONTRACT:
 * - `label`: Form field label displayed to author (e.g. "نص السؤال", "الإجابة النموذجية").
 * - `value`: Serialized string representation (plain string or {"v":1,"blocks":[...]}).
 * - `onChange`: Callback receiving updated serialized string on every author edit.
 * - `securityNote`: Optional security disclaimer banner (mandatory for modelAnswer / reference answers).
 * - `description`: Optional helper text underneath label.
 * - `allowChem`: Whether chemical equation blocks are permitted.
 * - `readOnly`: Disables author edits when true.
 * - `ariaLabel`: Accessibility label.
 * - `locale`: "ar" | "en" (default: "ar").
 * - `className`: Custom wrapper class name.
 */
export interface RichFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  securityNote?: string;
  description?: string;
  allowChem?: boolean;
  readOnly?: boolean;
  ariaLabel?: string;
  locale?: "ar" | "en";
  className?: string;
}

export function RichField({
  label,
  value,
  onChange,
  securityNote,
  description,
  allowChem = false,
  readOnly = false,
  ariaLabel,
  locale = "ar",
  className = "",
}: RichFieldProps) {
  const [previewMode, setPreviewMode] = useState(false);

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Field Header: Label & Student Preview Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <label className="block text-sm font-semibold text-on-surface/90">
            {label}
          </label>
          {description && (
            <p className="mt-0.5 text-xs text-on-surface-variant/80">
              {description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setPreviewMode((prev) => !prev)}
          aria-pressed={previewMode}
          className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
            previewMode
              ? "border-brand-primary bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15"
              : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-brand-primary hover:text-brand-primary"
          }`}
        >
          {previewMode ? (
            <>
              <Edit3 className="h-3.5 w-3.5" />
              <span>{tRich("rich.editContent", locale)}</span>
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" />
              <span>{tRich("rich.previewAsStudent", locale)}</span>
            </>
          )}
        </button>
      </div>

      {/* Security Disclaimer Note (when provided, e.g. for model answers) */}
      {securityNote && (
        <div
          role="note"
          className="flex items-start gap-2.5 rounded-lg border border-amber-200/90 bg-amber-50/80 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>{securityNote}</span>
        </div>
      )}

      {/* Content Rendering: Preview vs Editor */}
      {previewMode ? (
        <div className="rounded-xl border border-dashed border-brand-primary/40 bg-brand-primary/[0.03] p-4 transition-all">
          <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-brand-primary">
            <Eye className="h-3.5 w-3.5" />
            <span>{tRich("rich.studentPreviewBadge", locale)}</span>
          </div>
          <div className="rounded-lg bg-card p-3 shadow-xs">
            <RichView value={value} className="text-sm leading-relaxed" />
          </div>
        </div>
      ) : (
        <RichEditor
          value={value}
          onChange={onChange}
          ariaLabel={ariaLabel || label}
          readOnly={readOnly}
          allowChem={allowChem}
          locale={locale}
        />
      )}
    </div>
  );
}

export default RichField;
