import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(session, 'autoperf-playwright-tools', 'package.json'));
const { chromium } = require('playwright');
const [label, baseUrl] = process.argv.slice(2);
assert(/^[a-z0-9-]+$/.test(label) && /^http:\/\/127\.0\.0\.1:\d+$/.test(baseUrl),
    'An exact isolated sample label and actual loopback listening URL are required.');
const directory = path.join(session, 'autoperf-runs', 'F111', 'browser', label);
assert(!fs.existsSync(directory), 'Retain previous browser attempts.');
fs.mkdirSync(directory);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(directory, 'executed-source.mjs'));
const built = JSON.parse(fs.readFileSync(path.join(directory, '..', `${label}-build`, 'built-output.json'), 'utf8'));
const payload = 'A'.repeat(2048) + '<&\\"\n \u00e9\u4e2d\u{1f30d}'.repeat(64);
const expectedHash = crypto.createHash('sha256').update(payload, 'utf8').digest('hex').toUpperCase();
const write = (name, value) => fs.writeFileSync(path.join(directory, name + '.json'), JSON.stringify(value, null, 2) + '\n');
const startedAt = new Date().toISOString();
const observations = [];
const errors = [];
const requests = [];
let browser;
let failure;
let owner;
let version;
let launchOptions;
try
{
    const response = await fetch(`${baseUrl}/autoperf-f111-owner`);
    assert.equal(response.status, 200);
    owner = await response.json();
    assert.equal(owner.ownerSha256, built.ownerSha256, 'The sample must load the actual recorded Endpoints build.');
    launchOptions = fs.existsSync(chromium.executablePath()) ? { headless: true } : { channel: 'msedge', headless: true };
    browser = await chromium.launch(launchOptions);
    version = browser.version();
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('console', message =>
    {
        if (message.type() === 'error')
        {
            errors.push({ type: 'console', message: message.text(), url: page.url() });
        }
    });
    page.on('pageerror', error => errors.push({ type: 'pageerror', message: error.message, url: page.url() }));
    page.on('requestfailed', request => errors.push({ type: 'requestfailed', url: request.url(), failure: request.failure() }));
    page.on('response', response => requests.push({ url: response.url(), status: response.status() }));
    async function observe(stage, status, expectedLength, hash, integers)
    {
        await page.locator('#f111-status').filter({ hasText: new RegExp(`^${status}$`) }).waitFor();
        const observed = await page.evaluate(() => Object.fromEntries(
            ['status', 'length', 'hash', 'integers'].map(name => [name, document.getElementById('f111-' + name).textContent])));
        observations.push({ stage, url: page.url(), ...observed });
        write('observations', observations);
        assert.deepEqual(observed, { status, length: String(expectedLength), hash, integers });
        fs.writeFileSync(path.join(directory, stage + '.html'), await page.content());
        await page.screenshot({ path: path.join(directory, stage + '.png') });
    }
    const first = await page.goto(`${baseUrl}/autoperf-f111`, { waitUntil: 'networkidle' });
    assert.equal(first.status(), 200);
    await observe('ready', 'ready', 0, 'missing', 'missing');
    await Promise.all([page.waitForURL('**/autoperf-f111?action=write', { waitUntil: 'networkidle' }), page.locator('#f111-write').click()]);
    await observe('stored', 'stored', payload.length, expectedHash, 'missing');
    await Promise.all([page.waitForURL('**/autoperf-f111?action=read', { waitUntil: 'networkidle' }), page.locator('#f111-read').click()]);
    await observe('read', 'read', payload.length, expectedHash, '7,11,19');
    await Promise.all([page.waitForResponse(response => response.request().isNavigationRequest() &&
        response.url() === `${baseUrl}/autoperf-f111?action=read`), page.locator('#f111-read').click()]);
    await page.waitForLoadState('networkidle');
    await observe('consumed', 'consumed', 0, 'missing', 'missing');
    const scripts = await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => node.src));
    const frameworkScripts = scripts.filter(url => /\/_framework\/blazor\.web(?:[.\w-]*)?\.js(?:\?|$)/.test(url));
    assert(frameworkScripts.length > 0, 'The canonical framework script must be present.');
    for (const url of frameworkScripts)
    {
        const response = await context.request.get(url);
        assert.equal(response.status(), 200, 'The actual framework script must be served,not a404.');
    }
    assert.equal(errors.length, 0, 'No current-page console/page/request failure is permitted.');
    assert.equal(requests.filter(row => row.status >= 400).length, 0, 'All observed page/asset responses must succeed.');
}
catch (error)
{
    failure = { name: error.name, message: error.message, stack: error.stack };
}
finally
{
    if (browser)
    {
        await browser.close();
    }
    write('execution', { candidate: 'F111', label, baseUrl, startedAt, completedAt: new Date().toISOString(),
        exitCode: failure ? 1 : 0, owner, browserVersion: version, launchOptions, expectedUtf16Length: payload.length,
        expectedUtf8PayloadSha256: expectedHash, observations, errors, requests, failure,
        boundary: 'Real canonical sample/static SSR/default Cookie TempData,full browser navigation and actual typed storage/consumption. No interactive-mode,allocation,HTTP-throughput or native-browser-regression claim.' });
}
if (failure)
{
    throw new Error(failure.message);
}
console.log(`F111:${label} canonical real-browser write/read/consume and exact typed payload preserved;actual owner/pages/framework assets/error checks passed.`);
