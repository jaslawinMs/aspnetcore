import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F124');
const [label, expectedText, focusedText] = process.argv.slice(2);
const expected = Number(expectedText);
const focused = Number(focusedText);
assert.match(label, /^[a-z0-9-]+$/);
assert.ok(Number.isInteger(expected) && expected > 0 && [0, 6].includes(focused));
const directory = path.join(run, 'validation', label);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
assert.equal(read(path.join(directory, 'result.json')).exitCode, 0);
const trx = path.join(directory, 'test-results', 'results.trx');
const parser = path.join(session, 'F124-audit-trx.ps1');
const args = ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', parser,
  '-TrxPath', trx, '-ExpectedRows', String(expected), '-ExpectedFocusedRows', String(focused)];
const result = spawnSync('pwsh', args, { encoding: 'utf8', windowsHide: true });
assert.ifError(result.error);
fs.writeFileSync(path.join(directory, 'xml-audit-invocation.json'), JSON.stringify({
  executable: 'pwsh', arguments: args, actualExitCode: result.status,
  actualParserSha256: sha(parser), actualTrxSha256: sha(trx),
  stdout: result.stdout, stderr: result.stderr
}, null, 2) + '\n', { flag: 'wx' });
assert.equal(result.status, 0, result.stderr || result.stdout);
const audit = JSON.parse(result.stdout.replace(/^\uFEFF/, ''));
assert.equal(audit.actualPassed, expected);
assert.equal(audit.actualFocusedRows, focused);
fs.writeFileSync(path.join(directory, 'individual-results.audit.json'), JSON.stringify({
  candidate: 'F124', label, actualXmlParsed: true, actualTrxSha256: sha(trx),
  actualParserSha256: sha(parser), ...audit
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F124', label, actualPassed: audit.actualPassed,
  actualFocusedRows: audit.actualFocusedRows, actualSkippedOrFailed: audit.actualSkippedOrFailed }, null, 2));
