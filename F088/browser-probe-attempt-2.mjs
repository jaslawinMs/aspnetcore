import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const sessionFiles = dirname(fileURLToPath(import.meta.url));
const { chromium } = require(join(sessionFiles, 'autoperf-playwright-tools', 'node_modules', 'playwright'));
const [baseUrl, outputPath, phase, expectedOwner] = process.argv.slice(2);
assert(baseUrl && outputPath && phase && /^[0-9a-f]{64}$/i.test(expectedOwner),
    'Expected actual launch URL, output path, phase and actual copied owner hash.');

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await context.newPage();
const errors = [];
const failedRequests = [];
const assets = [];
const websockets = [];
const consoleMessages = [];
let receipt;

page.on('pageerror', error => errors.push(error.message));
page.on('console', message =>
{
    consoleMessages.push({ type: message.type(), text: message.text() });
    if (message.type() === 'error')
    {
        errors.push(message.text());
    }
});
page.on('requestfailed', request =>
{
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText });
});
page.on('response', response =>
{
    const url = response.url();
    if (url.includes('/_framework/') || url.includes('/_content/Microsoft.AspNetCore.Components.AI/'))
    {
        assets.push({ url, status: response.status() });
    }
});
page.on('websocket', socket => websockets.push(socket.url()));

async function capture(rows)
{
    await page.waitForFunction(expected =>
        document.querySelectorAll('#f088-real .sc-ai-message--assistant table tr').length === expected &&
        document.querySelectorAll('#f088-prototype table tr').length === expected, rows);
    const observed = await page.evaluate(() =>
    {
        const read = selector => Array.from(document.querySelectorAll(selector), row =>
            Array.from(row.querySelectorAll('td'), cell => ({
                text: cell.textContent,
                className: cell.getAttribute('class'),
                alignment: getComputedStyle(cell).textAlign,
            })));
        return {
            actual: read('#f088-real .sc-ai-message--assistant table tr'),
            prototype: read('#f088-prototype table tr'),
            streaming: document.querySelectorAll('#f088-real .sc-ai-message__content--streaming').length,
            owner: document.querySelector('#f088-owner')?.getAttribute('data-sha256'),
            processId: document.querySelector('#f088-owner')?.getAttribute('data-pid'),
        };
    });
    assert.equal(observed.actual.length, rows);
    assert.deepEqual(observed.actual, observed.prototype,
        'Actual structured-content producer and unmeasured prototype must agree at the real table/CSS boundary.');
    const classes = [
        null,
        'sc-ai-rich-text__table-cell--left',
        'sc-ai-rich-text__table-cell--center',
        'sc-ai-rich-text__table-cell--right',
        'sc-ai-rich-text__table-cell---1',
        'sc-ai-rich-text__table-cell--42',
        null,
    ];
    for (let rowIndex = 0; rowIndex < rows; rowIndex++)
    {
        assert.equal(observed.actual[rowIndex].length, 7);
        assert.deepEqual(observed.actual[rowIndex].map(cell => cell.className), classes);
        assert.deepEqual(observed.actual[rowIndex].map(cell => cell.text),
            classes.map((_, columnIndex) => `r${rowIndex + 1}c${columnIndex + 1}`));
        assert.deepEqual(observed.actual[rowIndex].map(cell => cell.alignment),
            ['left', 'left', 'center', 'right', 'left', 'left', 'left']);
    }
    assert.equal(observed.owner?.toUpperCase(), expectedOwner.toUpperCase());
    assert(Number(observed.processId) > 0, 'Actual in-process owner/PID marker required.');

    return observed;
}

try
{
    const connection = page.waitForEvent('websocket', {
        predicate: socket => socket.url().includes('/_blazor'),
        timeout: 45000,
    });
    const response = await page.goto(`${baseUrl.replace(/\/$/, '')}/autoperf-table-alignment`, {
        waitUntil: 'domcontentloaded',
    });
    assert.equal(response?.status(), 200);
    await connection;
    await page.waitForFunction(() =>
        ['#f088-real textarea.sc-ai-input__textarea', '#f088-real button.sc-ai-input__send', '#f088-finish']
            .every(selector =>
            {
                const element = document.querySelector(selector);
                return element && Object.getOwnPropertyNames(element)
                    .some(key => key.startsWith('_blazorEvents_'));
            }));
    await page.locator('#f088-real textarea.sc-ai-input__textarea').fill('table');
    await page.locator('#f088-real button.sc-ai-input__send').click();
    const partial = await capture(2);
    assert.equal(partial.streaming, 1, 'Real incomplete provider response must remain active behind its gate.');

    await page.locator('#f088-finish').click();
    await page.waitForFunction(() =>
        document.querySelectorAll('#f088-real .sc-ai-message__content--streaming').length === 0);
    const complete = await capture(8);
    assert.equal(complete.streaming, 0);
    assert.equal(complete.processId, partial.processId);
    assert.equal(await page.locator('#f088-provider-requests').textContent(), 'Provider requests: 1');
    await page.screenshot({ path: outputPath.replace(/\.json$/, '.png'), fullPage: true });

    await page.locator('#f088-real textarea.sc-ai-input__textarea').fill('plain');
    await page.locator('#f088-real button.sc-ai-input__send').click();
    await page.waitForFunction(() =>
        Array.from(document.querySelectorAll('#f088-real .sc-ai-turn--assistant'))
            .at(-1)?.textContent.includes('Plain control response') &&
        document.querySelectorAll('#f088-real .sc-ai-message__content--streaming').length === 0);
    const plain = page.locator('#f088-real .sc-ai-turn--assistant').last();
    assert.equal(await plain.locator('table').count(), 0);
    assert.equal(await page.locator('#f088-real .sc-ai-message--assistant table tr').count(), 8);
    assert(assets.some(asset => new URL(asset.url).pathname.includes('/_framework/blazor.web') &&
        new URL(asset.url).pathname.endsWith('.js') && asset.status === 200));
    assert(assets.some(asset => asset.url.includes('/_content/Microsoft.AspNetCore.Components.AI/ai-chat.css') &&
        asset.status === 200));
    assert.equal(assets.filter(asset => asset.status >= 400).length, 0);
    assert.equal(failedRequests.length, 0, JSON.stringify(failedRequests));
    assert.equal(errors.length, 0, JSON.stringify(errors));
    assert(websockets.some(url => url.includes('/_blazor')));
    receipt = {
        candidate: 'F088', phase, base_url: baseUrl, browser: await browser.version(),
        render_mode: 'InteractiveServer per-page,canonical sample',
        producer: 'Actual public UIAgent/provider RichTextContent/default mapping/MessageList;no direct handler injection.',
        prototype: 'Unmeasured sample-only table-class mapping,not shipping owner or performance evidence.',
        exact_partial_two_rows: partial, exact_completed_eight_rows: complete,
        plain_control_has_no_table: true, actual_interactivity_and_gated_snapshot: true,
        input_send_and_release_handlers_attached_before_interaction: true,
        owner_sha256: expectedOwner, assets, websockets, console: consoleMessages,
        errors, failed_requests: failedRequests, screenshot: outputPath.replace(/\.json$/, '.png'),
        managed_class_object_identity_or_browser_allocation_claim: false,
    };
    writeFileSync(outputPath, JSON.stringify(receipt, null, 2) + '\n');
    console.log(`F088 ${phase}:actual ${partial.processId}/${expectedOwner},two-to-eight-row gated UI,exact classes/text/CSS,plain control,JS/CSS200 andzero page errors verified.`);
}
catch (error)
{
    const failedHtml = outputPath.replace(/\.json$/, '-failed.html');
    writeFileSync(failedHtml, await page.content());
    writeFileSync(outputPath.replace(/\.json$/, '-failed.json'), JSON.stringify({
        candidate: 'F088', phase, base_url: baseUrl, error: error.stack ?? String(error),
        assets, websockets, errors, failed_requests: failedRequests, console: consoleMessages,
        failed_html: failedHtml,
    }, null, 2) + '\n');
    throw error;
}
finally
{
    await context.close();
    await browser.close();
}
