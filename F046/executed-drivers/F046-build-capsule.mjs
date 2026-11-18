import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F046');
const published = path.join(session, 'autoperf-published-results');
const destination = path.join(published, 'F046');
const forward = value => value.replaceAll('\\', '/');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
    assert.equal(item.isSymbolicLink(), false, 'Do not traverse image links.');
    const file = path.join(directory, item.name);
    return item.isDirectory() ? files(file) : [file];
  });
}
assert.equal(fs.existsSync(destination), false, 'Inspect a previous or partial capsule rather than replacing it.');
assert.equal(fs.existsSync(path.join(run, 'source-comparison.lock')), false);
assert.equal(read(path.join(run, 'diagnostic-budget.json')).permanentlyClosed, true);
const summary = read(path.join(run, 'audit-summary.json'));
assert.equal(summary.actualDisposition, 'qualified');
assert.equal(summary.actualRetainedSamples, 576);
assert.equal(summary.actualRuntimeRecordsChecked, 22);
assert.equal(read(path.join(run, 'source-publication.json')).actualRemoteRefVerified, true);
const format = value => value.toFixed(2);
const results = [
  '# F046: every actual source comparison', '',
  'Positive less-time means the candidate takes less time. All three comparisons use the same frozen candidate and byte-identical common harness.',
  'Every statistic is independently recomputed from all eight retained observations.',
  'The median column aggregates paired percentage effects, not a ratio of separately aggregated source means.', '',
  '| Method | Profile | Original ns/op by pair | Candidate ns/op by pair | Less-time % by pair | Median less-time % | Original B/op by pair | Candidate B/op by pair |',
  '|---|---|---:|---:|---:|---:|---:|---:|'
];
for (const item of summary.profileSummaries) {
  const rows = summary.paired.filter(row => row.method === item.method && row.profile === item.profile);
  results.push(`| ${item.method} | ${item.profile} | ${rows.map(row => format(row.original.meanNs)).join(' / ')} | ${rows.map(row => format(row.candidate.meanNs)).join(' / ')} | ${item.eachLessTimePercent.map(format).join(' / ')} | ${format(item.medianLessTimePercent)} | ${item.originalAllocatedBytes.join(' / ')} | ${item.candidateAllocatedBytes.join(' / ')} |`);
}
results.push('', 'The declared primary is FreshNativeAppend/NoExisting: median 13.41% less time, all three pairs faster, unchanged 384 B/op.',
  'Its unchanged FreshPublicExtensionControl/NoExisting median effect is -0.96%; the primary exceeds it in all three pairs.',
  'This is a fresh real collection/setup/compiled-delegate/one-close-append/count suffix, not isolated Append or native/application throughput.', '',
  '**Noise and adverse results:** the unchanged KeepAlive extension control appears 27.44% faster in pair 2, exceeding the native KeepAlive secondary effect of 21.84%.',
  'The WrappedStore fallback has a 2.85% median apparent benefit but regresses 2.31% in pair 3; no fallback gain is claimed.',
  'The largest single-case CV is 13.46%. This is shared, non-isolated hardware and not formal statistical significance.', '',
  '## Every report row and its variability', '',
  '| Pair | Variant | Method | Profile | Mean ns | Sample SD ns | CV % | Median ns | B/op | Actual overhead N | Retained N |',
  '|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|');
for (const row of summary.rows) {
  results.push(`| ${row.attempt} | ${row.variant} | ${row.method} | ${row.profile} | ${format(row.meanNs)} | ${format(row.standardDeviationNs)} | ${format(row.cvPercent)} | ${format(row.medianNs)} | ${row.allocatedBytesPerOperation} | ${row.actualOverheadSamples} | 8 |`);
}
results.push('', 'The independent audit binds each complete FullName to its exact raw DisplayInfo, uses every actual adaptive overhead sample,',
  'reconstructs actual-minus-median-overhead results and sample statistics, and checks midpoint-to-even allocation arithmetic.', '');
for (const attempt of [1, 2, 3]) {
  const folder = 'comparison-' + String(attempt).padStart(3, '0');
  results.push(`Pair ${attempt}: ${summary.actualSourceOrders[attempt - 1].join(' then ')}; [authorization](${folder}/authorization.json), [completion](${folder}/execution-receipt.json).`);
  for (const variant of ['Original', 'Candidate']) {
    results.push(`${variant}: [raw stdout](${folder}/${variant}/stdout.txt), [full JSON](${folder}/${variant}/reports/results/AutoPerf.HeaderAppendBenchmarks-report-full.json), [arguments](${folder}/${variant}/command.json), [actual result](${folder}/${variant}/result.json).`);
  }
  results.push('');
}
fs.writeFileSync(path.join(run, 'comparison-results.md'), results.join('\n').trimEnd() + '\n', { flag: 'wx' });
const commands = [
  '# F046: exact executed commands and observed results', '',
  'Each managed invocation activates the reviewed checkout-local .NET environment.',
  'Builds use at most two workers, no shared compilation or node reuse. The timing executor preserves observed process/thread priority and affinity and requests no power-plan change.',
  'Historical absolute paths are measurements of this box, not published executable/package-cache locations.', '',
  '| Boundary | Result | Exact arguments | Raw stdout | Raw stderr |',
  '|---|---|---|---|---|'
];
for (const file of files(run).filter(file => path.basename(file) === 'command.json').sort()) {
  const relative = forward(path.relative(run, file));
  const folder = path.posix.dirname(relative);
  const command = read(file);
  const companion = path.join(path.dirname(file), 'result.json');
  const code = fs.existsSync(companion) ? read(companion).exitCode : command.actualExitCode;
  assert.ok(Number.isInteger(code), 'Do not invent a command outcome: ' + relative);
  commands.push(`| ${folder} | ${code === 0 ? 'Passed' : 'Failed'}; exit ${code} | [arguments](${relative}) | [stdout](${folder}/stdout.txt) | [stderr](${folder}/stderr.txt) |`);
}
commands.push('', '## Owning test selections', '',
  'Original and candidate each pass 10 new preservation unit rows and 5 existing native functional rows, with 0 failed/skipped.',
  'Every individual boolean theory row is independently parsed from the actual exported XML.',
  'Raw CR data stays in test bodies, not test names. This is green/green preservation, not semantic-bug red/green.', '');
const selections = [
  ['original-header-unit-tests-002', '10 passed; 0 failed/skipped.'],
  ['candidate-header-unit-tests-001', '10 passed; 0 failed/skipped.'],
  ['original-header-functional-tests-001', '5 passed; 0 failed/skipped.'],
  ['candidate-header-functional-tests-001', '5 passed; 0 failed/skipped.']
];
const quote = value => "'" + value.replaceAll("'", "''") + "'";
for (const [label, result] of selections) {
  const command = read(path.join(run, 'validation', label, 'command.json'));
  commands.push(`### ${label}`, '', '```powershell', `Set-Location -LiteralPath ${quote(command.cwd)}`, command.activation,
    `& ${quote(command.executable)} ${command.arguments.map(quote).join(' ')}`, '```', '', 'Observed result: ' + result, '');
}
const functional = read(path.join(run, 'original-functional-trx-audit.json')).actualRows;
commands.push('### Exact existing native functional identities', '');
for (const item of functional) {
  commands.push('- `' + item.name + '`');
}
commands.push('', '## Actual build and producer boundaries', '',
  'default-httpsys-functional-build-002 and default-iis-managed-build-002 pass on actual current default 31c15331c03714b7a602e1817e65881474c29e2e, with 0 warnings/errors.',
  'Original and candidate HTTP.sys functional/unit graphs and managed IIS owners pass, with 0 warnings/errors.',
  'The common nine-file project restore/build and exact-file whitespace verification pass.',
  'Default, Original, and Candidate each execute 20 shared-owner contracts, 12 fresh boundaries, and 6 real native HTTP.sys profiles.',
  'The actual compiled HTTP.sys owner has one ComputeHeaders call site to Append; the inspected IIS managed owner has zero references.',
  'Native IIS integration and throughput are not inferred from its managed shared-class checks.', '',
  '## Preserved preparation failures', '',
  '- default-httpsys-functional-build-001 and default-iis-managed-build-001 fail NETSDK1004 because restore assets were missing. Each actual restore and successful retry is retained.',
  '- original-header-unit-tests-001 has 7 passes/3 failures from incorrect fixture expectations, before shipping edits or timing. The old message embeds CR after 0x; Connection is not a restricted trailer. The corrected ten-row tests preserve the actual message, use restricted Content-Length, and pass on both sources.',
  '- Initial test inputs and all nine initial project inputs are preserved under preparation/contract-expectations-001; no shipping behavior was changed to satisfy those assumptions.', '',
  '## Independent checks', '',
  'The source/results audit reconstructs all 576 retained actual-minus-overhead observations, statistics, and allocations and parses all 30 passing XML rows.',
  'The byte-exact nine-file project is relocated, restored, and rebuilt; both independently rebuilt variants pass 20 contracts, 12 fresh boundaries, and 6 real native profiles without timing.',
  'Only the fresh common project DLL/PDB differs from its measured image. The closed budget, measured images, shipping source/tests, SDK/NuGet files, and unrelated reports remain unchanged.',
  'The full audit checks 22 runtime records and 144 per-benchmark settings records.', '',
  '[Source publication commands/results](source-publication-invocations.json), [full audit](audit-summary.json), [reconstruction receipt](reconstruction-paired-001/verified-reproduction.json).', '',
  '```powershell', 'node .\\F046-verify.mjs . --require-seal', '```', '',
  'No native IIS, JS/static-web-assets, packaging, full-repository, browser, or application-throughput pass is claimed.');
fs.writeFileSync(path.join(run, 'validation-commands.md'), commands.join('\n').trimEnd() + '\n', { flag: 'wx' });
const excludedRoots = [
  'consumer-original', 'consumer-candidate', 'consumer-current-default', 'harness/bin', 'harness/obj',
  'reconstruction-paired-001/project/bin', 'reconstruction-paired-001/project/obj',
  'reconstruction-paired-001/consumer-original', 'reconstruction-paired-001/consumer-candidate'
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
for (const name of fs.readdirSync(session).filter(name => /^F046-.*\.(mjs|ps1)$/.test(name)).sort()) {
  const source = path.join(session, name);
  const target = path.join(destination, 'executed-drivers', name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
  copied.push({ path: 'executed-drivers/' + name, bytes: fs.statSync(source).size, sha256: sha(source) });
}
fs.copyFileSync(path.join(published, 'F042', 'LICENSE.txt'), path.join(destination, 'LICENSE.txt'), fs.constants.COPYFILE_EXCL);
write(path.join(destination, 'omitted-file-hashes.json'), {
  candidate: 'F046', actualOmittedFiles: omitted.length, actualOnlyExcludedRoots: excludedRoots,
  actualCompiledRestoreBytesPublished: false, files: omitted
});
const audit = spawnSync(process.execPath, [path.join(destination, 'F046-verify.mjs'), destination],
  { encoding: 'utf8', windowsHide: true });
for (const [name, content] of [['portable-capsule-audit.stdout.txt', audit.stdout], ['portable-capsule-audit.stderr.txt', audit.stderr]]) {
  fs.writeFileSync(path.join(run, name), content ?? '', { flag: 'wx' });
  fs.copyFileSync(path.join(run, name), path.join(destination, name), fs.constants.COPYFILE_EXCL);
  copied.push({ path: name, bytes: fs.statSync(path.join(run, name)).size, sha256: sha(path.join(run, name)) });
}
assert.equal(audit.status, 0, audit.stderr || audit.stdout);
write(path.join(destination, 'portable-capsule-audit-command.json'), {
  executable: process.execPath, arguments: [path.join(destination, 'F046-verify.mjs'), destination],
  actualExitCode: audit.status, actualTimingRun: false, actualLiveBinaryAudit: false
});
write(path.join(destination, 'authoritative-copies.json'), {
  candidate: 'F046', actualByteExactCopies: copied.length,
  actualSources: 'Case-owned actual run files and recorded private drivers, excluding compiler/restored images',
  files: copied
});
const broken = [];
const late = [];
for (const name of ['README.md', 'comparison-results.md', 'validation-commands.md', 'issue-template.md']) {
  const markdown = fs.readFileSync(path.join(destination, name), 'utf8');
  assert.equal(markdown.includes('\uFFFD'), false);
  assert.equal(markdown.endsWith('\n\n'), false);
  for (const match of markdown.matchAll(/(?<!!)\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^(https?:|mailto:|\{\{)/i.test(target)) {
      continue;
    }
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
  candidate: 'F046', actualBrokenAuthoredArtifactLinks: 0, actualExplicitlyPlannedLateReceiptLinks: late,
  actualTemplatePlaceholdersAreNotPublishedIssueLinks: true
});
const material = files(destination).map(file => ({
  path: forward(path.relative(destination, file)), bytes: fs.statSync(file).size, sha256: sha(file)
})).sort((a, b) => a.path.localeCompare(b.path));
write(path.join(destination, 'capsule-file-hashes.json'), {
  candidate: 'F046', actualSelfReferenceExcluded: 'capsule-file-hashes.json', files: material
});
const sealed = spawnSync(process.execPath, [path.join(destination, 'F046-verify.mjs'), destination, '--require-seal'],
  { encoding: 'utf8', windowsHide: true });
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.stdout.txt'), sealed.stdout ?? '', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.stderr.txt'), sealed.stderr ?? '', { flag: 'wx' });
assert.equal(sealed.status, 0, sealed.stderr || sealed.stdout);
const receipt = {
  candidate: 'F046', actualImmutableFilesIncludingSeal: material.length + 1,
  actualCopiedAuthoritativeFiles: copied.length, actualOmittedCompiledRestoreFiles: omitted.length,
  actualSealedCapsuleAuditPassed: true, actualBrokenAuthoredArtifactLinks: 0,
  actualExplicitlyPlannedAdditiveReceiptLinks: 1, actualHistoricalTimingRerun: false,
  actualCountersAdvanced: false, actualReportChanged: false
};
write(path.join(run, 'capsule-preparation.json'), receipt);
console.log(JSON.stringify(receipt, null, 2));
