const DB_NAME = 'elrn_media_cache_v1';
const SEGMENTS = 'segments';
const META = 'meta';
const META_TOTAL_KEY = 'totalBytes';
const FALLBACK_BUDGET = 120 * 1024 * 1024;
const MIN_FREE_SPACE = 300 * 1024 * 1024;
const MAX_SEGMENT = 8 * 1024 * 1024;
const READ_TIMEOUT_MS = 150;
const MS_PER_DAY = 86_400_000;
const ALLOWED_EXT_RE = /\.(ts|m4s|mp4)$/i;
const TOKEN_SEG_RE = /^(?:bcdn_token|token)=/i;

export interface SegmentRecord {
  cacheKey: string;
  videoId: string;
  data: ArrayBuffer;
  size: number;
  createdAt: number;
  lastAccessedAt: number;
}

export function buildCanonicalSegmentKey(
  rawUrl: string,
  expectedVideoId: string,
  rangeStart?: number,
  rangeEnd?: number
): string | null {
  if (!rawUrl || !expectedVideoId) return null;
  let pathname: string;
  try {
    pathname = new URL(rawUrl, 'https://placeholder.local').pathname;
  } catch {
    return null;
  }
  const parts = pathname.split('/').filter((s) => s.length > 0 && !TOKEN_SEG_RE.test(s));
  const vidIdx = parts.indexOf(expectedVideoId);
  if (vidIdx === -1 || vidIdx >= parts.length - 1) return null;
  const filename = parts[parts.length - 1];
  if (!ALLOWED_EXT_RE.test(filename)) return null;
  const rendition = parts.length - vidIdx >= 3 ? parts[parts.length - 2] : 'default';
  const range =
    typeof rangeStart === 'number' && Number.isFinite(rangeStart)
      ? `:r${rangeStart}-${typeof rangeEnd === 'number' && Number.isFinite(rangeEnd) ? rangeEnd : ''}`
      : '';
  return `v1:${expectedVideoId}:${rendition}:${filename}${range}`;
}

const isSupported = () => typeof window !== 'undefined' && typeof indexedDB !== 'undefined';

function reqP<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IDB request failed'));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IDB tx failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IDB tx aborted'));
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SEGMENTS)) {
        const s = db.createObjectStore(SEGMENTS, { keyPath: 'cacheKey' });
        s.createIndex('by_videoId', 'videoId', { unique: false });
        s.createIndex('by_lastAccessedAt', 'lastAccessedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IDB open failed'));
    req.onblocked = () => reject(new Error('IDB open blocked'));
  });
}

async function withDb<T>(fn: (db: IDBDatabase) => Promise<T>, onError?: () => void): Promise<T | undefined> {
  if (!isSupported()) return undefined;
  let db: IDBDatabase | null = null;
  try {
    db = await openDb();
    return await fn(db);
  } catch {
    onError?.();
    return undefined;
  } finally {
    db?.close();
  }
}

async function resolveBudgetBytes(maxBudgetMb: number): Promise<number | null> {
  const cap = Math.max(1, maxBudgetMb) * 1024 * 1024;
  try {
    const estFn = typeof navigator !== 'undefined' ? navigator.storage?.estimate : undefined;
    if (typeof estFn === 'function') {
      const est = await estFn.call(navigator.storage);
      if (typeof est?.quota === 'number' && Number.isFinite(est.quota) && est.quota > 0) {
        const free = Math.max(0, est.quota - (est.usage ?? 0));
        return free < MIN_FREE_SPACE ? null : Math.min(cap, Math.floor(0.15 * free));
      }
    }
  } catch {
    // Fallback below
  }
  return Math.min(cap, FALLBACK_BUDGET);
}

function walkCursor(
  cursorReq: IDBRequest<IDBCursorWithValue | null>,
  onRow: (cursor: IDBCursorWithValue) => boolean
): Promise<void> {
  return new Promise((resolve, reject) => {
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor || !onRow(cursor)) {
        resolve();
        return;
      }
      cursor.continue();
    };
    cursorReq.onerror = () => reject(cursorReq.error ?? new Error('Cursor failed'));
  });
}

export async function getSegment(key: string, ttlDays = 14, onError?: () => void): Promise<ArrayBuffer | null> {
  if (!key || !isSupported()) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((r) => {
    timer = setTimeout(() => r(null), READ_TIMEOUT_MS);
  });
  const read = withDb(async (db) => {
    const tx = db.transaction(SEGMENTS, 'readonly');
    const rec = (await reqP(tx.objectStore(SEGMENTS).get(key))) as SegmentRecord | undefined;
    if (!rec || !(rec.data instanceof ArrayBuffer)) return null;
    if (Date.now() - rec.createdAt > ttlDays * MS_PER_DAY) {
      void withDb(async (d) => {
        const wtx = d.transaction([SEGMENTS, META], 'readwrite');
        wtx.objectStore(SEGMENTS).delete(key);
        const m = (await reqP(wtx.objectStore(META).get(META_TOTAL_KEY))) as { value: number } | undefined;
        wtx.objectStore(META).put({ key: META_TOTAL_KEY, value: Math.max(0, (m?.value ?? 0) - rec.size) });
        await txDone(wtx);
      });
      return null;
    }
    return rec.data;
  }, onError).then((res) => res ?? null);

  try {
    return await Promise.race([read, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export async function putSegment(
  key: string,
  videoId: string,
  data: ArrayBuffer,
  maxBudgetMb = 300,
  onError?: () => void
): Promise<void> {
  if (!key || !videoId || !isSupported()) return;
  if (!(data instanceof ArrayBuffer) || data.byteLength === 0 || data.byteLength > MAX_SEGMENT) return;
  const budget = await resolveBudgetBytes(maxBudgetMb);
  if (budget === null || data.byteLength > budget) return;

  await withDb(async (db) => {
    const tx = db.transaction([SEGMENTS, META], 'readwrite');
    const segStore = tx.objectStore(SEGMENTS);
    const metaStore = tx.objectStore(META);
    const [existing, meta] = await Promise.all([
      reqP(segStore.get(key)) as Promise<SegmentRecord | undefined>,
      reqP(metaStore.get(META_TOTAL_KEY)) as Promise<{ value: number } | undefined>,
    ]);
    const now = Date.now();
    let totalBytes = Math.max(0, (meta?.value ?? 0) - (existing?.size ?? 0) + data.byteLength);
    segStore.put({ cacheKey: key, videoId, data, size: data.byteLength, createdAt: now, lastAccessedAt: now });

    if (totalBytes > budget) {
      const target = Math.floor(budget * 0.8);
      await walkCursor(segStore.index('by_lastAccessedAt').openCursor(), (cursor) => {
        if (totalBytes <= target) return false;
        const rec = cursor.value as SegmentRecord;
        if (rec.cacheKey !== key) {
          totalBytes = Math.max(0, totalBytes - rec.size);
          cursor.delete();
        }
        return totalBytes > target;
      });
    }
    metaStore.put({ key: META_TOTAL_KEY, value: totalBytes });
    await txDone(tx);
  }, onError);
}

export async function touchSegment(key: string): Promise<void> {
  if (!key) return;
  await withDb(async (db) => {
    const tx = db.transaction(SEGMENTS, 'readwrite');
    const store = tx.objectStore(SEGMENTS);
    const rec = (await reqP(store.get(key))) as SegmentRecord | undefined;
    if (rec) store.put({ ...rec, lastAccessedAt: Date.now() });
    await txDone(tx);
  });
}

export async function purgeVideoFromCache(videoId: string): Promise<void> {
  if (!videoId) return;
  await withDb(async (db) => {
    const tx = db.transaction([SEGMENTS, META], 'readwrite');
    const segStore = tx.objectStore(SEGMENTS);
    const metaStore = tx.objectStore(META);
    const meta = (await reqP(metaStore.get(META_TOTAL_KEY))) as { value: number } | undefined;
    let totalBytes = meta?.value ?? 0;
    await walkCursor(segStore.index('by_videoId').openCursor(IDBKeyRange.only(videoId)), (cursor) => {
      totalBytes = Math.max(0, totalBytes - (cursor.value as SegmentRecord).size);
      cursor.delete();
      return true;
    });
    metaStore.put({ key: META_TOTAL_KEY, value: totalBytes });
    await txDone(tx);
  });
}

export async function clearVideoSegmentCache(): Promise<void> {
  await withDb(async (db) => {
    const tx = db.transaction([SEGMENTS, META], 'readwrite');
    tx.objectStore(SEGMENTS).clear();
    tx.objectStore(META).clear();
    await txDone(tx);
  });
}
