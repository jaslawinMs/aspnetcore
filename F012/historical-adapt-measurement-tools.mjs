import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F012');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const files = [];
for (const name of ['measure-original.ps1', 'extract-analysis.mjs']) {
  const source = fs.readFileSync(path.join(session, 'F011-' + name));
  let text = source.toString('utf8').replaceAll('F011', 'F012');
  if (name === 'measure-original.ps1') {
    const before = "'current-producer-preparation-attempt-002\\original-output-restored.json'";
    assert.equal(text.split(before).length - 1, 1);
    text = text.replace(before, "'preparation-attempts\\attempt-001\\original-repository-json-outputs-unchanged.json'");
    text = text.replace('The captured-default experiment must restore original root producer outputs.',
      'Original repository JSON producer outputs must remain unchanged.');
    const seam = "$investigation = Get-Content (Join-Path $run 'current-source-investigation.json')";
    assert.equal(text.split(seam).length - 1, 1);
    text = text.replace(seam, `$reuse = Get-Content (Join-Path $run 'tests\\original\\borrowed-evidence-provenance.json') -Raw | ConvertFrom-Json
if ($reuse.actualNewOwningTestRuns -ne 0 -or $reuse.actualPriorOriginalRowsReused -ne 27 -or
    (Get-FileHash (Join-Path $run 'tests\\original\\owning-original.trx')).Hash -cne $reuse.originalTrxSha256)
{
    throw 'Only explicitly attributed identical prior owning-test evidence is allowed; do not claim a new suite run.'
}
${seam}`);
  } else {
    const identity = 'AutoPerf\\.GroupSendBenchmarks';
    assert.equal(text.split(identity).length - 1, 1);
    text = text.replaceAll(identity, 'AutoPerf\\.BroadcastSendBenchmarks');
    text = text.replaceAll('groupSize', 'connectionCount');
    text = text.replaceAll('public group sends', 'public broadcast sends');
    text = text.replaceAll('pre-registered/grouped', 'pre-registered');
    const seam = 'existingAreaRows: 27, existingRowsFailed: 0, existingRowsSkipped: 0,';
    assert.equal(text.split(seam).length - 1, 1);
    text = text.replace(seam, seam + '\n  actualNewOwningTestRuns: 0, explicitlyReusedOriginalAreaRows: 27,');
  }
  const destination = path.join(session, 'F012-' + name);
  assert(!fs.existsSync(destination));
  fs.writeFileSync(destination, text);
  files.push({ source: 'F011-' + name, destination: 'F012-' + name, sourceSha256: sha(source), resultSha256: sha(Buffer.from(text)) });
}
fs.writeFileSync(path.join(run, 'measurement-tools-attribution.json'), JSON.stringify({
  candidate: 'F012', files,
  changes: 'Checked ID/broadcast owner/connection-count adaptations; new original-only profile guarded by both actual F012 characterizations and explicit unchanged-owner test reuse. No source/measurement data copied as F012 results.',
}, null, 2) + '\n');
console.log('F012 measurement driver and independent extraction scaffolded; no timing launched.');
