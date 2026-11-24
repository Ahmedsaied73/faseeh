'use strict';
/**
 * E2E Suite: Client-side HLS Video Segment Caching, Security & Resilience
 *
 * Self-contained: uses http://localhost:3000 if already serving, otherwise
 * spawns `npx next start -p 3010` from a-e-lrn-frontend and tears it down.
 *
 * Run:
 *   node e2e/video-caching.e2e.js
 */
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');

const { chromium } = (() => {
  try {
    return require('playwright');
  } catch {
    return require('C:/Users/osams/.gemini/config/skills/playwright-skill/node_modules/playwright');
  }
})();

const APP_DIR = path.resolve(__dirname, '..');
const VIDEO_PATH = '/course/test-course/video/test-video';
const BUNNY_VID = 'vid-123';
const CDN_HOST = 'https://vz-test.b-cdn.net';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function probeUrl(url, cookie) {
  return new Promise((resolve) => {
    const req = http.get(url, { headers: cookie ? { Cookie: cookie } : {} }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

const fs = require('node:fs');

async function ensureServer() {
  if (
    (await probeUrl('http://localhost:3000/login')) &&
    (await probeUrl(`http://localhost:3000${VIDEO_PATH}`, 'isLoggedIn=true'))
  ) {
    return { baseUrl: 'http://localhost:3000', child: null };
  }
  const standaloneServer = path.join(APP_DIR, '.next', 'standalone', 'server.js');
  const nextBin = path.join(APP_DIR, 'node_modules', 'next', 'dist', 'bin', 'next');
  let stderr = '';
  let child;

  if (fs.existsSync(standaloneServer)) {
    const srcStatic = path.join(APP_DIR, '.next', 'static');
    const dstStatic = path.join(APP_DIR, '.next', 'standalone', '.next', 'static');
    if (fs.existsSync(srcStatic) && !fs.existsSync(dstStatic)) {
      fs.cpSync(srcStatic, dstStatic, { recursive: true });
    }
    const srcPub = path.join(APP_DIR, 'public');
    const dstPub = path.join(APP_DIR, '.next', 'standalone', 'public');
    if (fs.existsSync(srcPub) && !fs.existsSync(dstPub)) {
      fs.cpSync(srcPub, dstPub, { recursive: true });
    }
    child = spawn(process.execPath, [standaloneServer], {
      cwd: path.join(APP_DIR, '.next', 'standalone'),
      env: { ...process.env, PORT: '3010', HOSTNAME: '127.0.0.1' },
      stdio: ['ignore', 'ignore', 'pipe'],
    });
  } else {
    child = spawn(process.execPath, [nextBin, 'start', '-p', '3010', '-H', '127.0.0.1'], {
      cwd: APP_DIR,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
  }

  child.stderr.on('data', (d) => {
    stderr += d.toString();
  });
  const baseUrl = 'http://127.0.0.1:3010';
  for (let i = 0; i < 40; i++) {
    if (await probeUrl(`${baseUrl}/login`)) return { baseUrl, child };
    await sleep(500);
  }
  child.kill();
  throw new Error(`Timed out waiting for server on port 3010. stderr: ${stderr}`);
}

// ── Minimal valid MPEG-TS (PAT + PMT + H.264 Baseline 64x64 IDR + P-slice) ──
function crc32Mpeg(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i] << 24;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x80000000 ? ((crc << 1) ^ 0x04c11db7) >>> 0 : (crc << 1) >>> 0;
    }
  }
  return crc >>> 0;
}

function packetizePes(pid, pes, ccStart, pcrBase) {
  const packets = [];
  let offset = 0;
  let cc = ccStart;
  let first = true;
  while (offset < pes.length) {
    const pkt = Buffer.alloc(188, 0xff);
    pkt[0] = 0x47;
    pkt[1] = (first ? 0x40 : 0x00) | ((pid >> 8) & 0x1f);
    pkt[2] = pid & 0xff;
    const remaining = pes.length - offset;

    if (first && pcrBase !== undefined) {
      const payloadCap = Math.min(remaining, 188 - 12);
      const afStuff = 188 - 12 - payloadCap;
      pkt[3] = 0x30 | (cc & 0x0f);
      pkt[4] = 7 + afStuff;
      pkt[5] = 0x10;
      const pcr = BigInt(pcrBase);
      pkt[6] = Number((pcr >> 25n) & 0xffn);
      pkt[7] = Number((pcr >> 17n) & 0xffn);
      pkt[8] = Number((pcr >> 9n) & 0xffn);
      pkt[9] = Number((pcr >> 1n) & 0xffn);
      pkt[10] = Number(((pcr & 1n) << 7n) | 0x7en);
      pkt[11] = 0x00;
      pes.copy(pkt, 12 + afStuff, offset, offset + payloadCap);
      offset += payloadCap;
    } else if (remaining < 184) {
      const afStuff = 184 - remaining;
      pkt[3] = 0x30 | (cc & 0x0f);
      pkt[4] = afStuff - 1;
      if (afStuff > 1) pkt[5] = 0x00;
      pes.copy(pkt, 4 + afStuff, offset, offset + remaining);
      offset += remaining;
    } else {
      pkt[3] = 0x10 | (cc & 0x0f);
      pes.copy(pkt, 4, offset, offset + 184);
      offset += 184;
    }
    packets.push(pkt);
    cc = (cc + 1) & 0x0f;
    first = false;
  }
  return { packets, nextCc: cc };
}

function makePsiPacket(pid, section) {
  const crc = crc32Mpeg(section);
  const pkt = Buffer.alloc(188, 0xff);
  pkt[0] = 0x47;
  pkt[1] = 0x40 | ((pid >> 8) & 0x1f);
  pkt[2] = pid & 0xff;
  pkt[3] = 0x10;
  pkt[4] = 0x00;
  section.copy(pkt, 5);
  const crcPos = 5 + section.length;
  pkt[crcPos] = (crc >>> 24) & 0xff;
  pkt[crcPos + 1] = (crc >>> 16) & 0xff;
  pkt[crcPos + 2] = (crc >>> 8) & 0xff;
  pkt[crcPos + 3] = crc & 0xff;
  return pkt;
}

function buildMinimalTsSegment() {
  const patPkt = makePsiPacket(
    0x0000,
    Buffer.from([0x00, 0xb0, 0x0d, 0x00, 0x01, 0xc1, 0x00, 0x00, 0x00, 0x01, 0xf0, 0x00])
  );
  const pmtPkt = makePsiPacket(
    0x1000,
    Buffer.from([0x02, 0xb0, 0x12, 0x00, 0x01, 0xc1, 0x00, 0x00, 0xe1, 0x00, 0xf0, 0x00, 0x1b, 0xe1, 0x00, 0xf0, 0x00])
  );

  const idrHeader = Buffer.from([0x00, 0x00, 0x00, 0x01, 0x65, 0x88, 0x84, 0x08, 0x68]);
  const pcmY = Buffer.alloc(256, 0x10);
  const pcmUV = Buffer.alloc(128, 0x80);
  const rbspTrail = Buffer.from([0x80]);

  const es = Buffer.concat([
    Buffer.from([
      0x00, 0x00, 0x00, 0x01, 0x09, 0x10,
      0x00, 0x00, 0x00, 0x01, 0x67, 0x42, 0xc0, 0x1e, 0xf4, 0xe2,
      0x00, 0x00, 0x00, 0x01, 0x68, 0xce, 0x38, 0x80,
    ]),
    idrHeader,
    pcmY,
    pcmUV,
    rbspTrail,
  ]);

  const buildPes = (pts90k) => {
    const pts = BigInt(pts90k);
    const pesHeader = Buffer.from([
      0x00, 0x00, 0x01, 0xe0, 0x00, 0x00, 0x80, 0x80, 0x05,
      Number(0x21n | ((pts >> 29n) & 0x0en)),
      Number((pts >> 22n) & 0xffn),
      Number(0x01n | ((pts >> 14n) & 0xfen)),
      Number((pts >> 7n) & 0xffn),
      Number(0x01n | ((pts << 1n) & 0xfen)),
    ]);
    return Buffer.concat([pesHeader, es]);
  };

  const f1 = packetizePes(0x0100, buildPes(90000), 0, 90000);
  const f2 = packetizePes(0x0100, buildPes(180000), f1.nextCc, 180000);
  return Buffer.concat([patPkt, pmtPkt, ...f1.packets, ...f2.packets]);
}

const TS_BYTES = buildMinimalTsSegment();

async function setupRoutes(page, state) {
  await page.route('**/user/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 1,
          name: 'طالب اختبار',
          email: 'student@test.local',
          phoneNumber: '01012345678',
          role: 'STUDENT',
          grade: 'THIRD_SECONDARY',
          slug: 'student-1',
        },
      }),
    })
  );

  await page.route('**/courses/*/bunny-videos', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 1,
            slug: 'test-video',
            title: 'فيديو اختبار الكاش',
            bunnyVideoId: BUNNY_VID,
            status: 'READY',
            duration: 4,
            position: 1,
          },
        ],
      }),
    })
  );

  await page.route('**/videos/*/playback', (route) => {
    state.playbackCalls += 1;
    if (state.playbackStatus === 403) {
      return route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          code: 'VIDEO_ACCESS_DENIED',
          error: 'غير مصرح لك بمشاهدة هذا الفيديو',
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          videoSlug: 'test-video',
          playbackUrl: `https://iframe.mediadelivery.net/embed/999/${BUNNY_VID}`,
          hlsUrl: `${CDN_HOST}/bcdn_token=${state.token}/${BUNNY_VID}/playlist.m3u8`,
          expiresAt: 9999999999,
          hlsExpiresAt: 9999999999,
          cacheConfig: { enabled: true, maxBudgetMb: 300, ttlDays: 14 },
        },
      }),
    });
  });

  await page.route('**/progress/*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { videoSlug: 'test-video', completed: false, watchedAt: null },
      }),
    })
  );

  await page.route('**/quizzes/*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: null }),
    })
  );

  await page.route('**/auth/logout', (route) => {
    state.logoutCalls += 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: null }),
    });
  });

  await page.route('**/notifications/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { count: 0, items: [] } }),
    })
  );

  await page.route('**/videos/telemetry', (route) =>
    route.fulfill({ status: 204, body: '' })
  );

  await page.route(`${CDN_HOST}/**`, (route) => {
    const url = route.request().url();
    if (url.includes('playlist.m3u8')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/vnd.apple.mpegurl',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: [
          '#EXTM3U',
          '#EXT-X-VERSION:3',
          '#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=854x480',
          '480p/video.m3u8',
          '#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=1280x720',
          '720p/video.m3u8',
        ].join('\n'),
      });
    }
    if (url.includes('video.m3u8')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/vnd.apple.mpegurl',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: [
          '#EXTM3U',
          '#EXT-X-VERSION:3',
          '#EXT-X-TARGETDURATION:2',
          '#EXT-X-MEDIA-SEQUENCE:0',
          '#EXTINF:2.0,',
          `seg0.ts?token=seg_${state.token}`,
          '#EXTINF:2.0,',
          `seg1.ts?token=seg_${state.token}`,
          '#EXT-X-ENDLIST',
        ].join('\n'),
      });
    }
    if (url.includes('.ts')) {
      state.tsRequests.push(url);
      return route.fulfill({
        status: 200,
        contentType: 'video/mp2t',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: TS_BYTES,
      });
    }
    return route.abort();
  });
}

async function readIdbSegments(page) {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open('elrn_media_cache_v1', 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('segments')) {
            const s = db.createObjectStore('segments', { keyPath: 'cacheKey' });
            s.createIndex('by_videoId', 'videoId', { unique: false });
            s.createIndex('by_lastAccessedAt', 'lastAccessedAt', { unique: false });
          }
          if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
        };
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('segments', 'readonly');
          const keysReq = tx.objectStore('segments').getAllKeys();
          keysReq.onsuccess = () => {
            const keys = keysReq.result || [];
            db.close();
            resolve(keys);
          };
          keysReq.onerror = () => {
            db.close();
            reject(keysReq.error);
          };
        };
      })
  );
}

async function waitForPlaying(page) {
  await page.waitForFunction(
    () => {
      const v = document.querySelector('video');
      return Boolean(v && !v.paused && v.readyState >= 2);
    },
    null,
    { timeout: 15000 }
  );
}

async function assertWatermarkIntact(page) {
  const wm = page.locator('[data-drm="protected"]');
  await wm.waitFor({ state: 'visible', timeout: 10000 });
  const info = await page.evaluate(() => {
    const el = document.querySelector('[data-drm="protected"]');
    const rect = el ? el.getBoundingClientRect() : null;
    const tampered = document.body.innerText.includes('تم إيقاف تشغيل الفيديو لأسباب أمنية');
    return {
      present: Boolean(el),
      width: rect ? rect.width : 0,
      height: rect ? rect.height : 0,
      text: el ? el.textContent : '',
      tampered,
    };
  });
  assert.equal(info.present, true, 'VideoWatermark element must be present');
  assert.ok(info.width > 100 && info.height > 100, 'VideoWatermark must have non-zero dimensions');
  assert.equal(info.tampered, false, 'VideoWatermark tamper blocker must not be active');
  assert.ok(
    info.text.includes('01012345678') || info.text.includes('طالب اختبار'),
    `VideoWatermark must display user identity, got: ${info.text}`
  );
}

async function run() {
  const { baseUrl, child } = await ensureServer();
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'isLoggedIn',
        value: 'true',
        url: baseUrl,
      },
    ]);
    const page = await context.newPage();
    if (process.env.DEBUG_E2E) {
      page.on('console', (m) => console.log('[console]', m.type(), m.text()));
      page.on('pageerror', (e) => console.log('[pageerror]', e.message));
      page.on('request', (r) => {
        if (!r.url().includes('_next/')) console.log('[req]', r.method(), r.url());
      });
    }
    const state = {
      token: 'TOKEN_1',
      playbackStatus: 200,
      playbackCalls: 0,
      logoutCalls: 0,
      tsRequests: [],
    };
    await setupRoutes(page, state);

    // ── Scenario 1: Pre-Play Zero-Bandwidth ──
    await page.goto(`${baseUrl}${VIDEO_PATH}`, { waitUntil: 'domcontentloaded' });
    const playBtn = page.locator('button[aria-label="تشغيل"]').first();
    await playBtn.waitFor({ state: 'visible', timeout: 20000 });
    await sleep(3000);
    assert.equal(
      state.tsRequests.length,
      0,
      `Scenario 1 failed: expected 0 .ts requests before Play, got ${state.tsRequests.length}`
    );
    console.log('PASS Scenario 1: Pre-Play Zero-Bandwidth (0 .ts requests after 3s)');

    // ── Scenario 2: Cold Load + Cache Population + Scenario 6 (Cold) ──
    await playBtn.click();
    await waitForPlaying(page);
    await sleep(500); // allow async IDB putSegment to settle
    assert.ok(state.tsRequests.length >= 1, 'Scenario 2 failed: expected .ts requests on cold play');
    await page.locator('button[aria-label="إعدادات التشغيل"]').click();
    const qualityText = await page.locator('button:has-text("الجودة")').innerText();
    assert.ok(qualityText.includes('480p'), `Scenario 2 failed: expected 480p quality, got ${qualityText}`);
    await page.locator('button[aria-label="إعدادات التشغيل"]').click();

    const cachedKeys = await readIdbSegments(page);
    assert.ok(cachedKeys.length >= 1, 'Scenario 2 failed: expected >= 1 cached segment in IDB');
    for (const k of cachedKeys) {
      assert.ok(k.startsWith(`v1:${BUNNY_VID}:480p:`), `Unexpected cacheKey format: ${k}`);
      assert.ok(!k.includes('TOKEN_1') && !k.includes('token='), `Token leaked into cacheKey: ${k}`);
      assert.ok(!k.includes('.m3u8'), `Manifest stored in IDB: ${k}`);
    }
    await assertWatermarkIntact(page);
    console.log(`PASS Scenario 2: Cold Load + Cache Population (${cachedKeys.length} keys, 480p, 0 manifests)`);

    // ── Scenario 3: Warm Re-Watch / Token Rotation Cache Hit + Scenario 6 (Warm) ──
    state.token = 'TOKEN_ROTATED_2';
    state.tsRequests = [];
    const playbackBeforeReload = state.playbackCalls;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await playBtn.waitFor({ state: 'visible', timeout: 20000 });
    await playBtn.click();
    await waitForPlaying(page);
    await sleep(400);
    assert.ok(
      state.playbackCalls > playbackBeforeReload,
      'Scenario 3 failed: GET /videos/:slug/playback did not execute on reload'
    );
    assert.equal(
      state.tsRequests.length,
      0,
      `Scenario 3 failed: expected 0 CDN .ts requests on warm cache hit, got ${state.tsRequests.length}`
    );
    await assertWatermarkIntact(page);
    console.log('PASS Scenario 3: Warm Re-Watch / Token Rotation Cache Hit (0 CDN .ts requests, Auth Gate intact)');
    console.log('PASS Scenario 6: Watermark Integrity (visible & untampered on cold + warm playback)');

    // ── Scenario 4: Security Revocation (403) & Logout Purge ──
    // 4a: 403 from /playback
    state.playbackStatus = 403;
    await page.goto(`${baseUrl}${VIDEO_PATH}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () =>
        document.body.innerText.includes('المحتوى محمي للمشتركين فقط') ||
        document.body.innerText.includes('هذه المحاضرة غير متاحة') ||
        document.body.innerText.includes('تعذر تشغيل الفيديو'),
      null,
      { timeout: 15000 }
    );
    await sleep(400);
    const keysAfter403 = await readIdbSegments(page);
    assert.equal(keysAfter403.length, 0, `Scenario 4a failed: expected 0 segments after 403, got ${keysAfter403.length}`);

    // 4b: Re-populate cache, then trigger logout
    state.playbackStatus = 200;
    await page.goto(`${baseUrl}${VIDEO_PATH}`, { waitUntil: 'domcontentloaded' });
    await playBtn.waitFor({ state: 'visible', timeout: 20000 });
    await playBtn.click();
    await waitForPlaying(page);
    await sleep(500);
    const keysBeforeLogout = await readIdbSegments(page);
    assert.ok(keysBeforeLogout.length >= 1, 'Scenario 4b setup failed: cache not re-populated');

    await page.locator('button[aria-label="قائمة المستخدم"]').click();
    await page.locator('button:has-text("تسجيل الخروج")').click();
    await page.waitForFunction(() => window.location.pathname.startsWith('/login'), null, { timeout: 15000 });
    await sleep(400);
    assert.ok(state.logoutCalls >= 1, 'Scenario 4b failed: /auth/logout was not called');
    const keysAfterLogout = await readIdbSegments(page);
    assert.equal(keysAfterLogout.length, 0, `Scenario 4b failed: expected 0 segments after logout, got ${keysAfterLogout.length}`);
    console.log('PASS Scenario 4: Security Revocation (403) & Logout Purge (segments count === 0)');

    await context.close();

    // ── Scenario 5: Fail-Open Resilience (QuotaExceededError on indexedDB.open) ──
    const failCtx = await browser.newContext();
    await failCtx.addCookies([{ name: 'isLoggedIn', value: 'true', url: baseUrl }]);
    await failCtx.addInitScript(() => {
      Object.defineProperty(window.indexedDB, 'open', {
        configurable: true,
        value: () => {
          throw new DOMException('Simulated QuotaExceededError', 'QuotaExceededError');
        },
      });
    });
    const failPage = await failCtx.newPage();
    const pageErrors = [];
    failPage.on('pageerror', (err) => pageErrors.push(err.message));

    const failState = {
      token: 'TOKEN_FAILOPEN',
      playbackStatus: 200,
      playbackCalls: 0,
      logoutCalls: 0,
      tsRequests: [],
    };
    await setupRoutes(failPage, failState);

    await failPage.goto(`${baseUrl}${VIDEO_PATH}`, { waitUntil: 'domcontentloaded' });
    const failPlayBtn = failPage.locator('button[aria-label="تشغيل"]').first();
    await failPlayBtn.waitFor({ state: 'visible', timeout: 20000 });
    await failPlayBtn.click();
    await waitForPlaying(failPage);
    const iframeCount = await failPage.locator('iframe[src*="mediadelivery.net"]').count();
    assert.equal(iframeCount, 0, 'Scenario 5 failed: fell back to iframe instead of fail-open HLS playback');
    assert.equal(pageErrors.length, 0, `Scenario 5 failed: unhandled pageerrors: ${pageErrors.join('; ')}`);
    console.log('PASS Scenario 5: Fail-Open Resilience (plays via hls.js on QuotaExceededError, 0 iframes, 0 errors)');

    await failCtx.close();
    console.log('ALL 6 SCENARIOS PASSED');
  } finally {
    await browser.close();
    if (child) child.kill();
  }
}

run().catch((err) => {
  console.error('E2E FAILED:', err);
  process.exit(1);
});
