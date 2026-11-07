import React, { useMemo } from "react";
import katex from "katex";
import "katex/contrib/mhchem";
import { parseRich } from "@/lib/richContent";

function MathHtml({ tex }: { tex: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        displayMode: true,
        throwOnError: false,
        trust: false,
        strict: "ignore",
        maxExpand: 1000,
      });
    } catch {
      return null;
    }
  }, [tex]);

  if (!html) {
    return (
      <code dir="ltr" className="my-2 block overflow-x-auto rounded bg-muted/50 p-2 font-mono text-sm">
        {tex}
      </code>
    );
  }

  return (
    <div
      dir="ltr"
      className="my-2 overflow-x-auto text-center"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Renders text containing inline ($...$) or block ($$...$$) math expressions using KaTeX.
 */
function FormattedText({ text }: { text: string }) {
  const elements = useMemo(() => {
    if (!text || (!text.includes("$") && !text.includes("\\("))) {
      return text;
    }

    // Matches $$...$$, $...$, \(...\), or \[...\]
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
    <p dir="auto" className="whitespace-pre-wrap leading-relaxed text-foreground">
      {elements}
    </p>
  );
}

export interface RichViewProps {
  value: string | null | undefined;
  className?: string;
}

export function RichView({ value, className = "" }: RichViewProps) {
  const blocks = useMemo(() => parseRich(value).blocks, [value]);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={`rich-view space-y-2 ${className}`}>
      {blocks.map((b, i) => {
        if (b.t === "text") {
          return <FormattedText key={i} text={b.v} />;
        }

        const tex = b.t === "chem" ? `\\ce{${b.v}}` : b.v;
        return <MathHtml key={i} tex={tex} />;
      })}
    </div>
  );
}
