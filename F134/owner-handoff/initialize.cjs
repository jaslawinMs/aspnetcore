const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const root = __dirname;
const accepted = path.join(path.dirname(root), 'worker-a');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const receipt = [];
function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  const before = hash(from);
  const after = hash(to);
  if (before !== after) throw Error(`Copy mismatch: ${from}`);
  receipt.push({ from, to: path.relative(root, to), sha256: before, bytes: fs.statSync(to).size });
}
function git(args) {
  const r = cp.spawnSync('git', ['--no-pager', '-C', 'C:\\src\\aspnetcore', ...args], { encoding: null, maxBuffer: 8 * 1024 * 1024 });
  if (r.status !== 0) throw Error(r.stderr.toString());
  return r.stdout;
}
function json(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
for (const name of ['inputs', 'logs', 'repo', 'consumer', 'out', 'evidence']) fs.mkdirSync(path.join(root, name), { recursive: true });
const revisions = {
  original: '37e809ead5824bc753a1c3d56f11615bdb1296c5',
  default: 'ae89581dfd24c6277b4267a9779d05f7b9f047f1'
};
for (const [variant, revision] of Object.entries(revisions)) {
  const stage = variant === 'original' ? 'runtime-003' : 'runtime-default-004';
  const name = variant === 'original' ? 'F134-original-003' : 'F134-default-001';
  const closure = path.join(accepted, stage, 'closures', name);
  const to = path.join(root, 'inputs', variant);
  for (const file of fs.readdirSync(path.join(closure, 'assemblies'))) {
    if (/\.(dll|pdb)$/.test(file)) copy(path.join(closure, 'assemblies', file), path.join(to, 'assemblies', file));
  }
  for (const file of fs.readdirSync(closure)) {
    if (fs.statSync(path.join(closure, file)).isFile()) copy(path.join(closure, file), path.join(to, 'accepted', file));
  }
  const source = 'src/Hosting/TestHost/src/WebSocketClient.cs';
  fs.mkdirSync(path.join(to, 'source'), { recursive: true });
  fs.writeFileSync(path.join(to, 'source', 'WebSocketClient.cs'), git(['show', `${revision}:${source}`]));
  const payload = {
    findingId: 'F134',
    sourceRevision: revision,
    sourceVariant: variant,
    sourceBuildAttestation: 'coordinator-attests-source-built',
    sourceFileRelativePath: source.replaceAll('/', '\\'),
    sourceSnapshotPath: path.join(to, 'source', 'WebSocketClient.cs'),
    sourceSha256: hash(path.join(to, 'source', 'WebSocketClient.cs')),
    assembliesDirectory: path.join(to, 'assemblies'),
    assemblySha256: Object.fromEntries(fs.readdirSync(path.join(to, 'assemblies')).filter(f => /^(Microsoft\.AspNetCore|Microsoft\.Extensions|Microsoft\.Net\.Http\.Headers|Microsoft\.OpenApi).*\.dll$/.test(f)).map(f => [f, hash(path.join(to, 'assemblies', f))])),
    inheritedOwnerProof: path.join(to, 'accepted', 'InputProvenance.json'),
    boundary: 'Fresh consumer source/output graph; accepted owner and dependency PEs copied without modification; source-build PE/PDB proof is inherited, not a new owner rebuild.'
  };
  json(path.join(to, 'payload.json'), payload);
}
const report = JSON.parse(fs.readFileSync(path.join(accepted, 'findings.json')));
json(path.join(root, 'evidence', 'accepted-F134-research.json'), report.find(f => f.findingId === 'F134'));
for (const stage of ['runtime-003', 'runtime-default-004']) {
  const file = stage === 'runtime-003' ? 'runtime-report.json' : 'runtime-default-report.json';
  const r = JSON.parse(fs.readFileSync(path.join(accepted, stage, file)));
  json(path.join(root, 'evidence', `${stage}-F134.json`), r.cases.find(f => f.findingId === 'F134'));
}
for (const file of ['activate.ps1', 'global.json']) fs.writeFileSync(path.join(root, 'repo', file), git(['show', `${revisions.default}:${file}`]));
for (const file of ['src/Hosting/TestHost/test/WebSocketClientTests.cs', 'src/Hosting/TestHost/test/TestClientTests.cs', 'src/Hosting/TestHost/src/TestWebSocket.cs']) {
  fs.writeFileSync(path.join(root, 'evidence', path.basename(file)), git(['show', `${revisions.default}:${file}`]));
}
copy(path.join(accepted, 'preparation-002', 'F134', 'ProbeSupport.cs'), path.join(root, 'consumer', 'ProbeSupport.cs'));
copy(path.join(accepted, 'preparation-002', 'F134', 'F134.Characterization.csproj'), path.join(root, 'consumer', 'F134.Characterization.csproj'));
const testOutput = 'C:\\src\\autoperf-worker-a-default\\artifacts\\bin\\Microsoft.AspNetCore.TestHost.Tests\\Release\\net12.0';
function copyTree(from, to) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw Error(`Unexpected link: ${entry.name}`);
    const src = path.join(from, entry.name), dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyTree(src, dest);
    else copy(src, dest);
  }
}
copyTree(testOutput, path.join(root, 'inputs', 'existing-test-closure'));
json(path.join(root, 'evidence', 'input-copies.json'), receipt);
json(path.join(root, 'evidence', 'identity.json'), {
  recordedUtc: new Date().toISOString(),
  revisions,
  localOriginMain: git(['rev-parse', 'origin/main']).toString().trim(),
  liveDefaultRequery: 'NOT PERFORMED: this task forbids GitHub access. Accepted live-default observation and unchanged local origin/main are retained, not relabeled as a new network observation.',
  gitWrites: false,
  runtimeDeclaredUnavailable: '12.0.0-alpha.1.26568.110',
  runtimeExplicitlySelected: '12.0.0-alpha.1.26565.104',
  sdk: '12.0.100-alpha.1.26557.102',
  toolchainReadOnlyTarget: 'C:\\src\\aspnetcore\\.dotnet',
  sourceGraph: 'New consumer source and obj/bin only; accepted framework owners remain byte-identical copied inputs.',
  noOwnerRebuild: true,
  noPerformanceExecutionAuthorized: true
});
console.log(JSON.stringify({ copiedFiles: receipt.length, variants: Object.keys(revisions), existingTestInputFiles: receipt.filter(x => x.to.startsWith('inputs\\existing-test-closure')).length }));
