import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F123');
const [label, expectedText, focusedText] = process.argv.slice(2);
const expected = Number(expectedText);
const focused = Number(focusedText);
assert.match(label ?? '', /^[a-z0-9-]+$/);
assert.ok(Number.isInteger(expected) && expected > 0 && [0, 12].includes(focused));
const directory = path.join(run, 'validation', label);
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const sha = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex').toUpperCase();
assert.equal(read(path.join(directory, 'result.json')).exitCode, 0);
const reports = fs.readdirSync(path.join(directory, 'test-results')).filter(name => name.endsWith('.trx'));
assert.equal(reports.length, 1);
const report = path.join(directory, 'test-results', reports[0]);
const result = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File',
  path.join(session, 'F123-audit-trx.ps1'), '-TrxPath', report,
  '-ExpectedRows', String(expected), '-ExpectedFocusedRows', String(focused)],
{ encoding: 'utf8', windowsHide: true });
assert.ifError(result.error);
assert.equal(result.status, 0, result.stderr);
const audit = JSON.parse(result.stdout.replace(/^\uFEFF/, ''));
assert.equal(audit.actualPassed, expected);
assert.equal(audit.actualFocusedRows, focused);
const receipt = {
  candidate: 'F123', label, actualPassed: expected, actualPreservationRows: focused,
  actualFailed: 0, actualSkipped: 0, actualEveryConfiguredRowParsed: true,
  actualReport: reports[0], actualReportSha256: sha(report),
  actualParserSha256: sha(path.join(session, 'F123-audit-trx.ps1')), rows: audit.actualRows
};
fs.writeFileSync(path.join(directory, 'test-row-audit.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ label, actualPassed: expected, actualPreservationRows: focused, actualEveryConfiguredRowParsed: true }));
