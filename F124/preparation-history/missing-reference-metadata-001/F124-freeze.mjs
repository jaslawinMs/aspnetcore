import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F124');
const variant = process.argv[2];
assert.ok(['Original', 'Default', 'Candidate'].includes(variant));
const suffix = variant === 'Default' ? 'current-default' : variant.toLowerCase();
const root = variant === 'Default' ? String.raw`C:\src\autoperf-F042-default` : String.raw`C:\src\aspnetcore`;
const destination = path.join(run, 'consumer-' + suffix);
const owner = 'Microsoft.AspNetCore.App.Analyzers';
const ownerSource = 'src/Framework/AspNetCoreAnalyzers/src/Analyzers/WebApplicationBuilder/PublicPartialProgramClassAnalyzer.cs';
const testSource = 'src/Framework/AspNetCoreAnalyzers/test/WebApplicationBuilder/PublicPartialProgramClassTest.cs';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const hash = file => sha(fs.readFileSync(file));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const intake = read(path.join(run, 'intake-completed.json'));
const budgetPath = path.join(run, 'diagnostic-budget.json');
if (!fs.existsSync(budgetPath))
{
  assert.equal(variant, 'Original');
  write(budgetPath, { candidate: 'F124', maximum: 3, authorized: [], completed: [], failedOrPartialAttempts: [],
    permanentlyClosed: false, state: 'prepared-no-comparisons',
    actualAcceptancePlanSha256: hash(path.join(run, 'acceptance-plan.json')) });
}
const budget = read(budgetPath);
assert.equal(budget.authorized.length, 0);
assert.equal(budget.permanentlyClosed, false);
assert.equal(budget.actualAcceptancePlanSha256, hash(path.join(run, 'acceptance-plan.json')));
assert.equal(fs.existsSync(destination), false);
function git(args) {
  const result = spawnSync('git', ['-c', 'core.longpaths=true', '--no-pager', ...args],
    { cwd: root, encoding: 'utf8', windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
assert.equal(git(['rev-parse', 'HEAD']), variant === 'Default' ? intake.actualCurrentDefault : intake.actualBaseline);
if (variant !== 'Default') {
  for (const file of intake.actualProtectedPrimaryInputs) assert.equal(hash(path.join(root, file.path)), file.sha256);
}
const changedTracked = git(['diff', '--name-only']).split(/\r?\n/).filter(Boolean).sort();
assert.deepEqual(changedTracked, variant === 'Default' ? [] : variant === 'Original' ? [testSource] : [ownerSource, testSource].sort());
if (variant !== 'Candidate') {
  const originalOwner = intake.actualSelectedInputs.find(item => item.path === ownerSource);
  if (variant === 'Original') assert.equal(hash(path.join(root, ownerSource)), originalOwner.originalPhysicalSha256);
}
const harnessDirectory = path.join(run, 'harness');
const currentInputs = fs.readdirSync(harnessDirectory).filter(file => /\.(cs|csproj|json)$/.test(file)).sort().map(file => ({
  path: file, bytes: fs.statSync(path.join(harnessDirectory, file)).size, sha256: hash(path.join(harnessDirectory, file))
}));
assert.equal(currentInputs.length, 8);
assert.equal(hash(path.join(harnessDirectory, 'SettingsPreservingEmitToolchain.cs')),
  hash(path.join(session, 'autoperf-runs', 'F123', 'harness', 'SettingsPreservingEmitToolchain.cs')));
assert.equal(hash(path.join(harnessDirectory, 'profile-definitions.json')), hash(path.join(run, 'profile-definitions.json')));
const inputsPath = path.join(run, 'harness-source-hashes.json');
if (!fs.existsSync(inputsPath)) write(inputsPath, currentInputs);
const inputs = read(inputsPath);
assert.deepEqual(currentInputs, inputs);
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
    assert.equal(item.isSymbolicLink(), false);
    return item.isDirectory() ? files(path.join(directory, item.name)) : [path.join(directory, item.name)];
  });
}
fs.cpSync(variant === 'Original' ? path.join(harnessDirectory, 'bin', 'Release', 'net12.0')
  : path.join(run, 'consumer-original'), destination, { recursive: true, errorOnExist: true, force: false });
const replacements = [];
if (variant !== 'Original') {
  for (const extension of ['dll', 'pdb']) {
    const name = owner + '.' + extension;
    const source = path.join(root, 'artifacts', 'bin', owner, 'Release', 'netstandard2.0', name);
    fs.copyFileSync(source, path.join(destination, name));
    replacements.push({ path: name, source });
  }
}
const sourceInputs = intake.actualSelectedInputs.map(item => {
  const relative = item.path;
  const bytes = fs.readFileSync(path.join(root, relative));
  const target = path.join(run, 'source-files-' + suffix, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes, { flag: 'wx' });
  const pdbDocumentRequired = relative === ownerSource
    || relative === 'src/Framework/AspNetCoreAnalyzers/src/Analyzers/DiagnosticDescriptors.cs';

  return { path: relative, bytes: bytes.length, sha256: sha(bytes), pdbDocumentRequired };
});
assert.equal(sourceInputs.length, 9);
assert.equal(sourceInputs.filter(item => item.pdbDocumentRequired).length, 2);
write(path.join(run, 'source-inputs-' + suffix + '.json'), {
  candidate: 'F124', variant, actualPhysicalSourceRoot: root,
  actualMeasuredBuildGitHead: variant === 'Default' ? intake.actualCurrentDefault : intake.actualBaseline,
  actualCandidateSourceUncommittedAtBuild: variant === 'Candidate',
  actualCompleteCompilerProvenanceClaimed: false, sourceFiles: sourceInputs
});
const closure = files(destination).map(file => ({
  path: path.relative(destination, file).replaceAll('\\', '/'), bytes: fs.statSync(file).size, sha256: hash(file)
})).sort((a, b) => a.path.localeCompare(b.path, 'en'));
const runtime = read(path.join(destination, 'AutoPerf.Benchmarks.runtimeconfig.json')).runtimeOptions;
assert.equal(runtime.framework.name, 'Microsoft.NETCore.App');
assert.equal(runtime.framework.version, '12.0.0-alpha.1.26562.105');
assert.equal(runtime.rollForward, 'Disable');
assert.equal(runtime.frameworks, undefined);
for (const extension of ['dll', 'pdb']) {
  const name = owner + '.' + extension;
  assert.equal(hash(path.join(destination, name)), hash(path.join(root, 'artifacts', 'bin', owner, 'Release', 'netstandard2.0', name)));
}
write(path.join(run, 'closure-' + suffix + '.json'), {
  candidate: 'F124', variant, actualHarnessInputs: inputs, actualReplacements: replacements, files: closure
});
let changed = [];
if (variant === 'Candidate') {
  const before = read(path.join(run, 'closure-original.json')).files;
  assert.deepEqual(closure.map(item => item.path), before.map(item => item.path));
  changed = closure.filter(item => item.sha256 !== before.find(old => old.path === item.path).sha256).map(item => item.path).sort();
  assert.deepEqual(changed, [owner + '.dll', owner + '.pdb'].sort());
}
const receipt = {
  candidate: 'F124', variant, actualFrozenFiles: closure.length, actualSourceInputs: sourceInputs.length,
  actualUniqueSourcePePdbDocumentsRequired: 2, actualSourceOwnerDllPdbCopiesMatchBuiltOutputs: true,
  actualRuntimeFramework: runtime.framework, actualOnlyChangedCandidateConsumerFiles: changed,
  actualIdenticalHarnessDllPdb: variant === 'Candidate' ? true : null,
  actualGitStatusAtFreeze: git(['status', '--short']), actualTimingAuthorizationsAtFreeze: 0,
  actualCreated: new Date().toISOString()
};
write(path.join(run, 'frozen-' + suffix + '.json'), receipt);
console.log(JSON.stringify(receipt, null, 2));
