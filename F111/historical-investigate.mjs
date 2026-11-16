import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F111');
const repo = 'C:\\src\\aspnetcore';
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const previous = 'fca37ba6edb2eb6417df1680a269e4c352a42b71';
const branch = 'autoperf/F111-stored-data-buffer';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
function command(executable, args, input)
{
    const result = spawnSync(executable, args, { cwd: repo, input, maxBuffer: 16 * 1024 * 1024,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
    assert.equal(result.status, 0, `${executable} ${args.join(' ')} failed:${result.stderr.toString()}`);

    return result.stdout;
}
const git = (args, input) => command('git', args, input);
const gitText = args => git(args).toString('utf8').trim();
assert(!fs.existsSync(run), 'Retain actual F111 records;never overwrite them.');
assert.equal(gitText(['rev-parse', 'HEAD']), previous);
assert.equal(gitText(['branch', '--show-current']), 'autoperf/F109-token-base64-preflight');
assert.equal(gitText(['status', '--porcelain', '--untracked-files=no']), '');
assert(/^https:\/\/github\.com\/dotnet\/aspnetcore(?:\.git)?$/.test(gitText(['remote', 'get-url', 'origin'])));
fs.mkdirSync(run, { recursive: true });
function json(name, value)
{
    fs.writeFileSync(path.join(run, name), JSON.stringify(value, null, 2) + '\n');
}
function gh(name, args)
{
    const bytes = command('gh', args);
    fs.writeFileSync(path.join(run, name), bytes);

    return JSON.parse(bytes.toString('utf8'));
}
const current = gh('current-default-commit.json', ['api', 'repos/dotnet/aspnetcore/commits/main']);
const ownerGitPath = 'src/Components/Endpoints/src/Serialization/JsonStoredDataSerializer.cs';
const history = gh('owner-history.json', ['api', '--method', 'GET', 'repos/dotnet/aspnetcore/commits',
    '-f', `path=${ownerGitPath}`, '-f', `sha=${current.sha}`, '-f', 'per_page=20']);
const related = gh('related-owner-work.json', ['api', '--method', 'GET', 'search/issues',
    '-f', 'q=repo:dotnet/aspnetcore "JsonStoredDataSerializer"', '-f', 'per_page=20']);
const buffers = gh('related-buffer-work.json', ['api', '--method', 'GET', 'search/issues',
    '-f', 'q=repo:dotnet/aspnetcore "TempData" "ArrayBufferWriter"', '-f', 'per_page=20']);
const fetchArguments = ['fetch', '--quiet', '--no-tags', '--no-recurse-submodules', 'origin', 'main'];
const startedAt = new Date().toISOString();
git(fetchArguments);
const fetched = gitText(['rev-parse', 'FETCH_HEAD']);
assert.equal(gitText(['rev-parse', `${current.sha}^{tree}`]), current.commit.tree.sha);
git(['merge-base', '--is-ancestor', current.sha, fetched]);
json('source-fetch-command.json', { command: 'git ' + fetchArguments.join(' '), exitCode: 0, startedAt,
    completedAt: new Date().toISOString(), capturedCurrentDefaultRevision: current.sha,
    actualFetchedMainRevision: fetched, actualCapturedDefaultTree: current.commit.tree.sha,
    canonicalSourceCameFromActualFetchedGitObjects: true });
const sources = [
    'src\\Components\\Endpoints\\src\\Serialization\\JsonStoredDataSerializer.cs',
    'src\\Components\\Endpoints\\src\\Serialization\\IStoredDataSerializer.cs',
    'src\\Components\\Endpoints\\src\\TempData\\SessionStorageTempDataProvider.cs',
    'src\\Components\\Endpoints\\src\\TempData\\CookieTempDataProvider.cs',
    'src\\Components\\Endpoints\\src\\TempData\\TempDataProviderServiceCollectionExtensions.cs',
    'src\\Components\\Endpoints\\src\\SessionCascadingValueSupplier.cs',
    'src\\Components\\Endpoints\\src\\Microsoft.AspNetCore.Components.Endpoints.csproj',
    'src\\Components\\Endpoints\\test\\TempData\\JsonStoredDataSerializerTest.cs',
    'src\\Components\\Endpoints\\test\\TempData\\SessionStorageTempDataProviderTest.cs',
    'src\\Components\\Endpoints\\test\\TempData\\CookieTempDataProviderTest.cs',
    'src\\Shared\\PooledArrayBufferWriter.cs',
    'src\\Shared\\Buffers\\RefPooledArrayBufferWriter.cs',
    'src\\Components\\Endpoints\\src\\Forms\\ClientValidationDataWriter.cs',
    '.editorconfig'
];
const copies = sources.map(source =>
{
    const gitPath = source.replaceAll('\\', '/');
    const canonical = git(['show', `${current.sha}:${gitPath}`]);
    const original = git(['show', `${baseline}:${gitPath}`]);
    const raw = fs.readFileSync(path.join(repo, source));
    const currentBlob = gitText(['rev-parse', `${current.sha}:${gitPath}`]);
    const baselineBlob = gitText(['rev-parse', `${baseline}:${gitPath}`]);
    const workingBlob = git(['hash-object', '--path=' + gitPath, '--stdin'], raw).toString('utf8').trim();
    const rawSnapshot = path.join('producer-source', source);
    const canonicalSnapshot = path.join('current-default-canonical', source);
    const baselineSnapshot = path.join('baseline-canonical', source);
    for (const [relative, bytes] of [[rawSnapshot, raw], [canonicalSnapshot, canonical], [baselineSnapshot, original]])
    {
        fs.mkdirSync(path.dirname(path.join(run, relative)), { recursive: true });
        fs.writeFileSync(path.join(run, relative), bytes);
    }

    return { path: source, currentDefaultGitBlob: currentBlob, baselineGitBlob: baselineBlob, workingGitBlob: workingBlob,
        equalityVerified: currentBlob === baselineBlob && baselineBlob === workingBlob,
        rawSnapshot, rawSha256: hash(raw), rawBytes: raw.length, canonicalSnapshot,
        canonicalSha256: hash(canonical), canonicalBytes: canonical.length, baselineSnapshot,
        baselineSha256: hash(original), baselineBytes: original.length, actualDefaultRevision: current.sha,
        actualCapturedDefaultTree: current.commit.tree.sha, actualFetchedMainRevision: fetched,
        canonicalGitCleanFilterSeparateFromRawBytes: true };
});
json('producer-source-copies.json', copies);
const owner = fs.readFileSync(path.join(repo, sources[0]), 'utf8');
assert(owner.includes('using var buffer = new MemoryStream();'));
assert(owner.includes('public byte[] SerializeData(IDictionary<string, object?> data)'));
json('current-source-investigation.json', { candidate: 'F111', branch, sourceRevision: baseline,
    currentDefaultRevision: current.sha, fetchedMainRevision: fetched, capturedScopedSources: copies.length,
    matchingScopedSources: copies.filter(row => row.equalityVerified).length,
    actualCurrentOwnerMatchesBaseline: copies[0].equalityVerified,
    latestRecordedOwnerCommit: history[0]?.sha, latestRecordedOwnerDate: history[0]?.commit.committer.date,
    ownerHistoryBoundedEntries: history.length, relatedOwnerQueryMatches: related.total_count,
    relatedBufferQueryMatches: buffers.total_count, relatedQueriesNotExhaustiveAbsenceProof: true,
    noShippingSourceChange: true, separateF112SerializeValueNotProposedForChange: true,
    lspReferencesOnlyDeclarationNotSolutionCoverage: true,
    semanticRepositorySearchReturned404: true, recordedAt: new Date().toISOString() });
assert(copies.every(row => row.equalityVerified), 'Inspect actual scoped current/baseline/working differences before continuing.');
git(['switch', '-c', branch, baseline]);
console.log(`F111:${copies.length} exact scoped current/baseline/working identities;owning history/related work captured;independent baseline branch created with F109 source preserved in its fork branch.`);
