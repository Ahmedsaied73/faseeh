function MoleculeArt() {
  return (
    <svg viewBox="0 0 320 320" fill="none" className="h-full w-full max-w-sm text-white" aria-hidden="true">
      <g opacity="0.9">
        <circle cx="120" cy="120" r="26" stroke="currentColor" strokeWidth="2" className="subj-bob" />
        <circle cx="220" cy="90" r="18" stroke="currentColor" strokeWidth="2" className="subj-bob" style={{ animationDelay: "0.6s" }} />
        <circle cx="230" cy="200" r="30" stroke="currentColor" strokeWidth="2" className="subj-bob" style={{ animationDelay: "1.2s" }} />
        <circle cx="110" cy="230" r="16" stroke="currentColor" strokeWidth="2" className="subj-bob" style={{ animationDelay: "1.8s" }} />
        <path d="M142 108 202 96M138 142 208 188M150 224 200 214M100 214 92 130" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      </g>
    </svg>
  );
}

function OrbitArt() {
  return (
    <svg viewBox="0 0 320 320" fill="none" className="h-full w-full max-w-sm text-white" aria-hidden="true">
      <circle cx="160" cy="160" r="14" fill="currentColor" opacity="0.9" />
      {[0, 60, 120].map((deg, i) => (
        <g key={deg} transform={`rotate(${deg} 160 160)`}>
          <g className={i % 2 === 0 ? "subj-spin-slow" : "subj-spin-rev"}>
            <ellipse cx="160" cy="160" rx="100" ry="44" stroke="currentColor" strokeWidth="1.6" opacity="0.5" />
            <circle cx="260" cy="160" r="6" fill="currentColor" />
          </g>
        </g>
      ))}
    </svg>
  );
}

export function ChemistryAuthArt({ variant, compact = false }: { variant: "login" | "register"; compact?: boolean }) {
  return (
    <div className={`relative flex h-full w-full items-center justify-center ${compact ? "p-4 scale-75" : ""}`}>
      {variant === "login" ? <MoleculeArt /> : <OrbitArt />}
    </div>
  );
}

export function ChemistryNotFoundArt() {
  return (
    <svg width="120" height="72" viewBox="0 0 120 72" fill="none" className="mx-auto text-brand-primary" aria-hidden="true">
      <circle cx="26" cy="36" r="16" stroke="currentColor" strokeWidth="2" className="subj-bob" />
      <circle cx="94" cy="36" r="16" stroke="currentColor" strokeWidth="2" className="subj-bob text-brand-accent" style={{ animationDelay: "1s" }} />
      <path d="M46 30 58 24M46 42 58 48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-brand-muted" />
      <path d="M62 24 74 30M62 48 74 42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-brand-muted" />
    </svg>
  );
}
