import type { ReactNode } from 'react';
import type { BadgeTone } from '@/lib/gamification.config';

const P: Record<string, string> = {
  check: 'M5 12.5 L10 17 L19 7',
  lock: 'M6 11 H18 V19 a1 1 0 0 1 -1 1 H7 a1 1 0 0 1 -1 -1 Z M8.5 11 V8 a3.5 3.5 0 0 1 7 0 V11',
  arrow: 'M19 12 H5 M11 6 L5 12 L11 18',
  target: 'M12 4 a8 8 0 1 0 0.01 0 Z M12 8.5 a3.5 3.5 0 1 0 0.01 0 Z M12 12 H12.01',
  refresh: 'M20 12 a8 8 0 1 1 -2.5 -5.8 M20 4 V8 H16',
  play: 'M8 5 L19 12 L8 19 Z',
  close: 'M6 6 L18 18 M18 6 L6 18',
};

export type UIconName = keyof typeof P;

export function UIcon({
  name,
  className,
  size,
}: {
  name: UIconName;
  className?: string;
  size?: number;
}) {
  return (
    <svg
      className={className ? `g-ui ${className}` : 'g-ui'}
      style={size ? { width: size, height: size } : undefined}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={P[name]} />
    </svg>
  );
}

export function Ring({
  size = 120,
  stroke = 10,
  pct,
  label,
  tone = 'primary',
  className,
  children,
}: {
  size?: number;
  stroke?: number;
  pct: number;
  label: string;
  tone?: BadgeTone;
  className?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const half = size / 2;
  const clamped = Math.max(0, Math.min(100, pct));

  return (
    <div
      className={className ? `g-ring ${className}` : 'g-ring'}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <g transform={`translate(${size} 0) scale(-1 1) rotate(-90 ${half} ${half})`}>
          <circle
            className="g-ring-track"
            cx={half}
            cy={half}
            r={r}
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            className={`g-ring-fill${tone === 'accent' ? ' is-accent' : ''}`}
            cx={half}
            cy={half}
            r={r}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - clamped / 100)}
          />
        </g>
      </svg>
      <div className="g-ring-body">{children}</div>
    </div>
  );
}

export function ProgressBar({
  pct,
  label,
  tone = 'primary',
  size = 'md',
  className,
}: {
  pct: number;
  label?: string;
  tone?: 'primary' | 'accent' | 'complete' | 'perfect' | 'good' | 'low';
  size?: 'md' | 'sm';
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const fillClass =
    tone === 'complete' || tone === 'perfect' || tone === 'low' || tone === 'accent'
      ? `is-${tone}`
      : undefined;

  return (
    <div
      className={['g-bar', size === 'sm' ? 'g-bar-sm' : '', className ?? ''].filter(Boolean).join(' ')}
      role={label ? 'progressbar' : undefined}
      aria-valuenow={label ? clamped : undefined}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <i className={fillClass} style={{ width: `${clamped}%` }} />
    </div>
  );
}
