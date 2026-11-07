// scripts/test-phase3.js
// Verification runner for Phase 3 Student Quiz Integration & Display Surfaces

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

// Import modules under test
const { isEmptyRich, serializeRich, parseRich } = require('../lib/richContent/index.ts');
const { resolveEffectiveFormat, subjectProfile } = require('../lib/subjectProfile.ts');
const { QuestionRichAnswerModel, registerRichAnswer, RICH_ANSWER_TYPE } = require('../components/rich/survey/richanswer.tsx');
const { RichView } = require('../components/rich/RichView.tsx');

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

console.log('--- Phase 3 Test Suite: Student Quiz Integration & Display Surfaces ---');

// 1. Required Question Semantics (Empty blocks must NOT satisfy isRequired)
console.log('1. Testing Required Question Semantics with isEmptyRich');
assert(isEmptyRich('') === true, 'Empty string is empty');
assert(isEmptyRich(null) === true, 'Null is empty');
assert(isEmptyRich(undefined) === true, 'Undefined is empty');
assert(isEmptyRich('{"v":1,"blocks":[]}') === true, 'Empty blocks envelope is empty');
assert(isEmptyRich('{"v":1,"blocks":[{"t":"text","v":""}]}') === true, 'Empty text block is empty');
assert(isEmptyRich('{"v":1,"blocks":[{"t":"text","v":"   "}]}') === true, 'Whitespace text block is empty');
assert(isEmptyRich('{"v":1,"blocks":[{"t":"math","v":""}]}') === true, 'Empty math block is empty');
assert(isEmptyRich('{"v":1,"blocks":[{"t":"math","v":"x^2"}]}') === false, 'Populated math block is NOT empty');
assert(isEmptyRich('{"v":1,"blocks":[{"t":"text","v":"إجابة"}]}') === false, 'Populated text block is NOT empty');

// Check isAnswered simulator matching QuizRunner logic
function simulateIsAnswered(v) {
  if (v === undefined || v === null || v === '') return false;
  if (typeof v === 'string' && isEmptyRich(v)) return false;
  return true;
}
assert(simulateIsAnswered('') === false, 'simulateIsAnswered: empty string -> false');
assert(simulateIsAnswered('   ') === false, 'simulateIsAnswered: whitespace string -> false');
assert(simulateIsAnswered('{"v":1,"blocks":[]}') === false, 'simulateIsAnswered: empty envelope -> false');
assert(simulateIsAnswered('{"v":1,"blocks":[{"t":"text","v":"  "}]}') === false, 'simulateIsAnswered: empty block -> false');
assert(simulateIsAnswered('إجابة الطالب') === true, 'simulateIsAnswered: plain text -> true');
assert(simulateIsAnswered('{"v":1,"blocks":[{"t":"math","v":"\\\\frac{1}{2}"}]}') === true, 'simulateIsAnswered: rich answer -> true');

// 2. SurveyJS QuestionRichAnswerModel
console.log('2. Testing SurveyJS QuestionRichAnswerModel');
registerRichAnswer();
const model = new QuestionRichAnswerModel('test_q');
assert(model.getType() === RICH_ANSWER_TYPE, `model.getType() must be "${RICH_ANSWER_TYPE}", got "${model.getType()}"`);

model.value = '';
assert(model.isEmpty() === true, 'Model with empty string must report isEmpty() === true');
model.value = '{"v":1,"blocks":[]}';
assert(model.isEmpty() === true, 'Model with empty envelope must report isEmpty() === true');
model.value = '{"v":1,"blocks":[{"t":"text","v":""}]}';
assert(model.isEmpty() === true, 'Model with empty block must report isEmpty() === true');
model.value = '{"v":1,"blocks":[{"t":"math","v":"x+y=1"}]}';
assert(model.isEmpty() === false, 'Model with valid equation must report isEmpty() === false');

// 3. Subject-Driven Format Selection & Rollback Flag
console.log('3. Testing Subject Profile and Format Selection');
// On MATH subject deployment (simulated):
assert(resolveEffectiveFormat(null, 'MATH') === 'RICH', 'MATH subject default format is RICH');
assert(resolveEffectiveFormat(undefined, 'MATH') === 'RICH', 'MATH subject undefined format is RICH');
// Explicit override:
assert(resolveEffectiveFormat('PLAIN', 'MATH') === 'PLAIN', 'Explicit PLAIN on MATH stays PLAIN');
assert(resolveEffectiveFormat('RICH', 'ARABIC') === 'RICH', 'Explicit RICH on ARABIC stays RICH');
// Non-math subjects default to PLAIN:
assert(resolveEffectiveFormat(null, 'ARABIC') === 'PLAIN', 'ARABIC default is PLAIN');
assert(resolveEffectiveFormat(null, 'ENGLISH') === 'PLAIN', 'ENGLISH default is PLAIN');
assert(resolveEffectiveFormat(null, 'الفيزياء') === 'RICH', 'Physics synonym resolves to RICH');
assert(resolveEffectiveFormat(null, 'الكيمياء') === 'RICH', 'Chemistry synonym resolves to RICH');
assert(subjectProfile('الكيمياء').allowChem === true, 'Chemistry allows chem blocks');
assert(subjectProfile('الرياضيات').allowChem === false, 'Math does not allow chem blocks');

// 4. PLAIN Question Preservation (Byte-for-byte serialization)
console.log('4. Testing PLAIN Question Byte-for-byte Preservation');
const legacyPlainAnswers = [
  'نص الإجابة باللغة العربية',
  'Line 1\nLine 2\nLine 3',
  '1234567890',
  'English explanation text.',
];

legacyPlainAnswers.forEach((answer, idx) => {
  const parsed = parseRich(answer);
  const serialized = serializeRich(parsed.blocks);
  assert(serialized === answer, `PLAIN answer [${idx}] must serialize byte-identical to original`);
});

// 5. RICH Question Round-trip & KaTeX Rendering
console.log('5. Testing RICH Question KaTeX Rendering');
const richAnswer = JSON.stringify({
  v: 1,
  blocks: [
    { t: 'text', v: 'المعادلة النهائية للسرعة:' },
    { t: 'math', v: 'v = v_0 + a t' },
  ],
});
const renderedHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(RichView, { value: richAnswer }));
assert(renderedHtml.includes('المعادلة النهائية للسرعة:'), 'Text portion rendered in RichView');
assert(renderedHtml.includes('katex'), 'KaTeX rendered math formula');
assert(renderedHtml.includes('dir="ltr"'), 'KaTeX formula has dir="ltr"');

// 6. Security Invariant: KaTeX trust: false
console.log('6. Testing KaTeX Security (trust: false, no script execution)');
const maliciousMath = JSON.stringify({
  v: 1,
  blocks: [
    { t: 'math', v: '\\href{javascript:alert(1)}{click}' },
  ],
});
const safeHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(RichView, { value: maliciousMath }));
assert(!safeHtml.includes('href='), 'Malicious commands must not produce executable href links');

console.log('\n=======================================');
console.log(`Phase 3 Results: ${passed} passed, ${failed} failed.`);
console.log('=======================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 3 STUDENT QUIZ & DISPLAY TESTS PASSED 100%!');
  process.exit(0);
}
