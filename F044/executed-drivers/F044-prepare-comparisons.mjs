import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F044');
const root = String.raw`C:\src\aspnetcore`;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
assert.equal(read(path.join(run, 'diagnostic-budget.json')).consumed, 0);
assert.equal(read(path.join(run, 'paired-untimed-validation.json')).verified.length, 3);
const originalIntake = read(path.join(session, 'autoperf-runs', 'F043', 'intake-completed.json'));
for (const item of originalIntake.protectedFiles) {
  assert.equal(sha(fs.readFileSync(path.join(root, item.path))), item.sha256);
}
fs.writeFileSync(path.join(run, 'premeasurement-protected-inputs.json'), JSON.stringify({
  candidate: 'F044', actualPriorProtectedFilesVerified: true, protectedFiles: originalIntake.protectedFiles
}, null, 2) + '\n', { flag: 'wx' });
const source = fs.readFileSync(path.join(session, 'F043-compare.mjs'), 'utf8');
const driver = source.replaceAll('F043', 'F044')
  .replace('item.actualContractCases === 9', 'item.actualContractCases === 10')
  .replace("read(path.join(run, 'intake-completed.json')).protectedFiles",
    "read(path.join(run, 'premeasurement-protected-inputs.json')).protectedFiles");
assert.notEqual(source, driver);
fs.writeFileSync(path.join(session, 'F044-compare.mjs'), driver, { flag: 'wx' });
const inputs = read(path.join(run, 'compiled-fixture-inputs.json'));
const generatedRoot = path.join(run, 'harness', 'obj', 'generated', 'Microsoft.CodeAnalysis.Razor.Compiler',
  'Microsoft.NET.Sdk.Razor.SourceGenerators.RazorSourceGenerator', 'Views');
const destination = path.join(run, 'compiled-producer-sources');
assert.equal(fs.existsSync(destination), false);
fs.mkdirSync(destination);
const proofs = [];
for (const fixture of inputs.fixtures) {
  const file = fixture.profile + '_cshtml.g.cs';
  const bytes = fs.readFileSync(path.join(generatedRoot, file));
  const text = bytes.toString('utf8');
  assert.ok(text.includes(fixture.sha256.toLowerCase()));
  assert.ok(text.includes('Microsoft.AspNetCore.Mvc.Razor.RazorPageBase'));
  assert.equal([...text.matchAll(/DefineSection\("/g)].length, fixture.expectedCount);
  assert.equal(text.includes('override void DefineSection'), false);
  fs.writeFileSync(path.join(destination, file), bytes, { flag: 'wx' });
  proofs.push({ path: file, sha256: sha(bytes), actualCompilerInputSha256: fixture.sha256,
    actualGeneratedRegistrationCalls: fixture.expectedCount, actualDeclareSectionOverride: false });
}
const git = spawnSync('git', ['-c', 'core.longpaths=true', 'diff', '--name-only'], {
  cwd: root, encoding: 'utf8', windowsHide: true
});
assert.equal(git.status, 0);
assert.deepEqual(git.stdout.trim().split(/\r?\n/).sort(),
  ['src/Mvc/Mvc.Razor/src/RazorPageBase.cs', 'src/Mvc/Mvc.Razor/test/RazorPageTest.cs']);
fs.writeFileSync(path.join(run, 'compiler-generated-producer-proof.json'), JSON.stringify({
  candidate: 'F044', actualGeneratedSourcesCopied: proofs.length,
  actualContextHooksMatchExistingRazorPageNoOps: true,
  actualContentFixtureRejectsLayoutRole: true,
  actualRuntimeResolvedBaseDefinitionSeparatelyVerified: true,
  actualCompleteCompilerProvenanceClaimed: false,
  actualNoF043TimingReused: true, actualComparisonDriverSha256: sha(Buffer.from(driver)), proofs
}, null, 2) + '\n', { flag: 'wx' });
console.log('Prepared independent F044 timing driver, protected artifact guard and six actual generated producer snapshots.');
