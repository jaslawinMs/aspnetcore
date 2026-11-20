import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F126');
const root = 'C:\\src\\aspnetcore';
const defaultRoot = 'C:\\src\\autoperf-F042-default';
const harness = path.join(run, 'harness');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const intake = read(path.join(run, 'intake-completed.json'));
const inputs = ['AutoPerf.Benchmarks.csproj', 'Evidence.cs', 'PolicyScenario.cs', 'PolicyBenchmarks.cs',
  'Characterization.cs', 'Program.cs', 'SettingsPreservingEmitToolchain.cs', 'profile-definitions.json'];
const pdbInputs = new Set([
  'src/Security/samples/CustomPolicyProvider/Authorization/MinimumAgeAuthorizationHandler.cs',
  'src/Security/samples/CustomPolicyProvider/Authorization/MinimumAgeAuthorizeAttribute.cs',
  'src/Security/samples/CustomPolicyProvider/Authorization/MinimumAgePolicyProvider.cs',
  'src/Security/samples/CustomPolicyProvider/Authorization/MinimumAgeRequirement.cs',
  'src/Security/samples/CustomPolicyProvider/Controllers/HomeController.cs',
  'src/Security/samples/CustomPolicyProvider/Startup.cs'
]);
function git(cwd, ...args) {
  const result = spawnSync('git', ['--no-pager', ...args], { cwd, encoding: 'utf8', windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
function inventory(directory, relative = '') {
  return fs.readdirSync(path.join(directory, relative), { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
      assert.equal(entry.isSymbolicLink(), false, 'No unrecorded symlink target.');
      const local = path.join(relative, entry.name);
      return entry.isDirectory() ? inventory(directory, local) : [{
        path: local.replaceAll('\\', '/'), length: fs.statSync(path.join(directory, local)).size,
        sha256: sha(path.join(directory, local))
      }];
    });
}
function protectedInputs() {
  for (const input of intake.actualProtectedPrimaryInputs) {
    assert.equal(sha(path.join(root, ...input.path.split('/'))), input.sha256, input.path);
  }
}
protectedInputs();
const [mode, role] = process.argv.slice(2);
const preparedPath = path.join(run, 'common-inputs-prepared.json');
if (mode === 'inputs') {
  assert.equal(fs.existsSync(preparedPath), false);
  assert.equal(git(root, 'rev-parse', 'HEAD'), intake.actualBaseline);
  assert.equal(git(root, 'branch', '--show-current'), intake.branch);
  const originalEmitter = path.join(session, 'autoperf-runs', 'F124', 'harness', 'SettingsPreservingEmitToolchain.cs');
  fs.copyFileSync(originalEmitter, path.join(harness, 'SettingsPreservingEmitToolchain.cs'), fs.constants.COPYFILE_EXCL);
  const actualInputs = inputs.map(name => ({ path: name, sha256: sha(path.join(harness, name)) }));
  assert.equal(actualInputs.length, 8);
  write(preparedPath, { candidate: 'F126', actualInputs,
    actualEmitterCopiedByteExactlyFromPriorProvenHelper: sha(originalEmitter),
    actualTimingRun: false, actualComparisonAuthorizations: read(path.join(run, 'diagnostic-budget.json')).authorizations.length });
  console.log('Prepared exactly eight common inputs; copied the existing settings-preserving emitter byte-for-byte.');
} else {
  assert.equal(mode, 'freeze');
  assert.ok(['Original', 'Default', 'Candidate'].includes(role));
  const prepared = read(preparedPath);
  for (const input of prepared.actualInputs) assert.equal(sha(path.join(harness, input.path)), input.sha256);
  const sourceRoot = role === 'Default' ? defaultRoot : root;
  assert.equal(git(sourceRoot, 'rev-parse', 'HEAD'), role === 'Default' ? intake.actualCurrentDefault : intake.actualBaseline);
  const directory = path.join(run, 'images', role);
  assert.equal(fs.existsSync(directory), false);
  const sourceSnapshot = path.join(directory, 'source');
  const image = path.join(directory, 'image');
  fs.mkdirSync(sourceSnapshot, { recursive: true });
  const sourceFiles = intake.actualSelectedInputs.map(input => {
    const local = input.path.split('/');
    const source = path.join(sourceRoot, ...local);
    const target = path.join(sourceSnapshot, ...local);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
    return { path: input.path, sha256: sha(target), pdbDocumentRequired: pdbInputs.has(input.path) };
  });
  assert.equal(sourceFiles.filter(file => file.pdbDocumentRequired).length, 6);
  if (role === 'Original') {
    const changes = sourceFiles.filter(file =>
      file.sha256 !== intake.actualSelectedInputs.find(input => input.path === file.path).originalPhysicalSha256);
    assert.deepEqual(changes.map(file => file.path), ['src/Security/test/AuthSamples.FunctionalTests/CustomPolicyProviderTests.cs']);
    fs.cpSync(path.join(harness, 'bin', 'Release', 'net12.0'), image, { recursive: true, errorOnExist: true, force: false });
  } else {
    fs.cpSync(path.join(run, 'images', 'Original', 'image'), image, { recursive: true, errorOnExist: true, force: false });
    const ownerDirectory = path.join(sourceRoot, 'artifacts', 'bin', 'CustomPolicyProvider', 'Release', 'net12.0');
    for (const extension of ['dll', 'pdb']) fs.copyFileSync(path.join(ownerDirectory, `CustomPolicyProvider.${extension}`),
      path.join(image, `CustomPolicyProvider.${extension}`));
  }
  const files = inventory(image);
  assert.ok(files.some(file => file.path === 'AutoPerf.Benchmarks.dll'));
  assert.ok(files.some(file => file.path === 'CustomPolicyProvider.pdb'));
  let actualChangedImageFiles = null;
  if (role !== 'Original') {
    const original = read(path.join(run, 'images', 'Original', 'closure.json')).files;
    assert.deepEqual(files.map(file => file.path), original.map(file => file.path));
    actualChangedImageFiles = files.filter((file, index) => file.sha256 !== original[index].sha256).map(file => file.path);
    assert.deepEqual(actualChangedImageFiles, ['CustomPolicyProvider.dll', 'CustomPolicyProvider.pdb']);
  }
  write(path.join(directory, 'source-inputs.json'), { candidate: 'F126', role, sourceFiles,
    actualCompleteCompilerProvenanceClaimed: false,
    actualOriginalIncludesNewFocusedTestsWithUnchangedShippingOwner: role === 'Original',
    actualDefaultSampleOwnerOnCommonBaselineFrameworkImage: role === 'Default' });
  write(path.join(directory, 'closure.json'), { candidate: 'F126', role, files });
  write(path.join(directory, 'freeze.json'), { candidate: 'F126', role, actualSourceCommit: git(sourceRoot, 'rev-parse', 'HEAD'),
    actualSourceRoot: sourceRoot, actualImageEntries: files.length, actualSelectedInputs: sourceFiles.length,
    actualChangedImageFiles, actualCommonInputHashes: prepared.actualInputs,
    actualClosureSha256: sha(path.join(directory, 'closure.json')), actualSourceInputsSha256: sha(path.join(directory, 'source-inputs.json')),
    actualDefaultSampleOwnerOnCommonBaselineFrameworkImage: role === 'Default', actualTimingRun: false });
  console.log(JSON.stringify({ role, actualImageEntries: files.length, actualSelectedInputs: sourceFiles.length, actualChangedImageFiles }, null, 2));
}
