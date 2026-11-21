import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { output, owner, guard, readJson, writeJson, gitOid, sha256 } from './source-core-v001.mjs';

const observedStartUtc = new Date().toISOString();
const deadline = Date.now() + 120000;
const sealName = 'SEAL-282.json';
assert.equal(fs.existsSync(path.join(output, sealName)), false, 'Never overwrite or replay a seal');
writeJson('launches\\stage006\\actual-outer-tool-receipt.json', {
    tool: 'functions.powershell', shellId: '4718', actualExitCodeAfterToolReturned: 0,
    observedOutput: { helperPid: 41048, actualHelperExitCode: 0, rootExited: true,
        stdoutComplete: true, stderrComplete: true, creationBoundExpired: false, exception: null,
        creationUtc: '2026-11-21T04:48:03.4495411Z', observedUtc: '2026-11-21T04:48:04.4200206Z' },
    notProspectiveSelfExit: true
});
const finalGuard = guard('final-seal');
const verification = readJson('SOURCE-VERIFICATION.json');
const qualification = readJson('QUALIFICATION-F242-282.json');
const finiteProposal = readJson('FINITE-SOURCE-GAPS.json');
const roles = readJson('metadata\\roles.json');
assert.equal(verification.owner, owner);
assert.equal(verification.directGitGhSourceRoots.used, 18);
assert.equal(verification.selectedWholeBodyBudget.Original, 15);
assert.equal(verification.selectedWholeBodyBudget.Default, 15);
assert.equal(qualification.disposition.recommendationToParent, 'source-only-no-material-candidate');
assert.equal(qualification.disposition.notMeasuredNoGain, true);
assert.equal(finiteProposal.currentWholeBodyBudget.closed, true);
assert.equal(finiteProposal.optionalSourceOnlyExpansionIfParentRequiresStrongerStaticClosure.requiresSeparateParentRegistrationAndGO, true);
const captures = fs.readdirSync(path.join(output, 'inputs')).filter(name => /^capture-.+\.json$/.test(name))
    .flatMap(name => readJson(`inputs\\${name}`));
assert.equal(captures.length, 32);
const rawInputLookup = new Map();
for (const record of captures) {
    const raw = fs.readFileSync(path.join(output, record.rawPath));
    assert.equal(raw.length, record.bytes);
    assert.equal(sha256(raw), record.sha256);
    assert.equal(gitOid(record.type, raw), record.gitObjectId);
    assert.equal(record.commit, roles[record.role]);
    const framed = fs.readFileSync(path.join(output, record.batchRoot, 'stdout.bin'));
    assert.equal(framed.subarray(record.frame.headerStart, record.frame.headerEndExclusive).toString('ascii'), record.frame.header);
    assert.equal(framed[record.frame.headerEndExclusive], 10);
    assert.equal(framed[record.frame.trailingNewlineOffset], 10);
    assert.ok(raw.equals(framed.subarray(record.frame.bodyStart, record.frame.bodyEndExclusive)));
    rawInputLookup.set(record.rawPath, record);
}
for (const role of ['Original', 'Default']) {
    assert.equal(captures.filter(record => record.role === role && record.type === 'blob').length, 15);
    assert.equal(captures.filter(record => record.role === role && record.type === 'commit').length, 1);
}
const knownStageTerminals = [];
for (const label of ['stage001', 'stage002', 'stage003', 'stage004', 'stage005', 'stage006']) {
    const terminal = readJson(`launches\\${label}\\terminal.json`);
    const actualOuter = readJson(`launches\\${label}\\actual-outer-tool-receipt.json`);
    assert.equal(terminal.actualHelperExitCode, 0);
    assert.equal(terminal.rootExited, true);
    assert.equal(terminal.stdoutComplete, true);
    assert.equal(terminal.stderrComplete, true);
    assert.equal(terminal.creationBoundExpired, false);
    assert.equal(terminal.exception, null);
    assert.equal(actualOuter.actualExitCodeAfterToolReturned, 0);
    assert.equal(actualOuter.observedOutput.helperPid, terminal.helperPid);
    knownStageTerminals.push({
        label, helperPid: terminal.helperPid, actualHelperExitCode: terminal.actualHelperExitCode,
        actualOuterToolShellId: actualOuter.shellId, actualOuterToolExitCode: actualOuter.actualExitCodeAfterToolReturned,
        stdoutBytes: fs.statSync(path.join(output, 'launches', label, 'stdout.bin')).size,
        stderrBytes: fs.statSync(path.join(output, 'launches', label, 'stderr.bin')).size,
        rootAndBothStreamsObservedTerminal: true
    });
}
const sourceDirectories = fs.readdirSync(path.join(output, 'roots'), { withFileTypes: true })
    .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
assert.equal(sourceDirectories.length, 18);
for (const name of sourceDirectories) {
    const terminal = readJson(`roots\\${name}\\terminal.json`);
    assert.equal(terminal.actualDirectRootSuccess, true);
    assert.equal(terminal.exitCode, 0);
    assert.equal(terminal.completePipesObserved, true);
    assert.equal(terminal.deadlineExpired, false);
    for (const stream of ['stdout', 'stderr']) {
        const bytes = fs.readFileSync(path.join(output, 'roots', name, `${stream}.bin`));
        assert.equal(bytes.length, terminal[`${stream}Bytes`]);
        assert.equal(sha256(bytes), terminal[`${stream}Sha256`]);
    }
}
writeJson('FINAL-KNOWN-TERMINALS.json', {
    observedUtc: new Date().toISOString(), knownStageTerminals,
    directGitGhSourceRoots: 18, directGitGhSourceRootFailures: 0,
    directGitGhSourceRootsWithExit0AndBothPipeEndings: 18,
    knownFailedSourceOrStageHelpers: 0,
    finalSealerAndOuterWrapperStillExecutingNoOwnExitKnown: true,
    observerLimit: 'Explicit direct roots and streams, not an exhaustive descendant census or unrelated-process absence.',
    finalOuterToolReceiptBelongsOutsideThisSealAndMustBeRetainedAfterReturnByParent: true
});
writeJson('FINAL-SEALER-INVOCATION.json', {
    helper: 'seal-inventory-v001.mjs', launcher: 'invoke-sealer-v001.ps1',
    helperPid: process.pid, observedStartUtc,
    helperInternalCooperativeDeadlineMilliseconds: 120000,
    launcherIndependentRootAndFullStreamCreationBoundMilliseconds: 150000,
    directChildrenSpawnedByThisSealer: 0,
    ownActualExitUnknownUntilLauncherObservesIt: true,
    outerPowerShellToolExitUnknownUntilToolReturns: true,
    finalSourceGuardPolicySha256: finalGuard.policySha256
});
function checkDeadline() {
    assert.ok(Date.now() < deadline, 'Cooperative seal creation deadline exceeded');
}
function enumerate(directory, result = []) {
    checkDeadline();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        assert.equal(entry.isSymbolicLink(), false, 'No reparse/symlink traversal is authorized');
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) enumerate(full, result);
        else {
            assert.equal(entry.isFile(), true);
            result.push(path.relative(output, full));
        }
    }
    assert.ok(result.length <= 10000, 'Finite inventory bound exceeded; never truncate');
    return result;
}
function category(relative) {
    if (rawInputLookup.has(relative)) return 'whole-raw-git-input';
    if (/\.(mjs|ps1)$/.test(relative)) return 'helper';
    if (relative.startsWith('controls\\')) return 'control-snapshot-or-guard';
    if (relative.startsWith('roots\\')) return 'direct-source-root-command-stream-or-terminal';
    if (relative.startsWith('launches\\')) return 'helper-launch-command-stream-or-actual-terminal';
    if (relative.startsWith('inputs\\')) return 'git-input-provenance-binding';
    if (relative.startsWith('metadata\\')) return 'source-filename-history-role-or-budget-metadata';
    return 'report-proposal-disclosure-or-verification';
}
const relativeFiles = enumerate(output).sort();
assert.equal(relativeFiles.includes(sealName), false);
const files = relativeFiles.map(relative => {
    checkDeadline();
    const bytes = fs.readFileSync(path.join(output, relative));
    const row = { path: relative, bytes: bytes.length, sha256: sha256(bytes), category: category(relative) };
    const source = rawInputLookup.get(relative);
    if (source) Object.assign(row, {
        sourceRole: source.role, commitPath: source.commitPath, gitObjectId: source.gitObjectId,
        gitObjectType: source.type, gitMode: source.mode, rawSourceWholeBytes: true
    });
    return row;
});
assert.deepEqual(enumerate(output).sort(), relativeFiles, 'Inventory filenames changed during sealing');
for (const row of files) {
    checkDeadline();
    const bytes = fs.readFileSync(path.join(output, row.path));
    assert.equal(bytes.length, row.bytes);
    assert.equal(sha256(bytes), row.sha256, `Artifact changed during two-pass seal: ${row.path}`);
}
const seal = {
    schemaVersion: 1, finding: 'F242', turn: 282, actualOwner: owner,
    sealedUtc: new Date().toISOString(), outputRoot: output,
    inventoryScope: 'Every file produced under this isolated output root, excluding only SEAL-282.json itself.',
    selfExclusion: 'An inventory cannot contain its own final cryptographic hash. Exact seal SHA256 is emitted to the actual tool receipt and parent handoff.',
    twoObservedPassesHadIdenticalNamesLengthsAndHashes: true,
    noAtomicSnapshotOrExternalWriterExclusionClaim: true,
    roles, wholeLogicalGitBodyInputsPerRole: { Original: 15, Default: 15 },
    commonRepositoryGuidanceChargedPerRole: 3, wholeRawGitObjects: 32,
    directGitGhSourceRoots: { usedIncludingFailuresAndReservedNavigation: 18, maximum: 32, failures: 0 },
    sourceDisposition: qualification.disposition.recommendationToParent,
    runtimeAndPerformanceNotQualified: true,
    sourceBodyBudgetClosedAndNoContinuationAuthorized: true,
    finalGuardPolicySha256: finalGuard.policySha256,
    knownStageRootAndStreamReceiptsIncluded: knownStageTerminals.length,
    actualFinalSealerAndOuterToolExitUnknownAtWrite: true,
    parentMustRetainActualFinalToolReceiptAfterReturn: true,
    nativeObserverLimit: 'Direct source/helper roots and streams only. No exhaustive descendant or unrelated-process closure proof.',
    artifactCountExcludingSealSelf: files.length,
    totalArtifactBytesExcludingSealSelf: files.reduce((total, row) => total + row.bytes, 0),
    files
};
writeJson(sealName, seal);
const sealBytes = fs.readFileSync(path.join(output, sealName));
console.log(JSON.stringify({
    sealPath: path.join(output, sealName), sealBytes: sealBytes.length, sealSha256: sha256(sealBytes),
    artifactsExcludingSealSelf: files.length, artifactsIncludingSealSelf: files.length + 1,
    inventoriedBytesExcludingSealSelf: seal.totalArtifactBytesExcludingSealSelf,
    wholeInputsPerRole: 15, gitGhRoots: 18, sourceRootFailures: 0,
    disposition: seal.sourceDisposition,
    ownActualExitNotPredicted: true, parentActualOuterToolReceiptRequiredAfterReturn: true
}));
