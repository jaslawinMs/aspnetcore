import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F040');
const directory = path.join(run, 'publication-tools');
assert.equal(fs.existsSync(directory), false);
assert.equal(JSON.parse(fs.readFileSync(path.join(run, 'decision.json'), 'utf8')).actualAllApplicableAcceptanceChecksPassed, true);
const hash = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const specifications = [
  ['F039-publish-source.mjs', [
    ['assert.equal(decision.actualCompletedSourceComparisonPairs, 2);', 'assert.equal(decision.actualCompletedSourceComparisonPairs, 3);'],
    ['assert.equal(decision.actualFailedSourceComparisonAttempts, 1);', 'assert.equal(decision.actualFailedSourceComparisonAttempts, 0);'],
    ['tempdata-contains-lookup', 'tempdata-remove-lookup'],
    [String.raw`48\t0\t`, String.raw`47\t0\t`],
    ['preparation-candidate-002', 'preparation-candidate-001'],
    ['Avoid duplicate lookups in TempData collection containment', 'Avoid duplicate lookups in TempData conditional collection removal'],
    [
      'Use the private Data dictionary TryGetValue, not the consuming public member. Preserve lazy loading, null and equality semantics, and retention. Add focused eight-row lazy-load and consumed-value preservation coverage. F040 retains two completed comparisons and the first failed authorization; no cookie or application speedup claim.',
      'Use the private Data dictionary TryGetValue, not the consuming public member. Preserve lazy loading, null, equality and retention, including the final Remove(key) result after reentrant equality. Add eight first-access preservation rows. F040 retains three completed RemoveAndRestore comparisons with restoration inside timing; no isolated Remove, cookie or application speedup claim.',
    ],
    ['actualF040CollectionRemoveChanged: false', 'actualF039CollectionContainsChanged: false'],
  ]],
  ['F039-commit-evidence.ps1', [
    ['F038', 'F039', 2],
    ['ec58de221859b542594921a5d4714103108f7459', 'bd689a66bb69c31a8b09ea990bf01e5c2b068a8c'],
    ['Archive F040 measured TempData containment evidence', 'Archive F040 measured TempData removal round-trip evidence'],
    ['actualPortableSamplesRecomputed=1280', 'actualPortableSamplesRecomputed=1920'],
  ]],
];
fs.mkdirSync(directory);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(directory, 'executed-derivation.mjs'), fs.constants.COPYFILE_EXCL);
const records = [];
for (const [source, replacements] of specifications) {
  const bytes = fs.readFileSync(path.join(session, source));
  let text = bytes.toString().replaceAll('F039', 'F040');
  for (const [before, after, count = 1] of replacements) {
    assert.equal(text.split(before).length - 1, count, before);
    text = text.replaceAll(before, after);
  }
  const destination = source.replace('F039', 'F040');
  fs.writeFileSync(path.join(session, destination), text, { flag: 'wx' });
  fs.copyFileSync(path.join(session, destination), path.join(directory, destination), fs.constants.COPYFILE_EXCL);
  records.push({ source, sourceSha256: hash(bytes), destination, destinationSha256: hash(Buffer.from(text)),
    reviewedSeams: replacements.map(([before, after, count = 1]) => ({ before, after, count })) });
}
fs.writeFileSync(path.join(directory, 'derivation.json'), JSON.stringify({
  candidate: 'F040', actualCreatedUtc: new Date().toISOString(),
  actualMeasuredInputsOrExistingPublicationsChanged: false,
  actualPublicationMustStillExecuteAndVerifyRemote: true,
  records,
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F040', actualPublicationHelpersDerived: records.length,
  actualSourceOrEvidencePublishedByThisDerivation: false }, null, 2));
