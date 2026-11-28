'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectIsAuthenticated, selectUser } from '@/store/slices/authSlice';
import {
  progressOf,
  type GamificationAward,
  type GamificationEvent,
  type GamificationHud,
} from '@/lib/gamification.config';
import { fetchGamificationHud, invalidateAwardCaches } from './api';

export interface GamificationContextValue {
  enabled: boolean;
  isAuthenticated: boolean;
  hud: GamificationHud | null;
  loading: boolean;
  latestAward: GamificationAward | null;
  latestEvent: GamificationEvent | null;
  pushAward: (award: GamificationAward | null | undefined) => void;
  clearAward: () => void;
  refreshHud: () => Promise<void>;
}

const DEFAULT_CONTEXT: GamificationContextValue = {
  enabled: false,
  isAuthenticated: false,
  hud: null,
  loading: false,
  latestAward: null,
  latestEvent: null,
  pushAward: () => {},
  clearAward: () => {},
  refreshHud: async () => {},
};

const GamificationContext = createContext<GamificationContextValue>(DEFAULT_CONTEXT);

export function GamificationProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);

  const enabled = Boolean(isAuthenticated && user?.features?.gamification === true);

  const [hud, setHud] = useState<GamificationHud | null>(null);
  const [loading, setLoading] = useState(false);
  const [latestAward, setLatestAward] = useState<GamificationAward | null>(null);
  const [latestEvent, setLatestEvent] = useState<GamificationEvent | null>(null);
  const eventIdRef = useRef(0);
  const fetchedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !enabled || !user?.slug) {
      fetchedForUserRef.current = null;
      setHud(null);
      setLoading(false);
      setLatestAward(null);
      setLatestEvent(null);
      return;
    }

    if (fetchedForUserRef.current === user.slug) {
      return;
    }

    let cancelled = false;
    fetchedForUserRef.current = user.slug;
    setLoading(true);

    fetchGamificationHud(false)
      .then((res) => {
        if (!cancelled) {
          setHud(res);
        }
      })
      .catch(() => {
        if (!cancelled) {
          fetchedForUserRef.current = null;
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, isAuthenticated, user?.slug]);

  const refreshHud = useCallback(async () => {
    if (!isAuthenticated || !enabled) return;
    setLoading(true);
    try {
      const res = await fetchGamificationHud(true);
      setHud(res);
    } catch {
      // Fail-safe: keep existing HUD snapshot if refresh fails.
    } finally {
      setLoading(false);
    }
  }, [enabled, isAuthenticated]);

  const pushAward = useCallback(
    (award: GamificationAward | null | undefined) => {
      if (!enabled || !award) return;

      invalidateAwardCaches();

      setHud((prev) => {
        const baseXp = prev?.xp ?? 0;
        const nextXp =
          typeof award.newTotalXp === 'number'
            ? award.newTotalXp
            : baseXp + Math.max(0, award.totalGain);
        const prog = progressOf(nextXp);
        return {
          enabled: true,
          xp: nextXp,
          level: prog.level,
          pct: prog.pct,
          left: prog.left,
          streak: typeof award.newStreak === 'number' ? award.newStreak : (prev?.streak ?? 0),
          doneToday: typeof award.doneToday === 'boolean' ? award.doneToday : true,
        };
      });

      setLatestAward(award);

      const nextId = eventIdRef.current + 1;
      eventIdRef.current = nextId;
      setLatestEvent({
        id: nextId,
        gain: award.totalGain,
        levelUp: award.levelUp,
        badges: award.unlockedBadges,
        kind: award.kind,
      });
    },
    [enabled],
  );

  const clearAward = useCallback(() => {
    setLatestAward(null);
  }, []);

  const value = useMemo<GamificationContextValue>(
    () => ({
      enabled,
      isAuthenticated,
      hud,
      loading,
      latestAward,
      latestEvent,
      pushAward,
      clearAward,
      refreshHud,
    }),
    [clearAward, enabled, hud, isAuthenticated, latestAward, latestEvent, loading, pushAward, refreshHud],
  );

  return <GamificationContext.Provider value={value}>{children}</GamificationContext.Provider>;
}

export function useGamification(): GamificationContextValue {
  return useContext(GamificationContext);
}
