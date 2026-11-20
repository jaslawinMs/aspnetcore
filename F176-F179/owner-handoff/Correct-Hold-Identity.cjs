'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { sha } = require('./Inventories.cjs');
const root = __dirname, owner = path.dirname(root);
const originalBytes = fs.readFileSync(path.join(owner, 'F140-HOLD-027-ack.json'));
const hold = JSON.parse(originalBytes);
const exact = new Map();
function add(pid, creation, kind, label) {
  const key = `${pid}@${creation}`;
  if (!exact.has(key)) exact.set(key, { processId: pid, creationUtc: creation, kinds: new Set(), labels: new Set() });
  exact.get(key).kinds.add(kind); exact.get(key).labels.add(label);
}
for (const command of hold.recordedNativeCommands) {
  const file = path.join(root, 'evidence', command.label + '.receipt.json'), bytes = fs.readFileSync(file);
  assert.equal(sha(bytes), command.receiptSha256, 'Original raw native receipt is unchanged since HOLD');
  const receipt = JSON.parse(bytes);
  add(receipt.nativePid, receipt.nativeCreationUtc, 'native-root', receipt.label);
  add(receipt.wrapperPid, receipt.wrapperCreationUtc, 'native-wrapper', receipt.label);
  for (const process of receipt.observedProcesses)
    add(process.processId, process.creationUtc, process.direct ? 'native-root' : 'observed-child', receipt.label);
}
const records = [];
for (const historical of hold.knownPidCreationTerminalObservations) {
  const formatted = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2}:\d{2})$/.exec(historical.creationUtc);
  assert(formatted, 'Historical collector timestamp has the observed declared second-resolution format');
  const recordedExpectedUtcSecond = `${formatted[3]}-${formatted[1]}-${formatted[2]}T${formatted[4]}`;
  const matches = [...exact.values()].filter(record => record.processId === historical.processId &&
    record.labels.size === historical.labels.length && historical.labels.every(label => record.labels.has(label)) &&
    record.creationUtc.slice(0, 19) === recordedExpectedUtcSecond);
  assert.equal(matches.length, 1, 'Unambiguous original raw UTC identity for every historical recorded PID observation');
  const expected = matches[0], observed = historical.observedCreationUtc;
  const state = observed === null || observed === undefined ? 'not-running-at-recorded-hold-observation' :
    observed === expected.creationUtc ? 'matching-owned-process-live-at-recorded-hold-observation' : 'pid-reused-not-owned-at-recorded-hold-observation';
  records.push({ processId: expected.processId, exactCreationUtc: expected.creationUtc, kinds: [...expected.kinds].sort(),
    labels: [...expected.labels].sort(), historicalFormattedExpectedCreation: historical.creationUtc,
    historicalCheckedAtUtc: historical.checkedAtUtc, historicalObservedCreationUtc: observed ?? null, derivedTerminalState: state });
}
assert.equal(records.length, exact.size);
const matchingOwned = records.filter(record => record.derivedTerminalState === 'matching-owned-process-live-at-recorded-hold-observation');
assert.equal(matchingOwned.length, 0, 'Historical recorded actual observations still establish no owned process live');
const result = {
  schema: 'F140-HOLD-027-exact-identity-correction-v1', recordedAtUtc: new Date().toISOString(),
  agentId: hold.agentId, scope: hold.scope, holdId: hold.holdId, originalAckSha256: sha(originalBytes),
  originalAckNotModified: true,
  correction: 'Original ack collector implicitly parsed UTC into DateTime then formatted the EXPECTED creation field as culture-specific seconds. Native raw receipts are exact UTC and their hashes remain unchanged. The actual recorded PID absence/live-creation observations are preserved. Each original PID/label/recorded-expected-UTC-second selects exactly one original raw native UTC identity; PID and label alone are insufficient when a long command observes PID reuse. This correction derives ownership from the original observed PID state/creation, not from a new or retroactive observation.',
  historicalKnownIdentities: records.length, historicalMatchingOwnedLive: matchingOwned.length,
  observations: records, freshFinalReobservation: 'TERMINAL.json',
  boundary: 'No replacement of the original ack, no new historical observation, no assertion about unsampled processes. Every original sampled PID observation is independently reconciled against original hashed raw receipt UTC identities. Fresh final post-release exact PID/UTC closure is separately retained.'
};
const bytes = Buffer.from(JSON.stringify(result, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'control', 'F140-HOLD-027-ack-correction.json'), bytes);
fs.writeFileSync(path.join(owner, 'F140-HOLD-027-ack-correction.json'), bytes);
console.log(JSON.stringify({ historicalKnownIdentities: records.length, historicalMatchingOwnedLive: matchingOwned.length,
  originalAckSha256: result.originalAckSha256, correctionSha256: sha(bytes) }));
