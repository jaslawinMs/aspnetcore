import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.resolve(process.argv[2] ?? path.join(session, 'autoperf-runs', 'F120'));
const root = path.resolve(process.argv[3] ?? 'C:\\src\\aspnetcore');
const reproduction = path.join(run, 'reconstruction-paired-001');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const budgetPath = path.join(run, 'diagnostic-budget.json');
const budgetHash = hash(budgetPath);
const budget = read(budgetPath);
assert.equal(budget.permanentlyClosed, true);
assert.equal(budget.authorized.length, 3);
assert.deepEqual(budget.completed.map(item => item.attempt), [2, 3]);
assert.equal(fs.existsSync(reproduction), false, 'Preserve every failed or completed independent reconstruction.');
const inputs = read(path.join(run, 'harness-source-hashes.json'));
assert.equal(inputs.length, 8);
const guards = [...read(path.join(run, 'source-inputs-candidate.json')).sourceFiles,
  ...read(path.join(run, 'intake-completed.json')).protectedFiles,
  read(path.join(run, 'baseline-validation.json')).actualFocusedTestSource];
function confirmGuards() {
  assert.equal(hash(budgetPath), budgetHash);
  for (const file of guards) assert.equal(hash(path.join(root, ...file.path.split('/'))), file.sha256);
  for (const suffix of ['original', 'candidate', 'current-default']) {
    for (const item of read(path.join(run, 'closure-' + suffix + '.json')).files) {
      assert.equal(hash(path.join(run, 'consumer-' + suffix, ...item.path.split('/'))), item.sha256);
    }
  }
}
confirmGuards();
const projectDirectory = path.join(reproduction, 'project');
fs.mkdirSync(projectDirectory, { recursive: true });
for (const item of inputs) {
  const source = path.join(run, 'harness', item.path);
  const target = path.join(projectDirectory, item.path);
  assert.equal(hash(source), item.sha256);
  fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
  assert.equal(hash(target), item.sha256);
}
write(path.join(reproduction, 'project-copy.json'), inputs);
const quote = value => "'" + value.replaceAll("'", "''") + "'";
function invoke(label, args) {
  assert.equal(args.includes('measure'), false, 'No additional timing during independent reconstruction.');
  const directory = path.join(reproduction, label);
  fs.mkdirSync(directory);
  const script = [
    "$ErrorActionPreference = 'Stop'", `Set-Location -LiteralPath ${quote(root)}`, '. .\\activate.ps1',
    "$env:MSBUILDDISABLENODEREUSE = '1'", "$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'",
    `$arguments = @(${args.map(quote).join(', ')})`,
    `& ${quote(path.join(root, '.dotnet', 'dotnet.exe'))} @arguments`, 'exit $LASTEXITCODE', ''
  ].join('\r\n');
  const scriptPath = path.join(directory, 'command.ps1');
  fs.writeFileSync(scriptPath, script, { flag: 'wx' });
  const started = new Date().toISOString();
  console.log('F120 untimed reconstruction: ' + label);
  const result = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', scriptPath],
    { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  fs.writeFileSync(path.join(directory, 'stdout.txt'), result.stdout ?? '', { flag: 'wx' });
  fs.writeFileSync(path.join(directory, 'stderr.txt'), result.stderr ?? '', { flag: 'wx' });
  write(path.join(directory, 'command.json'), {
    executable: path.join(root, '.dotnet', 'dotnet.exe'), arguments: args, workingDirectory: root,
    activation: '. .\\activate.ps1', actualTimingAuthorized: false, actualStartedAt: started,
    actualCompletedAt: new Date().toISOString(), actualExitCode: result.status,
    actualLaunchError: result.error?.message ?? null, actualCommandSha256: hash(scriptPath),
    actualStdoutSha256: hash(path.join(directory, 'stdout.txt')), actualStderrSha256: hash(path.join(directory, 'stderr.txt'))
  });
  assert.equal(result.status, 0, 'Actual independent reconstruction failed; keep exact commands and outputs.');
}
const project = path.join(projectDirectory, 'AutoPerf.Benchmarks.csproj');
const common = ['-p:AspNetCoreRoot=' + root, '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false',
  '-p:BuildProjectReferences=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '/m:2', '/nr:false'];
invoke('Restore', ['restore', project, '--configfile', path.join(root, 'NuGet.config'), '-p:NuGetAudit=false', ...common]);
invoke('Build', ['build', project, '-c', 'Release', '--no-restore', ...common]);
function inventory(directory, relative = '') {
  return fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).flatMap(item => {
    assert.equal(item.isSymbolicLink(), false);
    const next = path.join(relative, item.name);
    return item.isDirectory() ? inventory(directory, next) :
      [{ path: next.replaceAll('\\', '/'), bytes: fs.statSync(path.join(directory, next)).size, sha256: hash(path.join(directory, next)) }];
  }).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
const kinds = ['selected-source-pdb-associations', 'actual-mvc-producer', 'actual-prepared-public-contract',
  'actual-null-and-reference-contract', 'actual-object-equality-contract', 'actual-reentrant-enumeration-contract',
  'actual-source-interface-contract', 'actual-prepared-collection-lifetime', 'characterization-completed'];
function observations(directory) {
  const records = fs.readdirSync(directory).sort().map(file => ({ file, data: read(path.join(directory, file)) }));
  return Object.fromEntries(kinds.map(kind => [kind,
    records.filter(item => item.file.endsWith('-' + kind + '.json')).map(item => item.data)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en'))]));
}
const variants = [];
for (const [variant, originalLabel] of [['Original', 'original-characterize-003'], ['Candidate', 'candidate-characterize-002']]) {
  const lower = variant.toLowerCase();
  const consumer = path.join(reproduction, 'consumer-' + lower);
  fs.cpSync(path.join(projectDirectory, 'bin', 'Release', 'net12.0'), consumer, { recursive: true, errorOnExist: true, force: false });
  for (const extension of ['dll', 'pdb']) {
    const name = 'Microsoft.AspNetCore.Mvc.Core.' + extension;
    fs.copyFileSync(path.join(run, 'consumer-' + lower, name), path.join(consumer, name));
  }
  const measured = read(path.join(run, 'closure-' + lower + '.json')).files;
  const current = inventory(consumer);
  assert.equal(current.length, 328);
  assert.deepEqual(current.map(item => item.path), measured.map(item => item.path).sort());
  const differences = current.filter(item => item.sha256 !== measured.find(old => old.path === item.path).sha256).map(item => item.path);
  assert.deepEqual(differences, ['AutoPerf.Benchmarks.dll', 'AutoPerf.Benchmarks.pdb']);
  const closurePath = path.join(reproduction, 'closure-' + lower + '.json');
  write(closurePath, { candidate: 'F120', variant, actualFreshCommonProject: true, files: current });
  const states = path.join(reproduction, variant, 'states');
  fs.mkdirSync(states, { recursive: true });
  invoke(variant + '-Characterize', [path.join(consumer, 'AutoPerf.Benchmarks.dll'), 'characterize', states,
    closurePath, path.join(run, 'source-inputs-' + lower + '.json'), path.join(run, 'source-files-' + lower),
    path.join(reproduction, 'not-a-timing-directory'), variant, 'none']);
  const before = observations(path.join(run, 'characterization-' + originalLabel, 'states'));
  const after = observations(states);
  assert.deepEqual(after, before);
  assert.equal(after['actual-mvc-producer'].length, 24);
  assert.equal(after['actual-prepared-public-contract'].length, 16);
  assert.equal(after['actual-prepared-collection-lifetime'].length, 8);
  variants.push({ variant, actualConsumerFiles: current.length, actualOnlyChangedFiles: differences,
    actualRealMvcProducerCaptures: 24, actualRealHttpRequests: 48, actualPreparedPublicProfiles: 16,
    actualFreshBenchmarkProfiles: 8, actualAdditionalEqualityAndEnumerationContracts: 6,
    actualObservedBoundaryIdenticalToMeasuredSourceVariant: true });
}
confirmGuards();
const receipt = {
  candidate: 'F120', actualByteExactProjectFiles: 8, actualFreshProjectRestoredAndRebuilt: true,
  actualVariants: variants, actualOwnerAndOtherDependencyBytesIdenticalToMeasuredVariants: true,
  actualAdditionalTimingSamples: 0, actualClosedBudgetBytesUnchanged: true, actualClosedBudgetSha256: budgetHash,
  actualMeasuredImagesPreserved: true, actualProtectedSourceTestsSdkAndNugetConfigurationPreserved: true,
  actualExcludedBuildBoundaries: 'This common-project rebuild does not repeat compiled Razor Pages, packaging or full-repository builds.'
};
write(path.join(reproduction, 'verified-reproduction.json'), receipt);
console.log(JSON.stringify(receipt, null, 2));
