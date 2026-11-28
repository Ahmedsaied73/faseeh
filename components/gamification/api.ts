'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { cached, dropByPrefix, dropKey, userKey } from '@/lib/data-cache';
import type {
  CourseChallengeData,
  GamificationHud,
  GamificationSummary,
  TeacherChallengeInput,
} from '@/lib/gamification.config';

const HUD_TTL_MS = 60_000;
const SUMMARY_TTL_MS = 30_000;
const CHALLENGE_TTL_MS = 30_000;

export const GAMIFICATION_ENDPOINTS = {
  hud: '/api/gamification/hud',
  summary: '/api/gamification/summary',
  courseChallenge: (courseSlug: string) =>
    `/api/courses/${encodeURIComponent(courseSlug)}/challenge`,
  adminCourseChallenge: (courseSlug: string) =>
    `/api/admin/courses/${encodeURIComponent(courseSlug)}/challenge`,
} as const;

export async function fetchGamificationHud(force = false): Promise<GamificationHud> {
  const key = userKey('/gamification/hud');
  if (force) {
    dropKey(key);
  }
  return cached(key, HUD_TTL_MS, () =>
    apiClient.get<GamificationHud>(GAMIFICATION_ENDPOINTS.hud, {
      skipAuthRedirect: true,
    }),
  );
}

export async function fetchGamificationSummary(force = false): Promise<GamificationSummary> {
  const key = userKey('/gamification/summary');
  if (force) {
    dropKey(key);
  }
  return cached(key, SUMMARY_TTL_MS, () =>
    apiClient.get<GamificationSummary>(GAMIFICATION_ENDPOINTS.summary),
  );
}

export async function fetchCourseChallenge(
  courseSlug: string,
  force = false,
): Promise<CourseChallengeData> {
  const pathKey = `/courses/${courseSlug}/challenge`;
  const key = userKey(pathKey);
  if (force) {
    dropKey(key);
  }
  return cached(key, CHALLENGE_TTL_MS, () =>
    apiClient.get<CourseChallengeData>(GAMIFICATION_ENDPOINTS.courseChallenge(courseSlug)),
  );
}

export async function updateCourseChallenge(
  courseSlug: string,
  input: TeacherChallengeInput,
): Promise<CourseChallengeData> {
  const updated = await apiClient.put<CourseChallengeData>(
    GAMIFICATION_ENDPOINTS.adminCourseChallenge(courseSlug),
    input,
  );
  invalidateGamificationCaches(courseSlug);
  return updated;
}

export function invalidateGamificationCaches(courseSlug?: string): void {
  dropKey(userKey('/gamification/hud'));
  dropKey(userKey('/gamification/summary'));
  if (courseSlug) {
    dropKey(userKey(`/courses/${courseSlug}/challenge`));
  } else {
    dropByPrefix('user:');
  }
}

export function invalidateAwardCaches(): void {
  dropKey(userKey('/gamification/hud'));
  dropKey(userKey('/gamification/summary'));
  dropByPrefix('user:');
}

export function useGamificationHud(enabled = true) {
  const [data, setData] = useState<GamificationHud | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(
    async (force = false) => {
      if (!enabled) {
        setData(null);
        setLoading(false);
        setError(null);
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetchGamificationHud(force);
        if (mountedRef.current) {
          setData(res);
        }
        return res;
      } catch (err: unknown) {
        if (mountedRef.current) {
          setError(err);
        }
        return null;
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [enabled],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const refetch = useCallback(() => load(true), [load]);

  return { data, loading, error, refetch };
}

export function useGamificationSummary(enabled = true) {
  const [data, setData] = useState<GamificationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(
    async (force = false) => {
      if (!enabled) {
        setData(null);
        setLoading(false);
        setError(null);
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetchGamificationSummary(force);
        if (mountedRef.current) {
          setData(res);
        }
        return res;
      } catch (err: unknown) {
        if (mountedRef.current) {
          setError(err);
        }
        return null;
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [enabled],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const refetch = useCallback(() => load(true), [load]);

  return { data, loading, error, refetch };
}

export function useCourseChallenge(courseSlug: string, enabled = true) {
  const [data, setData] = useState<CourseChallengeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(
    async (force = false) => {
      if (!enabled || !courseSlug) {
        setData(null);
        setLoading(false);
        setError(null);
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetchCourseChallenge(courseSlug, force);
        if (mountedRef.current) {
          setData(res);
        }
        return res;
      } catch (err: unknown) {
        if (mountedRef.current) {
          setError(err);
        }
        return null;
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [courseSlug, enabled],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const refetch = useCallback(() => load(true), [load]);

  return { data, loading, error, refetch };
}

export function useUpdateCourseChallenge(courseSlug: string) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [data, setData] = useState<CourseChallengeData | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setData(null);
  }, []);

  const mutateAsync = useCallback(
    async (input: TeacherChallengeInput): Promise<CourseChallengeData> => {
      setIsPending(true);
      setError(null);
      try {
        const res = await updateCourseChallenge(courseSlug, input);
        if (mountedRef.current) {
          setData(res);
        }
        return res;
      } catch (err: unknown) {
        if (mountedRef.current) {
          setError(err);
        }
        throw err;
      } finally {
        if (mountedRef.current) {
          setIsPending(false);
        }
      }
    },
    [courseSlug],
  );

  const mutate = useCallback(
    (input: TeacherChallengeInput) => {
      void mutateAsync(input).catch(() => {});
    },
    [mutateAsync],
  );

  return { mutate, mutateAsync, isPending, error, data, reset };
}
