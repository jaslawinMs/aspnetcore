import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F126');
const root = 'C:\\src\\aspnetcore';
const reproduction = path.join(run, 'reconstruction-paired-001');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const budgetPath = path.join(run, 'diagnostic-budget.json');
const budgetHash = sha(budgetPath);
const budget = read(budgetPath);
assert.equal(budget.permanentlyClosed, true);
assert.equal(budget.authorizations.length, 3);
assert.deepEqual(budget.completed.map(item => item.attempt), [1, 2, 3]);
assert.equal(fs.existsSync(reproduction), false, 'Preserve every failed or completed independent reconstruction.');
const inputs = read(path.join(run, 'common-inputs-prepared.json')).actualInputs;
assert.equal(inputs.length, 8);
const guards = [...read(path.join(run, 'images', 'Candidate', 'source-inputs.json')).sourceFiles,
  ...read(path.join(run, 'intake-completed.json')).actualProtectedPrimaryInputs];
function inventory(directory, relative = '') {
  return fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).flatMap(item => {
    assert.equal(item.isSymbolicLink(), false);
    const next = path.join(relative, item.name);
    return item.isDirectory() ? inventory(directory, next) :
      [{ path: next.replaceAll('\\', '/'), length: fs.statSync(path.join(directory, next)).size, sha256: sha(path.join(directory, next)) }];
  }).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
function confirmGuards() {
  assert.equal(sha(budgetPath), budgetHash);
  for (const input of guards) assert.equal(sha(path.join(root, ...input.path.split('/'))), input.sha256);
  for (const role of ['Original', 'Default', 'Candidate']) {
    const directory = path.join(run, 'images', role);
    const original = read(path.join(directory, 'closure.json')).files;
    const current = inventory(path.join(directory, 'image'));
    assert.equal(current.length, original.length);
    for (const input of current) assert.equal(input.sha256, original.find(file => file.path === input.path).sha256);
  }
}
confirmGuards();
const projectDirectory = path.join(reproduction, 'project');
fs.mkdirSync(projectDirectory, { recursive: true });
for (const input of inputs) {
  const source = path.join(run, 'harness', input.path);
  const target = path.join(projectDirectory, input.path);
  assert.equal(sha(source), input.sha256);
  fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
  assert.equal(sha(target), input.sha256);
}
write(path.join(reproduction, 'project-copy.json'), inputs);
const quote = value => "'" + value.replaceAll("'", "''") + "'";
function invoke(label, args, expectedMissingAssets = false) {
  assert.equal(args.includes('measure'), false, 'No additional timing during independent reconstruction.');
  const directory = path.join(reproduction, label);
  fs.mkdirSync(directory);
  const command = ["$ErrorActionPreference = 'Stop'", `Set-Location -LiteralPath ${quote(root)}`, '. .\\activate.ps1',
    "$env:MSBUILDDISABLENODEREUSE = '1'", "$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'",
    `$arguments = @(${args.map(quote).join(', ')})`, `& ${quote(path.join(root, '.dotnet', 'dotnet.exe'))} @arguments`,
    'exit $LASTEXITCODE', ''].join('\r\n');
  const commandPath = path.join(directory, 'command.ps1');
  fs.writeFileSync(commandPath, command, { flag: 'wx' });
  const started = new Date().toISOString();
  console.log('F126 untimed reconstruction: ' + label);
  const result = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', commandPath],
    { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  fs.writeFileSync(path.join(directory, 'stdout.txt'), result.stdout ?? '', { flag: 'wx' });
  fs.writeFileSync(path.join(directory, 'stderr.txt'), result.stderr ?? '', { flag: 'wx' });
  write(path.join(directory, 'command.json'), { executable: path.join(root, '.dotnet', 'dotnet.exe'), arguments: args,
    workingDirectory: root, activation: '. .\\activate.ps1', actualTimingAuthorized: false, actualStartedAt: started,
    actualCompletedAt: new Date().toISOString(), actualExitCode: result.status, actualLaunchError: result.error?.message ?? null,
    actualCommandSha256: sha(commandPath), actualStdoutSha256: sha(path.join(directory, 'stdout.txt')),
    actualStderrSha256: sha(path.join(directory, 'stderr.txt')), actualExpectedMissingAssetsProbe: expectedMissingAssets });
  assert.ifError(result.error);
  if (expectedMissingAssets) {
    assert.notEqual(result.status, 0);
    assert.match((result.stdout ?? '') + (result.stderr ?? ''), /NETSDK1004/);
    assert.match((result.stdout ?? '') + (result.stderr ?? ''), /project\.assets\.json/);
  } else {
    assert.equal(result.status, 0, 'Actual independent reconstruction failed; keep exact commands and outputs.');
    if (label === 'Build') assert.match(result.stdout, /0 Warning\(s\)/);
  }
}
const project = path.join(projectDirectory, 'AutoPerf.Benchmarks.csproj');
const common = ['-p:AspNetCoreRoot=' + root, '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false',
  '-p:BuildProjectReferences=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '/m:2', '/nr:false'];
invoke('Build-NoRestore-First', ['build', project, '-c', 'Release', '--no-restore', ...common], true);
invoke('Restore', ['restore', project, '--configfile', path.join(root, 'NuGet.config'), '-p:NuGetAudit=false', ...common]);
invoke('Build', ['build', project, '-c', 'Release', '--no-restore', ...common]);
const kinds = ['verified-image', 'selected-source-pdb-associations', 'benchmarkdotnet-discovery-preflight', 'prepared-real-hosts', 'characterization'];
function observations(directory) {
  const records = fs.readdirSync(directory).sort().map(file => ({ file, data: read(path.join(directory, file)) }));
  return Object.fromEntries(kinds.map(kind => [kind,
    records.filter(item => item.file.endsWith('-' + kind + '.json')).map(item => item.data)]));
}
const variants = [];
for (const role of ['Original', 'Candidate']) {
  const measuredDirectory = path.join(run, 'images', role);
  const consumer = path.join(reproduction, 'consumer-' + role.toLowerCase());
  fs.cpSync(path.join(projectDirectory, 'bin', 'Release', 'net12.0'), consumer, { recursive: true, errorOnExist: true, force: false });
  for (const extension of ['dll', 'pdb']) fs.copyFileSync(path.join(measuredDirectory, 'image', `CustomPolicyProvider.${extension}`),
    path.join(consumer, `CustomPolicyProvider.${extension}`));
  const measured = read(path.join(measuredDirectory, 'closure.json')).files;
  const current = inventory(consumer);
  assert.equal(current.length, 352);
  assert.deepEqual(current.map(item => item.path), measured.map(item => item.path).sort());
  const differences = current.filter(item => item.sha256 !== measured.find(old => old.path === item.path).sha256).map(item => item.path);
  assert.deepEqual(differences, ['AutoPerf.Benchmarks.dll', 'AutoPerf.Benchmarks.pdb']);
  const closurePath = path.join(reproduction, 'closure-' + role.toLowerCase() + '.json');
  write(closurePath, { candidate: 'F126', role, actualFreshCommonProject: true, files: current });
  const states = path.join(reproduction, role, 'state');
  fs.mkdirSync(states, { recursive: true });
  invoke(role + '-Characterize', [path.join(consumer, 'AutoPerf.Benchmarks.dll'), 'characterize', states,
    closurePath, path.join(measuredDirectory, 'source-inputs.json'), path.join(measuredDirectory, 'source'),
    path.join(reproduction, 'not-a-timing-directory'), role, 'none']);
  const originalStates = path.join(run, 'characterization', `${role.toLowerCase()}-characterization-001`, 'state');
  const before = observations(originalStates);
  const after = observations(states);
  assert.deepEqual(after, before);
  const character = after.characterization[0];
  assert.equal(character.actualProfiles.length, 2);
  assert.equal(character.actualCultureCases.reduce((sum, item) => sum + item.actualCases.length, 0), 50);
  const runtime = read(path.join(states, fs.readdirSync(states).find(name => name.endsWith('-runtime-characterize-after.json'))));
  const originalRuntime = read(path.join(originalStates, fs.readdirSync(originalStates).find(name => name.endsWith('-runtime-characterize-after.json'))));
  for (const assembly of originalRuntime.assemblies.filter(item => /^(Microsoft\.AspNetCore|Microsoft\.Extensions|CustomPolicyProvider)/.test(item.name))) {
    const fresh = runtime.assemblies.find(item => item.name === assembly.name);
    assert.equal(fresh?.sha256, assembly.sha256);
    assert.equal(path.dirname(fresh.location).toLowerCase(), consumer.toLowerCase());
  }
  assert.equal(fs.readdirSync(states).filter(name => name.includes('-settings-')).length, 0);
  variants.push({ role, actualImageEntries: current.length, actualOnlyChangedFiles: differences,
    actualPreparedRealHosts: after['prepared-real-hosts'][0].actualHosts,
    actualRealProfiles: character.actualProfiles.length, actualCultureNameCases: 50, actualOwnerPdbDocuments: 6,
    actualStableCharacterizationIdenticalToMeasuredSourceRole: true, actualFrameworkAndOwnerAssemblyBytesIdentical: true });
}
confirmGuards();
const result = { candidate: 'F126', actualByteExactCommonInputs: 8, actualFreshProjectRestoredAndRebuilt: true,
  actualVariants: variants, actualRebuildWarnings: 0, actualClosedBudgetSha256: budgetHash,
  actualClosedBudgetBytesUnchanged: true, actualAdditionalTimingSamples: 0, actualMeasuredImagesPreserved: true,
  actualExcludedBoundaries: 'Rebuilds the exact common harness and reuses measured source-built sample/framework bytes. Does not repeat owner compilation or claim fresh-clone byte-identical compiler provenance, network, browser, native/static-asset production or packaging.' };
write(path.join(reproduction, 'verified-reproduction.json'), result);
console.log(JSON.stringify(result, null, 2));
