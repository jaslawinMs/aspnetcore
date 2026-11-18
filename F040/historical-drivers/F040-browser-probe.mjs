import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const variant = process.argv[2];
assert.ok(['original', 'candidate'].includes(variant));
const directory = path.join(session, 'autoperf-runs', 'F040', `sample-${variant}`);
const resultFile = path.join(directory, 'browser-result.json');
assert.equal(fs.existsSync(resultFile), false);
const listener = JSON.parse(fs.readFileSync(path.join(directory, 'startup-listener.json'), 'utf8'));
assert.equal(listener.variant, variant);
assert.equal(listener.actualHttpStatus, 200);
assert.ok(listener.actualOwnedProcessTree.some(process => process.ProcessId === listener.actualListenerOwnerId));
assert.match(listener.actualUrl, /^http:\/\/127\.0\.0\.1:\d+$/);
const baseUrl = listener.actualUrl;
const { chromium } = createRequire(import.meta.url)(path.join(session, 'autoperf-playwright-tools', 'node_modules', 'playwright'));
const owner = String.raw`C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.Components.Endpoints\Release\net12.0\Microsoft.AspNetCore.Components.Endpoints.dll`;
const sha = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const expectedOwnerSha256 = sha(fs.readFileSync(owner));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const consoleMessages = [], pageErrors = [], responses = [], failures = [], sockets = [], steps = [];
page.on('console', message => consoleMessages.push({ type: message.type(), text: message.text() }));
page.on('pageerror', error => pageErrors.push({ name: error.name, message: error.message, stack: error.stack }));
page.on('response', response => responses.push({ url: response.url(), status: response.status(),
  resourceType: response.request().resourceType() }));
page.on('requestfailed', request => failures.push({ url: request.url(), failure: request.failure() }));
page.on('websocket', socket => sockets.push(socket.url()));
const result = { candidate: 'F040', variant, baseUrl, expectedOwnerSha256,
  actualBrowserChannel: 'msedge', actualBrowserVersion: browser.version(),
  actualRenderMode: 'Static SSR; actual document navigations, no interactivity claim',
  actualIsolatedBrowserContextNotIsolatedMachine: true,
  actualRealClicksAndCookieProducerNotInjectedCallbacks: true };

async function clickAndObserve(name, link, mode, expected) {
  const url = `${baseUrl}/autoperf-f040-tempdata?mode=${mode}`;
  await Promise.all([page.waitForURL(url, { waitUntil: 'networkidle' }), page.locator(`#f040-${link}`).click()]);
  await page.waitForFunction(mode => document.querySelector('#f040-mode')?.textContent === mode, mode);
  const state = await page.evaluate(() => ({
    mode: document.querySelector('#f040-mode').textContent,
    message: document.querySelector('#f040-message').textContent,
    removed: document.querySelector('#f040-removed').textContent,
    repeat: document.querySelector('#f040-repeat').textContent,
    nullPresent: document.querySelector('#f040-null-present').textContent,
    sibling: document.querySelector('#f040-sibling').textContent,
    count: document.querySelector('#f040-count').textContent,
    ownerSha256: document.querySelector('#f040-owner').textContent,
  }));
  assert.equal(state.ownerSha256, expectedOwnerSha256, 'The actual routed component must load the rebuilt source owner.');
  for (const [key, value] of Object.entries(expected)) assert.equal(state[key], value, `${name}: ${key}`);
  assert.equal(state.sibling, 'neighbor', `${name}: unrelated retained sibling must survive`);
  const cookies = (await context.cookies(baseUrl)).filter(cookie => cookie.name.startsWith('.AspNetCore.Components.TempData'));
  assert.ok(cookies.length > 0, `${name}: the actual provider must persist the retained sibling`);
  assert.ok(responses.some(response => response.url === url && response.resourceType === 'document' && response.status === 200),
    `${name}: require a real successful document request`);
  steps.push({ name, ...state, actualCookies: cookies.map(cookie => ({
    name: cookie.name, length: cookie.value.length, sha256: sha(cookie.value),
    path: cookie.path, expires: cookie.expires,
  })) });
}

let failure;
try {
  const response = await page.goto(`${baseUrl}/autoperf-f040-tempdata`, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200);
  assert.equal(await page.locator('#f040-mode').textContent(), 'idle');
  assert.equal(await page.locator('#f040-owner').textContent(), expectedOwnerSha256);
  await clickAndObserve('Seed through actual endpoint-invoker persistence', 'seed', 'seed',
    { message: 'seeded', nullPresent: 'True', count: '3' });
  await clickAndObserve('First cookie access: mismatched conditional removal must not consume', 'mismatch', 'mismatch',
    { removed: 'False', message: 'F040 persisted value', nullPresent: 'True', count: '3' });
  await clickAndObserve('Next real request proves unmatched value and null remain persisted', 'peek', 'peek',
    { message: 'F040 persisted value', nullPresent: 'True', count: '3' });
  await clickAndObserve('Case-insensitive matching removal succeeds once', 'remove', 'remove',
    { removed: 'True', repeat: 'False', message: '(none)', nullPresent: 'True', count: '2' });
  await clickAndObserve('Next real request proves matching value is gone and null remains', 'peek', 'peek',
    { message: '(none)', nullPresent: 'True', count: '2' });
  await clickAndObserve('Nearest-opposite control: missing null must not remove present null', 'missing', 'missing',
    { removed: 'False', message: '(none)', nullPresent: 'True', count: '2' });
  await clickAndObserve('Present null is removable once through the actual collection slot', 'remove-null', 'remove-null',
    { removed: 'True', repeat: 'False', message: '(none)', nullPresent: 'False', count: '1' });
  await clickAndObserve('Final actual request retains only the unrelated sibling', 'peek', 'peek',
    { message: '(none)', nullPresent: 'False', count: '1' });
  await page.screenshot({ path: path.join(directory, 'final-cookie-state.png'), fullPage: true });
  assert.ok(responses.some(response => response.url.includes('blazor.web') && response.status === 200));
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleMessages.filter(message => message.type === 'error'), []);
  assert.deepEqual(responses.filter(response => response.url.startsWith(baseUrl) && response.status >= 400), []);
  assert.deepEqual(failures.filter(request => request.url.startsWith(baseUrl)), []);
  Object.assign(result, { actualPassed: true, actualOwnerSha256: expectedOwnerSha256,
    actualStepCount: steps.length, steps, responses, consoleMessages, pageErrors, failures, sockets });
} catch (error) {
  failure = error;
  Object.assign(result, { actualPassed: false, error: { name: error.name, message: error.message, stack: error.stack },
    steps, responses, consoleMessages, pageErrors, failures, sockets });
} finally {
  fs.writeFileSync(resultFile, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  await browser.close();
}
if (failure) throw failure;
console.log(JSON.stringify({ candidate: 'F040', variant, actualPassed: true,
  actualStepCount: steps.length, actualOwnerSha256: expectedOwnerSha256,
  actualPageErrors: pageErrors.length, actualConsoleErrors: consoleMessages.filter(message => message.type === 'error').length }, null, 2));
