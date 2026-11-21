import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, ORIGINAL, utc, sha256, writeJson, run, git, captureFile } from './collect_source_213.mjs';

const roleRecord = JSON.parse(fs.readFileSync(path.join(ROOT, 'SOURCE-ROLES.json')));
const DEFAULT = roleRecord.observedDefaultCommit;
const roles = [['Original', ORIGINAL], ['Default', DEFAULT]];
const dependencies = [];
const externalManifest = [];
const externalCache = new Map();

function readDependencies(role) {
    const text = fs.readFileSync(path.join(ROOT, 'source', role, 'eng', 'Version.Details.xml'), 'utf8');
    const values = [...text.matchAll(/<Dependency Name="([^"]+)" Version="([^"]+)"[^>]*>([\s\S]*?)<\/Dependency>/g)]
        .filter(match => match[1] === 'Microsoft.Extensions.Primitives' || match[1].startsWith('Microsoft.NETCore.App'))
        .map(match => ({
            role, name: match[1], version: match[2],
            repositoryUrl: match[3].match(/<Uri>([^<]+)<\/Uri>/)?.[1],
            revision: match[3].match(/<Sha>([^<]+)<\/Sha>/)?.[1],
        }));
    dependencies.push(...values);
    return values;
}

function externalFile(role, dependency, relativePath) {
    if (dependency.repositoryUrl !== 'https://github.com/dotnet/dotnet') {
        throw new Error('Unexpected declared dependency repository; no silent runtime-source substitution');
    }
    const repository = 'dotnet/dotnet';
    const revision = dependency.revision;
    const key = repository + ':' + revision + ':' + relativePath;
    let data;
    let response;
    let commandLabel;
    let reusedFromRole = null;
    if (externalCache.has(key)) {
        ({ data, response, commandLabel, role: reusedFromRole } = externalCache.get(key));
    } else {
        commandLabel = `external-${role}-${relativePath.replaceAll('/', '__').replaceAll('.', '_')}`;
        const apiResult = run(commandLabel, [
            'gh', 'api', `repos/${repository}/contents/${relativePath}?ref=${revision}`,
        ]);
        response = JSON.parse(apiResult);
        if (response.type !== 'file' || response.encoding !== 'base64' || response.path !== relativePath) {
            throw new Error('Unexpected contents API representation; no reconstruction fallback');
        }
        data = Buffer.from(response.content, 'base64');
        const gitBlob = crypto.createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
        if (gitBlob !== response.sha || data.length !== response.size) throw new Error('External raw blob mismatch');
        externalCache.set(key, { data, response, commandLabel, role });
    }
    const artifact = path.join('external-source', role, ...relativePath.split('/'));
    const destination = path.join(ROOT, artifact);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, data, { flag: 'wx' });
    externalManifest.push({
        role, declaredDependency: dependency, repository, revision,
        gitPath: relativePath, gitBlob: response.sha, bytes: data.length,
        sha256: sha256(data), artifact, sourceUrl: response.html_url,
        membership: 'GitHub contents API at explicit full dependency commit, independently rehashed raw Git blob',
        command: path.join('commands', commandLabel + '.json'), reusedFromRole,
        executingRuntimeIdentityVerified: false,
    });
    writeJson('external-source-manifest.json', externalManifest, true);
}

const paths = [
    'src/Components/test/E2ETest/Tests/HttpClientTest.cs',
    'src/Components/test/E2ETest/Microsoft.AspNetCore.Components.E2ETests.csproj',
    'src/Components/test/testassets/Components.TestServer/ClientStartup.cs',
    'src/Components/test/testassets/Components.TestServer/CorsStartup.cs',
    'src/Components/test/testassets/Components.TestServer/ServerStartup.cs',
];
for (const [role, revision] of roles) {
    for (const gitPath of paths) captureFile(role, revision, gitPath);
    git(`discovery-${role}-request-component`, ['grep', '-n', '-E',
        'request-uri|request-method|request-headers|REQUEST HEADERS|HttpClientTest',
        revision, '--', 'src/Components/test/testassets'], [0, 1]);
    git(`discovery-${role}-header-backing-producer`, ['grep', '-n', '-E',
        'new StringValues|StringValues.Concat|AppendUnknownHeaders|AppendValue',
        revision, '--', 'src/Servers/Kestrel/Core/src/Internal/Http/HttpHeaders.cs',
        'src/Servers/Kestrel/Core/src/Internal/Http/HttpRequestHeaders.cs',
        'src/Servers/Kestrel/Core/src/Internal/Http/HttpHeaders.Generated.cs',
        'src/Http/Http/src/HeaderDictionary.cs'], [0, 1]);
    const values = readDependencies(role);
    const primitive = values.find(value => value.name === 'Microsoft.Extensions.Primitives');
    const core = values.find(value => value.name === 'Microsoft.NETCore.App.Ref');
    if (!primitive || !core) throw new Error('Declared dependency mapping incomplete; inspect retained XML');
    externalFile(role, primitive, 'src/runtime/src/libraries/Microsoft.Extensions.Primitives/src/StringValues.cs');
    externalFile(role, core, 'src/runtime/src/libraries/System.Private.CoreLib/src/System/String.Manipulation.cs');
    externalFile(role, core, 'src/runtime/src/libraries/System.Net.Http/src/System/Net/Http/BrowserHttpHandler/BrowserHttpHandler.cs');
}
writeJson('declared-dependencies.json', dependencies);

const historicalCommit = '8590f6e7a53e9eee1262ae1323511dee4383e9cb';
const historicalPath = 'test/testapps/TestServer/Controllers/PersonController.cs';
captureFile('History-2018-httpclient', historicalCommit, historicalPath);
git('history-2018-httpclient-controller-change', [
    'show', '--format=fuller', '--no-renames', historicalCommit, '--', historicalPath,
]);

run('related-fork-repository', ['gh', 'api', 'repos/jaslawinMs/aspnetcore'], [0, 1]);
const queries = [
    ['upstream-person', 'repo:dotnet/aspnetcore "PersonController"'],
    ['upstream-stringvalues-toarray', 'repo:dotnet/aspnetcore "StringValues" "ToArray"'],
    ['fork-person', 'repo:jaslawinMs/aspnetcore "PersonController"'],
    ['fork-stringvalues-toarray', 'repo:jaslawinMs/aspnetcore "StringValues" "ToArray"'],
];
const related = [];
for (const [label, query] of queries) {
    const bytes = run('related-' + label, [
        'gh', 'api', '-X', 'GET', 'search/issues', '-f', 'q=' + query, '-f', 'per_page=20',
    ], [0, 1]);
    const command = JSON.parse(fs.readFileSync(path.join(ROOT, 'commands', 'related-' + label + '.json')));
    let parsed = null;
    try { parsed = JSON.parse(bytes); } catch { }
    related.push({
        label, query, page: 1, perPage: 20, observedUtc: command.finishedUtc,
        returnCode: command.returnCode, totalCount: parsed?.total_count ?? null,
        incompleteResults: parsed?.incomplete_results ?? null,
        returnedItems: parsed?.items?.length ?? null,
        itemSummaries: parsed?.items?.map(item => ({
            number: item.number, title: item.title, url: item.html_url,
            state: item.state, isPullRequest: Boolean(item.pull_request),
        })) ?? [],
        command: path.join('commands', 'related-' + label + '.json'),
    });
}
writeJson('related-work-query-index.json', {
    recordedUtc: utc(), scope: 'Bounded title/body issue/PR searches; not exhaustive code, fork branch or related-work proof',
    upstreamPinNotChangedByForkRead: true, queries: related,
});
console.log(JSON.stringify({ phase: 'trace-source-captured', roleDependencies: dependencies, externalFiles: externalManifest.length }));
