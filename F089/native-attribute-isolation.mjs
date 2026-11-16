import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

const root = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(import.meta.url)(join(root, 'autoperf-playwright-tools', 'node_modules', 'playwright'));
const [baseUrl, destination] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try
{
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/autoperf-hash/0`);
    await page.locator('#interactive-proof').click();
    await page.waitForFunction(() => document.querySelector('#interactive-proof')?.textContent === 'Interactions: 1');
    const result = await page.locator('#native-results').evaluate(element => ({
        outerHtml: element.outerHTML, booleanAttribute: element.getAttribute('data-complete'),
        resultText: element.textContent,
    }));
    assert.equal(result.booleanAttribute, null);
    assert.equal(result.resultText, '');
    writeFileSync(destination, JSON.stringify({
        diagnosticOnly: true, measuredOwnerInvocations: 0, interactivity: '0 -> 1', result,
        conclusion: 'The false Boolean attribute is omitted. Completion must observe the serialized result, not assume a string-valued Boolean attribute.',
    }, null, 2) + '\n');
    console.log(JSON.stringify(result));
}
finally
{
    await browser.close();
}
