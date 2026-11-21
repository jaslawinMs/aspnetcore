import fs from 'node:fs';
import path from 'node:path';
import { ROOT, ORIGINAL, utc, writeJson, git, captureFile } from './collect_source_213.mjs';

const roleRecord = JSON.parse(fs.readFileSync(path.join(ROOT, 'SOURCE-ROLES.json')));
const DEFAULT = roleRecord.observedDefaultCommit;
for (const [role, revision] of [['Original', ORIGINAL], ['Default', DEFAULT]]) {
    captureFile(role, revision, 'src/Components/test/E2ETest/Infrastructure/ServerFixtures/AspNetSiteServerFixture.cs');
    captureFile(role, revision, 'src/Mvc/Mvc.Core/src/Infrastructure/MvcCoreMvcOptionsSetup.cs');
    const tree = git(`discovery-${role}-finite-header-definition-paths`, [
        'ls-tree', '-r', '--name-only', revision, '--',
        'src/Servers/Kestrel/Core/src/Internal/Http',
        'src/Http/Http/src',
    ]).toString('utf8').trim().split(/\r?\n/);
    const selected = tree.filter(gitPath =>
        gitPath.endsWith('/Http1ParsingHandler.cs') ||
        gitPath.endsWith('/DefaultHttpRequest.cs') ||
        gitPath.endsWith('/HttpProtocol.FeatureCollection.cs'));
    for (const gitPath of selected) captureFile(role, revision, gitPath);
    const headerDecoders = git(`discovery-${role}-header-decoder-definition-paths`, [
        'grep', '-l', 'GetRequestHeaderString', revision, '--',
        'src/Servers/Kestrel/Core/src/Internal/Infrastructure', 'src/Shared/ServerInfrastructure',
    ], [0, 1]).toString('utf8').trim().split(/\r?\n/).filter(Boolean)
        .map(row => row.slice(row.indexOf(':') + 1));
    if (headerDecoders.length > 8) throw new Error('Finite decoder source selection exceeded bound');
    for (const gitPath of headerDecoders) captureFile(role, revision, gitPath);
}

const sourceManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'source-manifest.json')));
const externalManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'external-source-manifest.json')));
function comparison(manifest) {
    return manifest.filter(item => item.role === 'Original' && item.present !== false)
        .map(original => {
            const current = manifest.find(item => item.role === 'Default' && item.gitPath === original.gitPath);
            return {
                gitPath: original.gitPath,
                originalRevision: original.revision,
                defaultRevision: current?.revision ?? null,
                originalSha256: original.sha256,
                defaultSha256: current?.sha256 ?? null,
                sameCompleteBytes: original.sha256 === current?.sha256,
                originalArtifact: original.artifact,
                defaultArtifact: current?.artifact ?? null,
            };
        });
}
writeJson('SOURCE-COMPARISON.json', {
    recordedUtc: utc(), aspnetcore: comparison(sourceManifest), declaredDependencySource: comparison(externalManifest),
    boundary: 'Byte identity/source comparison only; not compiler, loaded-image or runtime verification',
});

const issue = JSON.parse(fs.readFileSync(path.join(ROOT, 'commands', 'related-upstream-null-array-issue.stdout.txt')));
const comments = JSON.parse(fs.readFileSync(path.join(ROOT, 'commands', 'related-upstream-null-array-comments.stdout.txt')));
writeJson('related-work-null-array-excerpts.json', {
    issue: { number: issue.number, title: issue.title, url: issue.html_url, state: issue.state, body: issue.body },
    commentPageBound: 30,
    returnedComments: comments.length,
    reportedIssueComments: issue.comments,
    selectedComments: comments
        .filter(comment => [1276803449, 1276803453, 1276803459].includes(comment.id))
        .map(comment => ({ id: comment.id, author: comment.user.login, url: comment.html_url, body: comment.body })),
    relevance: 'Distinguishes implicit array conversion from ToArray and warns that actual server header collection implementations differ. Not a proposed F193 fix or proof of a hot path.',
});
writeJson('navigation-tool-results.json', {
    recordedUtc: utc(),
    tools: [
        {
            tool: 'functions.lsp', parameters: {
                operation: 'documentSymbol',
                file: String.raw`C:\src\aspnetcore\src\Components\test\testassets\Components.TestServer\Controllers\PersonController.cs`,
            },
            result: 'PersonController.Delete() : string at line 48; member identity only',
        },
        {
            tool: 'functions.lsp', parameters: {
                operation: 'hover',
                file: String.raw`C:\src\aspnetcore\src\Components\test\testassets\Components.TestServer\Controllers\PersonController.cs`,
                line: 54, character: 84,
            },
            result: 'No hover information available at this position.',
        },
        {
            tool: 'functions.lsp', parameters: {
                operation: 'goToDefinition',
                file: String.raw`C:\src\aspnetcore\src\Components\test\E2ETest\Infrastructure\ServerFixtures\BasicTestAppServerSiteFixture.cs`,
                line: 8, character: 56, symbolName: 'AspNetSiteServerFixture',
            },
            result: String.raw`Definition: C:\src\aspnetcore\src\Components\test\E2ETest\Infrastructure\ServerFixtures\AspNetSiteServerFixture.cs:11:14`,
        },
        {
            tool: 'functions.lsp', parameters: {
                operation: 'goToDefinition',
                file: String.raw`C:\src\aspnetcore\src\Servers\Kestrel\Core\src\Internal\Http\Http1Connection.cs`,
                line: 289, character: 56, symbolName: 'Http1ParsingHandler',
            },
            result: 'No definition found at line 289, character 56.',
        },
        {
            tool: 'functions.read_agent', parameters: { agent_id: 'lsp-csharp', wait: false },
            result: 'No agent found with agent_id: lsp-csharp. The agent may have been cleared or never existed.',
        },
    ],
    consequence: 'LSP results are navigation only. Empty semantic lookups/log unavailability are retained; pinned raw Git blobs and explicit dependency-revision contents are authoritative source evidence. No compiler-binding or runtime validation claim.',
    azureGraphUsed: false,
    reason: 'Configured Azure graph is unrelated to ASP.NET Core; no graph retargeting or Azure calls permitted.',
});
console.log(JSON.stringify({
    phase: 'finite-source-evidence-complete', collectorPid: process.pid,
    sourceEntries: sourceManifest.length, externalEntries: externalManifest.length,
    comparisons: path.join(ROOT, 'SOURCE-COMPARISON.json'),
}));
