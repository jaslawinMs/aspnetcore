import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F109');
const repo = 'C:\\src\\aspnetcore';
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F109-token-base64-preflight';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const blob = bytes => crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
function command(executable, args, input)
{
    const result = spawnSync(executable, args, { cwd: repo, input, maxBuffer: 16 * 1024 * 1024,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
    assert.equal(result.status, 0, `${executable} ${args.join(' ')} failed:${result.stderr.toString()}`);

    return result.stdout;
}
const git = (args, input) => command('git', args, input);
const gitText = args => git(args).toString('utf8').trim();
assert(!fs.existsSync(run), 'Retain existing F109 records;do not overwrite.');
assert.equal(gitText(['rev-parse', 'HEAD']), baseline);
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
const ownerGitPath = 'src/Identity/Core/src/DataProtectorTokenProvider.cs';
const history = gh('owner-history.json', ['api', '--method', 'GET', 'repos/dotnet/aspnetcore/commits',
    '-f', `path=${ownerGitPath}`, '-f', `sha=${current.sha}`, '-f', 'per_page=20']);
const related = gh('related-owner-pull-requests.json', ['api', '--method', 'GET', 'search/issues',
    '-f', 'q=repo:dotnet/aspnetcore is:pr "DataProtectorTokenProvider"', '-f', 'per_page=20']);
const relatedBase64 = gh('related-base64-pull-requests.json', ['api', '--method', 'GET', 'search/issues',
    '-f', 'q=repo:dotnet/aspnetcore is:pr DataProtectorTokenProvider base64', '-f', 'per_page=20']);
for (const id of [10739, 66586])
{
    gh(`related-${id}-pr.json`, ['api', `repos/dotnet/aspnetcore/pulls/${id}`]);
    gh(`related-${id}-files.json`, ['api', `repos/dotnet/aspnetcore/pulls/${id}/files?per_page=100`]);
}
const startedAt = new Date().toISOString();
const fetchArguments = ['fetch', '--quiet', '--no-tags', '--no-recurse-submodules', 'origin', 'main'];
git(fetchArguments);
const fetched = gitText(['rev-parse', 'FETCH_HEAD']);
assert.equal(gitText(['rev-parse', `${current.sha}^{tree}`]), current.commit.tree.sha);
git(['merge-base', '--is-ancestor', current.sha, fetched]);
json('source-fetch-command.json', { command: 'git ' + fetchArguments.join(' '), exitCode: 0, startedAt,
    completedAt: new Date().toISOString(), capturedCurrentDefaultRevision: current.sha,
    actualFetchedMainRevision: fetched, actualCapturedDefaultTree: current.commit.tree.sha,
    canonicalSourceCameFromActualFetchedGitObjects: true, sourceCheckoutHeadChanged: false });
const sources = [
    'src\\Identity\\Core\\src\\DataProtectorTokenProvider.cs',
    'src\\Identity\\Core\\src\\LoggingExtensions.cs',
    'src\\Identity\\Core\\src\\DataProtectionTokenProviderOptions.cs',
    'src\\Identity\\Core\\src\\IdentityBuilderExtensions.cs',
    'src\\Identity\\Core\\src\\Microsoft.AspNetCore.Identity.csproj',
    'src\\Identity\\Core\\src\\PublicAPI.Shipped.txt',
    'src\\Identity\\Core\\src\\PublicAPI.Unshipped.txt',
    'src\\Identity\\Extensions.Core\\src\\UserManager.cs',
    'src\\Identity\\Extensions.Core\\src\\IUserStore.cs',
    'src\\Identity\\Extensions.Core\\src\\IUserSecurityStampStore.cs',
    'src\\Identity\\Extensions.Core\\src\\IUserTwoFactorTokenProvider.cs',
    'src\\Identity\\Extensions.Core\\src\\TokenOptions.cs',
    'src\\Identity\\Extensions.Core\\src\\Microsoft.Extensions.Identity.Core.csproj',
    'src\\Identity\\test\\Identity.Test\\UserManagerTest.cs',
    'src\\Identity\\test\\Identity.Test\\AuthenticatorTokenProviderTest.cs',
    'src\\Identity\\test\\Identity.Test\\Microsoft.AspNetCore.Identity.Test.csproj',
    'src\\DataProtection\\DataProtection\\src\\EphemeralDataProtectionProvider.cs',
    'src\\DataProtection\\DataProtection\\src\\KeyManagement\\KeyRingBasedDataProtector.cs',
    'src\\DataProtection\\Extensions\\src\\DataProtectionProvider.cs',
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
    assert.equal(blob(canonical), currentBlob);
    assert.equal(blob(original), baselineBlob);
    assert.equal(blob(Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n'), 'utf8')), workingBlob);
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
        rawSnapshot, rawSha256: sha(raw), rawBytes: raw.length, canonicalSnapshot,
        canonicalSha256: sha(canonical), canonicalBytes: canonical.length, baselineSnapshot,
        baselineSha256: sha(original), baselineBytes: original.length, actualDefaultRevision: current.sha,
        actualCapturedDefaultTree: current.commit.tree.sha, actualFetchedMainRevision: fetched,
        canonicalGitCleanFilterSeparateFromRawBytes: true };
});
json('producer-source-copies.json', copies);
assert(copies.every(row => row.equalityVerified), 'Review actual scoped default/baseline/working differences before continuing.');
const owner = fs.readFileSync(path.join(repo, sources[0]), 'utf8');
assert(owner.includes('Protector.Unprotect(Convert.FromBase64String(token))'));
assert(!owner.includes('Base64.IsValid'));
const logger = fs.readFileSync(path.join(repo, sources[1]), 'utf8');
assert(logger.includes('[LoggerMessage(6, LogLevel.Debug, "ValidateAsync failed: unhandled exception was thrown.", EventName = "UnhandledException")]'));
const factNames = ['TokenMethodsThrowWithNoTokenProvider', 'UserManagerWillUseTokenProviderInstance'];
const tests = fs.readFileSync(path.join(repo, sources[13]), 'utf8');
for (const name of factNames)
{
    assert(new RegExp('\\[Fact\\]\\s+public async Task ' + name + '\\(\\)').test(tests), 'Exact non-skipped Fact required:' + name);
}
json('selected-owning-controls.json', { candidate: 'F109', className: 'Microsoft.AspNetCore.Identity.Test.UserManagerTest',
    source: sources[13], sourceSha256: copies[13].rawSha256, factNames, expectedRows: 2,
    note: 'Public UserManager dispatch/metrics preservation controls;not dedicated concrete-provider or performance red-green tests. Existing skipped provider-precedence Fact is not selected or represented as passing.' });
fs.copyFileSync(path.join(session, 'F109-acceptance.md'), path.join(run, 'acceptance.md'));
git(['switch', '-c', branch, baseline]);
json('current-source-investigation.json', { candidate: 'F109', branch, sourceRevision: baseline,
    currentDefaultRevision: current.sha, fetchedMainRevision: fetched, verifiedScopedSources: copies.length,
    latestRecordedOwnerCommit: history[0].sha, latestRecordedOwnerDate: history[0].commit.committer.date,
    ownerHistoryBoundedEntries: history.length, relatedOwnerQueryMatches: related.total_count,
    relatedBase64QueryMatches: relatedBase64.total_count, relatedQueriesNotExhaustiveAbsenceProof: true,
    actualConvertDecoderStillThrowsInsideExistingParserCatch: true, providerUnhandledExceptionEventId: 6,
    inspectedUserManagerPublicGenerateAndVerifyDispatchToRegisteredProvider: true,
    loggerFailureMustRemainOutsideExistingParserCatch: true,
    lspConstructorReferencesReturnedNoneNotSolutionCoverage: true,
    noShippingSourceChange: true, acceptanceRecordedBeforeImplementation: true, recordedAt: new Date().toISOString() });
console.log(`F109:${copies.length} exact current/baseline/working source identities;actual decoder/logger/public-manager boundary/history/related work and2 original Facts captured;independent baseline branch created.`);
