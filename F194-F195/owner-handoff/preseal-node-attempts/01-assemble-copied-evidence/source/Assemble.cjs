'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const m = require('./Metadata.cjs');
const xml = require('./Xml.cjs');
const root = __dirname, capsule = path.join(root, 'capsule');
assert(!fs.existsSync(path.join(capsule, 'MANIFEST.json')), 'Never modify sealed payload');
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
function write(relative, bytes) {
  const destination = path.join(capsule, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes);
  return relative;
}
function json(relative, data) { return write(relative, JSON.stringify(data, null, 2)); }
function copy(source, relative) { return write(relative, fs.readFileSync(source)); }
function copyTree(source, relative) {
  for (const item of fs.readdirSync(source, { withFileTypes: true })) {
    assert(!item.isSymbolicLink(), 'Do not copy evidence through an undeclared link');
    const from = path.join(source, item.name), to = path.join(relative, item.name);
    if (item.isDirectory()) copyTree(from, to);
    else if (item.isFile()) copy(from, to);
  }
}
const checklist = readJson(path.join(root, 'contract-checklist.json'));
const roles = [
  { role: 'Original', key: 'original', graph: String.raw`C:\src\ap-F194-o042`, sha: checklist.sourceRoles.Original, expectedRuntime: '.NET 12.0.0-alpha.1.26562.105', nativeAttempt: '11-original-native-selected-tests', supplementalAttempt: '13-original-common-consumer' },
  { role: 'Default', key: 'default', graph: String.raw`C:\src\ap-F194-d042`, sha: checklist.sourceRoles.Default, expectedRuntime: '.NET 12.0.0-alpha.1.26569.107', nativeAttempt: '12-default-native-selected-tests', supplementalAttempt: '14-default-common-consumer' }
];
for (const name of [
  'ENTRY-HOLD.json', 'GO.json', 'owner-registration.json', 'finding-records.json',
  'entry-head.json', 'entry-head.stdout.txt', 'entry-head.stderr.txt', 'TestEntry-history.txt',
  'graph-original-clone.txt', 'graph-original-checkout.txt', 'graph-default-clone.txt',
  'graph-default-fetch.txt', 'graph-default-checkout.txt', 'original-default-embedded.diff.txt',
  'toolchain-provenance.json', 'PRECOMPILE-FREEZE.json', 'contract-checklist.json',
  'COMMON-CONSUMER-COMPILATION.json', 'NATIVE-SELECTION.json', 'dependency-amendment-01-packs.json',
  'owned-compiler-stop.json', 'closure-attempt-01-tool-denied.json', 'exact-TestEntry-history-with-diffs.txt',
  'Run-Owned.ps1', 'Assemble.cjs'
]) copy(path.join(root, name), path.join('evidence', name));
for (const directory of ['attempts', 'metadata-probe-01', 'metadata-probe-02', 'native', 'supplemental']) copyTree(path.join(root, directory), directory);
for (const name of ['Metadata.cjs', 'Xml.cjs']) copy(path.join(root, name), name);
for (const name of ['Program.cs', 'F194ContractConsumer.csproj']) copy(path.join(root, 'consumer', name), path.join('common', 'source', name));
const consumerBase = path.join(root, 'consumer', 'bin', 'Release', 'net12.0', 'F194ContractConsumer');
const byteObjects = new Map(), selected = [], gitObjects = new Map(), memberships = [], buildInputs = [], inputInventory = [];
for (const extension of ['dll', 'pdb', 'deps.json', 'runtimeconfig.json']) {
  const relative = path.join('common', 'bin', `F194ContractConsumer.${extension}`);
  const bytes = fs.readFileSync(`${consumerBase}.${extension}`);
  write(relative, bytes);
  byteObjects.set(m.hash(bytes), relative);
}
function git(graph, args) {
  return cp.execFileSync('git', ['--no-pager', '-C', graph, ...args], { windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
}
function gitObject(graph, type, id) {
  if (gitObjects.has(id)) {
    const item = gitObjects.get(id);
    assert.equal(item.type, type);
    return fs.readFileSync(path.join(capsule, item.path));
  }
  const bytes = git(graph, ['cat-file', type, id]);
  assert.equal(m.hash(Buffer.concat([Buffer.from(`${type} ${bytes.length}\0`), bytes]), 'sha1').toLowerCase(), id);
  const relative = path.join('git', 'objects', `${id}.${type}`);
  write(relative, bytes);
  gitObjects.set(id, { id, type, path: relative, bytes: bytes.length, sha256: m.hash(bytes) });
  return bytes;
}
function treeEntries(bytes) {
  const result = [];
  let at = 0;
  while (at < bytes.length) {
    const space = bytes.indexOf(32, at), zero = bytes.indexOf(0, space + 1);
    assert(space >= at && zero > space);
    result.push({ mode: bytes.toString('ascii', at, space), name: bytes.toString('utf8', space + 1, zero), id: m.slice(bytes, zero + 1, 20).toString('hex') });
    at = zero + 21;
  }
  return result;
}
function membership(role, relative, rawPayload) {
  const components = relative.split('\\');
  let tree = role.rootTree;
  const chain = [];
  for (let index = 0; index < components.length; index++) {
    const entries = treeEntries(gitObject(role.graph, 'tree', tree));
    const entry = entries.find(e => e.name === components[index]);
    if (!entry) return null;
    chain.push({ treeId: tree, name: entry.name, mode: entry.mode, id: entry.id });
    if (index < components.length - 1) {
      assert.equal(entry.mode, '40000');
      tree = entry.id;
    } else {
      assert(['100644', '100755'].includes(entry.mode), 'Only ordinary tracked source files are selected');
      const blob = gitObject(role.graph, 'blob', entry.id);
      let rawRelation = null;
      if (rawPayload) {
        const raw = fs.readFileSync(path.join(capsule, rawPayload));
        if (raw.equals(blob)) rawRelation = 'byte-identical-to-Git-blob';
        else {
          assert(Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n'), 'utf8').equals(blob), `Raw compiler source is neither Git-identical nor CRLF-to-LF equivalent: ${relative}`);
          rawRelation = 'raw-compiler-CRLF-to-Git-LF-only';
        }
      }
      const proof = { role: role.role, commitId: role.sha, rootTree: role.rootTree, relativePath: relative, chain, blobId: entry.id, blobPath: gitObjects.get(entry.id).path, rawPayload, rawRelation };
      memberships.push(proof);
      return proof;
    }
  }
  return null;
}
for (const role of roles) {
  assert.equal(git(role.graph, ['rev-parse', 'HEAD']).toString('utf8').trim(), role.sha);
  assert.equal(git(role.graph, ['status', '--short', '--untracked-files=no']).length, 0, 'Role worktree tracked sources changed');
  const commit = gitObject(role.graph, 'commit', role.sha);
  const match = /^tree ([0-9a-f]{40})\n/.exec(commit.toString('utf8'));
  assert(match);
  role.rootTree = match[1];
  gitObject(role.graph, 'tree', role.rootTree);
  const output = path.join(role.graph, 'artifacts', 'bin', 'Microsoft.Extensions.FileProviders.Embedded.Tests', 'Release', 'net12.0');
  role.nativeAssemblyPath = path.join(output, 'Microsoft.Extensions.FileProviders.Embedded.Tests.dll');
  for (const name of ['Microsoft.Extensions.FileProviders.Embedded.Tests', 'Microsoft.Extensions.FileProviders.Embedded']) {
    for (const extension of ['dll', 'pdb']) {
      const bytes = fs.readFileSync(path.join(output, `${name}.${extension}`));
      const relative = path.join('inputs', role.role, 'images', `${name}.${extension}`);
      write(relative, bytes);
      byteObjects.set(m.hash(bytes), relative);
    }
    selected.push({ id: `${role.role}-${name}`, role: role.role, graph: role.graph, image: path.join('inputs', role.role, 'images', `${name}.dll`), pdb: path.join('inputs', role.role, 'images', `${name}.pdb`) });
  }
  for (const extension of ['deps.json', 'runtimeconfig.json']) copy(path.join(output, `Microsoft.Extensions.FileProviders.Embedded.Tests.${extension}`), path.join('inputs', role.role, `Microsoft.Extensions.FileProviders.Embedded.Tests.${extension}`));
  const paths = [
    'global.json', 'Directory.Build.props', 'Directory.Build.targets', 'Directory.Packages.props',
    'eng\\Common.props', 'eng\\Versions.props', 'eng\\Version.Details.xml',
    'eng\\targets\\CSharp.Common.props', 'eng\\targets\\ResolveReferences.targets',
    'eng\\tools\\GenerateFiles\\GenerateFiles.csproj',
    'eng\\tools\\GenerateFiles\\Directory.Build.props.in', 'eng\\tools\\GenerateFiles\\Directory.Build.targets.in',
    'src\\FileProviders\\Embedded\\build.cmd',
    'src\\FileProviders\\Embedded\\test\\Microsoft.Extensions.FileProviders.Embedded.Tests.csproj',
    'src\\FileProviders\\Embedded\\src\\Microsoft.Extensions.FileProviders.Embedded.csproj',
    'src\\FileProviders\\Manifest.MSBuildTask\\src\\Microsoft.Extensions.FileProviders.Embedded.Manifest.Task.csproj',
    'docs\\BuildFromSource.md', 'docs\\BuildErrors.md'
  ];
  for (const relative of paths) {
    const source = path.join(role.graph, relative);
    if (!fs.existsSync(source)) {
      buildInputs.push({ role: role.role, sourcePath: source, availability: 'not-present-at-this-role' });
      continue;
    }
    const rawPayload = path.join('inputs', role.role, 'build-and-docs', relative);
    copy(source, rawPayload);
    assert(membership(role, relative, rawPayload), `Expected role Git membership: ${relative}`);
    buildInputs.push({ role: role.role, sourcePath: source, availability: 'copied-unchanged-role-file', path: rawPayload, sha256: m.hash(fs.readFileSync(source)) });
  }
  for (const name of ['Directory.Build.props', 'Directory.Build.targets']) {
    const source = path.join(role.graph, 'artifacts', 'bin', 'GenerateFiles', name);
    const relative = path.join('inputs', role.role, 'generated-imports', name);
    copy(source, relative);
    buildInputs.push({ role: role.role, sourcePath: source, path: relative, availability: 'native-generated-prerequisite-not-Git-source', sha256: m.hash(fs.readFileSync(source)) });
  }
}
selected.push({ id: 'Common-Consumer', role: 'Common', graph: null, image: path.join('common', 'bin', 'F194ContractConsumer.dll'), pdb: path.join('common', 'bin', 'F194ContractConsumer.pdb') });
for (const selection of selected) {
  const imageBytes = fs.readFileSync(path.join(capsule, selection.image)), pdbBytes = fs.readFileSync(path.join(capsule, selection.pdb));
  const parsed = m.associate(imageBytes, pdbBytes);
  selection.imageSHA256 = m.hash(imageBytes);
  selection.pdbSHA256 = m.hash(pdbBytes);
  selection.managedMvidFromPE = parsed.image.managed.mvid;
  selection.codeView = parsed.image.debug.find(d => d.type === 2);
  selection.pdbContentId = parsed.symbols.contentId;
  selection.documents = [];
  for (const document of parsed.symbols.documents) {
    let bytes, origin;
    if (fs.existsSync(document.name)) {
      bytes = fs.readFileSync(document.name);
      origin = 'raw-compiler-document-file';
      if (document.embedded) assert(bytes.equals(document.embedded), 'Raw and embedded document disagree');
    } else if (document.embedded) {
      bytes = document.embedded;
      origin = 'extracted-embedded-document-unavailable-as-current-raw-file';
    } else {
      selection.documents.push({ row: document.row, name: document.name, checksum: document.checksum, algorithm: document.algorithm, availability: 'unavailable-no-raw-or-embedded-document', path: null });
      continue;
    }
    m.documentHash(document, bytes);
    const relative = path.join('documents', selection.id, `${String(document.row).padStart(3, '0')}-${path.basename(document.name)}`);
    write(relative, bytes);
    const text = bytes.toString('utf8');
    const item = {
      row: document.row, name: document.name, checksum: document.checksum, algorithm: document.algorithm,
      availability: origin, path: relative, sha256: m.hash(bytes), bytes: bytes.length,
      utf8Bom: bytes.length >= 3 && bytes.subarray(0, 3).equals(Buffer.from([0xEF, 0xBB, 0xBF])),
      crlfCount: (text.match(/\r\n/g) ?? []).length, lfCount: (text.match(/\n/g) ?? []).length,
      embeddedBytes: document.embedded?.length ?? null,
      gitMembership: null
    };
    const role = roles.find(r => r.role === selection.role);
    if (role && document.name.toLowerCase().startsWith(role.graph.toLowerCase() + '\\')) {
      const relativeSource = document.name.slice(role.graph.length + 1);
      const proof = membership(role, relativeSource, relative);
      item.gitMembership = proof ? { relativePath: proof.relativePath, blobId: proof.blobId, rawRelation: proof.rawRelation } : null;
      item.sourceClass = proof ? 'tracked-role-source' : 'generated-role-source-not-Git-member';
    } else if (selection.role === 'Common') {
      item.sourceClass = document.name === path.join(root, 'consumer', 'Program.cs') ? 'frozen-common-consumer-source-not-repository-member' : 'common-consumer-generated-source-not-repository-member';
    } else {
      item.sourceClass = 'external-native-SDK-package-source-not-repository-member';
    }
    selection.documents.push(item);
  }
}
function payloadForBytes(bytes) {
  const sha256 = m.hash(bytes);
  if (!byteObjects.has(sha256)) {
    const relative = path.join('objects', 'sha256', `${sha256}.bin`);
    write(relative, bytes);
    byteObjects.set(sha256, relative);
  }
  return byteObjects.get(sha256);
}
const identityFiles = [];
for (const scope of ['native', 'supplemental']) {
  for (const role of roles) {
    const directory = path.join(capsule, scope, role.key, 'identity');
    for (const file of fs.readdirSync(directory).filter(x => x.endsWith('.json'))) {
      const receiptPath = path.join(scope, role.key, 'identity', file);
      identityFiles.push(receiptPath);
      const receipt = readJson(path.join(capsule, receiptPath));
      for (let index = 0; index < receipt.managed.length; index++) {
        const observed = receipt.managed[index];
        if (observed.error || !observed.path || !observed.sha256) {
          inputInventory.push({ kind: 'managed-observation-without-copyable-file', receipt: receiptPath, index, observed, limitation: 'No file or identity invented' });
          continue;
        }
        const bytes = fs.readFileSync(observed.path);
        assert.equal(m.hash(bytes), observed.sha256, 'Managed observed input changed since sample');
        const parsed = m.pe(bytes);
        assert(parsed.managed, 'Observed managed assembly must have CLI metadata');
        assert.equal(parsed.managed.mvid, observed.inProcessManagedMvid.toLowerCase());
        inputInventory.push({ kind: 'actual-in-process-managed-observation', receipt: receiptPath, index, sourcePath: observed.path, path: payloadForBytes(bytes), sha256: observed.sha256, observedMvid: observed.inProcessManagedMvid.toLowerCase() });
      }
      for (let index = 0; index < receipt.sampledNative.length; index++) {
        const observed = receipt.sampledNative[index];
        const bytes = fs.readFileSync(observed.path);
        assert.equal(m.hash(bytes), observed.sha256, 'Sampled native input changed since sample');
        m.pe(bytes);
        inputInventory.push({ kind: 'sampled-native-module-file-not-managed-MVID-observation', receipt: receiptPath, index, sourcePath: observed.path, path: payloadForBytes(bytes), sha256: observed.sha256 });
      }
    }
  }
}
const nativeInputs = ['xunit.assert.dll', 'xunit.core.dll', 'xunit.abstractions.dll', 'xunit.execution.dotnet.dll', 'xunit.runner.visualstudio.testadapter.dll', 'Moq.dll', 'testhost.dll', 'testhost.exe'];
for (const role of roles) {
  const directory = path.dirname(role.nativeAssemblyPath);
  for (const name of nativeInputs) {
    const source = path.join(directory, name);
    if (!fs.existsSync(source)) {
      inputInventory.push({ kind: 'native-output-file-not-present', role: role.role, sourcePath: source, limitation: 'Not fabricated or replaced' });
      continue;
    }
    const bytes = fs.readFileSync(source), parsed = m.pe(bytes);
    inputInventory.push({ kind: 'native-output-file-sample-not-in-process-observation', role: role.role, sourcePath: source, path: payloadForBytes(bytes), sha256: m.hash(bytes), fileMvid: parsed.managed?.mvid ?? null });
  }
}
for (const name of ['MSBuild.dll', 'vstest.console.dll', 'Roslyn\\bincore\\csc.dll', 'Roslyn\\bincore\\VBCSCompiler.exe']) {
  const source = path.join(root, 'toolchain', 'sdk', '12.0.100-alpha.1.26557.102', name);
  const bytes = fs.readFileSync(source), parsed = m.pe(bytes);
  inputInventory.push({ kind: 'copied-SDK-tool-file-sample-not-compiler-process-closure', sourcePath: source, originalDonorPath: path.join(String.raw`C:\src\aspnetcore\.dotnet\sdk\12.0.100-alpha.1.26557.102`, name), path: payloadForBytes(bytes), sha256: m.hash(bytes), fileMvid: parsed.managed?.mvid ?? null });
}
for (const name of ['.github\\instructions\\cross-cutting-guidance.instructions.md', '.github\\instructions\\build.instructions.md', 'docs\\CrossCuttingGuidance.md']) {
  const source = path.join(String.raw`C:\src\aspnetcore`, name);
  copy(source, path.join('evidence', 'read-instructions-from-R', name));
}
const attempts = fs.readdirSync(path.join(capsule, 'attempts')).map(id => {
  const receipt = readJson(path.join(capsule, 'attempts', id, 'receipt.json'));
  return { id, exitCode: receipt.rootExitCode, root: receipt.ownedRoot, rootHasExited: receipt.rootHasExited, stdoutDrained: receipt.stdoutTaskCompleted, stderrDrained: receipt.stderrTaskCompleted };
});
const roleResults = [];
for (const role of roles) {
  const trxPath = path.join('native', role.key, 'results', 'selected.trx');
  const reconciliation = xml.reconcileTrx(fs.readFileSync(path.join(capsule, trxPath)), checklist.nativeMethods, checklist.theoryRows, role.nativeAssemblyPath);
  const supplementalPath = path.join('supplemental', role.key, 'results.json');
  const supplemental = readJson(path.join(capsule, supplementalPath));
  assert.equal(supplemental.framework, role.expectedRuntime);
  assert.equal(supplemental.total, 12);
  assert.equal(supplemental.passed, 12);
  assert.equal(supplemental.failed, 0);
  const testHostEntries = identityFiles.filter(p => p.startsWith(path.join('native', role.key)) && p.endsWith('-entry.json')).filter(p => readJson(path.join(capsule, p)).processPath.endsWith('testhost.exe'));
  assert.equal(testHostEntries.length, 1);
  const testHost = readJson(path.join(capsule, testHostEntries[0]));
  assert.equal(testHost.framework, role.expectedRuntime);
  const expectedExit = testHostEntries[0].replace('-entry.json', '-exit.json');
  roleResults.push({
    role: role.role, sourceCommit: role.sha, rootTree: role.rootTree, graph: role.graph,
    nativeAssemblyPath: role.nativeAssemblyPath, nativeAttempt: role.nativeAttempt,
    trxPath, native: reconciliation, supplementalPath, supplementalAttempt: role.supplementalAttempt,
    supplemental: { total: supplemental.total, passed: supplemental.passed, failed: supplemental.failed, framework: supplemental.framework, cases: supplemental.cases.map(c => ({ id: c.id, boundary: c.boundary, outcome: c.outcome })) },
    testHostEntryIdentity: testHostEntries[0], testHostPID: testHost.pid, testHostCreationUtc: testHost.creationUtc,
    testHostExitHookAvailable: fs.existsSync(path.join(capsule, expectedExit)),
    nativeTestAssemblyInProcessMvidObservedByHook: false,
    nativeIdentityLimit: 'Native testhost entry records the exact runtime and early loaded managed identities. Native testhost exit hook did not run; selected test/product MVIDs are PE file samples at that boundary, and are actual in-process reflection identities only in the separately identified common-consumer executions.'
  });
}
json('metadata.json', selected);
json('git\\proofs.json', { objects: [...gitObjects.values()], memberships });
json('input-inventory.json', { observations: inputInventory, identityFiles, buildInputs, limitation: 'All declared copied bytes are audited. This is not a complete compiler, native dependency, runtime, unobserved assembly, or process closure.' });
json('RESULTS.json', {
  schema: 1, ownerId: checklist.ownerId, findings: { F194: 'PENDING', F195: 'PENDING' }, comparisonAuthorizations: 0,
  preparationOnly: true, defaultEntrySHA: checklist.sourceRoles.Default, originalSHA: checklist.sourceRoles.Original,
  commonConsumer: { successfulCompilations: 1, sourceRevisions: 0, compilationRecord: 'evidence\\COMMON-CONSUMER-COMPILATION.json', sameDLLForBothRolesAndHooks: true },
  roles: roleResults, attempts,
  selectedPEPDBPairs: selected.length,
  selectedDocumentRows: selected.reduce((sum, item) => sum + item.documents.length, 0),
  copiedSelectedDocumentRows: selected.reduce((sum, item) => sum + item.documents.filter(d => d.path).length, 0),
  conclusions: [
    'GetFiles is an eager recursive test-support producer. File nodes contribute no descendants. At each directory direct files precede recursively flattened child directories, with stable input order within each group.',
    'The final materialization gives an eager shallow snapshot of file object membership, not immutable file objects. Repeated enumeration of that returned result does not revisit the original child array in the exercised cases.',
    'TestAssembly first writes the XML manifest from the input child order, then snapshots flattened resource-path strings. Public provider directory order follows the parsed XML manifest, not the helper flattening order.',
    'The two existing intermediate ToArray sites were left unchanged. Deliberate direct-helper invalid-input diagnostics establish synchronous exceptions before a result is returned, not legal ordinary public-provider scenarios.',
    'Native selected scenarios and common-consumer cases establish bounded correctness observations only. They are different source/runtime characterizations, not causal performance comparisons.'
  ],
  workloadEvidence: { owner: 'test-only TestEntry.GetFiles called by TestAssembly(TestEntry)', nativeSelectedCasesPerRole: 11, supplementalCasesPerRole: 12, mixedSupplementalFiles: 6, mixedSupplementalDirectoriesIncludingRoot: 5, mixedSupplementalMaximumFileDepth: 3, frequency: 'One flattening at each exercised TestAssembly construction plus recursive calls per directory; broader campaign, production, and user workload frequency unestablished.' },
  exclusions: checklist.excluded,
  missingOrLimitedEvidence: [
    'No candidate implementation, candidate tests, benchmark, allocation/timing loop, performance verdict, or comparison authorization.',
    'Native testhost exit hook is absent; its exit code is not invented. Native runner roots have real exit codes and sampled descendant identities have separate OS terminal checks.',
    'Selected native test/product MVIDs are actual managed reflection observations in the common consumer, not native testhost load observations.',
    'Only net12.0 selected native tests were executed. net472 and all other native cases were not run.',
    'Copied compiler inputs, runtime files, and loaded-assembly snapshots do not establish complete compiler/native/runtime or universal process closure.'
  ]
});
console.log(JSON.stringify({ assembled: capsule, selectedPairs: selected.length, documents: selected.reduce((n, s) => n + s.documents.length, 0), observations: inputInventory.length, byteObjects: byteObjects.size, gitObjects: gitObjects.size, memberships: memberships.length, nativeCases: roleResults.map(r => [r.role, r.native.total]), supplementalCases: roleResults.map(r => [r.role, r.supplemental.total]) }));
