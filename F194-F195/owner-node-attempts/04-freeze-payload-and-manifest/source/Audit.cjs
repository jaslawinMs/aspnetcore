'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const m = require('./Metadata.cjs');
const xml = require('./Xml.cjs');
const root = __dirname;
assert(process.execArgv.includes('--permission'), 'Permission mode is required');
assert(process.execArgv.includes('--no-addons'), 'Native addons must be disabled');
assert(process.execArgv.includes(`--allow-fs-read=${root}`), 'Read permission must name exactly this capsule');
assert(!process.execArgv.some(x => x.startsWith('--allow-') && x !== `--allow-fs-read=${root}`), 'No other permission grants are accepted');
assert.equal(process.permission.has('child'), false);
assert.equal(process.permission.has('fs.write', root), false);
assert.equal(process.permission.has('addons'), false);
function local(relative) {
  assert(typeof relative === 'string' && relative.length > 0 && !path.isAbsolute(relative));
  assert(!relative.includes('/') && !relative.includes(':'));
  assert(relative.split('\\').every(x => x && x !== '.' && x !== '..'), `Invalid copied relative path: ${relative}`);
  const resolved = path.resolve(root, relative);
  assert(resolved.startsWith(root + '\\'), 'Path outside capsule');
  return resolved;
}
const read = relative => fs.readFileSync(local(relative));
const json = relative => JSON.parse(read(relative).toString('utf8').replace(/^\uFEFF/, ''));
function walk(directory, relative = '') {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    assert(!entry.isSymbolicLink(), 'Capsule links are not allowed');
    const name = relative ? path.join(relative, entry.name) : entry.name;
    if (entry.isDirectory()) files.push(...walk(path.join(directory, entry.name), name));
    else {
      assert(entry.isFile(), 'Only ordinary files are accepted');
      files.push(name);
    }
  }
  return files;
}
const manifestBytes = read('MANIFEST.json'), manifest = json('MANIFEST.json');
const manifestSHA256 = m.hash(manifestBytes);
assert.equal(read('MANIFEST.sha256').toString('utf8'), `${manifestSHA256}  MANIFEST.json\r\n`);
assert.equal(manifest.schema, 1);
const paths = new Set(), physical = walk(root);
let payloadBytes = 0;
for (const item of manifest.files) {
  assert(!['MANIFEST.json', 'MANIFEST.sha256'].includes(item.path), 'Manifest envelope is not payload');
  assert(!paths.has(item.path), 'Duplicate declared payload');
  paths.add(item.path);
  const bytes = read(item.path);
  assert.equal(bytes.length, item.bytes, `Payload size: ${item.path}`);
  assert.equal(m.hash(bytes), item.sha256, `Payload SHA256: ${item.path}`);
  payloadBytes += bytes.length;
}
assert.equal(manifest.payloadFileCount, paths.size);
assert.equal(manifest.payloadBytes, payloadBytes);
assert.equal(manifest.payloadSetSHA256, m.hash(Buffer.from(manifest.files.map(f => `${f.path}\0${f.bytes}\0${f.sha256}\n`).join(''), 'utf8')));
assert.deepEqual(physical.sort(), [...paths, 'MANIFEST.json', 'MANIFEST.sha256'].sort(), 'Unmanifested or missing capsule bytes');
const results = json('RESULTS.json'), checklist = json('evidence\\contract-checklist.json');
assert.equal(results.ownerId, 'bb4c15c7-3a8e-4145-b72f-7da74cfea243');
assert.deepEqual(results.findings, { F194: 'PENDING', F195: 'PENDING' });
assert.equal(results.comparisonAuthorizations, 0);
assert.equal(results.preparationOnly, true);
assert.deepEqual(json('evidence\\finding-records.json').map(x => [x.id, x.status]), [['F194', 'pending'], ['F195', 'pending']]);
const entryHold = json('evidence\\ENTRY-HOLD.json'), go = json('evidence\\GO.json'), registration = json('evidence\\owner-registration.json');
assert.equal(entryHold.state, 'ENTRY-HOLD');
assert.equal(entryHold.nativeCommandsRun, 0);
assert.equal(entryHold.nativeGraphsCreated, 0);
assert.equal(go.authorization, 'GO F194-F195-042');
assert.equal(go.ownerId, results.ownerId);
assert.equal(go.actualWorkerBuildHoldActive, false);
assert.equal(go.workersMayBuildOrTest, true);
assert.equal(go.comparisonAuthorizations, 0);
assert.equal(registration.actualNewOwner, results.ownerId);
assert.equal(registration.actualPreservedOtherOwner, 'a46e395c-3977-48fa-b406-4126e927dd1e');
assert.equal(registration.actualPreparationOwners, 2);
assert.equal(registration.actualPolicyAfterSha256, go.policySHA256);
assert.equal(registration.actualNewOwnerEntryNativeHoldRequiresSubsequentExplicitGo, true);
assert(Date.parse(registration.recordedAt) <= Date.parse(go.receivedUtc), 'GO before registration');
assert(Date.parse(entryHold.registeredUtc) <= Date.parse(go.receivedUtc), 'GO before recorded entry HOLD');
assert.equal(json('evidence\\entry-head.json').sha, checklist.sourceRoles.Default);
const entryHeadTokens = read('evidence\\entry-head.stdout.txt').toString('utf8').replace(/^\uFEFF/, '').trim().split(/\s+/);
assert.deepEqual(entryHeadTokens, [checklist.sourceRoles.Default, 'refs/heads/main']);
assert.equal(results.defaultEntrySHA, checklist.sourceRoles.Default);
assert.equal(results.originalSHA, checklist.sourceRoles.Original);
assert.equal(json('evidence\\source-diff-receipt.json').exitCode, 0);
assert.equal(read('evidence\\original-default-embedded.diff.txt').length, 0);
assert.equal(read('evidence\\original-default-embedded.diff.stderr.txt').length, 0);
const closing = json('evidence\\closing-head.json');
assert.equal(closing.exitCode, 0);
assert.equal(closing.builtDefaultSHA, results.defaultEntrySHA);
assert.equal(closing.retargeted, false);
assert.deepEqual(read('evidence\\closing-head.stdout.txt').toString('utf8').trim().split(/\s+/), [closing.sha, 'refs/heads/main']);
assert.equal(results.defaultClosingSHA, closing.sha);
assert.equal(results.defaultHeadDriftObserved, closing.sha !== results.defaultEntrySHA);
assert.equal(results.retargetedAfterClosingObservation, false);
for (const source of json('evidence\\source-integrity-final.json')) {
  assert.equal(source.headExitCode, 0);
  assert.equal(source.statusExitCode, 0);
  assert.deepEqual(source.trackedStatus, []);
  assert.equal(source.trackedSourceChanges, 0);
}
assert.equal(json('preseal-node-attempts\\01-assemble-copied-evidence\\receipt.json').rootExitCode, 1);
assert.equal(json('preseal-node-attempts\\02-assemble-after-explicit-empty-diff-capture\\receipt.json').rootExitCode, 0);
assert(read('preseal-node-attempts\\01-assemble-copied-evidence\\stderr.txt').toString('utf8').includes('ENOENT'));
const frozen = json('evidence\\PRECOMPILE-FREEZE.json');
assert.equal(frozen.beforeFirstCSharpCompilation, true);
assert.equal(frozen.priorCompilationAttempts, 0);
for (const item of frozen.sourceFrozen) {
  const target = item.path === 'consumer\\Program.cs' ? 'common\\source\\Program.cs'
    : item.path === 'consumer\\F194ContractConsumer.csproj' ? 'common\\source\\F194ContractConsumer.csproj'
    : path.join('evidence', item.path);
  assert.equal(read(target).length, item.bytes);
  assert.equal(m.hash(read(target)), item.sha256);
}
const expectedExits = new Map([
  ['01-original-selected-build-no-restore', 1], ['02-default-selected-build-no-restore', 1],
  ['03-original-generate-prerequisite', 1], ['04-default-generate-prerequisite', 1],
  ['05-common-consumer-build-no-restore', 1], ['06-original-generate-with-copied-packs', 0],
  ['07-default-generate-with-copied-packs', 0], ['08-common-consumer-restore-build', 0],
  ['09-original-native-build', 0], ['10-default-native-build', 0],
  ['11-original-native-selected-tests', 0], ['12-default-native-selected-tests', 0],
  ['13-original-common-consumer', 0], ['14-default-common-consumer', 0],
  ['15-first-metadata-association-probe', 1], ['16-corrected-deterministic-pdb-association-probe', 0]
]);
assert.equal(results.attempts.length, expectedExits.size);
let observedChildChecks = 0;
for (const [id, exitCode] of expectedExits) {
  const receipt = json(path.join('attempts', id, 'receipt.json'));
  assert.equal(receipt.id, id);
  assert.equal(receipt.rootExitCode, exitCode);
  assert.equal(receipt.rootHasExited, true);
  assert.equal(receipt.stdoutTaskCompleted, true);
  assert.equal(receipt.stderrTaskCompleted, true);
  assert(Number.isInteger(receipt.ownedRoot.pid) && receipt.ownedRoot.pid > 0 && /^[0-9]+$/.test(receipt.ownedRoot.creationTicks));
  assert(Date.parse(receipt.ownedRoot.creationUtc) >= Date.parse(go.receivedUtc), 'Native command preceded GO');
  assert.equal(read(path.join('attempts', id, 'stdout.txt')).length, receipt.stdoutUtf8Bytes);
  assert.equal(read(path.join('attempts', id, 'stderr.txt')).length, receipt.stderrUtf8Bytes);
  const command = read(path.join('attempts', id, 'command.ps1')).toString('utf8');
  for (const required of [
    "$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'",
    "$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'",
    "$env:MSBUILDDISABLENODEREUSE = '1'",
    `Set-Location -LiteralPath '${receipt.graph}'`,
    '. .\\activate.ps1'
  ]) assert(command.includes(required), `Missing command guard ${id}: ${required}`);
  assert(command.includes(receipt.command));
  observedChildChecks += receipt.observedChildChecks.length;
  for (const child of receipt.observedChildChecks) {
    assert(child.observed.pid > 0 && /^[0-9]+$/.test(child.observed.creationTicks));
    assert(['pid-absent', 'pid-reused-original-identity-absent', 'same-identity-still-observed'].includes(child.state));
  }
}
for (const [id, expected] of [
  ['01-original-selected-build-no-restore', 'MSB4019'],
  ['02-default-selected-build-no-restore', 'MSB4019'],
  ['03-original-generate-prerequisite', 'NETSDK1226'],
  ['04-default-generate-prerequisite', 'NETSDK1226'],
  ['05-common-consumer-build-no-restore', 'NETSDK1004']
]) assert(read(path.join('attempts', id, 'stdout.txt')).toString('utf8').includes(expected), 'Missing actual prerequisite failure');
assert(read('attempts\\15-first-metadata-association-probe\\stderr.txt').toString('utf8').includes('PE PDB checksum mismatch'));
const selections = json('metadata.json'), peCache = new Map();
function image(relative) {
  if (!peCache.has(relative)) peCache.set(relative, m.pe(read(relative)));
  return peCache.get(relative);
}
assert.equal(selections.length, 5);
let documents = 0, availableDocuments = 0;
for (const selected of selections) {
  const imageBytes = read(selected.image), symbolsBytes = read(selected.pdb);
  assert.equal(m.hash(imageBytes), selected.imageSHA256);
  assert.equal(m.hash(symbolsBytes), selected.pdbSHA256);
  const parsed = m.associate(imageBytes, symbolsBytes);
  assert.equal(parsed.image.managed.mvid, selected.managedMvidFromPE);
  assert.equal(parsed.symbols.contentId, selected.pdbContentId);
  assert.deepEqual(parsed.image.debug.find(d => d.type === 2), selected.codeView);
  assert.equal(parsed.symbols.documents.length, selected.documents.length);
  for (let index = 0; index < selected.documents.length; index++) {
    const declared = selected.documents[index], fresh = parsed.symbols.documents[index];
    documents++;
    assert.equal(fresh.row, declared.row);
    assert.equal(fresh.name, declared.name);
    assert.equal(fresh.algorithm, declared.algorithm);
    assert.equal(fresh.checksum, declared.checksum);
    if (!declared.path) {
      assert.equal(declared.availability, 'unavailable-no-raw-or-embedded-document');
      assert(!fresh.embedded, 'Available embedded document must not be omitted');
      continue;
    }
    availableDocuments++;
    const raw = read(declared.path);
    m.documentHash(fresh, raw);
    assert.equal(raw.length, declared.bytes);
    assert.equal(m.hash(raw), declared.sha256);
    if (fresh.embedded) assert(raw.equals(fresh.embedded));
    assert.equal((raw.toString('utf8').match(/\r\n/g) ?? []).length, declared.crlfCount);
    assert.equal((raw.toString('utf8').match(/\n/g) ?? []).length, declared.lfCount);
  }
}
assert.equal(documents, 70);
assert.equal(availableDocuments, 70);
assert.equal(results.selectedDocumentRows, documents);
assert.equal(results.copiedSelectedDocumentRows, availableDocuments);
const common = selections.find(x => x.id === 'Common-Consumer');
const commonProgram = common.documents.find(d => d.name.endsWith('\\consumer\\Program.cs'));
assert(commonProgram && read(commonProgram.path).equals(read('common\\source\\Program.cs')));
const compilation = json('evidence\\COMMON-CONSUMER-COMPILATION.json');
assert.equal(compilation.consumerDLLSHA256, common.imageSHA256);
assert.equal(compilation.consumerPDBSHA256, common.pdbSHA256);
assert.equal(compilation.consumerSourceSHA256, m.hash(read('common\\source\\Program.cs')));
assert.equal(compilation.sourceRevisions, 0);
const proofs = json('git\\proofs.json'), gitMap = new Map();
for (const object of proofs.objects) {
  assert(!gitMap.has(object.id));
  const bytes = read(object.path);
  assert.equal(bytes.length, object.bytes);
  assert.equal(m.hash(bytes), object.sha256);
  assert.equal(m.hash(Buffer.concat([Buffer.from(`${object.type} ${bytes.length}\0`), bytes]), 'sha1').toLowerCase(), object.id, 'Raw Git object hash');
  gitMap.set(object.id, { ...object, bytes });
}
function tree(bytes) {
  const entries = [];
  let at = 0;
  while (at < bytes.length) {
    const space = bytes.indexOf(32, at), zero = bytes.indexOf(0, space + 1);
    assert(space >= at && zero > space);
    entries.push({ mode: bytes.toString('ascii', at, space), name: bytes.toString('utf8', space + 1, zero), id: m.slice(bytes, zero + 1, 20).toString('hex') });
    at = zero + 21;
  }
  return entries;
}
for (const proof of proofs.memberships) {
  const commit = gitMap.get(proof.commitId);
  assert(commit?.type === 'commit');
  const rootTree = /^tree ([0-9a-f]{40})\n/.exec(commit.bytes.toString('utf8'))?.[1];
  assert.equal(rootTree, proof.rootTree);
  let current = rootTree;
  const names = proof.relativePath.split('\\');
  assert.equal(names.length, proof.chain.length);
  for (let index = 0; index < names.length; index++) {
    const rawTree = gitMap.get(current);
    assert(rawTree?.type === 'tree');
    const entry = tree(rawTree.bytes).filter(x => x.name === names[index]);
    assert.equal(entry.length, 1);
    assert.deepEqual({ treeId: current, ...entry[0] }, proof.chain[index]);
    current = entry[0].id;
  }
  assert.equal(current, proof.blobId);
  const blob = gitMap.get(current);
  assert(blob?.type === 'blob');
  assert.equal(blob.path, proof.blobPath);
  if (proof.rawPayload) {
    const raw = read(proof.rawPayload);
    if (proof.rawRelation === 'byte-identical-to-Git-blob') assert(raw.equals(blob.bytes));
    else {
      assert.equal(proof.rawRelation, 'raw-compiler-CRLF-to-Git-LF-only');
      assert(Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n'), 'utf8').equals(blob.bytes));
    }
  }
}
for (const selected of selections.filter(s => s.role !== 'Common')) {
  for (const document of selected.documents.filter(d => d.sourceClass === 'tracked-role-source')) {
    const proof = proofs.memberships.find(p => p.role === selected.role && p.rawPayload === document.path);
    assert(proof, 'Every selected tracked compiler document needs role commit/tree membership');
    assert.equal(proof.commitId, checklist.sourceRoles[selected.role]);
  }
}
for (const role of ['Original', 'Default']) {
  const selected = selections.find(s => s.role === role && s.id.endsWith('.Tests'));
  const document = selected.documents.find(d => d.name.endsWith('\\Manifest\\TestEntry.cs'));
  assert(document?.gitMembership);
  const source = read(document.path).toString('utf8');
  assert(source.includes('var files = Children.Where(c => c.IsFile).ToArray();'));
  assert(source.includes('var otherFiles = Children.Where(c => !c.IsFile).SelectMany(d => d.GetFiles()).ToArray();'));
  assert(source.includes('return files.Concat(otherFiles).ToArray();'));
}
const inventory = json('input-inventory.json');
let managedObservations = 0, nativeFileSamples = 0;
for (const item of inventory.observations) {
  if (!item.path) {
    assert(['managed-observation-without-copyable-file', 'native-output-file-not-present'].includes(item.kind));
    continue;
  }
  assert.equal(m.hash(read(item.path)), item.sha256);
  const parsed = image(item.path);
  if (item.kind === 'actual-in-process-managed-observation') {
    const receipt = json(item.receipt), observed = receipt.managed[item.index];
    assert.equal(item.sourcePath, observed.path);
    assert.equal(item.sha256, observed.sha256);
    assert.equal(parsed.managed.mvid, item.observedMvid);
    assert.equal(item.observedMvid, observed.inProcessManagedMvid.toLowerCase());
    managedObservations++;
  } else if (item.kind === 'sampled-native-module-file-not-managed-MVID-observation') {
    const observed = json(item.receipt).sampledNative[item.index];
    assert.equal(item.sourcePath, observed.path);
    assert.equal(item.sha256, observed.sha256);
    nativeFileSamples++;
  } else if (item.fileMvid) {
    assert.equal(parsed.managed.mvid, item.fileMvid);
  }
}
for (const input of inventory.buildInputs.filter(x => x.path)) assert.equal(m.hash(read(input.path)), input.sha256);
const nativeSummaries = [];
for (const role of results.roles) {
  const key = role.role.toLowerCase();
  const nativeImage = selections.find(s => s.role === role.role && s.id.endsWith('.Tests'));
  const nativeDependencies = json(path.join('inputs', role.role, 'Microsoft.Extensions.FileProviders.Embedded.Tests.deps.json')).libraries;
  for (const name of ['xunit.assert/2.9.2', 'Moq/4.20.72', 'Microsoft.NET.Test.Sdk/18.0.1']) assert(Object.hasOwn(nativeDependencies, name), `Actual native dependency identity: ${name}`);
  const reconciled = xml.reconcileTrx(read(role.trxPath), checklist.nativeMethods, checklist.theoryRows, role.nativeAssemblyPath);
  assert.deepEqual(reconciled, role.native, 'Reparse real XML IDs/results/counters/assembly paths, not cached summary alone');
  const supplemental = json(role.supplementalPath);
  assert.equal(supplemental.role, role.role);
  assert.equal(supplemental.total, 12); assert.equal(supplemental.passed, 12); assert.equal(supplemental.failed, 0);
  assert.deepEqual(supplemental.cases.map(c => c.id), checklist.supplementalCases);
  assert(supplemental.cases.every(c => c.outcome === 'Passed'));
  assert.equal(supplemental.consumer.sha256, common.imageSHA256);
  assert.equal(supplemental.consumer.inProcessManagedMvid, common.managedMvidFromPE);
  assert.equal(supplemental.nativeTestAssembly.path, role.nativeAssemblyPath);
  assert.equal(supplemental.nativeTestAssembly.sha256, nativeImage.imageSHA256);
  assert.equal(supplemental.nativeTestAssembly.inProcessManagedMvid, nativeImage.managedMvidFromPE);
  const cases = Object.fromEntries(supplemental.cases.map(c => [c.id, c.observed]));
  assert.deepEqual(cases['helper-file-terminal'].paths, []);
  assert.equal(cases['helper-file-terminal'].fileFactoryChildrenAreNull, true);
  assert.deepEqual(cases['helper-empty-directory'].paths, []);
  assert.deepEqual(cases['helper-singleton'].paths, ['resource.single']);
  assert.equal(cases['helper-singleton'].retainsIdentity, true);
  assert.deepEqual(cases['helper-mixed-nested-order'].paths, ['r.root1', 'r.root2', 'r.z1', 'r.z2', 'r.deep', 'r.a1']);
  assert.equal(cases['helper-mixed-nested-order'].repeatedEnumerationSame, true);
  const manifestXml = xml.parse(Buffer.from(cases['helper-mixed-nested-order'].xml, 'utf8'));
  assert.equal(manifestXml.name, 'Directory');
  assert.deepEqual(manifestXml.children.map(c => c.attrs.Name), ['z', 'root1.txt', 'empty', 'root2.txt', 'a']);
  assert.deepEqual(cases['helper-shallow-membership-snapshot'].retainedSnapshot, ['r.changed']);
  assert.deepEqual(cases['helper-shallow-membership-snapshot'].freshCall, ['r.replacement']);
  for (const id of ['helper-null-children-eager-exception', 'helper-null-child-eager-exception', 'helper-invalid-descendant-eager-before-any-result']) {
    assert.equal(cases[id].Returned, false);
    assert(supplemental.cases.find(c => c.id === id).boundary.startsWith('deliberately-invalid-direct-helper'));
  }
  assert.equal(cases['helper-null-children-eager-exception'].exception, 'System.ArgumentNullException');
  assert.equal(cases['helper-null-children-eager-exception'].parameter, 'source');
  assert.equal(cases['helper-null-child-eager-exception'].exception, 'System.NullReferenceException');
  assert.equal(cases['helper-invalid-descendant-eager-before-any-result'].exception, 'System.ArgumentNullException');
  assert.equal(cases['helper-invalid-descendant-eager-before-any-result'].enumerationStarted, false);
  assert.deepEqual(cases['provider-empty-root'].paths, []);
  assert.deepEqual(cases['provider-empty-root'].directoryNames, []);
  assert.equal(cases['provider-empty-root'].exists, true);
  assert.deepEqual(cases['provider-singleton-resource'].paths, ['r.one']);
  assert.deepEqual(cases['provider-singleton-resource'].directoryNames, ['one.txt']);
  assert.equal(cases['provider-singleton-resource'].streamLength, 0);
  assert.deepEqual(cases['provider-mixed-nested-manifest-and-resource-order'].files, ['r.root1', 'r.root2', 'r.z1', 'r.z2', 'r.deep', 'r.a1']);
  assert.deepEqual(cases['provider-mixed-nested-manifest-and-resource-order'].rootOrder, ['z', 'root1.txt', 'empty', 'root2.txt', 'a']);
  assert.deepEqual(cases['provider-mixed-nested-manifest-and-resource-order'].zOrder, ['z1.txt', 'deep', 'z2.txt']);
  assert.equal(cases['provider-mixed-nested-manifest-and-resource-order'].verifiedResourceStreams, 6);
  assert.deepEqual(cases['provider-snapshot-after-helper-input-mutation'].files, ['r.before']);
  assert.deepEqual(cases['provider-snapshot-after-helper-input-mutation'].names, ['before.txt']);
  assert.deepEqual(cases['provider-snapshot-after-helper-input-mutation'].helperNow, ['r.replacement']);
  const testHost = json(role.testHostEntryIdentity);
  assert.equal(testHost.pid, role.testHostPID);
  assert.equal(testHost.framework, supplemental.framework);
  assert.equal(testHost.phase, 'entry');
  assert(testHost.processPath.endsWith('\\testhost.exe'));
  assert.equal(role.testHostExitHookAvailable, false);
  assert(!paths.has(role.testHostEntryIdentity.replace('-entry.json', '-exit.json')), 'Missing exit identity must remain missing');
  assert.equal(role.nativeTestAssemblyInProcessMvidObservedByHook, false);
  const nativeReceipt = json(path.join('attempts', role.nativeAttempt, 'receipt.json'));
  const hostChild = nativeReceipt.observedChildChecks.find(c => c.observed.pid === testHost.pid);
  assert(hostChild);
  assert.equal(BigInt(hostChild.observed.creationTicks) / 10n, BigInt(testHost.creationTicks) / 10n, 'Native host PID plus WMI creation identity');
  assert(['pid-absent', 'pid-reused-original-identity-absent'].includes(hostChild.state));
  nativeSummaries.push({ role: role.role, native: reconciled.total, supplemental: supplemental.total, framework: supplemental.framework, testHostExitCode: null, testHostNativeEntryPID: testHost.pid });
}
const closure = json('evidence\\final-process-closure.json');
assert.equal(closure.unavailableIdentities, 0, 'Missing creation identity cannot become terminal');
assert.equal(closure.sameIdentityStillObserved, 0, 'Observed owned processes remain');
assert(closure.checks.length >= results.attempts.length);
for (const item of closure.checks) {
  assert(item.pid > 0 && /^[0-9]+$/.test(item.originalCreationTicks));
  assert(['pid-absent', 'pid-reused-original-identity-absent'].includes(item.state));
}
const requiredRoots = results.attempts.map(a => [a.root.pid, a.root.creationTicks]);
for (const [pid, ticks] of requiredRoots) assert(closure.checks.some(c => c.pid === pid && c.originalCreationTicks === ticks));
const envelopeBytes = manifestBytes.length + read('MANIFEST.sha256').length;
console.log(JSON.stringify({
  status: 'PASS',
  scope: 'Offline copied-byte and structured-evidence audit only; no native re-execution or performance outcome',
  ownerId: results.ownerId,
  findings: results.findings,
  comparisonAuthorizations: 0,
  manifestSHA256,
  payloadSetSHA256: manifest.payloadSetSHA256,
  payload: { files: paths.size, bytes: payloadBytes },
  envelope: { files: 2, bytes: envelopeBytes },
  enclosingCapsule: { files: physical.length, bytes: payloadBytes + envelopeBytes },
  selectedPEPDBPairs: selections.length,
  parsedRawDocumentChecksums: availableDocuments,
  rawGitObjects: proofs.objects.length,
  rawGitMemberships: proofs.memberships.length,
  managedReflectionObservationRows: managedObservations,
  sampledNativeFileObservationRows: nativeFileSamples,
  originalNativeAndPreparationRootsWithReceipts: expectedExits.size,
  observedChildIdentityChecksAtCommandCompletion: observedChildChecks,
  finalObservedIdentityChecks: closure.checks.length,
  roles: nativeSummaries,
  limits: results.missingOrLimitedEvidence
}, null, 2));
