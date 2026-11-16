import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url)), run = path.join(session, 'autoperf-runs', 'F113');
const repo = 'C:\\src\\aspnetcore', baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5', branch = 'autoperf/F113-distributed-cache-encode';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
function command(executable, args, input)
{
    const result = spawnSync(executable, args, { cwd: repo, input, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
    assert.equal(result.status, 0, `${executable} ${args.join(' ')} failed:${result.stderr.toString()}`);

    return result.stdout;
}
const git = (args, input) => command('git', args, input), gitText = args => git(args).toString('utf8').trim();
assert(!fs.existsSync(run), 'Retain independent F113 evidence;never overwrite.');
assert.equal(gitText(['rev-parse', 'HEAD']), baseline); assert.equal(gitText(['branch', '--show-current']), branch);
assert.equal(gitText(['status', '--porcelain', '--untracked-files=no']), '');
fs.mkdirSync(run, { recursive: true });
const json = (name, value) => fs.writeFileSync(path.join(run, name), JSON.stringify(value, null, 2) + '\n');
function gh(name, args)
{
    const bytes = command('gh', args); fs.writeFileSync(path.join(run, name), bytes);

    return JSON.parse(bytes.toString('utf8'));
}
const current = gh('current-default-commit.json', ['api', 'repos/dotnet/aspnetcore/commits/main']);
const histories = [];
for (const [label, source] of [
    ['owner', 'src/Mvc/Mvc.TagHelpers/src/Cache/DistributedCacheTagHelperService.cs'],
    ['consumer', 'src/Mvc/Mvc.TagHelpers/src/DistributedCacheTagHelper.cs']
])
{
    const history = gh(label + '-history.json', ['api', '--method', 'GET', 'repos/dotnet/aspnetcore/commits',
        '-f', `path=${source}`, '-f', `sha=${current.sha}`, '-f', 'per_page=20']);
    histories.push({ label, path: source, boundedEntries: history.length, entries: history.map(row =>
        ({ sha: row.sha, message: row.commit.message, date: row.commit.author.date })) });
}
for (const [name, query] of [
    ['related-owner-work.json', 'repo:dotnet/aspnetcore "DistributedCacheTagHelperService"'],
    ['related-encode-work.json', 'repo:dotnet/aspnetcore "distributed" "MemoryStream"'],
    ['related-tag-helper-work.json', 'repo:dotnet/aspnetcore is:pr "distributed-cache" "allocation"']
]) gh(name, ['api', '--method', 'GET', 'search/issues', '-f', 'q=' + query, '-f', 'per_page=20']);
const args = ['fetch', '--quiet', '--no-tags', '--no-recurse-submodules', 'origin', 'main'], startedAt = new Date().toISOString();
git(args);
const fetched = gitText(['rev-parse', 'FETCH_HEAD']);
assert.equal(gitText(['rev-parse', `${current.sha}^{tree}`]), current.commit.tree.sha);
git(['merge-base', '--is-ancestor', current.sha, fetched]);
json('source-fetch-command.json', { arguments: ['git', ...args], exitCode: 0, startedAt, completedAt: new Date().toISOString(),
    capturedCurrentDefaultRevision: current.sha, actualFetchedMainRevision: fetched, actualCapturedDefaultTree: current.commit.tree.sha });
const sources = [
    'src\\Mvc\\Mvc.TagHelpers\\src\\Cache\\DistributedCacheTagHelperService.cs',
    'src\\Mvc\\Mvc.TagHelpers\\src\\Cache\\DistributedCacheTagHelperFormatter.cs',
    'src\\Mvc\\Mvc.TagHelpers\\src\\Cache\\DistributedCacheTagHelperStorage.cs',
    'src\\Mvc\\Mvc.TagHelpers\\src\\Cache\\IDistributedCacheTagHelperService.cs',
    'src\\Mvc\\Mvc.TagHelpers\\src\\Cache\\IDistributedCacheTagHelperFormatter.cs',
    'src\\Mvc\\Mvc.TagHelpers\\src\\Cache\\IDistributedCacheTagHelperStorage.cs',
    'src\\Mvc\\Mvc.TagHelpers\\src\\Cache\\DistributedCacheTagHelperFormattingContext.cs',
    'src\\Mvc\\Mvc.TagHelpers\\src\\Cache\\CacheTagKey.cs',
    'src\\Mvc\\Mvc.TagHelpers\\src\\DistributedCacheTagHelper.cs',
    'src\\Mvc\\Mvc.TagHelpers\\src\\CacheTagHelperBase.cs',
    'src\\Mvc\\Mvc.TagHelpers\\src\\DependencyInjection\\TagHelperExtensions.cs',
    'src\\Mvc\\Mvc.TagHelpers\\src\\Microsoft.AspNetCore.Mvc.TagHelpers.csproj',
    'src\\Mvc\\Mvc.TagHelpers\\test\\DistributedCacheTagHelperTest.cs',
    'src\\Mvc\\Mvc.TagHelpers\\test\\Microsoft.AspNetCore.Mvc.TagHelpers.Test.csproj',
    'src\\Html.Abstractions\\src\\HtmlString.cs',
    '.editorconfig'
];
const copies = sources.map(source =>
{
    const gitPath = source.replaceAll('\\', '/'), clean = git(['show', `${current.sha}:${gitPath}`]), original = git(['show', `${baseline}:${gitPath}`]);
    const raw = fs.readFileSync(path.join(repo, source)), currentBlob = gitText(['rev-parse', `${current.sha}:${gitPath}`]);
    const baselineBlob = gitText(['rev-parse', `${baseline}:${gitPath}`]), workingBlob = git(['hash-object', '--path=' + gitPath, '--stdin'], raw).toString('utf8').trim();
    const rawSnapshot = path.join('producer-source', source), canonicalSnapshot = path.join('current-default-canonical', source), baselineSnapshot = path.join('baseline-canonical', source);
    for (const [relative, bytes] of [[rawSnapshot, raw], [canonicalSnapshot, clean], [baselineSnapshot, original]])
    {
        fs.mkdirSync(path.dirname(path.join(run, relative)), { recursive: true }); fs.writeFileSync(path.join(run, relative), bytes);
    }

    return { path: source, currentDefaultGitBlob: currentBlob, baselineGitBlob: baselineBlob, workingGitBlob: workingBlob,
        equalityVerified: currentBlob === baselineBlob && baselineBlob === workingBlob, rawSnapshot, rawSha256: hash(raw), rawBytes: raw.length,
        canonicalSnapshot, canonicalSha256: hash(clean), canonicalBytes: clean.length, baselineSnapshot, baselineSha256: hash(original),
        baselineBytes: original.length, actualDefaultRevision: current.sha, actualFetchedMainRevision: fetched };
});
json('producer-source-copies.json', copies);
json('current-source-investigation.json', {
    candidate: 'F113', branch, sourceRevision: baseline, currentDefaultRevision: current.sha, fetchedMainRevision: fetched,
    capturedScopedSources: copies.length, matchingScopedSources: copies.filter(row => row.equalityVerified).length, histories,
    boundedIssueQueriesNotAbsenceProof: true, noShippingSourceChange: true, noF111OrF112SourceInherited: true,
    lspWorkspaceSymbolsFound: 0, availableBluebirdScopeIsUnrelatedAdoNotThisGitHubRepository: true,
    actualProducer: 'DistributedCacheTagHelper.ProcessAsync creates CacheTagKey,then real singleton service GetAsync misses,GetChildContentAsync renders through configured HtmlEncoder,real formatter produces UTF8,private Encode envelopes bytes,and real storage SetAsync receives them.',
    contract: 'Native-endian4-byte key UTF8 length,complete un-hashed UTF8 CacheTagKey.GenerateKey bytes,then formatter output bytes;fresh exact independent result. Decode validates expected key and materializes payload,unchanged.',
    registrations: 'Public AddMvcCore().AddCacheTagHelper() supplies real singleton service/formatter/storage plus actual MemoryDistributedCache. HtmlEncoder registration explicitly supplied by AddWebEncoders.',
    candidateSeam: 'Replace only Encode growable MemoryStream/final ToArray with exact destination while retaining existing keyLength local and native BitConverter prefix. No pooling/public APIs/dependencies/TFMs or worker/Decode changes.',
    observedStreamGrowthCaveat: 'Only source-level shape is established. For one large Write,old stream may grow directly to final size after a short key;do not invent many large resize copies or LOH attribution. Direct final destination also avoids original final full ToArray copy.',
    nextBoundary: 'Actual public tag-helper ProcessAsync with real DI/formatter/MemoryDistributedCache;explicit timed removal ensures cache misses. Hit/disabled/formatter controls unchanged. Private Encode delegate bound once outside timing is separately labeled direct component evidence.',
    recordedAt: new Date().toISOString()
});
assert(copies.every(row => row.equalityVerified), 'Inspect current/default/baseline differences before implementation.');
console.log(`F113:${copies.length} exact current/baseline/working source identities;actual tag-helper/cache-miss producer and bounded history captured.`);
