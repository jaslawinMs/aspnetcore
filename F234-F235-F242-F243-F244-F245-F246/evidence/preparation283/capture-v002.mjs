import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scope, repository, root, jsonNew, parseTree, captureWholeBatch } from './source-io-v001.mjs';

const pins = JSON.parse(fs.readFileSync(path.join(scope, 'source-pins-v001.json'), 'utf8'));
const producerPaths = [
    'src/Mvc/Mvc.ApiExplorer/src/DefaultApiDescriptionProvider.cs',
    'src/Mvc/Mvc.ApiExplorer/src/EndpointMetadataApiDescriptionProvider.cs'
];
const parserPaths = [
    'src/OpenApi/gen/XmlComments/XmlParameterComment.cs',
    'src/OpenApi/gen/XmlComments/XmlResponseComment.cs'
];
const selected = [];
for (const role of ['Original', 'Default']) {
    const producerTree = root(`metadata-only-${role}-two-exact-ApiExplorer-producer-memberships`, 'git', [
        '--no-pager', '-C', repository, 'ls-tree', '-r', '-z', '--full-tree', pins[role], '--', ...producerPaths
    ]);
    const members = parseTree(producerTree.stdout);
    assert.equal(members.length, producerPaths.length);
    jsonNew(`metadata-producer-tree-${role}-v001.json`, { role, commit: pins[role], rawRoot: producerTree.stem, metadataOnly: true, members });
    for (const file of producerPaths) {
        const found = members.filter(member => member.path === file);
        assert.equal(found.length, 1, `${role}:${file}`);
        assert.equal(found[0].type, 'blob');
        selected.push({ role, commit: pins[role], ...found[0], membershipEvidence: producerTree.stem });
    }
    const tree = JSON.parse(fs.readFileSync(path.join(scope, `metadata-tree-${role}-v001.json`), 'utf8'));
    for (const file of parserPaths) {
        const found = tree.members.filter(member => member.path === file);
        assert.equal(found.length, 1, `${role}:${file}`);
        assert.equal(found[0].type, 'blob');
        selected.push({ role, commit: pins[role], ...found[0], membershipEvidence: tree.rawRoot });
    }
}
jsonNew('selection-before-whole-capture-v002.json', {
    additionalLogicalPathsPerRole: 4, cumulativeLogicalPathsPerRole: 15,
    budgetClosesAfterThisBatch: true, members: selected
});
const captured = captureWholeBatch(selected, 'whole-source-final-four-inputs-per-role-exact-binary-cat-file-batch');
jsonNew('whole-inputs-v002.json', captured);
const original = new Map(captured.members.filter(member => member.role === 'Original').map(member => [member.path, member]));
jsonNew('role-byte-comparison-v002.json', {
    comparisons: captured.members.filter(member => member.role === 'Default').map(member => ({
        path: member.path, Original: original.get(member.path).commitPath, Default: member.commitPath,
        sameMode: original.get(member.path).mode === member.mode,
        sameGitBlobId: original.get(member.path).oid === member.oid,
        sameWholeByteSha256: original.get(member.path).sha256 === member.sha256
    }))
});
root('metadata-only-bounded-admitted-controller-test-history-at-Original', 'git', [
    '--no-pager', '-C', repository, 'log', '--max-count=8', '--follow', '--format=%H%x09%aI%x09%s', pins.Original, '--',
    'src/OpenApi/test/Microsoft.AspNetCore.OpenApi.SourceGenerators.Tests/OperationTests.Controllers.cs'
]);
jsonNew('observed-outer-receipts-v003.json', {
    observed: [{ shellId: 'f243-246-283-capture-001', reportedState: 'completed', reportedExitCode: 0 }],
    note: 'Already-returned tool receipt only; no prediction for this helper or final outer exit.'
});
console.log(JSON.stringify({ completeAdditionalWholeMembers: captured.members.length, cumulativeWholeInputsPerRole: 15, remainingPerRole: 0, sourceBodyBudgetClosed: true, rawBinaryFrameFile: captured.rawFrameFile }, null, 2));
