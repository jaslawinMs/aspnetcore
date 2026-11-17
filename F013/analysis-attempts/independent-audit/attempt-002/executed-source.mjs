import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const supplied = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const live = supplied === null;
const verify = process.argv.includes('--verify');
const root = live ? path.join(path.dirname(fileURLToPath(import.meta.url)), 'autoperf-runs', 'F013') : path.resolve(supplied);
const file = relative => path.join(root, ...relative.split(/[\\/]/));
const bytes = relative => fs.readFileSync(file(relative));
const text = relative => bytes(relative).toString('utf8').replace(/^\uFEFF/, '');
const json = relative => JSON.parse(text(relative));
const base = value => value.split(/[\\/]/).at(-1);
const hash = (value, algorithm = 'sha256') => crypto.createHash(algorithm).update(value).digest('hex').toUpperCase();
const sha = relative => hash(bytes(relative));
const equal = (actual, expected) => assert.deepEqual(actual, expected);
const canonical = value => value.replaceAll('\r\n', '\n');
const near = (actual, expected) => assert(Number.isFinite(actual) && Number.isFinite(expected) &&
  Math.abs(actual - expected) <= Math.max(1e-5, Math.abs(expected) * 1e-9), `Numeric mismatch: ${actual}/${expected}`);
const mean = values => values.reduce((total, value) => total + value, 0) / values.length;
const quantile = (values, probability) => {
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  return sorted[lower] + (sorted[Math.ceil(position)] - sorted[lower]) * (position - lower);
};
const roundEven = value => {
  const lower = Math.floor(value);
  return value - lower === .5 ? lower + lower % 2 : Math.round(value);
};
const states = relative => fs.readdirSync(file(relative)).filter(name => name.endsWith('.json')).sort()
  .map(name => ({ name, data: json(`${relative}/${name}`) }));
const only = (rows, suffix) => {
  const selected = rows.filter(value => value.name.endsWith(suffix));
  equal(selected.length, 1);
  return selected[0].data;
};
const shapes = ['NoConnections512', 'EmptyTargets', 'Small4List2', 'Threshold16List', 'Threshold17List',
  'C32List64Miss', 'C32Array64Miss', 'C32ReadOnly64Miss', 'C128List256Miss', 'C128Array256Miss',
  'C32List64Sparse', 'C32Array64Sparse', 'C32List64All', 'C32DupList64'];
const variants = ['native-specialization-001', 'native-specialization-002'];
const roles = ['original', 'captured-default-json', 'comparison-original',
  ...variants.flatMap(value => [value, `${value}-current-json`])];
const owner = 'Microsoft.AspNetCore.SignalR.Core';
const testName = 'SendConnectionsAsyncPreservesDerivedListContainsDispatch';
const omissions = fs.existsSync(file('omitted-file-manifest.json')) ? json('omitted-file-manifest.json') : [];
let omittedRecords = 0;
const liveImages = new Set();
function exact(relative, expected) {
  if (fs.existsSync(file(relative))) {
    const data = bytes(relative);
    if (expected.bytes !== undefined) equal(data.length, expected.bytes);
    equal(hash(data), expected.sha256);
    return true;
  }
  assert(!live, `Missing live evidence: ${relative}`);
  const records = omissions.filter(value => value.original.replaceAll('\\', '/') === relative.replaceAll('\\', '/'));
  equal(records.length, 1);
  equal(records[0].sha256, expected.sha256);
  if (expected.bytes !== undefined) equal(records[0].bytes, expected.bytes);
  omittedRecords++;
  return false;
}

const investigation = json('current-source-investigation.json');
equal([investigation.baseline, investigation.branch, investigation.currentDefault, investigation.sources.length],
  ['37e809ead5824bc753a1c3d56f11615bdb1296c5', 'autoperf/F013-signalr-targeted-membership',
    '49147673007a4b1d676694e2c5f85b83ad76c36f', 20]);
equal(investigation.currentDefault, json('investigation/fresh-current-default.json').sha);
equal(investigation.differingSelectedSources, ['src\\SignalR\\common\\Protocols.Json\\src\\Protocol\\JsonHubProtocol.cs']);
for (const source of investigation.sources) {
  for (const [directory, key] of [['baseline-canonical', 'baselineSha256'],
    ['current-default-canonical', 'currentDefaultSha256'], ['producer-source', 'workingSha256']]) {
    equal(sha(`${directory}/${source.file}`), source[key]);
  }
  equal(canonical(text(`baseline-canonical/${source.file}`)), canonical(text(`producer-source/${source.file}`)));
  equal(canonical(text(`baseline-canonical/${source.file}`)) === canonical(text(`current-default-canonical/${source.file}`)),
    source.canonicalEqual);
}
equal(json('investigation/open-exact-symbol-pr-search.json'), []);
const history = json('investigation/owner-history.json');
assert(Array.isArray(history) && history.length > 0 && history.length <= 5);
equal(json('investigation/related-pr-69189.json').author.login, 'davidfowl');
const upstreamPatch = text('investigation/related-pr-69189.patch')
  .split('diff --git a/src/SignalR/server/Core/src/DefaultHubLifetimeManager.cs')[1].split('diff --git ')[0];
assert(upstreamPatch.includes('SendConnectionsAsync') && upstreamPatch.includes('connectionIds.Count > 16'));
assert(text('investigation/selected-source-delta.patch').includes('+            if (message.Headers is Dictionary<string, string> headers)'));

const manifests = new Map(roles.map(role => [role, json(`manifest-${role}.json`)]));
const physical = (manifest, name) => {
  const values = manifest.files.filter(value => value.path === name);
  equal(values.length, 1);
  return values[0];
};
const sourceDirectory = role => manifests.get(role).sourceDirectory || `sources/${role}`;
let sourceSnapshots = 0;
for (const role of roles) {
  const manifest = manifests.get(role);
  equal([manifest.files.length, manifest.sources.length], [80, 89]);
  const image = manifest.imageDirectory || `images/${role}`;
  for (const row of manifest.files) {
    const relative = `${image}/${row.path}`.replaceAll('\\', '/');
    if (exact(relative, row)) liveImages.add(relative);
  }
  for (const row of manifest.sources) {
    exact(`${sourceDirectory(role)}/${row.path}`, row);
    sourceSnapshots++;
  }
  equal(physical(manifest, 'BenchmarkDotNet.dll').sha256, manifests.get('original').benchmarkDotNetSha256);
  for (const name of ['AutoPerf.Benchmarks.dll', 'AutoPerf.Benchmarks.pdb']) {
    equal(physical(manifest, name).sha256, physical(manifests.get('original'), name).sha256);
  }
}
for (const variant of variants) {
  const original = manifests.get('comparison-original');
  const candidate = manifests.get(variant);
  equal(candidate.files.filter(row => row.sha256 !== physical(original, row.path).sha256).map(row => row.path).sort(),
    [`${owner}.dll`, `${owner}.pdb`].sort());
  equal(candidate.sources.map(row => row.path), original.sources.map(row => row.path));
  equal(candidate.sources.filter((row, index) => row.sha256 !== original.sources[index].sha256).map(row => row.path),
    ['owner\\DefaultHubLifetimeManager.cs']);
}
for (const [originalRole, currentRole] of [['original', 'captured-default-json'],
  ...variants.map(value => [value, `${value}-current-json`])]) {
  const original = manifests.get(originalRole);
  const current = manifests.get(currentRole);
  equal(current.files.filter(row => row.sha256 !== physical(original, row.path).sha256).map(row => row.path).sort(),
    ['Microsoft.AspNetCore.SignalR.Protocols.Json.dll', 'Microsoft.AspNetCore.SignalR.Protocols.Json.pdb']);
  equal(current.sources.filter((row, index) => row.sha256 !== original.sources[index].sha256).map(row => row.path),
    ['producer\\JsonHubProtocol.cs']);
}
equal(canonical(text(`${sourceDirectory('comparison-original')}/owner/DefaultHubLifetimeManager.cs`)),
  canonical(text('producer-source/src/SignalR/server/Core/src/DefaultHubLifetimeManager.cs')));
assert(text('sources/native-specialization-001/owner/DefaultHubLifetimeManager.cs').includes('GetType() == typeof(List<string>)'));
assert(text('sources/native-specialization-001/owner/DefaultHubLifetimeManager.cs').includes('Array.IndexOf'));
assert(text('sources/native-specialization-002/owner/DefaultHubLifetimeManager.cs').includes('.AsSpan().Contains(connection.ConnectionId)'));
assert(!text('sources/native-specialization-002/owner/DefaultHubLifetimeManager.cs').includes('GetType() == typeof(List<string>)'));
assert(text('sources/original/harness/AutoPerf.Benchmarks.csproj').includes('<LangVersion>13</LangVersion>'));

const decoded = value => value.replaceAll('&quot;', '"').replaceAll('&apos;', "'")
  .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
const attributes = value => Object.fromEntries([...value.matchAll(/([\w:.-]+)="([^"]*)"/g)]
  .map(match => [match[1], decoded(match[2])]));
const oldCapture = json('preparation-attempts/attempt-001/additional-tested-image-capture.json');
equal([oldCapture.capturedAfterOriginalTestExecution, oldCapture.testsRebuiltOrRerun, oldCapture.files.length], [true, false, 6]);
for (const row of oldCapture.files) exact(`tests/original/test-image/${row.name}`, row);
const oldTest = json('tests/original/actual-test-audit.json');
const oldReuse = json('tests/original/borrowed-evidence-provenance.json');
equal([oldReuse.candidate, oldReuse.actualNewOwningTestRuns, oldReuse.actualPriorOriginalRowsReused,
  oldReuse.newTargetedSendProducerObservationsRequired, oldReuse.priorGroupObservationsOrTimingReused],
  ['F013', 0, 27, true, false]);
equal(oldReuse.originalTestAuditSha256, sha('tests/original/actual-test-audit.json'));
equal(oldReuse.originalTrxSha256, sha('tests/original/owning-original.trx'));
equal(oldTest.candidate, 'F011');
const freshTests = new Map();
let freshRows = 0;
let borrowedRows = 0;
for (const [role, relative, fresh] of [
  ['original', 'tests/original', false],
  ['comparison-original', 'tests/owning-comparison/original-attempt-002', true],
  ...variants.map(value => [value, `tests/owning-comparison/${value}`, true]),
]) {
  const audit = fresh ? json(`${relative}/actual-test-audit.json`) : oldTest;
  if (fresh) freshTests.set(role, audit);
  const trxName = role === 'comparison-original' || role === 'original' ? 'original' : role;
  const trxPath = `${relative}/owning-${trxName}.trx`;
  const trx = text(trxPath);
  const expected = fresh ? 28 : 27;
  const results = [...trx.matchAll(/<UnitTestResult\b([^>]*?)(?:\/>|>[\s\S]*?<\/UnitTestResult>)/g)]
    .map(match => attributes(match[1]));
  const definitions = [...trx.matchAll(/<UnitTest\b([^>]*)>([\s\S]*?)<\/UnitTest>/g)].map(match => ({
    ...attributes(match[1]), method: attributes(match[2].match(/<TestMethod\b([^>]*)\/>/)[1]),
    execution: attributes(match[2].match(/<Execution\b([^>]*)\/>/)[1]),
  }));
  const entries = [...trx.matchAll(/<TestEntry\b([^>]*)\/>/g)].map(match => attributes(match[1]));
  equal([results.length, definitions.length, entries.length, audit.passed, audit.failed, audit.skipped],
    [expected, expected, expected, expected, 0, 0]);
  equal(new Set(results.map(row => row.testId)).size, expected);
  equal(new Set(results.map(row => row.executionId)).size, expected);
  const catalog = [];
  for (const source of ['DefaultHubLifetimeManagerTests.cs', 'HubLifetimeManagerTestBase.cs']) {
    const content = text(`${sourceDirectory(role)}/test/${source}`);
    for (const match of content.matchAll(/\[Fact\]\s+public (?:async )?(?:void|Task) (\w+)\(/g)) {
      catalog.push({ source, name: match[1], rows: 1 });
    }
    for (const match of content.matchAll(/\[Theory\]([\s\S]*?)public (?:async )?(?:void|Task) (\w+)\(/g)) {
      const data = [...match[1].matchAll(/\[InlineData\((\d+), (true|false)\)\]/g)]
        .map(row => [Number(row[1]), row[2] === 'true']);
      equal(data, [[16, false], [16, true], [17, false], [17, true]]);
      catalog.push({ source, name: match[2], rows: 4, data });
    }
  }
  equal(catalog.filter(value => value.rows === 1).length, fresh ? 24 : 23);
  equal(catalog.filter(value => value.source === 'HubLifetimeManagerTestBase.cs').length, 12);
  equal(catalog.filter(value => value.rows === 4).length, 1);
  for (const row of results) {
    equal(row.outcome, 'Passed');
    assert(/^\d\d:\d\d:\d\d\.\d+$/.test(row.duration) && Number(row.duration.replaceAll(':', '')) > 0);
    const matches = definitions.filter(value => value.id === row.testId);
    equal(matches.length, 1);
    const definition = matches[0];
    equal(definition.method.className, 'Microsoft.AspNetCore.SignalR.Tests.DefaultHubLifetimeManagerTests');
    equal(definition.execution.id, row.executionId);
    equal(entries.filter(value => value.testId === row.testId && value.executionId === row.executionId).length, 1);
    const saved = audit.rows.filter(value => value.testId === row.testId);
    equal(saved.length, 1);
    equal([saved[0].method, saved[0].displayName, saved[0].executionId, saved[0].outcome],
      [definition.method.name, row.testName, row.executionId, row.outcome]);
    if (fresh) equal(saved[0].actualDuration, row.duration);
    else equal([saved[0].class, saved[0].duration], [definition.method.className, row.duration]);
  }
  for (const method of catalog) {
    const matching = definitions.filter(value => value.method.name === method.name);
    equal(matching.length, method.rows);
    if (method.data) {
      const data = matching.map(value => {
        const display = results.find(row => row.testId === value.id).testName;
        const match = display.match(/\(targetCount: (\d+), useList: (True|False)\)$/);
        assert(match);
        return [Number(match[1]), match[2] === 'True'];
      });
      equal(data.sort(), method.data.slice().sort());
    }
  }
  if (fresh) {
    equal([audit.actualFreshOwningTestRun, audit.actualTests, audit.actualTheoryRows, audit.actualNewDerivedListFact],
      [true, 28, 4, testName]);
    equal(audit.trxSha256, sha(trxPath));
    equal(audit.actualOwnerSourceSha256, sha(`${sourceDirectory(role)}/owner/DefaultHubLifetimeManager.cs`));
    equal(audit.actualTestSourceSha256, sha(`${sourceDirectory(role)}/test/DefaultHubLifetimeManagerTests.cs`));
    equal(audit.binaryHashes.length, 6);
    for (const row of audit.binaryHashes) exact(`${relative}/test-image/${row.name}`, row);
    const execution = json(`${relative}/execution.json`);
    equal(execution.actualOwningTestCommandStarted, true);
    equal(execution.commands.filter(value => value.arguments[0] === 'test').length, 1);
    assert(execution.commands.every(value => value.actualExitCode === 0));
    freshRows += results.length;
  } else borrowedRows += results.length;
}
const failed = json('tests/owning-comparison/original/execution.json');
equal(failed.commands.length, 1);
equal([failed.commands[0].arguments[0], failed.commands[0].actualExitCode], ['build', 1]);
assert(failed.commands.every(value => value.arguments[0] !== 'test'));
const failure = json('tests/owning-comparison/original/observed-failure.json');
equal([failure.actualOwningTestCommandsStarted, failure.owningTestAssertionReached, failure.benchmarkTimingStarted], [0, false, false]);
equal(failure.diagnostics, ['CS1513', 'CS1519']);
equal(json('tests/owning-comparison/original/execution.json').actualNewOwningTestRun, true);
assert(failure.qualification.includes('premature plan marker'));

const producerNames = ['LargeTargetScopeCaseAndDuplicates', 'EmptyConnectionStoreOnlyReadsTargetCount',
  'AllMissingDoesNotSerializeCanceledSend', 'JsonPayloadSerializedOnceForAllRecipients',
  'LiveArrayMutationAtJsonGetter', 'SnapshotInputControlArray', 'LiveListMutationAtJsonGetter',
  'SnapshotInputControlList', 'LiveReadOnlyWrapperMutationAtJsonGetter', 'SnapshotInputControlReadOnlyWrapper',
  'CustomCollectionContainsDispatch', 'SnapshotInputControlCustomDispatch', 'DerivedListRetainsCustomContainsDispatch',
  'RepeatedMissEnumerationC1T17', 'RepeatedMissEnumerationC8T32', 'RepeatedMissEnumerationC32T64',
  'PendingWritesWaitForEveryPipe', 'PendingWritesCancelThroughActualPipes'];
const ids = count => Array.from({ length: count }, (_, index) => `c${String(index).padStart(4, '0')}`);
function wire(frame) {
  assert(frame.endsWith('\x1e'));
  const message = JSON.parse(frame.slice(0, -1));
  equal([message.type, message.target, message.arguments.length], [1, 'Probe', 1]);
  assert(!('headers' in message));
  equal(typeof message.arguments[0] === 'string' ? message.arguments[0] : message.arguments[0].value, 'World');
}
function delivery(actual, expected, single = false, calls = 1) {
  equal(actual.calls, calls);
  equal(actual.expectedRecipientCount, single ? 1 : expected.length);
  equal(actual.expectedRecipientIdentityPredetermined, !single);
  if (single) {
    equal(actual.expectedRecipients, null);
    equal(actual.actualRecipients.length, 1);
    assert(ids(8).includes(actual.actualRecipients[0]));
  } else {
    equal(actual.actualRecipients.slice().sort(), expected.slice().sort());
    equal(actual.expectedRecipients.slice().sort(), expected.slice().sort());
  }
  equal(new Set(actual.actualRecipients).size, actual.actualRecipients.length);
  for (const connection of actual.connections) {
    equal([connection.aborted, connection.boundedCapacity], [false, 256]);
    const receives = actual.actualRecipients.includes(connection.id);
    equal(connection.frames, receives ? calls : 0);
    equal(connection.bytes, receives ? calls * Buffer.byteLength(connection.lastFrame) : 0);
    if (receives) wire(connection.lastFrame);
    else equal(connection.lastFrame, '');
  }
}
function producer(record) {
  equal(record.passed, true);
  const name = record.caseName;
  const value = record.observation;
  assert(producerNames.includes(name));
  if (name === 'LargeTargetScopeCaseAndDuplicates') {
    equal(value.targetCount, 17);
    delivery(value.actual, ['connection', 'outside']);
  } else if (name === 'EmptyConnectionStoreOnlyReadsTargetCount') {
    equal([value.targetCountReads, value.inputReadsBeyondCount, value.argumentGetterReads, value.actual.connections.length], [1, 0, 0, 0]);
    delivery(value.actual, []);
  } else if (name === 'AllMissingDoesNotSerializeCanceledSend') {
    equal([value.argumentGetterReads, value.canceledToken], [0, true]);
    delivery(value.actual, []);
  } else if (name === 'JsonPayloadSerializedOnceForAllRecipients') {
    equal(value.argumentGetterReads, 1);
    delivery(value.actual, ids(3));
  } else if (/^(Live|SnapshotInputControl)(Array|List|ReadOnlyWrapper)/.test(name)) {
    const snapshot = name.startsWith('Snapshot');
    equal([value.snapshotInputControl, value.inputSnapshotIsShippingImplementation, value.implementedIndexedOwner,
      value.originalCount, value.finalCount, value.getterReads], [snapshot, false, false, 17, 17, 1]);
    equal(value.originalValuesAfterSend.slice(0, 8), ids(8).map(id => `removed-${id}`));
    equal(value.originalValuesAfterSend.slice(8), Array.from({ length: 9 }, (_, index) => `missing-${String(index + 8).padStart(4, '0')}`));
    equal(value.wrapperIsReadOnly, value.shape !== 'List');
    equal(value.originalIsReadOnly, value.shape === 'Array');
    delivery(value.actual, snapshot ? ids(8) : [], !snapshot);
  } else if (name === 'CustomCollectionContainsDispatch' || name === 'SnapshotInputControlCustomDispatch') {
    const snapshot = name.startsWith('Snapshot');
    equal([value.snapshotInputControl, value.inputSnapshotIsShippingImplementation, value.ContainsCalls,
      value.EnumeratorCalls, value.enumerationBeforeSend, value.customComparison, value.snapshotComparison],
    [snapshot, false, snapshot ? 0 : 2, snapshot ? 1 : 0, snapshot ? 1 : 0, 'OrdinalIgnoreCase', snapshot ? 'Ordinal' : null]);
    delivery(value.actual, snapshot ? [] : ['CONNECTION']);
  } else if (name === 'DerivedListRetainsCustomContainsDispatch') {
    equal([value.targetCount, value.ContainsCalls, value.customComparison], [17, 2, 'OrdinalIgnoreCase']);
    delivery(value.actual, ['CONNECTION']);
  } else if (name.startsWith('RepeatedMissEnumeration')) {
    equal([value.EnumeratorCalls, value.ValuesYielded, value.CountReads, value.IndexerReads, value.instrumentationTimed],
      [value.connectionCount, value.connectionCount * value.targetSize, 1, 0, false]);
    assert([[1, 17], [8, 32], [32, 64]].some(([connections, targets]) => connections === value.connectionCount && targets === value.targetSize));
    delivery(value.actual, []);
  } else if (name.startsWith('PendingWrites')) {
    const cancel = name === 'PendingWritesCancelThroughActualPipes';
    equal([value.actualPipes, value.pauseWriterThreshold, value.cancellationRequested, value.cancellationObserved,
      value.taskStatus, value.actualAbortedConnections, value.copiedFilterOrInjectedManagerCallback],
    [2, 1, cancel, cancel, cancel ? 'Canceled' : 'RanToCompletion', 0, false]);
    equal(value.actualFrames.length, 2);
    value.actualFrames.forEach(wire);
  } else assert.fail(`Unvalidated producer ${name}`);
}
function setup(data) {
  assert(shapes.includes(data.shape));
  const connections = data.shape === 'NoConnections512' ? 0 : data.shape === 'Small4List2' ? 4 : data.shape.startsWith('C128') ? 128 : 32;
  const size = data.shape === 'NoConnections512' ? 512 : data.shape === 'EmptyTargets' ? 0
    : data.shape === 'Small4List2' ? 2 : data.shape === 'Threshold16List' ? 16
    : data.shape === 'Threshold17List' ? 17 : data.shape.startsWith('C128') ? 256 : 64;
  equal([data.connectionCount, data.targetSize], [connections, size]);
  const clients = ids(connections);
  const expected = ['Small4List2', 'Threshold16List', 'Threshold17List'].includes(data.shape) ? clients.slice(0, size)
    : data.shape.endsWith('Sparse') ? clients.slice(0, 1) : data.shape === 'C32List64All' ? clients
    : data.shape === 'C32DupList64' ? clients.slice(0, 2) : [];
  equal(data.actual.connections.map(value => value.id).sort(), clients.sort());
  if (data.shape.includes('Array') || data.shape === 'NoConnections512') equal(data.actual.inputType, 'System.String[]');
  else assert(data.actual.inputType.startsWith(data.shape.includes('ReadOnly')
    ? 'System.Collections.ObjectModel.ReadOnlyCollection' : 'System.Collections.Generic.List'));
  delivery(data.actual, expected);
}
const contexts = [
  ['characterization/original', 'original', false],
  ['characterization/captured-default-json', 'captured-default-json', false],
  ...variants.flatMap(value => [[`characterization/${value}`, value, false],
    [`characterization/${value}-current-json`, `${value}-current-json`, false]]),
  ...[1, 2, 3].flatMap(index => [[`measurements/comparison-${index}/original`, 'comparison-original', true],
    [`measurements/comparison-${index}/candidate`, index === 1 ? variants[0] : variants[1], true]]),
];
let pdbBindings = 0;
let pdbDocuments = 0;
let producers = 0;
let setups = 0;
let validations = 0;
let settingsRecords = 0;
const runtimes = [];
for (const [relative, role, timed] of contexts) {
  const rows = states(`${relative}/states`);
  const manifest = manifests.get(role);
  const testRole = role === 'original' || role === 'captured-default-json' ? null
    : role.replace('-current-json', '');
  const tested = testRole === null ? oldCapture.files : freshTests.get(testRole).binaryHashes;
  const witnesses = rows.filter(value => value.name.includes('-source-pdb-'));
  equal(witnesses.length, 7);
  for (const row of witnesses) {
    const value = row.data;
    equal([value.actualPePdbBindingMatched, value.codeViewGuid], [true, value.pdbGuid]);
    const assembly = row.name.slice(row.name.indexOf('-source-pdb-') + '-source-pdb-'.length, -5) + '.dll';
    const test = assembly.endsWith('.Tests.dll');
    const binary = test ? tested.find(entry => entry.name === assembly) : physical(manifest, assembly);
    const pdbName = assembly.replace(/\.dll$/, '.pdb');
    const pdb = test ? tested.find(entry => entry.name === pdbName) : physical(manifest, pdbName);
    assert(binary && pdb, assembly);
    equal([value.assemblySha256, value.pdbSha256], [binary.sha256, pdb.sha256]);
    for (const document of value.documents) {
      const matching = manifest.sources.filter(entry => base(entry.path) === base(document.source));
      equal(matching.length, 1);
      const source = bytes(`${sourceDirectory(role)}/${matching[0].path}`);
      const algorithm = document.algorithm.toLowerCase() === '8829d00f-11b8-4213-878b-770e8597ac16' ? 'sha256'
        : document.algorithm.toLowerCase() === 'ff1816ec-aa5e-4d10-87f7-6f4963833460' ? 'sha1' : null;
      assert(algorithm);
      equal(hash(source, algorithm), document.checksum);
      equal(hash(source), document.sha256);
      pdbDocuments++;
    }
    pdbBindings++;
  }
  const runtime = only(rows, '-runtime.json');
  equal(runtime.candidate, 'F013');
  equal([runtime.ownerSha256, runtime.harnessSha256, runtime.jsonProtocolSha256],
    [physical(manifest, `${owner}.dll`).sha256, physical(manifest, 'AutoPerf.Benchmarks.dll').sha256,
      physical(manifest, 'Microsoft.AspNetCore.SignalR.Protocols.Json.dll').sha256]);
  equal([runtime.serverGc, runtime.sharedMachineNotIsolated], [true, true]);
  runtimes.push(runtime);
  const native = rows.filter(value => value.name.endsWith('-producer.json'));
  equal(native.length, timed ? 0 : producerNames.length);
  if (!timed) equal(native.map(value => value.data.caseName), producerNames);
  native.forEach(value => producer(value.data));
  producers += native.length;
  const setupRows = rows.filter(value => value.name.endsWith('-setup-preflight.json'));
  equal(setupRows.length, shapes.length);
  equal(setupRows.map(value => value.data.shape).sort(), shapes.slice().sort());
  setupRows.forEach(value => setup(value.data));
  setups += setupRows.length;
  const cleanup = rows.filter(value => value.name.endsWith('-benchmark-validated.json'));
  equal(cleanup.length, shapes.length);
  equal(cleanup.map(value => value.data.shape).sort(), shapes.slice().sort());
  for (const row of cleanup) {
    const actual = row.data.actual;
    assert(Number.isSafeInteger(actual.calls) && actual.calls > 0);
    const before = setupRows.find(value => value.data.shape === row.data.shape).data.actual;
    delivery(actual, before.actualRecipients, false, actual.calls);
    equal(actual.connections.map(value => value.id).sort(), before.connections.map(value => value.id).sort());
    validations++;
  }
  const settings = rows.filter(value => /-settings-(before|after)\.json$/.test(value.name));
  equal(settings.length, timed ? 2 * shapes.length : 0);
  settings.forEach(value => equal(value.data, runtime.initialSettings));
  settingsRecords += settings.length;
  if (timed) equal(only(rows, '-completed.json').actualReports, shapes.length);
  else {
    const completed = only(rows, '-characterization-completed.json');
    equal([completed.contractChecks, completed.actualChecks, completed.actualTimedSetupsPreflighted, completed.passed],
      [18, 32, 14, true]);
  }
}
for (const runtime of runtimes) {
  equal([runtime.corelibSha256, runtime.serializerSha256, runtime.initialSettings],
    [runtimes[0].corelibSha256, runtimes[0].serializerSha256, runtimes[0].initialSettings]);
}

const budget = json('measurement-budget.json');
equal([budget.maximumComparisons, budget.usedComparisons, budget.originalProfiles, budget.candidateProfiles,
  budget.originalOnlyDiagnosticProfiles, budget.sourceCandidateShapes, budget.closed], [3, 3, 3, 3, 0, 2, true]);
equal(budget.attempts.map(value => [value.comparison, value.state, value.failed]),
  [[1, 'completed', false], [2, 'completed', false], [3, 'completed', false]]);
const analysis = json('analysis.json');
const evaluation = json('final-evaluation.json');
equal([analysis.mode, analysis.sourceVersionsMeasured, analysis.compiledHarnessVersionsMeasured, analysis.budgetClosed],
  ['measured-no-gain', 2, 1, true]);
equal([evaluation.disposition, evaluation.performancePrJustified, evaluation.recommendedShippingSourceChange,
  evaluation.originalFindingCostStillPresent, evaluation.notClaimingEveryAlternativeImpossible], ['no-gain', false, false, true, true]);
let actuals = 0;
let retained = 0;
let warmups = 0;
let overheads = 0;
let reports = 0;
const overheadDistribution = {};
const observedAllocationChanges = [];
for (const index of [1, 2, 3]) {
  const directory = `measurements/comparison-${index}`;
  const attempt = budget.attempts.find(value => value.comparison === index);
  const execution = json(`${directory}/comparison-execution.json`);
  const variant = index === 1 ? variants[0] : variants[1];
  equal([execution.comparison, execution.state, execution.failed], [index, 'completed', false]);
  equal(execution.manifestHashes, attempt.manifestHashes);
  equal(execution.order, index === 2 ? ['candidate', 'original'] : ['original', 'candidate']);
  equal(hash(bytes(`${directory}/executed-source.ps1`)), execution.driverSha256);
  equal(Date.parse(execution.startedUtc), Date.parse(attempt.startedUtc));
  equal(execution.profiles.map(value => [value.role, value.actualExitCode, value.actualReports]),
    attempt.profiles.map(value => [value.role, value.actualExitCode, value.actualReports]));
  equal(execution.manifestHashes.original, sha('manifest-comparison-original.json'));
  equal(execution.manifestHashes.candidate, sha(`manifest-${variant}.json`));
  const extracted = json(`analysis-comparison-${index}.json`);
  equal([extracted.candidate, extracted.candidateVariant, extracted.actualProfiles], ['F013', variant, 2]);
  equal(extracted.cases.map(value => value.shape), shapes);
  const before = { actuals, retained, warmups, overheads };
  for (const role of ['original', 'candidate']) {
    const exports = fs.readdirSync(file(`${directory}/${role}/results`)).filter(name => name.endsWith('full.json'));
    equal(exports.length, 1);
    const data = json(`${directory}/${role}/results/${exports[0]}`);
    const console = text(`${directory}/${role}.log`);
    const sections = console.split(/^\/\/ Benchmark: /m).slice(1);
    equal([data.Benchmarks.length, sections.length], [14, 14]);
    equal(sha(`${directory}/${role}/results/${exports[0]}`), extracted.roles[role].fullExportSha256);
    equal(sha(`${directory}/${role}.log`), extracted.roles[role].consoleSha256);
    equal(console.split(/\r?\n/).filter(value => /warning|multimodal|outlier|unable/i.test(value)),
      extracted.roles[role].printedWarningOrOutlierLines);
    for (const benchmark of data.Benchmarks) {
      const shape = benchmark.FullName.match(/^AutoPerf\.TargetedSendBenchmarks\.Send\(Shape: (\w+)\)$/)?.[1];
      assert(shapes.includes(shape), benchmark.FullName);
      const matching = sections.filter(value => value.slice(0, value.indexOf('\n')).trimEnd().endsWith(`[${benchmark.Parameters}]`));
      equal(matching.length, 1);
      const part = matching[0];
      for (const setting of ['PowerPlanMode=00000000-0000-0000-0000-000000000000',
        'Toolchain=SettingsPreservingEmitToolchain', 'IterationTime=100.0000 ms', 'RunStrategy=Throughput']) assert(part.includes(setting));
      const parse = kind => [...part.matchAll(new RegExp(`^${kind}\\s+(\\d+):\\s+(\\d+) op, ([\\d.]+) ns,`, 'gm'))]
        .map(value => ({ index: Number(value[1]), operations: Number(value[2]), ns: Number(value[3]) }));
      const raw = parse('WorkloadActual');
      const result = parse('WorkloadResult');
      const warmup = parse('WorkloadWarmup');
      const overhead = parse('OverheadActual');
      equal([raw.length, warmup.length], [8, 3]);
      assert(result.length >= 5 && result.length <= 8 && overhead.length > 0);
      for (const rows of [raw, warmup, overhead]) equal(rows.map(value => value.index), rows.map((_, offset) => offset + 1));
      overheadDistribution[overhead.length] = (overheadDistribution[overhead.length] || 0) + 1;
      const samples = result.map(value => value.ns / value.operations);
      const compensation = quantile(overhead.map(value => value.ns / value.operations), .5);
      const remaining = raw.map(value => value.ns / value.operations - compensation);
      for (const value of samples) {
        const position = remaining.findIndex(other => Math.abs(value - other) < .001);
        assert(position >= 0);
        remaining.splice(position, 1);
      }
      assert(remaining.every(value => value >= Math.max(...samples) - .001));
      const calculated = mean(samples);
      const variance = samples.reduce((sum, value) => sum + (value - calculated) ** 2, 0) / (samples.length - 1);
      const stats = benchmark.Statistics;
      equal(stats.N, samples.length);
      equal(stats.OriginalValues.slice().sort((a, b) => a - b), samples.slice().sort((a, b) => a - b));
      for (const [key, value] of Object.entries({
        Mean: calculated, Variance: variance, StandardDeviation: Math.sqrt(variance), StandardError: Math.sqrt(variance / samples.length),
        Min: Math.min(...samples), Max: Math.max(...samples), Q1: quantile(samples, .25), Median: quantile(samples, .5), Q3: quantile(samples, .75),
      })) near(stats[key], value);
      near(stats.ConfidenceInterval.Lower, stats.Mean - stats.ConfidenceInterval.Margin);
      near(stats.ConfidenceInterval.Upper, stats.Mean + stats.ConfidenceInterval.Margin);
      equal(benchmark.Measurements.length, result.length);
      benchmark.Measurements.forEach((value, offset) => {
        equal([value.IterationMode, value.IterationStage, value.Operations], ['Workload', 'Result', result[offset].operations]);
        near(value.Nanoseconds, result[offset].ns);
      });
      const gc = part.match(/^GC:\s+(\d+) (\d+) (\d+) (\d+) (\d+)/m);
      assert(gc);
      const [g0, g1, g2, allocation, operations] = gc.slice(1).map(Number);
      assert(operations > 0 && Number.isSafeInteger(allocation));
      equal([benchmark.Memory.Gen0Collections, benchmark.Memory.Gen1Collections, benchmark.Memory.Gen2Collections, benchmark.Memory.TotalOperations],
        [g0, g1, g2, operations]);
      equal(benchmark.Memory.BytesAllocatedPerOperation, roundEven(allocation / operations));
      const row = extracted.cases.find(value => value.shape === shape)[role === 'original' ? 'before' : 'after'];
      equal([row.fullExportedIdentity, row.exportedParameter], [benchmark.FullName, benchmark.Parameters]);
      equal([row.rawActual, row.retainedResult, row.warmup, row.overheadActual], [raw, result, warmup, overhead]);
      equal([row.reportedStatistics, row.reportedMemory], [stats, benchmark.Memory]);
      near(row.reportedMeanNs, calculated);
      near(row.reportedSdNs, Math.sqrt(variance));
      near(row.reportedCvPercent, 100 * Math.sqrt(variance) / calculated);
      near(row.allEightUnfilteredActualMeanNs, mean(raw.map(value => value.ns / value.operations)));
      equal(row.allocatedProcessBytesPerOperation, benchmark.Memory.BytesAllocatedPerOperation);
      actuals += raw.length;
      retained += result.length;
      warmups += warmup.length;
      overheads += overhead.length;
      reports++;
    }
  }
  for (const row of extracted.cases) {
    near(row.meanTimeRatio, row.after.reportedMeanNs / row.before.reportedMeanNs);
    near(row.meanTimeChangePercent, 100 * (row.meanTimeRatio - 1));
    near(row.allEightUncompensatedRawTimeRatio, row.after.allEightUnfilteredActualMeanNs / row.before.allEightUnfilteredActualMeanNs);
    equal(row.allocationChangeBytesPerOperation, row.after.allocatedProcessBytesPerOperation - row.before.allocatedProcessBytesPerOperation);
    if (row.allocationChangeBytesPerOperation) observedAllocationChanges.push({
      comparison: index, candidateVariant: variant, shape: row.shape,
      before: row.before.allocatedProcessBytesPerOperation, after: row.after.allocatedProcessBytesPerOperation,
    });
    const final = analysis.cases.find(value => value.shape === row.shape).comparisons.find(value => value.comparison === index);
    equal(final.candidateVariant, variant);
    for (const [key, value] of Object.entries({
      originalMeanNs: row.before.reportedMeanNs, candidateMeanNs: row.after.reportedMeanNs,
      meanTimeChangePercent: row.meanTimeChangePercent, allEightUncompensatedRawTimeRatio: row.allEightUncompensatedRawTimeRatio,
      originalCvPercent: row.before.reportedCvPercent, candidateCvPercent: row.after.reportedCvPercent,
    })) near(final[key], value);
    equal([final.originalAllocatedProcessBytesPerOperation, final.candidateAllocatedProcessBytesPerOperation,
      final.originalRetainedResults, final.candidateRetainedResults],
    [row.before.allocatedProcessBytesPerOperation, row.after.allocatedProcessBytesPerOperation, row.before.reportedRetainedN, row.after.reportedRetainedN]);
  }
  equal([extracted.actualWorkloadIterations, extracted.actualRetainedResults, extracted.actualWarmups, extracted.actualOverheadIterations],
    [actuals - before.actuals, retained - before.retained, warmups - before.warmups, overheads - before.overheads]);
  const final = analysis.comparisons.find(value => value.id === index);
  equal([final.sha256, final.candidateVariant, final.order], [sha(`analysis-comparison-${index}.json`), variant, execution.order]);
}
equal(analysis.observedAllocationChanges, observedAllocationChanges);
equal(evaluation.unmodifiedFallbackAllocationObservationRetained, observedAllocationChanges);
equal([analysis.totals.profiles, analysis.totals.reports, analysis.totals.raw, analysis.totals.retained,
  analysis.totals.upperFiltered, analysis.totals.warmups, analysis.totals.overheads],
  [6, reports, actuals, retained, actuals - retained, warmups, overheads]);
equal([reports, actuals, warmups], [84, 672, 252]);
equal([freshRows, borrowedRows, producers, setups, validations, pdbBindings, sourceSnapshots, settingsRecords],
  [84, 27, 108, 168, 168, 84, 623, 168]);
for (const relative of ['format-validation/execution.json', 'format-validation-native-specialization-002/execution.json']) {
  const entries = json(relative);
  equal(entries.map(value => value.label).sort(), ['core', 'owning-tests']);
  assert(entries.every(value => value.actualExitCode === 0 && value.arguments.includes('--verify-no-changes')));
}
const borrowed = json('preparation-attempts/attempt-001/borrowed-current-producer.json');
const oldManifest = json('preparation-attempts/attempt-001/borrowed-manifest-captured-default-json.json');
equal(borrowed.priorManifestSha256, sha('preparation-attempts/attempt-001/borrowed-manifest-captured-default-json.json'));
equal([borrowed.actualDefaultRevisionUnchanged, borrowed.currentDefault, borrowed.newProducerBuildClaimed,
  borrowed.repositoryOutputsModified, borrowed.f013ActualTargetedSendCharacterizationRequired, borrowed.priorF011GroupResultsReusedAsTargetedSendProof],
  [true, investigation.currentDefault, false, false, true, false]);
for (const row of borrowed.files) {
  equal(row.sha256, physical(oldManifest, row.name).sha256);
  equal(row.sha256, physical(manifests.get('captured-default-json'), row.name).sha256);
}
const memory = json('investigation/bdn-memory-accounting/borrowed-provenance.json');
equal(memory.newSourceFetchOrDelegateInstrumentation, false);
equal(memory.priorProvenanceSha256, sha('investigation/bdn-memory-accounting/provenance.json'));
equal(memory.sourceSha256, sha('investigation/bdn-memory-accounting/GcStats.cs'));
equal(memory.currentMeasuredBdnDllSha256, physical(manifests.get('original'), 'BenchmarkDotNet.dll').sha256);
if (live) {
  const repo = String.raw`C:\src\aspnetcore`;
  const git = arguments_ => {
    const result = spawnSync('git', arguments_, { cwd: repo });
    equal(result.status, 0);
    return result.stdout.toString().trim();
  };
  equal(git(['branch', '--show-current']), investigation.branch);
  equal(git(['rev-parse', 'HEAD']), investigation.baseline);
  equal(git(['diff', '--cached', '--name-only']), '');
  const expected = ['src/SignalR/server/Core/src/DefaultHubLifetimeManager.cs',
    'src/SignalR/server/SignalR/test/Microsoft.AspNetCore.SignalR.Tests/DefaultHubLifetimeManagerTests.cs'];
  equal(git(['diff', '--name-only']).split(/\r?\n/).sort(), expected.sort());
  for (const source of investigation.sources) {
    const selected = source.file.endsWith('\\DefaultHubLifetimeManager.cs')
      ? 'owner/DefaultHubLifetimeManager.cs'
      : source.file.endsWith('\\DefaultHubLifetimeManagerTests.cs') ? 'test/DefaultHubLifetimeManagerTests.cs' : null;
    equal(hash(fs.readFileSync(path.join(repo, source.file))), selected
      ? sha(`sources/native-specialization-002/${selected}`) : source.workingSha256);
  }
}
let copyMappings = 0;
if (fs.existsSync(file('authoritative-copy-manifest.json'))) {
  for (const row of json('authoritative-copy-manifest.json')) {
    const data = bytes(row.destination);
    equal([data.length, hash(data)], [row.bytes, row.sha256]);
    copyMappings++;
  }
}
const report = {
  candidate: 'F013', auditPassed: true, actualLiveAuditPassed: live, portableAudit: !live,
  proposalDisposition: 'no-gain', performancePrJustified: false, recommendedShippingSourceChange: false,
  sourceCandidateShapesMeasured: 2, pairedComparisons: 3, originalProfiles: 3, candidateProfiles: 3,
  originalOnlyDiagnosticProfiles: 0, benchmarkOutcomes: reports, actualWorkloadIterations: actuals,
  retainedResults: retained, upperFilteredSamples: actuals - retained, actualWarmups: warmups,
  actualOverheadIterations: overheads, overheadDistribution, budgetClosed: true,
  actualFreshOwningTestRuns: 3, actualFreshOwningRows: freshRows, explicitlyReusedOriginalAreaRows: borrowedRows,
  failedOwningPreparationBuilds: 1, failedPreparationOwningAssertionsReached: 0,
  inheritedSpecificationRowsPerFreshSuite: 12, actualTheoryRowsPerFreshSuite: 4,
  newPreservationTest: testName, repositoryAlwaysTestSentinelRows: 0,
  producerRecordsAudited: producers, actualTimedSetupPreflightsAudited: setups, validatedBenchmarkRecordsAudited: validations,
  pePdbBindings: pdbBindings, sourcePdbDocumentChecks: pdbDocuments, sourceSnapshotsVerified: sourceSnapshots,
  capturedSettingsRecords: settingsRecords, liveUniqueImageFilesRehashed: liveImages.size,
  portableOmissionReferencesVerified: omittedRecords, copiedMappingsVerified: copyMappings,
  observedProcessWideAllocationChanges: observedAllocationChanges,
  analysisSha256: sha('analysis.json'), auditorSourceSha256: hash(fs.readFileSync(fileURLToPath(import.meta.url))),
  independentlyRecomputed: 'All84 fresh plus27 explicitly borrowed TRX result/definition/entry identities, positive durations and every16/17 array/List Theory payload; inherited source Fact catalogs;20 original/current source triples;623 source snapshots;108 actual producer records;168 setup and168 cleanup/frame/recipient records;84 captured PE/PDB witness consistency;672 raw samples, overhead compensation and upper filtering, sample statistics/R7 quantiles/confidence-bound arithmetic; actual process-wide GC midpoint-even allocation rounding; distinct source variants and3-slot accounting.',
  boundary: 'Actual public targeted sends, real JSON getters and transport frames/Pipes establish producer reachability and recipient/backpressure/cancellation effects. Snapshot-input controls are not indexed owner implementations. First variant measured once, second twice; no pooled3-replication claim. Captured-default JSON bytes and old27-row preparation evidence are explicitly reused, not new builds/suite runs or borrowed group/broadcast timing. Fresh unchanged-original and each candidate actually run28 owning rows. Shared host; no OS/power/priority/affinity changes or isolation claim. Portable mode cannot rehash omitted DLL/PDB/binlogs or replay actual PE/PDB bindings. Witnesses are bounded, not full build provenance/method coverage. Confidence critical values and source-to-BDN DLL binding are not independently derived.',
};
if (verify) {
  const previous = json('measurement-audit.json');
  for (const key of ['candidate', 'auditPassed', 'proposalDisposition', 'performancePrJustified', 'sourceCandidateShapesMeasured',
    'pairedComparisons', 'benchmarkOutcomes', 'actualWorkloadIterations', 'retainedResults', 'upperFilteredSamples',
    'actualWarmups', 'actualOverheadIterations', 'actualFreshOwningRows', 'explicitlyReusedOriginalAreaRows',
    'producerRecordsAudited', 'actualTimedSetupPreflightsAudited', 'validatedBenchmarkRecordsAudited',
    'pePdbBindings', 'sourcePdbDocumentChecks', 'sourceSnapshotsVerified', 'capturedSettingsRecords',
    'observedProcessWideAllocationChanges', 'analysisSha256', 'auditorSourceSha256']) equal(report[key], previous[key]);
} else {
  assert(live && !fs.existsSync(file('measurement-audit.json')));
  fs.writeFileSync(file('measurement-audit.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(`F013 ${live ? 'live' : 'portable'} audit passed: ${reports} reports/${actuals} raw/${retained} retained/${warmups} warmups/${overheads} overheads;84 fresh+27 explicitly borrowed owning rows;${producers} producer/${setups} setup/${validations} delivery records;${pdbBindings} PE-PDB/${pdbDocuments} docs/${sourceSnapshots} source snapshots/${settingsRecords} settings. No-gain,2 variants/3 closed comparisons.`);
