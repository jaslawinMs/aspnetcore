import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F044');
const published = path.join(session, 'autoperf-published-results');
const destination = path.join(published, 'F044');
const forward = value => value.replaceAll('\\', '/');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    assert.equal(entry.isSymbolicLink(), false, 'Never traverse case-image links.');
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? files(full) : [full];
  });
}
assert.equal(fs.existsSync(destination), false, 'Inspect any partial capsule instead of replacing it.');
assert.equal(fs.existsSync(path.join(run, 'source-comparison.lock')), false);
assert.equal(read(path.join(run, 'diagnostic-budget.json')).closed, true);
const summary = read(path.join(run, 'audit-summary.json'));
assert.equal(summary.disposition, 'qualified');
assert.equal(summary.actualRetainedSamples, 576);
assert.equal(summary.actualRuntimeRecordsChecked, 22);
assert.equal(read(path.join(run, 'source-publication.json')).actualRemoteRefVerified, true);
const format = number => number.toFixed(2);
const results = [
  '# F044: every actual source comparison', '',
  'Positive less-time means the candidate is faster. All three comparisons use the same frozen candidate and byte-identical common harness.',
  'Every value is independently recomputed from all eight retained observations.',
  'The median column combines paired percentage effects, not a ratio of separately aggregated source means.', '',
  '| Method | Profile | Original ns/op by pair | Candidate ns/op by pair | Less-time % by pair | Median less-time % | Original B/op by pair | Candidate B/op by pair |',
  '|---|---|---:|---:|---:|---:|---:|---:|'
];
for (const item of summary.profileSummaries) {
  const rows = summary.paired.filter(row => row.method === item.method && row.profile === item.profile);
  results.push(`| ${item.method} | ${item.profile} | ${rows.map(row => format(row.original.meanNs)).join(' / ')} | ${rows.map(row => format(row.candidate.meanNs)).join(' / ')} | ${item.eachLessTimePercent.map(format).join(' / ')} | ${format(item.medianLessTimePercent)} | ${item.originalAllocatedBytes.join(' / ')} | ${item.candidateAllocatedBytes.join(' / ')} |`);
}
results.push('', 'The declared primary is RegisterFreshPage/Two for actual SDK-compiled direct RazorPageBase content fixtures.',
  'Its numerical and predeclared control criteria pass: median10.22% less time, all three faster, unchanged704 B/op.',
  'This is not the ordinary RazorPage override. No uniform one-section, full-view or application win is claimed.',
  'Adverse results remain prominent: One registration median3.17% more time, including a40.06% individual regression;',
  'full-view Eight median6.74% more time, and full-view One median0.35% more time.',
  'Full-view Two median0.30% less time is not material. Shared-machine controls/variance and every sample are retained.', '',
  '## Every report row and its variability', '',
  '| Pair | Variant | Method | Profile | Mean ns | Sample SD ns | CV % | Median ns | B/op | Actual overhead N | Retained N |',
  '|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|');
for (const row of summary.rows) {
  results.push(`| ${row.attempt} | ${row.variant} | ${row.method} | ${row.profile} | ${format(row.meanNs)} | ${format(row.standardDeviationNs)} | ${format(row.cvPercent)} | ${format(row.medianNs)} | ${row.allocatedBytesPerOperation} | ${row.actualOverheadSamples} | 8 |`);
}
results.push('', 'The audit uses all actually emitted adaptive overhead samples. It binds each complete FullName to its exact raw DisplayInfo,',
  'reconstructs actual-minus-median-overhead values and sample statistics, and checks midpoint-to-even allocation arithmetic.', '');
for (const attempt of [1, 2, 3]) {
  const folder = 'comparison-' + String(attempt).padStart(3, '0');
  results.push(`Pair ${attempt}: ${summary.actualSourceOrders[attempt - 1].join(' then ')}; [authorization](${folder}/authorization.json), [completion](${folder}/execution-receipt.json).`);
  for (const variant of ['Original', 'Candidate']) {
    results.push(`${variant}: [raw stdout](${folder}/${variant}/stdout.txt), [full JSON](${folder}/${variant}/reports/results/AutoPerf.SectionRegistrationBenchmarks-report-full.json), [arguments](${folder}/${variant}/command.json), [actual result](${folder}/${variant}/result.json).`);
  }
  results.push('');
}
fs.writeFileSync(path.join(run, 'comparison-results.md'), results.join('\n').trimEnd() + '\n', { flag: 'wx' });
const commands = [
  '# F044: actual commands and results', '',
  'Every managed invocation activates the reviewed repository-local .NET environment.',
  'Builds use at most two workers, no shared compilation or node reuse. No machine priority, affinity or power setting is changed.',
  'Historical absolute paths are observations, not a claim that frozen binaries or old private paths are published.', '',
  '| Boundary | Result | Exact arguments | Raw stdout | Raw stderr |',
  '|---|---|---|---|---|'
];
for (const file of files(run).filter(file => path.basename(file) === 'command.json').sort()) {
  const relative = forward(path.relative(run, file));
  const folder = path.posix.dirname(relative);
  const command = read(file);
  const companion = path.join(path.dirname(file), 'result.json');
  const code = fs.existsSync(companion) ? read(companion).exitCode : command.actualExitCode;
  assert.ok(Number.isInteger(code), 'Do not invent an actual command outcome: ' + relative);
  const stdout = path.join(path.dirname(file), 'stdout.txt');
  const stderr = path.join(path.dirname(file), 'stderr.txt');
  commands.push(`| ${folder} | ${code === 0 ? 'Passed' : 'Failed'}; exit ${code} | [arguments](${relative}) | ${fs.existsSync(stdout) ? `[stdout](${folder}/stdout.txt)` : 'Not captured'} | ${fs.existsSync(stderr) ? `[stderr](${folder}/stderr.txt)` : 'Not captured'} |`);
}
commands.push('', '## Passed owning tests', '',
  'Original and candidate each pass all59 RazorPageTest cases,0failed/0skipped.',
  'Each scripts/SCRIPTS row of DefineSection_BaseImplementationRejectsCaseInsensitiveDuplicateWithoutReplacingWriter is independently XML-parsed.',
  'The new Mock<RazorPageBase> CallBase rows target the base body; existing override coverage is adjacent, not real base-producer proof.',
  'This is green/green preservation, not bug-fix red/green.', '',
  'The actual original command is:', '', '\`\`\`powershell',
  "Set-Location -LiteralPath 'C:\\src\\aspnetcore'", '. .\\activate.ps1');
const test = read(path.join(run, 'validation', 'original-razor-page-tests-001', 'command.json'));
commands.push(`& '${test.executable}' ${test.arguments.map(argument => "'" + argument.replaceAll("'", "''") + "'").join(' ')}`,
  '\`\`\`', '', 'Result:59passed,0failed,0skipped. Candidate uses the same class selection after an explicit passed owning-graph build.',
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
  '\`\`\`powershell', 'node .\\F044-verify.mjs . --require-seal', '\`\`\`');
fs.writeFileSync(path.join(run, 'validation-commands.md'), commands.join('\n').trimEnd() + '\n', { flag: 'wx' });
const excludedRoots = [
  'consumer-original', 'consumer-candidate', 'consumer-current-default', 'harness/bin', 'harness/obj',
  'reproduction-paired-001/project/bin', 'reproduction-paired-001/project/obj',
  'reproduction-paired-001/consumer-original', 'reproduction-paired-001/consumer-candidate'
];
const excluded = relative => excludedRoots.some(prefix => relative === prefix || relative.startsWith(prefix + '/'));
const copied = [];
const omitted = [];
for (const file of files(run).sort()) {
  const relative = forward(path.relative(run, file));
  const item = { path: relative, bytes: fs.statSync(file).size, sha256: sha(file) };
  if (excluded(relative)) {
    omitted.push(item);
    continue;
  }
  assert.equal(/\.(dll|pdb|exe|so|dylib|nupkg)$/i.test(relative), false, 'Inspect unexpected compiled bytes: ' + relative);
  const target = path.join(destination, ...relative.split('/'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(file, target, fs.constants.COPYFILE_EXCL);
  assert.equal(sha(target), item.sha256);
  copied.push(item);
}
for (const name of fs.readdirSync(session).filter(name => /^F044-.*\.(mjs|ps1)$/.test(name)).sort()) {
  const from = path.join(session, name);
  const to = path.join(destination, 'executed-drivers', name);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL);
  copied.push({ path: 'executed-drivers/' + name, bytes: fs.statSync(from).size, sha256: sha(from) });
}
const license = path.join(published, 'F042', 'LICENSE.txt');
fs.copyFileSync(license, path.join(destination, 'LICENSE.txt'), fs.constants.COPYFILE_EXCL);
write(path.join(destination, 'omitted-file-hashes.json'), {
  candidate: 'F044', actualOmittedFiles: omitted.length, actualOnlyExcludedRoots: excludedRoots,
  actualCompiledRestoreBytesPublished: false, files: omitted
});
const audit = spawnSync(process.execPath, [path.join(destination, 'F044-verify.mjs'), destination],
  { encoding: 'utf8', windowsHide: true });
for (const [name, contents] of [['portable-capsule-audit.stdout.txt', audit.stdout], ['portable-capsule-audit.stderr.txt', audit.stderr]]) {
  fs.writeFileSync(path.join(run, name), contents ?? '', { flag: 'wx' });
  fs.copyFileSync(path.join(run, name), path.join(destination, name), fs.constants.COPYFILE_EXCL);
  copied.push({ path: name, bytes: fs.statSync(path.join(run, name)).size, sha256: sha(path.join(run, name)) });
}
assert.equal(audit.status, 0, audit.stderr || audit.stdout);
write(path.join(destination, 'portable-capsule-audit-command.json'), {
  executable: process.execPath, arguments: [path.join(destination, 'F044-verify.mjs'), destination],
  actualExitCode: audit.status, actualTimingRun: false, actualLiveBinaryAudit: false
});
write(path.join(destination, 'authoritative-copies.json'), {
  candidate: 'F044', actualByteExactCopies: copied.length,
  actualSources: 'Case-owned actual run files and recorded private drivers, excluding compiler/restored images',
  files: copied
});
const broken = [];
const late = [];
for (const name of ['README.md', 'comparison-results.md', 'validation-commands.md', 'issue-template.md']) {
  const markdown = fs.readFileSync(path.join(destination, name), 'utf8');
  assert.equal(markdown.includes('\uFFFD'), false, 'Do not publish replacement characters.');
  assert.equal(markdown.endsWith('\n\n'), false, 'Do not add generated EOF blank lines.');
  for (const match of markdown.matchAll(/(?<!!)\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^(https?:|mailto:|\{\{)/i.test(target)) continue;
    if (target === 'publication.json') {
      late.push({ document: name, target, reason: 'Intentionally additive receipt after immutable publication.' });
    } else if (target !== 'capsule-file-hashes.json' && !fs.existsSync(path.join(destination, ...target.split('/')))) {
      broken.push({ document: name, target });
    }
  }
}
assert.deepEqual(broken, []);
assert.equal(late.length, 1);
write(path.join(destination, 'authored-link-audit.json'), {
  candidate: 'F044', actualBrokenAuthoredArtifactLinks: broken.length,
  actualExplicitlyPlannedLateReceiptLinks: late, actualTemplatePlaceholdersAreNotPublishedIssueLinks: true
});
const material = files(destination).map(file => ({
  path: forward(path.relative(destination, file)), bytes: fs.statSync(file).size, sha256: sha(file)
})).sort((a, b) => a.path.localeCompare(b.path));
write(path.join(destination, 'capsule-file-hashes.json'), {
  candidate: 'F044', actualSelfReferenceExcluded: 'capsule-file-hashes.json', files: material
});
const sealed = spawnSync(process.execPath, [path.join(destination, 'F044-verify.mjs'), destination, '--require-seal'],
  { encoding: 'utf8', windowsHide: true });
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.stdout.txt'), sealed.stdout ?? '', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.stderr.txt'), sealed.stderr ?? '', { flag: 'wx' });
assert.equal(sealed.status, 0, sealed.stderr || sealed.stdout);
const record = {
  candidate: 'F044', actualImmutableFilesIncludingSeal: material.length + 1,
  actualCopiedAuthoritativeFiles: copied.length, actualOmittedCompiledRestoreFiles: omitted.length,
  actualSealedCapsuleAuditPassed: true, actualBrokenAuthoredArtifactLinks: 0,
  actualExplicitlyPlannedAdditiveReceiptLinks: 1, actualHistoricalTimingRerun: false,
  actualCountersAdvanced: false, actualReportChanged: false
};
write(path.join(run, 'capsule-preparation.json'), record);
console.log(JSON.stringify(record, null, 2));
