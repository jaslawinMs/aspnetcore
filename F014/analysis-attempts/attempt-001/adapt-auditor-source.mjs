import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F014');
const original = fs.readFileSync(path.join(session, 'F012-reproduce-analysis.mjs'));
let content = original.toString('utf8').replaceAll('\r\n', '\n').replaceAll('F012', 'F014');
const changes = [];
function edit(before, after, count = 1) {
  assert.equal(content.split(before).length - 1, count, before);
  content = content.replaceAll(before, after);
  changes.push({ before, after, actualOccurrences: count });
}
function section(start, end, replacement) {
  const first = content.indexOf(start);
  const last = content.indexOf(end, first + start.length);
  assert(first >= 0 && last > first);
  content = content.slice(0, first) + replacement + content.slice(last);
  changes.push({ sectionStart: start, sectionEnd: end, replacementSha256: hash(Buffer.from(replacement)) });
}
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
section("const shapes = [", 'const stateRows =', `const shapes = [
  'NoConnections512', 'EmptyTargets', 'Small4List2', 'C32List64Miss', 'C32Array64Miss', 'C32ReadOnly64Miss',
  'C128List256Miss', 'C128Array256Miss', 'C32List64Sparse', 'C32Array64Sparse',
  'C32List64All', 'C32DupList64', 'C32SharedUserList64', 'C32NullUsersArray64',
];
`);
edit('equal(investigation.sources.length, 20);', 'equal(investigation.sources.length, 23);');
edit('autoperf/F014-signalr-broadcast-exclusions', 'autoperf/F014-signalr-user-membership');
edit('.*SendAllExceptAsync/m', '.*SendUsersAsync/m');
edit('equal(manifest.sources.length, 89);', 'equal(manifest.sources.length, 90);');
section('const expectedCases =', 'function wire(frame)', `const expectedCases = [
  'UserScopeCaseDuplicatesAndMultipleConnections', 'DefaultUserIdProviderProducesAbsentClaimNulls',
  'EmptyConnectionStoreDoesNotReadTargets', 'AllMissingDoesNotSerializeCanceledSend',
  'JsonPayloadSerializedOnceForAllRecipients', 'LiveArrayMutationAtJsonGetter', 'SnapshotInputControlArray',
  'LiveListMutationAtJsonGetter', 'SnapshotInputControlList', 'LiveReadOnlyWrapperMutationAtJsonGetter',
  'SnapshotInputControlReadOnlyWrapper', 'CustomCollectionContainsDispatch', 'SnapshotInputControlCustomDispatch',
  'DerivedListRetainsCustomContainsDispatch', 'RepeatedMissEnumerationC1T1', 'RepeatedMissEnumerationC8T16',
  'RepeatedMissEnumerationC32T64', 'PendingWritesWaitForEveryPipe', 'PendingWritesCancelThroughActualPipes',
];
const idList = count => Array.from({ length: count }, (_, index) => \`c\${String(index).padStart(4, '0')}\`);
const userList = count => Array.from({ length: count }, (_, index) => \`user-\${String(index).padStart(4, '0')}\`);
function identifiers(actual, ids, users) {
  equal(actual.actualUserIdProvider, 'Microsoft.AspNetCore.SignalR.DefaultUserIdProvider');
  equal(actual.userIdentifiersProducedDuringSetup, true);
  equal(actual.connections.map(row => [row.id, row.userIdentifier, row.actualNameIdentifierClaim]),
    ids.map((id, index) => [id, users[index], users[index]]));
}
`);
section('function producer(record) {', 'for (const [relative, role, isTimed] of [', `function producer(record) {
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
      Array.from({ length: 56 }, (_, index) => \`missing-\${String(index).padStart(4, '0')}\`));
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
    : \`user-\${String(data.shape === 'C32SharedUserList64' ? Math.floor(index / 2) : index).padStart(4, '0')}\`);
  identifiers(data.actual, ids, users);
  const type = data.actual.inputType;
  if (data.shape === 'NoConnections512' || data.shape.includes('Array')) equal(type, 'System.String[]');
  else if (data.shape.includes('ReadOnly')) assert(type.startsWith('System.Collections.ObjectModel.ReadOnlyCollection'));
  else assert(type.startsWith('System.Collections.Generic.List'));
  setups++;
}
`);
edit('equal(witnesses.length, isTimed ? 5 : 7);', 'equal(witnesses.length, 7);');
edit('isTimed ? 0 : 17', 'isTimed ? 0 : 19');
edit('equal(setupRows.length, 12);', 'equal(setupRows.length, 14);');
edit('equal(validatedRows.length, 12);', 'equal(validatedRows.length, 14);');
edit('equal(settings.length, isTimed ? 24 : 0);', 'equal(settings.length, isTimed ? 28 : 0);');
edit("equal(only(rows, '-completed.json').actualReports, 12);",
  "equal(only(rows, '-completed.json').actualReports, 14);");
edit('[17, 29, 12, true]', '[19, 33, 14, true]');
edit('[34, 36, 36, 19, 52, 178, 24]', '[38, 42, 42, 21, 57, 180, 28]');
edit('equal(data.Benchmarks.length, 12);', 'equal(data.Benchmarks.length, 14);');
edit('equal(parts.length, 12);', 'equal(parts.length, 14);');
edit('BroadcastSendBenchmarks', 'UserSendBenchmarks');
edit('equal([actuals, warmups], [96, 36]);', 'equal([actuals, warmups], [112, 42]);');
edit('retained >= 60 && retained <= 96', 'retained >= 70 && retained <= 112');
edit('[80, 80, 89, 89]', '[80, 80, 90, 90]');
section("equal(json('investigation-execution/observed-failure.json')", 'const preparation =', `for (const [relative, count] of [
  ['investigation-execution/attempt-001/execution.json', 2],
  ['preparation-execution/attempt-001/execution.json', 2],
  ['measurement-execution/attempt-001/execution.json', 2],
]) {
  const commands = json(relative);
  equal(commands.length, count);
  assert(commands.every(command => command.actualExitCode === 0));
}
equal(json('scaffold-execution/attempt-001/execution.json').actualExitCode, 0);
`);
edit('newBroadcastProducerObservationsRequired', 'newUserSendProducerObservationsRequired');
edit('priorGroupObservationsOrTimingReused', 'priorGroupBroadcastConnectionObservationsOrTimingReused');
edit('f012ActualBroadcastCharacterizationRequired', 'f014ActualUserSendCharacterizationRequired');
edit('priorF011GroupResultsReusedAsBroadcastProof', 'priorGroupBroadcastConnectionResultsReusedAsUserSendProof');
edit('actualBroadcastEntryPoints', 'actualUserSendEntryPoints');
edit('benchmarkOutcomes: 12', 'benchmarkOutcomes: 14');
edit('34 real producer records, 36 timed setups and 36 cleanup/delivery records',
  '38 real user-ID/default-provider/JSON/dispatch/Pipe records, 42 timed setups and 42 cleanup/delivery records');
edit('96 raw samples, overhead compensation', '112 raw samples, overhead compensation');
edit('all F014 broadcast observations and timing execute independently', 'all F014 user-send observations and timing execute independently');
edit('or F011 timing reuse.', 'or F011/F012/F013 timing reuse. Actual public DefaultUserIdProvider setup is outside timing; no internal protocol handshake claim.');
edit('audit passed: 12 original reports', 'audit passed: 14 original reports');
edit('34 producer / 36 setup / 36 delivery records, 19 PE-PDB / 52 docs, 178 source snapshots, 24 settings',
  '38 producer / 42 setup / 42 delivery records, 21 PE-PDB / 57 docs, 180 source snapshots, 28 settings');
edit("const test = json('tests/original/actual-test-audit.json');", `const defaultProvider = text('sources/original/owner/DefaultUserIdProvider.cs');
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
const test = json('tests/original/actual-test-audit.json');`);
edit("    equal(value.actualRecipients, ready.actualRecipients);", `    equal(value.actualRecipients, ready.actualRecipients);
    equal(value.actualUserIdProvider, ready.actualUserIdProvider);
    equal(value.userIdentifiersProducedDuringSetup, true);
    equal(value.connections.map(row => [row.id, row.userIdentifier, row.actualNameIdentifierClaim]),
      ready.connections.map(row => [row.id, row.userIdentifier, row.actualNameIdentifierClaim]));`);
edit("  const runtime = only(rows, '-runtime.json');", `  const coreWitness = witnesses.find(row => row.name.endsWith('-Microsoft.AspNetCore.SignalR.Core.json'));
  assert(coreWitness);
  equal(coreWitness.data.documents.map(row => basename(row.source)).sort(), [
    'DefaultHubLifetimeManager.cs', 'HubLifetimeManager.cs', 'HubConnectionContext.cs', 'HubConnectionContextOptions.cs',
    'HubConnectionStore.cs', 'SerializedHubMessage.cs', 'DefaultUserIdProvider.cs', 'HubGroupList.cs',
  ].sort());
  const runtime = only(rows, '-runtime.json');`);
const destination = path.join(session, 'F014-reproduce-analysis.mjs');
assert(!fs.existsSync(destination));
fs.writeFileSync(destination, content);
fs.writeFileSync(path.join(run, 'independent-auditor-attribution.json'), JSON.stringify({
  candidate: 'F014', template: 'F012-reproduce-analysis.mjs', templateSha256: hash(original),
  resultSha256: hash(Buffer.from(content)), changes,
  independence: 'Raw-log/statistics/GC recomputation remains independent from the separate extractor. New native user/default-provider/null/shared-identity recipient expectations, exact64-target getter states, custom/derived dispatch, zero-count scans,90-source catalog,7 profile witnesses and actual fresh command history are checked directly.',
}, null, 2) + '\n');
console.log('F014 independent user-send auditor prepared; no results rewritten, native rerun or timing launched.');
