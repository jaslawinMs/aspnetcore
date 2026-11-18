import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const session = path.dirname(fileURLToPath(import.meta.url));
const variant = process.argv[2];
assert.ok(['original', 'candidate'].includes(variant));
const directory = path.join(session, 'autoperf-runs', 'F038', `sample-${variant}`);
const resultFile = path.join(directory, 'browser-result.json');
assert.equal(fs.existsSync(resultFile), false);
const { chromium } = createRequire(import.meta.url)(path.join(session, 'autoperf-playwright-tools', 'node_modules', 'playwright'));
const owner = String.raw`C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.Components\Release\net12.0\Microsoft.AspNetCore.Components.dll`;
const expectedOwnerSha256 = createHash('sha256').update(fs.readFileSync(owner)).digest('hex').toUpperCase();
let baseUrl;
const listenerFile = path.join(directory, 'startup-listener.json');
if (fs.existsSync(listenerFile)) {
  const listener = JSON.parse(fs.readFileSync(listenerFile, 'utf8'));
  assert.equal(listener.variant, variant);
  assert.equal(listener.actualHttpStatus, 200);
  assert.match(listener.actualUrl, /^http:\/\/127\.0\.0\.1:\d+$/);
  baseUrl = listener.actualUrl;
}
const deadline = Date.now() + 60_000;
while (!baseUrl && Date.now() < deadline) {
  const stdoutFile = path.join(directory, 'stdout.log');
  const stdout = fs.existsSync(stdoutFile) ? fs.readFileSync(stdoutFile, 'utf8') : '';
  const match = /Now listening on:\s*(http:\/\/127\.0\.0\.1:\d+)/.exec(stdout);
  if (match) {
    baseUrl = match[1];
    break;
  }
  await delay(200);
}
assert.ok(baseUrl, 'Require an announced dynamic URL or an independently verified owned listener.');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const consoleMessages = [];
const pageErrors = [];
const responses = [];
const failures = [];
const sockets = [];
const steps = [];
const result = { candidate: 'F038', variant, baseUrl, expectedOwnerSha256,
  actualUrlDiscovery: fs.existsSync(listenerFile) ? 'verified-owned-process-listener-and-HTTP' : 'announced-listening-URL',
  actualBrowserChannel: 'msedge', actualBrowserVersion: browser.version(), actualUserInteractionsNotInjectedCallbacks: true };
const context = await browser.newContext();
const page = await context.newPage();
page.on('console', message => consoleMessages.push({ type: message.type(), text: message.text() }));
page.on('pageerror', error => pageErrors.push({ name: error.name, message: error.message, stack: error.stack }));
page.on('response', response => responses.push({ url: response.url(), status: response.status(),
  resourceType: response.request().resourceType() }));
page.on('requestfailed', request => failures.push({ url: request.url(), failure: request.failure() }));
page.on('websocket', socket => sockets.push(socket.url()));

async function observe(name, revision, expectedIds) {
  await page.waitForFunction(expected => document.querySelector('#f038-revision')?.textContent === String(expected), revision);
  const state = await page.evaluate(() => ({
    revision: Number(document.querySelector('#f038-revision').textContent),
    elementIds: [...document.querySelectorAll('#f038-elements > li[data-item]')].map(node => Number(node.dataset.item)),
    componentIds: [...document.querySelectorAll('#f038-components > li[data-item]')].map(node => Number(node.dataset.item)),
    retained: window.f038Saved ? [...window.f038Saved.elements].filter(([id]) =>
      document.querySelector(`#f038-elements > li[data-item="${id}"]`)).every(([id, node]) =>
        node === document.querySelector(`#f038-elements > li[data-item="${id}"]`)) &&
      [...window.f038Saved.components].filter(([id]) =>
        document.querySelector(`#f038-components > li[data-item="${id}"]`)).every(([id, node]) =>
        node === document.querySelector(`#f038-components > li[data-item="${id}"]`)) : true,
    unkeyedRetained: window.f038Saved ? window.f038Saved.before === document.querySelector('#f038-before') &&
      window.f038Saved.after === document.querySelector('#f038-after') : true,
    childOneCount: document.querySelector('#f038-components > li[data-item="1"] .f038-local')?.textContent ?? null,
    elementOneValue: document.querySelector('#f038-elements > li[data-item="1"] input')?.value ?? null,
    componentInstances: [...document.querySelectorAll('#f038-components > li[data-item]')].map(node => ({
      id: Number(node.dataset.item), instance: node.dataset.instance,
      count: Number(node.querySelector('.f038-local').textContent),
    })),
  }));
  assert.deepEqual(state.elementIds, expectedIds, `${name}: actual keyed element order`);
  assert.deepEqual(state.componentIds, expectedIds, `${name}: actual keyed component order`);
  assert.equal(state.retained, true, `${name}: native DOM identities retained`);
  assert.equal(state.unkeyedRetained, true, `${name}: native unkeyed neighbors retained`);
  if (revision >= 2 && expectedIds.includes(1)) {
    assert.equal(state.childOneCount, '1', `${name}: child-local state retained`);
    assert.equal(state.elementOneValue, 'Typed local value', `${name}: native input state retained`);
  }
  steps.push({ name, ...state });
}

let failure;
try {
  const response = await page.goto(baseUrl + '/autoperf-f038-keyed', { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200);
  await page.waitForFunction(() => document.querySelector('#f038-ready')?.textContent === 'True');
  const actualOwnerSha256 = await page.locator('#f038-owner').textContent();
  assert.equal(actualOwnerSha256, expectedOwnerSha256, 'The real page must load the actual rebuilt Components product.');
  result.actualOwnerSha256 = actualOwnerSha256;
  await page.click('#f038-reverse');
  await observe('First real click proves interactivity', 1, [3, 2, 1]);
  await page.evaluate(() => {
    window.f038Saved = {
      elements: new Map([...document.querySelectorAll('#f038-elements > li[data-item]')].map(node => [node.dataset.item, node])),
      components: new Map([...document.querySelectorAll('#f038-components > li[data-item]')].map(node => [node.dataset.item, node])),
      before: document.querySelector('#f038-before'),
      after: document.querySelector('#f038-after'),
    };
  });
  await page.locator('#f038-elements > li[data-item="1"] input').fill('Typed local value');
  await page.locator('#f038-components > li[data-item="1"] .f038-increment').click();
  await page.waitForFunction(() => document.querySelector('#f038-components > li[data-item="1"] .f038-local')?.textContent === '1');
  await page.click('#f038-reverse');
  await observe('Retained values and child state after reordering', 2, [1, 2, 3]);
  await page.click('#f038-insert');
  await observe('New keyed sibling inserted before retained siblings', 3, [99, 1, 2, 3]);
  await page.click('#f038-remove');
  await observe('One keyed sibling removed without replacing its neighbors', 4, [99, 1, 3]);
  const removedTwoDisconnected = await page.evaluate(() =>
    !window.f038Saved.elements.get('2').isConnected && !window.f038Saved.components.get('2').isConnected);
  assert.equal(removedTwoDisconnected, true);
  await page.click('#f038-replace');
  await observe('Disjoint keys replace the entire keyed range', 5, [41, 42, 43]);
  const replacedOldDisconnected = await page.evaluate(() =>
    [...window.f038Saved.elements.values(), ...window.f038Saved.components.values()].every(node => !node.isConnected));
  assert.equal(replacedOldDisconnected, true);
  assert.ok(steps.at(-1).componentInstances.every(item => item.count === 0));
  await page.screenshot({ path: path.join(directory, 'final-keyed-dom.png'), fullPage: true });
  assert.ok(responses.some(item => item.url.includes('blazor.web') && item.status === 200), 'Actual framework JavaScript served successfully.');
  assert.ok(sockets.some(url => url.includes('/_blazor')), 'Actual InteractiveServer circuit connection observed.');
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleMessages.filter(message => message.type === 'error'), []);
  assert.deepEqual(responses.filter(item => item.url.startsWith(baseUrl) && item.status >= 400), []);
  assert.deepEqual(failures.filter(item => item.url.startsWith(baseUrl)), []);
  Object.assign(result, { actualPassed: true, actualInteractiveReadyObserved: true,
    actualRemovedTwoDisconnected: removedTwoDisconnected, actualReplacedOldDisconnected: replacedOldDisconnected,
    actualStepCount: steps.length, steps, responses, consoleMessages, pageErrors, failures, sockets });
} catch (error) {
  failure = error;
  Object.assign(result, { actualPassed: false, error: { name: error.name, message: error.message, stack: error.stack },
    steps, responses, consoleMessages, pageErrors, failures, sockets });
} finally {
  fs.writeFileSync(resultFile, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  await browser.close();
}
if (failure) {
  throw failure;
}
console.log(JSON.stringify({ candidate: 'F038', variant, actualPassed: true, actualStepCount: steps.length,
  actualOwnerSha256: result.actualOwnerSha256, actualPageErrors: pageErrors.length,
  actualConsoleErrors: consoleMessages.filter(message => message.type === 'error').length }, null, 2));
