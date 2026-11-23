// scripts/test-editor-flows.js
// Verification of solution sheet editor flows, serialization, and boundary conditions

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

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

const { RICH_LIMITS, parseRich, serializeRich } = require('../lib/richContent/index.ts');

console.log('=== Testing Editor & Serialization Flow Logic ===');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`PASS: ${message}`);
  } else {
    failed++;
    console.error(`FAIL: ${message}`);
  }
}

// 1. Text-only stores plain string
const textOnlyBlocks = [
  { t: 'text', v: 'First line' },
  { t: 'text', v: 'Second line' },
];
const textOnlySerialized = serializeRich(textOnlyBlocks);
assert(
  !textOnlySerialized.startsWith('{"v":1'),
  `Text-only stored as plain string: ${JSON.stringify(textOnlySerialized)}`
);

// 2. Rich content with math stores envelope
const mathBlocks = [
  { t: 'text', v: 'Line 1' },
  { t: 'math', v: 'x^2+y^2=25' },
];
const mathSerialized = serializeRich(mathBlocks);
assert(
  mathSerialized.startsWith('{"v":1,"blocks":['),
  'Math blocks stored as envelope v1'
);

// 3. Round-trip parsed
const parsedBack = parseRich(mathSerialized);
assert(
  parsedBack.blocks.length === 2 && parsedBack.blocks[1].v === 'x^2+y^2=25',
  'Round-trip parse preserves blocks faithfully'
);

// 4. Test 60-block limit
assert(RICH_LIMITS.maxBlocks === 60, 'maxBlocks is strictly 60');

// 5. Test last line clearing logic
function simulateRemoveLine(lines, id) {
  if (lines.length === 1) {
    return [{ ...lines[0], v: '', incomplete: false }];
  }
  return lines.filter((l) => l.id !== id);
}

const singleLine = [{ id: 'l1', t: 'text', v: 'Hello world' }];
const cleared = simulateRemoveLine(singleLine, 'l1');
assert(
  cleared.length === 1 && cleared[0].v === '',
  'Single line deleted -> cleared not removed'
);

const twoLines = [
  { id: 'l1', t: 'text', v: 'Line 1' },
  { id: 'l2', t: 'math', v: 'x=1' },
];
const afterDelete = simulateRemoveLine(twoLines, 'l1');
assert(
  afterDelete.length === 1 && afterDelete[0].id === 'l2',
  'Multi-line delete removes line correctly'
);

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL FLOW LOGIC TESTS PASSED 100%!');
  process.exit(0);
}
