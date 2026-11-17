import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F012');
const source = fs.readFileSync(path.join(session, 'F011-reproduce-analysis.mjs'));
let text = source.toString('utf8').replaceAll('\r\n', '\n').replaceAll('F011', 'F012');
const changes = [];
function edit(before, after, expected = 1) {
  const count = text.split(before).length - 1;
  assert.equal(count, expected, 'Audit adaptation seam: ' + before);
  text = text.replaceAll(before, after);
  changes.push({ before, after, actualOccurrences: count });
}
edit('autoperf/F012-signalr-group-exclusions', 'autoperf/F012-signalr-broadcast-exclusions');
edit('equal(investigation.sources.length, 21);', 'equal(investigation.sources.length, 20);');
edit("assert(!ownerPatch.includes('SendGroupExceptAsync'));",
  "assert(!/^[+-](?![+-]).*SendAllExceptAsync/m.test(ownerPatch));");
for (const [before, after] of [
  ['NoGroup512', 'NoConnections512'], ['G32', 'C32'], ['G128', 'C128'],
  ['GroupScopeCaseAndDuplicates', 'BroadcastScopeCaseAndDuplicates'],
  ['MissingGroupDoesNotReadInput', 'EmptyConnectionStoreDoesNotReadInput'],
  ['RepeatedMissEnumerationG', 'RepeatedMissEnumerationC'], ['groupSize', 'connectionCount'],
  ['GroupSendBenchmarks', 'BroadcastSendBenchmarks'],
]) {
  const count = text.split(before).length - 1;
  assert(count > 0);
  text = text.replaceAll(before, after);
  changes.push({ before, after, actualOccurrences: count });
}
edit("delivery(value, ['CONNECTION', 'Connection']);", "delivery(value, ['CONNECTION', 'Connection', 'outside']);");
edit("if (name === 'EmptyConnectionStoreDoesNotReadInput') {\n    equal(value.inputReads, 0);",
  "if (name === 'EmptyConnectionStoreDoesNotReadInput') {\n    equal(value.argumentGetterReads, 0);\n    equal(value.actual.connections.length, 0);\n    equal(value.inputReads, 0);");
edit("const expectedSize = data.shape === 'OneEmpty' ? 1",
  "const expectedSize = data.shape === 'NoConnections512' ? 0 : data.shape === 'OneEmpty' ? 1");
edit('equal([actuals, retained, warmups, overheads], [96, 87, 36, 227]);',
  'equal([actuals, warmups], [96, 36]);\nassert(retained >= 60 && retained <= 96 && overheads > 0);');
edit('  [96, 87, 36, 227]);', '  [actuals, retained, warmups, overheads]);');
const start = text.indexOf("equal(json('investigation-attempts/attempt-001/observed-failure.json')");
const end = text.indexOf('\nif (live) {', start);
assert(start >= 0 && end > start);
const replacement = `equal(json('investigation-execution/observed-failure.json').actualExitCode, 1);
equal(json('investigation-execution-attempt-002/execution.json').actualExitCode, 0);
const preparation = json('preparation-attempts/attempt-001/execution.json');
equal([preparation.candidate, preparation.newOwningTestRuns, preparation.commands.length], ['F012', 0, 4]);
assert(preparation.commands.every(command => command.actualExitCode === 0));
equal(json('tests/original/execution.json').candidate, 'F011');
assert(json('tests/original/execution.json').commands.every(command => command.actualExitCode === 0));
const reused = json('tests/original/borrowed-evidence-provenance.json');
equal([reused.candidate, reused.actualNewOwningTestRuns, reused.actualPriorOriginalRowsReused,
  reused.newBroadcastProducerObservationsRequired, reused.priorGroupObservationsOrTimingReused],
  ['F012', 0, 27, true, false]);
equal(reused.originalTestAuditSha256, sha(fs.readFileSync(file('tests/original/actual-test-audit.json'))));
equal(reused.originalTrxSha256, sha(fs.readFileSync(file('tests/original/owning-original.trx'))));
equal(test.candidate, 'F011');
equal(test.testAssemblySha256, testedCapture.files.find(row => row.name === 'Microsoft.AspNetCore.SignalR.Tests.dll').sha256);
equal(test.testPdbSha256, testedCapture.files.find(row => row.name === 'Microsoft.AspNetCore.SignalR.Tests.pdb').sha256);
const borrowed = json('preparation-attempts/attempt-001/borrowed-current-producer.json');
const priorManifest = json('preparation-attempts/attempt-001/borrowed-manifest-captured-default-json.json');
equal(borrowed.priorManifestSha256,
  sha(fs.readFileSync(file('preparation-attempts/attempt-001/borrowed-manifest-captured-default-json.json'))));
equal([borrowed.actualDefaultRevisionUnchanged, borrowed.currentDefault, borrowed.newProducerBuildClaimed,
  borrowed.repositoryOutputsModified, borrowed.f012ActualBroadcastCharacterizationRequired,
  borrowed.priorF011GroupResultsReusedAsBroadcastProof], [true, investigation.currentDefault, false, false, true, false]);
equal([priorManifest.candidate, priorManifest.capturedDefaultSourceRevision], ['F011', investigation.currentDefault]);
equal(borrowed.files.length, 2);
for (const row of borrowed.files) {
  equal(row.sha256, physical(current, row.name).sha256);
  equal(row.sha256, physical(priorManifest, row.name).sha256);
}
const oldBuild = json('preparation-attempts/attempt-001/borrowed-producer-build-execution.json');
equal(oldBuild.candidate, 'F011');
assert(oldBuild.commands.every(command => command.actualExitCode === 0));
const scaffold = json('scaffold-provenance.json');
equal([scaffold.candidate, scaffold.files.length, scaffold.actualBroadcastEntryPoints], ['F012', 6, 2]);
for (const row of scaffold.files) {
  equal(row.resultSha256, sha(fs.readFileSync(file('sources/original/' + row.destination))));
}
equal(json('investigation/open-exact-symbol-pr-search.json'), []);
const history = json('investigation/owner-history.json');
assert(Array.isArray(history) && history.length > 0 && history.length <= 5);
const restored = json('preparation-attempts/attempt-001/original-repository-json-outputs-unchanged.json');
equal(restored.length, 2);
for (const row of restored) {
  equal(row.equal, true);
  equal(row.actualSha256, row.originalSha256);
  equal(row.actualSha256, physical(original, row.name).sha256);
  if (live) equal(sha(fs.readFileSync(path.join(String.raw\`C:\\src\\aspnetcore\\artifacts\\bin\\Microsoft.AspNetCore.SignalR.Protocols.Json\\Release\\net12.0\`, row.name))),
    row.actualSha256);
}`;
changes.push({ replacement: 'F011 reader/overlay/restoration section replaced with explicit F012 source-reader failure, byte-identical prior test/current-producer attribution, checked source scaffold and untouched root outputs.' });
text = text.slice(0, start) + replacement + text.slice(end);
edit("existingAreaRows: 27, repositoryAlwaysTestSentinelRows: 0, inheritedSpecificationRows: 12,",
  "existingAreaRows: 27, explicitlyReusedOriginalAreaRows: 27, actualNewOwningTestRuns: 0,\n  repositoryAlwaysTestSentinelRows: 0, inheritedSpecificationRows: 12,");
edit("All 27 actual TRX result/definition/entry identities, positive durations and four exact theory payloads;",
  "All 27 explicitly reused original F011 TRX result/definition/entry identities, positive durations and four exact theory payloads;");
edit('Only captured-default JSON source is substituted against the baseline SDK/dependencies; not whole-main integration.',
  'Identical prior F011 original owner/tests/current JSON bytes are explicitly reused/rehashed; all F012 broadcast observations and timing execute independently. No new owning-suite run/current producer build or F011 timing reuse. Only captured-default JSON source is substituted against baseline SDK/dependencies; not whole-main integration.');
edit('audit passed: 12 original reports / 96 raw / 87 retained / 36 warmups / 227 overheads;',
  'audit passed: 12 original reports / \${actuals} raw / \${retained} retained / \${warmups} warmups / \${overheads} overheads;');
const destination = path.join(session, 'F012-reproduce-analysis.mjs');
assert(!fs.existsSync(destination));
fs.writeFileSync(destination, text);
const driverSource = fs.readFileSync(path.join(session, 'F011-audit.ps1'));
const driver = driverSource.toString('utf8').replaceAll('F011', 'F012');
assert(!fs.existsSync(path.join(session, 'F012-audit.ps1')));
fs.writeFileSync(path.join(session, 'F012-audit.ps1'), driver);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
fs.writeFileSync(path.join(run, 'independent-auditor-attribution.json'), JSON.stringify({
  candidate: 'F012', source: 'F011-reproduce-analysis.mjs', sourceSha256: sha(source),
  resultSha256: sha(Buffer.from(text)), changes,
  independence: 'Raw-log/statistics/GC extractor remains independent from the separate analysis extractor; adapted for actual broadcast/empty-store effects, new data-derived sample counts and explicitly borrowed original test/producer evidence.',
}, null, 2) + '\n');
console.log('F012 independent auditor adapted with explicit original test/producer reuse and native broadcast controls; no data rewritten or timing launched.');
