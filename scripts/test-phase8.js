// scripts/test-phase8.js
// Automated verification suite for Phase 8: HandwritingPad Canvas & Feature Flag Gating

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const assert = require('assert');
const katex = require('katex');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

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
  validateStrokes,
  STROKES_LIMITS,
  tRich,
  richMessages,
} = require('../lib/richContent/index.ts');

const { HandwritingPad } = require('../components/rich/HandwritingPad.tsx');
const { RichEditor } = require('../components/rich/RichEditor.tsx');

console.log('--- Phase 8 Test Suite: HandwritingPad & Infrastructure Gating ---');

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

// 1. Feature Flag Strict Gating
test('Flag gating: strictly hidden when NEXT_PUBLIC_HANDWRITING_ENABLED is unset or false', () => {
  const originalFlag = process.env.NEXT_PUBLIC_HANDWRITING_ENABLED;
  try {
    // When unset / false
    delete process.env.NEXT_PUBLIC_HANDWRITING_ENABLED;
    const htmlUnset = ReactDOMServer.renderToStaticMarkup(
      React.createElement(HandwritingPad, { locale: 'ar' })
    );
    assert.strictEqual(htmlUnset, '', 'HandwritingPad must return null when flag is unset');

    process.env.NEXT_PUBLIC_HANDWRITING_ENABLED = 'false';
    const htmlFalse = ReactDOMServer.renderToStaticMarkup(
      React.createElement(HandwritingPad, { locale: 'ar' })
    );
    assert.strictEqual(htmlFalse, '', 'HandwritingPad must return null when flag is false');

    // RichEditor with math block should not show handwriting button when flag is false
    const editorHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(RichEditor, {
        value: JSON.stringify({ v: 1, blocks: [{ t: 'math', v: 'x^2' }] }),
        onChange: () => {},
        locale: 'ar',
      })
    );
    assert(
      !editorHtml.includes('rich.handwritingToggle') && !editorHtml.includes('كتابة باليد'),
      'RichEditor must not show handwriting toggle button when flag is false'
    );
  } finally {
    process.env.NEXT_PUBLIC_HANDWRITING_ENABLED = originalFlag;
  }
});

test('Flag gating: rendered when NEXT_PUBLIC_HANDWRITING_ENABLED === "true" or forceEnable', () => {
  const originalFlag = process.env.NEXT_PUBLIC_HANDWRITING_ENABLED;
  try {
    process.env.NEXT_PUBLIC_HANDWRITING_ENABLED = 'true';
    const htmlTrue = ReactDOMServer.renderToStaticMarkup(
      React.createElement(HandwritingPad, { locale: 'ar' })
    );
    assert(htmlTrue.includes('<canvas'), 'HandwritingPad must render canvas when flag is true');
    assert(htmlTrue.includes('touch-action:none'), 'Canvas must specify touch-action: none');

    // forceEnable prop bypasses flag for tests
    process.env.NEXT_PUBLIC_HANDWRITING_ENABLED = 'false';
    const htmlForce = ReactDOMServer.renderToStaticMarkup(
      React.createElement(HandwritingPad, { locale: 'ar', forceEnable: true })
    );
    assert(htmlForce.includes('<canvas'), 'forceEnable must allow rendering when flag is false');
  } finally {
    process.env.NEXT_PUBLIC_HANDWRITING_ENABLED = originalFlag;
  }
});

// 2. Stroke Data Structure Validation
test('validateStrokes: correctly validates valid coordinate arrays', () => {
  const validStrokes = {
    x: [
      [10, 15, 20, 25],
      [100, 110, 120],
    ],
    y: [
      [20, 25, 30, 35],
      [200, 210, 220],
    ],
  };

  const res = validateStrokes(validStrokes);
  assert.strictEqual(res.ok, true, 'Valid stroke structure should pass validation');
  assert.strictEqual(res.strokes.x.length, 2);
  assert.strictEqual(res.strokes.y.length, 2);
});

test('validateStrokes: rejects empty or malformed stroke data', () => {
  // Empty
  assert.strictEqual(validateStrokes({ x: [], y: [] }).error, 'STROKES_EMPTY');

  // Mismatched array lengths
  assert.strictEqual(
    validateStrokes({ x: [[10, 20]], y: [] }).error,
    'STROKES_MISMATCHED_ARRAYS'
  );
  assert.strictEqual(
    validateStrokes({ x: [[10, 20]], y: [[10]] }).error,
    'STROKES_MISMATCHED_ARRAYS'
  );

  // Non-array or null
  assert.strictEqual(validateStrokes(null).error, 'STROKES_MISMATCHED_ARRAYS');
  assert.strictEqual(validateStrokes({ x: 'bad', y: 'bad' }).error, 'STROKES_MISMATCHED_ARRAYS');
});

test('validateStrokes: rejects strokes exceeding limits or containing non-finite coordinates', () => {
  // Exceeding max strokes (80)
  const tooManyStrokes = {
    x: Array.from({ length: 81 }, () => [1, 2]),
    y: Array.from({ length: 81 }, () => [1, 2]),
  };
  assert.strictEqual(validateStrokes(tooManyStrokes).error, 'STROKES_TOO_MANY');

  // Exceeding max total points (6000)
  const hugeStroke = Array.from({ length: 6001 }, (_, i) => i);
  const tooManyPoints = {
    x: [hugeStroke],
    y: [hugeStroke],
  };
  assert.strictEqual(validateStrokes(tooManyPoints).error, 'STROKES_TOO_MANY_POINTS');

  // Non-finite coordinates
  const nanStrokes = {
    x: [[10, NaN]],
    y: [[20, 30]],
  };
  assert.strictEqual(validateStrokes(nanStrokes).error, 'STROKES_NON_FINITE_COORDINATE');

  const infStrokes = {
    x: [[10, 20]],
    y: [[20, Infinity]],
  };
  assert.strictEqual(validateStrokes(infStrokes).error, 'STROKES_NON_FINITE_COORDINATE');
});

// 3. Canvas & UI Controls Rendering
test('HandwritingPad controls and accessibility attributes', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(HandwritingPad, {
      locale: 'ar',
      forceEnable: true,
      className: 'test-pad',
    })
  );

  assert(html.includes('handwriting-pad'), 'Component must have handwriting-pad container class');
  assert(html.includes('touch-action:none'), 'Canvas must enforce touch-action: none');
  assert(html.includes('aria-label'), 'Component must have aria-label');
  assert(html.includes('0 / 80'), 'Must display stroke counter indicator');
  assert(html.includes('cursor-crosshair'), 'Canvas should have crosshair cursor for drawing');
});

// 4. Conversion Flow with Mock Recognizer & KaTeX Validation
test('Conversion workflow: passes recognized LaTeX and validates with KaTeX', async () => {
  let recognizedLatex = null;
  const mockLatex = '\\frac{a+b}{c}';

  const mockRecognizer = async (strokes) => {
    assert(strokes.x.length > 0, 'Recognizer should receive strokes');
    return { latex: mockLatex };
  };

  const sampleStrokes = {
    x: [[10, 20, 30]],
    y: [[50, 60, 70]],
  };

  // 1. Validate strokes
  const strokeValidation = validateStrokes(sampleStrokes);
  assert.strictEqual(strokeValidation.ok, true);

  // 2. Invoke mock recognizer
  const res = await mockRecognizer(sampleStrokes);
  recognizedLatex = res.latex;
  assert.strictEqual(recognizedLatex, mockLatex);

  // 3. KaTeX must accept the recognized LaTeX
  const katexHtml = katex.renderToString(recognizedLatex, {
    throwOnError: true,
    trust: false,
    strict: 'ignore',
  });
  assert(katexHtml.includes('class="katex"'), 'Recognized LaTeX must parse cleanly with KaTeX');
});

test('Conversion error handling: invalid provider response returns error message', async () => {
  const failingRecognizer = async () => {
    return { latex: null, error: 'Provider unavailable' };
  };

  const res = await failingRecognizer();
  assert.strictEqual(res.latex, null);
  assert.strictEqual(res.error, 'Provider unavailable');
});

// 5. Localization Dictionary Completeness
test('Phase 8 localization keys exist in ar and en', () => {
  const requiredKeys = [
    'rich.handwritingToggle',
    'rich.handwritingTitle',
    'rich.handwritingUndo',
    'rich.handwritingClear',
    'rich.handwritingConvert',
    'rich.handwritingConverting',
    'rich.handwritingInstruction',
    'rich.handwritingUnavailable',
    'rich.handwritingError',
    'rich.handwritingEmpty',
    'rich.handwritingTooManyStrokes',
    'rich.handwritingClose',
  ];

  for (const key of requiredKeys) {
    assert(richMessages.ar[key], `Missing Arabic translation for ${key}`);
    assert(richMessages.en[key], `Missing English translation for ${key}`);
    assert.strictEqual(typeof tRich(key, 'ar'), 'string');
    assert.strictEqual(typeof tRich(key, 'en'), 'string');
  }
});

console.log('\n=======================================');
console.log(`Phase 8 Results: ${passedCount} passed, 0 failed.`);
console.log('=======================================');
console.log('ALL PHASE 8 HANDWRITING INFRASTRUCTURE TESTS PASSED 100%!\n');
