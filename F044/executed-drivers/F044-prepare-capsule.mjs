import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
function replace(source, before, after) {
  assert.ok(source.includes(before), 'Missing exact preparation seam: ' + before);
  return source.replace(before, after);
}
let capsule = fs.readFileSync(path.join(session, 'F043-build-capsule.mjs'), 'utf8').replaceAll('F043', 'F044');
capsule = replace(capsule, "assert.equal(summary.disposition, 'no-gain');", "assert.equal(summary.disposition, 'qualified');");
const failedStart = capsule.indexOf("const failedIntake = ");
const failedEnd = capsule.indexOf("const format = ", failedStart);
assert.ok(failedStart > 0 && failedEnd > failedStart);
capsule = capsule.slice(0, failedStart) + capsule.slice(failedEnd);
const resultStart = capsule.indexOf("results.push('', 'The declared primary");
const resultEnd = capsule.indexOf('for (const row of summary.rows)', resultStart);
assert.ok(resultStart > 0 && resultEnd > resultStart);
capsule = capsule.slice(0, resultStart) + `results.push('', 'The declared primary is RegisterFreshPage/Two for actual SDK-compiled direct RazorPageBase content fixtures.',
  'Its numerical and predeclared control criteria pass: median10.22% less time, all three faster, unchanged704 B/op.',
  'This is not the ordinary RazorPage override. No uniform one-section, full-view or application win is claimed.',
  'Adverse results remain prominent: One registration median3.17% more time, including a40.06% individual regression;',
  'full-view Eight median6.74% more time, and full-view One median0.35% more time.',
  'Full-view Two median0.30% less time is not material. Shared-machine controls/variance and every sample are retained.', '',
  '## Every report row and its variability', '',
  '| Pair | Variant | Method | Profile | Mean ns | Sample SD ns | CV % | Median ns | B/op | Actual overhead N | Retained N |',
  '|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|');
` + capsule.slice(resultEnd);
const commandStart = capsule.indexOf("commands.push('', '## Passed owning tests'");
const commandEnd = capsule.indexOf("fs.writeFileSync(path.join(run, 'validation-commands.md')", commandStart);
assert.ok(commandStart > 0 && commandEnd > commandStart);
capsule = capsule.slice(0, commandStart) + `commands.push('', '## Passed owning tests', '',
  'Original and candidate each pass all59 RazorPageTest cases,0failed/0skipped.',
  'Each scripts/SCRIPTS row of DefineSection_BaseImplementationRejectsCaseInsensitiveDuplicateWithoutReplacingWriter is independently XML-parsed.',
  'The new Mock<RazorPageBase> CallBase rows target the base body; existing override coverage is adjacent, not real base-producer proof.',
  'This is green/green preservation, not bug-fix red/green.', '',
  'The actual original command is:', '', '\\\`\\\`\\\`powershell',
  "Set-Location -LiteralPath 'C:\\\\\\\\src\\\\\\\\aspnetcore'", '. .\\\\\\\\activate.ps1');
const test = read(path.join(run, 'validation', 'original-razor-page-tests-001', 'command.json'));
commands.push(\`& '\${test.executable}' \${test.arguments.map(argument => "'" + argument.replaceAll("'", "''") + "'").join(' ')}\`,
  '\\\`\\\`\\\`', '', 'Result:59passed,0failed,0skipped. Candidate uses the same class selection after an explicit passed owning-graph build.',
  '', '## Actual compiler and build boundaries', '',
  'default-managed-razor-build-001 passes on observed current default31c15331c03714b7a602e1817e65881474c29e2e,0warnings/errors.',
  'The original/candidate managed test-graph builds pass,0warnings/errors, as does common-harness-build-002.',
  'common-harness-build-001 fails CS0534 with21errors: the direct-base fixtures initially lacked three required abstract member implementations.',
  'Its actual13input files and initial fixture manifest are preserved in preparation/direct-base-compiler-001.',
  'Corrected fixture-only context hooks match real RazorPage no-ops; EnsureRenderedBodyOrSections explicitly rejects a layout role.',
  'No fixture overrides or copies DefineSection. Actual RazorPage layouts consume every registered section through actual RazorView and scoped pooled buffers.',
  'UseIisNativeAssets=false, BuildNodeJS=false and StaticWebAssetsEnabled=false intentionally exclude native IIS and JS/static assets.',
  'No full-repository, native IIS, packaging, browser or application pass is claimed.', '',
  '## Independent checks', '',
  'The arithmetic audit reconstructs all576 actual-minus-overhead observations, statistics, allocations and both XML inventories.',
  'Fresh project Restore and Build pass; both independently rebuilt consumers pass10contracts and12real registration/rendering boundaries without timing.',
  'The closed budget, measured images, shipping source/tests, manifests and unrelated reports remain unchanged.',
  'The final audit checks22runtime records and144per-benchmark settings records.', '',
  '[Source publication commands/results](source-publication-invocations.json) and [full audit](audit-summary.json).', '',
  '\\\`\\\`\\\`powershell', 'node .\\\\\\\\F044-verify.mjs . --require-seal', '\\\`\\\`\\\`');
` + capsule.slice(commandEnd);
capsule = replace(capsule, String.raw`C:\\\\src\\\\aspnetcore`, String.raw`C:\\src\\aspnetcore`);
capsule = replace(capsule, String.raw`.\\\\activate.ps1`, String.raw`.\\activate.ps1`);
capsule = replace(capsule, String.raw`.\\\\F044-verify.mjs`, String.raw`.\\F044-verify.mjs`);
fs.writeFileSync(path.join(session, 'F044-build-capsule.mjs'), capsule, { flag: 'wx' });
let publish = fs.readFileSync(path.join(session, 'F043-publish-evidence.mjs'), 'utf8').replaceAll('F043', 'F044');
publish = replace(publish, "const parent = '85edacfd32e2f43fbeb00778e2cfdc7203a856e4';",
  "const parent = '361851fa709b82a82e8f231c405beecd0265210f';");
publish = replace(publish, 'assert.equal(expectedPaths.length, 659);', 'assert.ok(expectedPaths.length > 500);');
publish = replace(publish, 'Record F044 Razor section primary control-inconclusive result',
  'Publish qualified F044 custom-base section registration evidence');
publish = replace(publish,
  'Publish the exact13-file Razor SDK/BenchmarkDotNet project, all three paired source comparisons and576retained observations, both59-row TRX inventories, actual current-default managed validation and independent untimed rebuild. Explicitly retain the raw numerical primary pass, unchanged-control movement, strong scaled secondary gains and every adverse outcome. Seal659files without creating a performance PR or advancing campaign counters.',
  'Publish the exact13-file Razor SDK/BenchmarkDotNet project, all three source comparisons and576retained observations, both59-row TRX inventories, actual current-default managed validation and independent rebuild. The explicitly custom-base primary uses10.22% median less time at unchanged704 B/op. Retain all one-section/full-view regressions and shared-machine uncertainty. No normal RazorPage, application-throughput or allocation-saving claim; counters and the fixed classified report remain unchanged.');
publish = replace(publish, "candidate: 'F044', disposition: 'no-gain', subtype: 'primary-control-inconclusive'",
  "candidate: 'F044', disposition: 'qualified', subtype: 'workload-dependent-custom-base-local-gain'");
fs.writeFileSync(path.join(session, 'F044-publish-evidence.mjs'), publish, { flag: 'wx' });
console.log('Prepared F044-specific capsule/results/validation text and evidence publisher without stale F043 dispositions.');
