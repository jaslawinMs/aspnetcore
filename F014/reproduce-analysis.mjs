import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const supplied = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const live = supplied === null;
const verify = process.argv.includes('--verify');
const root = live ? path.join(path.dirname(fileURLToPath(import.meta.url)), 'autoperf-runs', 'F014') : path.resolve(supplied);
const file = relative => path.join(root, ...relative.split(/[\\/]/));
const text = relative => fs.readFileSync(file(relative), 'utf8').replace(/^\uFEFF/, '');
const json = relative => JSON.parse(text(relative));
const basename = value => value.split(/[\\/]/).at(-1);
const sha = (bytes, algorithm = 'sha256') => crypto.createHash(algorithm).update(bytes).digest('hex').toUpperCase();
const equal = (one, two) => assert.deepEqual(one, two);
const canonical = value => value.replaceAll('\r\n', '\n');
const near = (one, two) => assert(Math.abs(one - two) <= Math.max(1e-5, Math.abs(two) * 1e-9), `Numeric mismatch: ${one}/${two}`);
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
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
const shapes = [
  'NoConnections512', 'EmptyTargets', 'Small4List2', 'C32List64Miss', 'C32Array64Miss', 'C32ReadOnly64Miss',
  'C128List256Miss', 'C128Array256Miss', 'C32List64Sparse', 'C32Array64Sparse',
  'C32List64All', 'C32DupList64', 'C32SharedUserList64', 'C32NullUsersArray64',
];
const stateRows = relative => fs.readdirSync(file(relative)).filter(name => name.endsWith('.json')).sort()
  .map(name => ({ name, data: json(relative + '/' + name) }));
const only = (rows, suffix) => {
  const matches = rows.filter(row => row.name.endsWith(suffix));
  equal(matches.length, 1);
  return matches[0].data;
};
const investigation = json('current-source-investigation.json');
equal(investigation.sources.length, 23);
equal(investigation.currentDefault, json('investigation/fresh-current-default.json').sha);
equal(investigation.baseline, '37e809ead5824bc753a1c3d56f11615bdb1296c5');
equal(investigation.branch, 'autoperf/F014-signalr-user-membership');
equal(investigation.differingSelectedSources, ['src\\SignalR\\common\\Protocols.Json\\src\\Protocol\\JsonHubProtocol.cs']);
for (const source of investigation.sources) {
  for (const [directory, key] of [['baseline-canonical', 'baselineSha256'],
    ['current-default-canonical', 'currentDefaultSha256'], ['producer-source', 'workingSha256']]) {
    equal(sha(fs.readFileSync(file(directory + '/' + source.file))), source[key]);
  }
  equal(canonical(text('baseline-canonical/' + source.file)), canonical(text('producer-source/' + source.file)));
  equal(canonical(text('baseline-canonical/' + source.file)) === canonical(text('current-default-canonical/' + source.file)),
    source.canonicalEqual);
}
assert(text('investigation/selected-source-delta.patch').includes('+            if (message.Headers is Dictionary<string, string> headers)'));
const related = json('investigation/related-pr-69189.json');
equal(related.author.login, 'davidfowl');
const ownerPatch = text('investigation/related-pr-69189.patch')
  .split('diff --git a/src/SignalR/server/Core/src/DefaultHubLifetimeManager.cs')[1].split('diff --git ')[0];
assert(ownerPatch.includes('SendConnectionsAsync') && ownerPatch.includes('connectionIds.Count > 16'));
assert(!/^[+-](?![+-]).*SendUsersAsync/m.test(ownerPatch));
equal(json('acceptance.json').maximum_original_only_diagnostic_profiles, 1);
equal(json('candidate-selection.json').selectedShippingSourceCandidates, 0);

const manifests = new Map();
let sourceSnapshots = 0;
let liveImageFiles = 0;
for (const role of ['original', 'captured-default-json']) {
  const manifest = json(`manifest-${role}.json`);
  manifests.set(role, manifest);
  equal(manifest.files.length, 80);
  equal(manifest.sources.length, 90);
  for (const row of manifest.sources) {
    const bytes = fs.readFileSync(file(`sources/${role}/${row.path}`));
    equal(bytes.length, row.bytes);
    equal(sha(bytes), row.sha256);
    sourceSnapshots++;
  }
  if (live) {
    for (const row of manifest.files) {
      const bytes = fs.readFileSync(file(`images/${role}/${row.path}`));
      equal(bytes.length, row.bytes);
      equal(sha(bytes), row.sha256);
      liveImageFiles++;
    }
  }
  equal(canonical(text(`sources/${role}/owner/DefaultHubLifetimeManager.cs`)),
    canonical(text('producer-source/src/SignalR/server/Core/src/DefaultHubLifetimeManager.cs')));
}
const original = manifests.get('original');
const current = manifests.get('captured-default-json');
const physical = (manifest, name) => {
  const rows = manifest.files.filter(row => row.path === name);
  equal(rows.length, 1);
  return rows[0];
};
const changed = current.files.filter(row => row.sha256 !== physical(original, row.path).sha256).map(row => row.path).sort();
equal(changed, ['Microsoft.AspNetCore.SignalR.Protocols.Json.dll', 'Microsoft.AspNetCore.SignalR.Protocols.Json.pdb']);
equal(current.actualChangedImageFiles.slice().sort(), changed);
const sourceChanges = current.sources.filter(row => {
  const before = original.sources.find(value => value.path === row.path);
  assert(before);
  return before.sha256 !== row.sha256;
}).map(row => row.path);
equal(sourceChanges, ['producer\\JsonHubProtocol.cs']);
equal(sha(fs.readFileSync(file('sources/captured-default-json/producer/JsonHubProtocol.cs'))),
  investigation.sources.find(row => row.file.endsWith('\\Protocol\\JsonHubProtocol.cs')).currentDefaultSha256);
assert(text('sources/original/harness/AutoPerf.Benchmarks.csproj').includes('<LangVersion>13</LangVersion>'));
equal(sha(fs.readFileSync(file('sources/original/harness/SettingsPreservingEmitToolchain.cs'))),
  json('preparation-attempts/attempt-001/toolchain-attribution.json').sha256);

const defaultProvider = text('sources/original/owner/DefaultUserIdProvider.cs');
assert(defaultProvider.includes('return connection.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;'));
for (const [snapshot, selected] of [
  ['owner/DefaultUserIdProvider.cs', 'src/SignalR/server/Core/src/DefaultUserIdProvider.cs'],
  ['owner/IUserIdProvider.cs', 'src/SignalR/server/Core/src/IUserIdProvider.cs'],
  ['producer/IConnectionUserFeature.cs', 'src/Servers/Connections.Abstractions/src/Features/IConnectionUserFeature.cs'],
]) equal(canonical(text('sources/original/' + snapshot)), canonical(text('producer-source/' + selected)));
for (const name of ['provider-history', 'context-history']) {
  const history = json('investigation/' + name + '.json');
  assert(Array.isArray(history) && history.length > 0 && history.length <= 3);
}
const test = json('tests/original/actual-test-audit.json');
const trx = text('tests/original/owning-original.trx');
const unescape = value => value.replaceAll('&quot;', '"').replaceAll('&apos;', "'")
  .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
const attrs = value => Object.fromEntries([...value.matchAll(/([\w:.-]+)="([^"]*)"/g)]
  .map(match => [match[1], unescape(match[2])]));
const results = [...trx.matchAll(/<UnitTestResult\b([^>]*?)(?:\/>|>[\s\S]*?<\/UnitTestResult>)/g)].map(match => attrs(match[1]));
const definitions = [...trx.matchAll(/<UnitTest\b([^>]*)>([\s\S]*?)<\/UnitTest>/g)].map(match => ({
  ...attrs(match[1]), method: attrs(match[2].match(/<TestMethod\b([^>]*)\/>/)[1]),
  execution: attrs(match[2].match(/<Execution\b([^>]*)\/>/)[1]),
}));
const entries = [...trx.matchAll(/<TestEntry\b([^>]*)\/>/g)].map(match => attrs(match[1]));
equal([results.length, definitions.length, entries.length, test.passed, test.failed, test.skipped, test.areaRows, test.sentinelRows],
  [27, 27, 27, 27, 0, 0, 27, 0]);
equal(new Set(results.map(row => row.testId)).size, 27);
equal(new Set(results.map(row => row.executionId)).size, 27);
const catalog = [];
for (const source of ['DefaultHubLifetimeManagerTests.cs', 'HubLifetimeManagerTestBase.cs']) {
  const content = text('sources/original/test/' + source);
  for (const match of content.matchAll(/\[Fact\]\s+public (?:async )?(?:void|Task) (\w+)\(/g)) {
    catalog.push({ source, name: match[1], rows: 1 });
  }
  for (const match of content.matchAll(/\[Theory\]([\s\S]*?)public (?:async )?(?:void|Task) (\w+)\(/g)) {
    const data = [...match[1].matchAll(/\[InlineData\((\d+), (true|false)\)\]/g)].map(value => [Number(value[1]), value[2] === 'true']);
    equal(data, [[16, false], [16, true], [17, false], [17, true]]);
    catalog.push({ source, name: match[2], rows: 4, data });
  }
}
equal(catalog.filter(row => row.rows === 1).length, 23);
equal(catalog.filter(row => row.rows === 4).length, 1);
equal(catalog.filter(row => row.source === 'HubLifetimeManagerTestBase.cs').length, 12);
for (const result of results) {
  equal(result.outcome, 'Passed');
  assert(/^\d\d:\d\d:\d\d\.\d+$/.test(result.duration) && Number(result.duration.replaceAll(':', '')) > 0);
  const matches = definitions.filter(row => row.id === result.testId);
  equal(matches.length, 1);
  const definition = matches[0];
  equal(definition.method.className, 'Microsoft.AspNetCore.SignalR.Tests.DefaultHubLifetimeManagerTests');
  equal(definition.execution.id, result.executionId);
  equal(entries.filter(row => row.testId === result.testId && row.executionId === result.executionId).length, 1);
  const saved = test.rows.filter(row => row.testId === result.testId);
  equal(saved.length, 1);
  equal([saved[0].method, saved[0].class, saved[0].displayName, saved[0].executionId, saved[0].duration, saved[0].outcome],
    [definition.method.name, definition.method.className, result.testName, result.executionId, result.duration, result.outcome]);
}
for (const method of catalog) {
  const matching = definitions.filter(row => row.method.name === method.name);
  equal(matching.length, method.rows);
  if (method.data) {
    const payloads = matching.map(row => {
      const display = results.find(value => value.testId === row.id).testName;
      const match = display.match(/\(targetCount: (\d+), useList: (True|False)\)$/);
      assert(match);
      return [Number(match[1]), match[2] === 'True'];
    });
    equal(payloads.sort(), method.data.slice().sort());
  }
}
for (const row of test.binaryHashes) {
  equal(row.sha256, physical(original, basename(row.path)).sha256);
}
const testedCapture = json('preparation-attempts/attempt-001/additional-tested-image-capture.json');
equal([testedCapture.capturedAfterOriginalTestExecution, testedCapture.testsRebuiltOrRerun, testedCapture.files.length], [true, false, 6]);
if (live) {
  for (const row of testedCapture.files) {
    equal(sha(fs.readFileSync(file('tests/original/test-image/' + row.name))), row.sha256);
  }
}

let pdbBindings = 0;
let pdbDocuments = 0;
let producers = 0;
let setups = 0;
let validations = 0;
let settingsRecords = 0;
const runtimes = [];
const expectedCases = [
  'UserScopeCaseDuplicatesAndMultipleConnections', 'DefaultUserIdProviderProducesAbsentClaimNulls',
  'EmptyConnectionStoreDoesNotReadTargets', 'AllMissingDoesNotSerializeCanceledSend',
  'JsonPayloadSerializedOnceForAllRecipients', 'LiveArrayMutationAtJsonGetter', 'SnapshotInputControlArray',
  'LiveListMutationAtJsonGetter', 'SnapshotInputControlList', 'LiveReadOnlyWrapperMutationAtJsonGetter',
  'SnapshotInputControlReadOnlyWrapper', 'CustomCollectionContainsDispatch', 'SnapshotInputControlCustomDispatch',
  'DerivedListRetainsCustomContainsDispatch', 'RepeatedMissEnumerationC1T1', 'RepeatedMissEnumerationC8T16',
  'RepeatedMissEnumerationC32T64', 'PendingWritesWaitForEveryPipe', 'PendingWritesCancelThroughActualPipes',
];
const idList = count => Array.from({ length: count }, (_, index) => `c${String(index).padStart(4, '0')}`);
const userList = count => Array.from({ length: count }, (_, index) => `user-${String(index).padStart(4, '0')}`);
function identifiers(actual, ids, users) {
  equal(actual.actualUserIdProvider, 'Microsoft.AspNetCore.SignalR.DefaultUserIdProvider');
  equal(actual.userIdentifiersProducedDuringSetup, true);
  equal(actual.connections.map(row => [row.id, row.userIdentifier, row.actualNameIdentifierClaim]),
    ids.map((id, index) => [id, users[index], users[index]]));
}
function wire(frame) {
  assert(frame.endsWith('\x1e'));
  const message = JSON.parse(frame.slice(0, -1));
  equal([message.type, message.target, message.arguments.length], [1, 'Probe', 1]);
  assert(!('headers' in message));
  const value = typeof message.arguments[0] === 'string' ? message.arguments[0] : message.arguments[0].value;
  equal(value, 'World');
}
function delivery(actual, expected, single = false) {
  equal(actual.calls, 1);
  equal(actual.expectedRecipientCount, single ? 1 : expected.length);
  equal(actual.expectedRecipientIdentityPredetermined, !single);
  if (single) {
    equal(actual.expectedRecipients, null);
    equal(actual.actualRecipients.length, 1);
    assert(idList(8).includes(actual.actualRecipients[0]));
  } else {
    equal(actual.actualRecipients.slice().sort(), expected.slice().sort());
    equal(actual.expectedRecipients.slice().sort(), expected.slice().sort());
  }
  for (const connection of actual.connections) {
    equal(connection.aborted, false);
    equal(connection.boundedCapacity, 256);
    const receives = actual.actualRecipients.includes(connection.id);
    equal(connection.frames, receives ? 1 : 0);
    equal(connection.bytes, receives ? Buffer.byteLength(connection.lastFrame) : 0);
    if (receives) wire(connection.lastFrame);
    else equal(connection.lastFrame, '');
  }
}
function producer(record) {
  equal(record.passed, true);
  assert(expectedCases.includes(record.caseName));
  const name = record.caseName;
  const value = record.observation;
  if (name === 'UserScopeCaseDuplicatesAndMultipleConnections') {
    equal(value.targetCount, 64);
    delivery(value.actual, ['c-lower', 'c-outside', 'c-shared']);
    identifiers(value.actual, ['c-lower', 'c-upper', 'c-title', 'c-outside', 'c-shared'],
      ['user', 'USER', 'User', 'outside', 'user']);
  }
  if (name === 'DefaultUserIdProviderProducesAbsentClaimNulls') {
    equal(value.absentNameIdentifierClaims, 2);
    delivery(value.actual, ['named']);
    identifiers(value.actual, ['named', 'unnamed-a', 'unnamed-b'], ['user', null, null]);
  }
  if (name === 'EmptyConnectionStoreDoesNotReadTargets') {
    equal([value.argumentGetterReads, value.actual.connections.length, value.targetCountReads,
      value.inputReadsBeyondCount], [0, 0, 0, 0]);
    delivery(value.actual, []);
    identifiers(value.actual, [], []);
  }
  if (name === 'AllMissingDoesNotSerializeCanceledSend') {
    equal([value.argumentGetterReads, value.canceledToken], [0, true]);
    delivery(value.actual, []);
    identifiers(value.actual, idList(2), ['user-0', 'user-1']);
  }
  if (name === 'JsonPayloadSerializedOnceForAllRecipients') {
    equal(value.argumentGetterReads, 1);
    delivery(value.actual, idList(3));
    identifiers(value.actual, idList(3), ['user-0', 'user-1', 'user-2']);
  }
  if (/^(Live|SnapshotInputControl)(Array|List|ReadOnlyWrapper)/.test(name)) {
    const snapshot = name.startsWith('Snapshot');
    equal([value.snapshotInputControl, value.inputSnapshotIsShippingImplementation, value.implementedIndexedOwner,
      value.originalCount, value.finalCount, value.getterReads], [snapshot, false, false, 64, 64, 1]);
    equal(value.originalValuesAfterSend.slice(0, 8), userList(8).map(user => 'removed-' + user));
    equal(value.originalValuesAfterSend.slice(8),
      Array.from({ length: 56 }, (_, index) => `missing-${String(index).padStart(4, '0')}`));
    equal(value.wrapperIsReadOnly, value.shape !== 'List');
    equal(value.originalIsReadOnly, value.shape === 'Array');
    delivery(value.actual, snapshot ? idList(8) : [], !snapshot);
    identifiers(value.actual, idList(8), userList(8));
  }
  if (name === 'CustomCollectionContainsDispatch' || name === 'SnapshotInputControlCustomDispatch') {
    const snapshot = name.startsWith('Snapshot');
    equal([value.snapshotInputControl, value.inputSnapshotIsShippingImplementation, value.ContainsCalls,
      value.EnumeratorCalls, value.enumerationBeforeSend],
      [snapshot, false, snapshot ? 0 : 2, snapshot ? 1 : 0, snapshot ? 1 : 0]);
    equal(value.customComparison, 'OrdinalIgnoreCase');
    equal(value.snapshotComparison, snapshot ? 'Ordinal' : null);
    delivery(value.actual, snapshot ? [] : ['c-upper']);
    identifiers(value.actual, ['c-upper', 'c-other'], ['USER', 'other']);
  }
  if (name === 'DerivedListRetainsCustomContainsDispatch') {
    equal([value.targetCount, value.ContainsCalls, value.customComparison], [64, 2, 'OrdinalIgnoreCase']);
    delivery(value.actual, ['c-upper']);
    identifiers(value.actual, ['c-upper', 'c-other'], ['USER', 'other']);
  }
  if (name.startsWith('RepeatedMissEnumeration')) {
    equal([value.EnumeratorCalls, value.ValuesYielded, value.CountReads, value.IndexerReads, value.instrumentationTimed],
      [value.connectionCount, value.connectionCount * value.targetSize, 0, 0, false]);
    assert([[1, 1], [8, 16], [32, 64]].some(([connections, targets]) =>
      connections === value.connectionCount && targets === value.targetSize));
    delivery(value.actual, []);
    identifiers(value.actual, idList(value.connectionCount), userList(value.connectionCount));
  }
  if (name.startsWith('PendingWrites')) {
    const canceled = name === 'PendingWritesCancelThroughActualPipes';
    equal([value.actualPipes, value.pauseWriterThreshold, value.cancellationRequested, value.cancellationObserved,
      value.taskStatus, value.actualAbortedConnections, value.copiedFilterOrInjectedManagerCallback],
      [2, 1, canceled, canceled, canceled ? 'Canceled' : 'RanToCompletion', 0, false]);
    equal(value.actualUserIdentifiers, ['pipe-user-0', 'pipe-user-1']);
    equal(value.actualFrames.length, 2);
    value.actualFrames.forEach(wire);
  }
  producers++;
}
function setup(data) {
  assert(shapes.includes(data.shape));
  const expectedSize = data.shape === 'NoConnections512' ? 0 : data.shape === 'Small4List2' ? 4
    : data.shape.startsWith('C128') ? 128 : 32;
  const expectedTargets = data.shape === 'NoConnections512' ? 512 : data.shape === 'EmptyTargets' ? 0
    : data.shape === 'Small4List2' ? 2 : data.shape.startsWith('C128') ? 256 : 64;
  equal([data.connectionCount, data.targetSize], [expectedSize, expectedTargets]);
  const ids = idList(expectedSize);
  const expected = data.shape === 'Small4List2' || data.shape === 'C32DupList64' || data.shape === 'C32SharedUserList64'
    ? ids.slice(0, 2) : data.shape === 'C32List64All' ? ids
    : data.shape.endsWith('Sparse') ? ids.slice(0, 1) : [];
  delivery(data.actual, expected);
  const users = ids.map((_, index) => data.shape === 'C32NullUsersArray64' ? null
    : `user-${String(data.shape === 'C32SharedUserList64' ? Math.floor(index / 2) : index).padStart(4, '0')}`);
  identifiers(data.actual, ids, users);
  const type = data.actual.inputType;
  if (data.shape === 'NoConnections512' || data.shape.includes('Array')) equal(type, 'System.String[]');
  else if (data.shape.includes('ReadOnly')) assert(type.startsWith('System.Collections.ObjectModel.ReadOnlyCollection'));
  else assert(type.startsWith('System.Collections.Generic.List'));
  setups++;
}
for (const [relative, role, isTimed] of [
  ['characterization/original', 'original', false],
  ['characterization/captured-default-json', 'captured-default-json', false],
  ['measurements/original-diagnostic-only', 'original', true],
]) {
  const rows = stateRows(relative + '/states');
  const manifest = manifests.get(role);
  const witnesses = rows.filter(row => row.name.includes('-source-pdb-'));
  equal(witnesses.length, 7);
  for (const row of witnesses) {
    const value = row.data;
    equal(value.actualPePdbBindingMatched, true);
    equal(value.codeViewGuid, value.pdbGuid);
    const assembly = row.name.slice(row.name.indexOf('-source-pdb-') + '-source-pdb-'.length, -5) + '.dll';
    const binary = assembly.endsWith('.Tests.dll')
      ? testedCapture.files.find(entry => entry.name === assembly) : physical(manifest, assembly);
    const pdbName = assembly.replace(/\.dll$/, '.pdb');
    const pdb = assembly.endsWith('.Tests.dll')
      ? testedCapture.files.find(entry => entry.name === pdbName) : physical(manifest, pdbName);
    assert(binary && pdb);
    equal(value.assemblySha256, binary.sha256);
    equal(value.pdbSha256, pdb.sha256);
    pdbBindings++;
    for (const document of value.documents) {
      const name = basename(document.source);
      const source = manifest.sources.filter(entry => basename(entry.path) === name);
      equal(source.length, 1);
      const bytes = fs.readFileSync(file(`sources/${role}/${source[0].path}`));
      const algorithm = document.algorithm.toLowerCase() === '8829d00f-11b8-4213-878b-770e8597ac16' ? 'sha256'
        : document.algorithm.toLowerCase() === 'ff1816ec-aa5e-4d10-87f7-6f4963833460' ? 'sha1' : null;
      assert(algorithm);
      equal(sha(bytes, algorithm), document.checksum);
      equal(sha(bytes), document.sha256);
      pdbDocuments++;
    }
  }
  const coreWitness = witnesses.find(row => row.name.endsWith('-Microsoft.AspNetCore.SignalR.Core.json'));
  assert(coreWitness);
  equal(coreWitness.data.documents.map(row => basename(row.source)).sort(), [
    'DefaultHubLifetimeManager.cs', 'HubLifetimeManager.cs', 'HubConnectionContext.cs', 'HubConnectionContextOptions.cs',
    'HubConnectionStore.cs', 'SerializedHubMessage.cs', 'DefaultUserIdProvider.cs', 'HubGroupList.cs',
  ].sort());
  const runtime = only(rows, '-runtime.json');
  equal(runtime.ownerSha256, physical(original, 'Microsoft.AspNetCore.SignalR.Core.dll').sha256);
  equal(runtime.harnessSha256, physical(original, 'AutoPerf.Benchmarks.dll').sha256);
  equal(runtime.jsonProtocolSha256, physical(manifest, 'Microsoft.AspNetCore.SignalR.Protocols.Json.dll').sha256);
  equal([runtime.serverGc, runtime.sharedMachineNotIsolated], [true, true]);
  runtimes.push(runtime);
  const producerRows = rows.filter(row => row.name.endsWith('-producer.json'));
  equal(producerRows.length, isTimed ? 0 : 19);
  if (!isTimed) equal(producerRows.map(row => row.data.caseName), expectedCases);
  producerRows.forEach(row => producer(row.data));
  const setupRows = rows.filter(row => row.name.endsWith('-setup-preflight.json'));
  equal(setupRows.length, 14);
  equal(setupRows.map(row => row.data.shape).sort(), shapes.slice().sort());
  setupRows.forEach(row => setup(row.data));
  const validatedRows = rows.filter(row => row.name.endsWith('-benchmark-validated.json'));
  equal(validatedRows.length, 14);
  for (const row of validatedRows) {
    const value = row.data.actual;
    assert(value.calls > 0);
    const ready = setupRows.find(entry => entry.data.shape === row.data.shape).data.actual;
    equal(value.actualRecipients, ready.actualRecipients);
    equal(value.actualUserIdProvider, ready.actualUserIdProvider);
    equal(value.userIdentifiersProducedDuringSetup, true);
    equal(value.connections.map(row => [row.id, row.userIdentifier, row.actualNameIdentifierClaim]),
      ready.connections.map(row => [row.id, row.userIdentifier, row.actualNameIdentifierClaim]));
    for (const connection of value.connections) {
      const receiver = ready.actualRecipients.includes(connection.id);
      equal(connection.frames, receiver ? value.calls : 0);
      equal(connection.bytes, receiver ? value.calls * Buffer.byteLength(connection.lastFrame) : 0);
      equal(connection.aborted, false);
      if (receiver) wire(connection.lastFrame);
    }
    validations++;
  }
  const settings = rows.filter(row => /-settings-(before|after)\.json$/.test(row.name));
  equal(settings.length, isTimed ? 28 : 0);
  for (const row of settings) {
    equal(row.data, runtime.initialSettings);
    settingsRecords++;
  }
  if (isTimed) {
    equal(only(rows, '-completed.json').actualReports, 14);
  } else {
    const complete = only(rows, '-characterization-completed.json');
    equal([complete.contractChecks, complete.actualChecks, complete.actualTimedSetupsPreflighted, complete.passed], [19, 33, 14, true]);
  }
}
equal([producers, setups, validations, pdbBindings, pdbDocuments, sourceSnapshots, settingsRecords],
  [38, 42, 42, 21, 57, 180, 28]);
for (const runtime of runtimes) {
  equal([runtime.corelibSha256, runtime.serializerSha256, runtime.initialSettings],
    [runtimes[0].corelibSha256, runtimes[0].serializerSha256, runtimes[0].initialSettings]);
}

const analysis = json('analysis.json');
const measurement = 'measurements/original-diagnostic-only';
const exports = fs.readdirSync(file(measurement + '/results')).filter(name => name.endsWith('full.json'));
equal(exports.length, 1);
const data = json(measurement + '/results/' + exports[0]);
equal(data.Benchmarks.length, 14);
equal(sha(fs.readFileSync(file(measurement + '/results/' + exports[0]))), analysis.fullExportSha256);
const parts = text(measurement + '/console.log').split(/^\/\/ Benchmark: /m).slice(1);
equal(parts.length, 14);
let actuals = 0;
let retained = 0;
let warmups = 0;
let overheads = 0;
const overheadDistribution = {};
for (const benchmark of data.Benchmarks) {
  const shape = benchmark.FullName.match(/^AutoPerf\.UserSendBenchmarks\.Send\(Shape: (\w+)\)$/)?.[1];
  assert(shapes.includes(shape));
  const matches = parts.filter(value => value.slice(0, value.indexOf('\n')).trimEnd().endsWith(`[${benchmark.Parameters}]`));
  equal(matches.length, 1);
  const part = matches[0];
  assert(part.includes('PowerPlanMode=00000000-0000-0000-0000-000000000000') &&
    part.includes('Toolchain=SettingsPreservingEmitToolchain') && part.includes('IterationTime=100.0000 ms') &&
    part.includes('RunStrategy=Throughput'));
  const parse = kind => [...part.matchAll(new RegExp('^' + kind + '\\s+(\\d+):\\s+(\\d+) op, ([\\d.]+) ns,', 'gm'))]
    .map(match => ({ index: Number(match[1]), operations: Number(match[2]), ns: Number(match[3]) }));
  const actual = parse('WorkloadActual');
  const result = parse('WorkloadResult');
  const warmup = parse('WorkloadWarmup');
  const overhead = parse('OverheadActual');
  equal([actual.length, warmup.length], [8, 3]);
  assert(overhead.length > 0 && result.length >= 5);
  for (const rows of [actual, warmup, overhead]) equal(rows.map(row => row.index), rows.map((_, index) => index + 1));
  overheadDistribution[overhead.length] = (overheadDistribution[overhead.length] ?? 0) + 1;
  const normalized = result.map(row => row.ns / row.operations);
  const compensation = quantile(overhead.map(row => row.ns / row.operations), .5);
  const remaining = actual.map(row => row.ns / row.operations - compensation);
  for (const value of normalized) {
    const index = remaining.findIndex(other => Math.abs(value - other) < .001);
    assert(index >= 0);
    remaining.splice(index, 1);
  }
  assert(remaining.every(value => value >= Math.max(...normalized) - .001));
  const stats = benchmark.Statistics;
  equal(stats.N, normalized.length);
  equal(stats.OriginalValues.slice().sort((a, b) => a - b), normalized.slice().sort((a, b) => a - b));
  const calculated = mean(normalized);
  const variance = normalized.reduce((sum, value) => sum + (value - calculated) ** 2, 0) / (normalized.length - 1);
  for (const [key, value] of Object.entries({
    Mean: calculated, Variance: variance, StandardDeviation: Math.sqrt(variance), StandardError: Math.sqrt(variance / normalized.length),
    Min: Math.min(...normalized), Max: Math.max(...normalized), Q1: quantile(normalized, .25),
    Median: quantile(normalized, .5), Q3: quantile(normalized, .75),
  })) near(stats[key], value);
  near(stats.ConfidenceInterval.Lower, stats.Mean - stats.ConfidenceInterval.Margin);
  near(stats.ConfidenceInterval.Upper, stats.Mean + stats.ConfidenceInterval.Margin);
  equal(benchmark.Measurements.length, result.length);
  benchmark.Measurements.forEach((value, index) => {
    equal([value.IterationMode, value.IterationStage, value.Operations], ['Workload', 'Result', result[index].operations]);
    near(value.Nanoseconds, result[index].ns);
  });
  const gc = part.match(/^GC:\s+(\d+) (\d+) (\d+) (\d+) (\d+)/m);
  assert(gc);
  const [g0, g1, g2, bytes, operations] = gc.slice(1).map(Number);
  assert(operations > 0 && Number.isSafeInteger(bytes));
  equal([benchmark.Memory.Gen0Collections, benchmark.Memory.Gen1Collections, benchmark.Memory.Gen2Collections, benchmark.Memory.TotalOperations],
    [g0, g1, g2, operations]);
  equal(benchmark.Memory.BytesAllocatedPerOperation, roundEven(bytes / operations));
  const recorded = analysis.cases.find(row => row.shape === shape);
  assert(recorded);
  equal([recorded.originalExportedParameter, recorded.fullExportedIdentity], [benchmark.Parameters, benchmark.FullName]);
  equal([recorded.rawActual, recorded.retainedResult, recorded.warmup, recorded.overheadActual], [actual, result, warmup, overhead]);
  near(recorded.reportedMeanNs, calculated);
  near(recorded.reportedSdNs, Math.sqrt(variance));
  near(recorded.reportedCvPercent, 100 * Math.sqrt(variance) / calculated);
  near(recorded.allEightUnfilteredActualMeanNs, mean(actual.map(row => row.ns / row.operations)));
  equal(recorded.allocatedProcessBytesPerOperation, benchmark.Memory.BytesAllocatedPerOperation);
  actuals += actual.length;
  retained += result.length;
  warmups += warmup.length;
  overheads += overhead.length;
}
equal([actuals, warmups], [112, 42]);
assert(retained >= 70 && retained <= 112 && overheads > 0);
equal([analysis.actualWorkloadIterations, analysis.actualRetainedResults, analysis.actualWarmups, analysis.actualOverheadIterations],
  [actuals, retained, warmups, overheads]);
equal(analysis.cases.map(row => row.shape), shapes);
equal([analysis.pairedComparisons, analysis.candidateProfiles, analysis.shippingSourceCandidates], [0, 0, 0]);
const execution = json(measurement + '/execution.json');
equal(execution.actualExitCode, 0);
equal(execution.manifestSha256, sha(fs.readFileSync(file('manifest-original.json'))));
equal([execution.preImageHashesVerified, execution.postImageHashesVerified,
  execution.preSourceHashesVerified, execution.postSourceHashesVerified], [80, 80, 90, 90]);
const budget = json('measurement-budget.json');
equal([budget.maximumComparisons, budget.usedComparisons, budget.originalProfiles, budget.candidateProfiles,
  budget.originalOnlyDiagnosticProfiles, budget.closed], [3, 0, 1, 0, 1, true]);
const evaluation = json('final-evaluation.json');
equal(evaluation.disposition, 'rejected/design-blocked');
equal([evaluation.performancePrJustified, evaluation.originalFindingCostStillPresent,
  evaluation.notMeasuredComparativeNoGain, evaluation.notClaimingAllOptimizationsImpossible], [false, true, true, true]);
const memory = json('investigation/bdn-memory-accounting/provenance.json');
equal(sha(fs.readFileSync(file('investigation/bdn-memory-accounting/GcStats.cs'))), memory.source_sha256);
equal(physical(original, 'BenchmarkDotNet.dll').sha256, memory.currentMeasuredBdnDllSha256);
equal(memory.newSourceFetchOrDelegateInstrumentation, false);
for (const [relative, count] of [
  ['investigation-execution/attempt-001/execution.json', 2],
  ['preparation-execution/attempt-001/execution.json', 2],
  ['measurement-execution/attempt-001/execution.json', 2],
]) {
  const commands = json(relative);
  equal(commands.length, count);
  assert(commands.every(command => command.actualExitCode === 0));
}
equal(json('scaffold-execution/attempt-001/execution.json').actualExitCode, 0);
const preparation = json('preparation-attempts/attempt-001/execution.json');
equal([preparation.candidate, preparation.newOwningTestRuns, preparation.commands.length], ['F014', 0, 4]);
assert(preparation.commands.every(command => command.actualExitCode === 0));
equal(json('tests/original/execution.json').candidate, 'F011');
assert(json('tests/original/execution.json').commands.every(command => command.actualExitCode === 0));
const reused = json('tests/original/borrowed-evidence-provenance.json');
equal([reused.candidate, reused.actualNewOwningTestRuns, reused.actualPriorOriginalRowsReused,
  reused.newUserSendProducerObservationsRequired, reused.priorGroupBroadcastConnectionObservationsOrTimingReused],
  ['F014', 0, 27, true, false]);
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
  borrowed.repositoryOutputsModified, borrowed.f014ActualUserSendCharacterizationRequired,
  borrowed.priorGroupBroadcastConnectionResultsReusedAsUserSendProof], [true, investigation.currentDefault, false, false, true, false]);
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
equal([scaffold.candidate, scaffold.files.length, scaffold.actualUserSendEntryPoints], ['F014', 6, 2]);
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
  if (live) equal(sha(fs.readFileSync(path.join(String.raw`C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.SignalR.Protocols.Json\Release\net12.0`, row.name))),
    row.actualSha256);
}
if (live) {
  for (const source of investigation.sources) {
    equal(sha(fs.readFileSync(path.join(String.raw`C:\src\aspnetcore`, source.file))), source.workingSha256);
  }
  const git = spawnSync('git', ['diff', '--name-only'], { cwd: String.raw`C:\src\aspnetcore` });
  equal(git.status, 0);
  equal(git.stdout.length, 0);
  const branch = spawnSync('git', ['branch', '--show-current'], { cwd: String.raw`C:\src\aspnetcore` });
  equal(branch.stdout.toString().trim(), investigation.branch);
}
let copyMappings = 0;
if (fs.existsSync(file('authoritative-copy-manifest.json'))) {
  for (const row of json('authoritative-copy-manifest.json')) {
    const bytes = fs.readFileSync(file(row.destination));
    equal(bytes.length, row.bytes);
    equal(sha(bytes), row.sha256);
    copyMappings++;
  }
}
const report = {
  candidate: 'F014', auditPassed: true, actualLiveAuditPassed: live, portableAudit: !live,
  proposalDisposition: 'rejected/design-blocked', performancePrJustified: false, shippingSourceChanged: false,
  originalOnlyDiagnosticProfiles: 1, pairedComparisons: 0, candidateProfiles: 0, benchmarkOutcomes: 14,
  actualWorkloadIterations: actuals, retainedResults: retained, upperFilteredSamples: actuals - retained,
  actualWarmups: warmups, actualOverheadIterations: overheads, overheadDistribution,
  existingAreaRows: 27, explicitlyReusedOriginalAreaRows: 27, actualNewOwningTestRuns: 0,
  repositoryAlwaysTestSentinelRows: 0, inheritedSpecificationRows: 12,
  sourceFactMethods: 23, actualTheoryRows: 4, producerRecordsAudited: producers,
  actualTimedSetupPreflightsAudited: setups, validatedBenchmarkRecordsAudited: validations,
  pePdbBindings: pdbBindings, sourcePdbDocumentChecks: pdbDocuments, sourceSnapshotsVerified: sourceSnapshots,
  liveImageFilesRehashed: liveImageFiles, capturedSettingsRecords: settingsRecords,
  copiedMappingsVerified: copyMappings, budgetClosed: true, originalFindingCostStillPresent: true,
  maximumOriginalCvPercent: Math.max(...analysis.cases.map(row => row.reportedCvPercent)),
  analysisSha256: sha(fs.readFileSync(file('analysis.json'))),
  auditorSourceSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))),
  independentlyRecomputed: 'All 27 explicitly reused original F011 TRX result/definition/entry identities, positive durations and four exact theory payloads; 12 inherited source Facts; original/current source triples; frozen source hashes; 38 real user-ID/default-provider/JSON/dispatch/Pipe records, 42 timed setups and 42 cleanup/delivery records; source/PDB witness consistency; 112 raw samples, overhead compensation and upper filtering, sample statistics/R7 quantiles/confidence-bound arithmetic, process-wide GC midpoint-even allocation rounding.',
  boundary: 'Real JSON argument getters and actual transport frames/Pipes establish producer reachability and recipient, backpressure and cancellation effects. Snapshot-input controls use the unchanged owner, not a compiled indexed implementation or shipping fix. Identical prior F011 original owner/tests/current JSON bytes are explicitly reused/rehashed; all F014 user-send observations and timing execute independently. No new owning-suite run/current producer build or F011/F012/F013 timing reuse. Actual public DefaultUserIdProvider setup is outside timing; no internal protocol handshake claim. Only captured-default JSON source is substituted against baseline SDK/dependencies; not whole-main integration. Captured PE/PDB witnesses are bounded, not full build provenance/method coverage. Portable mode cannot rehash omitted DLL/PDB/binlogs or independently replay PE/PDB bindings. Confidence critical values and source-to-BDN DLL binding are not independently derived.',
};
if (verify) {
  const previous = json('measurement-audit.json');
  for (const key of ['candidate', 'auditPassed', 'proposalDisposition', 'benchmarkOutcomes', 'actualWorkloadIterations',
    'retainedResults', 'actualWarmups', 'actualOverheadIterations', 'existingAreaRows', 'inheritedSpecificationRows',
    'producerRecordsAudited', 'actualTimedSetupPreflightsAudited', 'validatedBenchmarkRecordsAudited',
    'pePdbBindings', 'sourcePdbDocumentChecks', 'sourceSnapshotsVerified', 'analysisSha256', 'auditorSourceSha256']) {
    equal(report[key], previous[key]);
  }
} else {
  assert(live && !fs.existsSync(file('measurement-audit.json')));
  fs.writeFileSync(file('measurement-audit.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(`F014 ${live ? 'live' : 'portable'} audit passed: 14 original reports / ${actuals} raw / ${retained} retained / ${warmups} warmups / ${overheads} overheads; ` +
  '27 area rows, 38 producer / 42 setup / 42 delivery records, 21 PE-PDB / 57 docs, 180 source snapshots, 28 settings. No candidate/comparison/gain.');
