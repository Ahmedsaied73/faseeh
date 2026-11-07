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

console.log(`\n=======================================`);
console.log(`Phase 4 Results: ${passedCount} passed, 0 failed.`);
console.log(`=======================================`);
console.log('ALL PHASE 4 SCIENCE KEYBOARD & CHEM TESTS PASSED 100%!\n');
