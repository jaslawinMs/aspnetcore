import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { finished } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = 'C:\\src\\aspnetcore';
const variant = process.argv[2];
assert.ok(['original', 'candidate'].includes(variant));
assert.equal(path.resolve(process.env.DOTNET_ROOT ?? '').toLowerCase(), path.join(root, '.dotnet').toLowerCase(),
  'Activate the repository-local environment before running the sample controller.');
const directory = path.join(session, 'autoperf-runs', 'F047', 'sample-' + variant);
assert.equal(fs.existsSync(directory), false, 'Never replace a failed or successful browser run.');
fs.mkdirSync(directory);
const owner = path.join(root, 'artifacts', 'bin', 'Microsoft.AspNetCore.Components.Endpoints', 'Release', 'net12.0',
  'Microsoft.AspNetCore.Components.Endpoints.dll');
const sample = path.join(root, 'artifacts', 'bin', 'BlazorWebAppPerPage', 'Release', 'net12.0', 'BlazorWebAppPerPage.dll');
const expectedOwnerSha256 = crypto.createHash('sha256').update(fs.readFileSync(owner)).digest('hex').toUpperCase();
assert.ok(fs.existsSync(sample));
const executable = path.join(root, '.dotnet', 'dotnet.exe');
const args = [sample, '--urls', 'http://127.0.0.1:0'];
const cwd = path.join(root, 'src', 'Components', 'Samples', 'BlazorWebAppPerPage');
const environmentOverrides = {
  ASPNETCORE_ENVIRONMENT: 'Development',
  'Logging__LogLevel__Microsoft.Hosting.Lifetime': 'Information',
  DOTNET_CLI_TELEMETRY_OPTOUT: '1',
  DOTNET_NOLOGO: '1'
};
const stdout = fs.createWriteStream(path.join(directory, 'server.stdout.txt'), { flags: 'wx' });
const stderr = fs.createWriteStream(path.join(directory, 'server.stderr.txt'), { flags: 'wx' });
const child = spawn(executable, args, { cwd, windowsHide: true, env: { ...process.env, ...environmentOverrides } });
let launchError;
child.on('error', error => { launchError = error; });
child.stdout.pipe(stdout);
child.stderr.pipe(stderr);
let serverOutput = '';
child.stdout.on('data', bytes => { serverOutput += bytes.toString(); });
const closed = new Promise(resolve => child.once('close', (exitCode, signal) => resolve({ exitCode, signal })));
const result = {
  candidate: 'F047', variant, executable, arguments: args, workingDirectory: cwd,
  actualActivatedDotnetRoot: process.env.DOTNET_ROOT, environmentOverrides,
  actualServerPid: child.pid, actualServerPidCapturedBeforeWait: Number.isInteger(child.pid),
  actualStarted: new Date().toISOString(), expectedOwnerSha256,
  actualWindowTitlesOrExistingBrowserProfilesRead: false,
  actualBrowserInputsAreRealClicksNotInjectedCallbacks: true,
  actualExcluded: ['Cached/uncached Auto runtime selection', 'Enhanced navigation/streaming overlap', 'Application throughput']
};
fs.writeFileSync(path.join(directory, 'launch.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
let browser;
let failure;
let stopFailure;
const cases = [];
try {
  const deadline = Date.now() + 60_000;
  let baseUrl;
  while (Date.now() < deadline) {
    if (launchError) {
      throw launchError;
    }
    assert.equal(child.exitCode, null, 'The sample must still be running.');
    const match = /Now listening on:\s*(http:\/\/127\.0\.0\.1:\d+)/.exec(serverOutput);
    if (match) {
      baseUrl = match[1];
      break;
    }
    await delay(200);
  }
  assert.ok(baseUrl, 'Require the actual announced ephemeral listener.');
  const readiness = await fetch(baseUrl + '/autoperf-f047-parameters?mode=server&prerender=true');
  assert.equal(readiness.status, 200);
  result.actualUrl = baseUrl;
  result.actualReadyHttpStatus = readiness.status;
  result.actualOwnedServerRunningAndResponsiveBeforeBrowser = true;
  const { chromium } = createRequire(import.meta.url)(path.join(session, 'autoperf-playwright-tools', 'node_modules', 'playwright'));
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  result.actualBrowserChannel = 'msedge';
  result.actualBrowserVersion = browser.version();
  for (const mode of ['server', 'wasm', 'auto']) {
    for (const prerender of [true, false]) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const messages = [];
      const errors = [];
      const responses = [];
      const requestFailures = [];
      const sockets = [];
      page.on('console', message => messages.push({ type: message.type(), text: message.text() }));
      page.on('pageerror', error => errors.push({ name: error.name, message: error.message }));
      page.on('response', response => responses.push({ url: response.url(), status: response.status() }));
      page.on('requestfailed', request => requestFailures.push({ url: request.url(), failure: request.failure() }));
      page.on('websocket', socket => sockets.push(socket.url()));
      const observation = { mode, prerender, messages, errors, responses, requestFailures, sockets };
      cases.push(observation);
      try {
        const response = await page.goto(`${baseUrl}/autoperf-f047-parameters?mode=${mode}&prerender=${prerender}`,
          { waitUntil: 'domcontentloaded', timeout: 60_000 });
        assert.ok(response);
        assert.equal(response.status(), 200);
        const html = await response.text();
        fs.writeFileSync(path.join(directory, `${mode}-${prerender}.response.html`), html, { flag: 'wx' });
        observation.actualInitialResponseContainsChild = html.includes('id="f047-label"');
        assert.equal(observation.actualInitialResponseContainsChild, prerender);
        if (prerender) {
          assert.ok(html.includes('First from SSR') && html.includes('Second from SSR'));
        }
        await page.locator('#f047-interactive').filter({ hasText: /^True$/ }).waitFor({ timeout: 90_000 });
        assert.equal(await page.locator('#f047-owner').textContent(), expectedOwnerSha256);
        assert.equal(await page.locator('#f047-label').textContent(), 'Scalar label');
        assert.equal(await page.locator('#f047-number').textContent(), '47');
        assert.equal(await page.locator('#f047-null').textContent(), 'True');
        assert.equal(await page.locator('#f047-first-slot').textContent(), prerender ? 'First from SSR' : '');
        assert.equal(await page.locator('#f047-second-slot').textContent(), prerender ? 'Second from SSR' : '');
        observation.actualRenderer = await page.locator('#f047-renderer').textContent();
        if (mode === 'server') {
          assert.equal(observation.actualRenderer, 'Server');
        } else if (mode === 'wasm') {
          assert.equal(observation.actualRenderer, 'WebAssembly');
        } else {
          assert.ok(['Server', 'WebAssembly'].includes(observation.actualRenderer));
        }
        assert.equal(await page.locator('#f047-count').textContent(), '0');
        await page.locator('#f047-increment').click();
        await page.waitForFunction(() => document.querySelector('#f047-count')?.textContent === '1', null, { timeout: 30_000 });
        assert.equal(await page.locator('#f047-first-slot').textContent(), prerender ? 'First from SSR' : '');
        assert.equal(await page.locator('#f047-second-slot').textContent(), prerender ? 'Second from SSR' : '');
        assert.ok(responses.some(item => item.url.includes('blazor.web') && item.status === 200));
        if (observation.actualRenderer === 'Server') {
          assert.ok(sockets.some(url => url.includes('/_blazor')));
        }
        assert.deepEqual(errors, []);
        assert.deepEqual(messages.filter(item => item.type === 'error'), []);
        assert.deepEqual(responses.filter(item => item.url.startsWith(baseUrl) && item.status >= 400), []);
        assert.deepEqual(requestFailures.filter(item => item.url.startsWith(baseUrl)), []);
        observation.actualOwnerSha256 = expectedOwnerSha256;
        observation.actualRealClickCount = 1;
        observation.actualPassed = true;
      } finally {
        await context.close();
      }
    }
  }
  result.actualPassed = true;
} catch (error) {
  failure = error;
  result.actualPassed = false;
  result.error = { name: error.name, message: error.message, stack: error.stack };
} finally {
  if (browser) {
    await browser.close();
  }
  const script = [
    "$ErrorActionPreference = 'Stop'",
    '$processes = @(Get-CimInstance Win32_Process)',
    `$queue = [Collections.Generic.Queue[int]]::new(); $queue.Enqueue(${child.pid})`,
    '$owned = [Collections.Generic.List[object]]::new(); $seen = [Collections.Generic.HashSet[int]]::new()',
    'while ($queue.Count -gt 0) { $idValue = $queue.Dequeue(); if (-not $seen.Add($idValue)) { continue }; $entry = @($processes | Where-Object { $_.ProcessId -eq $idValue }); if ($entry.Count -eq 1) { $owned.Add(($entry[0] | Select-Object ProcessId,ParentProcessId,Name,CreationDate)); foreach ($next in @($processes | Where-Object { $_.ParentProcessId -eq $idValue })) { $queue.Enqueue([int]$next.ProcessId) } } }',
    '$captured = @($owned.ToArray())',
    'foreach ($entry in @($captured | Sort-Object ProcessId -Descending)) { $current = @(Get-CimInstance Win32_Process -Filter "ProcessId=$($entry.ProcessId)"); if ($current.Count -eq 1 -and $current[0].CreationDate -eq $entry.CreationDate) { Stop-Process -Id ([int]$entry.ProcessId) -Force -ErrorAction Stop } }',
    '$deadline = [DateTime]::UtcNow.AddSeconds(10)',
    'do { $remaining = @($captured | Where-Object { $entry = $_; @(Get-CimInstance Win32_Process -Filter "ProcessId=$($entry.ProcessId)" | Where-Object { $_.CreationDate -eq $entry.CreationDate }).Count -ne 0 }); if ($remaining.Count -gt 0) { Start-Sleep -Milliseconds 100 } } while ($remaining.Count -gt 0 -and [DateTime]::UtcNow -lt $deadline)',
    'if ($remaining.Count -ne 0) { throw "Owned sample processes remain." }',
    '[ordered]@{ actualCapturedOwnedProcesses=$captured; actualAllCapturedOwnedHelpersGone=$true; actualNoNameBasedTermination=$true } | ConvertTo-Json -Depth 7'
  ].join('\n');
  const stop = spawnSync('pwsh', ['-NoProfile', '-NonInteractive', '-Command', script],
    { windowsHide: true, encoding: 'utf8' });
  fs.writeFileSync(path.join(directory, 'stop-owned.ps1'), script + '\n', { flag: 'wx' });
  fs.writeFileSync(path.join(directory, 'stop-owned.stdout.txt'), stop.stdout ?? '', { flag: 'wx' });
  fs.writeFileSync(path.join(directory, 'stop-owned.stderr.txt'), stop.stderr ?? '', { flag: 'wx' });
  if (stop.status !== 0) {
    stopFailure = new Error('Owned sample cleanup failed: ' + stop.stderr);
    result.actualPassed = false;
    result.actualCleanupFailure = stopFailure.message;
  } else {
    result.actualCleanup = JSON.parse(stop.stdout);
  }
  if (!stopFailure) {
    result.actualServerExit = await closed;
    await Promise.all([finished(stdout), finished(stderr)]);
  }
  result.actualCases = cases;
  result.actualCompleted = new Date().toISOString();
  fs.writeFileSync(path.join(directory, 'browser-result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
}
if (failure || stopFailure) {
  throw failure ?? stopFailure;
}
console.log(JSON.stringify({ candidate: 'F047', variant, actualPassed: true, actualPageCases: cases.length,
  actualRealClicks: cases.length, actualOwnerSha256: expectedOwnerSha256, actualOwnedHelpersGone: true }, null, 2));
