import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F126');
const [label, mode] = process.argv.slice(2);
assert.match(label ?? '', /^[a-z0-9-]+$/);
assert.ok(['existing', 'original-red', 'candidate'].includes(mode));
const directory = path.join(run, 'validation', label);
const target = path.join(directory, 'individual-results.audit.json');
assert.equal(fs.existsSync(target), false);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const result = read(path.join(directory, 'result.json'));
assert.equal(result.exitCode, mode === 'original-red' ? 1 : 0);
const trx = path.join(directory, 'test-results', 'results.trx');
const executable = 'pwsh';
const args = ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', path.join(session, 'F126-audit-trx.ps1'),
  '-TrxPath', trx, '-Mode', mode];
const parsed = spawnSync(executable, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
assert.ifError(parsed.error);
assert.equal(parsed.status, 0, parsed.stderr || parsed.stdout);
const rows = JSON.parse(parsed.stdout);
const audit = {
  candidate: 'F126', label, mode, actualXmlSha256: sha(trx),
  actualParserSha256: sha(path.join(session, 'F126-audit-trx.ps1')),
  actualParserExecutable: executable, actualParserArguments: args, actualParserExitCode: parsed.status,
  actualResultSha256: sha(path.join(directory, 'result.json')),
  actualStdoutSha256: sha(path.join(directory, 'stdout.txt')),
  actualStderrSha256: sha(path.join(directory, 'stderr.txt')), ...rows
};
fs.writeFileSync(target, JSON.stringify(audit, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ label, actualRows: rows.actualParsedRows, actualPassed: rows.actualPassed,
  actualEachExpectedOriginalFailureChecked: rows.actualExpectedOriginalCacheContractFailures,
  actualFocusedRows: rows.actualFocusedRows, actualUnexpectedOrSkipped: rows.actualSkippedOrUnexpectedFailures }, null, 2));
