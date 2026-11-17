import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[2] ?? path.join(here, 'autoperf-runs', 'F018'));
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
const recomputation = spawnSync(process.execPath, [path.join(here, 'F018-analyze.mjs'), root, '--verify'], { encoding: 'utf8' });
require(recomputation.status === 0, 'Actual raw recomputation failed:' + recomputation.stdout + recomputation.stderr);
const analysis = read('analysis.json');
const acceptance = read('acceptance.json');
const shapes = acceptance.requiredBenchmarkShapes;
const budget = read('measurement-budget.json');
const comparisons = budget.usedComparisons;
require(budget.closed || (live && analysis.numericEarlyStopEligible), 'Only a fully audited prespecified clear gain can close early.');
const audit = {
  candidate: 'F018', auditPassed: true, budgetClosed: true, pairedComparisons: comparisons, completedProfiles: comparisons * 2,
  successfulReports: analysis.accounting.reports, nativeContextChecks: [], imageComparison: null, sourceSnapshotsChecked: 0,
  actualPePdbWitnessRecords: 0, selectedSourceDocumentChecks: 0, actualProfileContracts: 0, actualProducerCancellationContracts: 0,
  actualWrapperPreflights: 0, settingsRecords: 0, executingOwnerRecords: 0, runtimeAssemblyWitnessChecks: 0,
  originalOwningTestRows: 0, candidateOwningTestRows: 0, allNewPreservationTheoryExecutions: 0, sourceBindings: [],
  accounting: analysis.accounting,
  counter: 'Attributed BDN0.13 source selects precise process-wide GC.GetTotalAllocatedBytes(true) on this modern runtime;inclusive managed diagnostic-operation accounting,not isolated owner/string/native bytes or working set. Counter source is not an independent source-to-BDN-binary equivalence proof.',
  limitations: 'Shared Windows Hyper-V VM;one-to-three paired warm in-process profiles are not independent production trials. Synthetic padding;no provider response distribution,external network/browser or complete callback timed. Awaited yielding event lifetime is validated outside timing. Only selected actual PE/PDB/source witnesses,not whole compiler provenance or method coverage. Portable verification rehashes retained sources/logs/native records,not omitted PE/PDB/runtime/package files. No Student-t quantile,host clock calibration,universal allocation reduction or merge-readiness claim.',
};
const manifests = new Map();
let liveFrozenFiles = 0;
let liveRuntimeFiles = 0;
let runtimeReference;
let settingsReference;
for (const role of ['original', 'candidate']) {
  const manifest = read(`contexts\\${role}\\manifest.json`);
  require(manifest.candidate === 'F018' && manifest.role === role && manifest.baseline === acceptance.baseline &&
    manifest.totalFiles === 145 && manifest.preparedImageFiles === 124 && manifest.testedProductAndImageOwnerDllPdbMatch,
  'Actual accepted complete prepared image and tested-owner identity required.');
  manifests.set(role, manifest);
  for (const entry of manifest.files) {
    if (live || entry.path.startsWith('sources\\')) {
      const bytes = fs.readFileSync(file(`contexts\\${role}\\${entry.path}`));
      require(bytes.length === entry.bytes && digest(bytes) === entry.sha256, 'Frozen bytes differ:' + role + '/' + entry.path);
      if (live) liveFrozenFiles++;
      if (entry.path.startsWith('sources\\')) audit.sourceSnapshotsChecked++;
    }
  }
  for (const extension of ['dll', 'pdb']) {
    require(manifest.files.find(entry => entry.path === `image\\Microsoft.AspNetCore.Authentication.Google.${extension}`)?.sha256 ===
      manifest.files.find(entry => entry.path === `owning-tests\\Microsoft.AspNetCore.Authentication.Google.${extension}`)?.sha256,
    'Actual tested owner and measured owner/PDB must be identical.');
  }
  const relative = `characterization-execution\\${role}\\attempt-001`;
  const command = read(`${relative}\\command.json`);
  require(command.actualExitCode === 0 && command.characterizationOnly && !command.timingPerformed &&
    command.outputSha256 === hash(`${relative}\\native.log`) && command.arguments.includes('characterize'),
  'Actual untimed real-producer characterization must have run successfully.');
  const states = statesAt(`${relative}\\artifacts\\states`);
  checkNative(role, states, 'characterize', 'characterization');
  for (const shape of shapes) {
    const wrappers = states.filter(item => item.name.endsWith('-wrapper-result.json') && item.data.shape === shape);
    const expected = expectedContract(shape, null).result;
    require(wrappers.length === 1 && wrappers[0].data.matched && wrappers[0].data.observed === expected &&
      wrappers[0].data.expected === expected, 'Every actual timed wrapper must return the independently expected consumed result:' + shape);
    audit.actualWrapperPreflights++;
  }
  const cancellations = states.filter(item => item.name.endsWith('-contract.json') && item.data.phase === 'cancellation');
  require(cancellations.length === 12, 'All12 actual owning-producer cancellation cases required.');
  for (const shape of ['Utf8Small', 'Utf8Large16K', 'Utf8Bom16K', 'InvalidUtf8Small']) {
    for (const mode of ['BeforeRequest', 'DuringBuffer', 'AfterBuffer']) {
      const matches = cancellations.filter(item => item.data.shape === shape && item.data.cancellationMode === mode);
      require(matches.length === 1, 'Every actual producer-owned cancellation precondition must execute exactly once.');
      checkContract(matches[0].data);
      audit.actualProducerCancellationContracts++;
    }
  }
  const completed = states.find(item => item.name.endsWith('-characterization-completed.json'))?.data;
  require(completed?.allSuccessful && completed.context === role && completed.actualTimedWrapperPaths === 24 &&
    completed.actualRecordedProfileContracts === 48 && completed.actualProducerCancellationContracts === 12,
  'Actual preflight completion record differs.');
}
const originalManifest = manifests.get('original');
const candidateManifest = manifests.get('candidate');
const originalImages = originalManifest.files.filter(entry => entry.path.startsWith('image\\'));
const candidateImages = candidateManifest.files.filter(entry => entry.path.startsWith('image\\'));
const differences = candidateImages.filter(entry => originalImages.find(before => before.path === entry.path)?.sha256 !== entry.sha256)
  .map(entry => entry.path).sort();
require(originalImages.length === 124 && candidateImages.length === 124 &&
  equal(differences, ['image\\Microsoft.AspNetCore.Authentication.Google.dll', 'image\\Microsoft.AspNetCore.Authentication.Google.pdb']),
'Only the owner DLL/PDB may differ in the entire124-file prepared images.');
audit.imageComparison = { filesPerRole: 124, differingFiles: differences, allNonownerImageHashesEqual: true };
for (const entry of candidateManifest.files.filter(item => item.path.startsWith('sources\\') &&
  item.path !== 'sources\\owner\\GoogleHandler.cs')) {
  require(originalManifest.files.find(before => before.path === entry.path)?.sha256 === entry.sha256,
    'Preservation tests,other owner sources,harness,API baselines and build inputs must be identical between roles.');
}
const normalize = value => value.replace(/\r\n/g, '\n');
const original = normalize(text('contexts\\original\\sources\\owner\\GoogleHandler.cs'));
const candidate = normalize(text('contexts\\candidate\\sources\\owner\\GoogleHandler.cs'));
const seam = `        var charset = response.Content.Headers.ContentType?.CharSet;
        ReadOnlyMemory<byte> utf8Content = default;
        if (charset is not null && string.Equals(charset, "utf-8", StringComparison.OrdinalIgnoreCase))
        {
            utf8Content = await response.Content.ReadAsByteArrayAsync(Context.RequestAborted);
        }

        JsonDocument payload;
        if (!utf8Content.IsEmpty && Utf8.IsValid(utf8Content.Span))
        {
            // Unlike the string decoder, the memory parser rejects a UTF-8 BOM.
            var preambleLength = utf8Content.Span.StartsWith(Encoding.UTF8.Preamble) ? Encoding.UTF8.Preamble.Length : 0;
            payload = JsonDocument.Parse(utf8Content[preambleLength..]);
        }
        else
        {
            // Preserve charset inference and replacement decoding for other data.
            payload = JsonDocument.Parse(await response.Content.ReadAsStringAsync(Context.RequestAborted));
        }

        using (payload)`;
require(candidate.split(seam).length === 2 &&
  candidate.replace(seam, '        using (var payload = JsonDocument.Parse(await response.Content.ReadAsStringAsync(Context.RequestAborted)))')
    .replace('using System.Text;\n', '').replace('using System.Text.Unicode;\n', '') === original,
'Only the accepted Google parsing seam and required usings may change;existing branch/event/return structure must remain intact.');
audit.exactAcceptedOwnerParsingSeamOnly = true;
audit.identicalOriginalAndCandidatePreservationTestSource = true;
for (let comparison = 1; comparison <= comparisons; comparison++) {
  const number = String(comparison).padStart(3, '0');
  const recheck = read(`measurement-execution\\comparison-${number}\\frozen-recheck.json`);
  require(recheck.length === 2 && recheck.every(item => item.rehashedFiles === 145 &&
    item.manifestSha256 === hash(`contexts\\${item.role}\\manifest.json`)), 'Actual pre-pair frozen rehash differs.');
  for (const role of ['original', 'candidate']) {
    const command = read(`measurement-execution\\comparison-${number}\\${role}.json`);
    require(command.actualExitCode === 0 && command.actualTimingAttempt && command.role === role && command.comparison === comparison &&
      command.outputSha256 === hash(`measurement-execution\\comparison-${number}\\${role}.log`),
    'Actual measured process command/output/role binding differs.');
    checkNative(role, statesAt(`measurements\\comparison-${number}\\${role}\\states`), 'measure', `comparison-${comparison}`);
  }
}
const decodeXml = value => value.replace(/&(amp|quot|apos|lt|gt);/g, (_, key) => ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' })[key]);
const attrs = input => Object.fromEntries([...input.matchAll(/([\w:.-]+)="([^"]*)"/g)].map(match => [match[1], decodeXml(match[2])]));
for (const role of ['original', 'candidate']) {
  const attempt = role === 'original' ? 'attempt-002' : 'attempt-001';
  const relative = `preparation-execution\\${role}-Test\\${attempt}`;
  const proof = read(`${relative}\\parsed-trx.json`);
  const trx = `${relative}\\results-net12.0\\focused-net12.0.trx`;
  require(hash(trx) === proof.actualTrxSha256 && hash(`${relative}\\parsed-trx.json`) === manifests.get(role).actualParsedTrxSha256,
    'Raw owning TRX and actual independently XML-parsed proof bytes differ.');
  const xml = text(trx);
  const results = [...xml.matchAll(/<UnitTestResult\b([^>]+)>/g)].map(match => attrs(match[1]));
  const entries = [...xml.matchAll(/<TestEntry\b([^>]+)\/>/g)].map(match => attrs(match[1]));
  const definitions = [...xml.matchAll(/<UnitTest\b([^>]+)>/g)].map(match => attrs(match[1]));
  const counters = attrs(/<Counters\b([^>]+)\/>/.exec(xml)?.[1] ?? '');
  require(results.length === 68 && proof.allRows.length === 68 && proof.total === 68 && proof.passed === 68 &&
    proof.failed === 0 && proof.skipped === 0 && Number(counters.total) === 68 && Number(counters.executed) === 68 &&
    Number(counters.passed) === 68 && new Set(results.map(row => row.executionId)).size === 68,
  'Actual nonempty owning suite discovery/counters/outcomes differ.');
  for (const row of proof.allRows) {
    const actual = results.filter(item => item.testId === row.testId && item.testName === row.testName);
    require(actual.length === 1 && actual[0].outcome === 'Passed' && row.outcome === 'Passed' &&
      entries.filter(item => item.testId === row.testId && item.executionId === actual[0].executionId).length === 1 &&
      definitions.filter(item => item.id === row.testId).length === 1, 'Raw test/definition/entry/proof identities differ.');
  }
  const preservation = results.filter(row => row.testName.includes(acceptance.requiredShippingPreservationTest.name));
  require(preservation.length === 18 && proof.preservationRows === 18 &&
    acceptance.requiredShippingPreservationTest.rows.every(label =>
      preservation.filter(row => row.testName.includes(`scenario: "${label}"`) && row.outcome === 'Passed').length === 1),
  'Each of the18 safe-labeled charset/BOM/replacement/event/cookie rows must actually pass on both owner images.');
  audit[role === 'original' ? 'originalOwningTestRows' : 'candidateOwningTestRows'] = results.length;
  audit.allNewPreservationTheoryExecutions += preservation.length;
}
for (const relative of [
  'preparation-execution\\original-BuildProduct\\attempt-001\\004-build-all-product-targets',
  'preparation-execution\\candidate-BuildProduct\\attempt-001\\004-build-all-product-targets',
  'preparation-execution\\original-BuildHarness\\attempt-002\\001-build-standalone-harness',
  'preparation-execution\\candidate-Format\\attempt-001\\001-verify-changed-whitespace',
  'preparation-execution\\candidate-Pack\\attempt-001\\001-evaluate-package-gate',
  'preparation-execution\\candidate-Pack\\attempt-001\\002-existing-enabled-package-validation',
]) {
  const command = read(relative + '.json');
  require(command.actualExitCode === 0 && command.outputSha256 === hash(relative + '.log'),
    'Actual clean preparation command/output binding differs:' + relative);
}
const properties = JSON.parse(text('preparation-execution\\candidate-Pack\\attempt-001\\001-evaluate-package-gate.log')).Properties;
const packLog = text('preparation-execution\\candidate-Pack\\attempt-001\\002-existing-enabled-package-validation.log');
require(properties.EnablePackageValidation === 'true' && properties.PackageValidationBaselineVersion === '' &&
  packLog.includes('RunPackageValidation:') && packLog.includes('APICompat ran successfully without finding any breaking changes.') &&
  /0 Warning\(s\)/.test(packLog) && /0 Error\(s\)/.test(packLog), 'Actual existing enabled APICompat gate must pass.');
const packed = read('package-payload-recheck.json');
require(packed.packedOwnerMatchesFrozenCandidate && packed.actualEnabledApiCompatPassed &&
  packed.actualPackedTarget === 'net12.0' && packed.actualPackedOwnerSha256 ===
    candidateManifest.files.find(entry => entry.path === 'image\\Microsoft.AspNetCore.Authentication.Google.dll')?.sha256 &&
  !packed.releasedBaselineVersionConfigured, 'Actual packed net12 owner must equal the frozen/tested candidate;no released-baseline claim.');
audit.actualEnabledPackageValidationPassed = true;
audit.actualPackedOwnerMatchesFrozenCandidate = true;
audit.releasedPackageBaselineComparisonClaimed = false;
require(audit.sourceSnapshotsChecked === 30 && audit.actualPePdbWitnessRecords === 6 + comparisons * 6 &&
  audit.selectedSourceDocumentChecks === 16 + comparisons * 16 && audit.actualProfileContracts === 96 + comparisons * 96 &&
  audit.actualProducerCancellationContracts === 24 && audit.actualWrapperPreflights === 48 &&
  audit.settingsRecords === 48 + comparisons * 144 && audit.executingOwnerRecords === 48 + comparisons * 48 &&
  audit.runtimeAssemblyWitnessChecks === 8 + comparisons * 8 && audit.allNewPreservationTheoryExecutions === 36,
'Complete actual native/source/test/settings accounting required.');
const counterSource = 'investigation\\bdn-memory-accounting\\GcStats.cs';
require(hash(counterSource) === '8784625B02B605F2ACB3581CCC43F258748C16012DB38AB9FCB2B2AFB4EA8BAB' &&
  text(counterSource).includes('GetTotalAllocatedBytesDelegate.Invoke(true)') &&
  text(counterSource).includes('MidpointRounding.ToEven'), 'The retained attributed BDN0.13 counter/rounding source differs.');
audit.performancePrJustified = analysis.numericPrimaryGatePassed;
audit.prespecifiedClearGainEarlyStopJustified = analysis.numericEarlyStopEligible;
audit.proposalDisposition = audit.performancePrJustified ? 'qualified-draft/allocation-and-synthetic-scaling/not-merge-ready' : 'no-gain-or-inconclusive';
audit.adverseObservedCases = analysis.rows.filter(row => row.rounds.some(round =>
  round.timeChangePercent > 0 || round.candidateBytes > round.originalBytes))
  .map(row => ({ shape: row.shape, aggregateTimeChangePercent: row.timeChangePercent,
    aggregateAllocationChangePercent: row.allocationChangePercent,
    perComparisonTimeChangesPercent: row.rounds.map(round => round.timeChangePercent),
    perComparisonByteChanges: row.rounds.map(round => round.candidateBytes - round.originalBytes) }));
audit.allTimingAndAllocationResultsRetained = true;
if (live) {
  require(!fs.existsSync(file('measurement-audit.json')), 'Never repeat a completed live audit.');
  for (const entry of packed.actualPackageCopies) {
    require(digest(fs.readFileSync(entry.copy)) === entry.sha256 && fs.statSync(entry.copy).size === entry.bytes,
      'Actual copied package bytes differ before omission.');
  }
  write('live-frozen-file-recheck.json', { actualLiveAuditPassed: true, actualFrozenFilesRehashed: liveFrozenFiles,
    actualRuntimeAssemblyFilesRehashed: liveRuntimeFiles, bothCompleteImageManifestsRehashed: true,
    actualCopiedPackageFilesRehashed: packed.actualPackageCopies.length, attributedCounterSourceSha256: hash(counterSource),
    sourceUrl: 'https://github.com/dotnet/BenchmarkDotNet/blob/v0.13.0/src/BenchmarkDotNet/Engines/GcStats.cs',
    actualBdnDllSha256: '4560EE1128636D3913C3FA71B8419DD2317FB97FD331231A53AD5501D5BA5437',
    notWholeCompilerOrCounterSourceToBinaryProvenance: true });
  if (!budget.closed) {
    require(comparisons === 1 && audit.prespecifiedClearGainEarlyStopJustified && audit.performancePrJustified,
      'No ad hoc early stopping or weakened performance/semantic/identity acceptance.');
    write('budget-before-audited-close.json', budget);
    budget.closed = true;
    budget.closedAt = new Date().toISOString();
    budget.closedReason = 'Predeclared clear-gain early stop:actual64KiB ASCII time improves>=50%,both primary ASCII allocations improve>=20% and both times improve;all raw/native/source/runtime/TRX/formatter/package gates passed. No second,third or diagnostic timing permitted.';
    budget.closedAfterAllSemanticAndIdentityGatesPassed = true;
    budget.unspentComparisonSlots = 3 - comparisons;
    fs.writeFileSync(file('measurement-budget.json'), JSON.stringify(budget, null, 2) + '\n');
  }
}
const liveRecord = read('live-frozen-file-recheck.json');
require(liveRecord.actualLiveAuditPassed && liveRecord.bothCompleteImageManifestsRehashed &&
  liveRecord.actualFrozenFilesRehashed === 290 && liveRecord.actualRuntimeAssemblyFilesRehashed === 8 + comparisons * 8 &&
  read('measurement-budget.json').closed, 'Actual live recheck and permanently closed authorized budget required.');
audit.actualLiveAuditPassed = true;
audit.actualFrozenFilesRehashedBeforeOmission = liveRecord.actualFrozenFilesRehashed;
if (verify) {
  require(equal(read('measurement-audit.json'), audit), 'Portable source/native/TRX/accounting audit differs.');
} else {
  write('measurement-audit.json', audit);
}
console.log(JSON.stringify({ auditPassed: true, mode: live ? 'live' : 'portable-verify', comparisons,
  frozenFilesRehashedNow: liveFrozenFiles, sourceSnapshotsChecked: audit.sourceSnapshotsChecked,
  actualPePdbWitnessRecords: audit.actualPePdbWitnessRecords, selectedSourceDocumentChecks: audit.selectedSourceDocumentChecks,
  actualProfileContracts: audit.actualProfileContracts, actualProducerCancellationContracts: audit.actualProducerCancellationContracts,
  actualWrapperPreflights: audit.actualWrapperPreflights, settingsRecords: audit.settingsRecords,
  originalOwningTestRows: audit.originalOwningTestRows, candidateOwningTestRows: audit.candidateOwningTestRows,
  preservationTheoryExecutions: audit.allNewPreservationTheoryExecutions,
  prespecifiedClearGainEarlyStopJustified: audit.prespecifiedClearGainEarlyStopJustified,
  disposition: audit.proposalDisposition }, null, 2));

function statesAt(relative) {
  return fs.readdirSync(file(relative)).filter(name => name.endsWith('.json')).sort().map(name => ({
    name, data: read(`${relative}\\${name}`),
  }));
}

function expectedContract(shape, cancellationMode) {
  require(shapes.includes(shape), 'Unknown actual profile shape.');
  const unicode = shape === 'Utf8Unicode16K';
  const padding = shape.includes('64K') ? 65536 : shape.includes('16K') ? 16384 : shape.endsWith('1K') ? 1024 : 0;
  const invalid = shape.startsWith('InvalidUtf8');
  const utf16 = shape.startsWith('Utf16');
  const latin1 = shape.startsWith('Latin1') || invalid;
  const identifier = shape === 'V2Identifier' ? 'id' : 'sub';
  let body = `{"${identifier}":"profile-id","name":"caf\u00E9 \\u03A9 \\ud83d\\ude00\\nname","given_name":"Test Given Name","family_name":"Test Family Name","email":"user@example.com","padding":"${(unicode ? '\u00E9' : 'x').repeat(padding)}"}`;
  if (shape === 'EmptyJsonControl' || shape === 'BomOnlyJsonControl') body = '';
  if (shape === 'TrailingJsonControl') body = '{} {}';
  if (shape === 'MalformedJsonControl') body = '{"name":';
  const bomCount = shape === 'DoubleBomJsonControl' ? 2 : ['Utf8Bom16K', 'Utf16BomNoCharset', 'BomOnlyJsonControl'].includes(shape) ? 1 : 0;
  const payloadBytes = Buffer.byteLength(body, utf16 ? 'utf16le' : latin1 ? 'latin1' : 'utf8') + bomCount * (utf16 ? 2 : 3);
  const canceled = cancellationMode === 'BeforeRequest' || cancellationMode === 'DuringBuffer';
  const failure = canceled ? 'OperationCanceledException' : shape === 'FailedHttpControl' ? 'HttpRequestException'
    : shape.endsWith('JsonControl') ? 'JsonException' : null;
  const name = invalid ? 'caf\uFFFD \u03A9 \u{1F600}\nname' : 'caf\u00E9 \u03A9 \u{1F600}\nname';
  return { payloadBytes, failure, name, success: failure === null,
    result: canceled ? -103 : failure === 'HttpRequestException' ? -102 : failure === 'JsonException' ? -101 : 5 ^ name.length };
}

function checkContract(row) {
  const expected = expectedContract(row.shape, row.cancellationMode);
  const noRequest = row.cancellationMode === 'BeforeRequest';
  const interrupted = noRequest || row.cancellationMode === 'DuringBuffer';
  require(row.allAssertionsPassed && row.payloadBytes === expected.payloadBytes && row.result === expected.result &&
    row.failure === expected.failure && row.success === expected.success && row.requestDelta === (noRequest ? 0 : 1) &&
    row.serializedBytes === (interrupted ? 0 : expected.payloadBytes) &&
    row.callerCancellationRequested === (row.cancellationMode !== null), 'Actual producer reachability/bytes/cancellation/result differs:' + row.shape);
  require(row.responseDisposed === !noRequest && row.requestMethod === (noRequest ? null : 'GET') &&
    row.authorization === (noRequest ? null : 'Bearer benchmark-token') &&
    row.endpoint === (noRequest ? null : 'https://www.googleapis.com/oauth2/v3/userinfo'),
  'Actual endpoint/method/Bearer/external cleanup differs:' + row.shape);
  require(row.creatingTicketCalls === (expected.success ? 1 : 0) && row.payloadDocumentDisposed === expected.success,
    'Actual awaited event/document lifetime differs:' + row.shape);
  for (const [field, value] of Object.entries({ name: expected.name, identifier: 'profile-id', givenName: 'Test Given Name',
    surname: 'Test Family Name', email: 'user@example.com' })) {
    require(row[field] === (expected.success ? value : null), 'Actual returned claim differs:' + row.shape + '/' + field);
  }
}

function checkNative(role, states, mode, phase) {
  const manifest = manifests.get(role);
  const runtime = states.filter(item => item.name.endsWith('-runtime.json'));
  require(runtime.length === 1, 'Exactly one actual native runtime record required.');
  const metadata = runtime[0].data;
  require(metadata.candidate === 'F018' && metadata.context === role && metadata.mode === mode && metadata.actualX64Process &&
    metadata.hostTargetFramework === '.NETCoreApp,Version=v12.0' && metadata.ownerTargetFramework === '.NETCoreApp,Version=v12.0' &&
    metadata.serverGc && metadata.ownerSha256 === manifest.files.find(item => item.path === 'image\\Microsoft.AspNetCore.Authentication.Google.dll')?.sha256 &&
    metadata.harnessSha256 === manifest.files.find(item => item.path === 'image\\AutoPerf.Benchmarks.dll')?.sha256,
  'Actual native owner/harness/runtime/GC identity differs.');
  const runtimeIdentity = metadata.runtimeAssemblies.map(({ path: ignored, ...item }) => item);
  runtimeReference ??= runtimeIdentity;
  settingsReference ??= metadata.initialSettings;
  require(equal(runtimeIdentity, runtimeReference) && equal(metadata.initialSettings, settingsReference) &&
    metadata.initialSettings.processPriority === 'Normal' && metadata.initialSettings.threadPriority === 'Normal',
  'Actual runtime assembly bytes and initial settings must agree in all roles/phases.');
  for (const assembly of metadata.runtimeAssemblies) {
    if (live) {
      require(digest(fs.readFileSync(assembly.path)) === assembly.sha256, 'Actual observed live runtime assembly bytes changed.');
      liveRuntimeFiles++;
    }
    audit.runtimeAssemblyWitnessChecks++;
  }
  const settings = states.filter(item => /-settings-(setup|before|after)\.json$/.test(item.name));
  require(settings.length === shapes.length * (mode === 'measure' ? 3 : 1) &&
    settings.every(item => equal(item.data, metadata.initialSettings)), 'Actual settings preservation inventory differs.');
  audit.settingsRecords += settings.length;
  const owners = states.filter(item => item.name.endsWith('-executing-owner.json'));
  require(owners.length === 24 && shapes.every(shape => owners.filter(item =>
    item.data.shape === shape && item.data.ownerSha256 === metadata.ownerSha256).length === 1),
  'Each actual case must execute the intended owner image.');
  audit.executingOwnerRecords += owners.length;
  for (const label of ['setup', 'cleanup']) {
    const rows = states.filter(item => item.name.endsWith('-contract.json') && item.data.phase === label);
    require(rows.length === 24 && shapes.every(shape => rows.filter(item => item.data.shape === shape).length === 1),
      'Actual producer/claim/lifetime phase must include every shape exactly once.');
    for (const item of rows) {
      require(item.data.cancellationMode === null, 'Timed-profile validation must not inject cancellation.');
      checkContract(item.data);
      audit.actualProfileContracts++;
    }
  }
  const witnesses = {
    'Microsoft.AspNetCore.Authentication.Google': ['GoogleHandler.cs', 'GoogleOptions.cs'],
    'Microsoft.AspNetCore.Authentication.OAuth': ['OAuthCreatingTicketContext.cs', 'OAuthTokenResponse.cs'],
    'AutoPerf.Benchmarks': ['Program.cs', 'GoogleFixture.cs', 'GoogleBenchmarks.cs', 'SettingsPreservingEmitToolchain.cs'],
  };
  for (const [assembly, sources] of Object.entries(witnesses)) {
    const matches = states.filter(item => item.name.endsWith(`-source-pdb-${assembly}.json`));
    require(matches.length === 1, 'Every selected actual assembly witness must exist exactly once.');
    const binding = matches[0].data;
    require(binding.actualPePdbBindingMatched && binding.codeViewGuid === binding.pdbGuid &&
      binding.assemblySha256 === manifest.files.find(item => item.path === `image\\${assembly}.dll`)?.sha256 &&
      binding.pdbSha256 === manifest.files.find(item => item.path === `image\\${assembly}.pdb`)?.sha256 &&
      binding.documents.length === sources.length, 'Actual selected PE/PDB/source witness differs.');
    for (const name of sources) {
      const documents = binding.documents.filter(item => path.win32.basename(item.source) === name);
      require(documents.length === 1, 'Every selected source document must exist exactly once.');
      const document = documents[0];
      const source = `contexts\\${role}\\sources\\${assembly === 'AutoPerf.Benchmarks' ? 'harness' : 'owner'}\\${name}`;
      const bytes = fs.readFileSync(file(source));
      const algorithm = document.algorithm === '8829d00f-11b8-4213-878b-770e8597ac16' ? 'sha256'
        : document.algorithm === 'ff1816ec-aa5e-4d10-87f7-6f4963833460' ? 'sha1' : null;
      require(algorithm && document.sha256 === digest(bytes) &&
        crypto.createHash(algorithm).update(bytes).digest('hex').toUpperCase() === document.checksum,
      'Actual retained source bytes and recorded PDB document checksum differ.');
      audit.selectedSourceDocumentChecks++;
    }
    audit.actualPePdbWitnessRecords++;
    audit.sourceBindings.push({ role, phase, assembly, assemblySha256: binding.assemblySha256,
      pdbSha256: binding.pdbSha256, selectedSourceDocuments: sources.length });
  }
  if (mode === 'measure') {
    const completed = states.find(item => item.name.endsWith('-completed.json'))?.data;
    require(completed?.allSuccessful && completed.context === role && completed.actualReports === 24 && completed.singleActualOwnerProfile,
      'Actual measured profile must complete all24 reports.');
  }
  audit.nativeContextChecks.push({ role, phase, mode, profileContracts: 48, settingsRecords: settings.length,
    sourceWitnessRecords: 3, selectedSourceDocuments: 8, executingOwnerRecords: owners.length });
}
