import React, { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import "katex/contrib/mhchem";
import { parseRich } from "@/lib/richContent";

const KATEX_MACROS = {
  "\\displaylines": "\\begin{gathered}#1\\end{gathered}",
  "\\differentialD": "\\mathrm{d}",
  "\\exponentialE": "\\mathrm{e}",
  "\\imaginaryI": "\\mathrm{i}",
};

function MathHtml({ tex }: { tex: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        displayMode: true,
        throwOnError: false,
        trust: false,
        strict: "ignore",
        maxExpand: 1000,
        macros: KATEX_MACROS,
      });
    } catch {
      return null;
    }
  }, [tex]);

  return html ? (
    <div dir="ltr" className="rv-math" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <code dir="ltr" className="my-2 block overflow-x-auto rounded bg-muted/50 p-2 font-mono text-sm">
      {tex}
    </code>
  );
}

/**
 * Renders text containing inline ($...$) or block ($$...$$) math expressions using KaTeX.
 */
function FormattedText({ text }: { text: string }) {
  const elements = useMemo(() => {
    if (!text || (!text.includes("$") && !text.includes("\\(") && !text.includes("\\["))) {
      return text;
    }

    const regex = /(\$\$[\s\S]*?\$\$|\$(?:\\\$|[^\$])+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (!part) return null;

      let isBlock = false;
      let mathCode = "";

      if (part.startsWith("$$") && part.endsWith("$$")) {
        isBlock = true;
        mathCode = part.slice(2, -2).trim();
      } else if (part.startsWith("\\[") && part.endsWith("\\]")) {
        isBlock = true;
        mathCode = part.slice(2, -2).trim();
      } else if (part.startsWith("$") && part.endsWith("$")) {
        isBlock = false;
        mathCode = part.slice(1, -1).trim();
      } else if (part.startsWith("\\(") && part.endsWith("\\)")) {
        isBlock = false;
        mathCode = part.slice(2, -2).trim();
      } else {
        return <span key={index}>{part}</span>;
      }

      try {
        const rendered = katex.renderToString(mathCode, {
          displayMode: isBlock,
          throwOnError: false,
          trust: false,
          strict: "ignore",
          maxExpand: 1000,
          macros: KATEX_MACROS,
        });

        if (isBlock) {
          return (
            <div
              key={index}
              dir="ltr"
              className="my-2 inline-block overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: rendered }}
            />
          );
        }

        return (
          <span
            key={index}
            dir="ltr"
            className="inline-block px-1 align-baseline"
            dangerouslySetInnerHTML={{ __html: rendered }}
          />
        );
      } catch {
        return <code key={index} dir="ltr">{part}</code>;
      }
    });
  }, [text]);

  return (
    <p dir="auto" className="rv-text">
      {elements}
    </p>
  );
}

export interface RichViewProps {
  value: string | null | undefined;
  className?: string;
  numbered?: boolean;
  locale?: "ar" | "en";
}

/** Read-only renderer for any stored value (plain string or envelope). `numbered` shows the step badges of the sheet. */
export function RichView({ value, className, numbered = false, locale = "ar" }: RichViewProps) {
  const blocks = useMemo(() => parseRich(value).blocks, [value]);
  const nf = useMemo(() => new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en"), [locale]);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={"rv" + (numbered ? " rv--numbered" : "") + (className ? ` ${className}` : "")}>
      {blocks.map((b, i) => (
        <div className="rv-row" key={i}>
          {numbered && <span className="rv-badge">{nf.format(i + 1)}</span>}
          {b.t === "text" ? (
            <FormattedText text={b.v} />
          ) : (
            <MathHtml tex={b.t === "chem" ? `\\ce{${b.v}}` : b.v} />
          )}
        </div>
      ))}
    </div>
  );
}
