import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F124');
const root = String.raw`C:\src\aspnetcore`;
const stage = process.argv[2];
assert.ok(['baseline', 'premeasurement'].includes(stage));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (name, value) => fs.writeFileSync(path.join(run, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const intake = read(path.join(run, 'intake-completed.json'));
const planPath = path.join(run, 'acceptance-plan.json');
assert.equal(sha(planPath), intake.actualAcceptancePlanSha256);
assert.equal(sha(path.join(run, 'profile-definitions.json')), intake.actualProfileDefinitionsSha256);
assert.equal(read(path.join(run, 'diagnostic-budget.json')).authorized.length, 0);
for (const item of intake.actualProtectedPrimaryInputs) assert.equal(sha(path.join(root, item.path)), item.sha256);
for (const item of read(path.join(run, 'harness-source-hashes-002.json'))) {
  assert.equal(sha(path.join(run, 'harness', item.path)), item.sha256);
}
const roles = [
  ['Original', 'original-characterization-002'],
  ['Default', 'default-characterization-001'],
  ...stage === 'premeasurement' ? [['Candidate', 'candidate-characterization-001']] : []
].map(([variant, label]) => {
  const file = path.join(run, label, 'verified-characterization.json');
  const receipt = read(file);
  assert.equal(receipt.variant, variant);
  assert.equal(receipt.actualUntimedCharacterizationPassed, true);
  assert.equal(receipt.actualPreparedProfiles, 4);
  assert.equal(receipt.actualAdditionalSemanticContracts, 6);
  assert.equal(receipt.actualActualBenchmarkMethodContracts, 4);
  assert.equal(receipt.actualFreshDriverExecutions, 34);
  assert.equal(receipt.actualSelectedSourcePdbDocuments, 2);
  assert.equal(receipt.actualBenchmarkCasesDiscovered, 12);
  for (const item of receipt.stateHashes) assert.equal(sha(path.join(run, item.path)), item.sha256);
  return { ...receipt, actualCharacterizationReceiptPath: path.relative(run, file).replaceAll('\\', '/'),
    actualCharacterizationReceiptSha256: sha(file) };
});
for (const role of roles.slice(1)) {
  for (const key of ['actualPredicateAndFullDiagnosticProjection', 'actualAdditionalSemanticProjection', 'actualBenchmarkMethodProjection']) {
    assert.deepEqual(role[key], roles[0][key], 'Reconcile actual owning-boundary differences: ' + role.variant + '/' + key);
  }
}
const audits = [
  ['original-preservation-tests-002', 23, 6], ['default-existing-tests-001', 17, 0],
  ...stage === 'premeasurement' ? [['candidate-preservation-tests-001', 23, 6]] : []
].map(([label, count, focused]) => {
  const directory = path.join(run, 'validation', label);
  const auditPath = path.join(directory, 'individual-results.audit.json');
  const trxPath = path.join(directory, 'test-results', 'results.trx');
  const audit = read(auditPath);
  assert.equal(audit.actualPassed, count);
  assert.equal(audit.actualFocusedRows, focused);
  assert.equal(audit.actualXmlParsed, true);
  assert.equal(audit.actualTrxSha256, sha(trxPath));
  assert.equal(read(path.join(directory, 'result.json')).exitCode, 0);
  return { label, actualRows: count, actualFocusedRows: focused, actualXmlParsed: true,
    auditPath: path.relative(run, auditPath).replaceAll('\\', '/'), auditSha256: sha(auditPath),
    trxPath: path.relative(run, trxPath).replaceAll('\\', '/'), trxSha256: sha(trxPath) };
});
const owner = 'src/Framework/AspNetCoreAnalyzers/src/Analyzers/WebApplicationBuilder/PublicPartialProgramClassAnalyzer.cs';
const test = 'src/Framework/AspNetCoreAnalyzers/test/WebApplicationBuilder/PublicPartialProgramClassTest.cs';
if (stage === 'baseline') {
  assert.equal(sha(path.join(root, owner)), intake.actualSelectedInputs.find(item => item.path === owner).originalPhysicalSha256);
  const failedXml = path.join(run, 'validation', 'original-preservation-tests-001', 'test-results', 'results.trx');
  const failedTest = path.join(run, 'preparation-history', 'original-test-source-before-invalid-modifier-fixture-correction.cs');
  const archivedHarness = path.join(run, 'preparation-history', 'missing-reference-metadata-001');
  const failedMetadata = path.join(run, 'validation', 'original-characterization-001');
  assert.ok(fs.readFileSync(failedXml, 'utf8').includes('CS0267'));
  assert.ok(fs.readFileSync(path.join(failedMetadata, 'stderr.txt'), 'utf8').includes('CS0012'));
  write('preparation-correction.json', {
    candidate: 'F124', actualAllFailuresBeforeShippingEditAndAnyTiming: true,
    actualCurrentDefaultManagedPrerequisites: {
      actualMissingAssetsFailure: 'default-analyzer-build-001',
      actualObservedMissingDependencyCode: 'NETSDK1004',
      actualScopedRestore: 'default-analyzer-restore-001',
      actualMissingBlazorAssetsFailure: 'default-analyzer-build-002',
      actualRetainedInputs: 'preparation-history/default-managed-prerequisites-001/retained-inputs.json',
      actualMissingStaticManifestFailure: 'default-analyzer-build-003',
      actualStaticManifestFailureAndSdkGate: 'preparation-history/default-static-assets-001/observed-prerequisite.json',
      actualScopedCorrection: 'Use existing command-scoped BuildNodeJS=false and StaticWebAssetsEnabled=false after inspecting the actual repository and SDK conditions. No shipping/build configuration or machine changes.',
      actualSuccessfulSuccessor: 'default-analyzer-build-004',
      actualExcludedBoundary: 'Generated Blazor JavaScript, browser behavior and static-asset production or packaging are not validated by these managed analyzer tests.'
    },
    actualUnrelatedNativeBuildPrerequisite: {
      label: 'original-analyzer-build-001', actualExitCode: read(path.join(run, 'validation', 'original-analyzer-build-001', 'result.json')).exitCode,
      actualReason: 'Managed test graph reached IIS ValidateNativeComponentsBuilt without a built ANCM native DLL.',
      actualScopedCorrection: 'Use the existing command-scoped -p:UseIisNativeAssets=false for this managed analyzer boundary; no IIS native, hosted IIS, or ANCM validation claim.',
      actualSuccessfulSuccessor: 'original-analyzer-build-002'
    },
    actualInvalidNewFixture: {
      label: 'original-preservation-tests-001', actualFailedRows: 1, actualPassedRows: 22,
      actualTest: 'DoesNotFix_ProgramDeclarationInSeparateFile',
      actualInvalidInput: 'partial public class Program { }', actualCompilerError: 'CS0267',
      actualBoundaryNotReached: 'Expected zero-diagnostic/code-fix assertion blocked by an invalid C# modifier order, not an analyzer regression.',
      actualCorrection: 'Replace only that malformed test datum with the valid escaped identifier public partial class @Program { }.',
      actualFailedXmlPreserved: true, actualFailedTrxSha256: sha(failedXml),
      actualFailedTestSourceSha256: sha(failedTest), actualAcceptedSuccessor: 'original-preservation-tests-002'
    },
    actualMissingCompilerReferenceMetadata: {
      label: 'original-characterization-001', actualCompilerError: 'CS0012',
      actualBoundaryNotReached: 'First real MinimalProgram compilation failed before any predicate/driver profile contract or timing.',
      actualMissingAssembly: 'Microsoft.Extensions.Hosting.Abstractions, Version=12.0.0.0',
      actualCauseObserved: 'The source-built test output omits runtime-provided Extensions abstraction assemblies; only its copied DLLs were insufficient.',
      actualCorrection: 'Reuse the already established pinned .NET 12 DI/Hosting/Logging package dependencies and include their real runtime metadata alongside unchanged source-built ASP.NET Core metadata.',
      actualOriginalFrozenImageFilesPreserved: 217, actualOldImagePath: 'consumer-original',
      actualOldClosureSha256: sha(path.join(run, 'closure-original.json')),
      actualOldHarnessInputs: read(path.join(run, 'harness-source-hashes.json')),
      actualArchivedEightInputFiles: fs.readdirSync(archivedHarness).filter(file => /\.(cs|csproj|json)$/.test(file)).sort(),
      actualFailureStderrSha256: sha(path.join(failedMetadata, 'stderr.txt')),
      actualAcceptedSuccessor: 'original-characterization-002',
      actualFreshImageGeneration: '002', actualOldImageManifestsAndStatesNotOverwritten: true
    },
    actualTimingAuthorizationsConsumed: 0, actualPrimaryAndProfilesUnchanged: true,
    actualRootGlobalJsonPackageManifestsAndNugetConfigurationUnchanged: true
  });
} else {
  const baseline = read(path.join(run, 'baseline-validation.json'));
  assert.equal(baseline.actualShippingEditsAtSeal, 0);
  assert.equal(baseline.actualParsedPassingXmlExecutions, 40);
  const before = fs.readFileSync(path.join(run, 'source-files-original-002', owner));
  const after = fs.readFileSync(path.join(root, owner));
  const oldText = Buffer.from('parentNode.DescendantNodes().Count() > 1');
  const newText = Buffer.from('parentNode.DescendantNodes().Skip(1).Any()');
  const position = before.indexOf(oldText);
  assert.ok(position >= 0);
  assert.equal(before.indexOf(oldText, position + oldText.length), -1);
  assert.deepEqual(after, Buffer.concat([before.subarray(0, position), newText, before.subarray(position + oldText.length)]));
  assert.equal(sha(path.join(root, test)), baseline.actualFocusedTestSource.sha256);
  assert.equal(read(path.join(run, 'validation', 'candidate-format-whitespace-002', 'result.json')).exitCode, 0);
  write('candidate-preparation-correction.json', {
    candidate: 'F124', actualFailedAttempt: 'candidate-format-whitespace-001',
    actualReason: "Formatter CLI rejects --folder combined with --no-restore; no source formatting analysis ran.",
    actualExecutedDriverPreserved: 'preparation-history/candidate-format-usage-001/F124-prepare-candidate.mjs',
    actualCorrection: 'Remove the incompatible --no-restore option from folder-only verification. This mode does not load or restore a project.',
    actualSuccessfulSuccessor: 'candidate-format-whitespace-002',
    actualSourceFilesChangedByFormatter: 0, actualTimingAuthorizationsConsumed: 0
  });
  const original = read(path.join(run, 'closure-original-002.json')).files;
  const candidate = read(path.join(run, 'closure-candidate-002.json')).files;
  assert.deepEqual(candidate.map(item => item.path), original.map(item => item.path));
  const differences = candidate.filter(item => item.sha256 !== original.find(old => old.path === item.path).sha256).map(item => item.path).sort();
  assert.deepEqual(differences, ['Microsoft.AspNetCore.App.Analyzers.dll', 'Microsoft.AspNetCore.App.Analyzers.pdb']);
  write('candidate-seam-verification.json', { candidate: 'F124', actualExactlyOneExpressionReplacement: true,
    actualEveryOtherSourceBytePreserved: true, actualOriginalExpression: oldText.toString(),
    actualCandidateExpression: newText.toString(), actualOriginalSourceSha256: sha(path.join(run, 'source-files-original-002', owner)),
    actualCandidateSourceSha256: sha(path.join(root, owner)), actualOnlyChangedImageEntries: differences,
    actualUnchangedImageEntries: original.length - differences.length, actualIdenticalCommonHarnessDllPdb: true });
}
const result = {
  candidate: 'F124', stage, actualCreated: new Date().toISOString(),
  acceptancePlanSha256: sha(planPath), profileDefinitionsSha256: sha(path.join(run, 'profile-definitions.json')),
  baselineValidationSha256: stage === 'premeasurement' ? sha(path.join(run, 'baseline-validation.json')) : null,
  actualShippingEditsAtSeal: stage === 'baseline' ? 0 : 1,
  actualSemanticallyIdenticalObservedBoundaryAcrossAllVariants: true,
  actualParsedPassingXmlExecutions: audits.reduce((total, audit) => total + audit.actualRows, 0),
  actualFocusedTestSource: { path: test, sha256: sha(path.join(root, test)) },
  protectedFiles: intake.actualProtectedPrimaryInputs, roles, audits,
  actualTimingAuthorizationsConsumedAtSeal: 0,
  actualGreenGreenPreservationNotSemanticBugRedGreen: true,
  actualPreparationFailuresAndSuccessfulCorrections: 'preparation-correction.json'
};
write(stage === 'baseline' ? 'baseline-validation.json' : 'premeasurement-validation.json', result);
console.log(JSON.stringify({ candidate: 'F124', stage, actualVariantsValidated: roles.length,
  actualParsedPassingXmlExecutions: result.actualParsedPassingXmlExecutions,
  actualFreshDriverExecutions: roles.length * 34, actualSelectedPdbDocumentsPerRole: 2,
  actualSourceChanges: result.actualShippingEditsAtSeal, actualTimingSamples: 0 }, null, 2));
