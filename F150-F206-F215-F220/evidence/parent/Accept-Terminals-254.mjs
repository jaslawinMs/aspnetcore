import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = data => createHash('sha256').update(data).digest('hex').toUpperCase();
const hash = file => sha(fs.readFileSync(file));
const output = path.join(root, 'accepted-terminals-254.json');
assert(!fs.existsSync(output), 'One-shot acceptance output already exists');

function verify(base, item, name = item.path) {
    const file = path.resolve(base, name);
    assert(file.toLowerCase().startsWith(`${base.toLowerCase()}${path.sep}`), name);
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.length, item.bytes, name);
    assert.equal(sha(bytes), item.sha256.toUpperCase(), name);
    return bytes.length;
}

function indexed(base, file, expectedHash, expectedCount) {
    assert.equal(hash(path.join(base, file)), expectedHash);
    const index = read(path.join(base, file));
    assert.equal(index.files.length, expectedCount);
    assert.equal(new Set(index.files.map(x => x.path.toLowerCase())).size, expectedCount);
    let bytes = 0;
    for (const item of index.files) {
        bytes += verify(base, item);
    }
    return { index, indexedFiles: expectedCount, indexedBytes: bytes, indexSha256: expectedHash };
}

const f150 = path.join(root, 'finding-F150-246');
const a150 = indexed(f150, 'seal-005.json',
    '98ACDFC4D0378A1DA5981A9CE240B6AF5863E06AC9567C81297DD39FF5F88264', 295);
const t150 = read(path.join(f150, 'seal-005-launch.result.json'));
assert.equal(t150.sealerRootPid, 50152);
assert.equal(t150.outerPowerShellPid, 6460);
assert.equal(t150.sealerRootExitCode, 0);
for (const key of ['sealerRootWaitReturned', 'stdoutCopyAwaited', 'stderrCopyAwaited']) {
    assert.equal(t150[key], true, key);
}
assert.equal(hash(path.join(f150, 'seal-005-launch.stdout.bin')), t150.stdoutSha256);
assert.equal(hash(path.join(f150, 'seal-005-launch.stderr.bin')), t150.stderrSha256);
assert.equal(t150.sealSha256, a150.indexSha256);
const audit150 = read(path.join(f150, 'audit-004', 'source-audit.json'));
assert.equal(audit150.verifiedWholeSourceEntries.length, 131);
for (const entry of audit150.verifiedWholeSourceEntries) {
    assert.equal(entry.wholeFile, true);
    verify(f150, entry);
}
assert.equal(audit150.correctedRolePairs.length, 55);
assert.equal(audit150.correctedRolePairs.filter(x => x.identical).length, 50);
for (const entry of audit150.sourceReaderRoots) {
    assert.equal(entry.rootExitCode, 0);
    for (const key of ['rootWaitReturned', 'stdoutCopyAwaited', 'stderrCopyAwaited']) {
        assert.equal(entry[key], true, key);
    }
}
assert.equal(audit150.sourceReaderRoots.length, 32);
for (const key of ['productNativeStarts', 'sdkActivations', 'builds', 'tests',
    'benchmarkScenarioExecutions', 'productOrCandidateSourceEdits', 'canonicalStatusOrCampaignWrites']) {
    assert.equal(a150.index[key], 0, key);
}
const h150 = read(path.join(f150, 'HANDOFF-F150-246.json'));
assert.equal(h150.disposition, 'SOURCE_ONLY_BOUNDED_NO_MATERIAL_CANDIDATE_ESTABLISHED');

const f206 = path.join(root, 'finding-F206-245');
const a206 = indexed(f206, 'WHOLE-SEAL-v1.json',
    '6A0A5162A3B6BDF7E312025842E6C1EC1DECFFCC9477E3242E3A057B74F690EC', 331);
const t206 = read(path.join(f206, 'sealer-observed-exit-v1.json'));
assert.equal(t206.childObservation.childRootPid, 47204);
assert.equal(t206.childObservation.observerPowerShellPid, 48108);
assert.equal(t206.childObservation.observedChildExitCode, 0);
for (const key of ['waitForExitReturned', 'stdoutDrainCompleted', 'stderrDrainCompleted']) {
    assert.equal(t206.childObservation[key], true, key);
}
assert.equal(hash(path.join(f206, 'sealer-v1.stdout.bin')), t206.childObservation.stdoutSha256);
assert.equal(hash(path.join(f206, 'sealer-v1.stderr.bin')), t206.childObservation.stderrSha256);
assert.equal(a206.index.sealerChildActualExit, 0);
const collections206 = ['collection-initial-v1.json', 'collection-closure-v1.json']
    .map(file => read(path.join(f206, file)));
let sourceCommands206 = 0;
const source206 = new Map();
for (const collection of collections206) {
    assert.equal(collection.failure, null);
    for (const command of collection.commands) {
        assert.equal(command.exitCode, 0, command.label);
        for (const key of ['waitForExitReturned', 'stdoutDrainCompleted', 'stderrDrainCompleted']) {
            assert.equal(command[key], true, `${command.label}:${key}`);
        }
        sourceCommands206++;
    }
    for (const item of collection.files) {
        verify(f206, item);
        if (['Original', 'Default'].includes(item.role)) {
            source206.set(`${item.role}:${item.logicalPath}`, item);
        }
    }
}
assert.equal(sourceCommands206, 70);
assert.equal(source206.size, 60);
const h206 = read(path.join(f206, 'assessment-v1.json'));
assert.equal(h206.disposition, 'SOURCE_ONLY_MATERIALITY_UNESTABLISHED_NO_CANDIDATE');
assert.equal(h206.cardinalityAndMateriality.materiality, 'UNESTABLISHED');
assert.equal(h206.scopePreservation.candidateSourceEdits, 0);
const result = {
    observedUtc: new Date().toISOString(),
    executedAcceptorSha256: hash(fileURLToPath(import.meta.url)),
    policySha256: hash(path.join(root, 'policy.json')),
    F150: {
        indexedFiles: a150.indexedFiles, indexedBytes: a150.indexedBytes,
        indexSha256: a150.indexSha256, wholeSourceEntries: 131,
        correctedRolePairs: 55, identicalRolePairs: 50, sourceCommandsBeforeFinalStatus: 32,
        finalSealerPid: 50152, finalSealerExit: 0, outerObserverPid: 6460,
        actualFinalTool: 'f150-246-seal005 completed with exit code 0',
        failed001AndUnusable003DerivedSummaryPreserved: true
    },
    F206: {
        indexedFiles: a206.indexedFiles, indexedBytes: a206.indexedBytes,
        indexSha256: a206.indexSha256, wholeRoleSourceFiles: source206.size,
        sourceCommandsBeforeFinalStatus: sourceCommands206,
        finalSealerPid: 47204, finalSealerExit: 0, outerObserverPid: 48108,
        actualFinalTool: 'f206-245-final-seal-v1 completed with exit code 0',
        browserRuntimeAndE2EUnrun: true
    },
    acceptanceBoundary: 'Complete indexed bytes, claimed source bytes and retained terminal receipts independently checked; not native/runtime/browser/performance qualification.',
    classificationForParentPublication: 'Source-qualified no material candidate; proposed rejection, never measured no-gain or universal impossibility.',
    ownersRetiredByThisHelper: false,
    officialCampaignFinalizationsByThisHelper: 0,
    productNativeStartsByThisHelper: 0,
    ownFinalToolExit: 'Not self-attested; bind actual enclosing tool completion after return.'
};
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify(result));
