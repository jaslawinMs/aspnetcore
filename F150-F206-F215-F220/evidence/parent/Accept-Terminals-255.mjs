import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const hash = file => sha(fs.readFileSync(file));
const output = path.join(root, 'accepted-terminals-255.json');
assert(!fs.existsSync(output), 'One-shot output already exists');

function verify(base, item) {
    const file = path.resolve(base, item.path);
    assert(file.toLowerCase().startsWith(`${base.toLowerCase()}${path.sep}`), item.path);
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.length, item.bytes, item.path);
    assert.equal(sha(bytes), item.sha256.toUpperCase(), item.path);
    return bytes.length;
}

function index(base, name, digest, count) {
    assert.equal(hash(path.join(base, name)), digest);
    const document = read(path.join(base, name));
    assert.equal(document.files.length, count);
    assert.equal(new Set(document.files.map(x => x.path.toLowerCase())).size, count);
    const bytes = document.files.reduce((sum, item) => sum + verify(base, item), 0);
    return { document, count, bytes, sha256: digest };
}

const b150 = path.join(root, 'finding-F150-246');
const s150 = index(b150, 'seal-005.json',
    '98ACDFC4D0378A1DA5981A9CE240B6AF5863E06AC9567C81297DD39FF5F88264', 295);
const t150 = read(path.join(b150, 'seal-005-launch.result.json'));
assert.equal(t150.sealerRootPid, 50152);
assert.equal(t150.outerPowerShellPid, 6460);
assert.equal(t150.sealerRootExitCode, 0);
for (const key of ['sealerRootWaitReturned', 'stdoutCopyAwaited', 'stderrCopyAwaited']) assert.equal(t150[key], true);
for (const stream of ['stdout', 'stderr']) {
    assert.equal(hash(path.join(b150, `seal-005-launch.${stream}.bin`)), t150[`${stream}Sha256`]);
}
assert.equal(t150.sealSha256, s150.sha256);
const audit150 = read(path.join(b150, 'audit-004', 'source-audit.json'));
assert.equal(audit150.verifiedWholeSourceEntries.length, 131);
for (const item of audit150.verifiedWholeSourceEntries) {
    assert.equal(item.wholeFile, true);
    verify(b150, item);
}
assert.equal(audit150.correctedRolePairs.length, 55);
assert.equal(audit150.correctedRolePairs.filter(x => x.identical).length, 50);
assert.equal(audit150.sourceReaderRoots.length, 32);
for (const command of audit150.sourceReaderRoots) {
    assert.equal(command.rootExitCode, 0);
    for (const key of ['rootWaitReturned', 'stdoutCopyAwaited', 'stderrCopyAwaited']) assert.equal(command[key], true);
}
for (const key of ['productNativeStarts', 'sdkActivations', 'builds', 'tests', 'benchmarkScenarioExecutions',
    'productOrCandidateSourceEdits', 'canonicalStatusOrCampaignWrites']) assert.equal(s150.document[key], 0, key);
assert.equal(read(path.join(b150, 'HANDOFF-F150-246.json')).disposition,
    'SOURCE_ONLY_BOUNDED_NO_MATERIAL_CANDIDATE_ESTABLISHED');

const b206 = path.join(root, 'finding-F206-245');
const s206 = index(b206, 'WHOLE-SEAL-v1.json',
    '6A0A5162A3B6BDF7E312025842E6C1EC1DECFFCC9477E3242E3A057B74F690EC', 331);
const t206 = read(path.join(b206, 'sealer-observed-exit-v1.json')).childObservation;
assert.equal(t206.childRootPid, 47204);
assert.equal(t206.observerPowerShellPid, 48108);
assert.equal(t206.observedChildExitCode, 0);
for (const key of ['waitForExitReturned', 'stdoutDrainCompleted', 'stderrDrainCompleted']) assert.equal(t206[key], true);
for (const stream of ['stdout', 'stderr']) {
    assert.equal(hash(path.join(b206, `sealer-v1.${stream}.bin`)), t206[`${stream}Sha256`]);
}
assert.equal(s206.document.sealerChildActualExit, 0);
const initial206 = read(path.join(b206, 'collection-initial-v1.json'));
const closure206 = read(path.join(b206, 'collection-closure-v1.json'));
assert(Array.isArray(initial206.copiedFiles));
assert(Array.isArray(closure206.files));
let commands206 = 0;
const sources206 = new Map();
for (const [collection, items] of [[initial206, initial206.copiedFiles], [closure206, closure206.files]]) {
    assert.equal(collection.failure, null);
    for (const command of collection.commands) {
        assert.equal(command.exitCode, 0, command.label);
        for (const key of ['waitForExitReturned', 'stdoutDrainCompleted', 'stderrDrainCompleted']) {
            assert.equal(command[key], true, `${command.label}:${key}`);
        }
        commands206++;
    }
    for (const item of items) {
        verify(b206, item);
        if (['Original', 'Default'].includes(item.role)) sources206.set(`${item.role}:${item.logicalPath}`, item);
    }
}
assert.equal(commands206, 70);
assert.equal(sources206.size, 60);
const h206 = read(path.join(b206, 'assessment-v1.json'));
assert.equal(h206.disposition, 'SOURCE_ONLY_MATERIALITY_UNESTABLISHED_NO_CANDIDATE');
assert.equal(h206.cardinalityAndMateriality.materiality, 'UNESTABLISHED');
assert.equal(h206.scopePreservation.candidateSourceEdits, 0);
const result = {
    observedUtc: new Date().toISOString(),
    executedAcceptorSha256: hash(fileURLToPath(import.meta.url)),
    previousFailure: {
        file: 'Accept-Terminals-254.mjs', sha256: hash(path.join(root, 'Accept-Terminals-254.mjs')),
        actualTool: 'autoperf-accept-terminals-254 completed with exit code 1',
        reason: 'F206 initial schema is copiedFiles, not closure files; no acceptance output or retirement was written.'
    },
    policySha256: hash(path.join(root, 'policy.json')),
    F150: {
        indexedFiles: s150.count, indexedBytes: s150.bytes, indexSha256: s150.sha256,
        wholeSourceEntries: 131, correctedRolePairs: 55, identicalRolePairs: 50,
        sourceCommandsBeforeFinalStatus: 32, finalSealerPid: 50152, finalSealerExit: 0, outerObserverPid: 6460,
        actualFinalTool: 'f150-246-seal005 completed with exit code 0',
        failed001AndUnusable003DerivedSummaryPreserved: true
    },
    F206: {
        indexedFiles: s206.count, indexedBytes: s206.bytes, indexSha256: s206.sha256,
        wholeRoleSourceFiles: 60, sourceCommandsBeforeFinalStatus: 70,
        finalSealerPid: 47204, finalSealerExit: 0, outerObserverPid: 48108,
        actualFinalTool: 'f206-245-final-seal-v1 completed with exit code 0',
        browserRuntimeAndE2EUnrun: true
    },
    acceptanceBoundary: 'Complete indexed bytes, claimed source bytes and retained terminal receipts independently checked; not native/runtime/browser/performance qualification.',
    classificationForPublication: 'Source-qualified no material candidate: proposed rejection, not measured no-gain or universal impossibility.',
    ownersRetiredByThisHelper: false,
    officialCampaignFinalizationsByThisHelper: 0,
    productNativeStartsByThisHelper: 0,
    ownFinalToolExit: 'Not self-attested; bind actual enclosing tool completion after return.'
};
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify(result));
