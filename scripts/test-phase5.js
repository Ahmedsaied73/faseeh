// scripts/test-phase5.js
// Automated verification suite for Phase 5: Admin / Teacher Authoring (RichField & QuizAuthoringForm)

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const assert = require('assert');
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

const { RichField } = require('../components/rich/RichField.tsx');
const { buildPayload } = require('../components/admin/quiz/QuizAuthoringForm.tsx');
const { parseRich, serializeRich, tRich, richMessages } = require('../lib/richContent/index.ts');
const { resolveEffectiveFormat } = require('../lib/subjectProfile.ts');

console.log('--- Phase 5 Test Suite: Admin / Teacher Authoring & RichField ---');

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

// 1. RichField Component Rendering
test('RichField renders label, description, and preview toggle button', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(RichField, {
      label: 'نص السؤال التجريبي',
      value: 'ما هي مشتقة د(س) = س^2 ؟',
      onChange: () => {},
      description: 'اكتب نص السؤال بدقة',
      locale: 'ar',
    })
  );

  assert.ok(html.includes('نص السؤال التجريبي'), 'Label must be present in output');
  assert.ok(html.includes('اكتب نص السؤال بدقة'), 'Description must be present in output');
  assert.ok(html.includes(tRich('rich.previewAsStudent', 'ar')), 'Preview button must be present in output');
});

test('RichField renders explicit security note when provided', () => {
  const securityMsg = tRich('rich.modelAnswerSecurityNote', 'ar');
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(RichField, {
      label: 'الإجابة النموذجية',
      value: '{"v":1,"blocks":[{"t":"text","v":"الحل هو:"},{"t":"math","v":"2x"}]}',
      onChange: () => {},
      securityNote: securityMsg,
      locale: 'ar',
    })
  );

  assert.ok(html.includes('الإجابة النموذجية'), 'Label must be rendered');
  assert.ok(html.includes(securityMsg), 'Explicit security disclaimer must be rendered');
  assert.ok(html.includes('role="note"'), 'Accessible role=note should wrap security note');
});

// 2. QuizAuthoringForm buildPayload with Rich Content & 3-State AnswerFormat
test('QuizAuthoringForm buildPayload correctly formats rich question text and model answer', () => {
  const richQuestionTitle = JSON.stringify({
    v: 1,
    blocks: [
      { t: 'text', v: 'أوجد قيمة النهاية الآتية:' },
      { t: 'math', v: '\\lim_{x\\to 0}\\frac{\\sin x}{x}' },
    ],
  });

  const richModelAnswer = JSON.stringify({
    v: 1,
    blocks: [
      { t: 'text', v: 'باستخدام نظرية نهايات الدوال المثلثية:' },
      { t: 'math', v: '= 1' },
    ],
  });

  const mockQuestions = [
    {
      id: 'q1',
      type: 'comment',
      title: richQuestionTitle,
      points: '5',
      choices: [],
      correctChoiceId: '',
      modelAnswer: richModelAnswer,
      rubric: 'الخطوات = 3 درجات، الناتج النهائي = درجتان',
      aiEnabled: true,
      html: '',
      imageUrl: '',
      imagePreview: null,
      imageUploading: false,
      imageError: null,
      answerFormat: null, // Follow subject profile
    },
    {
      id: 'q2',
      type: 'comment',
      title: 'سؤال كيمياء معادل',
      points: '4',
      choices: [],
      correctChoiceId: '',
      modelAnswer: '2H2 + O2 -> 2H2O',
      rubric: 'المعادلة موزونة = 4 درجات',
      aiEnabled: false,
      html: '',
      imageUrl: '',
      imagePreview: null,
      imageUploading: false,
      imageError: null,
      answerFormat: 'RICH', // Explicit RICH
    },
    {
      id: 'q3',
      type: 'comment',
      title: 'اكتب موضوع تعبير عن القراءة',
      points: '10',
      choices: [],
      correctChoiceId: '',
      modelAnswer: 'القراءة غذاء الروح والعقل...',
      rubric: 'الأفكار = 5، السلامة اللغوية = 5',
      aiEnabled: false,
      html: '',
      imageUrl: '',
      imagePreview: null,
      imageUploading: false,
      imageError: null,
      answerFormat: 'PLAIN', // Explicit PLAIN
    },
  ];

  const payload = buildPayload('اختبار تجريبي', '3600', '60', mockQuestions);

  assert.strictEqual(payload.title, 'اختبار تجريبي');
  assert.strictEqual(payload.timeLimitSec, 3600);
  assert.strictEqual(payload.passingScore, 60);

  const elements = payload.surveyJson.pages[0].elements;
  assert.strictEqual(elements.length, 3);

  // Q1: Follow subject (answerFormat omitted or null)
  assert.strictEqual(elements[0].name, 'q1');
  assert.strictEqual(elements[0].title, richQuestionTitle);
  assert.strictEqual(elements[0].answerFormat, undefined);
  assert.strictEqual(payload.answerKey.q1.modelAnswer, richModelAnswer);
  assert.strictEqual(payload.answerKey.q1.answerFormat, undefined);

  // Q2: Explicit RICH
  assert.strictEqual(elements[1].name, 'q2');
  assert.strictEqual(elements[1].answerFormat, 'RICH');
  assert.strictEqual(payload.answerKey.q2.modelAnswer, '2H2 + O2 -> 2H2O');
  assert.strictEqual(payload.answerKey.q2.answerFormat, 'RICH');

  // Q3: Explicit PLAIN
  assert.strictEqual(elements[2].name, 'q3');
  assert.strictEqual(elements[2].answerFormat, 'PLAIN');
  assert.strictEqual(payload.answerKey.q3.answerFormat, 'PLAIN');
});

// 3. Security Invariant: Student-facing elements NEVER leak reference answer
test('Security Invariant AC-6: SurveyJson elements never contain modelAnswer or answerKey data', () => {
  const mockQuestions = [
    {
      id: 'q1',
      type: 'comment',
      title: 'ما هي صيغة الجاذبية لنيوتن؟',
      points: '5',
      choices: [],
      correctChoiceId: '',
      modelAnswer: 'F = G * (m1*m2)/r^2',
      rubric: '',
      aiEnabled: true,
      html: '',
      imageUrl: '',
      imagePreview: null,
      imageUploading: false,
      imageError: null,
      answerFormat: 'RICH',
    },
  ];

  const payload = buildPayload('اختبار فيزياء', '1800', '50', mockQuestions);
  const studentElements = payload.surveyJson.pages[0].elements;

  studentElements.forEach((el) => {
    assert.strictEqual(el.modelAnswer, undefined, 'Student survey element must NOT have modelAnswer');
    assert.strictEqual(el.correctValue, undefined, 'Student survey element must NOT have correctValue');
    assert.strictEqual(el.rubric, undefined, 'Student survey element must NOT have rubric');
  });

  // Verify answerKey is separated in payload for server use only
  assert.ok(payload.answerKey.q1.modelAnswer, 'Server answerKey stores the modelAnswer');
});

// 4. 3-State AnswerFormat Resolution
test('3-state answerFormat properly resolves with subject profiles', () => {
  // NULL follows subject
  assert.strictEqual(resolveEffectiveFormat(null, 'MATH'), 'RICH');
  assert.strictEqual(resolveEffectiveFormat(null, 'ARABIC'), 'PLAIN');
  assert.strictEqual(resolveEffectiveFormat(null, 'PHYSICS'), 'RICH');
  assert.strictEqual(resolveEffectiveFormat(null, 'ENGLISH'), 'PLAIN');

  // Explicit RICH overrides subject
  assert.strictEqual(resolveEffectiveFormat('RICH', 'ARABIC'), 'RICH');
  assert.strictEqual(resolveEffectiveFormat('RICH', 'ENGLISH'), 'RICH');

  // Explicit PLAIN overrides subject
  assert.strictEqual(resolveEffectiveFormat('PLAIN', 'MATH'), 'PLAIN');
  assert.strictEqual(resolveEffectiveFormat('PLAIN', 'PHYSICS'), 'PLAIN');
});

// 5. Serialization and Parse Round-Trip
test('Serialization and parsing of authored rich content round-trips correctly', () => {
  const originalBlocks = [
    { t: 'text', v: 'احسب التكامل الآتي:' },
    { t: 'math', v: '\\int_{0}^{1} x^{2}\\,dx' },
  ];

  const serialized = serializeRich(originalBlocks);
  const parsed = parseRich(serialized);

  assert.strictEqual(parsed.v, 1);
  assert.strictEqual(parsed.blocks.length, 2);
  assert.strictEqual(parsed.blocks[0].t, 'text');
  assert.strictEqual(parsed.blocks[0].v, 'احسب التكامل الآتي:');
  assert.strictEqual(parsed.blocks[1].t, 'math');
  assert.strictEqual(parsed.blocks[1].v, '\\int_{0}^{1} x^{2}\\,dx');
});

console.log(`\n=======================================`);
console.log(`Phase 5 Results: ${passedCount} passed, 0 failed.`);
console.log(`=======================================`);
console.log('ALL PHASE 5 ADMIN AUTHORING & RICHFIELD TESTS PASSED 100%!\n');
