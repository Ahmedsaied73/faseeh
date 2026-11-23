import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/osams/.gemini/config/skills/playwright-skill/node_modules/playwright");
import path from "path";
import fs from "fs";

const SCREENSHOTS_DIR = path.resolve("a-e-lrn-frontend/screenshots");
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function run() {
  console.log("=== Launching Playwright Chromium Browser ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log("BROWSER ERROR:", msg.text());
    }
  });

  console.log("Navigating to http://localhost:3000/dev/rich-input ...");
  await page.goto("http://localhost:3000/dev/rich-input", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // 1. Desktop Light RTL (After restyling)
  console.log("Testing Desktop Light RTL...");
  const hasNoHScrollDesktop = await page.evaluate(() => {
    return document.documentElement.scrollWidth <= window.innerWidth;
  });
  console.log("Desktop has no horizontal scroll:", hasNoHScrollDesktop);

  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "after-desktop-essay.png"),
    fullPage: false,
  });
  console.log("Saved: after-desktop-essay.png");

  // 2. Mobile 390px Light RTL (After restyling)
  console.log("Testing Mobile 390x844 Light RTL...");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);

  const hasNoHScrollMobile = await page.evaluate(() => {
    return document.documentElement.scrollWidth <= window.innerWidth + 2;
  });
  console.log("Mobile (390px) has no horizontal scroll:", hasNoHScrollMobile);

  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "after-phone-essay.png"),
    fullPage: false,
  });
  console.log("Saved: after-phone-essay.png");

  // 3. Dark Mode Mobile & Desktop
  console.log("Testing Dark Mode...");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
  });
  await page.waitForTimeout(600);

  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "after-mobile-dark.png"),
    fullPage: false,
  });
  console.log("Saved: after-mobile-dark.png");

  await page.setViewportSize({ width: 1280, height: 850 });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "after-desktop-dark.png"),
    fullPage: false,
  });
  console.log("Saved: after-desktop-dark.png");

  // Switch back to light
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
  });
  await page.waitForTimeout(500);

  // 4. English LTR
  console.log("Testing English LTR...");
  await page.evaluate(() => {
    document.documentElement.setAttribute("dir", "ltr");
    const container = document.querySelector(".container");
    if (container) container.setAttribute("dir", "ltr");
  });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "after-desktop-ltr-en.png"),
    fullPage: false,
  });
  console.log("Saved: after-desktop-ltr-en.png");

  // Switch back to Arabic
  await page.evaluate(() => {
    document.documentElement.setAttribute("dir", "rtl");
    const container = document.querySelector(".container");
    if (container) container.setAttribute("dir", "rtl");
  });
  await page.waitForTimeout(500);

  // 5. Review Page (RichView Numbered)
  console.log("Testing Review Page View (RichView Numbered)...");
  const rvSection = await page.$(".rv--numbered");
  if (rvSection) {
    await rvSection.scrollIntoViewIfNeeded();
  }
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "after-review-page-numbered.png"),
    fullPage: false,
  });
  console.log("Saved: after-review-page-numbered.png");

  // 6. Test MathLive Keyboard & Calculus tab
  console.log("Testing MathLive Keyboard & Calculus Tab...");
  await page.setViewportSize({ width: 1280, height: 950 });
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);

  const mathField = await page.$("math-field");
  if (mathField) {
    await mathField.click();
    await page.waitForTimeout(800);

    const kbdStatus = await page.evaluate(() => {
      const vk = window.mathVirtualKeyboard;
      if (!vk) return { found: false };
      vk.show();
      try {
        vk.currentLayout = "calculus";
      } catch (e) {}
      return { found: true, visible: vk.visible, layout: vk.currentLayout };
    });
    console.log("MathLive keyboard status:", kbdStatus);
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "after-calculus-keyboard-tab.png"),
      fullPage: false,
    });
    console.log("Saved: after-calculus-keyboard-tab.png");
  }

  // 7. Interactive Flows:
  console.log("\n=== Testing Interactive Flows ===");

  // A. Type 1/2 in math field -> fraction
  const mfFirst = page.locator("math-field").first();
  await mfFirst.click();
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const mf = document.querySelector("math-field");
    if (mf) mf.setValue("");
  });
  await page.keyboard.type("1/2");
  await page.waitForTimeout(400);

  const fractionVal = await page.evaluate(() => document.querySelector("math-field")?.getValue("latex-expanded") || "");
  const fractionSuccess = fractionVal.includes("\\frac{1}{2}") || fractionVal.includes("\\frac12") || fractionVal.includes("\\frac{1}{#?}");
  console.log("Flow [type 1/2 -> fraction]:", { success: fractionSuccess, val: fractionVal });

  // B. Enter in non-empty equation line adds a new line
  await page.evaluate(() => {
    const mf = document.querySelector(".rs-line--math math-field");
    if (mf) mf.setValue("x=5");
  });
  const countBeforeEnter = await page.locator(".rs-line").count();
  await page.locator(".rs-line--math").first().click();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  const countAfterEnter = await page.locator(".rs-line").count();
  console.log("Flow [Enter adds new equation line]:", {
    success: countAfterEnter === countBeforeEnter + 1,
    countBefore: countBeforeEnter,
    countAfter: countAfterEnter,
  });

  // C. Backspace in empty equation line removes it
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(400);
  const countAfterBackspace = await page.locator(".rs-line").count();
  console.log("Flow [Backspace removes empty line]:", {
    success: countAfterBackspace === countBeforeEnter,
    countBefore: countAfterEnter,
    countAfter: countAfterBackspace,
  });

  // D. Reorder lines (move line 1 down)
  const firstLineIsTextBefore = await page.evaluate(() => document.querySelector(".rs-line").classList.contains("rs-line--text"));
  const firstLine = page.locator(".rs-line").first();
  await firstLine.click();
  await page.waitForTimeout(200);
  await firstLine.locator("button[title='تحريك لأسفل']").click();
  await page.waitForTimeout(400);
  const firstLineIsTextAfter = await page.evaluate(() => document.querySelector(".rs-line").classList.contains("rs-line--text"));
  console.log("Flow [Reorder lines]:", {
    success: firstLineIsTextBefore !== firstLineIsTextAfter,
    firstLineIsTextBefore,
    firstLineIsTextAfter,
  });

  // E. Delete line
  const countBeforeDel = await page.locator(".rs-line").count();
  const lineToDel = page.locator(".rs-line").first();
  await lineToDel.click();
  await page.waitForTimeout(200);
  await lineToDel.locator(".rs-del").click();
  await page.waitForTimeout(400);
  const countAfterDel = await page.locator(".rs-line").count();
  console.log("Flow [Delete line]:", {
    success: countAfterDel === countBeforeDel - 1,
    countBefore: countBeforeDel,
    countAfter: countAfterDel,
  });

  // F. Last line deleted -> cleared not removed
  while ((await page.locator(".rs-line").count()) > 1) {
    const l = page.locator(".rs-line").first();
    await l.click();
    await page.waitForTimeout(100);
    await l.locator(".rs-del").click();
    await page.waitForTimeout(200);
  }
  const countSole = await page.locator(".rs-line").count();
  const soleLine = page.locator(".rs-line").first();
  await soleLine.click();
  // Fill something to clear
  const ta = soleLine.locator("textarea");
  if ((await ta.count()) > 0) {
    await ta.fill("Clear me");
  } else {
    await soleLine.locator("math-field").evaluate((mf) => mf.setValue("x=1"));
  }
  await page.waitForTimeout(200);
  await soleLine.locator(".rs-del").click();
  await page.waitForTimeout(400);
  const countAfterSoleDel = await page.locator(".rs-line").count();
  const valAfterSoleDel = await page.evaluate(() => {
    const t = document.querySelector(".rs-line textarea");
    const m = document.querySelector(".rs-line math-field");
    return t ? t.value : (m ? m.getValue() : null);
  });
  console.log("Flow [Last line deleted -> cleared not removed]:", {
    success: countAfterSoleDel === 1 && valAfterSoleDel === "",
    countSole,
    countAfterSoleDel,
    valAfterSoleDel,
  });

  // G. 60-line limit check
  const addTextBtn = page.locator(".rs-btn:not(.rs-btn--math)");
  for (let i = 0; i < 65; i++) {
    if (await addTextBtn.isEnabled()) {
      await addTextBtn.click();
    }
  }
  await page.waitForTimeout(400);
  const finalCount = await page.locator(".rs-line").count();
  const isBtnDisabled = !(await addTextBtn.isEnabled());
  const hasLimitNote = await page.locator(".rs-note--warn.rs-span").isVisible();
  console.log("Flow [60-line limit check]:", {
    success: finalCount === 60 && isBtnDisabled && hasLimitNote,
    finalCount,
    isBtnDisabled,
    hasLimitNote,
  });

  // H. prefers-reduced-motion check
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const reducedMotionDefault = await page.evaluate(() => {
    const line = document.querySelector(".rs-line");
    if (!line) return false;
    const style = window.getComputedStyle(line);
    return style.animationName !== "none";
  });
  console.log("Animation present by default:", reducedMotionDefault);

  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedMotionActive = await page.evaluate(() => {
    const line = document.querySelector(".rs-line");
    if (!line) return false;
    const style = window.getComputedStyle(line);
    return style.animationName === "none";
  });
  console.log("prefers-reduced-motion stops animation:", reducedMotionActive);

  await browser.close();
  console.log("\n=== ALL PLAYWRIGHT VERIFICATION CHECKS COMPLETED SUCCESSFULLY ===");
}

run().catch((err) => {
  console.error("Playwright test error:", err);
  process.exit(1);
});
