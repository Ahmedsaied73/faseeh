import katex from "katex";

// All calculus keys from CALCULUS_LAYOUT
const calculusKeys = [
  "f\\left(x\\right)",
  "f'\\left(x\\right)",
  "f''\\left(x\\right)",
  "f^{-1}\\left(x\\right)",
  "y'",
  "y''",
  "\\frac{dy}{dx}",
  "\\frac{d}{dx}",
  "\\frac{d^{2}y}{dx^{2}}",
  "\\frac{\\partial}{\\partial x}",
  "\\int #?\\,dx",
  "\\int_{#?}^{#?}#?\\,dx",
  "\\left[#?\\right]_{#?}^{#?}",
  "dx",
  "dy",
  "dt",
  "\\Delta x",
  "\\lim_{x\\to #?}#?",
  "\\lim_{x\\to\\infty}",
  "\\sum_{#?}^{#?}#?",
  "e^{#?}",
  "\\ln\\left(#?\\right)",
  "\\sin\\left(#?\\right)",
  "\\cos\\left(#?\\right)",
  "\\tan\\left(#?\\right)",
  "\\sin^{2}",
  "\\cos^{2}",
  "\\log_{#?}\\left(#?\\right)",
  "\\left|#0\\right|",
  "\\frac{#@}{#?}",
  "\\sqrt{#0}",
  "#@^{#?}",
  "\\left(#0\\right)",
  "x",
  "y",
  "t",
  "g\\left(x\\right)",
  "=",
  "+",
  "-",
  "\\times",
  "\\div",
];

// All science keys
const scienceKeys = [
  "\\frac{#@}{#?}",
  "\\sqrt{#0}",
  "\\sqrt[#0]{#?}",
  "#@^{#?}",
  "#@_{#?}",
  "\\int_{#?}^{#?}",
  "\\sum_{#?}^{#?}",
  "\\lim_{#?\\to #?}",
  "\\vec{#?}",
  "\\left(#0\\right)",
  "\\left[#0\\right]",
  "\\left|#0\\right|",
  "\\pi",
  "\\Delta",
  "\\theta",
  "\\omega",
  "\\alpha",
  "\\beta",
  "\\lambda",
  "\\mu",
  "\\rho",
  "\\sigma",
  "\\phi",
  "\\pm",
  "\\times",
  "\\cdot",
  "\\div",
  "\\neq",
  "\\leq",
  "\\geq",
  "\\approx",
  "\\to",
  "\\rightleftharpoons",
  "\\infty",
  "^{\\circ}",
];

function fillPlaceholders(tex) {
  return tex
    .replace(/#@/g, "x")
    .replace(/#0/g, "x")
    .replace(/#\?/g, "1");
}

let passed = 0;
let failed = 0;

console.log("=== Testing Calculus Layout Keys through KaTeX (throwOnError: true) ===");
for (const key of calculusKeys) {
  const filled = fillPlaceholders(key);
  try {
    katex.renderToString(filled, { throwOnError: true, displayMode: true });
    passed++;
  } catch (err) {
    console.error(`FAILED for key: "${key}" (filled: "${filled}"):`, err.message);
    failed++;
  }
}

console.log(`Calculus keys: ${passed} passed, ${failed} failed.`);

let sciPassed = 0;
let sciFailed = 0;
console.log("\n=== Testing Science Layout Keys through KaTeX (throwOnError: true) ===");
for (const key of scienceKeys) {
  const filled = fillPlaceholders(key);
  try {
    katex.renderToString(filled, { throwOnError: true, displayMode: true });
    sciPassed++;
  } catch (err) {
    console.error(`FAILED for key: "${key}" (filled: "${filled}"):`, err.message);
    sciFailed++;
  }
}

console.log(`Science keys: ${sciPassed} passed, ${sciFailed} failed.`);

if (failed === 0 && sciFailed === 0) {
  console.log("\nALL KEYS PRODUCED 100% VALID LATEX THROUGH KATEX!");
  process.exit(0);
} else {
  process.exit(1);
}
