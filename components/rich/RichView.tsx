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
          return (
            <p key={i} dir="auto" className="whitespace-pre-wrap leading-relaxed text-foreground">
              {b.v}
            </p>
          );
        }

        const tex = b.t === "chem" ? `\\ce{${b.v}}` : b.v;
        return <MathHtml key={i} tex={tex} />;
      })}
    </div>
  );
}
