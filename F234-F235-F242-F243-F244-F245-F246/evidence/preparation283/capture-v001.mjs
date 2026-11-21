import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scope, repository, root, jsonNew, captureWholeBatch } from './source-io-v001.mjs';

const pins = JSON.parse(fs.readFileSync(path.join(scope, 'source-pins-v001.json'), 'utf8'));
const paths = [
    '.github/instructions/cross-cutting-guidance.instructions.md',
    'src/OpenApi/README.md',
    'src/OpenApi/gen/XmlCommentGenerator.cs',
    'src/OpenApi/gen/XmlCommentGenerator.Emitter.cs',
    'src/OpenApi/gen/XmlCommentGenerator.Parser.cs',
    'src/OpenApi/gen/XmlComments/XmlComment.cs',
    'src/OpenApi/test/Microsoft.AspNetCore.OpenApi.SourceGenerators.Tests/OperationTests.MinimalApis.cs',
    'src/OpenApi/test/Microsoft.AspNetCore.OpenApi.SourceGenerators.Tests/OperationTests.Controllers.cs',
    'src/OpenApi/test/Microsoft.AspNetCore.OpenApi.SourceGenerators.Tests/SnapshotTestHelper.cs',
    'src/OpenApi/test/Microsoft.AspNetCore.OpenApi.SourceGenerators.Tests/snapshots/OperationTests.DoesNotMisattributeDocumentationWhenMemberNameCollidesWithAnotherBindingName#OpenApiXmlCommentSupport.generated.verified.cs',
    'src/OpenApi/src/Services/OpenApiDocumentService.cs'
];
const selected = [];
for (const role of ['Original', 'Default']) {
    const tree = JSON.parse(fs.readFileSync(path.join(scope, `metadata-tree-${role}-v001.json`), 'utf8'));
    for (const file of paths) {
        const found = tree.members.filter(member => member.path === file);
        assert.equal(found.length, 1, `${role}:${file}`);
        assert.equal(found[0].type, 'blob');
        selected.push({ role, commit: pins[role], ...found[0], membershipEvidence: tree.rawRoot });
    }
}
jsonNew('selection-before-whole-capture-v001.json', { logicalPathsPerRole: paths.length, remainingPerRole: 15 - paths.length, members: selected });
const captured = captureWholeBatch(selected, 'whole-source-11-inputs-per-role-exact-binary-cat-file-batch');
jsonNew('whole-inputs-v001.json', captured);
const original = new Map(captured.members.filter(member => member.role === 'Original').map(member => [member.path, member]));
jsonNew('role-byte-comparison-v001.json', {
    comparisons: captured.members.filter(member => member.role === 'Default').map(member => ({
        path: member.path, Original: original.get(member.path).commitPath, Default: member.commitPath,
        sameMode: original.get(member.path).mode === member.mode,
        sameGitBlobId: original.get(member.path).oid === member.oid,
        sameWholeByteSha256: original.get(member.path).sha256 === member.sha256
    }))
});
root('metadata-only-corrected-bounded-OpenApi-history-Original-to-observed-Default', 'git', [
    '--no-pager', '-C', repository, 'log', '--max-count=16', '--format=%H%x09%aI%x09%s', `${pins.Original}..${pins.Default}`, '--',
    'src/OpenApi/gen', 'src/OpenApi/test/Microsoft.AspNetCore.OpenApi.SourceGenerators.Tests'
]);
root('metadata-only-bounded-owner-emitter-history-at-Original', 'git', [
    '--no-pager', '-C', repository, 'log', '--max-count=8', '--follow', '--format=%H%x09%aI%x09%s', pins.Original, '--',
    'src/OpenApi/gen/XmlCommentGenerator.Emitter.cs'
]);
jsonNew('observed-outer-receipts-v002.json', {
    observed: [{ shellId: 'f243-246-283-discovery-001', reportedState: 'completed', reportedExitCode: 0 }],
    note: 'Already-returned tool receipt only; no prediction for this helper or final outer exit.'
});
console.log(JSON.stringify({ completeWholeMembers: captured.members.length, logicalInputsPerRole: paths.length, remainingPerRole: 15 - paths.length, rawBinaryFrameFile: captured.rawFrameFile }, null, 2));
