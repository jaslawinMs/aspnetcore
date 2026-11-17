import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F014');
const original = fs.readFileSync(path.join(session, 'F012-extract-analysis.mjs'));
let content = original.toString('utf8').replaceAll('\r\n', '\n').replaceAll('F012', 'F014');
const changes = [];
function edit(before, after, count = 1) {
  assert.equal(content.split(before).length - 1, count, before);
  content = content.replaceAll(before, after);
  changes.push({ before, after, actualOccurrences: count });
}
edit('BroadcastSendBenchmarks', 'UserSendBenchmarks');
edit('exclusionSize', 'targetSize', 2);
edit('length, 12);', 'length, 14);', 3);
edit('size, 12);', 'size, 14);');
edit('successfulReports: 12', 'successfulReports: 14');
edit('contractChecksPerProducer: 17, actualTimedWrapperPathsPerProducer: 12',
  'contractChecksPerProducer: 19, actualTimedWrapperPathsPerProducer: 14');
edit('benchmarkOutcomes: 12', 'benchmarkOutcomes: 14');
edit('F014: 12 original-only reports', 'F014: 14 original-only reports');
edit('Repeated actual public broadcast sends over pre-registered HubConnectionContexts',
  'Repeated actual public user-targeted sends over pre-registered HubConnectionContexts whose real DefaultUserIdProvider/principal setup is outside timing');
const destination = path.join(session, 'F014-extract-analysis.mjs');
assert(!fs.existsSync(destination));
fs.writeFileSync(destination, content);
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
fs.writeFileSync(path.join(run, 'extraction-tools-attribution.json'), JSON.stringify({
  candidate: 'F014', template: 'F012-extract-analysis.mjs', templateSha256: hash(original),
  resultSha256: hash(Buffer.from(content)), changes,
  qualification: 'Independent actual14-shape user-send original-only data extraction. Raw original samples/warmups/overheads retained; no imported timings or before/after percentages.',
}, null, 2) + '\n');
const memory = path.join(run, 'investigation', 'bdn-memory-accounting');
assert(!fs.existsSync(memory));
fs.cpSync(path.join(session, 'autoperf-runs', 'F012', 'investigation', 'bdn-memory-accounting'), memory, { recursive: true });
const provenancePath = path.join(memory, 'provenance.json');
const priorProvenance = fs.readFileSync(provenancePath);
const provenance = JSON.parse(priorProvenance.toString('utf8').replace(/^\uFEFF/, ''));
const manifest = JSON.parse(fs.readFileSync(path.join(run, 'manifest-original.json'), 'utf8').replace(/^\uFEFF/, ''));
const bdn = manifest.files.find(row => row.path === 'BenchmarkDotNet.dll');
assert(bdn);
assert.equal(hash(fs.readFileSync(path.join(memory, 'GcStats.cs'))), provenance.source_sha256);
assert.equal(bdn.sha256, provenance.currentMeasuredBdnDllSha256);
fs.writeFileSync(path.join(memory, 'borrowed-F012-provenance.json'), priorProvenance);
Object.assign(provenance, {
  candidate: 'F014', explicitlyReusedFrom: 'F012/investigation/bdn-memory-accounting',
  copiedPriorProvenanceSha256: hash(priorProvenance), currentMeasuredBdnDllSha256: bdn.sha256,
  newSourceFetchOrDelegateInstrumentation: false,
  qualification: 'Existing observed BDN0.13 GcStats source and its identical actual measured DLL identity explicitly rehashed. No new source fetch, instrumentation or source-to-DLL rebuild; not complete source-to-binary proof.',
});
fs.writeFileSync(provenancePath, JSON.stringify(provenance, null, 2) + '\n');
console.log('F014 extractor prepared and identical BDN allocation-accounting source/provenance explicitly rehashed; no extracted result or new profile.');
