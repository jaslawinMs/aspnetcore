'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const payload = path.dirname(__dirname);
if (fs.existsSync(path.join(payload, 'MANIFEST.json'))) throw Error('Frozen payload');
const read = name => {
  const bytes = fs.readFileSync(path.join(payload, name));
  return JSON.parse(name.endsWith('.gz') ? zlib.gunzipSync(bytes) : bytes);
};
const write = (name, value) => fs.writeFileSync(path.join(payload, name), JSON.stringify(value, null, 2));
const images = [];
for (const label of ['native-owner', 'native-tests', 'common', 'runtime62', 'sdk57']) {
  const before = read(`evidence\\all-image-${label}-before.json.gz`);
  const after = read(`evidence\\all-image-${label}-after.json.gz`);
  const left = new Map(before.entries.map(e => [e.path, e]));
  const right = new Map(after.entries.map(e => [e.path, e]));
  const differences = [...new Set([...left.keys(), ...right.keys()])].filter(key => JSON.stringify(left.get(key)) !== JSON.stringify(right.get(key)));
  images.push({ label, beforeEntries: left.size, afterEntries: right.size, prefixExclusions: [], differences, allKeyedEntriesEqual: differences.length === 0 });
}
const sources = [];
for (const role of ['Original', 'ObservedDefaultC97', 'FreshestObservedDefault90F']) {
  const before = read(`evidence\\source-${role}-before.json.gz`);
  const after = read(`evidence\\source-${role}-after.json.gz`);
  const left = new Map(before.entries.map(e => [e.path, e]));
  const right = new Map(after.entries.map(e => [e.path, e]));
  const differences = [...new Set([...left.keys(), ...right.keys()])].filter(key => JSON.stringify(left.get(key)) !== JSON.stringify(right.get(key)));
  sources.push({
    role, pin: after.pin, entries: right.size, differences,
    missing: after.entries.filter(e => e.status === 'missing-physical-path'),
    gitlinks: after.entries.filter(e => e.status === 'external-gitlink'),
    lfMismatches: after.entries.filter(e => e.lfMatches === false).map(e => ({ path: e.path, blob: e.blob, rawGitBlob: e.rawGitBlob, gitLfBlob: e.gitLfBlob })),
    wrapper: after.entries.find(e => e.path === 'src/Hosting/TestHost/src/AsyncStreamWrapper.cs'),
    fullTreeMaterializationAttested: false,
    fullCompilerInputAttestation: false
  });
}
const first = read('evidence\\producer-original.json');
const confirmation = read('evidence\\producer-original-confirmation.json');
const nativeRows = read('evidence\\native-test-rows.json');
const receipts = fs.readdirSync(path.join(payload, 'evidence')).filter(name => name.endsWith('.receipt.json')).map(name => ({ file: `evidence\\${name}`, ...read(`evidence\\${name}`) }));
const successfulCommonBuilds = receipts.filter(r => r.exitCode === 0 && r.arguments[0] === 'build' && r.arguments.some(a => a.endsWith('Verifier.csproj')));
if (successfulCommonBuilds.length !== 1) throw Error('Common-once condition not satisfied');
if (!images.every(i => i.allKeyedEntriesEqual)) throw Error('All-image interval changed; inspect retained catalogs');
if (!first.completed || !confirmation.completed || first.common.sha256 !== confirmation.common.sha256 || first.owner.sha256 !== confirmation.owner.sha256) throw Error('Common producer closure changed');
const grouped = {};
for (const row of nativeRows) {
  grouped[row.run] ??= { passed: 0, failed: 0, skippedOrOther: 0, rows: [] };
  const group = grouped[row.run];
  if (row.outcome === 'Passed') group.passed++;
  else if (row.outcome === 'Failed') group.failed++;
  else group.skippedOrOther++;
  group.rows.push(row.testName);
}
const wrapperHashes = sources.map(s => s.wrapper.blob);
write('evidence\\SUMMARY.json', {
  findings: ['F153', 'F154'], status: 'PENDING', unadopted: true, unmeasured: true,
  original: sources[0].pin, observedDefaultAtEntry: sources[1].pin, newerObservedDefault: sources[2].pin,
  defaultNativeOwnerBuilt: false, defaultRuntimeExecuted: false,
  defaultBlocker: 'Both observed defaults require missing Microsoft.DotNet.Build.Tasks.Templating >=12.0.0-beta.26569.107; local cached source stops with NU1102 before generated files, native owner build, discovery and assertions. No default graph/runtime substituted.',
  successfulCommonBuilds: successfulCommonBuilds.map(r => r.file),
  commonCompileLanguage: 'C# 13.0; artifact-only project; native dependency preview defaults unchanged',
  commonOwner: first.owner, commonVerifier: first.common,
  runtime: first.runtime, rollForward: 'Disable', loadedRuntimeAndModuleProof: 'evidence\\producer-original-confirmation.json',
  producerScenarios: first.rows.map(r => ({ name: r.name, passed: r.passed, requestType: r.requestType, innerType: r.innerType, wrapperProducerEvidence: r.wrapperProducerEvidence ?? (r.requestType === 'Microsoft.AspNetCore.TestHost.AsyncStreamWrapper') })),
  sameTenProducerScenariosConfirmed: confirmation.rows.length === first.rows.length && confirmation.rows.every(r => r.passed),
  nativeRuns: grouped, selectedNativeTheories: 0,
  repeatPurpose: 'First executions overlapped metadata collection. Confirmation executions occurred after complete before catalogs and before after catalogs; they verify closure stability, not additional unique coverage.',
  sourceWrapperBlobEqualAcrossThreePins: new Set(wrapperHashes).size === 1,
  imageComparisons: images, sourceCatalogSummaries: sources,
  mechanismBoundary: 'Loaded CoreLib62 Stream.ReadByte/WriteByte contain newarr System.Byte(1) then virtual bulk Read/Write. Real wrapper bulk methods consult actual IHttpBodyControlFeature before delegating. This is IL mechanism evidence, not allocation or timing measurement.',
  directionBoundary: 'AsyncStreamWrapper owns the server request view of a read-only PipeReaderStream on the nonempty HttpClient path. Response writes use ResponseBodyWriterStream; client observes System.Net.Http.StreamContent+ReadOnlyStream. TestServer.SendAsync(Action<HttpContext>) leaves caller-supplied request stream unwrapped.',
  frequencyBoundary: 'One source construction site and no local TestHost ReadByte/WriteByte invocation sites in the pinned source grep. Finite diagnostic packets and BinaryReader use do not establish an application hot path or runtime invocation frequency.',
  causality: 'No candidate, replacement, performance comparison or causal pair exists. Fresh-default producer/runtime are blocked; source equality is not runtime proof.'
});
console.log(JSON.stringify({ images, sources: sources.map(s => ({ role: s.role, entries: s.entries, missing: s.missing.length, gitlinks: s.gitlinks.length, lfMismatches: s.lfMismatches.length, changedBetweenCatalogs: s.differences.length, wrapper: s.wrapper })), nativeRuns: grouped, commonBuildCount: successfulCommonBuilds.length }, null, 2));
