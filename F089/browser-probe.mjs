import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const root = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require(join(root, 'autoperf-playwright-tools', 'node_modules', 'playwright'));
const [baseUrl, outputPath, phase, expectedMvid, expectedDllHash, nativeMode, nativeConfigurationPath] = process.argv.slice(2);
assert(baseUrl && outputPath && phase && /^[0-9a-f-]{36}$/i.test(expectedMvid) && /^[0-9a-f]{64}$/i.test(expectedDllHash));
assert(nativeMode === undefined || nativeMode === 'calibrate' || nativeMode === 'reuse');
assert(nativeMode !== 'reuse' || nativeConfigurationPath);

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await context.newPage();
const errors = [];
const failedRequests = [];
const assets = [];
const consoleMessages = [];
const cases = [];
const optionalDebugProbe = '/_framework/dotnet-browser-tools/hot-reload-settings.json';
const optionalDebugMessages = [];

page.on('pageerror', error => errors.push(error.message));
page.on('console', message =>
{
    const entry = { type: message.type(), text: message.text(), location: message.location() };
    consoleMessages.push(entry);
    if (message.type() === 'error')
    {
        if (message.location().url?.endsWith(optionalDebugProbe) && message.text().includes('404'))
        {
            optionalDebugMessages.push(entry);
        }
        else
        {
            errors.push(message.text());
        }
    }
});
page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
page.on('response', response =>
{
    if (response.url().includes('/_framework/'))
    {
        assets.push({ url: response.url(), status: response.status() });
    }
});

async function capture()
{
    const previous = Number(await page.locator('#owner-diagnostics').getAttribute('data-captures'));
    await page.locator('#capture-diagnostics').click();
    await page.waitForFunction(expected =>
        Number(document.querySelector('#owner-diagnostics')?.getAttribute('data-captures')) === expected &&
        document.querySelector('#owner-diagnostics')?.textContent.startsWith('{'), previous + 1);
    const state = JSON.parse(await page.locator('#owner-diagnostics').textContent());
    assert.equal(state.OwnerType, 'Microsoft.AspNetCore.Components.WebAssembly.Services.WebAssemblyScrollToLocationHash');
    assert.equal(state.OwnerMvid.toLowerCase(), expectedMvid.toLowerCase());
    assert.equal(state.Completed, true);
    return state;
}

async function navigate(id, step, fragment, target, previous)
{
    await page.locator(id).click();
    const expectedUrl = `${baseUrl}/autoperf-hash/${step}${fragment}`;
    await page.waitForURL(expectedUrl);
    await page.waitForFunction(expected =>
        document.querySelector('#hash-page')?.textContent.trim() === `Hash navigation step ${expected}`, step);
    await page.waitForFunction(expected =>
        expected === null
            ? Math.abs(window.scrollY) < 2
            : Math.abs(document.getElementById(expected).getBoundingClientRect().top) < 2, target);
    const geometry = await page.evaluate(expected => ({
        scrollY: window.scrollY,
        targetTop: expected === null ? null : document.getElementById(expected).getBoundingClientRect().top,
        url: location.href,
        viewportHeight: window.innerHeight,
    }), target);
    const state = await capture();
    assert.equal(state.Calls, previous.Calls + 1, 'A changed path must reach the real managed owner exactly once.');
    assert.equal(state.Location, expectedUrl);
    const index = expectedUrl.indexOf('#');
    assert.equal(state.HashIndex, index);
    assert.equal(state.Identifier, index < 0 || index === expectedUrl.length - 1 ? null : expectedUrl.slice(index + 1));
    cases.push({ action: id, step, input: expectedUrl, target, geometry, state });
    return state;
}

try
{
    const response = await page.goto(`${baseUrl}/autoperf-hash/0`);
    assert.equal(response.status(), 200);
    await page.locator('#interactive-proof').waitFor({ state: 'visible', timeout: 90000 });
    await page.waitForFunction(() =>
        Object.keys(document.querySelector('#interactive-proof') ?? {}).some(key => key.startsWith('_blazorEvents_')),
        null, { timeout: 90000 });
    await page.locator('#interactive-proof').click();
    await page.waitForFunction(() => document.querySelector('#interactive-proof')?.textContent === 'Interactions: 1');
    let state = await capture();
    const initial = state;
    state = await navigate('#go-missing', 1, '', null, state);
    state = await navigate('#go-empty', 2, '#', null, state);
    state = await navigate('#go-valid', 3, '#hash-target', 'hash-target', state);
    state = await navigate('#go-multiple', 4, '#hash#target', 'hash#target', state);
    state = await navigate('#go-encoded', 5, '#hash%20target', 'hash%20target', state);
    state = await navigate('#go-not-found', 6, '#missing-target', null, state);

    await page.locator('#go-same-page').click();
    await page.waitForURL(`${baseUrl}/autoperf-hash/6#hash-target`);
    await page.waitForFunction(() => Math.abs(document.getElementById('hash-target').getBoundingClientRect().top) < 2);
    const samePage = await capture();
    assert.deepEqual(samePage, state, 'Same-page JavaScript scrolling must not be mistaken for managed owner reachability.');
    cases.push({ action: '#go-same-page', input: page.url(), managedOwnerRan: false, state: samePage,
        geometry: await page.evaluate(() => ({ scrollY: window.scrollY, targetTop: document.getElementById('hash-target').getBoundingClientRect().top })) });

    state = await navigate('#go-query', 7, '?encoded=%23&value=42', null, state);
    state = await navigate('#go-query-empty', 8, '?encoded=%23&value=42#', null, state);
    state = await navigate('#go-long', 9, '?encoded=%23&padding=' + 'a'.repeat(1024), null, state);
    state = await navigate('#go-long-empty', 10, '?encoded=%23&padding=' + 'a'.repeat(1024) + '#', null, state);
    assert.equal(errors.length, 0, 'No current-page JavaScript/runtime errors are permitted.');
    assert.equal(failedRequests.length, 0);
    assert(assets.some(asset => /blazor\.webassembly.*\.js(?:$|\?)/.test(asset.url) && asset.status === 200));
    assert(assets.some(asset => asset.url.includes('Microsoft.AspNetCore.Components.WebAssembly') && asset.status === 200));
    assert(assets.every(asset => asset.status === 200 ||
        asset.url.endsWith(optionalDebugProbe) && asset.status === 404));
    let native;
    let originalNative;
    if (nativeMode)
    {
        const nativeOutput = join(dirname(outputPath), `native-${phase}.json`);
        assert(!existsSync(nativeOutput), 'A native measurement must not overwrite an already captured comparison.');
        if (nativeMode === 'reuse')
        {
            originalNative = JSON.parse(readFileSync(nativeConfigurationPath, 'utf8'));
            await page.locator('#native-configuration').fill(JSON.stringify(
                originalNative.Cases.map(item => ({ Step: item.Step, Location: item.Location, Operations: item.Operations }))));
        }
        await page.locator('#measure-native').click();
        await page.waitForFunction(() =>
            document.querySelector('#native-results')?.textContent.startsWith('{'), null, { timeout: 180000 });
        native = JSON.parse(await page.locator('#native-results').textContent());
        assert.equal(native.OwnerMvid.toLowerCase(), expectedMvid.toLowerCase());
        assert.equal(native.OwnerType, 'Microsoft.AspNetCore.Components.WebAssembly.Services.WebAssemblyScrollToLocationHash');
        assert.equal(native.Architecture, 'Wasm');
        assert(native.AccountingProbeAllocatedBytes >= 4096);
        assert(native.Frequency > 0);
        assert.equal(native.Cases.length, 10);
        for (const item of native.Cases)
        {
            assert.equal(item.Warmups.length, 3);
            assert.equal(item.Samples.length, 8);
            if (originalNative)
            {
                const original = originalNative.Cases.find(previous => previous.Step === item.Step);
                assert(original);
                assert.equal(item.Location, original.Location, 'Native A/B must use byte-identical genuine original URI input.');
                assert.equal(item.Operations, original.Operations, 'Native A/B must reuse the original calibration.');
            }
            for (const sample of [...item.Warmups, ...item.Samples])
            {
                assert.equal(sample.Operations, item.Operations);
                assert(sample.ElapsedTicks > 0 && sample.AllocatedBytes >= 0);
            }
        }
        if (originalNative)
        {
            assert.equal(native.Frequency, originalNative.Frequency);
            assert.equal(native.FrameworkDescription, originalNative.FrameworkDescription);
        }
        assert.equal(errors.length, 0);
        assert.equal(failedRequests.length, 0);
        writeFileSync(nativeOutput, JSON.stringify(native, null, 2) + '\n');
    }
    const result = {
        candidate: 'F089', phase, successful: true, baseUrl, browserVersion: browser.version(),
        initial, cases, errors, failedRequests, assets, consoleMessages, optionalDebugMessages,
        optionalDebugBoundary: 'The retained actual SDK initializer readHotReloadSettings explicitly returns false for a non-OK availability response. Only its exact settings-route 404 is separated from product errors; no other failure is ignored.',
        expectedSourceProvenDllSha256: expectedDllHash, expectedMvid,
        identityBoundary: 'The browser reports the executing owner MVID; it matches the source-proven PE for this recorded configuration. Served Webcil bytes are not represented as identical to the PE.',
        nativeMeasurement: nativeMode ? `native-${phase}.json` : null,
        performanceBoundary: nativeMode
            ? 'Separate custom WebAssembly owner calipers, not BDN: actual synchronous imports over prepared existing DOM targets and genuine captured inputs. Not whole-navigation throughput.'
            : 'Functional producer/URI/scroll evidence only. Neither browser timing nor managed allocation is measured.',
    };
    writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
    await page.screenshot({ path: outputPath.replace(/\.json$/, '.png'), fullPage: true });
    console.log(JSON.stringify({ successful: true, phase, actualOwnerCalls: cases.filter(item => item.managedOwnerRan !== false).length,
        adjacentJavaScriptControls: 1, browserVersion: browser.version(), errors: errors.length, failedRequests: failedRequests.length }));
}
catch (error)
{
    const nativeElementPresent = nativeMode && await page.locator('#native-results').count() === 1;
    const nativeDiagnostic = nativeElementPresent
        ? await page.locator('#native-results').evaluate(element => ({
            outerHtml: element.outerHTML, text: element.textContent,
        }))
        : null;
    writeFileSync(outputPath.replace(/\.json$/, '-failed.json'), JSON.stringify({
        phase, successful: false, error: error.stack, url: page.url(), cases, errors, failedRequests, assets, consoleMessages, nativeDiagnostic,
    }, null, 2) + '\n');
    throw error;
}
finally
{
    await context.close();
    await browser.close();
}
