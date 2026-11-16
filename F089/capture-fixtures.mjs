import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const [source, destination] = process.argv.slice(2);
assert(source && destination && !existsSync(destination));
const raw = readFileSync(source);
const browser = JSON.parse(raw);
assert.equal(browser.candidate, 'F089');
assert.equal(browser.successful, true);
assert.equal(browser.cases.filter(item => item.managedOwnerRan !== false).length, 10);
const profiles = [
    ['ShortMissing', 1], ['ShortEmpty', 2],
    ['QueryMissing', 7], ['QueryEmpty', 8],
    ['LongMissing', 9], ['LongEmpty', 10],
];
const fixtures = profiles.map(([profile, step]) =>
{
    const matches = browser.cases.filter(item => item.step === step);
    assert.equal(matches.length, 1);
    const item = matches[0];
    assert.equal(item.state.Location, item.input);
    assert.equal(item.state.Completed, true);
    assert.equal(item.state.Identifier, null);
    const expectedIndex = item.input.indexOf('#');
    assert.equal(item.state.HashIndex, expectedIndex);
    assert(expectedIndex === -1 || expectedIndex === item.input.length - 1);
    assert(new URL(item.input).pathname.endsWith(`/autoperf-hash/${step}`));
    return {
        profile, step, location: item.input, expectedIndex,
        utf16Length: item.input.length,
        genuineProducer: 'NavigationManager.NavigateTo -> Router.OnAfterRenderAsync -> actual WebAssembly owner',
        sourceEvidenceSha256: createHash('sha256').update(raw).digest('hex').toUpperCase(),
    };
});
writeFileSync(destination, JSON.stringify(fixtures, null, 2) + '\n');
console.log(`Captured ${fixtures.length} exact genuine URI fixtures.`);
