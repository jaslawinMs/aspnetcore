import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const [stage, ageArgument, attempt = '001'] = process.argv.slice(2);
assert.match(attempt, /^\d{3}$/);
const directory = path.join(session, 'autoperf-runs', 'F126', 'hot-reload', `actual-sample-${attempt}`);
assert.match(stage ?? '', /^[a-z0-9-]+$/);
const expectedAge = Number(ageArgument);
assert.ok(expectedAge === 10 || expectedAge === 11);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const configuration = read(path.join(directory, 'configuration.json'));
const started = read(path.join(directory, 'watch-started.json'));
const target = path.join(directory, `${stage}.json`);
assert.equal(fs.existsSync(target), false);
const ownershipScript = `
$ErrorActionPreference = 'Stop'
$listeners = @(Get-NetTCPConnection -LocalPort ${configuration.actualPort} -State Listen)
$ids = @($listeners.OwningProcess | Sort-Object -Unique)
if ($ids.Count -ne 1) { throw 'Require one actual listener process.' }
$appId = [int]$ids[0]
$currentId = $appId
$chain = @()
while ($currentId -ne ${started.actualWatchProcessId}) {
    $item = Get-CimInstance Win32_Process -Filter "ProcessId = $currentId"
    if ($null -eq $item -or $chain.Count -ge 10) { throw 'Listener is not in the owned watch tree.' }
    $chain += [ordered]@{ id = [int]$item.ProcessId; parentId = [int]$item.ParentProcessId; executable = $item.ExecutablePath; commandLine = $item.CommandLine }
    $currentId = [int]$item.ParentProcessId
}
[ordered]@{ actualAppProcessId = $appId; actualWatchProcessId = ${started.actualWatchProcessId}; actualOwnedParentChain = $chain } | ConvertTo-Json -Depth 8 -Compress
`;
const ownership = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', ownershipScript],
  { encoding: 'utf8', windowsHide: true });
assert.ifError(ownership.error);
assert.equal(ownership.status, 0, ownership.stderr);
const processEvidence = JSON.parse(ownership.stdout);
const actualControllerSha256 = crypto.createHash('sha256').update(fs.readFileSync(configuration.actualController)).digest('hex').toUpperCase();
assert.equal(actualControllerSha256, expectedAge === 11 ? configuration.actualAfterExpectedSha256 : configuration.actualBeforeSha256);
const stdoutPath = path.join(directory, 'watch.stdout.txt');
const initialLength = fs.readFileSync(stdoutPath, 'utf8').length;
const responses = [];
for (let index = 0; index < 2; index++) {
  const response = await fetch(`${configuration.actualLoopbackOnlyUrl}/Home/MinimumAge10`,
    { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  const location = response.headers.get('location');
  await response.arrayBuffer();
  assert.equal(response.status, 302);
  assert.equal(location, `${configuration.actualLoopbackOnlyUrl}/account/signin?ReturnUrl=%2FHome%2FMinimumAge10`);
  responses.push({ actualStatus: response.status, actualLocation: location });
}
let log;
let appended;
let matches;
const logDeadline = Date.now() + 10000;
do {
  log = fs.readFileSync(stdoutPath, 'utf8');
  appended = log.slice(initialLength);
  matches = [...appended.matchAll(/Evaluating authorization requirement for age >= (\d+)/g)].map(match => Number(match[1]));
  if (matches.length >= 2) break;
  await setTimeout(50);
} while (Date.now() < logDeadline);
assert.deepEqual(matches, [expectedAge, expectedAge], 'Both real requests must reach the actual sample handler with the live metadata age.');
const evidence = { candidate: 'F126', actualStage: stage, actualExpectedAge: expectedAge,
  actualControllerSha256, ...processEvidence, actualResponses: responses,
  actualHandlerAgesObservedAfterRequests: matches, actualNewStdout: appended,
  actualListeningStartupMarkersSoFar: [...log.matchAll(/Now listening on:/g)].length,
  actualObservedAt: new Date().toISOString(), actualManualCacheOrCallbackInjection: false };
fs.writeFileSync(target, JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ stage, actualAppProcessId: processEvidence.actualAppProcessId,
  actualHandlerAges: matches, actualTwoReal302s: true, actualListeningMarkers: evidence.actualListeningStartupMarkersSoFar }, null, 2));
