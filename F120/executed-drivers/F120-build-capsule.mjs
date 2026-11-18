import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F120');
const published = path.join(session, 'autoperf-published-results');
const destination = path.join(published, 'F120');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const forward = file => file.replaceAll('\\', '/');
assert.equal(fs.existsSync(destination), false, 'Preserve and inspect a partial capsule instead of overwriting it.');
assert.equal(read(path.join(run, 'diagnostic-budget.json')).permanentlyClosed, true);
assert.equal(read(path.join(run, 'source-publication.json')).actualRemoteRefVerified, true);
const audit = read(path.join(run, 'audit-summary.json'));
assert.equal(audit.actualDisposition, 'no-gain');
assert.equal(audit.actualRetainedSamples, 512);
assert.equal(audit.actualRuntimeRecordsChecked, 25);
const format = value => value.toFixed(3);
const results = [
  '# F120: every authorized attempt and complete comparison', '',
  'Three slots are consumed. Attempt1 failed before any WorkloadActual/WorkloadResult sample; it is not a completed pair.',
  'Attempts2/3 completed Candidate then Original / Original then Candidate with identical repaired common harness bytes.',
  'All16 predeclared method/profile cases and all512 retained samples remain. Positive less-time favors candidate.',
  'The median column combines the two paired percentages, not the ratio of separate median means.', '',
  '| Method | Full profile | Original ns/op (2 / 3) | Candidate ns/op (2 / 3) | Less-time % (2 / 3) | Median less-time % | Original B/op (2 / 3) | Candidate B/op (2 / 3) |',
  '|---|---|---:|---:|---:|---:|---:|---:|'
];
for (const item of audit.profileSummaries) {
  const rows = audit.paired.filter(row => row.method === item.method && row.profile === item.profile);
  results.push(`| ${item.method} | ${item.profile} | ${rows.map(row => format(row.original.meanNs)).join(' / ')} | ${rows.map(row => format(row.candidate.meanNs)).join(' / ')} | ${item.eachLessTimePercent.map(format).join(' / ')} | ${format(item.medianLessTimePercent)} | ${item.originalAllocatedBytes.join(' / ')} | ${item.candidateAllocatedBytes.join(' / ')} |`);
}
results.push('', '## Each source case, variability and retained trend', '',
  '| Attempt | Variant | Method | Profile | Mean ns | Sample SD ns | CV % | Median ns | B/op | Overhead N | Retained N | First4 mean ns | Last4 mean ns | Fitted end-to-end trend % |',
  '|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const row of audit.rows) results.push(
  `| ${row.attempt} | ${row.variant} | ${row.method} | ${row.profile} | ${format(row.meanNs)} | ${format(row.standardDeviationNs)} | ${format(row.cvPercent)} | ${format(row.medianNs)} | ${row.allocatedBytesPerOperation} | ${row.actualOverheadSamples} | 8 | ${format(row.firstHalfMeanNs)} | ${format(row.secondHalfMeanNs)} | ${format(row.fittedEndToEndTrendPercent)} |`);
results.push('', 'Every sample is recomputed as actual workload time minus the median of all adaptive overhead observations.',
  'Sample variance uses N-1; the raw GC numerator/operation denominator and BDN midpoint-to-even allocation rounding are independently checked.',
  'FullName gives untruncated method/profile identity; BDN0.13 shortens two ordinary-path display labels even in JSON Parameters.',
  'All comparisons are narrow prepared-collection observations on a shared machine, not application effects.', '',
  '## Actual raw records', '',
  'Attempt1: [consumed authorization](comparison-001/authorization.json), [failure](comparison-001/failure.json),',
  '[Original stdout](comparison-001/Original/stdout.txt), [Original stderr](comparison-001/Original/stderr.txt).',
  'Candidate was not launched. No WorkloadActual or WorkloadResult sample exists. The old fixture is retained separately.', '');
for (const attempt of [2, 3]) {
  const folder = 'comparison-' + String(attempt).padStart(3, '0');
  results.push(`Attempt${attempt}: [authorization](${folder}/authorization.json), [completion](${folder}/execution-receipt.json).`);
  for (const variant of read(path.join(run, folder, 'authorization.json')).order) results.push(
    `${variant}: [raw stdout](${folder}/${variant}/stdout.txt), [full JSON](${folder}/${variant}/reports/results/AutoPerf.CollectionBenchmarks-report-full.json), [exact command](${folder}/${variant}/command.json), [actual result](${folder}/${variant}/result.json).`);
  results.push('');
}
fs.writeFileSync(path.join(run, 'comparison-results.md'), results.join('\n').trimEnd() + '\n', { flag: 'wx' });
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    assert.equal(entry.isSymbolicLink(), false, `Do not follow a link: ${entry.name}`);
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}
const commands = [
  '# F120: exact commands and actual outcomes', '',
  'Activate the appropriate repository-local SDK before every dotnet invocation. Historical commands below did so explicitly.',
  'Managed builds use at most two workers, no shared compilation or node reuse; no host settings are changed.',
  'These are evidence paths, not permission to replay closed measurement authorizations.', '',
  '## Managed build, restore, format and characterization commands', '',
  '| Actual invocation | Result | Exact activated script | Raw stdout | Raw stderr |',
  '|---|---|---|---|---|'
];
for (const label of fs.readdirSync(path.join(run, 'validation')).sort()) {
  const folder = 'validation/' + label;
  const result = read(path.join(run, folder, 'result.json'));
  commands.push(`| ${label} | ${result.exitCode === 0 ? 'Passed; exit0' : 'Failed; exit' + result.exitCode} | [command](${folder}/command.ps1) | [stdout](${folder}/stdout.txt) | [stderr](${folder}/stderr.txt) |`);
}
commands.push('', 'Preparation failures are retained, not counted as successful tests or hidden retries.',
  'They include missing restore assets, an unreachable metadata feed, missing Hosting/Server dependency closure,',
  'the xUnit collection-assert analyzer and a Moq verification-order fixture defect.',
  'The final harness build005 has0warnings/0errors. A command-only NuGetAudit=false option follows the recorded metadata-feed failure; no configuration or SDK pin was edited.', '',
  '## Individual passing test rows and exact commands', '',
  '| Invocation | Passing rows | Focused preservation rows | Parsed XML | Independent audit |',
  '|---|---:|---:|---|---|');
const seal = read(path.join(run, 'premeasurement-validation.json'));
for (const item of seal.audits) commands.push(
  `| ${item.label} | ${item.actualRows} | ${item.actualPreservationRows} | [TRX](${item.trxPath}) | [row inventory](${item.auditPath}) |`);
commands.push('', 'These sum to135historical passing executions, not135unique tests. The seven new rows are green on unchanged source and candidate.',
  'Every Boolean theory row is separately named and checked; no semantic-bug red/green claim is made.', '');
for (const label of ['original-preservation-tests-002', 'candidate-core-tests-001', 'candidate-pages-tests-001', 'candidate-source-whitespace-001']) {
  const command = fs.readFileSync(path.join(run, 'validation', label, 'command.ps1'), 'utf8').trimEnd();
  commands.push('### ' + label + ' - passed', '', '```powershell', command, '```', '');
}
commands.push('The selected Pages class is PageInvokerProviderTest (not the longer filename). Nine rows pass; no compiled-page request is implied.', '',
  '## Timing authorizations', '',
  '| Attempt | Actual source execution | Result | Exact command record |',
  '|---:|---|---|---|',
  '| 1 | Original only | Failed before workload; slot consumed | [Original command](comparison-001/Original/command.json) |',
  '| 2 | Candidate then Original | All16cases/source;256retained samples | [Candidate](comparison-002/Candidate/command.json), [Original](comparison-002/Original/command.json) |',
  '| 3 | Original then Candidate | All16cases/source;256retained samples | [Original](comparison-003/Original/command.json), [Candidate](comparison-003/Candidate/command.json) |', '',
  'No timing follows permanent budget closure. Only common untimed setup was repaired after attempt1; no performance profiles/gates or candidate source were retuned.', '',
  '## Exact-input independent reconstruction', '',
  '| Invocation | Result | Exact argument record | Raw output |',
  '|---|---|---|---|');
for (const label of ['Restore', 'Build', 'Original-Characterize', 'Candidate-Characterize']) commands.push(
  `| ${label} | Passed; exit0; no timing | [command](reconstruction-paired-001/${label}/command.json) | [stdout](reconstruction-paired-001/${label}/stdout.txt), [stderr](reconstruction-paired-001/${label}/stderr.txt) |`);
commands.push('', 'Eight byte-exact inputs are restored/rebuilt against the existing source-built product graph.',
  'Both reconstructed328-file images hold measured owners and other dependencies fixed; only common harness DLL/PDB differ.',
  'Each variant passes48actual HTTP requests,16public contracts,six equality/enumeration contracts and eight lifecycles.',
  'No clean-machine framework rebuild, application throughput, full suite, packaging, browser or additional timing is claimed.', '',
  '## Portable audit', '', '```powershell', 'node .\\F120-verify.mjs . --require-seal', '```', '',
  'Requires Node and PowerShell7. Actual live and copied-capsule audit results are retained. The XML helper escapes non-ASCII names losslessly through Windows pipes.',
  'The initial arithmetic observer was corrected for BDN display-label abbreviation and console encoding; measured files and qualification gates were not changed.', '');
fs.writeFileSync(path.join(run, 'validation-commands.md'), commands.join('\n').trimEnd() + '\n', { flag: 'wx' });
const excludedPatterns = [
  'Any complete consumer-original/consumer-candidate/consumer-current-default directory at any retained epoch',
  'Any harness/bin, harness/obj, project/bin or project/obj build/restore directory'
];
const excluded = relative => /(^|\/)consumer-(original|candidate|current-default)(\/|$)/.test(relative)
  || /(^|\/)(harness|project)\/(bin|obj)(\/|$)/.test(relative);
const sourceFiles = files(run).sort();
for (const file of sourceFiles) {
  const relative = forward(path.relative(run, file));
  if (!excluded(relative)) assert.equal(/\.(dll|pdb|exe|so|dylib|nupkg)$/i.test(relative), false,
    'Inspect an unexpected compiled byte stream before copying: ' + relative);
}
const copied = [], omitted = [];
for (const file of sourceFiles) {
  const relative = forward(path.relative(run, file));
  const item = { path: relative, bytes: fs.statSync(file).size, sha256: sha(file) };
  if (excluded(relative)) {
    omitted.push(item);
    continue;
  }
  const to = path.join(destination, ...relative.split('/'));
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(file, to, fs.constants.COPYFILE_EXCL);
  assert.equal(sha(to), item.sha256);
  copied.push(item);
}
for (const name of fs.readdirSync(session).filter(file => /^F120-.*\.(mjs|ps1)$/.test(file)).sort()) {
  const from = path.join(session, name), to = path.join(destination, 'executed-drivers', name);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL);
  copied.push({ path: 'executed-drivers/' + name, bytes: fs.statSync(from).size, sha256: sha(from) });
}
fs.copyFileSync(path.join(published, 'F047', 'LICENSE.txt'), path.join(destination, 'LICENSE.txt'), fs.constants.COPYFILE_EXCL);
write(path.join(destination, 'authoritative-copies.json'), { candidate: 'F120',
  actualByteExactCopies: copied.length, actualSources: 'Case-owned actual run files and retained private drivers', files: copied });
write(path.join(destination, 'omitted-file-hashes.json'), { candidate: 'F120', actualOmittedFiles: omitted.length,
  actualExclusionRules: excludedPatterns, actualCompiledRestoreBytesPublished: false, files: omitted });
function auditCapsule(label, flags) {
  const args = [path.join(destination, 'F120-verify.mjs'), destination, ...flags];
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  fs.writeFileSync(path.join(run, label + '.stdout.txt'), result.stdout ?? '', { flag: 'wx' });
  fs.writeFileSync(path.join(run, label + '.stderr.txt'), result.stderr ?? '', { flag: 'wx' });
  write(path.join(run, label + '-command.json'), { executable: process.execPath, arguments: args,
    actualExitCode: result.status, actualAdditionalTiming: 0, actualLiveBinaryAudit: false });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}
auditCapsule('portable-capsule-audit', []);
for (const suffix of ['.stdout.txt', '.stderr.txt', '-command.json']) {
  const name = 'portable-capsule-audit' + suffix;
  fs.copyFileSync(path.join(run, name), path.join(destination, name), fs.constants.COPYFILE_EXCL);
}
const links = [];
for (const name of ['README.md', 'validation-commands.md', 'comparison-results.md', 'issue-template.md']) {
  const text = fs.readFileSync(path.join(destination, name), 'utf8');
  for (const match of text.matchAll(/(?<!!)\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(https?:|#|\{\{)/.test(target)) continue;
    const relative = decodeURIComponent(target.split('#')[0]);
    assert.equal(fs.existsSync(path.resolve(destination, path.dirname(name), ...relative.split('/'))), true,
      'Broken authored artifact link: ' + name + ' -> ' + target);
    links.push({ source: name, target, actualExists: true });
  }
}
write(path.join(destination, 'authored-link-audit.json'), {
  candidate: 'F120', actualCheckedLocalLinks: links.length, actualBrokenLocalLinks: 0,
  actualLateReceiptExternalLinkVerifiedOnlyAfterPublication: true, links
});
const material = files(destination).map(file => ({ path: forward(path.relative(destination, file)),
  bytes: fs.statSync(file).size, sha256: sha(file) })).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
write(path.join(destination, 'capsule-file-hashes.json'), { candidate: 'F120',
  actualSelfReferenceAndAdditiveReceiptExcluded: ['capsule-file-hashes.json', 'publication.json'], files: material });
auditCapsule('sealed-capsule-audit', ['--require-seal']);
write(path.join(run, 'capsule-preparation.json'), {
  candidate: 'F120', actualImmutableFilesIncludingSeal: material.length + 1,
  actualCopiedAuthoritativeFiles: copied.length, actualOmittedCompiledRestoreFiles: omitted.length,
  actualCopiedCapsuleAuditPassed: true, actualSealedCapsuleAuditPassed: true,
  actualBrokenAuthoredArtifactLinks: 0, actualCheckedAuthoredLocalLinks: links.length,
  actualHistoricalTimingRerun: false, actualCountersAdvanced: false, actualReportChanged: false
});
console.log(JSON.stringify(read(path.join(run, 'capsule-preparation.json')), null, 2));
