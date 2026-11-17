import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[2] ?? path.join(here, 'autoperf-runs', 'F016'));
const live = process.argv.includes('--live');
const verify = process.argv.includes('--verify');
const file = relative => path.join(root, ...relative.split(/[\\/]/));
const text = relative => fs.readFileSync(file(relative), 'utf8').replace(/^\uFEFF/, '');
const read = relative => JSON.parse(text(relative));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const hash = relative => digest(fs.readFileSync(file(relative)));
const require = (condition, message) => { if (!condition) throw new Error(message); };
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const write = (relative, value) => {
  require(!fs.existsSync(file(relative)), 'Never overwrite completed audit evidence:' + relative);
  fs.writeFileSync(file(relative), JSON.stringify(value, null, 2) + '\n');
};
const extractor = path.join(here, 'F016-analyze.mjs');
const recomputation = spawnSync(process.execPath, [extractor, root, '--verify'], { encoding: 'utf8' });
require(recomputation.status === 0, 'Raw-sample recomputation failed:' + recomputation.stdout + recomputation.stderr);
const analysis = read('analysis.json');
const acceptance = read('acceptance.json');
const shapes = acceptance.proposed_benchmark_shapes;
const budget = read('measurement-budget.json');
require(budget.closed && budget.usedComparisons === 3 && budget.originalProfiles === 3 && budget.candidateProfiles === 3 &&
  budget.originalOnlyDiagnosticProfiles === 0 && budget.sourceCandidateShapes === 1,
'Three actual original/candidate comparisons must stay permanently closed.');
const audit = {
  candidate: 'F016', auditPassed: true, budgetClosed: true, pairedComparisons: 3, completedProfiles: 6, successfulReports: 126,
  nativeContextChecks: [], imageComparisons: [], sourceSnapshotsChecked: 0,
  actualPePdbWitnessRecords: 0, selectedSourceDocumentChecks: 0, nativeRoundtripRecords: 0,
  argumentContractCases: 0, settingsRecords: analysis.accounting.settingsRecords, originalOwningTestRows: 0,
  candidateOwningTestRows: 0, allNewPreservationTheoryExecutions: 0, sourceBindings: [],
  accounting: analysis.accounting, modernProductPathTimingClaimed: false,
  counter: 'AppDomain.CurrentDomain.MonitoringTotalAllocatedMemorySize on actual .NET Framework;forced-GC diagnostic accounting includes other managed activity in the same AppDomain,not isolated stream/owner allocation. Not native bytes or working set.',
  limitations: 'Source checks rehash packaged snapshots and compare actual recorded PE/PDB/native observations. Without --live they do not reopen omitted PE/PDB/build/runtime files. Selected source documents are not full compiler provenance or method coverage. No Student-t quantile,host isolation,universal allocation reduction,or causal explanation of adverse timing is claimed. Padded ciphertext is an upper bound,not exact plaintext length;all empty/aligned controls retained.',
};
let liveFrozenFiles = 0;
const manifests = new Map();
for (const role of ['original', 'candidate']) {
  const relative = `contexts\\${role}`;
  const manifest = read(`${relative}\\context-manifest.json`);
  manifests.set(role, manifest);
  for (const entry of manifest.files) {
    if (live || entry.path.startsWith('sources\\')) {
      const actual = fs.readFileSync(file(`${relative}\\${entry.path}`));
      require(actual.length === entry.bytes && digest(actual) === entry.sha256, 'Frozen bytes differ:' + relative + '\\' + entry.path);
      if (live) liveFrozenFiles++;
      if (entry.path.startsWith('sources\\')) audit.sourceSnapshotsChecked++;
    }
  }
  for (const kind of ['standard', 'framework']) {
    const prefix = kind === 'framework' ? 'framework-image' : 'image';
    const command = read(`${relative}\\characterization-${kind}-command.json`);
    require(command.actualExitCode === 0 && command.arguments.includes('characterize') &&
      command.executable.endsWith(kind === 'framework' ? 'AutoPerf.Benchmarks.exe' : 'dotnet.exe'),
    'Actual untimed native characterization must execute its appropriate host and exit0.');
    const stateDirectory = `${relative}\\characterization-${kind}\\states`;
    const states = statesAt(stateDirectory);
    checkWitnesses(role, kind, manifest, states, `characterization-${kind}`);
    const runtime = states.find(item => item.name.endsWith('-runtime.json'))?.data;
    require(runtime && runtime.ownerSha256 === manifest.files.find(entry => entry.path === prefix + '\\Microsoft.AspNetCore.DataProtection.dll').sha256 &&
      runtime.actualX64Process && runtime.benchmarkDotNetSha256 === '4560EE1128636D3913C3FA71B8419DD2317FB97FD331231A53AD5501D5BA5437',
    'Actual characterized owner/tool/runtime must match the frozen image.');
    if (kind === 'framework') {
      require(runtime.hostTargetFramework === '.NETFramework,Version=v4.7.2' &&
        runtime.ownerTargetFramework === '.NETFramework,Version=v4.6.2' && runtime.serverGc === false &&
        runtime.actualCorelibFileVersion.startsWith('4.8.10008.0'), 'Actual Framework/x64/net462/workstation observations required.');
    } else {
      require(runtime.hostTargetFramework === '.NETCoreApp,Version=v12.0' &&
        runtime.ownerTargetFramework === '.NETStandard,Version=v2.0', 'Compatibility host must execute the real standard owner,not the modern product.');
    }
    const roundtrips = states.filter(item => item.name.endsWith('-native-roundtrip.json'));
    require(roundtrips.length === shapes.length * 3, 'Every untimed characterization must produce63 real roundtrips.');
    for (const phase of ['untimed-global-setup', 'actual-timed-wrapper-preflight', 'untimed-global-cleanup']) {
      const rows = roundtrips.filter(item => item.data.phase === phase);
      require(rows.length === shapes.length && shapes.every(shape => rows.filter(item => item.data.shape === shape).length === 1),
        'Each actual native phase must execute every predeclared shape exactly once.');
    }
    for (const item of roundtrips) checkRoundtrip(item.data);
    const completed = states.find(item => item.name.endsWith('-characterization-completed.json'))?.data;
    require(completed?.allSuccessful && completed.actualTimedWrapperPaths === 21 &&
      completed.nativeRoundtripRecords === 63 && completed.argumentContractCases === 3, 'Actual native completed record differs.');
    const argumentRecords = states.filter(item => item.name.endsWith('-argument-contracts.json'));
    require(argumentRecords.length === 1 && argumentRecords[0].data.defaultProtectedPayloadRejected &&
      argumentRecords[0].data.defaultAadRejected && argumentRecords[0].data.emptyAadRoundtripPassed,
    'All3 actual native input contracts must execute.');
    audit.nativeRoundtripRecords += roundtrips.length;
    audit.argumentContractCases += 3;
    audit.nativeContextChecks.push({ role, kind, actualRoundtrips: 63, actualWrapperPreflights: 21,
      actualArgumentContracts: 3, manifestFiles: manifest.files.length,
      imageFiles: manifest.files.filter(entry => entry.path.startsWith(prefix + '\\')).length });
  }
}
for (const kind of ['standard', 'framework']) {
  const prefix = kind === 'framework' ? 'framework-image' : 'image';
  const original = manifests.get('original').files.filter(entry => entry.path.startsWith(prefix + '\\'));
  const candidate = manifests.get('candidate').files.filter(entry => entry.path.startsWith(prefix + '\\'));
  require(original.length === candidate.length, 'Same consumer image inventory required.');
  const differences = candidate.filter(entry => original.find(before => before.path === entry.path)?.sha256 !== entry.sha256)
    .map(entry => entry.path).sort();
  require(equal(differences, [prefix + '\\Microsoft.AspNetCore.DataProtection.dll', prefix + '\\Microsoft.AspNetCore.DataProtection.pdb']),
    'Only the actual owner DLL/PDB may differ between role images.');
  audit.imageComparisons.push({ kind, filesPerRole: original.length, differingFiles: differences, allNonownerImageHashesEqual: true });
}
const originalSource = text('contexts\\original\\sources\\owner\\ManagedAuthenticatedEncryptor.cs');
const candidateSource = text('contexts\\candidate\\sources\\owner\\ManagedAuthenticatedEncryptor.cs');
const constructor = 'var outputStream = new MemoryStream(capacity: macOffset - ciphertextOffset);';
require(candidateSource.split(constructor).length === 2 &&
  candidateSource.replace(constructor, 'var outputStream = new MemoryStream();') === originalSource &&
  text('contexts\\original\\sources\\test\\ManagedAuthenticatedEncryptorTests.cs') === text('contexts\\candidate\\sources\\test\\ManagedAuthenticatedEncryptorTests.cs'),
'Only the single legacy Decrypt capacity seam may differ;the original must exercise the identical new preservation tests.');
audit.exactSingleLegacyDecryptStatementChanged = true;
for (let comparison = 1; comparison <= 3; comparison++) {
  for (const role of ['original', 'candidate']) {
    const directory = `measurements\\comparison-${String(comparison).padStart(3, '0')}\\${role}\\states`;
    const states = statesAt(directory);
    checkWitnesses(role, 'framework', manifests.get(role), states, `comparison-${comparison}`);
    const completed = states.find(item => item.name.endsWith('-completed.json'))?.data;
    require(completed?.allSuccessful && completed.actualReports === shapes.length && completed.singleActualOwnerProfile,
      'Every actual measured profile must complete21 successful owner reports.');
    const roundtrips = states.filter(item => item.name.endsWith('-native-roundtrip.json'));
    require(roundtrips.length === shapes.length * 2, 'Every actual timed case must pass real setup/cleanup roundtrips.');
    for (const item of roundtrips) checkRoundtrip(item.data);
    audit.nativeRoundtripRecords += roundtrips.length;
  }
}
const decodeXml = value => value.replace(/&(amp|quot|apos|lt|gt);/g, (_, key) => ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' })[key]);
const attrs = input => Object.fromEntries([...input.matchAll(/([\w:.-]+)="([^"]*)"/g)].map(match => [match[1], decodeXml(match[2])]));
for (const role of ['original', 'candidate']) {
  const proofs = read(`contexts\\${role}\\owning-test-rows.json`);
  require(proofs.length === 2, 'Both actual owning test TFMs required.');
  for (const proof of proofs) {
    const trx = `preparation-execution\\${role}-Test\\attempt-001\\results-${proof.target}\\focused-${proof.target}.trx`;
    require(hash(trx) === proof.rawSha256, 'Actual owning TRX bytes differ.');
    const xml = text(trx);
    const results = [...xml.matchAll(/<UnitTestResult\b([^>]+)>/g)].map(match => attrs(match[1]));
    const entries = [...xml.matchAll(/<TestEntry\b([^>]+)\/>/g)].map(match => attrs(match[1]));
    const definitions = [...xml.matchAll(/<UnitTest\b([^>]+)>/g)].map(match => attrs(match[1]));
    const counters = attrs(/<Counters\b([^>]+)\/>/.exec(xml)?.[1] ?? '');
    const expectedCount = proof.target === 'net12.0' ? 40 : proof.target === 'net472' ? 24 : -1;
    require(results.length === expectedCount && proof.rows.length === expectedCount && proof.actualPassed === expectedCount &&
      proof.failedOrSkipped === 0 && proof.allNineNewTheoryPayloadsIndividuallyValidated &&
      Number(counters.total) === expectedCount && Number(counters.executed) === expectedCount && Number(counters.passed) === expectedCount,
    'Actual owning suite cardinality/exported counters/outcomes differ.');
    require(new Set(results.map(row => row.executionId)).size === results.length, 'Duplicate actual test execution.');
    for (const row of proof.rows) {
      const actual = results.find(item => item.executionId === row.executionId);
      require(actual && actual.testId === row.testId && actual.testName === row.testName && actual.outcome === 'Passed' &&
        actual.duration === row.duration && entries.filter(item => item.testId === row.testId && item.executionId === row.executionId).length === 1 &&
        definitions.filter(item => item.id === row.testId).length === 1, 'Raw test result/definition/entry/proof identities differ.');
    }
    const preservation = results.filter(row => row.testName.includes('Decrypt_BlockAndStreamBoundaries_PreservesPayloadAndInputs'));
    require(preservation.length === acceptance.focused_preservation_cases.length &&
      acceptance.focused_preservation_cases.every(([length, size]) => preservation.filter(row =>
        new RegExp(`plaintextLength:\\s*${length},\\s*expectedPayloadLength:\\s*${size}\\)`).test(row.testName)).length === 1),
    'Each preservation Theory row must actually execute on both products and both owner variants.');
    audit[role === 'original' ? 'originalOwningTestRows' : 'candidateOwningTestRows'] += results.length;
    audit.allNewPreservationTheoryExecutions += preservation.length;
  }
}
for (const name of ['001-evaluate-package-gate', '002-existing-enabled-package-validation']) {
  const command = read(`preparation-execution\\candidate-Pack\\attempt-001\\${name}.json`);
  require(command.actualExitCode === 0 && command.outputSha256 === hash(`preparation-execution\\candidate-Pack\\attempt-001\\${name}.log`),
    'Actual enabled pack evaluation/execution output differs.');
}
const properties = JSON.parse(text('preparation-execution\\candidate-Pack\\attempt-001\\001-evaluate-package-gate.log')).Properties;
const packLog = text('preparation-execution\\candidate-Pack\\attempt-001\\002-existing-enabled-package-validation.log');
require(properties.EnablePackageValidation === 'true' && properties.PackageValidationBaselineVersion === '' &&
  packLog.includes('RunPackageValidation:') && packLog.includes('APICompat ran successfully without finding any breaking changes.') &&
  /0 Warning\(s\)/.test(packLog) && /0 Error\(s\)/.test(packLog), 'Enabled APICompat package validation must actually succeed.');
const packed = read('package-payload-recheck.json');
require(packed.allThreePackedOwnerDllsMatch && packed.entries.length === 3 && packed.entries.every(entry =>
  entry.matchesFrozenCandidate && entry.sha256 === manifests.get('candidate').files.find(item =>
    item.path === `products\\${entry.target}\\Microsoft.AspNetCore.DataProtection.dll`)?.sha256),
'All3 actual packed owner DLLs must match their frozen candidate products.');
audit.actualEnabledPackageValidationPassed = true;
audit.actualAllThreePackedOwnersMatchFrozenProducts = true;
audit.releasedPackageBaselineComparisonClaimed = false;
require(audit.nativeRoundtripRecords === 504 && audit.argumentContractCases === 12 &&
  audit.actualPePdbWitnessRecords === 20 && audit.selectedSourceDocumentChecks === 110 &&
  audit.originalOwningTestRows === 64 && audit.candidateOwningTestRows === 64 && audit.allNewPreservationTheoryExecutions === 36 &&
  audit.settingsRecords === 252 && audit.sourceSnapshotsChecked === 28,
'Complete real producer/native/source/test accounting required.');
const partialLarge = analysis.rows.filter(row => row.shape.endsWith('_P65537') || row.shape.endsWith('_P1048577'));
require(partialLarge.length === 3, 'All3 partial-block large controls must remain in the full matrix.');
audit.repeatedMaterialPartialLargeAllocationBenefit = partialLarge.every(row => row.allocationChangePercent < -30 &&
  row.rounds.every(round => round.candidateBytes < round.originalBytes));
audit.partialLargeAggregateTimeImproved = partialLarge.every(row => row.timeChangePercent < 0);
audit.performancePrJustified = audit.repeatedMaterialPartialLargeAllocationBenefit && audit.partialLargeAggregateTimeImproved;
audit.proposalDisposition = audit.performancePrJustified ? 'qualified-draft/legacy-partial-block-managed-allocation-improvement' : 'no-gain-or-inconclusive';
audit.adverseObservedCases = analysis.rows.filter(row => row.rounds.some(round =>
  round.timeChangePercent > 0 || round.candidateBytes > round.originalBytes))
  .map(row => ({ shape: row.shape, aggregateTimeChangePercent: row.timeChangePercent,
    aggregateAllocationChangePercent: row.allocationChangePercent,
    perComparisonTimeChangesPercent: row.rounds.map(round => round.timeChangePercent),
    perComparisonByteChanges: row.rounds.map(round => round.candidateBytes - round.originalBytes) }));
audit.allTimingAndAllocationResultsRetained = true;
if (live) {
  const counterSource = path.join(here, 'autoperf-runs', 'F012', 'investigation', 'bdn-memory-accounting', 'GcStats.cs');
  require(digest(fs.readFileSync(counterSource)) === '8784625B02B605F2ACB3581CCC43F258748C16012DB38AB9FCB2B2AFB4EA8BAB',
    'Borrowed actual BDN counter source bytes differ.');
  write('live-frozen-file-recheck.json', { actualLiveAuditPassed: true, actualFrozenFilesRehashed: liveFrozenFiles,
    bothDualImageContextManifestsRehashed: true, borrowedCounterSourceSha256: digest(fs.readFileSync(counterSource)),
    sourceUrl: 'https://github.com/dotnet/BenchmarkDotNet/blob/v0.13.0/src/BenchmarkDotNet/Engines/GcStats.cs',
    counterObservedInAttributedSource: audit.counter, actualBdnDllSha256: '4560EE1128636D3913C3FA71B8419DD2317FB97FD331231A53AD5501D5BA5437',
    attributionNotACompleteIndependentSourceToBinaryBinding: true });
}
const liveRecord = read('live-frozen-file-recheck.json');
require(liveRecord.actualLiveAuditPassed && liveRecord.bothDualImageContextManifestsRehashed &&
  liveRecord.actualFrozenFilesRehashed === [...manifests.values()].reduce((sum, manifest) => sum + manifest.files.length, 0),
'Actual prior live native/source image recheck must be preserved.');
audit.actualLiveAuditPassed = true;
audit.actualFrozenFilesRehashedBeforeOmission = liveRecord.actualFrozenFilesRehashed;
if (verify) {
  require(equal(read('measurement-audit.json'), audit), 'Portable source/native/TRX/accounting audit differs.');
} else {
  write('measurement-audit.json', audit);
}
console.log(JSON.stringify({ auditPassed: true, mode: live ? 'live' : 'portable-verify',
  frozenFilesRehashedNow: liveFrozenFiles, sourceSnapshotsChecked: audit.sourceSnapshotsChecked,
  sourceDocumentChecks: audit.selectedSourceDocumentChecks, actualPePdbWitnessRecords: audit.actualPePdbWitnessRecords,
  actualRoundtripRecords: audit.nativeRoundtripRecords, actualArgumentContracts: audit.argumentContractCases,
  originalOwningTestRows: audit.originalOwningTestRows, candidateOwningTestRows: audit.candidateOwningTestRows,
  preservationTheoryExecutions: audit.allNewPreservationTheoryExecutions, disposition: audit.proposalDisposition,
  actualEnabledPackageValidationPassed: true, imageComparisons: audit.imageComparisons }, null, 2));

function statesAt(relative) {
  return fs.readdirSync(file(relative)).filter(name => name.endsWith('.json')).sort().map(name => ({
    name, data: read(`${relative}\\${name}`),
  }));
}

function checkRoundtrip(record) {
  const match = /^Aes256Sha(256|512)_P(\d+)$/.exec(record.shape);
  require(match && shapes.includes(record.shape) && record.plaintextLength === Number(match[2]) &&
    record.digestLength === Number(match[1]) / 8 &&
    record.paddedCiphertextLength === (Math.floor(record.plaintextLength / 16) + 1) * 16 &&
    record.actualPayloadLength === 32 + record.paddedCiphertextLength + record.digestLength &&
    record.actualPayloadLength === record.expectedPayloadLength &&
    record.actualDecryptedLength === record.plaintextLength && record.inputBuffersUnchanged &&
    record.actualPublicFactory && record.actualPayloadProducedByPublicEncrypt && record.realDefaultEntropyInUntimedPayloadSetup &&
    record.timedDecryptGeneratesRandomness === false && record.paddedCiphertextIsUpperBoundNotExactPlaintext &&
    record.plaintextOffset === 3 && record.aadOffset === 5 && record.aadLength === 32 && record.ciphertextOffset === 4,
  'Actual producer/upper-bound/offset/input-preservation/roundtrip observation differs.');
}

function checkWitnesses(role, kind, manifest, states, phase) {
  const relative = `contexts\\${role}`;
  const prefix = kind === 'framework' ? 'framework-image' : 'image';
  const bindings = states.filter(item => item.name.includes('-source-pdb-'));
  require(bindings.length === 2, 'Every native executable must bind the actual owner and harness PE/PDB.');
  for (const item of bindings) {
    const owner = item.name.includes('-Microsoft.AspNetCore.DataProtection.');
    const assemblyName = owner ? 'Microsoft.AspNetCore.DataProtection.dll' : kind === 'framework' ? 'AutoPerf.Benchmarks.exe' : 'AutoPerf.Benchmarks.dll';
    const pdbName = assemblyName.replace(/\.(dll|exe)$/, '.pdb');
    const binding = item.data;
    require(binding.actualPePdbBindingMatched && binding.codeViewGuid === binding.pdbGuid &&
      binding.assemblySha256 === manifest.files.find(entry => entry.path === prefix + '\\' + assemblyName)?.sha256 &&
      binding.pdbSha256 === manifest.files.find(entry => entry.path === prefix + '\\' + pdbName)?.sha256,
    'Actual native PE/PDB observations differ from the frozen inventories.');
    require(binding.documents.length === (owner ? 7 : 4), 'Selected source-document inventory differs.');
    for (const document of binding.documents) {
      const source = `${relative}\\sources\\${owner ? 'owner' : 'harness'}\\${path.win32.basename(document.source)}`;
      const bytes = fs.readFileSync(file(source));
      const algorithm = document.algorithm === '8829d00f-11b8-4213-878b-770e8597ac16' ? 'sha256' :
        document.algorithm === 'ff1816ec-aa5e-4d10-87f7-6f4963833460' ? 'sha1' : null;
      require(algorithm && document.sha256 === digest(bytes) &&
        document.checksum === crypto.createHash(algorithm).update(bytes).digest('hex').toUpperCase(),
      'Copied actual selected source differs from its native PDB-document witness.');
      audit.selectedSourceDocumentChecks++;
    }
    audit.actualPePdbWitnessRecords++;
    audit.sourceBindings.push({ relative, kind, phase, assemblyName, assemblySha256: binding.assemblySha256,
      pdbSha256: binding.pdbSha256, selectedSourceDocuments: binding.documents.length });
  }
}
