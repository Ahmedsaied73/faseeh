'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Maximize, Minimize, ShieldAlert } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
import { getCachedUser } from '@/lib/user-cache';

export interface VideoWatermarkProps {
  userName?: string | null;
  userPhone?: string | null;
  userEmail?: string | null;
  userSlug?: string | null;
  containerRef?: React.RefObject<HTMLElement | null>;
  className?: string;
  showFullscreenButton?: boolean;
}

interface Position {
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  quadrantIndex: number;
}

// 8 baseline target quadrants around the video canvas
const QUADRANTS = [
  { xRatio: 0.22, yRatio: 0.20 }, // Top-Left
  { xRatio: 0.50, yRatio: 0.18 }, // Top-Center
  { xRatio: 0.78, yRatio: 0.20 }, // Top-Right
  { xRatio: 0.25, yRatio: 0.48 }, // Center-Left
  { xRatio: 0.75, yRatio: 0.48 }, // Center-Right
  { xRatio: 0.22, yRatio: 0.70 }, // Bottom-Left (safely above seekbar)
  { xRatio: 0.50, yRatio: 0.72 }, // Bottom-Center
  { xRatio: 0.78, yRatio: 0.70 }, // Bottom-Right
];

export function VideoWatermark({
  userName,
  userPhone,
  userEmail,
  userSlug,
  containerRef,
  className = '',
  showFullscreenButton = true,
}: VideoWatermarkProps) {
  const authUser = useAppSelector(selectUser);
  const [cachedUser, setCachedUser] = useState(() => (typeof window !== 'undefined' ? getCachedUser() : null));

  // Sync cache if auth user updates
  useEffect(() => {
    if (!authUser && typeof window !== 'undefined') {
      const cached = getCachedUser();
      if (cached) setCachedUser(cached);
    }
  }, [authUser]);

  const activeUser = authUser || cachedUser;

  // Consume props or fall back directly to Redux auth / local cache with ZERO network calls
  const name = userName ?? activeUser?.name ?? null;
  const phone = userPhone ?? activeUser?.phoneNumber ?? null;
  const email = userEmail ?? activeUser?.email ?? null;
  const slug = userSlug ?? activeUser?.slug ?? null;

  // Active identifier priority: phone number (as requested) -> email -> slug
  const primaryIdentifier = phone || email || slug;

  const watermarkRef = useRef<HTMLDivElement>(null);
  const primaryPillRef = useRef<HTMLDivElement>(null);
  const ghostPillRef = useRef<HTMLDivElement>(null);

  const [position, setPosition] = useState<Position>(() => {
    const idx = Math.floor(Math.random() * QUADRANTS.length);
    const q = QUADRANTS[idx];
    return { x: q.xRatio * 100, y: q.yRatio * 100, quadrantIndex: idx };
  });

  const [ghostPosition, setGhostPosition] = useState<Position>(() => {
    // Pick opposing quadrant for ghost watermark
    const idx = (Math.floor(Math.random() * QUADRANTS.length) + 4) % QUADRANTS.length;
    const q = QUADRANTS[idx];
    return { x: q.xRatio * 100, y: q.yRatio * 100, quadrantIndex: idx };
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTampered, setIsTampered] = useState(false);
  const [tamperKey, setTamperKey] = useState(0);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Calculate Safe Responsive Bounds (Guarantees zero clipping on mobile/desktop)
  // ─────────────────────────────────────────────────────────────────────────────
  const calculateSafePosition = useCallback(
    (targetQuadIndex: number, pillEl: HTMLElement | null): { x: number; y: number; quadrantIndex: number } => {
      const container = containerRef?.current || watermarkRef.current?.parentElement;
      const cW = container?.clientWidth || 640;
      const cH = container?.clientHeight || 360;

      const pW = pillEl?.offsetWidth || 180;
      const pH = pillEl?.offsetHeight || 30;

      // Safe margins in pixels
      const marginX = pW / 2 + 10;
      const marginYTop = pH / 2 + 10;
      const marginYBottom = pH / 2 + 38; // reserve room for video seekbar & controls

      const minXPct = Math.min(45, (marginX / cW) * 100);
      const maxXPct = Math.max(55, 100 - (marginX / cW) * 100);

      const minYPct = Math.min(45, (marginYTop / cH) * 100);
      const maxYPct = Math.max(55, 100 - (marginYBottom / cH) * 100);

      const quad = QUADRANTS[targetQuadIndex % QUADRANTS.length];

      // Subtle random jitter: ±3%
      const jitterX = (Math.random() * 6 - 3);
      const jitterY = (Math.random() * 6 - 3);

      const rawX = quad.xRatio * 100 + jitterX;
      const rawY = quad.yRatio * 100 + jitterY;

      const clampedX = Math.min(maxXPct, Math.max(minXPct, rawX));
      const clampedY = Math.min(maxYPct, Math.max(minYPct, rawY));

      return {
        x: Number(clampedX.toFixed(2)),
        y: Number(clampedY.toFixed(2)),
        quadrantIndex: targetQuadIndex,
      };
    },
    [containerRef]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Periodic Dynamic Motion Timer (every 10 - 14 seconds)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let timerId: NodeJS.Timeout;

    const moveWatermark = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        setPosition((prev) => {
          // Exclude current quadrant to guarantee noticeable repositioning
          const availableIndices = QUADRANTS.map((_, i) => i).filter((i) => i !== prev.quadrantIndex);
          const nextIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
          return calculateSafePosition(nextIdx, primaryPillRef.current);
        });

        setGhostPosition((prev) => {
          const availableIndices = QUADRANTS.map((_, i) => i).filter((i) => i !== prev.quadrantIndex);
          const nextIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
          return calculateSafePosition(nextIdx, ghostPillRef.current);
        });
      }

      // Semi-randomized interval: 10000ms + random up to 4000ms
      const delay = 10000 + Math.random() * 4000;
      timerId = setTimeout(moveWatermark, delay);
    };

    const initialDelay = 10000 + Math.random() * 3000;
    timerId = setTimeout(moveWatermark, initialDelay);

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        // Recalculate on tab refocus
        setPosition((prev) => calculateSafePosition(prev.quadrantIndex, primaryPillRef.current));
      }
    };

    const handleResize = () => {
      setPosition((prev) => calculateSafePosition(prev.quadrantIndex, primaryPillRef.current));
      setGhostPosition((prev) => calculateSafePosition(prev.quadrantIndex, ghostPillRef.current));
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('resize', handleResize);
    }

    return () => {
      clearTimeout(timerId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [calculateSafePosition]);

  const toggleContainerFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    const container = containerRef?.current || watermarkRef.current?.parentElement;
    if (!container) return;

    const fsEl =
      document.fullscreenElement ||
      (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement;

    if (!fsEl) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {});
      } else if ((container as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
        (container as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
        (document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
      }
    }
  }, [containerRef]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Fullscreen Management & Native Iframe Fullscreen Auto-Promotion
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const container = containerRef?.current || watermarkRef.current?.parentElement;

    const checkFullscreenState = () => {
      const fsEl =
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement;

      const isFs = Boolean(fsEl && container && (fsEl === container || container.contains(fsEl)));
      setIsFullscreen(isFs);

      // CRITICAL FIX: If native iframe player requested fullscreen on its own,
      // promote the whole container to fullscreen so the watermark overlay stays visible!
      const iframe = container?.querySelector('iframe');
      if (fsEl && iframe && fsEl === iframe && container) {
        if (container.requestFullscreen) {
          container.requestFullscreen().catch(() => {});
        } else if ((container as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
          (container as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow 'f' / 'F' or Arabic 'ب' to toggle container fullscreen when not in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'f' || e.key === 'F' || e.key === 'ب') {
        e.preventDefault();
        toggleContainerFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', checkFullscreenState);
    document.addEventListener('webkitfullscreenchange', checkFullscreenState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreenState);
      document.removeEventListener('webkitfullscreenchange', checkFullscreenState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, toggleContainerFullscreen]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Anti-Tampering Observer & Active Heartbeat (DevTools & Script Defense)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const target = containerRef?.current || watermarkRef.current?.parentElement;
    if (!target) return;

    const verifyIntegrity = (): boolean => {
      const wrapper = watermarkRef.current;
      const pill = primaryPillRef.current;

      // 1. Node presence check
      if (!wrapper || !target.contains(wrapper) || !pill || !wrapper.contains(pill)) {
        return false;
      }

      // 2. Text node check
      if (!pill.textContent || pill.textContent.trim().length === 0) {
        return false;
      }

      // 3. Computed style check on wrapper & pill
      const wrapperStyle = window.getComputedStyle(wrapper);
      const pillStyle = window.getComputedStyle(pill);

      if (
        wrapperStyle.display === 'none' ||
        wrapperStyle.visibility === 'hidden' ||
        parseFloat(wrapperStyle.opacity || '1') < 0.05 ||
        pillStyle.display === 'none' ||
        pillStyle.visibility === 'hidden' ||
        parseFloat(pillStyle.opacity || '1') < 0.05 ||
        pillStyle.fontSize === '0px' ||
        pillStyle.color === 'transparent' ||
        pillStyle.color === 'rgba(0, 0, 0, 0)'
      ) {
        return false;
      }

      return true;
    };

    const handleMutation = () => {
      const isValid = verifyIntegrity();
      if (!isValid) {
        setTamperKey((k) => k + 1);
        // If still invalid after remount attempt, mark tampered to blank video
        setTimeout(() => {
          const secondCheck = verifyIntegrity();
          setIsTampered(!secondCheck);
        }, 120);
      } else {
        setIsTampered(false);
      }
    };

    const observer = new MutationObserver(handleMutation);
    observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden', 'aria-hidden'],
    });

    // Heartbeat check every 2.5 seconds
    const heartbeat = setInterval(() => {
      const isValid = verifyIntegrity();
      if (!isValid) {
        setTamperKey((k) => k + 1);
        setIsTampered(true);
      } else {
        setIsTampered(false);
      }
    }, 2500);

    return () => {
      observer.disconnect();
      clearInterval(heartbeat);
    };
  }, [containerRef, tamperKey]);

  // If user is completely unauthenticated and no identifier exists, render nothing
  if (!name && !primaryIdentifier) {
    return null;
  }

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────────────────────
          Tamper Defense Blocker: Blurs/hides video if student forcibly hides watermark via CSS
         ───────────────────────────────────────────────────────────────────────────── */}
      {isTampered && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-6 text-center text-white backdrop-blur-md select-none">
          <ShieldAlert className="mb-3 h-12 w-12 text-rose-500 animate-pulse" />
          <h3 className="text-base sm:text-lg font-bold text-rose-400 mb-1">
            تم إيقاف تشغيل الفيديو لأسباب أمنية
          </h3>
          <p className="max-w-md text-xs sm:text-sm text-slate-300">
            لحماية حقوق الملكية الفكرية، يجب أن تظل علامة الحماية الرقمية مرئية بوضوح لمتابعة المحاضرة.
          </p>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          Container Fullscreen Toggle Button (Unobtrusive hover overlay)
         ───────────────────────────────────────────────────────────────────────────── */}
      {showFullscreenButton && (
        <div className="absolute top-2 left-2 z-30 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 pointer-events-auto">
          <button
            type="button"
            onClick={toggleContainerFullscreen}
            title={isFullscreen ? 'خروج من الشاشة الكاملة (F)' : 'شاشة كاملة (F)'}
            aria-label={isFullscreen ? 'خروج من الشاشة الكاملة' : 'شاشة كاملة'}
            className="flex items-center justify-center p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 backdrop-blur-sm transition shadow-sm"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          Dynamic DRM Watermark Overlay
         ───────────────────────────────────────────────────────────────────────────── */}
      <div
        key={tamperKey}
        ref={watermarkRef}
        className={`absolute inset-0 pointer-events-none select-none overflow-hidden z-20 ${className}`}
        aria-hidden="true"
        data-drm="protected"
      >
        {/* Primary Dynamic Watermark Pill (Name + Phone) */}
        <div
          className="absolute"
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: 'translate3d(-50%, -50%, 0)',
            transition: 'left 2.5s cubic-bezier(0.25, 1, 0.5, 1), top 2.5s cubic-bezier(0.25, 1, 0.5, 1)',
            willChange: 'left, top, transform',
          }}
        >
          <div
            ref={primaryPillRef}
            className="animate-watermark-drift inline-flex items-center gap-1.5 px-3 py-1 rounded-full border shadow-sm backdrop-blur-[0.5px]"
            style={{
              color: 'var(--color-brand-secondary, #90BAE9)',
              borderColor: 'rgba(144, 186, 233, 0.28)',
              backgroundColor: 'rgba(11, 17, 25, 0.32)',
              opacity: 0.28,
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.9)',
            }}
          >
            {name && (
              <span className="font-sans text-[11px] sm:text-xs md:text-sm font-semibold tracking-wide whitespace-nowrap">
                {name}
              </span>
            )}
            {primaryIdentifier && (
              <>
                <span className="text-[10px] opacity-70">•</span>
                <span
                  dir="ltr"
                  className="font-mono text-[11px] sm:text-xs md:text-sm font-medium tracking-normal whitespace-nowrap tabular-nums"
                >
                  <bdi>{primaryIdentifier}</bdi>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Secondary Ghost Micro-Watermark (faint background trace for inpainting/cropping defeat) */}
        {primaryIdentifier && (
          <div
            className="absolute"
            style={{
              left: `${ghostPosition.x}%`,
              top: `${ghostPosition.y}%`,
              transform: 'translate3d(-50%, -50%, 0)',
              transition: 'left 3s cubic-bezier(0.25, 1, 0.5, 1), top 3s cubic-bezier(0.25, 1, 0.5, 1)',
              willChange: 'left, top, transform',
            }}
          >
            <div
              ref={ghostPillRef}
              className="animate-watermark-ghost px-2 py-0.5 rounded font-mono text-[10px] sm:text-xs font-semibold whitespace-nowrap tabular-nums tracking-widest"
              style={{
                color: 'var(--color-brand-secondary, #90BAE9)',
                opacity: 0.14,
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.85)',
              }}
            >
              <bdi dir="ltr">{phone || primaryIdentifier}</bdi>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default VideoWatermark;
