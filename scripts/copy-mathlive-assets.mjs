// scripts/copy-mathlive-assets.mjs
// Self-host MathLive font assets into /public/mathlive/fonts

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const sourceFontsDir = path.join(projectRoot, 'node_modules', 'mathlive', 'fonts');
const targetFontsDir = path.join(projectRoot, 'public', 'mathlive', 'fonts');

function copyFonts() {
  if (!fs.existsSync(sourceFontsDir)) {
    console.warn(`[copy-mathlive-assets] Source fonts directory not found at ${sourceFontsDir}. Skipping.`);
    return;
  }

  if (!fs.existsSync(targetFontsDir)) {
    fs.mkdirSync(targetFontsDir, { recursive: true });
  }

  const fontFiles = fs.readdirSync(sourceFontsDir);
  let count = 0;

  for (const file of fontFiles) {
    const srcPath = path.join(sourceFontsDir, file);
    const stat = fs.statSync(srcPath);
    if (stat.isFile()) {
      const destPath = path.join(targetFontsDir, file);
      fs.copyFileSync(srcPath, destPath);
      count++;
    }
  }

  console.log(`[copy-mathlive-assets] Successfully copied ${count} font files to ${targetFontsDir}`);
}

copyFonts();
