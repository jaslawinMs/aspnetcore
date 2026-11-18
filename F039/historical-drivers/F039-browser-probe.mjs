import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const variant = process.argv[2];
assert.ok(['original', 'candidate'].includes(variant));
const directory = path.join(session, 'autoperf-runs', 'F039', `sample-${variant}`);
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
const result = { candidate: 'F039', variant, baseUrl, expectedOwnerSha256,
  actualBrowserChannel: 'msedge', actualBrowserVersion: browser.version(),
  actualRenderMode: 'Static SSR; actual document navigations, no interactivity claim',
  actualIsolatedBrowserContextNotIsolatedMachine: true,
  actualRealClicksAndCookieProducerNotInjectedCallbacks: true };

async function clickAndObserve(name, link, mode, expected) {
  const url = `${baseUrl}/autoperf-f039-tempdata?mode=${mode}`;
  await Promise.all([page.waitForURL(url, { waitUntil: 'networkidle' }), page.locator(`#f039-${link}`).click()]);
  await page.waitForFunction(mode => document.querySelector('#f039-mode')?.textContent === mode, mode);
  const state = await page.evaluate(() => ({
    mode: document.querySelector('#f039-mode').textContent,
    message: document.querySelector('#f039-message').textContent,
    contains: document.querySelector('#f039-contains').textContent,
    nullPresent: document.querySelector('#f039-null-present').textContent,
    nullMissing: document.querySelector('#f039-null-missing').textContent,
    ownerSha256: document.querySelector('#f039-owner').textContent,
  }));
  assert.equal(state.ownerSha256, expectedOwnerSha256, 'The actual routed component must load the rebuilt source owner.');
  for (const [key, value] of Object.entries(expected)) assert.equal(state[key], value, `${name}: ${key}`);
  const cookies = (await context.cookies(baseUrl)).filter(cookie => cookie.name.startsWith('.AspNetCore.Components.TempData'));
  assert.ok(cookies.length > 0, `${name}: the real cookie provider must preserve at least the null-valued key`);
  assert.ok(responses.some(response => response.url === url && response.resourceType === 'document' && response.status === 200),
    `${name}: require a real successful document request, not a local DOM transition`);
  steps.push({ name, ...state, actualCookies: cookies.map(cookie => ({
    name: cookie.name, length: cookie.value.length, sha256: sha(cookie.value),
    path: cookie.path, expires: cookie.expires,
  })) });
}

let failure;
try {
  const response = await page.goto(`${baseUrl}/autoperf-f039-tempdata`, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200);
  assert.equal(await page.locator('#f039-mode').textContent(), 'idle');
  assert.equal(await page.locator('#f039-owner').textContent(), expectedOwnerSha256);
  await clickAndObserve('Seed through the actual endpoint invoker/provider', 'seed', 'seed', { message: 'seeded' });
  await clickAndObserve('Non-consuming collection Contains is the first cookie-data access', 'check', 'contains',
    { message: 'checked', contains: 'True', nullPresent: 'True', nullMissing: 'False' });
  await clickAndObserve('The next real request still sees the matching value and present null', 'peek', 'peek',
    { message: 'F039 persisted value', nullPresent: 'True' });
  await clickAndObserve('Get consumes the value and a later true Contains must not re-retain it', 'consume', 'consume-and-check',
    { message: 'F039 persisted value', contains: 'True' });
  await clickAndObserve('Nearest-opposite control: consumed value is absent on the next request', 'peek', 'peek',
    { message: '(none)', nullPresent: 'True' });
  await clickAndObserve('Reseed the public dictionary control', 'seed', 'seed', { message: 'seeded' });
  await clickAndObserve('Public dictionary TryGetValue really consumes the value', 'dictionary', 'dictionary-get',
    { message: 'F039 persisted value', contains: 'True' });
  await clickAndObserve('Next request proves the consuming dictionary control removed the value', 'peek', 'peek',
    { message: '(none)', nullPresent: 'True' });
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
console.log(JSON.stringify({ candidate: 'F039', variant, actualPassed: true,
  actualStepCount: steps.length, actualOwnerSha256: expectedOwnerSha256,
  actualPageErrors: pageErrors.length, actualConsoleErrors: consoleMessages.filter(message => message.type === 'error').length }, null, 2));
