import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCanonicalSegmentKey,
  getSegment,
  putSegment,
  touchSegment,
  purgeVideoFromCache,
  clearVideoSegmentCache,
} from '../lib/video-segment-cache.ts';

function makeBuffer(bytes, fill = 1) {
  const buf = new ArrayBuffer(bytes);
  new Uint8Array(buf).fill(fill);
  return buf;
}

function createMockIndexedDb({ hangOpen = false, throwOnOpen = false, failOnPut = false } = {}) {
  const stores = new Map();

  function ensureStore(name, keyPath) {
    if (!stores.has(name)) {
      stores.set(name, { keyPath, rows: new Map(), indexes: new Map() });
    }
    return stores.get(name);
  }

  function makeReq(executor) {
    const req = { result: undefined, error: null, onsuccess: null, onerror: null, onupgradeneeded: null, onblocked: null };
    queueMicrotask(() => executor(req));
    return req;
  }

  const fakeDb = {
    objectStoreNames: {
      contains: (name) => stores.has(name),
    },
    createObjectStore(name, opts) {
      const store = ensureStore(name, opts.keyPath);
      return {
        createIndex(idxName, keyPath) {
          store.indexes.set(idxName, keyPath);
        },
      };
    },
    transaction(storeNames) {
      const names = Array.isArray(storeNames) ? storeNames : [storeNames];
      const tx = { oncomplete: null, onerror: null, onabort: null, error: null };
      let pending = 0;
      let failed = false;
      let commitTimer = null;

      const scheduleCommit = () => {
        if (commitTimer) clearTimeout(commitTimer);
        if (!failed && pending === 0) {
          commitTimer = setTimeout(() => {
            if (!failed && pending === 0) tx.oncomplete?.();
          }, 0);
        }
      };

      const failTx = (err) => {
        if (failed) return;
        failed = true;
        if (commitTimer) clearTimeout(commitTimer);
        tx.error = err;
        setTimeout(() => tx.onerror?.(), 0);
      };

      tx.objectStore = (name) => {
        if (!names.includes(name)) throw new Error(`Store ${name} not in tx`);
        const store = stores.get(name);
        return {
          get(key) {
            pending++;
            return makeReq((req) => {
              req.result = store.rows.get(key);
              pending--;
              req.onsuccess?.();
              scheduleCommit();
            });
          },
          put(val) {
            pending++;
            return makeReq((req) => {
              if (failOnPut && name === 'segments') {
                const err = new DOMException('QuotaExceededError', 'QuotaExceededError');
                req.error = err;
                pending--;
                req.onerror?.();
                failTx(err);
                return;
              }
              store.rows.set(val[store.keyPath], val);
              req.result = val[store.keyPath];
              pending--;
              req.onsuccess?.();
              scheduleCommit();
            });
          },
          delete(key) {
            pending++;
            return makeReq((req) => {
              store.rows.delete(key);
              pending--;
              req.onsuccess?.();
              scheduleCommit();
            });
          },
          clear() {
            pending++;
            return makeReq((req) => {
              store.rows.clear();
              pending--;
              req.onsuccess?.();
              scheduleCommit();
            });
          },
          index(idxName) {
            const idxKey = store.indexes.get(idxName);
            return {
              openCursor(range) {
                const req = { result: null, error: null, onsuccess: null, onerror: null };
                const entries = Array.from(store.rows.values())
                  .filter((r) => (range && range._only !== undefined ? r[idxKey] === range._only : true))
                  .sort((a, b) => (a[idxKey] ?? 0) - (b[idxKey] ?? 0));
                let pos = 0;

                const advance = () => {
                  pending++;
                  queueMicrotask(() => {
                    pending--;
                    if (pos >= entries.length) {
                      req.result = null;
                      req.onsuccess?.();
                      scheduleCommit();
                      return;
                    }
                    const current = entries[pos++];
                    req.result = {
                      value: current,
                      delete() {
                        store.rows.delete(current[store.keyPath]);
                      },
                      continue() {
                        advance();
                      },
                    };
                    req.onsuccess?.();
                    scheduleCommit();
                  });
                };
                advance();
                return req;
              },
            };
          },
        };
      };

      scheduleCommit();
      return tx;
    },
    close() {},
  };

  return {
    stores,
    indexedDB: {
      open() {
        if (throwOnOpen) throw new DOMException('SecurityError', 'SecurityError');
        const req = { result: fakeDb, error: null, onsuccess: null, onerror: null, onupgradeneeded: null, onblocked: null };
        if (!hangOpen) {
          queueMicrotask(() => {
            if (!stores.has('segments') || !stores.has('meta')) {
              req.onupgradeneeded?.();
            }
            req.onsuccess?.();
          });
        }
        return req;
      },
    },
    IDBKeyRange: {
      only: (val) => ({ _only: val }),
    },
  };
}

function withBrowserEnv({ idbMock, estimateFn } = {}) {
  const prevWindow = globalThis.window;
  const prevIdb = globalThis.indexedDB;
  const prevRange = globalThis.IDBKeyRange;
  const prevNav = globalThis.navigator;

  globalThis.window = globalThis;
  globalThis.indexedDB = idbMock?.indexedDB;
  globalThis.IDBKeyRange = idbMock?.IDBKeyRange;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: estimateFn ? { storage: { estimate: estimateFn } } : {},
  });

  return () => {
    if (prevWindow === undefined) delete globalThis.window;
    else globalThis.window = prevWindow;
    if (prevIdb === undefined) delete globalThis.indexedDB;
    else globalThis.indexedDB = prevIdb;
    if (prevRange === undefined) delete globalThis.IDBKeyRange;
    else globalThis.IDBKeyRange = prevRange;
    if (prevNav === undefined) delete globalThis.navigator;
    else Object.defineProperty(globalThis, 'navigator', { configurable: true, value: prevNav });
  };
}

test('buildCanonicalSegmentKey: query-token, path-token, byte-range, and rejections', () => {
  const vid = '123e4567-e89b-12d3-a456-426614174000';

  assert.equal(
    buildCanonicalSegmentKey(`https://vz-abc.b-cdn.net/${vid}/720p/video0.ts?bcdn_token=xyz&expires=999`, vid),
    `v1:${vid}:720p:video0.ts`
  );

  assert.equal(
    buildCanonicalSegmentKey(`https://vz-abc.b-cdn.net/bcdn_token=abc&expires=123/${vid}/480p/seg12.m4s`, vid),
    `v1:${vid}:480p:seg12.m4s`
  );

  assert.equal(
    buildCanonicalSegmentKey(`https://vz-abc.b-cdn.net/token=short/${vid}/1080p/init.mp4`, vid, 0, 1023),
    `v1:${vid}:1080p:init.mp4:r0-1023`
  );

  assert.equal(
    buildCanonicalSegmentKey(`https://vz-abc.b-cdn.net/${vid}/720p/video1.ts`, vid, 2048),
    `v1:${vid}:720p:video1.ts:r2048-`
  );

  assert.equal(buildCanonicalSegmentKey(`https://vz-abc.b-cdn.net/${vid}/720p/video.m3u8`, vid), null);
  assert.equal(buildCanonicalSegmentKey(`https://vz-abc.b-cdn.net/${vid}/720p/enc.key`, vid), null);
  assert.equal(buildCanonicalSegmentKey(`https://vz-abc.b-cdn.net/other-video-id/720p/video0.ts`, vid), null);
  assert.equal(buildCanonicalSegmentKey('not a valid %%% url', vid), null);
});

test('LRU hysteresis eviction evicts oldest down to 80% of budget', async () => {
  const idbMock = createMockIndexedDb();
  const restore = withBrowserEnv({
    idbMock,
    estimateFn: async () => ({ quota: 1000 * 1024 * 1024, usage: 0 }),
  });

  try {
    const vid = 'vid-lru';
    const segBytes = 300 * 1024; // 300 KB each; 4 * 300KB = 1200 KB > 1 MB budget -> evict down to <= 819.2 KB (2 segments = 600 KB)
    await putSegment('k1', vid, makeBuffer(segBytes, 1), 1);
    await new Promise((r) => setTimeout(r, 5));
    await putSegment('k2', vid, makeBuffer(segBytes, 2), 1);
    await new Promise((r) => setTimeout(r, 5));
    await putSegment('k3', vid, makeBuffer(segBytes, 3), 1);
    await new Promise((r) => setTimeout(r, 5));
    // Touch k1 so k2 becomes the oldest
    await touchSegment('k1');
    await new Promise((r) => setTimeout(r, 5));
    await putSegment('k4', vid, makeBuffer(segBytes, 4), 1);

    assert.equal(await getSegment('k2'), null);
    assert.equal(await getSegment('k3'), null);
    assert.ok(await getSegment('k1'));
    assert.ok(await getSegment('k4'));
  } finally {
    restore();
  }
});

test('getSegment enforces 150ms hard timeout fallback', async () => {
  const idbMock = createMockIndexedDb({ hangOpen: true });
  const restore = withBrowserEnv({ idbMock });

  try {
    const start = Date.now();
    const res = await getSegment('v1:vid:720p:seg0.ts');
    const elapsed = Date.now() - start;
    assert.equal(res, null);
    assert.ok(elapsed < 500, `Expected fast timeout fallback, took ${elapsed}ms`);
  } finally {
    restore();
  }
});

test('fail-open behavior on Safari Private Mode, QuotaExceededError, and SSR', async () => {
  // SSR (no window)
  assert.equal(await getSegment('k1'), null);
  await putSegment('k1', 'vid', makeBuffer(1024));
  await touchSegment('k1');
  await purgeVideoFromCache('vid');
  await clearVideoSegmentCache();

  // Safari Private Mode (indexedDB.open throws)
  let errCount = 0;
  const restoreThrow = withBrowserEnv({ idbMock: createMockIndexedDb({ throwOnOpen: true }) });
  try {
    assert.equal(await getSegment('k1', 14, () => { errCount++; }), null);
    await putSegment('k1', 'vid', makeBuffer(1024), 300, () => { errCount++; });
    await touchSegment('k1');
    await purgeVideoFromCache('vid');
    await clearVideoSegmentCache();
    assert.equal(errCount, 2);
  } finally {
    restoreThrow();
  }

  // QuotaExceededError on put
  let quotaErr = 0;
  const restoreQuota = withBrowserEnv({ idbMock: createMockIndexedDb({ failOnPut: true }) });
  try {
    await putSegment('k1', 'vid', makeBuffer(1024), 300, () => { quotaErr++; });
    assert.equal(quotaErr, 1);
  } finally {
    restoreQuota();
  }
});

test('TTL expiration and purgeVideoFromCache', async () => {
  const idbMock = createMockIndexedDb();
  const restore = withBrowserEnv({ idbMock });

  try {
    await putSegment('k-old', 'vid-1', makeBuffer(1024, 7), 10);
    // Backdate createdAt to 15 days ago
    const segStore = idbMock.stores.get('segments');
    segStore.rows.get('k-old').createdAt = Date.now() - 15 * 86_400_000;

    assert.equal(await getSegment('k-old', 14), null);
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(segStore.rows.has('k-old'), false);

    await putSegment('k-a', 'vid-purge', makeBuffer(1024, 1), 10);
    await putSegment('k-b', 'vid-keep', makeBuffer(1024, 2), 10);
    await purgeVideoFromCache('vid-purge');
    assert.equal(await getSegment('k-a'), null);
    assert.ok(await getSegment('k-b'));
  } finally {
    restore();
  }
});
