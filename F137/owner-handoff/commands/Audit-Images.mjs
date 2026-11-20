import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const root = process.argv[2];
const allowed = new Set([
  'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.dll',
  'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.pdb',
]);
const load = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function inventory(directory, relative = '') {
  const result = {};
  for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const name = path.join(relative, entry.name);
    if (entry.isDirectory()) Object.assign(result, inventory(directory, name));
    else if (entry.isFile()) result[name] = { length: fs.statSync(path.join(directory, name)).size, sha256: sha(path.join(directory, name)) };
    else throw new Error(`Unexpected non-file/directory consumer entry: ${name}`);
  }
  return result;
}
function gate(left, right, sameRuntime = true) {
  const differences = [];
  for (const file of [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()) {
    if (JSON.stringify(left[file]) !== JSON.stringify(right[file])) {
      differences.push({ file, left: left[file] ?? null, right: right[file] ?? null, ownerWhitelisted: allowed.has(file) });
    }
  }
  const rejected = differences.filter((item) => !item.ownerWhitelisted);
  return {
    ownerOnlyImageContractSatisfied: rejected.length === 0 && sameRuntime,
    sameRuntimeIdentity: sameRuntime,
    differences,
    rejectedDifferenceCount: rejected.length,
    allowedOwnerFileNames: [...allowed].sort(),
    noFixtureOrAutoPerfPrefixExclusion: true,
    authorizationOrPerformanceVerdict: false,
  };
}
const actual = {};
for (const entry of fs.readdirSync(path.join(root, 'images'), { withFileTypes: true })) {
  if (entry.isDirectory()) actual[entry.name] = inventory(path.join(root, 'images', entry.name));
}
const expectedPaths = {
  'original-producer': 'original-complete-consumer-before-execution.json',
  'default-producer': 'default-complete-consumer-before-execution.json',
  'original-complete': 'original-complete-closure-before-execution.json',
  'default-complete': 'default-complete-closure-before-execution.json',
  'original-final': 'original-final-consumer-before-execution.json',
  'default-final': 'default-final-consumer-before-execution.json',
};
const unchanged = [];
for (const [image, file] of Object.entries(expectedPaths)) {
  const before = Object.fromEntries(load(path.join(root, 'evidence', file)).map((row) => [row.path, { length: row.length, sha256: row.sha256 }]));
  assert.equal(gate(before, actual[image]).differences.length, 0, image);
  unchanged.push({ image, count: Object.keys(before).length, allBytesUnchanged: true });
}
const commonRows = [];
for (const row of load(path.join(root, 'evidence', 'compile-once-common-consumer.json'))) {
  for (const [image, files] of Object.entries(actual)) assert.equal(files[row.file].sha256, row.sha256, `${image}: ${row.file}`);
  commonRows.push({ file: row.file, sha256: row.sha256, images: Object.keys(actual).sort() });
}
for (const row of load(path.join(root, 'evidence', 'empty-edge-common-compiled-once.json'))) {
  for (const image of ['original-final', 'default-final']) assert.equal(actual[image][row.file].sha256, row.sha256, `${image}: ${row.file}`);
  commonRows.push({ file: row.file, sha256: row.sha256, images: ['original-final', 'default-final'] });
}
const overlay = 'AutoPerf.F137.SourceClosure.deps.json';
assert.deepEqual(actual['original-final'][overlay], actual['default-final'][overlay]);
const original = load(path.join(root, 'results', 'original-complete', 'producer.json'));
const current = load(path.join(root, 'results', 'default-complete', 'producer.json'));
for (const [role, producer] of [['original', original], ['default', current]]) {
  assert.equal(producer.rows.length, 18);
  const bad = producer.rows.filter((row) => row.outcome !== 'Passed');
  assert.equal(bad.length, 1);
  assert.equal(bad[0].name, 'EmptyCompilePath_NormalizerRejects');
  assert.equal(producer.failed, 1);
  assert.equal(producer.assertions, 97);
  const edge = load(path.join(root, 'results', `${role}-empty-edge`, 'producer.json'));
  assert.equal(edge.outcome, 'Passed');
  assert.equal(edge.assertions, 5);
  assert.equal(edge.exception, 'System.ArgumentException');
  assert.equal(edge.parameter, 'path');
  assert.equal(edge.owner.sha256, producer.ownerIdentities[0].sha256);
  const tests = load(path.join(root, 'results', role, 'existing-tests-parsed.json'));
  assert.equal(tests.count, 10);
  assert.ok(tests.rows.every((row) => row.outcome === 'Passed'));
  const ownerName = 'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.dll';
  assert.deepEqual(actual[`${role}-producer`][ownerName], actual[`${role}-complete`][ownerName]);
  assert.deepEqual(actual[`${role}-complete`][ownerName], actual[`${role}-final`][ownerName]);
  for (const owner of producer.ownerIdentities) {
    assert.equal(owner.selectedDocument.checksumMatches, true);
    assert.equal(owner.peCodeView.Guid, owner.pdbId.guid);
    assert.equal(owner.peCodeView.Stamp, owner.pdbId.stamp);
    assert.equal(sha(owner.selectedDocument.physical), owner.selectedDocument.physicalSha256);
  }
}
const runtimeFields = ['frameworkDescription', 'version', 'architecture', 'coreLibrarySha256', 'hostSha256', 'rollForward'];
const sameRuntime = runtimeFields.every((name) => original.runtime[name] === current.runtime[name]);
const realGate = gate(actual['original-final'], actual['default-final'], sameRuntime);
assert.equal(realGate.ownerOnlyImageContractSatisfied, false);
const control = actual['original-final'];
const selfTests = [];
function checkGate(name, changes, expected, runtime = true) {
  const altered = structuredClone(control);
  for (const filename of changes) {
    if (filename === null) altered['unexpected-file.bin'] = { length: 1, sha256: '0'.repeat(64) };
    else {
      assert.ok(altered[filename], filename);
      altered[filename].sha256 = '0'.repeat(64);
    }
  }
  assert.equal(gate(control, altered, runtime).ownerOnlyImageContractSatisfied, expected, name);
  selfTests.push({ name, outcome: 'Passed', expectedContractSatisfied: expected });
}
checkGate('IdenticalImageAndRuntime_PassesStructuralGateOnly', [], true);
checkGate('OnlyIntendedOwnerDllPdbChanges_AllowedStructurally', [...allowed], true);
checkGate('CommonMainDllDifference_Rejected', ['AutoPerf.F137.VerifyOnly.dll'], false);
checkGate('CommonMainPdbDifference_Rejected', ['AutoPerf.F137.VerifyOnly.pdb'], false);
checkGate('CommonMainDepsDifference_Rejected', ['AutoPerf.F137.VerifyOnly.deps.json'], false);
checkGate('CommonMainRuntimeconfigDifference_Rejected', ['AutoPerf.F137.VerifyOnly.runtimeconfig.json'], false);
checkGate('OwnFixtureDifference_Rejected', ['AutoPerf.F137.Fixture.HIGH.dll'], false);
checkGate('OwnEdgeConsumerDifference_Rejected', ['AutoPerf.F137.EmptyPath.VerifyOnly.dll'], false);
checkGate('AdditionalDepsDifference_Rejected', [overlay], false);
checkGate('UnexpectedConsumerFile_Rejected', [null], false);
checkGate('IdenticalFilesButDifferentRuntime_Rejected', [], false, false);
const report = {
  everyActualConsumerImageEntryHashed: true,
  imageInventories: actual,
  unchangedAfterExecution: unchanged,
  commonCompiledConsumerByteIdentity: commonRows,
  originalDefaultRealFullImageGate: realGate,
  gateSelfTests: selfTests,
  selfTestBoundary: 'Mutations affect only in-memory inventory objects, never source, candidate bytes, consumer files, or frozen measurements.',
  originalDefaultAreSeparateFunctionalCharacterizations: true,
  notACausalPerformancePair: true,
  knownProbeFailurePreserved: 'EmptyCompilePath_NormalizerRejects was a wrong expected exception at both roles. The additive compile-once edge consumer verifies actual ArgumentException(path) through real registered services; no old source/binary/outcome was rewritten.',
};
const target = path.join(root, 'evidence', 'complete-image-audit.json');
assert.equal(fs.existsSync(target), false, 'Refusing to overwrite image audit');
fs.writeFileSync(target, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  imageCounts: Object.fromEntries(Object.entries(actual).map(([name, files]) => [name, Object.keys(files).length])),
  commonFilesVerified: commonRows.length,
  nonOwnerDifferencesOriginalDefault: realGate.rejectedDifferenceCount,
  gateSelfTestsPassed: selfTests.length,
  runtimeIdentical: sameRuntime,
}));
