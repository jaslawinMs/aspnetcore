import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const directory = path.join(session, 'autoperf-runs', 'F040', 'closeout-tools');
assert.equal(fs.existsSync(directory), false);
const hash = text => createHash('sha256').update(text).digest('hex').toUpperCase();
const once = (text, before, after) => {
  assert.equal(text.split(before).length, 2, 'Require exactly one reviewed template seam: ' + before);
  return text.replace(before, after);
};
const templates = [
  ['F039-e2e-build.ps1', []],
  ['F039-selenium.ps1', [
    ["$names = @('CanCheckIfTempDataContainsKey')", "$names = @('CanRemoveTheElementWithRemove')"],
    ["$_ -cne 'CanCheckIfTempDataContainsKey'", "$_ -cne 'CanRemoveTheElementWithRemove'"],
    ['actualContainsKeyIsAdjacentNotDirectCollectionContainsCoverage', 'actualStringKeyRemoveIsAdjacentNotDirectCollectionRemoveCoverage'],
  ]],
  ['F039-reproduce.ps1', [
    ["(Join-Path $run 'harness-v2')", "(Join-Path $run 'harness')"],
    ['Relocate exactly the seven corrected measured source inputs.', 'Relocate exactly the seven measured source inputs.'],
  ]],
  ['F039-verify-reproduction.mjs', [
    ["'preparation-candidate-002'", "'preparation-candidate-001'"],
    ["'characterize-candidate-002'", "'characterize-candidate-001'"],
    ['assert.equal(actual.records.length, 15);', 'assert.equal(actual.records.length, 17);'],
    ['actualSemanticRecordsExactlyEqual: 15,', 'actualSemanticRecordsExactlyEqual: 17,'],
    ['15 semantic records/40 lifecycles passed', '17 semantic records/40 lifecycles passed'],
  ]],
];
fs.mkdirSync(directory);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(directory, 'executed-derivation.mjs'), fs.constants.COPYFILE_EXCL);
const records = [];
for (const [source, replacements] of templates) {
  const bytes = fs.readFileSync(path.join(session, source));
  let text = bytes.toString();
  for (const [before, after] of replacements) text = once(text, before, after);
  assert.ok(text.includes('F039'));
  text = text.replaceAll('F039', 'F040')
    .replaceAll('CorrectedTimedHarness', 'MeasuredHarness')
    .replaceAll('corrected timed harness', 'measured harness');
  assert.equal(text.includes('F039'), false);
  const destination = source.replace('F039', 'F040');
  fs.writeFileSync(path.join(session, destination), text, { flag: 'wx' });
  fs.copyFileSync(path.join(session, destination), path.join(directory, destination), fs.constants.COPYFILE_EXCL);
  records.push({
    source, sourceSha256: hash(bytes), destination, destinationSha256: hash(Buffer.from(text)),
    reviewedSeams: replacements.map(([before, after]) => ({ before, after })),
    actualCommonCaseLabelChanged: true,
    actualMeasuredInputsOrExistingF039EvidenceChanged: false,
  });
}
fs.writeFileSync(path.join(directory, 'derivation.json'), JSON.stringify({
  candidate: 'F040', actualCreatedUtc: new Date().toISOString(),
  actualCloseoutOnlyNotMeasurementInput: true,
  actualProducerSeleniumFact: 'CanRemoveTheElementWithRemove',
  actualAdjacentStringKeyNotDirectCollectionRemovalClaim: true,
  actualIndependentReproductionAddsNoTiming: true,
  records,
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F040', actualDerivedCloseoutDrivers: records.length,
  actualMeasuredInputsChanged: false, actualIndependentReproductionMustStillRun: true }, null, 2));
