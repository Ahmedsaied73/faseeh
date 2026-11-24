'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Check,
  Loader2,
  ChevronRight,
  Gauge,
  Sliders,
} from 'lucide-react';
import { VideoWatermark } from './VideoWatermark';
import { API_BASE_URL } from '@/lib/api-client';
import { createCachedFragmentLoader, type CachedLoaderTelemetry } from '@/lib/hls-cached-loader';
import type { BunnyCacheConfig } from '@/types/bunny';

export interface VideoTelemetryPayload extends CachedLoaderTelemetry {
  videoSlug: string;
  playerMode: 'hls' | 'iframe';
  deviceClass: 'mobile' | 'tablet' | 'desktop';
  cacheEnabled: boolean;
  ttffMs: number | null;
  fallbackReason: string | null;
}

export function detectDeviceClass(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    return 'tablet';
  }
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

export function flushVideoTelemetry(payload: VideoTelemetryPayload): void {
  if (typeof window === 'undefined' || !payload.videoSlug) return;
  try {
    fetch(`${API_BASE_URL}/videos/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: 'include',
    }).catch(() => {});
  } catch {
    // Ignore telemetry errors
  }
}

export interface CustomVideoPlayerProps {
  hlsUrl: string;
  playbackUrlFallback?: string;
  title?: string;
  videoId?: string;
  videoSlug?: string;
  cacheConfig?: BunnyCacheConfig;
  onFallbackToIframe?: () => void;
  onTelemetryFlush?: (data: VideoTelemetryPayload) => void;
  className?: string;
}

interface QualityOption {
  index: number; // -1 for auto, 0..N for hls.levels
  height: number;
  label: string;
  arabicNote: string;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function CustomVideoPlayer({
  hlsUrl,
  playbackUrlFallback,
  title,
  videoId,
  videoSlug,
  cacheConfig,
  onFallbackToIframe,
  onTelemetryFlush,
  className = '',
}: CustomVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedLoadRef = useRef(false);
  const playClickedAtRef = useRef<number | null>(null);
  const ttffMsRef = useRef<number | null>(null);
  const fallbackReasonRef = useRef<string | null>(null);
  const telemetryFlushedRef = useRef(false);
  const loaderTelemetryRef = useRef<CachedLoaderTelemetry>({
    segmentHits: 0,
    segmentMisses: 0,
    bytesFromCache: 0,
    bytesFromNetwork: 0,
    idbErrors: 0,
  });

  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);

  // Quality settings
  const [qualityOptions, setQualityOptions] = useState<QualityOption[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const [activeQualityLabel, setActiveQualityLabel] = useState<string>('480p');

  // Settings menu state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [menuView, setMenuView] = useState<'main' | 'quality' | 'speed'>('main');

  // Progress bar hover/drag state
  const [isProgressHovered, setIsProgressHovered] = useState(false);
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Initialize HLS Stream & Set Default 480p Quality
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    let hls: Hls | null = null;
    hasStartedLoadRef.current = false;

    if (Hls.isSupported()) {
      const cacheEnabled = Boolean(cacheConfig?.enabled && videoId);
      hls = new Hls({
        capLevelToPlayerSize: false,
        autoStartLoad: false,
        maxBufferLength: 20,
        maxMaxBufferLength: 45,
        backBufferLength: 60,
        enableWorker: true,
        ...(cacheEnabled && videoId
          ? {
              fLoader: createCachedFragmentLoader({
                videoId,
                maxBudgetMb: cacheConfig?.maxBudgetMb,
                ttlDays: cacheConfig?.ttlDays,
                telemetry: loaderTelemetryRef.current,
              }),
            }
          : {}),
      });
      hlsRef.current = hls;

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsBuffering(false);

        // Map and sort available levels (highest first)
        const levels = hls?.levels || [];
        const options: QualityOption[] = levels.map((lvl, idx) => {
          let note = '';
          if (lvl.height >= 720) note = 'عالية الدقة';
          else if (lvl.height === 480) note = 'الموصى بها';
          else if (lvl.height === 360) note = 'توفير البيانات';
          else note = 'منخفضة';

          return {
            index: idx,
            height: lvl.height,
            label: `${lvl.height}p`,
            arabicNote: note,
          };
        });

        // Add Auto option
        options.sort((a, b) => b.height - a.height);
        setQualityOptions([
          ...options,
          { index: -1, height: 0, label: 'تلقائي (Auto)', arabicNote: 'يتكيف مع سرعة النت' },
        ]);

        // INVARIANT: Default and recommended quality is strictly 480p
        const level480Index = levels.findIndex((lvl) => lvl.height === 480);
        if (level480Index !== -1) {
          hls!.startLevel = level480Index;
          hls!.currentLevel = level480Index;
          setCurrentQuality(level480Index);
          setActiveQualityLabel('480p (الموصى بها)');
        } else {
          // If exact 480p is absent, select closest level <= 480
          const closest = levels
            .map((lvl, idx) => ({ idx, height: lvl.height }))
            .filter((l) => l.height <= 480)
            .sort((a, b) => b.height - a.height)[0];

          const fallbackIdx = closest ? closest.idx : 0;
          hls!.startLevel = fallbackIdx;
          hls!.currentLevel = fallbackIdx;
          setCurrentQuality(fallbackIdx);
          setActiveQualityLabel(`${levels[fallbackIdx]?.height || 480}p`);
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        if (hls?.autoLevelEnabled) {
          const lvl = hls.levels[data.level];
          if (lvl) {
            setActiveQualityLabel(`تلقائي (${lvl.height}p)`);
          }
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.warn('HLS stream error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              // Fatal non-recoverable error -> fallback to iframe
              fallbackReasonRef.current = data.details || data.type;
              hls?.destroy();
              if (onFallbackToIframe) {
                onFallbackToIframe();
              }
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari/iOS playback
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsBuffering(false);
      });
    } else {
      // Neither supported -> fallback
      fallbackReasonRef.current = 'hls_unsupported';
      if (onFallbackToIframe) onFallbackToIframe();
    }

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [hlsUrl, videoId, cacheConfig?.enabled, cacheConfig?.maxBudgetMb, cacheConfig?.ttlDays, onFallbackToIframe]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Video Events Listeners
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0 && video.duration > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBufferedPercent((bufferedEnd / video.duration) * 100);
      }
    };

    const handleDurationChange = () => {
      setDuration(video.duration);
    };

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
      if (playClickedAtRef.current !== null && ttffMsRef.current === null) {
        ttffMsRef.current = Math.round(performance.now() - playClickedAtRef.current);
      }
    };
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  // Smooth 60fps progress bar sync while playing (timeupdate only fires ~4Hz)
  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video && !isDraggingRef.current) {
        setCurrentTime(video.currentTime);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2b. Flush Video Telemetry Once on pagehide / unmount
  // ─────────────────────────────────────────────────────────────────────────────
  const flushOnce = useCallback(() => {
    if (telemetryFlushedRef.current || !videoSlug) return;
    telemetryFlushedRef.current = true;
    const payload: VideoTelemetryPayload = {
      videoSlug,
      playerMode: 'hls',
      deviceClass: detectDeviceClass(),
      cacheEnabled: Boolean(cacheConfig?.enabled && videoId),
      ...loaderTelemetryRef.current,
      ttffMs: ttffMsRef.current,
      fallbackReason: fallbackReasonRef.current,
    };
    if (onTelemetryFlush) {
      onTelemetryFlush(payload);
    } else {
      flushVideoTelemetry(payload);
    }
  }, [videoSlug, cacheConfig?.enabled, videoId, onTelemetryFlush]);

  useEffect(() => {
    telemetryFlushedRef.current = false;
    const onPageHide = () => flushOnce();
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      flushOnce();
    };
  }, [flushOnce]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. User Controls (Play, Seek, Volume, Speed, Fullscreen)
  // ─────────────────────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      if (!hasStartedLoadRef.current) {
        hasStartedLoadRef.current = true;
        if (playClickedAtRef.current === null) {
          playClickedAtRef.current = performance.now();
        }
        hlsRef.current?.startLoad();
      }
      video.play().catch((err) => console.warn('Play interrupted:', err));
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const val = Number(e.target.value);
    video.volume = val;
    video.muted = val === 0;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const handleSelectQuality = (index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;

    hls.currentLevel = index;
    setCurrentQuality(index);

    if (index === -1) {
      setActiveQualityLabel('تلقائي (Auto)');
    } else {
      const lvl = hls.levels[index];
      const opt = qualityOptions.find((o) => o.index === index);
      const note = opt?.arabicNote ? ` (${opt.arabicNote})` : '';
      setActiveQualityLabel(lvl ? `${lvl.height}p${note}` : '480p');
    }
    setIsSettingsOpen(false);
  };

  const handleSelectSpeed = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackRate(speed);
    setIsSettingsOpen(false);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Progress bar pointer handling (Bunny/Plyr-style)
  // ─────────────────────────────────────────────────────────────────────────────
  const getPointerPercent = useCallback((clientX: number): number => {
    const bar = progressBarRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const seekFromPointer = useCallback(
    (clientX: number) => {
      const video = videoRef.current;
      const pct = getPointerPercent(clientX);
      setHoverPercent(pct * 100);
      if (!video || !video.duration) return;
      const seekTo = pct * video.duration;
      video.currentTime = seekTo;
      setCurrentTime(seekTo);
    },
    [getPointerPercent],
  );

  const handleProgressPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      isDraggingRef.current = true;
      seekFromPointer(e.clientX);
    },
    [seekFromPointer],
  );

  const handleProgressPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isDraggingRef.current) {
        seekFromPointer(e.clientX);
        return;
      }
      setHoverPercent(getPointerPercent(e.clientX) * 100);
    },
    [getPointerPercent, seekFromPointer],
  );

  const handleProgressPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      seekFromPointer(e.clientX);
    },
    [seekFromPointer],
  );

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Keyboard Shortcuts & Auto-Hide Controls
  // ─────────────────────────────────────────────────────────────────────────────
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (!isSettingsOpen) {
          setShowControls(false);
        }
      }, 3500);
    }
  }, [isPlaying, isSettingsOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          resetControlsTimeout();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          resetControlsTimeout();
          break;
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 5);
          resetControlsTimeout();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 5);
          resetControlsTimeout();
          break;
        case 'ArrowUp':
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          setVolume(video.volume);
          resetControlsTimeout();
          break;
        case 'ArrowDown':
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          setVolume(video.volume);
          resetControlsTimeout();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, resetControlsTimeout]);

  // Close settings popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isSettingsOpen && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSettingsOpen]);

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onMouseEnter={() => setShowControls(true)}
      className={`group relative aspect-video w-full select-none overflow-hidden bg-black text-white ${className}`}
      dir="ltr"
    >
      {/* ── Native HTML5 Video Element ── */}
      <video
        ref={videoRef}
        onClick={togglePlay}
        playsInline
        preload="none"
        className="h-full w-full cursor-pointer object-contain"
      />

      {/* ── Dynamic Anti-Piracy Watermark Overlay ── */}
      <VideoWatermark containerRef={containerRef} showFullscreenButton={false} />

      {/* ── Buffering Spinner ── */}
      {isBuffering && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/30 backdrop-blur-xs">
          <Loader2 className="h-12 w-12 animate-spin text-brand-primary" />
        </div>
      )}

      {/* ── Big Center Play Button (When Paused) ── */}
      {!isPlaying && !isBuffering && (
        <button
          onClick={togglePlay}
          aria-label="تشغيل"
          className="absolute inset-0 m-auto flex h-18 w-18 items-center justify-center rounded-full bg-brand-primary/90 text-white shadow-2xl transition hover:scale-110 hover:bg-brand-primary"
        >
          <Play className="ml-1 h-9 w-9 fill-current" />
        </button>
      )}

      {/* ── Bottom Controls Bar Overlay ── */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-2.5 pt-10 transition-opacity duration-300 sm:px-4 ${
          showControls || !isPlaying || isSettingsOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        {/* ── Bunny/Plyr-style Progress Bar ── */}
        <div
          ref={progressBarRef}
          role="slider"
          aria-label="شريط تقدم الفيديو"
          aria-valuenow={Math.round(currentTime)}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration) || 100}
          tabIndex={0}
          className="relative mb-1.5 flex h-5 w-full cursor-pointer touch-none items-center select-none focus:outline-none"
          onPointerDown={handleProgressPointerDown}
          onPointerMove={handleProgressPointerMove}
          onPointerUp={handleProgressPointerUp}
          onPointerEnter={() => setIsProgressHovered(true)}
          onPointerLeave={() => {
            if (!isDraggingRef.current) {
              setIsProgressHovered(false);
              setHoverPercent(null);
            }
          }}
          onKeyDown={(e) => {
            const video = videoRef.current;
            if (!video) return;
            if (e.key === 'ArrowRight') video.currentTime = Math.min(video.duration, video.currentTime + 5);
            if (e.key === 'ArrowLeft') video.currentTime = Math.max(0, video.currentTime - 5);
          }}
        >
          {/* Floating hover time tooltip */}
          {isProgressHovered && hoverPercent !== null && duration > 0 && (
            <div
              className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded bg-black/90 px-2 py-0.5 font-mono text-xs font-medium tabular-nums text-white shadow-lg ring-1 ring-white/10"
              style={{ left: `clamp(24px, ${hoverPercent}%, calc(100% - 24px))` }}
            >
              {formatTime((hoverPercent / 100) * duration)}
            </div>
          )}

          {/* Rail (thumb is positioned relative to THIS element so it is always dead-center) */}
          <div
            className="relative w-full rounded-full bg-white/25 transition-[height] duration-150 ease-out"
            style={{ height: isProgressHovered || isDraggingRef.current ? '6px' : '4px' }}
          >
            {/* Inner clipped track */}
            <div className="absolute inset-0 overflow-hidden rounded-full">
              {/* Buffered */}
              <div
                className="absolute inset-y-0 left-0 bg-white/30"
                style={{ width: `${bufferedPercent}%` }}
              />
              {/* Hover preview ghost bar */}
              {isProgressHovered && hoverPercent !== null && (
                <div
                  className="absolute inset-y-0 left-0 bg-white/25"
                  style={{ width: `${hoverPercent}%` }}
                />
              )}
              {/* Played — platform accent */}
              <div
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                  backgroundColor: 'var(--color-brand-primary)',
                }}
              />
            </div>

            {/* Scrub thumb — dead-center on the rail, smooth scale on hover/drag */}
            <div
              className="pointer-events-none absolute top-1/2 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.55)] transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                left: `${duration ? (currentTime / duration) * 100 : 0}%`,
                width: '13px',
                height: '13px',
                transform: `translate(-50%, -50%) scale(${isProgressHovered || isDraggingRef.current ? 1 : 0})`,
              }}
            />
          </div>
        </div>

        {/* Controls row */}
        <div>
          <div className="flex items-center justify-between text-xs sm:text-sm">
          {/* Left Controls: Play, Volume, Time */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
              className="rounded-lg p-1.5 text-white/90 hover:bg-white/20 hover:text-white"
            >
              {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
            </button>

            {/* Volume control */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                aria-label={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
                className="rounded-lg p-1.5 text-white/90 hover:bg-white/20 hover:text-white"
              >
                {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                aria-label="مستوى الصوت"
                className="h-1.5 w-14 cursor-pointer accent-brand-primary sm:w-20"
              />
            </div>

            {/* Time display */}
            <div className="font-mono text-xs tabular-nums text-white/80">
              <span>{formatTime(currentTime)}</span>
              <span className="mx-1 text-white/40">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Quality Badge, Settings, Fullscreen */}
          <div className="relative flex items-center gap-2">
            {/* Active Quality Chip (Fast Indicator) */}
            <button
              onClick={() => {
                setMenuView('quality');
                setIsSettingsOpen(!isSettingsOpen);
              }}
              className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-white/90 transition hover:bg-white/20"
              title="تغيير جودة الفيديو"
            >
              <Sliders className="h-3.5 w-3.5 text-brand-primary" />
              <span>{activeQualityLabel.split(' ')[0]}</span>
            </button>

            {/* Settings Button */}
            <button
              onClick={() => {
                setMenuView('main');
                setIsSettingsOpen(!isSettingsOpen);
              }}
              aria-label="إعدادات التشغيل"
              className={`rounded-lg p-1.5 text-white/90 hover:bg-white/20 hover:text-white ${
                isSettingsOpen ? 'bg-white/20 text-brand-primary' : ''
              }`}
            >
              <Settings className="h-5 w-5" />
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'تصغير الشاشة' : 'تكبير الشاشة'}
              className="rounded-lg p-1.5 text-white/90 hover:bg-white/20 hover:text-white"
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>

            {/* ── Settings Popover Menu (RTL Arabic) ── */}
            {isSettingsOpen && (
              <div
                dir="rtl"
                className="absolute bottom-12 right-0 z-50 w-64 rounded-xl border border-white/15 bg-slate-900/95 p-2 text-sm text-white shadow-2xl backdrop-blur-md"
              >
                {/* View 1: Main Settings Menu */}
                {menuView === 'main' && (
                  <div className="space-y-1">
                    <div className="px-3 py-1.5 text-xs font-bold text-white/50">إعدادات الفيديو</div>

                    {/* Quality submenu trigger */}
                    <button
                      onClick={() => setMenuView('quality')}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-right transition hover:bg-white/10"
                    >
                      <div className="flex items-center gap-2">
                        <Sliders className="h-4 w-4 text-brand-primary" />
                        <span>الجودة</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-brand-muted">
                        <span>{activeQualityLabel}</span>
                        <ChevronRight className="h-4 w-4 rotate-180" />
                      </div>
                    </button>

                    {/* Speed submenu trigger */}
                    <button
                      onClick={() => setMenuView('speed')}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-right transition hover:bg-white/10"
                    >
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-brand-primary" />
                        <span>سرعة التشغيل</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-brand-muted">
                        <span>{playbackRate === 1 ? 'عادية (1x)' : `${playbackRate}x`}</span>
                        <ChevronRight className="h-4 w-4 rotate-180" />
                      </div>
                    </button>
                  </div>
                )}

                {/* View 2: Quality Selection Menu */}
                {menuView === 'quality' && (
                  <div>
                    <button
                      onClick={() => setMenuView('main')}
                      className="mb-1 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-brand-primary hover:bg-white/10"
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span>العودة للقائمة</span>
                    </button>

                    <div className="max-h-56 space-y-0.5 overflow-y-auto">
                      {qualityOptions.map((opt) => {
                        const isSelected = currentQuality === opt.index;
                        return (
                          <button
                            key={opt.index}
                            onClick={() => handleSelectQuality(opt.index)}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-right text-xs transition ${
                              isSelected ? 'bg-brand-primary/25 font-bold text-brand-primary' : 'hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isSelected ? (
                                <Check className="h-4 w-4 text-brand-primary" />
                              ) : (
                                <span className="w-4" />
                              )}
                              <span>{opt.label}</span>
                            </div>
                            {opt.arabicNote && (
                              <span className="text-[11px] text-white/50">{opt.arabicNote}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* View 3: Speed Selection Menu */}
                {menuView === 'speed' && (
                  <div>
                    <button
                      onClick={() => setMenuView('main')}
                      className="mb-1 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-brand-primary hover:bg-white/10"
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span>العودة للقائمة</span>
                    </button>

                    <div className="space-y-0.5">
                      {SPEED_OPTIONS.map((spd) => {
                        const isSelected = playbackRate === spd;
                        return (
                          <button
                            key={spd}
                            onClick={() => handleSelectSpeed(spd)}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-right text-xs transition ${
                              isSelected ? 'bg-brand-primary/25 font-bold text-brand-primary' : 'hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isSelected ? (
                                <Check className="h-4 w-4 text-brand-primary" />
                              ) : (
                                <span className="w-4" />
                              )}
                              <span>{spd === 1 ? 'عادية (1x)' : `${spd}x`}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
