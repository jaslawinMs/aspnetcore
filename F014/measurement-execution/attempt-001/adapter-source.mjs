import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F014');
const original = fs.readFileSync(path.join(session, 'F012-measure-original.ps1'));
let content = original.toString('utf8').replaceAll('\r\n', '\n').replaceAll('F012', 'F014');
const changes = [];
function edit(before, after, count = 1) {
  assert.equal(content.split(before).length - 1, count, before);
  content = content.replaceAll(before, after);
  changes.push({ before, after, actualOccurrences: count });
}
edit('$ready.contractChecks -ne 17', '$ready.contractChecks -ne 19');
edit('$ready.actualChecks -ne 29', '$ready.actualChecks -ne 33');
edit('$ready.actualTimedSetupsPreflighted -ne 12', '$ready.actualTimedSetupsPreflighted -ne 14');
edit("@(Get-ChildItem $states -Filter '*-producer.json').Count -ne 17",
  "@(Get-ChildItem $states -Filter '*-producer.json').Count -ne 19");
edit("@(Get-ChildItem $states -Filter '*-setup-preflight.json').Count -ne 12",
  "@(Get-ChildItem $states -Filter '*-setup-preflight.json').Count -ne 14");
edit("@(Get-ChildItem $states -Filter '*-benchmark-validated.json').Count -ne 12",
  "@(Get-ChildItem $states -Filter '*-benchmark-validated.json').Count -ne 14");
edit('All 12 actual timed wrappers', 'All 14 actual timed wrappers');
edit('single original-only 12-shape profile', 'single original-only 14-shape user-send profile');
edit("'--context', 'original-diagnostic-only', '--filter', '*', '--artifacts', $destination)",
  `'--context', 'original-diagnostic-only',
    '--test-assembly', (Join-Path $run 'tests\\original\\test-image\\Microsoft.AspNetCore.SignalR.Tests.dll'),
    '--spec-assembly', (Join-Path $run 'tests\\original\\test-image\\Microsoft.AspNetCore.SignalR.Specification.Tests.dll'),
    '--filter', '*', '--artifacts', $destination)`);
const destination = path.join(session, 'F014-measure-original.ps1');
assert(!fs.existsSync(destination));
fs.writeFileSync(destination, content);
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
fs.writeFileSync(path.join(run, 'measurement-tools-attribution.json'), JSON.stringify({
  candidate: 'F014', template: 'F012-measure-original.ps1', templateSha256: hash(original),
  resultSha256: hash(Buffer.from(content)), changes,
  qualification: 'Independent one-shot user-send original-only diagnostic. Requires both actual19-check/14-wrapper producer runs, freezes90-source/80-file images, spends before launch, preserves settings and includes the actual reused owning-test PE/PDB witnesses without rerunning that old suite.',
}, null, 2) + '\n');
console.log('F014 guarded original-only user-send timing driver prepared; no profile launched by this adapter.');
