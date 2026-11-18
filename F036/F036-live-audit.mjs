import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F036');
const root = String.raw`C:\src\aspnetcore`;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
assert.equal(fs.existsSync(path.join(run, 'actual-profile.lock')), false);
const originalBudget = read(path.join(run, 'measurement-budget.json'));
const budget = read(path.join(run, 'source-comparison-budget.json'));
assert.equal(originalBudget.originalOnlyBudgetClosed, true);
assert.equal(originalBudget.actualSourceComparisonsStarted, 0);
assert.equal(budget.sourceComparisonBudgetClosed, true);
assert.equal(budget.actualSourceComparisonsConcluded, 3);
assert.equal(budget.actualSourceComparisonsCompleted, 3);
assert.equal(budget.nativeProfilesStarted.length, 6);
assert.equal(budget.nativeProfilesCompleted.length, 6);
assert.equal(git(['rev-parse', 'HEAD']), '37e809ead5824bc753a1c3d56f11615bdb1296c5');
assert.equal(git(['branch', '--show-current']), 'autoperf/F036-viewdata-enumeration');
assert.equal(git(['diff', '--name-only']), '');
assert.equal(git(['diff', '--cached', '--name-only']), '');
const actualStatus = git(['status', '--porcelain=v1']);
const investigation = read(path.join(run, 'investigation.json'));
const sourceChecks = investigation.parity.filter(row => row.core).map(row => {
  const file = path.join(root, ...row.file.split('/'));
  const actual = sha(file);
  assert.equal(actual, row.actualWorkingBytesSha256);
  return { path: file, sha256: actual, actualMatchesInvestigatedOriginal: true };
});
assert.equal(sourceChecks.length, 12);
const drift = read(path.join(run, 'constructor-dependency-review', 'verified-dependency-drift.json'));
assert.equal(sha(path.join(root, ...drift.file.split('/'))), drift.actualWorkingBytesSha256);
const images = {};
const bindings = new Map();
let closureFiles = 0;
const addBinding = (file, expected) => {
  if (bindings.has(file)) {
    assert.equal(bindings.get(file), expected);
  } else {
    assert.equal(sha(file), expected);
    bindings.set(file, expected);
  }
};
for (const label of ['preparation-original-001', 'preparation-reproduction-original',
  'comparison-preparation-original', 'comparison-preparation-candidate']) {
  const prepared = path.join(run, label, 'prepared');
  const capsule = read(path.join(prepared, 'capsule.json'));
  const closure = read(path.join(prepared, 'closure.json'));
  assert.equal(closure.files.length, 289);
  const actualFiles = fs.readdirSync(capsule.output, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile()).map(entry => path.relative(capsule.output, path.join(entry.parentPath, entry.name))).sort();
  assert.deepEqual(actualFiles, closure.files.map(file => file.path).sort());
  for (const file of closure.files) {
    addBinding(path.join(capsule.output, file.path), file.sha256);
    closureFiles++;
  }
  for (const file of capsule.sourceFiles) {
    addBinding(path.join(prepared, file.path), file.sha256);
  }
  images[label] = { capsule, closure, actualClosureSha256: sha(path.join(prepared, 'closure.json')) };
}
const known = [];
let runtimeRecords = 0;
let loadedBindings = 0;
const expectedLabels = ['characterize-original-001', 'diagnostic-original-001',
  'characterize-reproduction-original', 'characterize-comparison-original', 'characterize-comparison-candidate',
  ...budget.nativeProfilesCompleted.map(row => row.label)].sort();
assert.deepEqual(fs.readdirSync(path.join(run, 'profiles')).sort(), expectedLabels);
for (const label of expectedLabels) {
  const directory = path.join(run, 'profiles', label);
  const invocation = read(path.join(directory, 'invocation.json'));
  const image = images[invocation.preparation];
  assert.ok(image);
  const states = fs.readdirSync(path.join(directory, 'states')).map(file => read(path.join(directory, 'states', file)));
  const runtimes = states.filter(row => row.runtimeAssemblies !== undefined);
  assert.equal(invocation.actualExitCode, 0);
  assert.equal(runtimes.length, 2);
  assert.equal(runtimes[0].processId, runtimes[1].processId);
  const started = read(path.join(directory, 'native-process-started.json'));
  assert.equal(started.actualNativeProcessId, runtimes[0].processId);
  assert.equal(started.actualProcessStartObservedBeforeWait, true);
  assert.equal(invocation.actualNativeProcessId, runtimes[0].processId);
  for (const runtime of runtimes) {
    assert.equal(runtime.runtime, '12.0.0');
    assert.equal(runtime.serverGc, true);
    assert.equal(runtime.actualX64Process, true);
    assert.equal(runtime.sharedMachineNotIsolated, true);
    assert.equal(runtime.actualClosureSha256, image.actualClosureSha256);
    assert.equal(runtime.initialSettings.processPriority, 'Normal');
    assert.equal(runtime.initialSettings.threadPriority, 'Normal');
    const owner = runtime.runtimeAssemblies.filter(row => row.name === 'Microsoft.AspNetCore.Mvc.ViewFeatures');
    assert.equal(owner.length, 1);
    assert.equal(owner[0].path, path.join(image.capsule.output, 'Microsoft.AspNetCore.Mvc.ViewFeatures.dll'));
    for (const assembly of runtime.runtimeAssemblies) {
      addBinding(assembly.path, assembly.sha256);
      loadedBindings++;
    }
    const corelib = runtime.runtimeAssemblies.find(row => row.name === 'System.Private.CoreLib');
    assert.equal(corelib.sha256, '0CEBA028A838AFF170CFF9D03570B34F9F044D6A9597974088E58B9834DF74E4');
    assert.ok(corelib.informationalVersion.startsWith('12.0.0-alpha.1.26562.105'));
    runtimeRecords++;
  }
  known.push({ label, processId: runtimes[0].processId, actualNativeStartTime: started.actualNativeProcessStartTimeUtc,
    actualNativeCompleted: invocation.completed, actualNativeExitCode: 0 });
}
assert.equal(known.length, 11);
const filter = [...new Set(known.map(row => row.processId))].map(id => `ProcessId=${id}`).join(' OR ');
const probeScript = `$ErrorActionPreference = 'Stop'; $observed=@(Get-CimInstance Win32_Process -Filter '${filter}' | ForEach-Object { [ordered]@{ processId=[int]$_.ProcessId; actualCreationUtc=$_.CreationDate.ToUniversalTime().ToString('o') } }); ConvertTo-Json -InputObject $observed -Depth 5`;
const processProbe = execFileSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', probeScript], { encoding: 'utf8' });
const present = JSON.parse(processProbe.replace(/^\uFEFF/, ''));
for (const process of known) {
  const current = present.find(row => row.processId === process.processId);
  process.actualRecordedPidAbsent = !current;
  process.actualPidReusedAfterNativeCompletion = current
    ? Date.parse(current.actualCreationUtc) > Date.parse(process.actualNativeCompleted) : false;
  assert.ok(process.actualRecordedPidAbsent || process.actualPidReusedAfterNativeCompletion);
}
const originalTests = read(path.join(run, 'validation', 'original-existing-1', 'verified-result.json'));
const restoredTests = read(path.join(run, 'validation', 'original-existing-2', 'verified-result.json'));
assert.equal(restoredTests.actualPassed, 19);
assert.equal(restoredTests.actualSkipped, 0);
assert.equal(restoredTests.actualFailures, 0);
for (const owner of originalTests.actualTestBinOwners) {
  const restored = restoredTests.actualTestBinOwners.filter(row => row.assembly === owner.assembly);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].actualOwnerSha256, owner.actualOwnerSha256);
  assert.equal(restored[0].actualOwnerPdbSha256, owner.actualOwnerPdbSha256);
  for (const extension of ['dll', 'pdb']) {
    const expected = extension === 'dll' ? owner.actualOwnerSha256 : owner.actualOwnerPdbSha256;
    addBinding(owner.actualProductPath.replace(/\.dll$/, '.' + extension), expected);
    addBinding(path.join(root, 'artifacts', 'bin', 'Microsoft.AspNetCore.Mvc.ViewFeatures.Test',
      'Release', 'net12.0', `${owner.assembly}.${extension}`), expected);
  }
}
const result = {
  candidate: 'F036', actualReadOnlyLiveFileAndProcessAuditPassed: true,
  actualFrozenImages: Object.keys(images), actualFrozenConsumerFileChecks: closureFiles,
  actualRuntimeRecords: runtimeRecords, actualLoadedAssemblyBindingObservations: loadedBindings,
  actualUniqueRehashedFiles: bindings.size,
  actualEveryRehashedFile: [...bindings].map(([file, sha256]) => ({ file, sha256 })),
  actualKnownSuccessfulNativeProcesses: known, actualReadOnlyCimFilter: filter, actualPresentProcessProbe: present,
  actualAllElevenNativeRuntimePidsCapturedBeforeWait: true,
  actualOriginalShippingSourceRestored: true, actualOriginalProductAndTestBinOwnerRestored: true,
  actualRestorationIncludesFreshNineteenRowTestExecution: true,
  actualTrackedSourceDiff: '', actualStagedSourceDiff: '', actualUntrackedStatusRetained: actualStatus,
  actualSelectedOriginalSourceChecks: sourceChecks, actualHistoricalTimingChanged: false,
  limitations: [
    'Read-only live rehash/CIM audit at this time,not an isolated machine or process/thread/OS configuration change.',
    'Eleven actual recorded native runtime PIDs checked,not all SDK/compiler or unrelated processes.',
    'Native PE/PDB/source witnesses are selected associations,not full compiler provenance or proof every method executed.',
    'Original-only phase and later same-signature comparison phase are separately frozen;no diagnostic is reused as a paired member.',
  ],
};
fs.writeFileSync(path.join(run, 'live-file-audit.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({
  actualFrozenConsumerFileChecks: closureFiles, actualRuntimeRecords: runtimeRecords,
  actualLoadedAssemblyBindingObservations: loadedBindings, actualUniqueRehashedFiles: bindings.size,
  actualKnownNativeProcesses: known.length, actualOriginalSourceAndProductRestored: true,
}, null, 2));
