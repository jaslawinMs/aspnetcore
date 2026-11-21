import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gitId, sha256 } from '../autoperf-published-results/F240-F268/source-objects.mjs';

const root = import.meta.dirname;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
function checked(directory, relative, bytes, expected)
{
    const file = path.resolve(directory, ...relative.split(/[\\/]/));
    assert.ok(file.startsWith(directory + path.sep));
    const raw = fs.readFileSync(file);
    if (bytes !== undefined)
    {
        assert.equal(raw.length, bytes, relative);
    }
    assert.equal(sha256(raw), expected, relative);
    return raw;
}
const photino = path.join(root, 'finding-F212-233');
const phandoffRaw = checked(photino, 'HANDOFF.json', 76483,
    '2663BC09C69CCD505F88D73C61DF9ADEF2C98916F3E62B3A17075155114E1FBD');
const phandoff = JSON.parse(phandoffRaw), pseal = read(path.join(photino, 'artifact-seal-008.json'));
const pindex = JSON.parse(checked(photino, 'artifact-index-008.json', undefined, pseal.artifactIndexSha256));
assert.equal(pindex.files.length, 312);
let pbytes = 0;
for (const item of pindex.files)
{
    pbytes += checked(photino, item.path, item.bytes, item.sha256).length;
}
const integrity = JSON.parse(checked(photino, 'source-integrity-008.json', undefined, pseal.sourceIntegritySha256));
assert.equal(integrity.verifiedBindings, 75);
assert.equal(integrity.verified.length, 75);
for (const item of integrity.verified)
{
    const relative = path.relative(photino, item.savedPath);
    assert.equal(gitId('blob', checked(photino, relative, item.bytes, item.sha256)), item.gitBlob);
}
const pterminal = JSON.parse(checked(photino, 'native-terminal-008.json', undefined, pseal.nativeTerminalSha256));
assert.equal(pterminal.directReadOnlyRootCount, 36);
assert.equal(pterminal.allDirectRootsExited, true);
assert.equal(pterminal.allDirectStreamsDrained, true);
assert.deepEqual(pterminal.knownLiveOwnedChildren, []);
assert.deepEqual(pterminal.outstandingOwnedNativeWork, []);
assert.equal(phandoff.disposition, 'SOURCE_ONLY_INTENTIONAL_DISPATCH_NO_MATERIAL_CANDIDATE');
assert.equal(phandoff.candidate.created, false);
assert.deepEqual(phandoff.validation.tests, []);
assert.deepEqual(phandoff.validation.performance, []);
const pipe = path.join(root, 'finding-F217-237');
const nhandoffRaw = checked(pipe, 'HANDOFF.json', 176654,
    'E51C9AA2BF3762CCCF8C9F7DE7DE3742EEDC78D1E055A1803C95658290D52677');
checked(pipe, 'SEAL.json', 732, '5B447CA12029D8511B69E873D05D90FF594EB98616E383AF55EBC520ED363D3B');
const nhandoff = JSON.parse(nhandoffRaw);
assert.equal(nhandoff.artifactIndex.length, 918);
let nbytes = 0;
for (const item of nhandoff.artifactIndex)
{
    nbytes += checked(pipe, item.path, item.length, item.sha256).length;
}
const nsource = read(path.join(pipe, 'raw-discovery', 'verified-members.json'));
assert.equal(nsource.sources.length, 84);
for (const item of nsource.sources)
{
    assert.equal(gitId('blob', checked(pipe, item.evidencePath, item.length, item.sha256)), item.gitBlob);
}
const nterminal = read(path.join(pipe, 'native-terminal-summary.json'));
assert.equal(nterminal.nativeRoots, 124);
assert.equal(nterminal.observedChildIdentities, 228);
assert.equal(nterminal.allRootsWaitsAndBothStreamsTerminal, true);
assert.equal(nterminal.allRecordedObservedChildrenTerminal, true);
assert.deepEqual(nterminal.dotnetRoots, []);
assert.deepEqual(nterminal.testRoots, []);
assert.deepEqual(nterminal.buildRoots, []);
assert.deepEqual(nterminal.outstandingOwnedWork, []);
assert.equal(nhandoff.disposition, 'source-only-no-material-candidate');
const externalReceiptFile = path.join(root, 'finding-F221-terminal-240', 'enclosing-tool-result.json');
const externalReceiptRaw = fs.readFileSync(externalReceiptFile), externalReceipt = JSON.parse(externalReceiptRaw);
assert.equal(externalReceipt.actualReturnedResult.exitCode, 0);
assert.equal(externalReceipt.actualReturnedResult.completed, true);
const policyFile = path.join(root, 'policy.json'), policyRaw = fs.readFileSync(policyFile), policy = JSON.parse(policyRaw);
assert.deepEqual(Object.keys(policy.independentFindingPreparationWorkers).sort(), ['F209', 'F212', 'F217', 'F221']);
assert.ok(policy.activeWorkerPreparationScopes.F209.startsWith('241 STAGING ONLY'));
fs.copyFileSync(policyFile, path.join(root, 'policy-before-retirements-242.json'), fs.constants.COPYFILE_EXCL);
const receipt = {
    recordedUtc: new Date().toISOString(), policyBeforeSha256: sha256(policyRaw),
    F212: { indexedPayloads: 312, payloadBytesRehashed: pbytes, envelopes: ['HANDOFF.json', 'artifact-index-008.json', 'artifact-seal-008.json'],
        wholeSourceBindingsRehashed: 75, terminalDirectSourceUtilityRoots: 36,
        accepted: 'Source-only intentional dispatch/no material candidate; no actual native-window/browser/thread/fault/lifetime race or selected Photino binary/runtime proof.',
        failuresAndLimits: 'Both collector failures retained; outer shell separate raw streams absent, distinct from full direct gh/git streams. Final sealer exit0 explicitly reported by completed owner, not self-attested from future-exit text.',
        campaignFinalized: false },
    F217: { indexedPayloads: 918, payloadBytesRehashed: nbytes, envelopes: ['HANDOFF.json', 'SEAL.json'],
        wholeAspNetSourceBindingsRehashed: 84, terminalSourceUtilityNativeRoots: 124, observedTerminalChildIdentities: 228,
        productDotnetBuildTestOrBenchmarkRoots: 0,
        accepted: 'Source-only no material owning named-pipe hash workload; valid equality/hash contract and fixed-local-server producer, not universal consumer absence or measured no-gain.',
        failuresAndLimits: 'Failed CRLF archive/source qualification and all404s retained; only exact raw sources qualify. Source utility native roots are NOT product/test/benchmark roots. Outer tool stream/finalizer boundaries retained.',
        campaignFinalized: false },
    F221Supplement: { file: 'finding-F221-terminal-240/enclosing-tool-result.json', bytes: externalReceiptRaw.length,
        sha256: sha256(externalReceiptRaw), originalSealToolShellId: externalReceipt.originalToolCall.shellId,
        actualOriginalSealToolExitCode: 0, old234MutationOrRerun: false, accepted: true },
    retirementAuthorized: ['F212', 'F217', 'F221'],
    retirementIsNotPublication: true, F209241StagingUnchanged: true,
    coordinatorNativeProductOrBenchmarkStarts: 0, policyWritesByThisAcceptor: 0
};
fs.writeFileSync(path.join(root, 'owner-retirements-242.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ F212: { indexed: 312, bytes: pbytes, sourceBindings: 75 },
    F217: { indexed: 918, bytes: nbytes, rawSources: 84, terminalSourceUtilityRoots: 124, productNativeRoots: 0 },
    retirementAuthorized: receipt.retirementAuthorized, F209241NativeAuthorized: false, campaignFinalized: false }));
