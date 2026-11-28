import type { BadgeTone, IconStyle } from '@/lib/gamification.config';
import './gamify.css';

type Shape = { d: string; s?: boolean; w?: number; c?: boolean };

const FLAME =
  'M32 15 C34 23 43 27 43 37 A11 11 0 0 1 21 37 C21 31 25 29 27 23 C29 26 30 28 31 29 C31 25 31 20 32 15 Z';
const FLAME_IN =
  'M32 32 C34 35 38 36 38 40 A6 6 0 0 1 26 40 C26 37 30 36 32 32 Z';
const STAR =
  'M32 19 L35.53 28.15 L45.31 28.67 L37.71 34.85 L40.23 44.33 L32 39 L23.77 44.33 L26.29 34.85 L18.69 28.67 L28.47 28.15 Z';
const BOLT = 'M35 16 L23 34 H31 L29 48 L42 29 H34 Z';

/* accessories for the mascot variant (drawn above the face) */
const ACC: Record<string, string[]> = {
  first: [
    'M32 21 V14',
    'M32 15 C32 10 37 9 40 10 C40 14 36 16 32 15 Z',
    'M32 17 C32 13 28 12 25 13 C25 17 28 18 32 17 Z',
  ],
  steady: [
    'M20.5 34 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0',
    'M33.5 34 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0',
    'M30.5 33.5 H33.5',
  ],
  hunter: [
    'M25 14 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0',
    'M29 14 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0',
  ],
  perfect: ['M23 22 L24 13 L28.5 17 L32 10 L35.5 17 L40 13 L41 22 Z'],
  week: [FLAME],
  learner: ['M44 22 V12', 'M40 16 L44 12 L48 16'],
  master: ['M32 9 L48 16 L32 23 L16 16 Z', 'M46 18 V26'],
  momentum: [BOLT],
  star: [STAR],
};

const ACC_T: Record<string, string | undefined> = {
  week: 'translate(32 14) scale(.42) translate(-32 -32)',
  momentum: 'translate(32 14) scale(.42) translate(-32 -32)',
  star: 'translate(32 12) scale(.42) translate(-32 -32)',
};

function MascotFace({
  mood,
  locked,
}: {
  mood: 'neutral' | 'happy' | 'cheer';
  locked: boolean;
}) {
  const sleepy = locked;
  return (
    <g className="mas-face">
      <circle cx="32" cy="38" r="16.5" className="mas-skin" />
      {sleepy ? (
        <>
          <path d="M24.5 37 Q27 39.5 29.5 37" className="mas-line" />
          <path d="M34.5 37 Q37 39.5 39.5 37" className="mas-line" />
          <path d="M29 44 H35" className="mas-line" />
        </>
      ) : mood === 'happy' || mood === 'cheer' ? (
        <>
          <path d="M24.5 37 Q27 33.5 29.5 37" className="mas-line" />
          <path d="M34.5 37 Q37 33.5 39.5 37" className="mas-line" />
          {mood === 'cheer' ? (
            <path d="M27 42.5 Q32 50 37 42.5 Z" className="mas-mouth" />
          ) : (
            <path d="M27.5 43 Q32 47.5 36.5 43" className="mas-line" />
          )}
        </>
      ) : (
        <>
          <circle cx="27" cy="36.5" r="2.3" className="mas-eye" />
          <circle cx="37" cy="36.5" r="2.3" className="mas-eye" />
          <path d="M28 43 Q32 46.5 36 43" className="mas-line" />
        </>
      )}
      <circle cx="23" cy="42" r="2.6" className="mas-cheek" />
      <circle cx="41" cy="42" r="2.6" className="mas-cheek" />
    </g>
  );
}

export function BadgeArt({
  id,
  style = 'mascot',
  locked,
  size = 72,
  tone = 'primary',
  className,
}: {
  id: string;
  style?: IconStyle;
  locked: boolean;
  size?: number;
  tone?: BadgeTone;
  className?: string;
}) {
  const acc = ACC[id] ?? ACC.star;
  const resolvedStyle: IconStyle = style || 'mascot';
  const cls = [
    'tq-art',
    `is-${resolvedStyle}`,
    tone === 'accent' ? 'is-accent' : '',
    locked ? 'is-locked' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      className={cls}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 32 a29 29 0 1 0 58 0 a29 29 0 1 0 -58 0" className="art-base" />
      <g className="mas-acc" transform={ACC_T[id]}>
        {acc.map((d, i) => (
          <path key={i} d={d} className={d.includes('Z') ? 'acc-f' : 'acc-s'} />
        ))}
      </g>
      <MascotFace
        mood={
          id === 'perfect' || id === 'star' || id === 'momentum'
            ? 'cheer'
            : id === 'first'
              ? 'neutral'
              : 'happy'
        }
        locked={locked}
      />
    </svg>
  );
}

export function Currency({
  name,
  style = 'mascot',
  size = 22,
  tone,
  className,
}: {
  name: 'flame' | 'bolt' | 'star';
  style?: IconStyle | 'line' | 'solid';
  size?: number;
  tone?: BadgeTone;
  className?: string;
}) {
  const shapes: Shape[] =
    name === 'flame'
      ? [{ d: FLAME }, { d: FLAME_IN, c: true }]
      : name === 'bolt'
        ? [{ d: BOLT }]
        : [{ d: STAR }];
  const resolvedTone: BadgeTone = tone ?? (name === 'flame' ? 'accent' : 'primary');
  const variant = style === 'line' ? 'line' : 'solid';
  const cls = [
    'tq-cur',
    `is-${variant}`,
    resolvedTone === 'accent' ? 'is-accent' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      className={cls}
      viewBox="14 11 36 40"
      width={size}
      height={(size * 40) / 36}
      aria-hidden="true"
      focusable="false"
    >
      {shapes.map((m, i) => (
        <path key={i} d={m.d} className={m.c ? 'cur-c' : 'cur-f'} />
      ))}
    </svg>
  );
}

export function Mascot({
  mood = 'happy',
  size = 96,
  className,
}: {
  mood?: 'neutral' | 'happy' | 'cheer';
  size?: number;
  className?: string;
}) {
  const cls = ['tq-art', 'is-mascot', 'tq-mascot', className ?? ''].filter(Boolean).join(' ');
  return (
    <svg
      className={cls}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 32 a29 29 0 1 0 58 0 a29 29 0 1 0 -58 0" className="art-base" />
      <g className="mas-acc">
        <path d="M33 8 L27 17 H32 L30 23 L38 14 H33 Z" className="acc-f" />
      </g>
      <MascotFace mood={mood} locked={false} />
    </svg>
  );
}
