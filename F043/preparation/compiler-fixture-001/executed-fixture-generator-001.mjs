import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const runRoot = path.join(session, 'autoperf-runs', 'F043');
const harness = path.join(runRoot, 'harness');
function require(condition, message) {
  if (!condition) throw new Error(message);
}
function sha(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
}
const plan = JSON.parse(fs.readFileSync(path.join(runRoot, 'acceptance-plan.json'), 'utf8'));
const budget = JSON.parse(fs.readFileSync(path.join(runRoot, 'diagnostic-budget.json'), 'utf8'));
require(budget.consumed === 0 && !budget.closed, 'Fixture preparation must precede all timing.');
require(!fs.existsSync(path.join(harness, 'Views')) && !fs.existsSync(path.join(runRoot, 'compiled-fixture-inputs.json')),
  'Do not overwrite existing compiler fixture inputs.');
fs.mkdirSync(path.join(harness, 'Views'));
const fixtures = [];
for (const spec of plan.profiles) {
  const names = Array.from({ length: spec.count }, (_, index) => 'Section' + 'A'.repeat(spec.namePadding) + String(index).padStart(3, '0'));
  const content = '@inherits Microsoft.AspNetCore.Mvc.Razor.RazorPage<dynamic>\n'
    + names.map(name => `@section ${name}{<s>${name}</s>}`).join('');
  const relative = path.join('Views', spec.name + '.cshtml');
  fs.writeFileSync(path.join(harness, relative), content, { flag: 'wx' });
  fixtures.push({
    profile: spec.name, expectedCount: spec.count, names,
    path: relative, bytes: Buffer.byteLength(content), sha256: sha(Buffer.from(content)),
    expectedRegistrationOutput: '', expectedFullViewHtml: '<body/>' + names.map(name => `<s>${name}</s>`).join('')
  });
}
const toolchain = path.join(session, 'autoperf-published-results', 'F042', 'harness', 'SettingsPreservingEmitToolchain.cs');
const target = path.join(harness, 'SettingsPreservingEmitToolchain.cs');
require(!fs.existsSync(target), 'Never overwrite the common executor.');
fs.copyFileSync(toolchain, target, fs.constants.COPYFILE_EXCL);
fs.writeFileSync(path.join(runRoot, 'compiled-fixture-inputs.json'), JSON.stringify({
  candidate: 'F043', generatedAt: new Date().toISOString(),
  generator: 'F043-prepare-fixtures.mjs',
  generatorSha256: sha(fs.readFileSync(new URL(import.meta.url))),
  realRazorSectionDirectives: true, sourceCompilationRequired: true,
  copiedSettingsPreservingExecutorSha256: sha(fs.readFileSync(target)),
  fixtures
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ generatedCompiledSectionFixtures: fixtures.length, expectedSections: fixtures.map(item => item.expectedCount), timingConsumed: budget.consumed }, null, 2));
