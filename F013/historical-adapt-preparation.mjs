import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F013');
const source = fs.readFileSync(path.join(session, 'F012-prepare-original.ps1'));
let text = source.toString('utf8').replaceAll('\r\n', '\n').replaceAll('F012', 'F013')
  .replaceAll('Broadcast', 'TargetedSend').replaceAll('broadcast', 'targeted-send')
  .replaceAll('f012', 'f013');
assert(text.includes('actualNewOwningTestRuns = 0'));
assert(text.includes('actualPriorOriginalRowsReused = 27'));
assert(text.includes("'autoperf-runs\\F011'"));
assert(text.includes('$files.Count -ne 80 -or $sourceFiles.Count -ne 89'));
const destination = path.join(session, 'F013-prepare-original.ps1');
assert(!fs.existsSync(destination));
fs.writeFileSync(destination, text);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
fs.writeFileSync(path.join(run, 'preparation-tools-attribution.json'), JSON.stringify({
  candidate: 'F013', source: 'F012-prepare-original.ps1', sourceSha256: hash(source),
  resultSha256: hash(Buffer.from(text)),
  changes: 'Independent targeted-send harness/observations and F013 identifiers; unchanged guarded fork-source/actual-runtime/PE-PDB/byte-exact prior owner-test-current-JSON attribution and capture workflow.',
  originalTestsExplicitlyReusedOnlyForPreparation: true,
  selectedCandidateRequiresFreshFocusedOwningTests: true,
  priorExclusionObservationsOrTimingUsedAsTargetedSendProof: false,
}, null, 2) + '\n');
console.log('F013 guarded original targeted-send preparation driver prepared; no build/probe/timing launched.');
