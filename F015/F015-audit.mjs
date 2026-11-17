import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[2] ?? path.join(here, 'autoperf-runs', 'F015'));
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
  require(!fs.existsSync(file(relative)), 'Never overwrite completed audit evidence: ' + relative);
  fs.writeFileSync(file(relative), JSON.stringify(value, null, 2) + '\n');
};
const extractor = path.join(here, 'F015-analyze.mjs');
const recomputation = spawnSync(process.execPath, [extractor, root, '--verify'], { encoding: 'utf8' });
require(recomputation.status === 0, 'Raw-sample recomputation failed: ' + recomputation.stdout + recomputation.stderr);
const analysis = read('analysis.json');
const budget = read('measurement-budget.json');
require(budget.closed && budget.usedComparisons === 3 && budget.originalProfiles === 3 && budget.candidateProfiles === 3,
  'Three actual original/candidate comparisons must stay permanently closed.');
const audit = {
  candidate: 'F015', auditPassed: true, performancePrJustified: true,
  proposalDisposition: 'qualified-draft/legacy-managed-allocation-improvement',
  budgetClosed: true, pairedComparisons: 3, completedProfiles: 6, successfulReports: 84,
  nativeContextChecks: [], imageComparisons: [], sourceSnapshotsChecked: 0,
  actualPePdbWitnessRecords: 0, selectedSourceDocumentChecks: 0, nativeRoundtripRecords: 0,
  argumentContractCases: 0, settingsRecords: 168, originalOwningTestRows: 0,
  candidateOwningTestRows: 0, allNewPreservationTheoryExecutions: 0, sourceBindings: [],
  accounting: analysis.accounting,
  allocationBenefitObserved: true, modernProductPathTimingClaimed: false,
  counter: 'AppDomain.CurrentDomain.MonitoringTotalAllocatedMemorySize on actual .NET Framework; forced-GC diagnostic accounting includes other managed activity in the same AppDomain, not isolated stream/owner allocation. Not native bytes or working set.',
  limitations: 'Source checks rehash packaged snapshots and compare actual recorded PE/PDB/native observations. Without --live they do not reopen omitted PE/PDB/build/runtime files. Selected source documents are not full compiler provenance or method coverage. No Student-t quantile, host isolation or causal explanation of small-case adverse timing is claimed.',
};
let liveFrozenFiles = 0;
const manifests = new Map();
for (const family of ['contexts', 'framework-contexts']) {
  for (const role of ['original', 'candidate']) {
    const relative = `${family}\\${role}`;
    const manifest = read(`${relative}\\context-manifest.json`);
    manifests.set(relative, manifest);
    for (const entry of manifest.files) {
      if (live || entry.path.startsWith('sources\\')) {
        const actual = fs.readFileSync(file(`${relative}\\${entry.path}`));
        require(actual.length === entry.bytes && digest(actual) === entry.sha256, 'Frozen bytes differ: ' + relative + '\\' + entry.path);
        if (live) liveFrozenFiles++;
        if (entry.path.startsWith('sources\\')) audit.sourceSnapshotsChecked++;
      }
    }
    const command = read(`${relative}\\characterization-command.json`);
    require(command.actualExitCode === 0, 'The actual native characterization must exit0.');
    const stateDirectory = `${relative}\\characterization\\states`;
    const states = fs.readdirSync(file(stateDirectory)).filter(name => name.endsWith('.json')).sort().map(name => ({
      name, data: read(`${stateDirectory}\\${name}`),
    }));
    checkWitnesses(relative, manifest, states, 'characterization');
    const runtime = states.find(item => item.name.endsWith('-runtime.json'))?.data;
    require(runtime && runtime.ownerSha256 === manifest.files.find(entry => entry.path === 'image\\Microsoft.AspNetCore.DataProtection.dll').sha256,
      'Actual characterized owner must match the frozen image.');
    if (family === 'framework-contexts') {
      require(runtime.hostTargetFramework === '.NETFramework,Version=v4.7.2' &&
        runtime.ownerTargetFramework === '.NETFramework,Version=v4.6.2' && runtime.actualX64Process && runtime.serverGc === false,
      'Actual Framework/x64/net462/workstation observations required.');
    } else {
      require(runtime.ownerTargetFramework === '.NETStandard,Version=v2.0', 'Earlier compatibility host must execute the real standard owner.');
    }
    const roundtrips = states.filter(item => item.name.endsWith('-native-roundtrip.json'));
    require(roundtrips.length === 42, 'Every untimed characterization must produce42 real roundtrips.');
    for (const item of roundtrips) checkRoundtrip(item.data);
    const completed = states.find(item => item.name.endsWith('-characterization-completed.json'))?.data;
    require(completed?.allSuccessful && completed.actualTimedWrapperPaths === 14 &&
      completed.nativeRoundtripRecords === 42 && completed.argumentContractCases === 3, 'Actual native completed record differs.');
    const argumentRecord = states.find(item => item.name.endsWith('-argument-contracts.json'));
    require(argumentRecord, 'Actual native input contracts must execute.');
    audit.nativeRoundtripRecords += roundtrips.length;
    audit.argumentContractCases += 3;
    audit.nativeContextChecks.push({ family, role, actualRoundtrips: 42, actualWrapperPreflights: 14,
      actualArgumentContracts: 3, sourceSnapshots: manifest.files.filter(entry => entry.path.startsWith('sources\\')).length,
      manifestFiles: manifest.files.length, imageFiles: manifest.files.filter(entry => entry.path.startsWith('image\\')).length });
  }
  const original = manifests.get(`${family}\\original`).files.filter(entry => entry.path.startsWith('image\\'));
  const candidate = manifests.get(`${family}\\candidate`).files.filter(entry => entry.path.startsWith('image\\'));
  require(original.length === candidate.length, 'Same consumer image inventory required.');
  const differences = candidate.filter(entry => original.find(before => before.path === entry.path)?.sha256 !== entry.sha256).map(entry => entry.path).sort();
  require(equal(differences, ['image\\Microsoft.AspNetCore.DataProtection.dll', 'image\\Microsoft.AspNetCore.DataProtection.pdb']),
    'Only the actual owner DLL/PDB may differ between role images.');
  audit.imageComparisons.push({ family, filesPerRole: original.length, differingFiles: differences, allNonownerImageHashesEqual: true });
}
for (let comparison = 1; comparison <= 3; comparison++) {
  for (const role of ['original', 'candidate']) {
    const relative = `measurements\\comparison-${String(comparison).padStart(3, '0')}\\${role}\\states`;
    const states = fs.readdirSync(file(relative)).filter(name => name.endsWith('.json')).sort().map(name => ({
      name, data: read(`${relative}\\${name}`),
    }));
    checkWitnesses(`framework-contexts\\${role}`, manifests.get(`framework-contexts\\${role}`), states, `comparison-${comparison}`);
    const completed = states.find(item => /-\d*completed\.json$/.test(item.name))?.data;
    require(completed?.allSuccessful && completed.actualReports === 14 && completed.singleActualOwnerProfile,
      'Every actual measured profile must complete14 successful owner reports.');
    const roundtrips = states.filter(item => item.name.endsWith('-native-roundtrip.json'));
    require(roundtrips.length === 28, 'Every actual timed case must pass real setup/cleanup roundtrips.');
    for (const item of roundtrips) checkRoundtrip(item.data);
    audit.nativeRoundtripRecords += roundtrips.length;
  }
}
const decodeXml = value => value.replace(/&(amp|quot|apos|lt|gt);/g, (_, key) => ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' })[key]);
const attrs = input => Object.fromEntries([...input.matchAll(/([\w:.-]+)="([^"]*)"/g)].map(match => [match[1], decodeXml(match[2])]));
const expectedRows = [[0, 80], [15, 80], [16, 96], [17, 96], [191, 256], [192, 272], [193, 272], [65536, 65616]];
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
    const expectedCount = proof.target === 'net12.0' ? 39 : proof.target === 'net472' ? 23 : -1;
    require(results.length === expectedCount && proof.rows.length === expectedCount && proof.actualPassed === expectedCount &&
      proof.failedOrSkipped === 0 && proof.allEightNewTheoryPayloadsIndividuallyValidated, 'Actual owning suite cardinality/outcomes differ.');
    require(new Set(results.map(row => row.executionId)).size === results.length, 'Duplicate actual test execution.');
    for (const row of proof.rows) {
      const actual = results.find(item => item.executionId === row.executionId);
      require(actual && actual.testId === row.testId && actual.testName === row.testName && actual.outcome === 'Passed' &&
        actual.duration === row.duration && entries.filter(item => item.testId === row.testId && item.executionId === row.executionId).length === 1 &&
        definitions.filter(item => item.id === row.testId).length === 1, 'Raw test result/definition/entry/proof identities differ.');
    }
    const preservation = results.filter(row => row.testName.includes('Encrypt_BlockAndStreamBoundaries_RoundTripsWithOffsets'));
    require(preservation.length === 8 && expectedRows.every(([length, size]) => preservation.filter(row =>
      new RegExp(`plaintextLength:\\s*${length},\\s*expectedPayloadLength:\\s*${size}\\)`).test(row.testName)).length === 1),
    'Each preservation Theory row must actually execute on both products and both owner variants.');
    audit[role === 'original' ? 'originalOwningTestRows' : 'candidateOwningTestRows'] += results.length;
    audit.allNewPreservationTheoryExecutions += preservation.length;
  }
}
const packCommands = read('preparation-execution\\candidate-Pack\\attempt-001\\execution.json');
require(packCommands.length === 2 && packCommands.every(command => command.actualExitCode === 0), 'Actual enabled pack evaluation/execution required.');
const properties = JSON.parse(text('preparation-execution\\candidate-Pack\\attempt-001\\EvaluatePackageGate.log')).Properties;
const packLog = text('preparation-execution\\candidate-Pack\\attempt-001\\Pack.log');
require(properties.EnablePackageValidation === 'true' && properties.PackageValidationBaselineVersion === '' &&
  packLog.includes('RunPackageValidation:') && packLog.includes('APICompat ran successfully without finding any breaking changes.') &&
  /0 Warning\(s\)/.test(packLog) && /0 Error\(s\)/.test(packLog), 'Enabled APICompat package validation must actually succeed.');
audit.actualEnabledPackageValidationPassed = true;
audit.releasedPackageBaselineComparisonClaimed = false;
require(audit.nativeRoundtripRecords === 336 && audit.argumentContractCases === 12 &&
  audit.actualPePdbWitnessRecords === 20 && audit.selectedSourceDocumentChecks === 110 &&
  audit.originalOwningTestRows === 62 && audit.candidateOwningTestRows === 62 && audit.allNewPreservationTheoryExecutions === 32,
  'Complete real producer/native/source/test accounting required.');
const large = analysis.rows.filter(row => row.shape.endsWith('_P65536') || row.shape.endsWith('_P1048576'));
require(large.length === 3 && large.every(row => row.rounds.every(round => round.candidateBytes < round.originalBytes && round.candidateNs < round.originalNs)) &&
  large.every(row => row.allocationChangePercent < -39), 'Material repeated real legacy allocation/time benefit required.');
audit.largeAllocationTimeBenefitInEveryComparison = true;
audit.adverseObservedCases = analysis.rows.filter(row => row.rounds.some(round => round.timeChangePercent > 0))
  .map(row => ({ shape: row.shape, aggregateTimeChangePercent: row.timeChangePercent,
    perComparisonTimeChangesPercent: row.rounds.map(round => round.timeChangePercent) }));
audit.allTimingAndAllocationResultsRetained = true;
if (live) {
  const counterSource = path.join(here, 'autoperf-runs', 'F012', 'investigation', 'bdn-memory-accounting', 'GcStats.cs');
  require(digest(fs.readFileSync(counterSource)) === '8784625B02B605F2ACB3581CCC43F258748C16012DB38AB9FCB2B2AFB4EA8BAB',
    'Borrowed actual BDN counter source bytes differ.');
  write('live-frozen-file-recheck.json', { actualLiveAuditPassed: true, actualFrozenFilesRehashed: liveFrozenFiles,
    allFourContextManifestsRehashed: true, borrowedCounterSourceSha256: digest(fs.readFileSync(counterSource)),
    sourceUrl: 'https://github.com/dotnet/BenchmarkDotNet/blob/v0.13.0/src/BenchmarkDotNet/Engines/GcStats.cs',
    counterObservedInAttributedSource: audit.counter, actualBdnDllSha256: '4560EE1128636D3913C3FA71B8419DD2317FB97FD331231A53AD5501D5BA5437',
    attributionNotACompleteIndependentSourceToBinaryBinding: true });
}
const liveRecord = read('live-frozen-file-recheck.json');
require(liveRecord.actualLiveAuditPassed && liveRecord.allFourContextManifestsRehashed && liveRecord.actualFrozenFilesRehashed > 400,
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

function checkRoundtrip(record) {
  require(record.actualPayloadLength === record.expectedPayloadLength &&
    record.actualDecryptedLength === record.plaintextLength && record.inputBuffersUnchanged &&
    record.actualPublicFactory && record.realDefaultOperationRandomness &&
    record.plaintextOffset === 3 && record.aadOffset === 5 && record.ciphertextOffset === 4,
  'Actual default producer/offset/input-preservation/roundtrip observation differs.');
}

function checkWitnesses(relative, manifest, states, phase) {
  const bindings = states.filter(item => item.name.includes('-source-pdb-'));
  require(bindings.length === 2, 'Every native executable must bind the actual owner and harness PE/PDB.');
  for (const item of bindings) {
    const owner = item.name.includes('-Microsoft.AspNetCore.DataProtection.');
    const assemblyName = owner ? 'Microsoft.AspNetCore.DataProtection.dll' : relative.startsWith('framework-contexts\\') ?
      'AutoPerf.Benchmarks.exe' : 'AutoPerf.Benchmarks.dll';
    const pdbName = assemblyName.replace(/\.(dll|exe)$/, '.pdb');
    const binding = item.data;
    require(binding.actualPePdbBindingMatched && binding.codeViewGuid === binding.pdbGuid &&
      binding.assemblySha256 === manifest.files.find(entry => entry.path === 'image\\' + assemblyName)?.sha256 &&
      binding.pdbSha256 === manifest.files.find(entry => entry.path === 'image\\' + pdbName)?.sha256,
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
    audit.sourceBindings.push({ relative, phase, assemblyName, assemblySha256: binding.assemblySha256,
      pdbSha256: binding.pdbSha256, selectedSourceDocuments: binding.documents.length });
  }
}
