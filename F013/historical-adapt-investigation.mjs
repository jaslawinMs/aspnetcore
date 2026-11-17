import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F013');
const source = fs.readFileSync(path.join(session, 'F012-investigate.mjs'));
let text = source.toString('utf8').replaceAll('\r\n', '\n').replaceAll('F012', 'F013');
const changes = [];
function edit(before, after, count = 1) {
  const actual = text.split(before).length - 1;
  assert.equal(actual, count, before);
  text = text.replaceAll(before, after);
  changes.push({ before, after, actualOccurrences: actual });
}
edit("assert(['autoperf/F011-signalr-group-exclusions', acceptance.branch].includes(branch));",
  "assert(['autoperf/F012-signalr-broadcast-exclusions', acceptance.branch].includes(branch));");
edit('SendAllExceptAsync', 'SendConnectionsAsync', 2);
edit('priorF011EvidenceIsNotBroadcastBehaviorProof', 'priorF011EvidenceIsNotTargetedSendBehaviorProof');
edit('all27 rows passed with the identical owner/source/SDK. Reuse explicitly, not a new F013 test run.',
  'all27 historical rows passed with identical owner/source/SDK. Explicit prior preparation evidence only; a selected compatible shipping candidate requires fresh focused owning tests and all four16/17 array/List payloads.');
edit('every actual F013 broadcast probe. This does not reuse F011 group-send observations or timing.',
  'every actual F013 targeted-send probe. This does not reuse F011/F012 exclusion observations or timing.');
edit('untimedOwningTestRerunPlanned: false', 'untimedOwningTestRerunPlanned: true');
edit("subject: 'Actual owner diff changes SendConnectionsAsync, not SendConnectionsAsync.'",
  "subject: 'Actual owner diff optimizes <=16 requested IDs in SendConnectionsAsync. The independent F013 finding is its remaining >16 scan; do not mark the entire path duplicate.'");
edit('C# document symbols resolve the broadcast owner/helper.', 'Known targeted-send owner and shared SendToAllConnections body read; no complete caller/dispatch graph claim.');
const destination = path.join(session, 'F013-investigate.mjs');
assert(!fs.existsSync(destination));
fs.writeFileSync(destination, text);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
fs.writeFileSync(path.join(run, 'investigation-tools-attribution.json'), JSON.stringify({
  candidate: 'F013', source: 'F012-investigate.mjs', sourceSha256: hash(source),
  resultSha256: hash(Buffer.from(text)), changes,
  qualification: 'Checked independent targeted-send reader adaptation. No source investigation, branch or measurement is launched by this scaffolder.',
}, null, 2) + '\n');
console.log('F013 fresh targeted-send source/history investigation reader prepared.');
