'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { pe, portablePdb, typeMethods } = require('./Metadata.cjs');
const { inspectPe } = require('./PeExtras.cjs');
const { objectId, treeEntries, commitTree } = require('./GitObjects.cjs');
const { reconcile } = require('./Reconcile.cjs');
const root = path.resolve(process.argv[2] ?? __dirname);
function local(name) {
  assert.equal(typeof name, 'string');
  assert(!path.posix.isAbsolute(name) && !path.win32.isAbsolute(name));
  assert(!name.split(/[\\/]/).includes('..'));
  const filename = path.resolve(root, ...name.split(/[\\/]/));
  assert(filename.startsWith(root + path.sep));
  return filename;
}
const read = name => fs.readFileSync(local(name));
const text = name => read(name).toString('utf8').replace(/^\uFEFF/, '');
const json = name => JSON.parse(text(name));
const hash = (bytes, algorithm = 'sha256') => crypto.createHash(algorithm).update(bytes).digest('hex').toUpperCase();
function walk(directory, relative = '') {
  const names = [];
  for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true })) {
    const next = path.join(relative, entry.name);
    assert(!entry.isSymbolicLink(), 'Capsule must not depend on symlinks/donors');
    if (entry.isDirectory()) names.push(...walk(directory, next));
    else names.push(next.replaceAll('\\', '/'));
  }
  return names.sort();
}
const manifestBytes = read('MANIFEST.json'), manifest = JSON.parse(manifestBytes);
assert.equal(text('MANIFEST.sha256').trim(), `${hash(manifestBytes)}  MANIFEST.json`);
assert.deepEqual(manifest.excludedSelfFiles, ['MANIFEST.json', 'MANIFEST.sha256']);
assert.equal(manifest.files.length, manifest.count);
assert.equal(new Set(manifest.files.map(f => f.path)).size, manifest.count);
assert.deepEqual(walk(root).filter(name => !manifest.excludedSelfFiles.includes(name)), manifest.files.map(f => f.path).sort());
let total = 0;
const peFiles = new Map(), pdbFiles = new Map();
for (const file of manifest.files) {
  const bytes = read(file.path);
  assert.equal(bytes.length, file.bytes, file.path);
  assert.equal(hash(bytes), file.sha256, file.path);
  total += bytes.length;
  if (/\.(dll|exe)$/i.test(file.path)) {
    if (!peFiles.has(file.sha256)) {
      const extra = inspectPe(bytes);
      peFiles.set(file.sha256, { extra, parsed: extra.managed ? pe(bytes) : null });
    }
  }
  if (/\.pdb$/i.test(file.path)) {
    if (!pdbFiles.has(file.sha256)) pdbFiles.set(file.sha256, portablePdb(bytes));
  }
}
assert.equal(total, manifest.bytes);
const graphs = json('graph-creation.json'), entry = json('entry.json'), selected = json('selected-records.json');
const candidates = json('candidates-entry.json');
assert.deepEqual(candidates.map(c => c.id), ['F173', 'F174', 'F175']);
assert(candidates.every(c => c.status === 'pending'));
assert.equal(graphs.originalCommit, entry.originalCommit);
assert.equal(graphs.defaultCommit, entry.lsRemote.split(/\s+/)[0]);
assert.equal(entry.upstreamRepository.default_branch, 'main');
const sourceRecords = [...json('source-records.json').records, ...json('additional-source-records.json').records];
for (const source of sourceRecords.filter(s => !s.absent)) {
  const bytes = read(source.selected);
  assert.equal(bytes.length, source.bytes);
  assert.equal(hash(bytes), source.sha256);
  assert.equal(objectId('blob', bytes), source.blob);
  assert.equal(source.commit, graphs[`${source.role}Commit`]);
}
for (const name of ['InMemoryStore.cs', 'InMemoryUserStore.cs']) {
  const suffix = `src/Identity/test/InMemory.Test/${name}`;
  const original = sourceRecords.find(r => r.role === 'original' && r.source === suffix);
  const current = sourceRecords.find(r => r.role === 'default' && r.source === suffix);
  assert.equal(original.blob, current.blob, 'Target source bytes are unchanged across these two pins');
}
const proofs = json('git-source-proofs.json'), objects = new Map();
for (const item of proofs.objects) {
  const bytes = read(item.selected);
  assert.equal(bytes.length, item.bytes);
  assert.equal(objectId(item.type, bytes), item.id);
  objects.set(item.id, { type: item.type, bytes });
}
for (const proof of proofs.proofs) {
  assert.equal(proof.commit, graphs[`${proof.role}Commit`]);
  const commit = objects.get(proof.commit);
  assert(commit?.type === 'commit');
  let tree = commitTree(commit.bytes), absent = false;
  assert.equal(tree, proof.rootTree);
  const parts = proof.path.split('/');
  for (const [index, name] of parts.entries()) {
    const object = objects.get(tree);
    assert(object?.type === 'tree');
    const item = treeEntries(object.bytes).find(e => e.name === name);
    if (!item) { absent = true; break; }
    if (index === parts.length - 1) {
      assert(!proof.absent);
      assert.equal(item.object, proof.blob);
      assert.equal(objectId('blob', read(proof.selected)), item.object);
    }
    else { assert.equal(item.mode, '40000'); tree = item.object; }
  }
  assert.equal(absent, proof.absent);
}
for (const source of sourceRecords)
  assert(proofs.proofs.some(p => p.role === source.role && p.path === source.source && p.blob === (source.blob ?? null)), 'Every selected pinned raw source has a commit/tree proof');
const imageByPath = new Map();
for (const file of selected.files) {
  const bytes = read(file.selected);
  assert.equal(bytes.length, file.bytes);
  assert.equal(hash(bytes), file.sha256);
}
for (const image of selected.images) {
  const parsed = peFiles.get(image.sha256)?.parsed;
  assert(parsed, image.selected);
  assert.equal(parsed.mvid, image.mvid);
  assert.deepEqual(parsed.codeviews, image.codeviews);
  imageByPath.set(image.selected, { ...image, parsed });
}
const usedDocumentIds = new Set(), pairedPdbHashes = new Set();
for (const pair of selected.pairs) {
  const image = imageByPath.get(pair.image), pdbBytes = read(pair.pdb), pdb = pdbFiles.get(hash(pdbBytes));
  assert(image && pdb);
  assert(pair.allPdbDocumentsSelected);
  assert(image.parsed.codeviews.some(c => c.guid === pdb.guid && c.stamp === pdb.stamp && c.age === 1));
  assert.equal(pair.guid, pdb.guid); assert.equal(pair.stamp, pdb.stamp);
  assert.equal(pair.documents.length, pdb.documents.length, 'All raw documents, not a prefix/target-only subset');
  pairedPdbHashes.add(hash(pdbBytes));
  for (const [index, id] of pair.documents.entries()) {
    assert(!usedDocumentIds.has(id)); usedDocumentIds.add(id);
    const actual = pdb.documents[index], record = selected.documents[id];
    assert.equal(record.id, id); assert.equal(record.role, pair.role);
    assert.equal(record.pair + '.dll', pair.image);
    for (const key of ['name', 'algorithm', 'checksum', 'language']) assert.equal(record[key], actual[key]);
    const bytes = read(record.selected);
    const algorithm = actual.algorithm === '8829d00f-11b8-4213-878b-770e8597ac16' ? 'sha256'
      : actual.algorithm === 'ff1816ec-aa5e-4d10-87f7-6f4963833460' ? 'sha1' : null;
    assert(algorithm);
    assert.equal(hash(bytes, algorithm), actual.checksum);
    assert.equal(hash(bytes), record.sha256);
    assert.equal(bytes.length, record.bytes);
    if (record.immutableSource) {
      const immutable = record.immutableSource, raw = read(immutable.rawGitBlob);
      assert.equal(immutable.commit, graphs[`${record.role}Commit`]);
      assert.equal(objectId('blob', raw), immutable.blob);
      assert(proofs.proofs.some(p => p.role === record.role && p.path === immutable.source && p.blob === immutable.blob));
      assert(['byte-identical', 'git-LF-vs-compiler-CRLF'].includes(immutable.checkoutRelation));
      const compilerSource = immutable.checkoutRelation === 'byte-identical' ? bytes : Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));
      assert(raw.equals(compilerSource), 'PDB raw compiler source equals pinned source modulo declared checkout CRLF');
    }
    if (pair.role === 'common') {
      assert.equal(record.name, '/_/autoperf-private/Program.cs');
      assert(bytes.equals(read('consumer/Program.cs')), 'Actual accepted common source is its PDB document, not a rewritten stand-in');
    }
  }
}
assert.equal(usedDocumentIds.size, selected.documents.length);
for (const id of pdbFiles.keys()) assert(pairedPdbHashes.has(id), 'Every selected unique PDB has a full raw-document association');
function validateInventory(image) {
  assert.equal(image.count, image.files.length);
  assert.equal(image.bytes, image.files.reduce((sum, f) => sum + f.bytes, 0));
  assert.equal(new Set(image.files.map(f => f.path)).size, image.files.length);
  for (const file of image.files) {
    assert(Number.isInteger(file.bytes) && file.bytes >= 0);
    assert(/^[0-9A-F]{64}$/.test(file.sha256));
  }
}
function differences(a, b) {
  const left = new Map(a.map(f => [f.path, f])), right = new Map(b.map(f => [f.path, f]));
  return [...new Set([...left.keys(), ...right.keys()])].sort()
    .filter(name => left.get(name)?.sha256 !== right.get(name)?.sha256)
    .map(name => ({ path: name, original: left.get(name) ?? null, default: right.get(name) ?? null }));
}
const initial = json('native-images.json'), final = json('native-images-final.json'), runtimeImages = json('runtime-images.json');
for (const inventory of [initial, final]) {
  for (const role of ['original', 'default']) {
    validateInventory(inventory.images[role]);
    assert.equal(inventory.images[role].commit, graphs[`${role}Commit`]);
  }
  assert.deepEqual(inventory.differences, differences(inventory.images.original.files, inventory.images.default.files));
}
for (const runtime of runtimeImages.images) validateInventory(runtime);
assert.deepEqual(runtimeImages.differences, differences(runtimeImages.images[0].files, runtimeImages.images[1].files));
const selection = json('native-selection.json'), reconciliation = json('native-reconciliation.json');
const supplemental = json('supplemental-selection.json'), compilation = json('consumer/inputs.json'), copies = json('consumer/copies.json');
assert.equal(compilation.languageVersion, '13');
assert(compilation.noConfig && compilation.noStandardLibrary);
assert.equal(compilation.analyzers.length, 0);
for (const input of compilation.records) {
  const bytes = read(input.selected);
  assert.equal(bytes.length, input.bytes); assert.equal(hash(bytes), input.sha256);
}
const rsp = text('consumer/compile.rsp').trim().split(/\r?\n/);
for (const argument of ['/nostdlib+', '/target:exe', '/main:Program', '/langversion:13', '/nullable:enable', '/deterministic+', '/optimize+', '/debug:portable'])
  assert(rsp.includes(argument));
const references = compilation.records.filter(r => ['framework-reference', 'normal-original-reference'].includes(r.kind));
const rspReferences = rsp.filter(line => line.startsWith('/reference:')).map(line => line.slice('/reference:'.length).replace(/^"|"$/g, ''));
assert.equal(references.length, rspReferences.length);
for (const reference of references)
  assert(rspReferences.some(name => name.replaceAll('\\', '/').endsWith('/' + reference.selected)));
for (const reference of references.filter(r => r.kind === 'normal-original-reference'))
  assert.equal(reference.sha256, hash(read(`selected/original/${path.posix.basename(reference.selected)}`)));
const sourceInput = compilation.records.find(r => r.kind === 'source');
assert.equal(sourceInput.selected, 'consumer/Program.cs');
assert(rsp.includes(`"${sourceInput.source}"`));
const common = imageByPath.get('selected/common/AutoPerf.Identity.Contracts.dll');
assert(common);
for (const copy of copies.files) {
  const bytes = read(copy.source);
  assert.equal(hash(bytes), copy.sha256); assert.equal(bytes.length, copy.bytes);
  const augmented = final.images[copy.role].files.find(f => f.path === path.posix.basename(copy.source));
  assert.deepEqual(augmented, { path: path.posix.basename(copy.source), bytes: copy.bytes, sha256: copy.sha256 });
}
const receiptNames = manifest.files.map(f => f.path).filter(name => name.startsWith('evidence/') && name.endsWith('.receipt.json'));
const nativeReceipts = receiptNames.map(name => ({ name, record: json(name) })).filter(r => Number.isInteger(r.record.nativePid));
assert(nativeReceipts.length > 0);
for (const { record } of nativeReceipts) {
  assert(record.nativeExited && record.bothStreamsDrained && record.observedDescendantsDrained);
  assert.equal(record.activation, '. .\\activate.ps1');
  assert.equal(record.environment.DOTNET_GENERATE_ASPNET_CERTIFICATE, 'false');
  assert.equal(record.environment.DOTNET_ADD_GLOBAL_TOOLS_TO_PATH, 'false');
  assert.equal(record.environment.MSBUILDDISABLENODEREUSE, '1');
  assert.equal(record.policyHoldActive, false);
  assert.equal(record.exhaustiveDescendantCensus, false);
  read(`evidence/${record.label}.stdout.txt`); read(`evidence/${record.label}.stderr.txt`);
}
const commonCompiles = nativeReceipts.filter(r => r.record.arguments[0] === 'exec' && path.win32.basename(r.record.arguments[1]).toLowerCase() === 'csc.dll');
assert.equal(commonCompiles.length, 1, 'One accepted consumer compiler invocation; not merely one final file');
assert.equal(commonCompiles[0].record.exitCode, 0);
assert(commonCompiles[0].record.arguments.includes('/noconfig'));
const supplementalSummary = [];
for (const role of ['original', 'default']) {
  const imageDirectory = initial.images[role].directory;
  const initialByName = new Map(initial.images[role].files.map(f => [f.path, f]));
  const finalByName = new Map(final.images[role].files.map(f => [f.path, f]));
  for (const file of initialByName.values()) assert.deepEqual(finalByName.get(file.path), file);
  assert.equal(finalByName.size - initialByName.size, 4);
  for (const file of selected.files.filter(f => f.role === role && f.source.toLowerCase().startsWith((imageDirectory + '\\').toLowerCase()))) {
    const relative = file.source.slice(imageDirectory.length + 1).replaceAll('\\', '/');
    const declared = initialByName.get(relative);
    assert(declared, 'Every selected normal output is in the complete unaugmented native inventory');
    assert.equal(declared.sha256, file.sha256); assert.equal(declared.bytes, file.bytes);
  }
  const evaluation = json(`evidence/${role}-native-evaluation.stdout.txt`).Properties;
  assert.equal(evaluation.TargetFramework, 'net12.0');
  assert.equal(evaluation.IsTestProject, 'true'); assert.equal(evaluation.IsUnitTestProject, 'true'); assert.equal(evaluation.IsShipping, 'false');
  const depsPath = `selected/${role}/${selection.assembly}.deps.json`, deps = json(depsPath);
  const declaration = json('native-declarations.json').find(d => d.role === role);
  assert.equal(declaration.commit, graphs[`${role}Commit`]);
  assert.equal(declaration.completeDependencyDeclaration, depsPath);
  assert.deepEqual(declaration.target, deps.runtimeTarget);
  assert.deepEqual(declaration.sourceBuiltProjects, Object.entries(deps.libraries).filter(([, value]) => value.type === 'project').map(([name, value]) => ({ name, ...value })));
  assert.deepEqual(declaration.packages, Object.entries(deps.libraries).filter(([, value]) => value.type === 'package').map(([name, value]) => ({ name, ...value })));
  for (const report of reconciliation.reports.filter(r => r.role === role)) {
    const parsed = reconcile(text(report.report), selection, imageDirectory);
    const { role: recordedRole, report: filename, invocation, ...saved } = report;
    assert.deepEqual(parsed, saved);
    const native = nativeReceipts.find(r => r.record.label === invocation)?.record;
    assert.equal(native?.exitCode, 0);
  }
  assert.equal(reconciliation.reports.filter(r => r.role === role).length, 2);
  const owner = imageByPath.get(`selected/${role}/${selection.assembly}.dll`);
  const producer = imageByPath.get(`selected/${role}/Microsoft.Extensions.Identity.Core.dll`);
  const coreLib = imageByPath.get(`selected/${role}/runtime/System.Private.CoreLib.dll`);
  const result = json(`evidence/${role}-supplemental-v1.json`);
  const supplementalReceipt = nativeReceipts.find(r => r.record.label === `${role}-supplemental-v1`)?.record;
  assert.equal(supplementalReceipt?.exitCode, 0);
  assert.equal(supplementalReceipt.checkout, graphs[`${role}Path`]);
  for (const [option, suffix] of [['--depsfile', 'deps.json'], ['--runtimeconfig', 'runtimeconfig.json']]) {
    const position = supplementalReceipt.arguments.indexOf(option);
    assert(position >= 0);
    assert.equal(supplementalReceipt.arguments[position + 1], `${imageDirectory}\\${selection.assembly}.${suffix}`);
  }
  assert.equal(result.role, role); assert.equal(result.exitCode, 0); assert.equal(result.failure, null);
  for (const [reported, actual] of [[result.owner, owner], [result.managerProducer, producer], [result.coreLib, coreLib], [result.consumer, common]]) {
    assert.equal(reported.sha256, actual.sha256); assert.equal(reported.mvid, actual.parsed.mvid);
  }
  assert.equal(result.rows.length, supplemental.rows.length);
  let checks = 0;
  for (const expected of supplemental.rows) {
    const rows = result.rows.filter(row => row.name === expected.name);
    assert.equal(rows.length, 1);
    const row = rows[0], checkNames = new Set(row.checks.map(check => check.name));
    assert.equal(row.finding, expected.finding); assert.equal(row.outcome, 'Passed');
    assert(row.ownerType.includes(expected.ownerTypeFragment));
    assert.equal(checkNames.size, row.checks.length);
    assert.equal(row.checks.length, expected.assertions);
    assert(row.checks.length > 0 && row.checks.every(check => check.passed === true));
    for (const name of expected.requiredChecks) assert(checkNames.has(name), name);
    if (Object.hasOwn(expected.parameters, 'inherited'))
      assert(row.checks.some(c => c.observed && c.observed.inherited === expected.parameters.inherited));
    checks += row.checks.length;
  }
  const modules = json(`evidence/${role}-native-modules.modules.json`);
  assert(modules.completed && modules.observations.length > 0);
  const nativeReceipt = nativeReceipts.find(r => r.record.label === `${role}-native-modules`)?.record;
  assert(nativeReceipt && !nativeReceipt.environment.DOTNET_STARTUP_HOOKS, 'Normal module replay has no startup hook');
  const processIds = new Set(nativeReceipt.observedProcesses.filter(p => p.name === 'testhost.exe').map(p => p.processId));
  for (const observation of modules.observations) assert(processIds.has(observation.processId));
  const runtime = runtimeImages.images.find(i => i.role === role);
  const requested = json(`selected/${role}/${selection.assembly}.runtimeconfig.json`).runtimeOptions.framework.version;
  assert(runtime.directory.endsWith(requested));
  for (const filename of ['testhost.exe', 'testhost.dll']) {
    const actual = modules.files.find(file => path.win32.basename(file.path).toLowerCase() === filename);
    assert(actual && modules.observations.some(observation => observation.modulePaths.includes(actual.path)));
    assert.equal(actual.sha256, hash(read(`selected/${role}/${filename}`)));
  }
  for (const observed of runtime.selected) {
    assert(modules.files.some(f => f.path === observed.path && f.sha256 === observed.sha256));
    assert(modules.observations.some(o => o.modulePaths.includes(observed.path)));
    const bytes = read(observed.selected), parsed = inspectPe(bytes);
    assert.equal(hash(bytes), observed.sha256);
    assert.deepEqual(parsed.version, { fileVersion: observed.fileVersion, productVersion: observed.productVersion });
    const relative = path.win32.relative(runtime.directory, observed.path);
    if (!relative.startsWith('..')) {
      const declared = runtime.files.find(file => file.path === relative.replaceAll('\\', '/'));
      assert(declared);
      assert.equal(declared.sha256, observed.sha256);
    }
  }
  const nativeCoreLib = runtime.selected.find(f => path.posix.basename(f.selected) === 'System.Private.CoreLib.dll');
  const nativeCoreClr = runtime.selected.find(f => path.posix.basename(f.selected) === 'coreclr.dll');
  assert(nativeCoreLib && nativeCoreClr);
  assert.equal(nativeCoreLib.sha256, result.coreLib.sha256);
  const supplementalIdentity = json(`evidence/${role}-supplemental-v1-identity.json`);
  assert.equal(supplementalIdentity.coreLib.sha256, nativeCoreLib.sha256);
  assert(supplementalIdentity.nativeModules.some(m => m.name === 'coreclr.dll' && m.sha256 === nativeCoreClr.sha256));
  const ownerBytes = read(owner.selected), managerBytes = read(producer.selected);
  for (const method of ['FindByIdAsync', 'FindByLoginAsync', 'AddLoginAsync', 'RemoveLoginAsync'])
    assert(typeMethods(ownerBytes, 'Microsoft.AspNetCore.Identity.InMemory', 'InMemoryUserStore`1').includes(method));
  assert(typeMethods(ownerBytes, 'Microsoft.AspNetCore.Identity.InMemory', 'InMemoryStore`2').some(n => n.endsWith('.FindByIdAsync')));
  for (const method of ['FindByIdAsync', 'FindByLoginAsync', 'AddLoginAsync', 'RemoveLoginAsync'])
    assert(typeMethods(managerBytes, 'Microsoft.AspNetCore.Identity', 'UserManager`1').includes(method));
  supplementalSummary.push({ role, rows: result.rows.length, checks, requestedRuntime: requested, ownerMvid: owner.parsed.mvid, coreLibMvid: coreLib.parsed.mvid });
}
const closing = json('closing.json'), terminal = json('TERMINAL.json');
assert.deepEqual(closing.candidates.map(c => c.id).sort(), ['F173', 'F174', 'F175']);
assert(closing.candidates.every(c => c.status === 'pending'));
assert.equal(closing.lsRemote.split(/\s+/)[0], graphs.defaultCommit);
assert.equal(text('evidence/closing-ls-remote.stdout.txt').trim(), closing.lsRemote);
assert.deepEqual(json('evidence/closing-upstream-repository.stdout.txt'), closing.upstreamRepository);
assert.equal(closing.coordinatorHead, entry.head);
assert.equal(closing.coordinatorBranch, entry.branch);
assert.deepEqual(closing.coordinatorStatus, entry.status);
for (const graph of closing.privateGraphs) {
  assert.equal(graph.head, graphs[`${graph.role}Commit`]);
  assert.equal(text(`evidence/closing-${graph.role}-head.stdout.txt`).trim(), graph.head);
  assert.deepEqual(graph.status, []);
}
assert(closing.commands.every(command => command.exitCode === 0 && command.exited && command.bothStreamsDrained));
assert(terminal.allRecordedNativeInvocationsTerminal && terminal.bothStreamsDrained && terminal.observedDescendantsDrained);
assert.equal(terminal.exhaustiveHistoricalPidCensus, false);
assert.equal(terminal.dotnetInvocationCount, nativeReceipts.length);
assert.equal(terminal.stillOwned.length, 0);
assert.deepEqual(terminal.labels.sort(), nativeReceipts.map(r => r.record.label).sort());
console.log(JSON.stringify({
  result: 'PASS', readOnly: true, manifestFiles: manifest.count, manifestBytes: manifest.bytes, manifestSha256: hash(manifestBytes),
  freshUniquePeImages: peFiles.size, freshUniquePortablePdbs: pdbFiles.size,
  selectedManagedImages: selected.images.length, associatedPdbPairs: selected.pairs.length, rawPdbDocuments: selected.documents.length,
  gitMerkleSourceProofs: proofs.proofs.length,
  nativeReports: reconciliation.reports.length, nativeRowExecutions: reconciliation.reports.reduce((sum, r) => sum + r.rows.length, 0),
  supplemental: supplementalSummary, commonConsumerCompilations: commonCompiles.length,
  dotnetInvocations: nativeReceipts.length, findings: 'F173/F174/F175 remain PENDING',
  boundary: 'Fresh selected bytes/metadata/source checks and structural saved-result reconciliation, not native execution or complete dependency/toolchain/OS attestation.'
}, null, 2));
