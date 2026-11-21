import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, ORIGINAL, utc, sha256, writeJson, run, git, captureFile } from './collect_source_213.mjs';

const roleRecord = JSON.parse(fs.readFileSync(path.join(ROOT, 'SOURCE-ROLES.json')));
const DEFAULT = roleRecord.observedDefaultCommit;
const roles = [['Original', ORIGINAL], ['Default', DEFAULT]];
const dependencies = JSON.parse(fs.readFileSync(path.join(ROOT, 'declared-dependencies.json')));
const externalManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'external-source-manifest.json')));

const paths = [
    'src/Components/test/testassets/BasicTestApp/HttpClientTest/HttpRequestsComponent.razor',
    'src/Components/test/testassets/BasicTestApp/BasicTestApp.csproj',
    'src/Components/test/testassets/BasicTestApp/Program.cs',
    'src/Components/test/testassets/BasicTestApp/_Imports.razor',
    'src/Components/test/E2ETest/Infrastructure/ServerFixtures/BasicTestAppServerSiteFixture.cs',
    'src/Components/test/E2ETest/Infrastructure/ServerFixtures/BlazorWasmTestAppFixture.cs',
    'src/Servers/Kestrel/Core/src/Internal/Http/HttpHeaders.cs',
    'src/Servers/Kestrel/Core/src/Internal/Http/HttpRequestHeaders.cs',
    'src/Servers/Kestrel/Core/src/Internal/Http/HttpHeaders.Generated.cs',
    'src/Servers/Kestrel/Core/src/Internal/Http/HttpProtocol.cs',
    'src/Servers/Kestrel/Core/src/Internal/Http/Http1Connection.cs',
    'src/Servers/Kestrel/Core/src/Internal/Http/HttpParser.cs',
    'src/Mvc/Mvc.Core/src/Formatters/StringOutputFormatter.cs',
    'src/Mvc/Mvc.Core/src/Infrastructure/ActionResultTypeMapper.cs',
];

const externalPaths = [
    'src/runtime/src/libraries/System.Net.Http/src/System/Net/Http/Headers/HttpHeaders.cs',
    'src/runtime/src/libraries/System.Net.Http/src/System/Net/Http/BrowserHttpHandler/BrowserHttpInterop.cs',
    'src/runtime/src/mono/browser/runtime/http.ts',
];

for (const [role, revision] of roles) {
    for (const gitPath of paths) captureFile(role, revision, gitPath);
    git(`discovery-${role}-kestrel-entry`, ['grep', '-n', '-E',
        'HttpRequestHeaders.Append|ParseHeaders|OnHeader\\(',
        revision, '--',
        'src/Servers/Kestrel/Core/src/Internal/Http/HttpProtocol.cs',
        'src/Servers/Kestrel/Core/src/Internal/Http/Http1Connection.cs',
        'src/Servers/Kestrel/Core/src/Internal/Http/HttpParser.cs'], [0, 1]);
    const dependency = dependencies.find(item => item.role === role && item.name === 'Microsoft.NETCore.App.Ref');
    for (const relativePath of externalPaths) {
        const label = `external-${role}-${relativePath.replaceAll('/', '__').replaceAll('.', '_')}`;
        const bytes = run(label, [
            'gh', 'api',
            `repos/dotnet/dotnet/contents/${relativePath}?ref=${dependency.revision}`,
        ]);
        const response = JSON.parse(bytes);
        if (response.type !== 'file' || response.encoding !== 'base64' || response.path !== relativePath) {
            throw new Error('Unexpected contents API representation');
        }
        const data = Buffer.from(response.content, 'base64');
        const gitBlob = crypto.createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
        if (gitBlob !== response.sha || data.length !== response.size) throw new Error('External raw blob mismatch');
        const artifact = path.join('external-source', role, ...relativePath.split('/'));
        const destination = path.join(ROOT, artifact);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, data, { flag: 'wx' });
        externalManifest.push({
            role, declaredDependency: dependency, repository: 'dotnet/dotnet',
            revision: dependency.revision, gitPath: relativePath,
            gitBlob: response.sha, bytes: data.length, sha256: sha256(data),
            artifact, sourceUrl: response.html_url,
            membership: 'GitHub contents API at explicit full dependency commit, independently rehashed raw Git blob',
            command: path.join('commands', label + '.json'),
            executingRuntimeIdentityVerified: false,
        });
        writeJson('external-source-manifest.json', externalManifest, true);
    }
}

run('related-upstream-null-array-issue', ['gh', 'api', 'repos/dotnet/aspnetcore/issues/44509'], [0, 1]);
run('related-upstream-null-array-comments', [
    'gh', 'api', 'repos/dotnet/aspnetcore/issues/44509/comments?per_page=30&page=1',
], [0, 1]);
console.log(JSON.stringify({ phase: 'producer-closure-captured', recordedUtc: utc(), externalFiles: externalManifest.length }));
