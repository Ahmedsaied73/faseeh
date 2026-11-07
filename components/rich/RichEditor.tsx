"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  RichBlock,
  RICH_LIMITS,
  parseRich,
  serializeRich,
  tRich,
  RichMessageKey,
} from "@/lib/richContent";
import { MathBlockEditor } from "./MathBlockEditor";
import { ChemBlockEditor } from "./ChemBlockEditor";
import { RichView } from "./RichView";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Type,
  Sigma,
  FlaskConical,
  AlertCircle,
} from "lucide-react";

export interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  readOnly?: boolean;
  allowChem?: boolean;
  maxBlocks?: number;
  className?: string;
  locale?: "ar" | "en";
}

type EditorBlock = RichBlock & {
  id: string;
  incomplete?: boolean;
  autoFocus?: boolean;
};

let blockCounter = 0;
function createBlockId(): string {
  blockCounter += 1;
  return `rb_${Date.now()}_${blockCounter}`;
}

export function RichEditor({
  value,
  onChange,
  ariaLabel,
  readOnly = false,
  allowChem = false,
  maxBlocks = RICH_LIMITS.maxBlocks,
  className = "",
  locale = "ar",
}: RichEditorProps) {
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => {
    const parsed = parseRich(value).blocks;
    if (parsed.length === 0) {
      return [{ id: createBlockId(), t: "text", v: "" }];
    }
    return parsed.map((b) => ({ id: createBlockId(), t: b.t, v: b.v }));
  });

  const lastEmittedRef = useRef<string>(value || "");
  const t = useCallback((key: RichMessageKey) => tRich(key, locale), [locale]);

  // Synchronize when external value changes (e.g. quiz draft hydration)
  useEffect(() => {
    if (value !== lastEmittedRef.current) {
      const parsed = parseRich(value).blocks;
      if (parsed.length === 0) {
        setBlocks([{ id: createBlockId(), t: "text", v: "" }]);
      } else {
        setBlocks(parsed.map((b) => ({ id: createBlockId(), t: b.t, v: b.v })));
      }
      lastEmittedRef.current = value;
    }
  }, [value]);

  const emitChange = useCallback(
    (nextBlocks: EditorBlock[]) => {
      setBlocks(nextBlocks);
      const serialized = serializeRich(nextBlocks.map(({ t, v }) => ({ t, v })));
      lastEmittedRef.current = serialized;
      onChange(serialized);
    },
    [onChange]
  );

  const handleTextChange = (id: string, text: string) => {
    const next = blocks.map((b) => (b.id === id ? { ...b, v: text } : b));
    emitChange(next);
  };

  const handleMathChange = (id: string, latex: string, incomplete: boolean) => {
    const next = blocks.map((b) =>
      b.id === id ? { ...b, v: latex, incomplete, autoFocus: false } : b
    );
    emitChange(next);
  };

  const handleChemChange = (id: string, chem: string) => {
    const next = blocks.map((b) => (b.id === id ? { ...b, v: chem } : b));
    emitChange(next);
  };

  const handleAddBlock = (type: "text" | "math" | "chem") => {
    if (blocks.length >= maxBlocks) return;
    const newBlock: EditorBlock = {
      id: createBlockId(),
      t: type,
      v: "",
      autoFocus: type === "math" || type === "chem",
    };
    emitChange([...blocks, newBlock]);
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const next = [...blocks];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    emitChange(next);
  };

  const handleMoveDown = (index: number) => {
    if (index >= blocks.length - 1) return;
    const next = [...blocks];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    emitChange(next);
  };

  const handleDelete = (index: number) => {
    if (blocks.length <= 1) {
      // Keep at least one empty text block
      emitChange([{ id: createBlockId(), t: "text", v: "" }]);
      return;
    }
    const next = blocks.filter((_, i) => i !== index);
    emitChange(next);
  };

  const isAtLimit = blocks.length >= maxBlocks;

  return (
    <div
      role="region"
      aria-label={ariaLabel || t("rich.textLabel")}
      className={`rich-editor rounded-xl border border-brand-border bg-card p-4 transition-colors ${className}`}
    >
      {/* Block List */}
      <div className="space-y-4">
        {blocks.map((block, index) => {
          const isFirst = index === 0;
          const isLast = index === blocks.length - 1;

          return (
            <div
              key={block.id}
              className="group relative rounded-lg border border-border/80 bg-background p-3 transition-shadow focus-within:border-brand-primary focus-within:ring-1 focus-within:ring-brand-primary"
            >
              {/* Block Header & Controls */}
              <div className="mb-2 flex items-center justify-between border-b border-border/40 pb-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  {block.t === "text" && (
                    <>
                      <Type className="h-4 w-4" />
                      <span>{t("rich.textLabel")}</span>
                    </>
                  )}
                  {block.t === "math" && (
                    <>
                      <Sigma className="h-4 w-4 text-brand-primary" />
                      <span>{t("rich.equationLabel")}</span>
                    </>
                  )}
                  {block.t === "chem" && (
                    <>
                      <FlaskConical className="h-4 w-4 text-emerald-500" />
                      <span>{t("rich.chemLabel")}</span>
                    </>
                  )}
                </span>

                {!readOnly && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveUp(index)}
                      aria-label={t("rich.moveUp")}
                      className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveDown(index)}
                      aria-label={t("rich.moveDown")}
                      className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(index)}
                      aria-label={t("rich.delete")}
                      className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Block Content */}
              {block.t === "text" && (
                <textarea
                  dir="auto"
                  rows={3}
                  disabled={readOnly}
                  maxLength={RICH_LIMITS.maxTextChars}
                  value={block.v}
                  onChange={(e) => handleTextChange(block.id, e.target.value)}
                  placeholder={t("rich.textPlaceholder")}
                  aria-label={`${t("rich.textLabel")} ${index + 1}`}
                  className="w-full resize-y rounded-md bg-transparent p-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/60 focus:ring-0"
                />
              )}

              {block.t === "math" && (
                <div>
                  <MathBlockEditor
                    value={block.v}
                    onChange={(latex, incomplete) =>
                      handleMathChange(block.id, latex, incomplete)
                    }
                    readOnly={readOnly}
                    autoFocus={block.autoFocus}
                    ariaLabel={`${t("rich.equationLabel")} ${index + 1}`}
                    locale={locale}
                  />
                  {block.incomplete && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-500">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>{t("rich.incomplete")}</span>
                    </div>
                  )}
                </div>
              )}

              {block.t === "chem" && (
                <ChemBlockEditor
                  value={block.v}
                  onChange={(chem) => handleChemChange(block.id, chem)}
                  readOnly={readOnly}
                  autoFocus={block.autoFocus}
                  ariaLabel={`${t("rich.chemLabel")} ${index + 1}`}
                  locale={locale}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Editor Footer / Add Controls */}
      {!readOnly && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isAtLimit}
              onClick={() => handleAddBlock("text")}
              className="flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Type className="h-4 w-4" />
              <span>{t("rich.addText")}</span>
            </button>

            <button
              type="button"
              disabled={isAtLimit}
              onClick={() => handleAddBlock("math")}
              className="flex min-h-[44px] items-center gap-2 rounded-lg border border-brand-primary/30 bg-brand-primary/10 px-3.5 py-2 text-xs font-medium text-brand-primary transition-colors hover:bg-brand-primary/20 disabled:opacity-50"
            >
              <Sigma className="h-4 w-4" />
              <span>{t("rich.addEquation")}</span>
            </button>

            {allowChem && (
              <button
                type="button"
                disabled={isAtLimit}
                onClick={() => handleAddBlock("chem")}
                className="flex min-h-[44px] items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <FlaskConical className="h-4 w-4" />
                <span>{t("rich.addChem")}</span>
              </button>
            )}
          </div>

          {isAtLimit && (
            <span className="text-xs text-destructive">{t("rich.limitReached")}</span>
          )}
        </div>
      )}
    </div>
  );
}
