import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F126');
const directory = path.join(run, 'hot-reload', 'actual-sample-003');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const configuration = read(path.join(directory, 'configuration.json'));
const before = read(path.join(directory, 'baseline-warmed.json'));
const after = read(path.join(directory, 'after-controller-attribute-edit.json'));
const restored = read(path.join(directory, 'after-exact-controller-restore.json'));
const stopped = read(path.join(directory, 'watch-stopped.json'));
assert.equal(before.actualAppProcessId, after.actualAppProcessId);
assert.equal(after.actualAppProcessId, restored.actualAppProcessId);
assert.equal(before.actualWatchProcessId, after.actualWatchProcessId);
assert.equal(after.actualWatchProcessId, restored.actualWatchProcessId);
for (const stage of [before, after, restored]) {
  assert.equal(stage.actualListeningStartupMarkersSoFar, 1);
  assert.equal(stage.actualResponses.length, 2);
  assert.ok(stage.actualResponses.every(response => response.actualStatus === 302));
  assert.equal(stage.actualManualCacheOrCallbackInjection, false);
}
assert.deepEqual(before.actualHandlerAgesObservedAfterRequests, [10, 10]);
assert.deepEqual(after.actualHandlerAgesObservedAfterRequests, [11, 11]);
assert.deepEqual(restored.actualHandlerAgesObservedAfterRequests, [10, 10]);
const stdout = fs.readFileSync(path.join(directory, 'watch.stdout.txt'), 'utf8');
const stderr = fs.readFileSync(path.join(directory, 'watch.stderr.txt'), 'utf8');
assert.equal([...stdout.matchAll(/Now listening on:/g)].length, 1);
assert.equal([...stderr.matchAll(/\] Updates applied\./g)].length, 2);
assert.equal([...stderr.matchAll(/C# and Razor changes applied in/g)].length, 2);
assert.equal([...stderr.matchAll(/Microsoft\.AspNetCore\.Mvc\.HotReload\.HotReloadService\.UpdateApplication/g)].length, 2);
assert.ok(stderr.includes('ChangeCustomAttributes'));
assert.equal(/rude edit|restart required|Restarting (?:the )?application|Restart requested/i.test(stderr), false);
assert.equal(stopped.actualReason, 'requested-owned-cleanup');
assert.deepEqual(stopped.actualRemainingOwnedProcessIds, []);
assert.equal(stopped.actualControllerAfterSha256, configuration.actualBeforeSha256);
assert.equal(sha(configuration.actualController), configuration.actualBeforeSha256);
assert.deepEqual(fs.readFileSync(configuration.actualController), fs.readFileSync(path.join(directory, 'controller-before.cs')));
assert.equal(stopped.actualProtectedGlobalJsonBefore, stopped.actualProtectedGlobalJsonAfter);
const supplemental = [];
for (const relative of ['src/Http/Routing/src/DataSourceDependentCache.cs', 'src/Mvc/Mvc/src/HotReloadService.cs']) {
  const target = path.join(directory, 'lifetime-source-inputs', ...relative.split('/'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join('C:\\src\\aspnetcore', ...relative.split('/')), target, fs.constants.COPYFILE_EXCL);
  const gitBlobs = {};
  for (const [role, commit] of [['Original', '37e809ead5824bc753a1c3d56f11615bdb1296c5'],
    ['Default', '744c772d93b79d4d52ff11c05818c4e8de55db6b']]) {
    const result = spawnSync('git', ['--no-pager', 'rev-parse', `${commit}:${relative}`],
      { cwd: 'C:\\src\\aspnetcore', encoding: 'utf8', windowsHide: true });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    gitBlobs[role] = result.stdout.trim();
  }
  supplemental.push({ path: relative, actualPhysicalSha256: sha(target), actualGitBlobs: gitBlobs,
    actualPhysicalSourceFromCandidateBaselineCheckout: true, actualCompleteFrameworkCompilerProvenanceClaimed: false });
}
const result = {
  candidate: 'F126', actualVerifiedAt: new Date().toISOString(), actualAttempt: '003',
  actualRealSupportedControllerAttributeDelta: true, actualSameAppProcessId: before.actualAppProcessId,
  actualSameWatchProcessId: before.actualWatchProcessId, actualListeningStartupMarkers: 1,
  actualInPlaceUpdateBatches: 2, actualMvcUpdateApplicationCallbacks: 2,
  actualSixRealHttp302Responses: true, actualHandlerAges: [10, 10, 11, 11, 10, 10],
  actualNoRestart: true, actualSourceRestoredByteExactly: true, actualOwnedCleanupVerifiedAtStop: true,
  actualPreservedEarlierPrerequisites: [
    { attempt: '001', boundaryNotReached: 'SDK rejects --project together with short -p property arguments; no app or controller edit.' },
    { attempt: '002', boundaryNotReached: 'Properties after the child delimiter do not bind the initial watch build; existing ANCM native prerequisite fails before app startup. No controller edit; requested owned cleanup completed.' }
  ],
  actualSuccessfulCorrection: 'Use proven long-form --property:Name=value options before the child delimiter; initial build, watch graph and run use the existing managed-only properties. No repository build config, machine settings, source producer or handler changes.',
  actualReadinessReaderCorrection: 'Use shared-read Get-Content while Start-Process holds redirected files, rather than File.ReadAllText.',
  actualWatchStdoutSha256: sha(path.join(directory, 'watch.stdout.txt')),
  actualWatchStderrSha256: sha(path.join(directory, 'watch.stderr.txt')),
  actualSupplementalLifetimeSourceInputs: supplemental, actualAnyTimingRun: false
};
fs.writeFileSync(path.join(run, 'hot-reload-verified.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
