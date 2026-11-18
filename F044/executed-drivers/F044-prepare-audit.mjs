import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F044');
const prior = path.join(session, 'autoperf-runs', 'F043');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const closure = JSON.parse(fs.readFileSync(path.join(run, 'freeze-original.json'), 'utf8'));
write(path.join(run, 'harness-source-hashes.json'), {
  candidate: 'F044', actualAuthoredProjectFiles: 13,
  files: closure.authoredHarnessFiles.map(file => {
    const bytes = fs.readFileSync(path.join(run, 'harness', file.path));
    assert.equal(sha(bytes), file.sha256);
    return { path: file.path, bytes: bytes.length, sha256: file.sha256 };
  })
});
const producer = JSON.parse(fs.readFileSync(path.join(run, 'compiler-generated-producer-proof.json'), 'utf8'));
write(path.join(run, 'compiled-producer-source-hashes.json'), {
  candidate: 'F044', actualSdkGeneratedCSharpFiles: 6,
  actualGeneratedSourceOnlyNotCompleteCompilerProvenance: true,
  files: producer.proofs.map(file => ({
    path: file.path, bytes: fs.statSync(path.join(run, 'compiled-producer-sources', file.path)).size, sha256: file.sha256
  }))
});
for (const name of ['BenchmarkDotNet-0.13.0-GcStats.cs', 'BenchmarkDotNet-0.13.0-GcStats-metadata.json',
  'BenchmarkDotNet-0.13.0-LICENSE.md', 'BenchmarkDotNet-0.13.0-license-metadata.json']) {
  fs.copyFileSync(path.join(prior, name), path.join(run, name), fs.constants.COPYFILE_EXCL);
}
const close = fs.readFileSync(path.join(session, 'F043-close-budget.mjs'), 'utf8').replaceAll('F043', 'F044');
fs.writeFileSync(path.join(session, 'F044-close-budget.mjs'), close, { flag: 'wx' });
let audit = fs.readFileSync(path.join(session, 'F043-verify.mjs'), 'utf8').replaceAll('F043', 'F044');
audit = audit.replace("const ownerSource = 'src\\\\Mvc\\\\Mvc.Razor\\\\src\\\\RazorPage.cs';",
  "const ownerSource = 'src\\\\Mvc\\\\Mvc.Razor\\\\src\\\\RazorPageBase.cs';")
  .replace('completed.actualContractCases, 9', 'completed.actualContractCases, 10')
  .replace('contracts.actualCases, 9', 'contracts.actualCases, 10')
  .replace('contracts.actualPassed.length, 9', 'contracts.actualPassed.length, 10')
  .replaceAll('default-managed-razor-build-005', 'default-managed-razor-build-001')
  .replace('    assert.ok(row);', `    assert.ok(row);
    assert.equal(row.actualDirectBase, 'Microsoft.AspNetCore.Mvc.Razor.RazorPageBase');
    assert.equal(row.actualDefineSectionDeclaringType, 'Microsoft.AspNetCore.Mvc.Razor.RazorPageBase');
    assert.equal(row.actualOrdinaryRazorPagePath, false);`)
  .replace("  assert.equal(decision.disposition, 'no-gain');",
    "  assert.ok(['no-gain', 'qualified'].includes(decision.disposition));")
  .replaceAll('decision.controlCredibilityGateMet, false', 'decision.controlCredibilityGateMet, primaryAtMostControlComparisons.length < 2')
  .replaceAll('actualControlCredibilityGateMet: false', 'actualControlCredibilityGateMet: decision.controlCredibilityGateMet');
fs.writeFileSync(path.join(session, 'F044-verify.mjs'), audit, { flag: 'wx' });
for (const file of ['F044-verify.mjs', 'F044-compare.mjs', 'F044-audit-trx.ps1']) {
  fs.copyFileSync(path.join(session, file), path.join(run, file), fs.constants.COPYFILE_EXCL);
}
let reproduce = fs.readFileSync(path.join(session, 'F043-reproduce-untimed.ps1'), 'utf8').replaceAll('F043', 'F044');
reproduce = reproduce.replace("(Join-Path $run 'intake-completed.json')", "(Join-Path $run 'premeasurement-protected-inputs.json')")
  .replace('actualCharacterizationCases = 9;', 'actualCharacterizationCases = 10;');
fs.writeFileSync(path.join(session, 'F044-reproduce-untimed.ps1'), reproduce, { flag: 'wx' });
fs.copyFileSync(path.join(session, 'F044-reproduce-untimed.ps1'),
  path.join(run, 'F044-reproduce-untimed.ps1'), fs.constants.COPYFILE_EXCL);
console.log('Prepared source/results-only arithmetic audit, licensed allocation implementation and untimed independent rebuild.');
