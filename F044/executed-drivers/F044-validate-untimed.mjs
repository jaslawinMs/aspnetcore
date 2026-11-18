import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const runRoot = path.join(session, 'autoperf-runs', 'F044');
const mode = process.argv[2];
function require(condition, message) {
  if (!condition) throw new Error(message);
}
function sha(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
}
function read(relative) {
  return JSON.parse(fs.readFileSync(path.join(runRoot, relative), 'utf8').replace(/^\uFEFF/, ''));
}
require(['Before', 'Paired'].includes(mode), 'Usage: F044-validate-untimed.mjs Before|Paired');
const roles = [
  { variant: 'Default', suffix: 'current-default', label: 'current-default-characterization-001' },
  { variant: 'Original', suffix: 'original', label: 'original-characterization-001' },
  ...(mode === 'Paired' ? [{ variant: 'Candidate', suffix: 'candidate', label: 'candidate-characterization-001' }] : [])
];
const fixtures = read('compiled-fixture-inputs.json').fixtures;
const budget = read('diagnostic-budget.json');
require(budget.consumed === 0 && !budget.closed, 'Complete all before/after preservation gates before timing.');
const verified = [];
for (const role of roles) {
  const command = read(path.join('validation', role.label, 'result.json'));
  require(command.exitCode === 0 && command.protectedPinUnchanged, `Unsuccessful actual ${role.variant} characterization.`);
  const directory = path.join('characterization-' + role.suffix + '-001', 'states');
  const states = fs.readdirSync(path.join(runRoot, directory)).sort();
  require(states.length === 14, 'Require the complete actual characterization inventory.');
  function state(ending) {
    const matches = states.filter(file => file.endsWith(ending + '.json'));
    require(matches.length === 1, `Missing/ambiguous ${role.variant} evidence: ${ending}`);
    return read(path.join(directory, matches[0]));
  }
  const closure = read('consumer-' + role.suffix + '-closure.json');
  const image = state('verified-image');
  const pdb = state('selected-source-pdb-associations');
  const completed = state('characterization-completed');
  const discovery = state('benchmarkdotnet-discovery-preflight');
  const contracts = state('public-contracts');
  const bcl = state('adjacent-bcl-diagnostics');
  const runtime = state('runtime-characterize-after');
  require(image.actualEveryEntryVerified && image.actualEntries === closure.files.length
    && pdb.actualPeAndPdbMatch && pdb.actualSelectedDocuments === 3 && pdb.actualSelectedInputs === 7
    && !pdb.actualCompleteCompilerProvenanceClaimed, 'Incomplete actual image/source-PDB associations.');
  require(completed.actualContractCases === 10 && completed.actualCompiledProducerProfiles === 6
    && completed.actualRegistrationAndFullViewBoundaries === 12 && !completed.actualTimingPerformed
    && discovery.actualDiscoveredCases === 12 && !discovery.actualTimingRunByThisPreflight
    && contracts.actualCases === 10 && contracts.actualPassed.length === 10,
    'Incomplete actual public contract, discovery or real compiled-producer coverage.');
  const observations = states.filter(file => file.endsWith('-compiled-producer-and-rendering.json'))
    .map(file => read(path.join(directory, file)));
  require(observations.length === 6, 'Every real compiler fixture must have actual observations.');
  for (const fixture of fixtures) {
    const observation = observations.find(item => item.profile === fixture.profile);
    require(observation && observation.actualExpectedCount === fixture.expectedCount
      && JSON.stringify(observation.actualNames) === JSON.stringify(fixture.names)
      && observation.actualRegistrationOutput === fixture.expectedRegistrationOutput
      && observation.actualDirectBase === 'Microsoft.AspNetCore.Mvc.Razor.RazorPageBase'
      && observation.actualDefineSectionDeclaringType === 'Microsoft.AspNetCore.Mvc.Razor.RazorPageBase'
      && observation.actualOrdinaryRazorPagePath === false
      && observation.actualOriginalDictionaryPreserved
      && observation.actualRendering.Written === fixture.expectedFullViewHtml
      && observation.actualRendering.Sections === fixture.expectedCount
      && observation.actualRendering.ConsumedTokens === fixture.expectedCount
      && observation.actualRendering.OriginalDictionaryTransferred
      && observation.actualRendering.ContentMarkedForLayout
      && observation.actualRendering.BufferScopeType === 'Microsoft.AspNetCore.Mvc.ViewFeatures.Buffers.MemoryPoolViewBufferScope',
      `The actual producer/deferral/transfer/HTML contract differs: ${role.variant}/${fixture.profile}`);
  }
  const projectBindings = role.variant === 'Candidate'
    ? read('consumer-original-closure.json').sourceBuiltProjectBindings
      .filter(item => !closure.sourceBuiltProjectBindings.some(replacement => replacement.path === item.path))
      .concat(closure.sourceBuiltProjectBindings)
    : closure.sourceBuiltProjectBindings;
  const bindings = runtime.assemblies.filter(assembly => projectBindings.some(item => item.path === assembly.name + '.dll'))
    .map(assembly => {
      const actual = projectBindings.find(item => item.path === assembly.name + '.dll');
      require(assembly.sha256 === actual.sha256
        && path.dirname(assembly.location) === path.join(runRoot, 'consumer-' + role.suffix), 'A loaded source owner differs from its actual project-output binding.');
      return { name: assembly.name, sha256: assembly.sha256, projectOutput: actual.actualProjectOutput };
    });
  require(bindings.some(item => item.name === 'Microsoft.AspNetCore.Mvc.Razor')
    && bindings.some(item => item.name === 'Microsoft.AspNetCore.Mvc.ViewFeatures')
    && bindings.some(item => item.name === 'Microsoft.AspNetCore.Http'), 'The actual owning rendering boundary did not load.');
  require(bcl.actualTimingPerformed === false && bcl.actualProductionRazorHashCountClaimed === false,
    'Adjacent BCL diagnostics must not be presented as production hash instrumentation or timing.');
  const signatures = observations.map(observation => ({
    ...observation,
    actualCallbacks: observation.actualCallbacks.map(callback => ({ ...callback, assembly: '<byte-bound-common-harness>' }))
  }));
  verified.push({
    variant: role.variant, actualContractCases: contracts.actualCases, actualCompiledProfiles: observations.length,
    actualBoundaries: 12, actualImageEntries: closure.files.length, actualSelectedOwnerPdbDocuments: 3,
    actualLoadedSourceProjectBindings: bindings, signatures,
    contracts: contracts.actualPassed, adjacentBcl: bcl.observations,
    actualRuntimeVersion: runtime.version, actualSettings: runtime.settings,
    stateHashes: states.map(file => ({ path: path.join(directory, file), sha256: sha(fs.readFileSync(path.join(runRoot, directory, file))) }))
  });
}
for (const other of verified.slice(1)) {
  require(JSON.stringify(other.signatures) === JSON.stringify(verified[0].signatures)
    && JSON.stringify(other.contracts) === JSON.stringify(verified[0].contracts)
    && JSON.stringify(other.adjacentBcl) === JSON.stringify(verified[0].adjacentBcl),
    `Actual ${other.variant} public/compiled producer/rendering signatures differ from current default.`);
}
const originalTests = read('actual-original-test-row-validation.json');
require(originalTests.actualXmlParsed && originalTests.audits.length === 1
  && originalTests.audits[0].actualRows === 59 && originalTests.audits[0].actualBothNewTheoryValuesPassed,
  'Require actual original TRX row validation.');
if (mode === 'Paired') {
  const tests = read('actual-paired-test-row-validation.json');
  require(tests.actualXmlParsed && tests.actualVariant === 'Both' && tests.audits.length === 2
    && tests.audits.every(item => item.actualRows === 59 && item.actualAllPassed && item.actualSkipped === 0
      && item.actualBothNewTheoryValuesPassed), 'Require actual paired TRX preservation-row validation.');
}
const filename = mode === 'Before' ? 'baseline-validated.json' : 'paired-untimed-validation.json';
const record = {
  candidate: 'F044', mode, completedAt: new Date().toISOString(),
  acceptancePlanSha256: sha(fs.readFileSync(path.join(runRoot, 'acceptance-plan.json'))),
  actualVariantsWithIdenticalPreservation: verified.map(item => item.variant),
  actualOriginalTestRows: 59, actualOriginalTheoryRows: 2, sourceComparisonsConsumed: budget.consumed,
  actualTimingPerformedByThisAudit: false,
  excludedBuildBoundaries: 'JS/static-web-asset, native IIS and full-repository builds are excluded. The successful actual current-default managed owner build is default-managed-razor-build-001.',
  verified
};
fs.writeFileSync(path.join(runRoot, filename), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({
  result: 'passed', mode, actualVariants: record.actualVariantsWithIdenticalPreservation,
  actualContractCasesPerVariant: 10, actualCompiledProducerProfilesPerVariant: 6,
  actualBoundariesPerVariant: 12, actualOriginalTestRows: 59, sourceComparisonsConsumed: budget.consumed
}, null, 2));
