import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const parent = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(parent, 'finding-F220-243');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const output = path.join(parent, 'accepted-F220-258.json');
assert(!fs.existsSync(output), 'One-shot output already exists');
const indexRaw = fs.readFileSync(path.join(root, 'HASHES.json'));
assert.equal(sha(indexRaw), 'E57279DEF6F66F198738746B814EB433347B69A2BDCE72A06F623E03DA180737');
const index = JSON.parse(indexRaw);
assert.equal(index.files.length, 1365);
assert.equal(new Set(index.files.map(x => x.path.toLowerCase())).size, 1365);
let bytes = 0;
for (const item of index.files) {
    const file = path.resolve(root, item.path);
    assert(file.toLowerCase().startsWith(`${root.toLowerCase()}${path.sep}`), item.path);
    const raw = fs.readFileSync(file);
    assert.equal(raw.length, item.bytes, item.path);
    assert.equal(sha(raw), item.sha256, item.path);
    bytes += raw.length;
}
const audit = read('source-audit-results-008.json');
assert.equal(audit.checksPassed, 765);
assert.equal(audit.checksFailed, 0);
assert.equal(audit.completeRawSourceBindings, 160);
assert.equal(audit.checks.length, 765);
assert(audit.checks.every(x => x.passed === true));
const roots = read('source-root-terminal-index-009.json');
assert.equal(roots.length, 215);
assert(roots.every(x => x.rootAndBothStreamsReturned === true && [0, 1].includes(x.status)));
assert.equal(roots.filter(x => x.status === 1).length, 2);
const closure = read('native-closure.json');
for (const key of ['productBuildTestApplicationStarts', 'sdkActivations', 'restoreOrInstallStarts',
    'timingWarmupAllocationProfilingStarts', 'comparisons', 'benchmarkBudgetConsumption']) {
    assert.equal(closure[key], 0, key);
}
for (const key of ['productBuildTestApplicationRoots', 'productBuildTestApplicationChildren', 'pendingOwnedProductNativeWork']) {
    assert.equal(closure[key].length, 0, key);
}
assert.equal(closure.allCapturedGitGitHubRootsAndBothStreamsReturned, true);
const handoff = read('HANDOFF.json');
assert.equal(handoff.disposition, 'bounded-source-only-no-material-candidate');
assert.equal(handoff.candidateDiffBytes, 0);
assert.equal(handoff.sealerPowerShellPidSelfObserved, 52700);
const terminal = handoff.nodeChildObservedActualTerminal;
assert.equal(terminal.childRootPidObservedByProcessObject, 28568);
assert.equal(terminal.childExitCodeAfterWait, 0);
assert.equal(terminal.childRootWaitReturned, true);
assert.equal(terminal.bothRawStreamCopiesReturned, true);
assert(index.files.some(x => x.sha256 === terminal.stdoutSha256));
assert(index.files.some(x => x.sha256 === terminal.stderrSha256));
const result = {
    observedUtc: new Date().toISOString(),
    executedAcceptorSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))),
    indexSha256: sha(indexRaw), indexedPayloads: index.files.length, indexedBytes: bytes,
    indexedPayloadsPlusTwoEnvelopes: index.files.length + 2,
    retainedOwnerSourceAudit: { passed: 765, failed: 0, wholeRawSourceBindings: 160, notProductTests: true },
    retainedTerminalSourceUtilityRoots: { total: 215, exitZero: 213, exitOnePreserved: 2 },
    sealerPowerShellPidSelfObserved: 52700, waitedNodePid: 28568, nodeExit: 0,
    actualFinalTool: 'F220243-final-seal-009 completed with exit code 0',
    conclusion: 'Source-qualified no material candidate; proposed rejection, not F190 duplicate or measured no-gain. Separate DOM Length traversal remains real and materially unqualified.',
    acceptanceBoundary: 'Independent full indexed-byte verification and retained terminal/source-audit consistency; no product execution, selected runtime or performance qualification.',
    ownersRetiredByThisHelper: false, officialCampaignFinalizations: 0, productNativeStarts: 0,
    ownFinalToolExit: 'Not self-attested; bind actual enclosing tool completion after return.'
};
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify(result));
