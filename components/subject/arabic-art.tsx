const LETTERS = ["ا", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ر", "س", "ش", "ع", "ف", "ق", "ك", "ل", "م", "ن", "و", "ي"];
const MARKS = ["ـَ", "ـِ", "ـُ", "ـّ", "ـْ"];
const SIZES = ["text-xl", "text-2xl", "text-3xl"];

function floaters(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    glyph: i % 4 === 3 ? MARKS[Math.floor(i / 4) % MARKS.length] : LETTERS[i % LETTERS.length],
    left: ((i * 37 + 8) % 88) + 4,
    top: ((i * 53 + 5) % 82) + 6,
    delay: (i % 8) * 0.55,
    duration: 5 + (i % 5),
    size: SIZES[i % 3],
  }));
}

/** Eight-point star = two squares, one rotated 45deg. Drawn around (0,0). */
function StarOutline({ size }: { size: number }) {
  const h = size / 2;
  return (
    <>
      <rect x={-h} y={-h} width={size} height={size} />
      <rect x={-h} y={-h} width={size} height={size} transform="rotate(45)" />
    </>
  );
}

function Arabesque({ reverse = false }: { reverse?: boolean }) {
  return (
    <svg
      viewBox="-200 -200 400 400"
      className="absolute inset-0 m-auto h-full w-full text-white"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <g className={reverse ? "subj-spin-rev" : "subj-spin-slow"} opacity="0.4">
        <StarOutline size={270} />
        <StarOutline size={200} />
      </g>
      <g className={reverse ? "subj-spin-slow" : "subj-spin-rev"} opacity="0.55">
        <StarOutline size={140} />
        <StarOutline size={84} />
      </g>
      <circle r="190" opacity="0.15" />
      <circle r="120" opacity="0.2" />
    </svg>
  );
}

function Flourish({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 20" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <path d="M4 12 C 40 2, 70 22, 100 12 S 160 2, 196 12" pathLength={1} className="subj-draw" />
    </svg>
  );
}

export function ArabicAuthArt({ variant, compact = false }: { variant: "login" | "register"; compact?: boolean }) {
  const items = floaters(compact ? 14 : 22);
  return (
    <div className="relative h-full w-full overflow-hidden" aria-hidden="true">
      <Arabesque reverse={variant === "register"} />

      {items.map((it, i) => (
        <span
          key={i}
          className={"subj-float absolute font-bold text-white/70 " + it.size}
          style={{ left: `${it.left}%`, top: `${it.top}%`, animationDelay: `${it.delay}s`, animationDuration: `${it.duration}s` }}
        >
          {it.glyph}
        </span>
      ))}

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {variant === "login" ? (
          <div className="flex flex-col items-center rounded-2xl bg-brand-ink/60 px-8 py-4 backdrop-blur-sm">
            <p className={"font-extrabold text-white " + (compact ? "text-3xl" : "text-6xl")}>أهلًا</p>
            <Flourish className="mt-1 h-4 w-40 text-brand-primary" />
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-2xl bg-brand-ink/60 px-8 py-4 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              {["أ", "ب", "ت", "ث"].map((l, i) => (
                <span
                  key={l}
                  className={
                    "subj-rise grid place-items-center rounded-lg border border-white/30 bg-white/10 font-bold text-white " +
                    (compact ? "h-8 w-8 text-lg" : "h-12 w-12 text-3xl")
                  }
                  style={{ animationDelay: `${i * 0.35}s` }}
                >
                  {l}
                </span>
              ))}
            </div>
            <p className={"mt-3 font-extrabold text-white " + (compact ? "text-2xl" : "text-5xl")}>ابدأ</p>
          </div>
        )}
      </div>
    </div>
  );
}

const parsedWords = [
  { text: "قَرَأَ", tag: "فعل ماضٍ" },
  { text: "الطَّالِبُ", tag: "فاعل" },
  { text: "الكِتَابَ", tag: "مفعول به" },
];

/** 404: a sentence being parsed (i'rab) — and one stray word that has no place in it. */
export function ArabicNotFoundArt() {
  return (
    <div className="relative mx-auto w-full max-w-xl py-6" aria-hidden="true">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-brand-primary/20">
        <svg viewBox="-200 -200 400 400" className="h-72 w-72" fill="none" stroke="currentColor" strokeWidth="1.2">
          <g className="subj-spin-slow">
            <StarOutline size={270} />
            <StarOutline size={200} />
          </g>
        </svg>
      </div>

      <div className="relative flex items-end justify-center gap-3 sm:gap-6">
        {parsedWords.map((w, i) => (
          <div key={w.text} className="flex flex-col items-center gap-2">
            <span
              className="subj-tag-in rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-bold text-brand-primary"
              style={{ animationDelay: `${0.4 + i * 0.7}s` }}
            >
              {w.tag}
            </span>
            <span className="h-3 w-px bg-brand-border" />
            <span className="text-2xl font-extrabold text-brand-text sm:text-4xl">{w.text}</span>
          </div>
        ))}

        <div className="flex flex-col items-center gap-2">
          <span
            className="subj-tag-in rounded-full border border-dashed border-brand-accent/60 px-2.5 py-1 text-xs font-bold text-brand-accent"
            style={{ animationDelay: "2.7s" }}
          >
            بلا محل
          </span>
          <span className="h-3 border-s border-dashed border-brand-accent/50" />
          <span className="subj-wander rounded-lg border border-dashed border-brand-accent/60 px-3 py-0.5 text-2xl font-extrabold text-brand-accent sm:text-4xl">
            ٤٠٤
          </span>
        </div>
      </div>
    </div>
  );
}
