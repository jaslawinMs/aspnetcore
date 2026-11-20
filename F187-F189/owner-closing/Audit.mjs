import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parsePe, parsePdb } from './tools/evidence.mjs';
import { readJson, sha256, same, requireThat, reconcileNative } from './tools/Checks.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const read = relative => fs.readFileSync(path.join(root, relative));
const json = relative => readJson(path.join(root, relative));
const expectedExclusions = ['MANIFEST.json', 'MANIFEST.sha256'];
const walk = (directory = root, prefix = '') => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  requireThat(!entry.isSymbolicLink(), 'Capsule must not read through a link');
  const relative = prefix ? prefix + '/' + entry.name : entry.name;
  return entry.isDirectory() ? walk(path.join(directory, entry.name), relative) : [relative];
});
requireThat(process.permission && !process.permission.has('fs.write', root) && !process.permission.has('child'), 'Audit must run with write and child-process permissions denied');
requireThat(process.permission.has('fs.read', root) && !process.permission.has('fs.read', path.dirname(root)) &&
  process.execArgv.includes('--no-addons'), 'Audit read grant must be capsule-contained and addons disabled');
const manifestBytes = read('MANIFEST.json'), manifest = json('MANIFEST.json');
same(manifest.exclusions, expectedExclusions, 'Only explicit manifest/hash self exclusions are allowed');
requireThat(read('MANIFEST.sha256').toString('ascii').trim() === sha256(manifestBytes), 'Manifest sidecar hash');
const actualFiles = walk().filter(relative => !expectedExclusions.includes(relative)).sort();
same(actualFiles, manifest.files.map(file => file.path).sort(), 'Complete capsule membership reconciliation');
for (const file of manifest.files) {
  requireThat(file.path && !file.path.startsWith('/') && !file.path.includes('\\') && !file.path.split('/').includes('..') && !file.path.includes(':'), 'Only portable contained manifest paths');
  const bytes = read(file.path);
  requireThat(bytes.length === file.bytes && sha256(bytes) === file.sha256, `Manifest raw bytes/hash: ${file.path}`);
}
requireThat(new Set(manifest.files.map(file => file.path)).size === manifest.files.length &&
  manifest.fileCount === manifest.files.length &&
  manifest.byteCount === manifest.files.reduce((sum, file) => sum + file.bytes, 0), 'Manifest exact file/byte counts');
requireThat(sha256(read('tools/evidence.mjs')).toUpperCase() === 'B9CC008F31DB35B874C17BB484CDD2C60F997ADA7FBA3A6A1562A05E485832B6', 'Exact provenance-bound PE/PDB/XML parser');
const results = json('RESULTS.json');
same(results.findings.map(finding => [finding.id, finding.status]), [['F187', 'PENDING'], ['F188', 'PENDING'], ['F189', 'PENDING']], 'No finding disposition is authorized');
requireThat(results.agentId === 'a46e395c-3977-48fa-b406-4126e927dd1e', 'Actual registered owner');
const parseTree = bytes => {
  const entries = [];
  for (let cursor = 0; cursor < bytes.length;) {
    const space = bytes.indexOf(32, cursor), nul = bytes.indexOf(0, space + 1);
    requireThat(space > cursor && nul > space && nul + 21 <= bytes.length, 'Real raw Git tree structure');
    entries.push({ mode: bytes.subarray(cursor, space).toString('ascii'), name: bytes.subarray(space + 1, nul).toString('utf8'), id: bytes.subarray(nul + 1, nul + 21).toString('hex') });
    cursor = nul + 21;
  }
  return entries;
};
const gitObject = (id, type) => {
  const bytes = read(`git-objects/${id}.${type}`);
  const actual = crypto.createHash('sha1').update(Buffer.from(`${type} ${bytes.length}\0`)).update(bytes).digest('hex');
  requireThat(actual === id, 'Immutable Git object digest');
  return bytes;
};
let rawCheckoutDocuments = 0;
const sourcePins = { original: '37e809ead5824bc753a1c3d56f11615bdb1296c5', default: '83d976704fa0f9aa4361327d1f9d929c93bd9256' };
for (const name of ['source-records.json', 'source-records-supplement.json', 'source-records-producer.json']) {
  for (const role of json(`research/${name}`).roles) {
    requireThat(role.commit === sourcePins[role.role], 'Separate unchanged source pins');
    requireThat(/^tree ([a-f0-9]{40})\n/.exec(gitObject(role.commit, 'commit').toString('utf8'))?.[1] === role.rootTree, 'Commit/root-tree association');
    for (const object of role.objects) {
      const bytes = gitObject(object.id, object.type);
      requireThat(bytes.length === object.bytes && sha256(bytes) === object.sha256, 'Recorded Git bytes');
    }
    for (const source of role.selected) {
      let current = role.rootTree;
      const parts = source.repositoryPath.split('/');
      requireThat(parts.length === source.proof.length, 'Source path/proof cardinality');
      for (const [index, segment] of parts.entries()) {
        const proof = source.proof[index];
        requireThat(proof.tree === current && proof.name === segment, 'Raw source path proof continuity');
        const entries = parseTree(gitObject(current, 'tree')).filter(entry => entry.name === segment);
        requireThat(entries.length === 1 && entries[0].id === proof.id && entries[0].mode === proof.mode, 'Raw source path Merkle membership');
        current = proof.id;
      }
      requireThat(current === source.gitBlob, 'Selected Git blob proof');
      const blob = gitObject(current, 'blob'), checkout = read(source.checkout.path);
      requireThat(sha256(blob) === source.gitObject.sha256 && blob.length === source.gitObject.bytes &&
        sha256(checkout) === source.checkout.sha256 && checkout.length === source.checkout.bytes &&
        checkout.equals(blob) === source.rawCheckoutEqualsRawGitBlob, 'Independent raw Git/checkout bytes; no normalization');
      rawCheckoutDocuments++;
    }
  }
}
const native = reconcileNative(root);
same(native, json('research/xml-portable-reconciliation.json'), 'Fresh portable/System.Xml full native reconciliation');
requireThat(native.actualRowExecutions === 38 && native.byRole.original === 19 && native.byRole.default === 19, 'Actual native expanded cases');
const expectedCommon = [
  ['F187_MissingDirectoryIdentityAndRegisteredState', 22], ['F187_PublicRazorEnumeration_UsesRealProvider', 10],
  ['F188_MissingFileContractAndMutableLookup', 35], ['F188_PublicRazorMissingItemAndCompilerCache', 16],
  ['F188_PublicFileVersionProvider_CacheAndHelperInvalidation', 12], ['F189_ExistingHostedFixture_ExcludesNestedAndExecutesDiscoveredControl', 33]
];
let acceptedAssertions = 0;
const commonHashes = [];
for (const role of ['original', 'default']) {
  const report = json(`reports/${role}-common-002.json`), command = json(`commands/raw/${role}-common-002.terminal.json`);
  requireThat(report.result === 'PASS' && report.status === 'PENDING' && command.exitCode === 0 &&
    report.identity.processId === command.root.processId && report.identity.creationUtc === command.root.creationUtc, 'Actual accepted common invocation');
  same(report.rows.map(row => row.Name), expectedCommon.map(([name]) => name), 'Every common case actually executed');
  for (const [index, [, count]] of expectedCommon.entries()) {
    const row = report.rows[index];
    requireThat(row.Result === 'Passed' && row.Failure === null && row.Assertions.length === count &&
      row.Assertions.every(assertion => assertion.Passed) && row.Observations.length > 0, 'Actual accepted producer/assertion evidence');
    acceptedAssertions += row.Assertions.length;
  }
  const hostEvents = report.rows[5].Observations[0].events;
  requireThat(hostEvents.length === 8 && hostEvents.every(event => event.Path === '/constructorinjection'), 'Only actually hosted control events were observed; nested target is not executed');
  commonHashes.push(report.identity.assemblies.find(assembly => assembly.name === 'AutoPerf.Mvc.HelperPreparation').sha256);
  const earlier = json(`reports/${role}-common-001.json`);
  requireThat(earlier.result === 'FAIL' && earlier.rows.filter(row => row.Result === 'Failed').length === 1 &&
    earlier.rows.reduce((sum, row) => sum + row.Assertions.length, 0) === 119, 'Preserved earlier failed consumer cohort');
}
same(commonHashes, [commonHashes[0], commonHashes[0]], 'Actual accepted common bytes identical across roles');
requireThat(acceptedAssertions === 256, 'Every accepted actual supplemental assertion');
const consumer = json('research/consumer-summary.json');
requireThat(consumer.successfulCommonCompilations === 2 && consumer.failedCommonCompilations === 0 && consumer.compilations.length === 2, 'All successful common compilation cohorts must be retained/countable');
const metadata = json('research/metadata-records.json');
for (const record of metadata.retained) {
  const bytes = read(record.path);
  requireThat(bytes.length === record.bytes && sha256(bytes) === record.sha256, 'Retained selected image bytes');
  if (record.pe) same(parsePe(bytes), record.pe, 'Fresh real PE metadata');
}
let rawDocumentChecks = 0;
for (const pair of metadata.pairs) {
  if (!pair.pdb) continue;
  const pe = parsePe(read(pair.pe.path)), pdb = parsePdb(read(pair.pdb.path));
  same(pdb, pair.pdb.parsed, 'Fresh real portable PDB metadata');
  requireThat(pe.codeView.some(view => view.guid === pdb.guid && view.stamp === pdb.stamp && view.age === 1), 'Fresh real PE/PDB association');
  for (const selected of pair.selectedDocuments) {
    const document = pdb.documents.find(document => document.row === selected.document.row);
    same(document, selected.document, 'Real selected raw-source PDB document row');
    const bytes = read(selected.source.path), actual = crypto.createHash(selected.algorithm).update(bytes).digest('hex');
    requireThat(actual === document.checksum && actual === selected.actualRawChecksum && sha256(bytes) === selected.source.sha256, 'Raw source checksum without newline normalization');
    rawDocumentChecks++;
  }
}
requireThat(rawDocumentChecks === metadata.counts.selectedRawDocumentChecks, 'Every selected raw PDB document check');
for (const load of metadata.actualLoads) {
  requireThat(load.retainedPePaths.some(relative => {
    const bytes = read(relative), pe = parsePe(bytes);
    return sha256(bytes) === load.sha256.toLowerCase() && pe.mvid === load.mvid.toLowerCase();
  }), 'Actual supplemental reflection identity bound to a retained PE');
}
for (const nativeObservation of metadata.nativeObservations) {
  const modules = json(`commands/raw/${nativeObservation.label}.modules.json`);
  for (const entry of nativeObservation.observed) {
    const files = modules.files.filter(file => path.basename(file.path).toLowerCase() === entry.name.toLowerCase());
    requireThat(entry.actuallyObserved === (files.length > 0), 'Native observation availability cannot be filled from supplemental reflection');
    same(entry.observations.map(observation => observation.actualObservedFile), files, 'Actual native module observations remain native-only');
    for (const observation of entry.observations) {
      for (const match of observation.selectedPeMatches) {
        const bytes = read(match.path);
        requireThat(sha256(bytes) === observation.actualObservedFile.sha256.toLowerCase() && parsePe(bytes).mvid === match.mvid, 'Native path/hash-bound selected PE MVID');
      }
    }
  }
}
const input = json('research/consumer-inputs.json');
for (const record of input.inputRecords) {
  const bytes = read(record.path);
  requireThat(bytes.length === record.bytes && sha256(bytes) === record.sha256, 'Explicit common compiler/reference input');
  if (record.pe) same(parsePe(bytes), record.pe, 'Fresh explicit common input PE');
}
const startedFiles = manifest.files.filter(file => /^commands\/raw\/.*\.started\.json$/.test(file.path));
const recorderHashes = new Set(manifest.files.filter(file => /^commands\/.*\.ps1$/.test(file.path)).map(file => file.sha256));
for (const file of startedFiles) {
  const started = json(file.path), terminal = json(file.path.replace('.started.json', '.terminal.json'));
  same(started.root, terminal.root, 'Exact creation-bound native root receipt');
  requireThat(terminal.state === 'terminal' && terminal.rootExited && terminal.bothStreamsDrained && terminal.observedDescendantsDrained &&
    typeof terminal.exitCode === 'number' && started.policy.actualWorkerBuildHoldActive === false && started.policy.workersMayBuildOrTest === true, 'Actual command terminal/policy evidence');
  requireThat(recorderHashes.has(started.recorderSha256.toLowerCase()), 'Exact invoked recorder source version must be retained');
  requireThat(fs.existsSync(path.join(root, file.path.replace('.started.json', '.stdout.txt'))) &&
    fs.existsSync(path.join(root, file.path.replace('.started.json', '.stderr.txt'))), 'Both actual command streams are retained');
}
const closing = json('research/closing-identity.json');
requireThat(closing.result === 'PASS' && closing.priorRecordedCreationsAlive === 0 && closing.scopedCreationChecks.every(check => !check.exactRecordedCreationAlive), 'Final bounded prior creation check');
requireThat(closing.sdkPrerequisiteRehashes.every(check => check.matched), 'Read-only selected SDK rehashes');
const freshness = json('research/closing-source-freshness.json');
requireThat(freshness.result === 'PASS' && freshness.testedDefault === sourcePins.default && freshness.wholeLatestMainBinariesTested === false, 'Latest source observation is not relabeled as tested whole-main binaries');
const closingApi = json('commands/raw/closing-main-api-final.stdout.txt');
const closingRemote = read('commands/raw/closing-main-lsremote-final.stdout.txt').toString('utf8').trim().split(/\s+/);
requireThat(closingApi.sha === freshness.latestObservedHead && closingRemote[0] === freshness.latestObservedHead &&
  closingRemote[1] === 'refs/heads/main' && /^tree ([a-f0-9]{40})\n/.exec(gitObject(freshness.latestObservedHead, 'commit').toString('utf8'))?.[1] === freshness.rootTree, 'Independent actual closing ref/commit/root-tree evidence');
for (const selected of freshness.targets) {
  requireThat(selected.testedDefaultBlob === selected.closingBlob && selected.originalBlob === selected.closingBlob, 'Closing target freshness at exact independently observed default head');
  let current = freshness.rootTree;
  const parts = selected.repositoryPath.split('/');
  requireThat(parts.length === selected.proof.length, 'Closing source path/proof cardinality');
  for (const [index, part] of parts.entries()) {
    const proof = selected.proof[index];
    const entries = parseTree(gitObject(current, 'tree')).filter(entry => entry.name === part);
    requireThat(entries.length === 1 && proof.tree === current && proof.name === part &&
      entries[0].id === proof.id && entries[0].mode === proof.mode, 'Closing raw source path membership');
    current = proof.id;
  }
  requireThat(current === selected.closingBlob, 'Closing target actual blob association');
  gitObject(selected.closingBlob, 'blob');
}
console.log(JSON.stringify({
  result: 'PASS', auditVersion: 1, node: process.version,
  permissions: { capsuleReadOnly: true, filesystemWritesDenied: true, childrenDenied: true, addonsDisabledByCommand: process.execArgv.includes('--no-addons') },
  manifestSha256: sha256(manifestBytes), files: manifest.fileCount, bytes: manifest.byteCount,
  nativeRows: native.actualRowExecutions, nativeRowsByRole: native.byRole,
  acceptedCommonRows: 12, acceptedAssertions, successfulCommonCompilations: 2, failedCommonCompilations: 0,
  selectedRawCheckoutDocuments: rawCheckoutDocuments, selectedRawPdbDocumentChecks: rawDocumentChecks,
  metadataCounts: metadata.counts, recordedCommandRoots: startedFiles.length,
  findingsStatus: 'PENDING',
  boundary: 'Capsule-contained reads and pure parsing only; no child execution, checkout/donor reads, network, dependency installation, benchmark, disposition or complete toolchain/runtime/OS closure claim.'
}));
