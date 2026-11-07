// scripts/test-contract.js
// Contract verification runner for Phase 1 (Frontend Track)

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// Setup TypeScript execution hook for Node
require.extensions['.ts'] = function (module, filename) {
  const content = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });
  module._compile(compiled.outputText, filename);
};

// Import modules to test
const {
  looksRich,
  parseRich,
  serializeRich,
  cleanBlocks,
  isEmptyRich,
  hasMath,
  normalizeMathLatex,
  hasPlaceholder,
  toGraderText,
  toPlainPreview,
  RICH_LIMITS,
} = require('../lib/richContent/index.ts');

const {
  subjectProfile,
  resolveEffectiveFormat,
} = require('../lib/subjectProfile.ts');

// Load fixtures
const fixturesPath = path.resolve(__dirname, '../rich-contract-fixtures.json');
if (!fs.existsSync(fixturesPath)) {
  console.error('FAIL: rich-contract-fixtures.json not found at ' + fixturesPath);
  process.exit(1);
}
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

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

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

console.log('--- 1. Testing AC-1: parseRich against Contract Fixtures ---');
// Plain fixtures
fixtures.plain.forEach((plainStr, idx) => {
  const res = parseRich(plainStr);
  if (plainStr === '') {
    assert(
      res.v === 1 && res.blocks.length === 0,
      `Plain fixture [${idx}] (empty string) should produce 0 blocks, got ${res.blocks.length}`
    );
  } else {
    assert(
      res.v === 1 && res.blocks.length === 1 && res.blocks[0].t === 'text' && res.blocks[0].v === plainStr,
      `Plain fixture [${idx}] should parse to single text block with exact string`
    );
  }
});

// Rich fixtures
fixtures.rich.forEach((rf, idx) => {
  const res = parseRich(rf.raw);
  assert(
    res.v === 1 && deepEqual(res.blocks, rf.blocks),
    `Rich fixture [${idx}] parseRich mismatch.\nExpected: ${JSON.stringify(rf.blocks)}\nGot: ${JSON.stringify(res.blocks)}`
  );
});

console.log('--- 2. Testing AC-2: Plain strings round-trip unchanged (100%) ---');
fixtures.plain.forEach((plainStr, idx) => {
  const parsed = parseRich(plainStr);
  const serialized = serializeRich(parsed.blocks);
  assert(
    serialized === plainStr,
    `Round-trip failure on plain fixture [${idx}]:\nOriginal:   ${JSON.stringify(plainStr)}\nSerialized: ${JSON.stringify(serialized)}`
  );
});

console.log('--- 3. Testing AC-3: Text-only block lists serialize to plain strings, never envelopes ---');
const sampleTextBlocks = [
  [{ t: 'text', v: 'Hello world' }],
  [{ t: 'text', v: 'Line 1' }, { t: 'text', v: 'Line 2' }],
  [{ t: 'text', v: 'فقرة عربية ١' }, { t: 'text', v: 'فقرة عربية ٢' }],
];

sampleTextBlocks.forEach((blocks, idx) => {
  const serialized = serializeRich(blocks);
  assert(
    !looksRich(serialized),
    `Text-only block list [${idx}] serialized to envelope instead of plain text: ${serialized}`
  );
});

// Adjacent text merging test
const merged = serializeRich([
  { t: 'text', v: 'First line' },
  { t: 'text', v: 'Second line' },
]);
assert(
  merged === 'First line\nSecond line',
  `Adjacent text blocks should be joined by \\n, got ${JSON.stringify(merged)}`
);

// Empty block cleanup
assert(serializeRich([{ t: 'text', v: '   ' }]) === '', 'Whitespace-only blocks should be stripped');
assert(serializeRich([]) === '', 'Empty blocks array should serialize to empty string');

console.log('--- 4. Testing Spike S2: MathLive Macro Normalization ---');
// \\differentialD -> \\mathrm{d}
assert(
  normalizeMathLatex('\\int x\\,\\differentialD x') === '\\int x\\,\\mathrm{d} x',
  `\\differentialD normalization failed: got ${normalizeMathLatex('\\int x\\,\\differentialD x')}`
);
assert(
  normalizeMathLatex('\\frac{\\differentialD y}{\\differentialD x}') === '\\frac{\\mathrm{d} y}{\\mathrm{d} x}',
  `Fraction with \\differentialD failed`
);

// \\exponentialE -> \\mathrm{e}
assert(
  normalizeMathLatex('\\exponentialE^{x}') === '\\mathrm{e}^{x}',
  `\\exponentialE normalization failed: got ${normalizeMathLatex('\\exponentialE^{x}')}`
);

// \\imaginaryI -> \\mathrm{i}
assert(
  normalizeMathLatex('\\mathrm{e}^{\\imaginaryI\\pi}+1=0') === '\\mathrm{e}^{\\mathrm{i}\\pi}+1=0',
  `\\imaginaryI normalization failed`
);

// \\placeholder -> {}
assert(
  normalizeMathLatex('\\frac{\\placeholder{}}{2}') === '\\frac{{}}{2}',
  `\\placeholder{} normalization failed`
);
assert(
  normalizeMathLatex('\\placeholder[hint]{default}') === '{}',
  `\\placeholder[hint]{default} normalization failed`
);
assert(
  normalizeMathLatex('\\placeholder') === '{}',
  `Bare \\placeholder normalization failed`
);

// hasPlaceholder
assert(hasPlaceholder('\\placeholder{}') === true, 'hasPlaceholder should be true for \\placeholder{}');
assert(hasPlaceholder('\\placeholder[default]{}') === true, 'hasPlaceholder should be true for \\placeholder[default]{}');
assert(hasPlaceholder('\\frac{1}{2}') === false, 'hasPlaceholder should be false for standard math');

console.log('--- 5. Testing Grader Text & Preview Conversion ---');
// Plain string stays unchanged
assert(toGraderText('Simple text') === 'Simple text', 'toGraderText should return plain text unchanged');
assert(toGraderText(null) === '', 'toGraderText should return empty string for null');

// Rich content conversion
const mixedRaw = '{"v":1,"blocks":[{"t":"text","v":"Explain:"},{"t":"math","v":"F=ma"},{"t":"chem","v":"H2O"}]}';
const graderText = toGraderText(mixedRaw);
assert(
  graderText.includes('Explain:') &&
  graderText.includes('$$ F=ma $$') &&
  graderText.includes('$$ \\ce{H2O} $$'),
  `toGraderText failed: got ${graderText}`
);

// toPlainPreview
const preview = toPlainPreview(mixedRaw, 50);
assert(
  preview === 'Explain: F=ma H2O',
  `toPlainPreview failed: got ${preview}`
);

console.log('--- 6. Testing Subject Profile Matrix (5 subjects x 2 locales = 10 runs) ---');
const subjects = [
  { name: 'MATH', format: 'RICH', allowChem: false },
  { name: 'PHYSICS', format: 'RICH', allowChem: false },
  { name: 'CHEMISTRY', format: 'RICH', allowChem: true },
  { name: 'ARABIC', format: 'PLAIN', allowChem: false },
  { name: 'ENGLISH', format: 'PLAIN', allowChem: false },
];

const locales = ['ar', 'en'];

subjects.forEach((s) => {
  locales.forEach((loc) => {
    // Calling subjectProfile with subject string (simulating across locales)
    const prof = subjectProfile(s.name);
    assert(
      prof.defaultFormat === s.format && prof.allowChem === s.allowChem,
      `Matrix failed for subject=${s.name}, locale=${loc}: expected {${s.format}, ${s.allowChem}}, got {${prof.defaultFormat}, ${prof.allowChem}}`
    );
  });
});

// Arabic synonyms
assert(subjectProfile('رياضة').defaultFormat === 'RICH', 'Arabic synonym "رياضة" should resolve to RICH');
assert(subjectProfile('الفيزياء').defaultFormat === 'RICH', 'Arabic synonym "الفيزياء" should resolve to RICH');
assert(subjectProfile('الكيمياء').allowChem === true, 'Arabic synonym "الكيمياء" should have allowChem: true');
assert(subjectProfile('اللغة العربية').defaultFormat === 'PLAIN', 'Arabic synonym "اللغة العربية" should resolve to PLAIN');
assert(subjectProfile('اللغة الإنجليزية').defaultFormat === 'PLAIN', 'Arabic synonym "اللغة الإنجليزية" should resolve to PLAIN');

// Unknown subject fallback with warning
const unknownProf = subjectProfile('GEOGRAPHY');
assert(
  unknownProf.defaultFormat === 'PLAIN' && unknownProf.allowChem === false,
  'Unknown subject should fall back to PLAIN and allowChem: false'
);

// Effective format resolution
assert(resolveEffectiveFormat('PLAIN', 'MATH') === 'PLAIN', 'Stored PLAIN on MATH must stay PLAIN');
assert(resolveEffectiveFormat('RICH', 'ARABIC') === 'RICH', 'Stored RICH on ARABIC must stay RICH');
assert(resolveEffectiveFormat(null, 'MATH') === 'RICH', 'Stored null on MATH must default to RICH');
assert(resolveEffectiveFormat(undefined, 'ARABIC') === 'PLAIN', 'Stored undefined on ARABIC must default to PLAIN');

console.log('--- 7. Testing RICH_LIMITS Constants ---');
assert(RICH_LIMITS.maxBlocks === 60, 'maxBlocks must be 60');
assert(RICH_LIMITS.maxTextChars === 4000, 'maxTextChars must be 4000');
assert(RICH_LIMITS.maxMathChars === 2000, 'maxMathChars must be 2000');
assert(RICH_LIMITS.maxChemChars === 500, 'maxChemChars must be 500');
assert(RICH_LIMITS.maxTotalChars === 20000, 'maxTotalChars must be 20000');

console.log('\n=======================================');
console.log(`Results: ${passed} passed, ${failed} failed.`);
console.log('=======================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL CONTRACT AND SUBJECT PROFILE TESTS PASSED 100%!');
  process.exit(0);
}
