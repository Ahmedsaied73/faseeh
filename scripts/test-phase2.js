// scripts/test-phase2.js
// Verification runner for Phase 2 Shared Components

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
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

// Import RichView and richContent utilities
const { RichView } = require('../components/rich/RichView.tsx');
const { parseRich, serializeRich, looksRich, tRich } = require('../lib/richContent/index.ts');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

console.log('--- Phase 2 Test Suite: RichView & Shared Components ---');

// 1. Plain text rendering
console.log('1. Testing RichView renders plain text with dir="auto"');
const plainText = 'هذا نص عربي عادي بدون معادلات';
const plainHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(RichView, { value: plainText }));
assert(plainHtml.includes('dir="auto"'), 'RichView should render plain text with dir="auto"');
assert(plainHtml.includes(plainText), 'RichView should preserve original plain text content');
assert(!plainHtml.includes('class="katex"'), 'RichView should not render KaTeX for plain text');

// 2. Math envelope rendering with KaTeX
console.log('2. Testing RichView renders math equation via KaTeX');
const mathEnvelope = JSON.stringify({
  v: 1,
  blocks: [
    { t: 'text', v: 'احسب قيمة الكسر:' },
    { t: 'math', v: '\\frac{a+b}{c}' },
  ],
});
const mathHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(RichView, { value: mathEnvelope }));
assert(mathHtml.includes('احسب قيمة الكسر:'), 'Math envelope should render accompanying text block');
assert(mathHtml.includes('katex'), 'Math equation should be rendered into KaTeX HTML');
assert(mathHtml.includes('dir="ltr"'), 'Math block container should enforce dir="ltr"');

// 3. Chemical equation rendering via mhchem
console.log('3. Testing RichView renders chem block via mhchem');
const chemEnvelope = JSON.stringify({
  v: 1,
  blocks: [
    { t: 'chem', v: '2H2 + O2 -> 2H2O' },
  ],
});
const chemHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(RichView, { value: chemEnvelope }));
assert(chemHtml.includes('katex'), 'Chem equation should be rendered into KaTeX HTML');
assert(chemHtml.includes('dir="ltr"'), 'Chem block should enforce dir="ltr"');

// 4. Malformed envelope graceful fallback
console.log('4. Testing malformed envelope falls back to plain text');
const malformedRaw = '{"v":1,"blocks": [invalid json';
const malformedHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(RichView, { value: malformedRaw }));
assert(malformedHtml.includes('&quot;v&quot;:1') && malformedHtml.includes('[invalid json'), 'Malformed envelope should render as plain text fallback');
assert(!malformedHtml.includes('class="katex"'), 'Malformed envelope should not crash or call KaTeX');

// 5. Empty value rendering
console.log('5. Testing empty value handling');
const emptyHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(RichView, { value: '' }));
assert(emptyHtml === '', 'Empty value should produce empty HTML markup');
const nullHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(RichView, { value: null }));
assert(nullHtml === '', 'Null value should produce empty HTML markup');

// 6. Self-hosted fonts verification
console.log('6. Testing self-hosted MathLive font files exist');
const fontsDir = path.resolve(__dirname, '../public/mathlive/fonts');
assert(fs.existsSync(fontsDir), 'public/mathlive/fonts directory must exist');
const fontFiles = fs.existsSync(fontsDir) ? fs.readdirSync(fontsDir) : [];
assert(fontFiles.length >= 20, `public/mathlive/fonts must contain at least 20 font files, found ${fontFiles.length}`);
assert(fontFiles.includes('KaTeX_Main-Regular.woff2'), 'KaTeX_Main-Regular.woff2 font must be present');
assert(fontFiles.includes('KaTeX_Math-Italic.woff2'), 'KaTeX_Math-Italic.woff2 font must be present');

// 7. i18n keys test
console.log('7. Testing rich localization dictionary');
assert(tRich('rich.addText', 'ar') === 'إضافة نص', 'Arabic key rich.addText');
assert(tRich('rich.addText', 'en') === 'Add text', 'English key rich.addText');
assert(tRich('rich.incomplete', 'ar').length > 0, 'Arabic key rich.incomplete');
assert(tRich('rich.limitReached', 'ar').length > 0, 'Arabic key rich.limitReached');

console.log('\n=======================================');
console.log(`Phase 2 Results: ${passed} passed, ${failed} failed.`);
console.log('=======================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 2 SHARED COMPONENT TESTS PASSED 100%!');
  process.exit(0);
}
