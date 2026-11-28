'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  BADGE_DEFINITIONS,
  levelName,
  type BadgeTone,
} from '@/lib/gamification.config';
import { BadgeArt, Mascot } from './art';
import { useReducedMotion } from './hooks';
import { useGamification } from './provider';
import { UIcon } from './ui';

type Pop = { id: number; text: string };
type Toast = { key: string; id: string; title: string; tone: BadgeTone };

function burst(canvas: HTMLCanvasElement | null) {
  if (!canvas || typeof window === 'undefined') return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  const css = getComputedStyle(document.documentElement);
  const primary = css.getPropertyValue('--color-brand-primary').trim();
  const second = css.getPropertyValue('--color-brand-secondary').trim();
  const accent = css.getPropertyValue('--color-brand-accent').trim();
  const onPrimary = css.getPropertyValue('--color-on-primary').trim();
  const colors = [primary, second, primary, onPrimary, accent, accent].filter(Boolean);
  if (colors.length === 0) return;

  const parts = Array.from({ length: 140 }, () => ({
    x: w / 2,
    y: h * 0.42,
    vx: (Math.random() - 0.5) * 14,
    vy: -(Math.random() * 13 + 4),
    g: 0.38 + Math.random() * 0.2,
    s: 5 + Math.random() * 7,
    r: Math.random() * 6.28,
    vr: (Math.random() - 0.5) * 0.4,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));

  const t0 = performance.now();
  const frame = (t: number) => {
    const age = t - t0;
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.992;
      p.r += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.globalAlpha = Math.max(0, 1 - age / 2400);
      ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.6);
      ctx.restore();
    }
    if (age < 2400) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
  };
  requestAnimationFrame(frame);
}

export function GamifyEffects() {
  const { enabled, latestEvent: ev } = useGamification();
  const pathname = usePathname() ?? '';
  const reduced = useReducedMotion();
  const [pops, setPops] = useState<Pop[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lvl, setLvl] = useState<number | null>(null);
  const [lvlBadges, setLvlBadges] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current) {
        clearTimeout(timer);
      }
      timersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!enabled || !ev) return;
    const id = ev.id;

    if (ev.gain > 0) {
      setPops((p) => [...p, { id, text: `+${ev.gain} XP` }]);
      const popTimer = setTimeout(() => {
        setPops((p) => p.filter((i) => i.id !== id));
      }, 1400);
      timersRef.current.push(popTimer);
    }

    const isQuizResultRoute = pathname.includes('/quiz/result');
    const showCornerToasts = ev.kind !== 'quiz' && !isQuizResultRoute && ev.levelUp === null;
    if (showCornerToasts) {
      ev.badges.forEach((bid) => {
        const b = BADGE_DEFINITIONS.find((i) => i.id === bid);
        if (!b) return;
        const key = `${id}-${bid}`;
        setToasts((t) => [...t.slice(-1), { key, id: bid, title: b.title, tone: b.tone }]);
        const toastTimer = setTimeout(() => {
          setToasts((t) => t.filter((i) => i.key !== key));
        }, 4200);
        timersRef.current.push(toastTimer);
      });
    }

    if (ev.levelUp !== null) {
      setLvl(ev.levelUp);
      setLvlBadges(ev.badges);
      if (!reduced) {
        burst(canvasRef.current);
      }
    }
  }, [enabled, ev, pathname, reduced]);

  useEffect(() => {
    if (lvl === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLvl(null);
    };
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => setLvl(null), 7000);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [lvl]);

  if (!enabled) return null;

  return (
    <>
      <canvas ref={canvasRef} className="g-confetti" aria-hidden="true" />
      <div className="g-pops" aria-hidden="true">
        {pops.map((p) => (
          <span key={p.id} className="g-pop">
            {p.text}
          </span>
        ))}
      </div>
      {lvl === null && toasts.length > 0 && (
        <div className="g-toasts" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.key} className={`g-toast${t.tone === 'accent' ? ' is-accent' : ''}`}>
              <BadgeArt id={t.id} style="mascot" tone={t.tone} locked={false} size={44} />
              <span>
                <small>شارة جديدة اتفتحت</small>
                <strong>{t.title}</strong>
              </span>
              <button
                type="button"
                className="g-toast-x"
                aria-label="إغلاق الإشعار"
                onClick={() => setToasts((list) => list.filter((i) => i.key !== t.key))}
              >
                <UIcon name="close" />
              </button>
            </div>
          ))}
        </div>
      )}
      {lvl !== null && (
        <div
          className="g-levelup"
          role="dialog"
          aria-modal="true"
          aria-labelledby="g-lu-title"
          onClick={() => setLvl(null)}
        >
          <div className="g-lu-card" onClick={(e) => e.stopPropagation()}>
            <div className="g-lu-halo">
              <Mascot mood="cheer" size={110} />
            </div>
            <span className="g-lu-kicker">ترقية مستوى جديدة</span>
            <h3 id="g-lu-title">
              مستوى {lvl}: {levelName(lvl)}
            </h3>
            <p>كل نقطة جمعتها جاية من مذاكرة حقيقية.</p>
            {lvlBadges.length > 0 && (
              <div className="g-lu-badges" aria-label="الشارات المفتوحة">
                {lvlBadges.slice(0, 3).map((bid) => {
                  const b = BADGE_DEFINITIONS.find((x) => x.id === bid);
                  if (!b) return null;
                  return (
                    <span
                      key={bid}
                      className={`g-lu-chip${b.tone === 'accent' ? ' is-accent' : ''}`}
                    >
                      <BadgeArt id={bid} style="mascot" tone={b.tone} locked={false} size={24} />
                      {b.title}
                    </span>
                  );
                })}
              </div>
            )}
            <button type="button" className="g-lu-btn" onClick={() => setLvl(null)} autoFocus>
              تمام
            </button>
          </div>
        </div>
      )}
    </>
  );
}
