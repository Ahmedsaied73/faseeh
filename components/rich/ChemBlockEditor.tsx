"use client";

import React, { useMemo, useRef, useEffect } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import "katex/contrib/mhchem";
import { RICH_LIMITS, tRich, RichMessageKey } from "@/lib/richContent";
import { AlertCircle } from "lucide-react";

export interface ChemBlockEditorProps {
  value: string;
  onChange: (chem: string) => void;
  ariaLabel?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  className?: string;
  locale?: "ar" | "en";
}

function balancedBraces(s: string): boolean {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\") {
      i++;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}" && --depth < 0) return false;
  }
  return depth === 0;
}

const QUICK_INSERT_TOKENS = [
  { label: "→", token: " -> ", key: "rich.chemInsertArrow" as RichMessageKey, title: "-> (Arrow)" },
  { label: "⇌", token: " <=> ", key: "rich.chemInsertEquilibrium" as RichMessageKey, title: "<=> (Equilibrium)" },
  { label: "↑", token: " ^", key: "rich.chemInsertGas" as RichMessageKey, title: "^ (Gas)" },
  { label: "↓", token: " v", key: "rich.chemInsertPrecipitate" as RichMessageKey, title: "v (Precipitate)" },
  { label: "Δ", token: " ->[\\Delta] ", key: "rich.chemInsertHeat" as RichMessageKey, title: "[\\Delta] (Heat)" },
];

export function ChemBlockEditor({
  value,
  onChange,
  ariaLabel,
  readOnly = false,
  autoFocus = false,
  className = "",
  locale = "ar",
}: ChemBlockEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const preview = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      return { html: null, error: null };
    }

    if (!balancedBraces(trimmed)) {
      return { html: null, error: tRich("rich.chemInvalidFormula", locale) };
    }

    try {
      const html = katex.renderToString(`\\ce{${trimmed}}`, {
        displayMode: true,
        throwOnError: true,
        trust: false,
        strict: "ignore",
        maxExpand: 1000,
      });
      return { html, error: null };
    } catch {
      return { html: null, error: tRich("rich.chemInvalidFormula", locale) };
    }
  }, [value, locale]);

  const handleInsertToken = (token: string) => {
    if (readOnly) return;
    const input = inputRef.current;
    if (!input) {
      onChange(value + token);
      return;
    }

    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? value.length;
    const nextValue = value.slice(0, start) + token + value.slice(end);

    onChange(nextValue);

    // Reposition cursor right after inserted token
    requestAnimationFrame(() => {
      input.focus();
      const newPos = start + token.length;
      input.setSelectionRange(newPos, newPos);
    });
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Quick insertion buttons */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Chemical symbols toolbar">
          <span className="text-xs text-muted-foreground me-1 font-medium">
            {locale === "ar" ? "رموز سريعة:" : "Quick symbols:"}
          </span>
          {QUICK_INSERT_TOKENS.map(({ label, token, key, title }) => (
            <button
              key={token}
              type="button"
              onClick={() => handleInsertToken(token)}
              title={title}
              aria-label={tRich(key, locale)}
              className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md border border-border/80 bg-muted/40 px-2.5 py-1 text-sm font-medium transition-colors hover:bg-muted hover:border-brand-primary active:scale-95"
            >
              <span className="font-mono text-base">{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Chemistry Input */}
      <div>
        <input
          ref={inputRef}
          type="text"
          dir="ltr"
          disabled={readOnly}
          maxLength={RICH_LIMITS.maxChemChars}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. 2H2 + O2 -> 2H2O or CaCO3 ->[\Delta] CaO + CO2 ^"
          aria-label={ariaLabel || tRich("rich.chemLabel", locale)}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
          className="w-full rounded-md border border-border/80 bg-background px-3.5 py-2.5 font-mono text-sm leading-relaxed outline-none transition-colors focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
        />
      </div>

      {/* Live Preview Container */}
      {value.trim() && (
        <div
          className={`rounded-lg border p-3 transition-colors ${
            preview.error
              ? "border-amber-300 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20"
              : "border-border/60 bg-muted/20"
          }`}
          aria-label={tRich("rich.chemPreview", locale)}
        >
          {preview.html ? (
            <div
              dir="ltr"
              className="overflow-x-auto text-center"
              dangerouslySetInnerHTML={{ __html: preview.html }}
            />
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{preview.error}</span>
            </div>
          )}
        </div>
      )}

      {/* Examples Hint */}
      <p className="text-[11px] text-muted-foreground/80 leading-normal">
        {tRich("rich.chemHint", locale)}
      </p>
    </div>
  );
}
