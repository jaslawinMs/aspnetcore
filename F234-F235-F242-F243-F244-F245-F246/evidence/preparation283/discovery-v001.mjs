import assert from 'node:assert/strict';
import { original, reservedHead, repository, root, jsonNew, parseTree } from './source-io-v001.mjs';

jsonNew('acceptance-and-budgets-v001.json', {
    findings: ['F243', 'F244', 'F245', 'F246'],
    boundaries: ['SOURCE ONLY', 'No edits outside this new evidence scope', 'No product-native execution or runtime/performance assertions'],
    acceptance: [
        'Fresh exact ownership/scope/lease/HOLD/quiescence/pending guards before each Git/gh root.',
        'Fresh upstream dotnet/aspnetcore default commit pinned immutably, distinct from reserved checkout HEAD.',
        'At most 15 whole logical product/doc/test/config/guidance inputs per role and 32 direct Git/gh roots including failures.',
        'Complete selected source bytes with independent ls-tree membership/modes, binary cat-file frames, commit:path, object IDs and SHA256.',
        'Four separate source decisions tracing generator/template, emitted helper, admitted producer/caller, cardinality/frequency and behavior contracts.',
        'No duplicate/alias claim without executable-owner plus behavior proof. F201/F202/F203 remain outside this decision set.',
        'If finite source closure exceeds budget, stop with an exact additional-source proposal and honest unobserved boundaries.',
        'Seal actual artifact inventory and terminal receipts, never predict the final outer tool exit.'
    ],
    directRootMaximum: 32, wholeInputMaximumPerRole: 15,
    commonGuidanceCharging: 'Each common whole guidance input charged to both roles.',
    materialityRequirement: 'Source evidence of real producers only; no fabricated huge docs, repeated operations, isolated membership loops, runtime counts or measured no-gain claims.'
});
jsonNew('observed-outer-receipts-v001.json', {
    kind: 'Transcription of already-returned outer tool receipts; not prospective self-exit evidence',
    observed: [
        { shellId: 'f243-246-283-metadata-001', reportedState: 'completed', reportedExitCode: 0 },
        { shellId: 'f243-246-283-guard-001', reportedState: 'completed', reportedExitCode: 0 }
    ]
});

const head = root('metadata-only-reserved-checkout-HEAD-not-Default', 'git', ['--no-pager', '-C', repository, 'rev-parse', 'HEAD']).stdout.toString('ascii').trim();
assert.equal(head, reservedHead);
const repo = JSON.parse(root('metadata-only-fresh-upstream-repository-default-branch', 'gh', ['api', 'repos/dotnet/aspnetcore']).stdout.toString('utf8'));
assert.equal(repo.full_name, 'dotnet/aspnetcore');
const commitResult = root('metadata-only-fresh-upstream-default-immutable-commit', 'gh', ['api', `repos/dotnet/aspnetcore/commits/${encodeURIComponent(repo.default_branch)}`]);
const upstream = JSON.parse(commitResult.stdout.toString('utf8'));
assert.match(upstream.sha, /^[0-9a-f]{40}$/);
const defaultCommit = upstream.sha;
const availability = root('metadata-only-pinned-Default-object-availability', 'git', ['--no-pager', '-C', repository, 'cat-file', '-e', `${defaultCommit}^{commit}`], undefined, true);
if (availability.status !== 0) {
    root('object-store-only-fetch-pinned-Default-no-checkout-no-fetch-head', 'git', ['--no-pager', '-C', repository, 'fetch', '--no-tags', '--no-write-fetch-head', 'https://github.com/dotnet/aspnetcore.git', defaultCommit]);
}
const pins = {
    observedUtc: new Date().toISOString(), upstreamRepository: repo.full_name, defaultBranch: repo.default_branch,
    Original: original, Default: defaultCommit, reservedCheckoutHead: head,
    reservedCheckoutNotUsedAsDefault: true, upstreamCommitMetadataRoot: commitResult.stem
};
jsonNew('source-pins-v001.json', pins);
for (const [role, commit] of [['Original', original], ['Default', defaultCommit]]) {
    const tree = root(`metadata-only-${role}-OpenApi-and-guidance-tree-membership-no-source-bodies`, 'git', [
        '--no-pager', '-C', repository, 'ls-tree', '-r', '-z', '--full-tree', commit, '--',
        'src/OpenApi', '.github/instructions/cross-cutting-guidance.instructions.md', 'AGENTS.md'
    ]);
    const members = parseTree(tree.stdout);
    jsonNew(`metadata-tree-${role}-v001.json`, { role, commit, rawRoot: tree.stem, metadataOnly: true, members });
    console.log(JSON.stringify({
        role, commit, members: members.length,
        candidatePathMetadataOnly: members.filter(member =>
            /AGENTS\.md$|cross-cutting-guidance|XmlComment|OperationTests\.cs$|SourceGenerators\.Tests\.csproj$|OpenApiDocumentService\.cs$|OpenApi.*Extensions\.cs$|Generator.*Test.*Base|Xml.*\.cs$/.test(member.path)
            && !member.path.includes('/snapshots/')).map(member => member.path)
    }, null, 2));
}
root('metadata-only-bounded-OpenApi-history-Original-to-observed-Default', 'git', [
    '--no-pager', '-C', repository, 'log', '--max-count=16', '--format=%H%x09%aI%x09%s', `${original}..${defaultCommit}`, '--',
    'src/OpenApi/src/SourceGenerators', 'src/OpenApi/test/Microsoft.AspNetCore.OpenApi.SourceGenerators.Tests/OperationTests.cs'
]);
console.log(JSON.stringify(pins, null, 2));
