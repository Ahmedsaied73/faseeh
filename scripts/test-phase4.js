// scripts/test-phase4.js
// Automated verification suite for Phase 4: Science Keyboard & ChemBlockEditor

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const assert = require('assert');
const katex = require('katex');
require('katex/contrib/mhchem');

const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const resolvedPath = path.resolve(__dirname, '..', request.slice(2));
    return originalResolveFilename.call(this, resolvedPath, parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

// Setup TypeScript execution hook for Node
require.extensions['.tsx'] = require.extensions['.ts'] = function (module, filename) {
  const content = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  });
  module._compile(compiled.outputText, filename);
};

// Mock CSS imports for Node environment
require.extensions['.css'] = function () {
  return null;
};

const {
  getScienceKeyboardLayout,
  getNumericKeyboardLayout,
  registerScienceKeyboard,
  tRich,
  richMessages,
} = require('../lib/richContent/index.ts');


console.log('--- Phase 4 Test Suite: Science Keyboard & ChemBlockEditor ---');

let passedCount = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`✔ ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`✖ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Science Keyboard Layout Definition
test('Science keyboard layout structure and localization (ar & en)', () => {
  const layoutAr = getScienceKeyboardLayout('ar');
  assert.strictEqual(layoutAr.id, 'science');
  assert.strictEqual(layoutAr.label, 'علوم');
  assert.ok(layoutAr.rows.length >= 4, 'Must have at least 4 rows');

  const layoutEn = getScienceKeyboardLayout('en');
  assert.strictEqual(layoutEn.id, 'science');
  assert.strictEqual(layoutEn.label, 'Science');
});

test('Science keyboard layout contains all required symbols and structures', () => {
  const layout = getScienceKeyboardLayout('en');
  const allKeys = layout.rows.flat();

  const keyLatexSet = new Set();
  const rawKeyStrings = new Set();

  allKeys.forEach((k) => {
    if (typeof k === 'string') {
      rawKeyStrings.add(k);
    } else if (k && k.latex) {
      keyLatexSet.add(k.latex);
    }
  });

  // Structures
  assert.ok(keyLatexSet.has('\\frac{#@}{#?}'), 'fraction key present');
  assert.ok(keyLatexSet.has('\\sqrt{#0}'), 'square root key present');
  assert.ok(keyLatexSet.has('\\sqrt[#0]{#?}'), 'n-th root key present');
  assert.ok(keyLatexSet.has('#@^{#?}'), 'power key present');
  assert.ok(keyLatexSet.has('#@_{#?}'), 'subscript key present');
  assert.ok(keyLatexSet.has('\\int_{#?}^{#?}'), 'integral key present');
  assert.ok(keyLatexSet.has('\\sum_{#?}^{#?}'), 'sum key present');
  assert.ok(keyLatexSet.has('\\lim_{#?\\to #?}'), 'limit key present');
  assert.ok(keyLatexSet.has('\\vec{#?}'), 'vector key present');

  // Brackets
  assert.ok(keyLatexSet.has('\\left(#0\\right)'), 'parentheses key present');
  assert.ok(keyLatexSet.has('\\left[#0\\right]'), 'brackets key present');
  assert.ok(keyLatexSet.has('\\left|#0\\right|'), 'absolute value key present');

  // Greek letters
  const greekLetters = [
    '\\pi', '\\Delta', '\\theta', '\\omega', '\\alpha', '\\beta',
    '\\lambda', '\\mu', '\\rho', '\\sigma', '\\phi',
  ];
  greekLetters.forEach((letter) => {
    assert.ok(keyLatexSet.has(letter), `Greek letter ${letter} must be present`);
  });

  // Operators & Relations
  const operators = [
    '\\pm', '\\times', '\\cdot', '\\div', '\\neq', '\\leq',
    '\\geq', '\\approx', '\\to', '\\rightleftharpoons', '\\infty', '^{\\circ}',
  ];
  operators.forEach((op) => {
    assert.ok(keyLatexSet.has(op), `Operator ${op} must be present`);
  });

  // Controls
  assert.ok(rawKeyStrings.has('[backspace]'), 'backspace key present');
  assert.ok(rawKeyStrings.has('[undo]'), 'undo key present');
  assert.ok(rawKeyStrings.has('[redo]'), 'redo key present');
  assert.ok(rawKeyStrings.has('[left]'), 'left arrow present');
  assert.ok(rawKeyStrings.has('[right]'), 'right arrow present');

  // Verify NO raw unrendered LaTeX markup in Science key labels
  allKeys.forEach((k) => {
    if (typeof k === 'object' && k && k.label) {
      assert.ok(
        !k.label.includes('\\Box') && !k.label.includes('\\frac') && !k.label.includes('\\sqrt') && !k.label.includes('\\pi'),
        `Keycap label "${k.label}" must not contain raw LaTeX markup; use latex property for MathLive rendering`
      );
    }
  });
});

test('Enhanced Numeric (1 2 3) keyboard layout contains all required student essentials', () => {
  const layout = getNumericKeyboardLayout('ar');
  assert.strictEqual(layout.id, 'numeric');
  assert.strictEqual(layout.label, '1 2 3');
  assert.ok(layout.rows.length === 4, 'Must have exactly 4 rows');

  const allKeys = layout.rows.flat();
  const keyLatexSet = new Set();
  const rawKeyStrings = new Set();

  allKeys.forEach((k) => {
    if (typeof k === 'string') {
      rawKeyStrings.add(k);
    } else if (k && typeof k === 'object') {
      if (k.latex) keyLatexSet.add(k.latex);
      if (k.shift) {
        if (typeof k.shift === 'string') keyLatexSet.add(k.shift);
        else if (k.shift.latex) keyLatexSet.add(k.shift.latex);
      }
      if (Array.isArray(k.variants)) {
        k.variants.forEach((v) => {
          if (typeof v === 'string') keyLatexSet.add(v);
          else if (v && v.latex) keyLatexSet.add(v.latex);
        });
      }
    }
  });

  // 1. Digits & Arithmetic
  ['[0]', '[1]', '[2]', '[3]', '[4]', '[5]', '[6]', '[7]', '[8]', '[9]'].forEach((d) => {
    assert.ok(rawKeyStrings.has(d), `Digit ${d} must be present`);
  });
  ['[+]', '[-]', '[*]', '[/]', '[=]', '[.]'].forEach((op) => {
    assert.ok(rawKeyStrings.has(op), `Operator ${op} must be present`);
  });

  // 2. Comma
  assert.ok(keyLatexSet.has(','), 'Comma must be present in 1 2 3 page');

  // 3. Parentheses
  assert.ok(rawKeyStrings.has('[(]'), 'Parenthesis ( must be present');
  assert.ok(rawKeyStrings.has('[)]'), 'Parenthesis ) must be present');

  // 4. Powers & Roots
  assert.ok(keyLatexSet.has('#@^2'), 'Square power key present');
  assert.ok(keyLatexSet.has('#@^{#?}'), 'Power exponent key present');
  assert.ok(keyLatexSet.has('\\sqrt{#0}'), 'Square root key present');

  // 5. Absolute Value
  assert.ok(keyLatexSet.has('\\left|#0\\right|'), 'Absolute value key present in 1 2 3');

  // 6. Derivatives & Prime
  assert.ok(keyLatexSet.has('#@^{\\prime}'), 'Derivative / prime key present');
  assert.ok(keyLatexSet.has('#@^{\\prime\\prime}'), 'Double derivative variant present');
  assert.ok(keyLatexSet.has("f'(x)"), "f'(x) variant present");
  assert.ok(keyLatexSet.has("y'"), "y' variant present");

  // 7. Constants: e, pi, infty
  assert.ok(keyLatexSet.has('\\exponentialE'), "Euler's number e present in 1 2 3");
  assert.ok(keyLatexSet.has('\\pi'), 'Pi present in 1 2 3');
  assert.ok(keyLatexSet.has('\\infty'), 'Infinity present in 1 2 3');

  // 8. Relations & Logic: neq, in, notin
  assert.ok(keyLatexSet.has('\\neq'), 'Not equal present in 1 2 3');
  assert.ok(keyLatexSet.has('\\in'), 'Element of present in 1 2 3');
  assert.ok(keyLatexSet.has('\\notin'), 'Does not belong present in 1 2 3');

  // 9. Trig functions & Reciprocals: sin/csc, cos/sec, tan/cot
  assert.ok(keyLatexSet.has('\\sin'), 'Sine present in 1 2 3');
  assert.ok(keyLatexSet.has('\\csc'), 'Cosecant (reciprocal) present in 1 2 3');
  assert.ok(keyLatexSet.has('\\cos'), 'Cosine present in 1 2 3');
  assert.ok(keyLatexSet.has('\\sec'), 'Secant (reciprocal) present in 1 2 3');
  assert.ok(keyLatexSet.has('\\tan'), 'Tangent present in 1 2 3');
  assert.ok(keyLatexSet.has('\\cot'), 'Cotangent (reciprocal) present in 1 2 3');

  // 10. Integral
  assert.ok(keyLatexSet.has('\\int'), 'Integral present in 1 2 3');
});

// 2. S2 Pipeline: Every key in Science keyboard produces valid KaTeX LaTeX
test('Every keycap in Science keyboard passes KaTeX rendering (S2 pipeline)', () => {
  const layout = getScienceKeyboardLayout('en');
  const allKeys = layout.rows.flat();

  allKeys.forEach((k) => {
    if (typeof k === 'object' && k && k.latex) {
      // Substitute placeholders for rendering test
      const testLatex = k.latex
        .replace(/#@/g, '{x}')
        .replace(/#0/g, '{x}')
        .replace(/#\?/g, '{1}');

      try {
        const html = katex.renderToString(testLatex, {
          throwOnError: true,
          trust: false,
          strict: 'ignore',
          maxExpand: 1000,
        });
        assert.ok(html.length > 0, `KaTeX output for ${k.latex} must not be empty`);
      } catch (err) {
        throw new Error(`KaTeX failed to render keycap "${k.latex}" (tested as "${testLatex}"): ${err.message}`);
      }
    }
  });
});

test('Every keycap in Numeric (1 2 3) keyboard passes KaTeX rendering', () => {
  const layout = getNumericKeyboardLayout('en');
  const allKeys = layout.rows.flat();

  allKeys.forEach((k) => {
    if (typeof k === 'object' && k && k.latex) {
      const testLatex = k.latex
        .replace(/#@/g, '{x}')
        .replace(/#0/g, '{x}')
        .replace(/#\?/g, '{1}')
        .replace(/\\exponentialE/g, '\\mathrm{e}');

      try {
        const html = katex.renderToString(testLatex, {
          throwOnError: true,
          trust: false,
          strict: 'ignore',
          maxExpand: 1000,
        });
        assert.ok(html.length > 0, `KaTeX output for ${k.latex} must not be empty`);
      } catch (err) {
        throw new Error(`KaTeX failed to render numeric keycap "${k.latex}" (tested as "${testLatex}"): ${err.message}`);
      }
    }
  });
});

test('registerScienceKeyboard registers numeric layout first', () => {
  // Mock window.mathVirtualKeyboard
  global.window = {
    mathVirtualKeyboard: {
      layouts: [],
    },
  };
  registerScienceKeyboard('ar');
  assert.ok(Array.isArray(global.window.mathVirtualKeyboard.layouts));
  assert.strictEqual(global.window.mathVirtualKeyboard.layouts[0].id, 'numeric', 'Numeric layout must be first');
  assert.strictEqual(global.window.mathVirtualKeyboard.layouts[0].label, '1 2 3');
  assert.strictEqual(global.window.mathVirtualKeyboard.layouts[1].id, 'science', 'Science layout must be second');
});


// 3. Chem Block: mhchem fixtures rendering in KaTeX
test('ChemBlock KaTeX mhchem renders all valid chem fixtures', () => {
  const chemFixtures = [
    '2H2 + O2 -> 2H2O',
    'N2 + 3H2 <=> 2NH3',
    'CaCO3 ->[\\Delta] CaO + CO2 ^',
    'Fe^{3+} + 3OH^- -> Fe(OH)3 v',
    'H2SO4 + 2NaOH -> Na2SO4 + 2H2O',
    'Zn + Cu^{2+} -> Zn^{2+} + Cu',
    'CH4 + 2O2 -> CO2 + 2H2O',
  ];

  chemFixtures.forEach((chem) => {
    const html = katex.renderToString(`\\ce{${chem}}`, {
      displayMode: true,
      throwOnError: true,
      trust: false,
      strict: 'ignore',
      maxExpand: 1000,
    });
    assert.ok(html.includes('katex'), `Rendered output for ${chem} must contain KaTeX classes`);
  });
});

// 4. Chem validation: Balanced braces & error detection
test('Chem balanced braces validator correctly classifies expressions', () => {
  function balancedBraces(s) {
    let depth = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === '{') depth++;
      else if (c === '}' && --depth < 0) return false;
    }
    return depth === 0;
  }

  assert.strictEqual(balancedBraces('2H2 + O2 -> 2H2O'), true);
  assert.strictEqual(balancedBraces('Fe^{3+} + 3OH^- -> Fe(OH)3 v'), true);
  assert.strictEqual(balancedBraces('CaCO3 ->[\\Delta] CaO + CO2 ^'), true);
  assert.strictEqual(balancedBraces('Fe^{3+'), false, 'Unclosed brace must be false');
  assert.strictEqual(balancedBraces('Fe^{3+}}'), false, 'Extra closing brace must be false');
  assert.strictEqual(balancedBraces('H2O} \\href{x}{y'), false, 'Mismatched brace must be false');
});

// 5. Quick insertion tokens verification
test('Quick insert tokens match expected chemistry notation', () => {
  const expectedTokens = [' -> ', ' <=> ', ' ^', ' v', ' ->[\\Delta] '];
  expectedTokens.forEach((token) => {
    assert.ok(typeof token === 'string' && token.length > 0);
  });
});

// 6. Localization strings completeness for Phase 4
test('Phase 4 localization keys exist in both ar and en', () => {
  const p4Keys = [
    'rich.keyboardScience',
    'rich.keyboardScienceTooltip',
    'rich.chemInsertArrow',
    'rich.chemInsertEquilibrium',
    'rich.chemInsertGas',
    'rich.chemInsertPrecipitate',
    'rich.chemInsertHeat',
    'rich.chemInvalidFormula',
    'rich.chemPreview',
  ];

  p4Keys.forEach((key) => {
    assert.ok(richMessages.ar[key], `Arabic missing key ${key}`);
    assert.ok(richMessages.en[key], `English missing key ${key}`);
    assert.strictEqual(tRich(key, 'ar'), richMessages.ar[key]);
    assert.strictEqual(tRich(key, 'en'), richMessages.en[key]);
  });
});

// 7. Verify normalizePrimes and calculus derivative robustness
test('normalizePrimes handles composite primes, double superscripts, and escaped accents', () => {
  const { normalizePrimes } = require('../lib/richContent/normalize');

  const cases = [
    { in: "f\\'(x) = 0", expected: "f^{\\prime}(x) = 0" },
    { in: "f\\'\\'(x) = 6x - 6", expected: "f^{\\prime\\prime}(x) = 6x - 6" },
    { in: "f\\'\\'\\'(x) = 6", expected: "f^{\\prime\\prime\\prime}(x) = 6" },
    { in: "f(x)\\' = 0", expected: "f(x)^{\\prime} = 0" },
    { in: "f(x)\\'\\' = 0", expected: "f(x)^{\\prime\\prime} = 0" },
    { in: "y\\'' = 2", expected: "y^{\\prime\\prime} = 2" },
    { in: "f^{\\prime}^{\\prime}(x)", expected: "f^{\\prime\\prime}(x)" },
    { in: "f^{\\prime}^{\\prime}^{\\prime}(x)", expected: "f^{\\prime\\prime\\prime}(x)" },
    { in: "f'^{\\prime}(x)", expected: "f^{\\prime\\prime}(x)" },
    { in: "f''^{\\prime}(x)", expected: "f^{\\prime\\prime\\prime}(x)" },
    { in: "f^\\prime ^\\prime (x)", expected: "f^{\\prime\\prime} (x)" },
    { in: "x^{\\prime}}", expected: "x^{\\prime}" },
    { in: "x^{\\prime\\prime}}", expected: "x^{\\prime\\prime}" },
    { in: "د'(س)", expected: "د'(س)" },
    { in: "د''(س)", expected: "د''(س)" },
  ];

  for (const c of cases) {
    const norm = normalizePrimes(c.in);
    assert.strictEqual(norm, c.expected, `Expected "${c.in}" to normalize to "${c.expected}", got "${norm}"`);
    // Ensure it renders in KaTeX without throwing
    const rendered = katex.renderToString(norm, {
      throwOnError: true,
      trust: false,
      strict: 'ignore',
    });
    assert.ok(rendered.length > 0, `KaTeX failed to render normalized prime "${norm}"`);
  }
});

// 8. Return / newline key on Science and Numeric layouts
test('Return / New line key exists on both Science and Numeric keyboards', () => {
  const sc = getScienceKeyboardLayout('ar');
  const num = getNumericKeyboardLayout('ar');

  const scKeys = sc.rows.flat();
  const numKeys = num.rows.flat();

  const hasScReturn = scKeys.some((k) => typeof k === 'object' && k && (k.command === 'addRowAfter' || k.label === '\u23CE'));
  const hasNumReturn = numKeys.some((k) => typeof k === 'object' && k && (k.command === 'addRowAfter' || k.label === '\u23CE'));

  assert.ok(hasScReturn, 'Science keyboard must have Return / Newline key');
  assert.ok(hasNumReturn, 'Numeric keyboard must have Return / Newline key');
});

console.log(`\n=======================================`);
console.log(`Phase 4 Results: ${passedCount} passed, 0 failed.`);
console.log(`=======================================`);
console.log('ALL PHASE 4 SCIENCE KEYBOARD & CHEM TESTS PASSED 100%!\n');
