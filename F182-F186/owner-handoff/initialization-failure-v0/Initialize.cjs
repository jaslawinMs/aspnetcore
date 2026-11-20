'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = __dirname, work = path.dirname(root);
const par = path.dirname(work);
const donor = path.join(par, 'finding-F173-F175-013', 'capsule');
const sha = b => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
function write(name, bytes) {
  const destination = path.join(root, name);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  assert(!fs.existsSync(destination), `Never overwrite ${name}`);
  fs.writeFileSync(destination, bytes);
}
const json = (n, x) => write(n, JSON.stringify(x, null, 2) + '\n');
const commands = [];
function observe(label, exe, args, cwd = 'C:\\src\\aspnetcore') {
  const startedAt = new Date().toISOString();
  const result = cp.spawnSync(exe, args, { cwd, encoding: null, windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  write(`evidence/${label}.stdout.txt`, result.stdout ?? '');
  write(`evidence/${label}.stderr.txt`, result.stderr ?? '');
  const record = { label, executable: exe, arguments: args, checkout: cwd, startedAt, exitedAt: new Date().toISOString(),
    exitCode: result.status, signal: result.signal, error: result.error?.message ?? null, exited: result.status !== null, bothStreamsDrained: true };
  commands.push(record);
  json(`evidence/${label}.observation.json`, record);
  assert.equal(result.status, 0, `${label}: ${result.stderr}`);
  return result.stdout.toString('utf8').trim();
}
const git = (label, repo, args) => observe(label, 'git', ['--no-optional-locks', '--no-pager', '-C', repo, ...args], repo);
const originalCommit = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const defaultCommit = '90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d';
const graphs = { originalCommit, defaultCommit, originalPath: 'C:\\src\\ap-F173-o013', defaultPath: 'C:\\src\\ap-F173-d013' };
const repository = JSON.parse(observe('entry-upstream', 'gh', ['api', 'repos/dotnet/aspnetcore', '--jq', '{full_name,default_branch,pushed_at}']));
const lsRemote = observe('entry-ls-remote', 'git', ['ls-remote', 'https://github.com/dotnet/aspnetcore.git', 'refs/heads/main']);
assert.equal(repository.default_branch, 'main');
assert.equal(lsRemote.split(/\s+/)[0], defaultCommit, 'Fresh main must still match reused whole Default graph');
const coordinator = {
  branch: git('entry-coordinator-branch', 'C:\\src\\aspnetcore', ['branch', '--show-current']),
  head: git('entry-coordinator-head', 'C:\\src\\aspnetcore', ['rev-parse', 'HEAD']),
  status: git('entry-coordinator-status', 'C:\\src\\aspnetcore', ['status', '--porcelain=v1', '--untracked-files=all']),
  indexSha256: sha(fs.readFileSync('C:\\src\\aspnetcore\\.git\\index'))
};
const policyBytes = fs.readFileSync(path.join(par, 'policy.json')), policy = JSON.parse(policyBytes);
write('entry-policy.json', policyBytes);
assert.equal(policy.actualWorkerBuildHoldActive, false);
assert.equal(policy.workersMayBuildOrTest, true);
const candidates = readJson(path.join(par, '..', 'autoperf-campaign.json')).candidates.filter(c => ['F182','F183','F184','F185','F186'].includes(c.id));
assert.deepEqual(candidates.map(c => c.id).sort(), ['F182','F183','F184','F185','F186']);
assert(candidates.every(c => c.status.toLowerCase() === 'pending'));
json('candidates-entry.json', candidates);
const donorManifestBytes = fs.readFileSync(path.join(donor, 'MANIFEST.json'));
const donorManifest = JSON.parse(donorManifestBytes);
assert.equal(fs.readFileSync(path.join(donor, 'MANIFEST.sha256'), 'utf8').trim(), `${sha(donorManifestBytes)}  MANIFEST.json`);
const donorFiles = new Map(donorManifest.files.map(f => [f.path, f]));
const copied = [];
function reuse(name, destination = name) {
  const record = donorFiles.get(name), bytes = fs.readFileSync(path.join(donor, name));
  assert(record && bytes.length === record.bytes && sha(bytes) === record.sha256, name);
  write(destination, bytes);
  copied.push({ donorPath: name, selected: destination, bytes: bytes.length, sha256: sha(bytes) });
}
for (const name of ['Metadata.cjs','PeExtras.cjs','GitObjects.cjs','Xml.cjs','Reconcile.cjs','Run-Native.ps1','Prepare-Consumer.cjs','Seal-GitProofs.cjs','Seal-Manifest.cjs'])
  reuse(name, `reuse/helpers/${name}`);
for (const name of ['Metadata.cjs','PeExtras.cjs','GitObjects.cjs','Xml.cjs','Reconcile.cjs']) reuse(name);
for (const name of ['HANDOFF.md','OWNERSHIP.json','RESULTS.json','MANIFEST.json','MANIFEST.sha256','native-images.json','native-images-final.json',
  'runtime-images.json','native-declarations.json','graph-creation.json','source-records.json','additional-source-records.json','git-source-proofs.json',
  'selected-records.json','native-selection.json','native-reconciliation.json','TERMINAL.json']) {
  if (name.startsWith('MANIFEST')) {
    const bytes = fs.readFileSync(path.join(donor, name)); write(`reuse/records/${name}`, bytes);
    copied.push({ donorPath: name, selected: `reuse/records/${name}`, bytes: bytes.length, sha256: sha(bytes), donorManifestSelfFile: true });
  } else reuse(name, `reuse/records/${name}`);
}
for (const file of donorManifest.files) {
  if (file.path.startsWith('source/') || file.path.startsWith('git-objects/') || file.path.startsWith('docs/')) reuse(file.path);
}
for (const name of ['source-records.json','additional-source-records.json','git-source-proofs.json','native-declarations.json']) reuse(name);
const selected = readJson(path.join(donor, 'selected-records.json'));
selected.files = selected.files.filter(f => f.role !== 'common');
selected.images = selected.images.filter(f => f.role !== 'common');
selected.pairs = selected.pairs.filter(f => f.role !== 'common');
selected.documents = selected.documents.filter(f => f.role !== 'common');
for (const record of [...selected.files, ...selected.documents]) reuse(record.selected);
json('selected-records.json', selected);
const initialNative = readJson(path.join(donor, 'native-images-final.json')), runtimes = readJson(path.join(donor, 'runtime-images.json'));
function inventory(directory, relative = '') {
  const files = [];
  for (const e of fs.readdirSync(path.join(directory, relative), { withFileTypes: true })) {
    const n = path.join(relative, e.name);
    assert(!e.isSymbolicLink(), `No symlinks inside native image ${n}`);
    if (e.isDirectory()) files.push(...inventory(directory, n));
    else { const b = fs.readFileSync(path.join(directory, n)); files.push({ path: n.replaceAll('\\','/'), bytes: b.length, sha256: sha(b) }); }
  }
  return files.sort((a,b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
const graphChecks = [], imageCopies = { images: {} }, runtimeChecks = [];
for (const role of ['original','default']) {
  const checkout = graphs[`${role}Path`], commit = graphs[`${role}Commit`];
  const head = git(`entry-${role}-head`, checkout, ['rev-parse','HEAD']);
  const status = git(`entry-${role}-status`, checkout, ['status','--porcelain=v1','--untracked-files=all']);
  assert.equal(head, commit); assert.equal(status, '');
  const target = 'src/Identity/test/InMemory.Test/InMemoryStore.cs';
  const blob = git(`entry-${role}-target-blob`, checkout, ['rev-parse',`${commit}:${target}`]);
  const targetBytes = fs.readFileSync(path.join(checkout, target));
  const pinned = fs.readFileSync(path.join(root, 'source', role, target));
  assert(Buffer.from(targetBytes.toString('utf8').replace(/\r\n/g,'\n')).equals(pinned));
  const native = initialNative.images[role];
  assert.deepEqual(inventory(native.directory), native.files, 'Every reused native file matches donor sealed inventory');
  const destination = path.join(work, 'images', role);
  assert(!fs.existsSync(destination));
  fs.cpSync(native.directory, destination, { recursive: true, errorOnExist: true, force: false, dereference: true });
  const files = inventory(destination);
  assert.deepEqual(files, native.files);
  imageCopies.images[role] = { role, commit, donorDirectory: native.directory, directory: destination, files, count: files.length, bytes: files.reduce((s,f)=>s+f.bytes,0) };
  const runtime = runtimes.images.find(r => r.role === role);
  assert.deepEqual(inventory(runtime.directory), runtime.files, 'Every reused runtime file matches donor sealed inventory');
  runtimeChecks.push({ role, directory: runtime.directory, files: runtime.files, count: runtime.count, bytes: runtime.bytes });
  graphChecks.push({ role, checkout, commit, head, status, target, blob, targetCheckoutSha256: sha(targetBytes), targetPinnedSha256: sha(pinned), sdkDirectory: fs.realpathSync(path.join(checkout,'.dotnet')) });
}
json('graph-creation.json', { ...graphs, reusedReadOnly: true, sourceGraphsCreatedByThisOwner: false, imagesCopiedUnderNewRoot: true });
json('native-images-initial.json', imageCopies);
json('runtime-images.json', { images: runtimeChecks, donorRecordedDifferences: runtimes.differences });
json('reuse/provenance.json', { donorCapsule: donor, donorManifestSha256: sha(donorManifestBytes), copied,
  helpersAttribution: 'F173-F175-013 Metadata/PeExtras/GitObjects/XML/Reconcile and recorder/input/proof/manifest approaches; immutable donor originals retained under reuse/helpers.',
  reusedNativeCommon: 'All 275 files copied, including four preexisting F173 supplemental companions. Those companions are historical prerequisites, not new common compilation/execution evidence.',
  donorRecordsBoundary: 'Copied historical results/commands are attributed prior evidence, not newly executed tests/compilations of F182-F186.' });
json('entry.json', { observedAt: new Date().toISOString(), originalCommit, defaultCommit, upstreamRepository: repository, lsRemote, coordinator, graphChecks, commands });
console.log(JSON.stringify({ result: 'PASS', defaultCommit, graphChecks, copiedEvidenceFiles: copied.length,
  privateNativeImages: Object.values(imageCopies.images).map(i=>({role:i.role,count:i.count,bytes:i.bytes})), runtimeChecks: runtimeChecks.map(r=>({role:r.role,count:r.count,bytes:r.bytes})) }));
