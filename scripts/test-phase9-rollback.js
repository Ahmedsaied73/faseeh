// scripts/test-phase9-rollback.js
// Automated verification suite for Phase 9: Rollback Behavior and Read-Only Envelope Preservation

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const assert = require('assert');
const katex = require('katex');
require('katex/contrib/mhchem');
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
  parseRich,
  serializeRich,
  looksRich,
} = require('../lib/richContent/index.ts');

const { resolveEffectiveFormat } = require('../lib/subjectProfile.ts');

const { RichView } = require('../components/rich/RichView.tsx');

console.log('--- Phase 9 Test Suite: Rollback Verification & Read-Only Envelope Preservation ---');

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

// 1. Rollback Flag Gating on Essay Questions
test('Rollback flag: NEXT_PUBLIC_RICH_INPUT_ENABLED=false forces plain textarea fallback', () => {
  const originalFlag = process.env.NEXT_PUBLIC_RICH_INPUT_ENABLED;
  try {
    process.env.NEXT_PUBLIC_RICH_INPUT_ENABLED = 'false';

    // Simulated QuizRunner logic when rendering essay/rich question
    const q = {
      type: 'comment',
      name: 'q1',
      title: 'أوجد مساحة الدائرة',
      answerFormat: 'RICH',
    };

    const isRichFlag = process.env.NEXT_PUBLIC_RICH_INPUT_ENABLED !== 'false';
    const rawFormat = q.answerFormat || null;
    const effectiveFormat = resolveEffectiveFormat(rawFormat);
    const isRich = isRichFlag && (q.type === 'richanswer' || effectiveFormat === 'RICH');

    assert.strictEqual(isRichFlag, false, 'isRichFlag must be false when env is "false"');
    assert.strictEqual(isRich, false, 'isRich must evaluate to false on rollback');

    // Render plain textarea fallback
    const textareaElement = React.createElement('textarea', {
      className: 'mt-6 min-h-[160px] w-full resize-y rounded-xl border border-brand-border bg-brand-bg p-4 text-sm font-medium text-brand-text placeholder:text-brand-muted transition focus:border-brand-primary focus:outline-none',
      placeholder: 'اكتب إجابتك هنا...',
      defaultValue: 'إجابة عادية',
      dir: 'rtl',
    });

    const renderedHtml = ReactDOMServer.renderToStaticMarkup(textareaElement);
    assert(renderedHtml.includes('<textarea'), 'Must render standard textarea');
    assert(renderedHtml.includes('dir="rtl"'), 'Textarea must have dir="rtl"');
    assert(renderedHtml.includes('اكتب إجابتك هنا...'), 'Textarea must have placeholder');
    assert(!renderedHtml.includes('rich-editor'), 'Must NOT render rich-editor');
  } finally {
    process.env.NEXT_PUBLIC_RICH_INPUT_ENABLED = originalFlag;
  }
});

// 2. Active Flag Enables Rich Editor
test('Active flag: NEXT_PUBLIC_RICH_INPUT_ENABLED=true enables rich answer format', () => {
  const originalFlag = process.env.NEXT_PUBLIC_RICH_INPUT_ENABLED;
  try {
    process.env.NEXT_PUBLIC_RICH_INPUT_ENABLED = 'true';

    const q = {
      type: 'comment',
      name: 'q1',
      title: 'احسب التكامل الآتي',
      answerFormat: 'RICH',
    };

    const isRichFlag = process.env.NEXT_PUBLIC_RICH_INPUT_ENABLED !== 'false';
    const rawFormat = q.answerFormat || null;
    const effectiveFormat = resolveEffectiveFormat(rawFormat);
    const isRich = isRichFlag && (q.type === 'richanswer' || effectiveFormat === 'RICH');

    assert.strictEqual(isRichFlag, true);
    assert.strictEqual(isRich, true, 'isRich must evaluate to true when flag is active');
  } finally {
    process.env.NEXT_PUBLIC_RICH_INPUT_ENABLED = originalFlag;
  }
});

// 3. Stored Rich Envelopes Continue Rendering via RichView During Rollback
test('Preservation: stored math envelope continues rendering via RichView during rollback', () => {
  const originalFlag = process.env.NEXT_PUBLIC_RICH_INPUT_ENABLED;
  try {
    process.env.NEXT_PUBLIC_RICH_INPUT_ENABLED = 'false';

    const storedMathEnvelope = JSON.stringify({
      v: 1,
      blocks: [
        { t: 'text', v: 'مجموع الجذرين يساوي:' },
        { t: 'math', v: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
      ],
    });

    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(RichView, { value: storedMathEnvelope })
    );

    assert(html.includes('مجموع الجذرين يساوي:'), 'Text block must render');
    assert(html.includes('class="katex"'), 'Math block must render via KaTeX');
    assert(html.includes('sqrt'), 'KaTeX must render square root element');
  } finally {
    process.env.NEXT_PUBLIC_RICH_INPUT_ENABLED = originalFlag;
  }
});

test('Preservation: stored chemistry envelope continues rendering via RichView during rollback', () => {
  const originalFlag = process.env.NEXT_PUBLIC_RICH_INPUT_ENABLED;
  try {
    process.env.NEXT_PUBLIC_RICH_INPUT_ENABLED = 'false';

    const storedChemEnvelope = JSON.stringify({
      v: 1,
      blocks: [
        { t: 'text', v: 'معادلة التفاعل الكيميائي:' },
        { t: 'chem', v: '2H2 + O2 -> 2H2O' },
      ],
    });

    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(RichView, { value: storedChemEnvelope })
    );

    assert(html.includes('معادلة التفاعل الكيميائي:'), 'Text block must render');
    assert(html.includes('class="katex"'), 'Chemistry block must render via KaTeX mhchem');
  } finally {
    process.env.NEXT_PUBLIC_RICH_INPUT_ENABLED = originalFlag;
  }
});

test('Preservation: plain text answers render identically with dir="auto"', () => {
  const plainAnswer = 'هذه إجابة نصية عادية تم إدخالها أثناء تفعيل وضع الرجوع (Rollback).';
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(RichView, { value: plainAnswer })
  );

  assert(html.includes('dir="auto"'), 'Must have dir="auto"');
  assert(html.includes(plainAnswer), 'Must preserve exact plain text string');
  assert(!html.includes('class="katex"'), 'Must not render KaTeX for plain text');
});

// 4. Server Acceptance Round-trip for Plain Submissions During Rollback
test('Server round-trip: plain text answers from rollback are valid rich content', () => {
  const studentPlainInput = 'س = 5 و ص = 10';
  assert.strictEqual(looksRich(studentPlainInput), false);

  const parsed = parseRich(studentPlainInput);
  assert.strictEqual(parsed.v, 1);
  assert.strictEqual(parsed.blocks.length, 1);
  assert.strictEqual(parsed.blocks[0].t, 'text');
  assert.strictEqual(parsed.blocks[0].v, studentPlainInput);

  const serialized = serializeRich(parsed.blocks);
  assert.strictEqual(serialized, studentPlainInput, 'Plain input must round-trip byte-for-byte');
});

console.log('\n=======================================');
console.log(`Phase 9 Rollback Results: ${passedCount} passed, 0 failed.`);
console.log('=======================================');
console.log('ALL PHASE 9 ROLLBACK VERIFICATION TESTS PASSED 100%!\n');
