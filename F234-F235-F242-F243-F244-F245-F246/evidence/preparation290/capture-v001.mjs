import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { scope, inherited, repository, pins, guard, jsonNew, writeNew, root, parseTree, verifyInheritedBytes, readJson, sha256 } from './source-data-v001.mjs';

const initial = guard('initial-v001');
writeNew('registration-289.raw.json', initial.registrationBytes);
writeNew('initial-campaign.raw.json', initial.campaignBytes);
jsonNew('inherited-byte-chain-before-v001.json', verifyInheritedBytes());
jsonNew('acceptance-and-fixed-budget-v001.json', {
    rolePinsReusedExactly: pins,
    noFreshDefaultObservationOrCheckout: true,
    prior283RepositoryBodiesPerRole: 15,
    prior283InjectedInstructionContextsPerRole: 1,
    prior283TotalIfConservativelyCharged: 16,
    oldScopeComplianceRetroactivelyApproved: false,
    maximumNewRepositoryBodiesPerRole: 4,
    newCumulativeRepositoryBodyCapPerRole: 19,
    injectedCommonInstructionContextCountPerRole: 1,
    cumulativeChargedInputCapPerRole: 20,
    priorDirectGitGhRoots: 14,
    maximumNewDirectRootsIncludingFailures: 3,
    maximumAggregateDirectRoots: 17,
    acceptance: [
        'Fresh actual ID/exact290scope/pending-four/no-lease/no-HOLD/nonquiesced checks before every Git root.',
        'Two metadata-only trees first; select one unique filename counterpart per admitted logical class and role before any body request.',
        'No missing-body retry, guessed replacement, fourth root, extra class, or recursive dependency capture.',
        'Preserve raw binary whole bodies, independent tree membership/modes, batch framing, IDs, SHA256, all requests/streams/failures/terminal observations.',
        'Four separate source decisions, explicit producer delegations and unobserved runtime/cardinality/frequency/materiality boundaries.',
        'Preserve old283 exact186-file byte chain and caveats unchanged; seal new exact inventory and leave final outer exit for actual returned receipt.'
    ]
});

const classes = [
    { key: 'AddOpenApiServiceRegistration', basename: 'OpenApiServiceCollectionExtensions.cs', prefix: 'src/OpenApi/src/' },
    { key: 'OpenApiOptionsTransformerStorage', basename: 'OpenApiOptions.cs', prefix: 'src/OpenApi/src/' },
    { key: 'RequestDelegateFactoryParameterMetadataProducer', basename: 'RequestDelegateFactory.cs', prefix: 'src/Http/Http.Extensions/src/' },
    { key: 'ResultsOfTTypedResultMetadataProducer', basename: 'ResultsOfT.Generated.cs', prefix: 'src/Http/Http.Results/src/' }
];
const selected = [];
for (const role of ['Original', 'Default']) {
    const response = root(`metadata-only-${role}-four-logical-class-path-confirmation-before-body-batch`, [
        '--no-pager', '-C', repository, 'ls-tree', '-r', '-z', '--full-tree', pins[role], '--',
        'src/OpenApi/src', 'src/Http/Http.Extensions/src', 'src/Http/Http.Results/src'
    ]);
    const members = parseTree(response.stdout);
    jsonNew(`metadata-tree-${role}-v001.json`, { role, commit: pins[role], rawRoot: response.stem, metadataOnly: true, members });
    const candidates = classes.map(logical => ({
        ...logical,
        matches: members.filter(member => member.type === 'blob'
            && member.path.startsWith(logical.prefix)
            && member.path.substring(member.path.lastIndexOf('/') + 1) === logical.basename)
    }));
    jsonNew(`metadata-class-confirmation-${role}-v001.json`, { role, candidates, bodyRequestNotStarted: true });
    for (const logical of candidates) {
        if (logical.matches.length !== 1) {
            jsonNew('STOP-missing-or-nonunique-metadata-v001.json', {
                role, logicalClass: logical.key, matches: logical.matches,
                candidateFilenameMetadataOnly: members.filter(member =>
                    /OpenApiOptions|OpenApiServiceCollectionExtensions|RequestDelegateFactory|ResultsOfT/.test(member.path)),
                noBodyBatchStarted: true, noGuessedReplacementOrRetry: true
            });
            assert.fail(`STOP: ${role} ${logical.key} must have exactly one confirmed filename counterpart`);
        }
        selected.push({ role, logicalClass: logical.key, commit: pins[role], ...logical.matches[0], membershipRoot: response.stem });
    }
}
assert.equal(selected.length, 8);
for (const logical of classes) {
    const pair = selected.filter(member => member.logicalClass === logical.key);
    assert.equal(pair.length, 2);
    assert.equal(pair[0].path, pair[1].path, 'Role-specific counterparts require explicit review before any body request');
}
const oldMembers = ['whole-inputs-v001.json', 'whole-inputs-v002.json'].flatMap(file =>
    readJson(path.join(inherited, file)).members);
for (const role of ['Original', 'Default']) {
    const old = oldMembers.filter(member => member.role === role);
    const added = selected.filter(member => member.role === role);
    assert.equal(old.length, 15);
    assert.equal(added.length, 4);
    const paths = new Set([...old, ...added].map(member => member.path));
    assert.equal(paths.size, 19);
}
jsonNew('confirmed-selection-before-first-body-batch-v001.json', {
    confirmedUtc: new Date().toISOString(), metadataOnlyConfirmationCompleted: true,
    metadataDirectRootsAlreadyCompleted: 2, firstBodyBatchNotYetRequested: true,
    newWholeBodiesPerRole: 4, cumulativeRepositoryBodiesPerRole: 19,
    injectedInstructionContextsPerRole: 1, cumulativeChargedInputsPerRole: 20,
    members: selected
});
console.log(JSON.stringify({ metadataConfirmedBeforeBodyBatch: true, selectedCommitPaths: selected.map(member => `${member.commit}:${member.path}`) }, null, 2));
const stdin = Buffer.from(selected.map(member => `${member.commit}:${member.path}`).join('\n') + '\n');
const batch = root('whole-four-new-confirmed-bodies-per-role-exact-binary-cat-file-batch-no-retry', [
    '--no-pager', '-C', repository, 'cat-file', '--batch'
], stdin);
const buffer = batch.stdout;
let offset = 0;
const captured = selected.map((member, index) => {
    const start = offset;
    const end = buffer.indexOf(10, start);
    assert.ok(end >= start, 'Missing whole-body header; no replacement/retry authorized');
    const header = buffer.subarray(start, end).toString('ascii');
    const match = /^([0-9a-f]{40}) blob ([0-9]+)$/.exec(header);
    assert.ok(match, `Missing/invalid body: ${header}; no replacement/retry authorized`);
    const size = Number(match[2]);
    const bodyStart = end + 1;
    const bodyEnd = bodyStart + size;
    assert.ok(bodyEnd < buffer.length);
    assert.equal(buffer[bodyEnd], 10);
    const bytes = buffer.subarray(bodyStart, bodyEnd);
    assert.equal(match[1], member.oid);
    const gitOid = crypto.createHash('sha1').update(Buffer.from(`blob ${size}\0`)).update(bytes).digest('hex');
    assert.equal(gitOid, member.oid);
    const file = `whole\\${member.role}\\${member.path.replaceAll('/', '\\')}`;
    writeNew(file, bytes);
    offset = bodyEnd + 1;
    return {
        ...member, commitPath: `${member.commit}:${member.path}`,
        capturedFile: file, fullBytes: size, sha256: sha256(bytes), recomputedGitBlobId: gitOid,
        rawBatchRoot: batch.stem, rawHeader: header, memberIndex: index,
        rawFrameHeaderOffset: start, rawBodyOffset: bodyStart, rawFrameEndExclusive: offset,
        wholeBody: true
    };
});
assert.equal(offset, buffer.length, 'Unexpected unselected/trailing raw batch bytes');
jsonNew('whole-inputs-v001.json', {
    capturedUtc: new Date().toISOString(), rawFrameFile: `${batch.stem}.stdout.raw`,
    exactMemberCount: captured.length, newRepositoryBodiesPerRole: 4,
    cumulativeRepositoryBodiesPerRole: 19, injectedInstructionContextsPerRole: 1,
    cumulativeChargedInputsPerRole: 20, members: captured
});
jsonNew('role-byte-comparison-v001.json', {
    comparisons: classes.map(logical => {
        const before = captured.find(member => member.role === 'Original' && member.logicalClass === logical.key);
        const after = captured.find(member => member.role === 'Default' && member.logicalClass === logical.key);
        return {
            logicalClass: logical.key, path: before.path,
            Original: before.commitPath, Default: after.commitPath,
            originalOid: before.oid, defaultOid: after.oid,
            sameGitBlobId: before.oid === after.oid,
            sameMode: before.mode === after.mode,
            sameWholeBytes: before.sha256 === after.sha256
        };
    })
});
console.log(JSON.stringify({
    newWholeMembers: captured.length, newBodiesPerRole: 4, cumulativeRepositoryBodiesPerRole: 19,
    cumulativeChargedInputsPerRole: 20, newDirectRoots: 3, aggregateDirectRoots: 17,
    repositoryBodyAndDirectRootBudgetsClosed: true, rawFrameFile: `${batch.stem}.stdout.raw`
}, null, 2));
