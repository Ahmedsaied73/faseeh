import assert from 'node:assert/strict';
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

async function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    const globalPwPath = path.join(globalRoot, 'playwright', 'index.mjs');
    return await import(pathToFileURL(globalPwPath).href);
  }
}

// Valid 1x1 white PNG buffer (89 bytes) so browser <img> and <canvas> decode it cleanly.
const VALID_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
  'base64',
);

const PORT = Number(process.env.E2E_PORT || 3108);
const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;
const QUIZ_RUN_URL = `${BASE_URL}/course/course-1/video/vid-1/quiz/run`;

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // server not ready yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Timed out waiting for server at ${url}`);
}

function startNextServer(cwd, port) {
  const proc = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['next', 'start', '-p', String(port)],
    {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    },
  );
  return proc;
}

function stopServer(proc) {
  if (!proc || proc.killed) return;
  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      // ignore if already exited
    }
  } else {
    proc.kill('SIGTERM');
  }
}

function buildStartQuizResponse({ essayPhotoEnabled, remainingPhotoAttempts = 10 }) {
  return {
    success: true,
    data: {
      attemptId: 101,
      attemptNumber: 1,
      status: 'IN_PROGRESS',
      resumed: false,
      startedAt: new Date().toISOString(),
      deadlineAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      responses: {},
      essayPhotoEnabled,
      remainingPhotoAttempts,
      quiz: {
        id: 10,
        title: 'اختبار مقالي تجريبي',
        videoSlug: 'vid-1',
        timeLimitSec: 600,
        surveyJson: {
          pages: [
            {
              elements: [
                {
                  name: 'q1',
                  type: 'comment',
                  title: 'اكتب خطوات الحل بالتفصيل',
                },
              ],
            },
          ],
        },
      },
    },
  };
}

async function setupCommonMocks(page, options = {}) {
  const {
    essayPhotoEnabled = true,
    remainingPhotoAttempts = 10,
    extractHandler,
    submitHandler,
  } = options;

  await page.addInitScript(() => {
    const origCreate = URL.createObjectURL.bind(URL);
    const origRevoke = URL.revokeObjectURL.bind(URL);
    window.__blobTracker = { created: [], revoked: [] };
    URL.createObjectURL = (obj) => {
      const u = origCreate(obj);
      window.__blobTracker.created.push(u);
      return u;
    };
    URL.revokeObjectURL = (u) => {
      window.__blobTracker.revoked.push(u);
      return origRevoke(u);
    };
  });

  await page.context().addCookies([
    { name: 'isLoggedIn', value: 'true', url: BASE_URL },
  ]);

  await page.route('**/user/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { id: 1, name: 'طالب تجريبي', email: 'student@test.local', role: 'STUDENT' },
      }),
    });
  });

  await page.route('**/quizzes/videos/*/start', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildStartQuizResponse({ essayPhotoEnabled, remainingPhotoAttempts })),
    });
  });

  await page.route('**/quizzes/attempts/*/save', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { savedAt: new Date().toISOString() } }),
    });
  });

  await page.route('**/quizzes/videos/*/meta', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { exists: true, unlocked: true, passed: false, atMaxAttempts: false },
      }),
    });
  });

  await page.route('**/quizzes/attempts/*/result', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          attemptId: 101,
          status: 'GRADING',
          score: null,
          passed: null,
          quizTitle: 'اختبار مقالي تجريبي',
        },
      }),
    });
  });

  await page.route('**/quizzes/attempts/*/submit', async (route) => {
    if (submitHandler) {
      await submitHandler(route);
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { attemptId: 101, status: 'GRADING' },
      }),
    });
  });

  await page.route('**/api/essay-photo/extract', async (route) => {
    if (extractHandler) {
      await extractHandler(route);
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          extractionId: 'ext-1',
          text: 'س = 5',
          unreadableCount: 0,
          imageQuality: 'good',
          detectedLanguage: 'ar',
          warnings: [],
          remainingExamAttempts: 9,
          cached: false,
        },
      }),
    });
  });
}

async function uploadImageAndConfirmCrop(page) {
  const fileInput = page.locator('input[type="file"][accept="image/*"]');
  await fileInput.setInputFiles({
    name: 'solution.png',
    mimeType: 'image/png',
    buffer: VALID_PNG_BUFFER,
  });

  const modal = page.getByRole('dialog', { name: 'تعديل صورة الحل' });
  await modal.waitFor({ state: 'visible' });

  // Rotate 90 degrees and toggle crop controls
  await modal.getByRole('button', { name: 'تدوير 90°' }).click();
  await modal.getByRole('button', { name: 'قص الأطراف' }).click();
  await modal.getByRole('button', { name: 'استخراج النص' }).click();
}

async function runTestsForViewport(browser, viewport) {
  const label = `${viewport.name} (${viewport.width}x${viewport.height})`;
  console.log(`\n=== Running E2E tests on ${label} ===`);

  // 1. Visibility gating: essayPhotoEnabled = false
  {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    await setupCommonMocks(page, { essayPhotoEnabled: false });
    await page.goto(QUIZ_RUN_URL, { waitUntil: 'networkidle' });
    await page.locator('textarea').waitFor({ state: 'visible' });
    const photoBtnCount = await page.getByRole('button', { name: 'صوّر حلك' }).count();
    assert.equal(photoBtnCount, 0, `${label}: button should be hidden when essayPhotoEnabled=false`);
    await context.close();
    console.log(`✔ [${label}] Visibility gating (disabled)`);
  }

  // 2. Visibility gating: essayPhotoEnabled = true + Happy Path (crop/rotate, review, confirm, submit, Blob URL revoked)
  {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    let submittedPayload = null;
    await setupCommonMocks(page, {
      essayPhotoEnabled: true,
      submitHandler: async (route) => {
        submittedPayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { attemptId: 101, status: 'GRADING' } }),
        });
      },
    });

    await page.goto(QUIZ_RUN_URL, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'صوّر حلك' }).waitFor({ state: 'visible' });
    await page.getByText('متبقي 10 من 10 محاولات تصوير في هذا الامتحان').waitFor({ state: 'visible' });

    await uploadImageAndConfirmCrop(page);

    const reviewPanel = page.getByTestId('extraction-review-panel');
    await reviewPanel.waitFor({ state: 'visible' });

    // Confirm button must be disabled until checkbox is checked
    const confirmBtn = reviewPanel.getByRole('button', { name: 'اعتماد الإجابة' });
    assert.equal(await confirmBtn.isDisabled(), true, `${label}: confirm button should start disabled`);

    await reviewPanel.getByLabel('راجعت النص وهو مطابق لحلي').check();
    assert.equal(await confirmBtn.isDisabled(), false, `${label}: confirm button should enable after check`);
    await confirmBtn.click();

    await reviewPanel.waitFor({ state: 'hidden' });

    // Verify Blob URLs created were revoked
    const tracker = await page.evaluate(() => window.__blobTracker);
    assert.ok(tracker.created.length >= 2, `${label}: expected blob URLs created for crop & review`);
    for (const url of tracker.created) {
      assert.ok(tracker.revoked.includes(url), `${label}: blob URL ${url} was not revoked`);
    }

    // Remaining attempts updated to 9
    await page.getByText('متبقي 9 من 10 محاولات تصوير في هذا الامتحان').waitFor({ state: 'visible' });

    // Submit quiz
    await page.getByRole('button', { name: 'إنهاء وتسليم' }).click();
    await page.getByRole('button', { name: 'تسليم', exact: true }).click();
    await page.waitForURL('**/quiz/result/101');
    assert.equal(submittedPayload?.answers?.q1, 'س = 5');
    assert.equal(submittedPayload?.essayMeta?.q1?.source, 'photo');
    assert.equal(submittedPayload?.essayMeta?.q1?.wasEdited, false);

    await context.close();
    console.log(`✔ [${label}] Happy path (crop/rotate, review, confirm, Blob revoke, submit)`);
  }

  // 3. [?] review gate: blocked while [?] exists, jump helper works, resolving [?] enables submit
  {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    await setupCommonMocks(page, {
      essayPhotoEnabled: true,
      extractHandler: async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              extractionId: 'ext-q',
              text: 'الناتج = [?] + 5',
              unreadableCount: 1,
              imageQuality: 'medium',
              detectedLanguage: 'ar',
              warnings: [],
              remainingExamAttempts: 9,
              cached: false,
            },
          }),
        });
      },
    });

    await page.goto(QUIZ_RUN_URL, { waitUntil: 'networkidle' });
    await uploadImageAndConfirmCrop(page);

    const reviewPanel = page.getByTestId('extraction-review-panel');
    await reviewPanel.waitFor({ state: 'visible' });

    const confirmBtn = reviewPanel.getByRole('button', { name: 'اعتماد الإجابة' });
    await reviewPanel.getByLabel('راجعت النص وهو مطابق لحلي').check();
    assert.equal(await confirmBtn.isDisabled(), true, `${label}: confirm must stay disabled while [?] exists`);

    // Jump to next marker button
    await reviewPanel.getByRole('button', { name: 'انتقل للعلامة التالية' }).click();
    const reviewTextarea = reviewPanel.locator('textarea').first();
    const selection = await reviewTextarea.evaluate((el) => ({
      start: el.selectionStart,
      end: el.selectionEnd,
      selected: el.value.slice(el.selectionStart, el.selectionEnd),
    }));
    assert.equal(selection.selected, '[?]', `${label}: jump helper should select [?]`);

    // Resolve [?]
    await reviewTextarea.fill('الناتج = 10 + 5');
    assert.equal(await confirmBtn.isDisabled(), false, `${label}: confirm must enable after resolving [?]`);
    await confirmBtn.click();
    await reviewPanel.waitFor({ state: 'hidden' });

    await context.close();
    console.log(`✔ [${label}] [?] review gate & jump helper`);
  }

  // 4. Server-side 422 [?] rejection handled cleanly
  {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    await setupCommonMocks(page, {
      essayPhotoEnabled: true,
      submitHandler: async (route) => {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'تحتوي الإجابة على علامات [?] غير مراجعة',
            code: 'UNRESOLVED_MARKERS',
          }),
        });
      },
    });

    await page.goto(QUIZ_RUN_URL, { waitUntil: 'networkidle' });
    await page.locator('textarea').first().fill('إجابة نصية صالحة');
    await page.getByRole('button', { name: 'إنهاء وتسليم' }).click();
    await page.getByRole('button', { name: 'تسليم', exact: true }).click();
    await page.getByText('تحتوي الإجابة على علامات [?] غير مراجعة').waitFor({ state: 'visible' });

    await context.close();
    console.log(`✔ [${label}] Server-side 422 rejection handled cleanly`);
  }

  // 5. Graceful keyboard fallback on 504, 503, 429 + exam timer keeps ticking uninterrupted
  {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    let callCount = 0;
    await setupCommonMocks(page, {
      essayPhotoEnabled: true,
      extractHandler: async (route) => {
        callCount += 1;
        if (callCount === 1) {
          await route.fulfill({
            status: 504,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: 'timeout', code: 'PROVIDER_TIMEOUT' }),
          });
        } else if (callCount === 2) {
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: 'budget', code: 'BUDGET_EXCEEDED' }),
          });
        } else {
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: 'limit', code: 'EXAM_ATTEMPT_LIMIT' }),
          });
        }
      },
    });

    await page.goto(QUIZ_RUN_URL, { waitUntil: 'networkidle' });
    const timerLocator = page.locator('header span.font-mono');
    const timerBefore = (await timerLocator.textContent())?.trim();

    // 504 timeout
    await uploadImageAndConfirmCrop(page);
    await page.getByText('استغرق استخراج النص وقتاً طويلاً').waitFor({ state: 'visible' });

    // 503 budget / kill switch
    await uploadImageAndConfirmCrop(page);
    await page.getByText('خدمة التصوير متوقفة مؤقتاً').waitFor({ state: 'visible' });

    // 429 10-attempt cap
    await uploadImageAndConfirmCrop(page);
    await page.getByText('تم استهلاك الحد المسموح لتصوير الحل').waitFor({ state: 'visible' });
    assert.equal(await page.getByRole('button', { name: 'صوّر حلك' }).isDisabled(), true);

    // Wait 1.2s and confirm exam timer keeps ticking uninterrupted
    await page.waitForTimeout(1200);
    const timerAfter = (await timerLocator.textContent())?.trim();
    assert.notEqual(timerAfter, timerBefore, `${label}: exam timer should keep ticking (${timerBefore} -> ${timerAfter})`);

    // Keyboard fallback still works
    await page.getByRole('button', { name: 'الكتابة بالكيبورد' }).click();
    await page.locator('textarea').first().fill('كتابة يدوية بعد تعطل التصوير');
    assert.equal(await page.locator('textarea').first().inputValue(), 'كتابة يدوية بعد تعطل التصوير');

    await context.close();
    console.log(`✔ [${label}] Graceful fallback on 504/503/429 & uninterrupted timer (${timerBefore} -> ${timerAfter})`);
  }
}

async function main() {
  const { chromium } = await loadPlaywright();
  const appDir = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
  let serverProc = null;

  if (!process.env.E2E_BASE_URL) {
    console.log(`Starting Next.js production server on port ${PORT}...`);
    serverProc = startNextServer(appDir, PORT);
    await waitForServer(BASE_URL);
  }

  const browser = await chromium.launch({ headless: true });
  try {
    await runTestsForViewport(browser, { name: 'desktop', width: 1280, height: 800 });
    await runTestsForViewport(browser, { name: 'mobile', width: 390, height: 844 });
    console.log('\nALL E2E ESSAY-PHOTO TESTS PASSED (desktop + mobile)!');
  } finally {
    await browser.close();
    stopServer(serverProc);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
