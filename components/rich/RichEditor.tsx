"use client";
/**
 * RichEditor — "ورقة الحل" (solution sheet).
 *
 * Contract:
 *   props   value: string (plain string or rich envelope) · onChange(value: string)
 *   output  serializeRich(blocks)  → plain string when text-only, envelope otherwise
 *   network none (pure local state)
 *
 * Design: one numbered line per step. A line is either writing (ruled paper textarea)
 * or an equation (tinted MathLive field).
 * Line controls (move / delete / toggle keyboard) appear only on the focused line (and on hover on desktop).
 * The MathLive keyboard opens when an equation line is focused, and a keyboard button
 * in the focused line's toolbar toggles it.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RICH_LIMITS, parseRich, serializeRich, type RichBlock } from "@/lib/richContent";
import { MathBlockEditor, type MathHandle } from "./MathBlockEditor";
import { useFullKeyboard, useKeyboardInset } from "./useKeyboardInset";
import { makeT, type Locale, type RichT } from "./strings";

export type Line = { id: string; t: "text" | "math"; v: string; incomplete?: boolean };

export interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  readOnly?: boolean;
  locale?: Locale;
  /** Wire this to the project's i18n. Falls back to the built-in ar/en strings. */
  t?: RichT;
  maxBlocks?: number;
  className?: string;
  allowChem?: boolean;
}

let uid = 0;
const nextId = () => `l${++uid}_${Math.random().toString(36).slice(2, 7)}`;

function toLines(value: string): Line[] {
  const blocks = parseRich(value).blocks.filter((b): b is Extract<RichBlock, { t: "text" | "math" }> => b.t !== "chem");
  const lines: Line[] = blocks.map((b, i) => ({ id: `line-${i}`, t: b.t, v: b.v }));
  return lines.length ? lines : [{ id: "line-0", t: "text", v: "" }];
}
const emit = (lines: Line[]) => serializeRich(lines.map(({ t, v }) => ({ t, v })));

const Icon = {
  up: <path d="M12 19V5M5 12l7-7 7 7" />,
  down: <path d="M12 5v14M19 12l-7 7-7-7" />,
  del: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />,
  kbd: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M7 14h10" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
};

const Svg = ({ d }: { d: React.ReactNode }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {d}
  </svg>
);

function TextLine({
  line,
  onChange,
  placeholder,
  label,
  focusToken,
  onBackspaceEmpty,
  readOnly,
}: {
  line: Line;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  focusToken: number;
  onBackspaceEmpty: () => void;
  readOnly?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [line.v]);
  useEffect(() => {
    if (focusToken > 0) ref.current?.focus();
  }, [focusToken]);
  return (
    <div className="rs-text">
      <textarea
        ref={ref}
        rows={1}
        dir="auto"
        value={line.v}
        readOnly={readOnly}
        maxLength={RICH_LIMITS.maxTextChars}
        placeholder={placeholder}
        aria-label={label}
        autoCapitalize="off"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Backspace" && line.v === "" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            onBackspaceEmpty();
          }
        }}
      />
    </div>
  );
}

export function RichEditor({
  value,
  onChange,
  ariaLabel,
  readOnly,
  locale = "ar",
  t: tProp,
  maxBlocks = RICH_LIMITS.maxBlocks,
  className,
}: RichEditorProps) {
  const t = useMemo(() => tProp ?? makeT(locale), [tProp, locale]);
  const nf = useMemo(() => new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en"), [locale]);

  const [lines, setLines] = useState<Line[]>(() => toLines(value));
  const lastEmitted = useRef(value);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focusReq, setFocusReq] = useState<{ id: string; n: number } | null>(null);
  const mathRefs = useRef<Record<string, MathHandle | null>>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const inset = useKeyboardInset();
  const full = useFullKeyboard();

  // External value changes (draft restore) re-sync only when they differ from what we last emitted
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setLines(toLines(value));
    }
  }, [value]);

  const commit = useCallback(
    (next: Line[]) => {
      setLines(next);
      const out = emit(next);
      lastEmitted.current = out;
      onChange(out);
    },
    [onChange]
  );

  const requestFocus = (id: string) => setFocusReq((f) => ({ id, n: (f?.n ?? 0) + 1 }));

  const addLine = (kind: "text" | "math", afterIndex = lines.length - 1) => {
    if (lines.length >= maxBlocks) return;
    const line: Line = { id: nextId(), t: kind, v: "" };
    const next = [...lines.slice(0, afterIndex + 1), line, ...lines.slice(afterIndex + 1)];
    commit(next);
    requestFocus(line.id);
  };

  const setLine = (id: string, patch: Partial<Line>) =>
    commit(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const removeLine = (id: string, focusPrev = true) => {
    const i = lines.findIndex((l) => l.id === id);
    if (lines.length === 1) {
      commit([{ ...lines[0], v: "", incomplete: false }]);
      requestFocus(lines[0].id);
      return;
    }
    const next = lines.filter((l) => l.id !== id);
    commit(next);
    const target = next[Math.max(0, i - 1)];
    if (focusPrev && target) requestFocus(target.id);
  };

  const moveLine = (id: string, dir: -1 | 1) => {
    const i = lines.findIndex((l) => l.id === id);
    const j = i + dir;
    if (j < 0 || j >= lines.length) return;
    const next = [...lines];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
    requestFocus(id);
  };

  // Active line tracking: controls appear only on the focused line
  const onRootBlur = () => {
    clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => {
      if (!rootRef.current?.contains(document.activeElement)) {
        setActiveId(null);
        if (window.mathVirtualKeyboard?.visible) window.mathVirtualKeyboard.hide();
      }
    }, 140);
  };
  useEffect(() => () => clearTimeout(blurTimer.current), []);

  const active = lines.find((l) => l.id === activeId) ?? null;
  const bottomGap = full.visible ? full.height + 24 : inset + 24;

  // Keep the focused line clear of the keyboard
  useEffect(() => {
    if (!activeId || (inset === 0 && !full.visible)) return;
    rootRef.current
      ?.querySelector<HTMLElement>(`[data-line="${activeId}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeId, inset, full.visible, full.height]);

  // The MathLive keyboard follows the focused equation line (also on desktop); text lines use normal keyboard
  useEffect(() => {
    if (readOnly) return;
    if (active?.t === "math") full.show();
    else if (full.visible) full.hide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, active?.t, readOnly]);

  const toggleKeyboard = (id: string) => {
    if (full.visible) full.hide();
    else {
      mathRefs.current[id]?.focus();
      full.show();
    }
  };

  return (
    <div
      ref={rootRef}
      className={"rs" + (className ? ` ${className}` : "")}
      role="group"
      aria-label={ariaLabel ?? t("rich.sheetLabel")}
      style={{
        ["--rs-gap-bottom" as string]: `${bottomGap}px`,
        paddingBottom: full.visible ? full.height : undefined,
      }}
      onBlur={onRootBlur}
    >
      <ol className="rs-lines">
        {lines.map((line, i) => {
          const isActive = line.id === activeId;
          const has = line.v.trim() !== "";
          const typeLabel = line.t === "math" ? t("rich.equationLabel") : t("rich.textLabel");
          const label = `${t("rich.step")} ${nf.format(i + 1)} · ${typeLabel}`;
          const token = focusReq && focusReq.id === line.id ? focusReq.n : 0;
          return (
            <li
              key={line.id}
              data-line={line.id}
              className={
                `rs-line rs-line--${line.t}` +
                (isActive ? " is-active" : "") +
                (has ? " has-content" : "")
              }
              onFocus={() => setActiveId(line.id)}
            >
              <span className="rs-badge" aria-hidden="true">
                {nf.format(i + 1)}
              </span>
              <div className="rs-body">
                {line.t === "text" ? (
                  <TextLine
                    line={line}
                    readOnly={readOnly}
                    label={label}
                    placeholder={t("rich.textPlaceholder")}
                    focusToken={token}
                    onChange={(v) => setLine(line.id, { v })}
                    onBackspaceEmpty={() => removeLine(line.id)}
                  />
                ) : (
                  <MathBlockEditor
                    ref={(h) => {
                      mathRefs.current[line.id] = h;
                    }}
                    value={line.v}
                    readOnly={readOnly}
                    ariaLabel={label}
                    placeholder={t("rich.mathPlaceholder")}
                    autoFocus={token > 0}
                    onChange={(v, incomplete) => setLine(line.id, { v, incomplete })}
                    onEnter={() => addLine("math", i)}
                    onBackspaceEmpty={() => removeLine(line.id)}
                    onFocus={() => setActiveId(line.id)}
                  />
                )}
                {line.t === "math" && isActive && line.incomplete && (
                  <p className="rs-note rs-note--warn">{t("rich.incomplete")}</p>
                )}
                {line.t === "math" && isActive && !has && !line.incomplete && (
                  <p className="rs-note">{t("rich.hint")}</p>
                )}
              </div>
              {!readOnly && (
                <div className="rs-actions" role="group" onPointerDown={(e) => e.preventDefault()}>
                  {line.t === "math" && (
                    <button
                      type="button"
                      aria-label={t("rich.allSymbols")}
                      title={t("rich.allSymbols")}
                      aria-pressed={full.visible}
                      onClick={() => toggleKeyboard(line.id)}
                    >
                      <Svg d={Icon.kbd} />
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={t("rich.moveUp")}
                    title={t("rich.moveUp")}
                    disabled={i === 0}
                    onClick={() => moveLine(line.id, -1)}
                  >
                    <Svg d={Icon.up} />
                  </button>
                  <button
                    type="button"
                    aria-label={t("rich.moveDown")}
                    title={t("rich.moveDown")}
                    disabled={i === lines.length - 1}
                    onClick={() => moveLine(line.id, 1)}
                  >
                    <Svg d={Icon.down} />
                  </button>
                  <button
                    type="button"
                    className="rs-del"
                    aria-label={t("rich.delete")}
                    title={t("rich.delete")}
                    onClick={() => removeLine(line.id)}
                  >
                    <Svg d={Icon.del} />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {!readOnly && (
        <div className="rs-add">
          <button
            type="button"
            className="rs-btn"
            disabled={lines.length >= maxBlocks}
            onClick={() => addLine("text")}
          >
            <Svg d={Icon.plus} />
            {t("rich.addText")}
          </button>
          <button
            type="button"
            className="rs-btn rs-btn--math"
            disabled={lines.length >= maxBlocks}
            onClick={() => addLine("math")}
          >
            <Svg d={Icon.plus} />
            <span className="rs-sigma" aria-hidden="true">
              ∑
            </span>
            {t("rich.addEquation")}
          </button>
          {lines.length >= maxBlocks && (
            <p className="rs-note rs-note--warn rs-span">{t("rich.limitReached")}</p>
          )}
        </div>
      )}
    </div>
  );
}
