import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(session, 'F039-audit-measurement.mjs');
const destination = path.join(session, 'F040-audit-measurement.mjs');
const hash = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
let text = fs.readFileSync(source, 'utf8').replaceAll('F039', 'F040')
  .replaceAll('TempDataContainsBenchmarks', 'TempDataRemoveBenchmarks')
  .replaceAll('ControlContainsKey', 'ControlRemoveKey')
  .replace("assert.equal(row.Method, 'Contains');", "assert.equal(row.Method, 'RemoveAndRestore');")
  .replaceAll('actualAllPreparedLookupAndProviderLifecycleChecksPassed', 'actualAllPreparedRemovalRestorationAndProviderLifecycleChecksPassed');
const marker = "    assert.equal(only(records, 'completed').actualReports, 40);";
assert.equal(text.split(marker).length, 2);
text = text.replace(marker, `    const discovery = only(records, 'benchmarkdotnet-discovery-preflight');
    assert.equal(discovery.actualEligiblePublicNonSealedType, true);
    assert.equal(discovery.actualDiscoveredCases, 40);
    assert.equal(discovery.actualTimingRunByThisPreflight, false);
    for (const phase of ['benchmark-setup', 'benchmark-cleanup'])
      for (const state of records.filter(record => record.name === phase))
        assert.equal(state.value.actualNonemptyRestorationInsideTiming, true);
${marker}`);
assert.match(text, /assert.equal\(row.Method, 'RemoveAndRestore'\)/);
assert.doesNotMatch(text, /TempDataContainsBenchmarks|ControlContainsKey|actualAllPreparedLookup/);
fs.writeFileSync(destination, text, { flag: 'wx' });
fs.writeFileSync(path.join(session, 'autoperf-runs', 'F040', 'context', 'statistical-auditor-derivation.json'),
  JSON.stringify({ candidate: 'F040', actualCreatedBeforeTiming: true, source, sourceSha256: hash(fs.readFileSync(source)),
    destination, destinationSha256: hash(Buffer.from(text)),
    actualChanges: ['Case/class/control/method identity only', 'Require actual BDN discovery and timed-restoration declarations in every member'],
    actualUnchangedStatistics: 'Independently match 320 native stdout samples per member to JSON and recompute every mean and sample SD; publish every profile, controls, adverse values and allocation result.' }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F040', actualAuditorDerivedBeforeTiming: true,
  actualSourceComparisonsStartedByThisTool: 0, actualDestinationSha256: hash(Buffer.from(text)) }, null, 2));
