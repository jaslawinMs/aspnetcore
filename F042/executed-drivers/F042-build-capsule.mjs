import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F042');
const published = path.join(session, 'autoperf-published-results'), destination = path.join(published, 'F042');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const forward = file => file.replaceAll('\\', '/');
assert.equal(fs.existsSync(destination), false, 'Inspect any partial capsule instead of overwriting it.');
assert.equal(read(path.join(run, 'diagnostic-budget.json')).closed, true);
assert.equal(read(path.join(run, 'source-publication.json')).actualRemoteRefVerified, true);
const summary = read(path.join(run, 'audit-summary.json'));
assert.equal(summary.disposition, 'no-gain');
const format = value => value.toFixed(2);
const results = [
  '# F042: every actual source comparison',
  '',
  'All three comparisons use the same frozen candidate and identical measured harness bytes.',
  'Positive less-time means candidate faster. Each value is independently recomputed from all eight retained observations.',
  'The median column combines the three paired percentages, not the ratio of separate median means.',
  '',
  '| Count | Full profile | Original ns/op by comparison | Candidate ns/op by comparison | Less-time % by comparison | Median less-time % | Original B/op by comparison | Candidate B/op by comparison |',
  '|---:|---|---:|---:|---:|---:|---:|---:|'
];
for (const item of summary.profileSummaries) {
  const rows = summary.paired.filter(row => row.count === item.count && row.profile === item.profile);
  results.push(`| ${item.count} | ${item.profile} | ${rows.map(row => format(row.original.meanNs)).join(' / ')} | ${rows.map(row => format(row.candidate.meanNs)).join(' / ')} | ${item.eachLessTimePercent.map(format).join(' / ')} | ${format(item.medianLessTimePercent)} | ${item.originalAllocatedBytes.join(' / ')} | ${item.candidateAllocatedBytes.join(' / ')} |`);
}
results.push('', '## Each report row, variability and exact raw links', '',
  '| Pair | Variant | Count | Full profile | Mean ns | Sample SD ns | CV % | Median ns | B/op | Actual overhead N | Retained result N |',
  '|---:|---|---:|---|---:|---:|---:|---:|---:|---:|---:|');
for (const row of summary.rows) results.push(
  `| ${row.attempt} | ${row.variant} | ${row.count} | ${row.profile} | ${format(row.meanNs)} | ${format(row.standardDeviationNs)} | ${format(row.cvPercent)} | ${format(row.medianNs)} | ${row.allocatedBytesPerOperation} | ${row.actualOverheadSamples} | 8 |`);
results.push('', 'Overhead is BDN-adaptive; the audit uses every actually emitted overhead sample and its median correction.',
  'BDN0.13 abbreviates long string values even in JSON Parameters. Identity comes from untruncated FullName,',
  'uniquely bound to the exact raw DisplayInfo; no profile is guessed from a truncated label.', '');
for (const attempt of [1, 2, 3]) {
  const folder = `comparison-${String(attempt).padStart(3, '0')}`;
  results.push(`Pair${attempt}: ${summary.actualSourceOrders[attempt - 1].join(' then ')}; [authorization](${folder}/authorization.json), [actual completion receipt](${folder}/execution-receipt.json).`);
  for (const variant of ['Original', 'Candidate']) results.push(
    `${variant}: [raw stdout](${folder}/${variant}/stdout.txt), [full JSON](${folder}/${variant}/reports/results/AutoPerf.DictionaryReplaceBenchmarks-report-full.json), [exact command/result](${folder}/${variant}/command.json).`);
  results.push('');
}
fs.writeFileSync(path.join(run, 'comparison-results.md'), results.join('\n') + '\n', { flag: 'wx' });
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    assert.equal(entry.isSymbolicLink(), false, `Do not follow a link: ${entry.name}`);
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}
const commands = [
  '# F042: actual commands and results',
  '',
  'Managed commands use the activated repository-local .NET SDK, at most two MSBuild workers, no shared compilation or node reuse.',
  'Every row below links the exact recorded argument array, working directory, timestamps and actual exit/launch result.',
  'Historical absolute paths are evidence, not copy/paste replay permission.',
  '',
  '| Boundary | Result | Exact command record | Raw stdout | Raw stderr |',
  '|---|---|---|---|---|'
];
const commandFiles = files(run).filter(file => path.basename(file) === 'command.json')
  .filter(file => !forward(path.relative(run, file)).includes('/consumer'));
for (const file of commandFiles.sort()) {
  const relative = forward(path.relative(run, file)), folder = path.posix.dirname(relative), record = read(file);
  const result = record.actualExitCode === undefined
    ? `Did not launch: ${record.actualLaunchFailure}`
    : record.actualExitCode === 0 ? 'Passed; exit0' : `Failed; exit${record.actualExitCode}`;
  commands.push(`| ${folder} | ${result.replaceAll('|', '\\|')} | [arguments](${relative}) | [stdout](${folder}/stdout.txt) | [stderr](${folder}/stderr.txt) |`);
}
commands.push('', '## Successful tests and formatting', '',
  'The original and candidate each pass34selected tests,0failed,0skipped.',
  'The identical filter combines DictionaryAdapterTest, IntegrationTests.DictionaryTest and DictionaryReplaceTest.',
  'All five new execution identities, including clear:False and clear:True, are individually XML-parsed by F042-audit-trx.ps1.',
  'The full selected command is reproduced below from the actual original record:', '', '```powershell');
const testCommand = read(path.join(run, 'validation', 'original-dictionary-tests-001', 'command.json'));
commands.push(`& '${testCommand.executable}' ${testCommand.arguments.map(value => `'${value.replaceAll("'", "''")}'`).join(' ')}`,
  '```', '', 'Result:34passed,0failed,0skipped; the candidate command has the same filter and its own retained output/TRX.',
  'The supported two-file whitespace002 command passes; unsupported whitespace001 is explicitly retained as failed.',
  '', '## Independent arithmetic and runnable-project verification', '',
  'Arithmetic audit001 failed a simple-name/root-DLL assumption;002 failed a fixed20overhead-samples assumption.',
  'Their exact source versions and stderr remain. Corrected003 passes all576samples, allocations and both XML inventories.',
  'Fresh project Restore and Build pass; Original-CharacterizeRun and Candidate-CharacterizeRun each pass16cases and12lifecycles.',
  'No test is relabeled as bug-fix red/green, no whole repository/default suite or extra timing is claimed.', '',
  '```powershell', 'node .\\F042-verify.mjs . --require-seal', '```', '',
  'Portable audit requires Node and PowerShell7. The copied-capsule passing output is retained separately.',
  'Source publication commands/results are in [source-publication-invocations.json](source-publication-invocations.json).');
fs.writeFileSync(path.join(run, 'validation-commands.md'), commands.join('\n') + '\n', { flag: 'wx' });
const excludedRoots = [
  'consumer-original', 'consumer-candidate', 'default-validation/consumer',
  'harness/bin', 'harness/obj', 'reproduction-paired-001/project/bin', 'reproduction-paired-001/project/obj',
  'reproduction-paired-001/consumer-original', 'reproduction-paired-001/consumer-candidate'
];
const excluded = relative => excludedRoots.some(prefix => relative === prefix || relative.startsWith(prefix + '/'));
const copied = [], omitted = [];
for (const file of files(run).sort()) {
  const relative = forward(path.relative(run, file));
  const item = { path: relative, bytes: fs.statSync(file).size, sha256: sha(file) };
  if (excluded(relative)) {
    omitted.push(item);
    continue;
  }
  assert.equal(/\.(dll|pdb|exe|so|dylib|nupkg)$/i.test(relative), false, `Inspect any unexpected compiled bytes: ${relative}`);
  const to = path.join(destination, ...relative.split('/'));
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(file, to, fs.constants.COPYFILE_EXCL);
  assert.equal(sha(to), item.sha256);
  copied.push(item);
}
const drivers = fs.readdirSync(session).filter(file => /^F042-.*\.(mjs|ps1)$/.test(file)).sort();
for (const name of drivers) {
  const from = path.join(session, name), to = path.join(destination, 'executed-drivers', name);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL);
  copied.push({ path: `executed-drivers/${name}`, bytes: fs.statSync(from).size, sha256: sha(from) });
}
fs.copyFileSync(path.join(published, 'F041', 'LICENSE.txt'), path.join(destination, 'LICENSE.txt'), fs.constants.COPYFILE_EXCL);
write(path.join(destination, 'authoritative-copies.json'), { candidate: 'F042',
  actualByteExactCopies: copied.length, actualSources: 'Case-owned actual run files and recorded private drivers',
  files: copied });
write(path.join(destination, 'omitted-file-hashes.json'), { candidate: 'F042', actualOmittedFiles: omitted.length,
  actualOnlyExcludedRoots: excludedRoots, actualCompiledRestoreBytesPublished: false, files: omitted });
const audit = spawnSync(process.execPath, [path.join(destination, 'F042-verify.mjs'), destination],
  { encoding: 'utf8', windowsHide: true });
fs.writeFileSync(path.join(run, 'portable-capsule-audit.stdout.txt'), audit.stdout);
fs.writeFileSync(path.join(run, 'portable-capsule-audit.stderr.txt'), audit.stderr);
write(path.join(run, 'portable-capsule-audit-command.json'), { executable: process.execPath,
  arguments: [path.join(destination, 'F042-verify.mjs'), destination], actualExitCode: audit.status,
  actualTimingRun: false, actualLiveBinaryAudit: false });
assert.equal(audit.status, 0, audit.stderr || audit.stdout);
for (const name of ['portable-capsule-audit.stdout.txt', 'portable-capsule-audit.stderr.txt', 'portable-capsule-audit-command.json'])
  fs.copyFileSync(path.join(run, name), path.join(destination, name), fs.constants.COPYFILE_EXCL);
const material = files(destination).map(file => ({ path: forward(path.relative(destination, file)),
  bytes: fs.statSync(file).size, sha256: sha(file) })).sort((a, b) => a.path.localeCompare(b.path));
write(path.join(destination, 'capsule-file-hashes.json'), { candidate: 'F042',
  actualSelfReferenceExcluded: 'capsule-file-hashes.json', files: material });
write(path.join(run, 'capsule-preparation.json'), { candidate: 'F042', actualImmutableFilesIncludingSeal: material.length + 1,
  actualCopiedAuthoritativeFiles: copied.length, actualOmittedCompiledRestoreFiles: omitted.length,
  actualCopiedCapsuleAuditPassed: true, actualHistoricalTimingRerun: false,
  actualCountersAdvanced: false, actualReportChanged: false });
console.log(JSON.stringify(read(path.join(run, 'capsule-preparation.json')), null, 2));
