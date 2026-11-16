import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F112');
const repo = 'C:\\src\\aspnetcore';
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F112-stored-value-buffer';
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
assert(!fs.existsSync(run), 'Retain actual independent F112 records;never overwrite.');
assert.equal(gitText(['rev-parse', 'HEAD']), baseline);
assert.equal(gitText(['branch', '--show-current']), branch);
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
const consumerGitPath = 'src/Components/Endpoints/src/SessionCascadingValueSupplier.cs';
const histories = [];
for (const [label, source] of [['owner', ownerGitPath], ['consumer', consumerGitPath]])
{
    const history = gh(label + '-history.json', ['api', '--method', 'GET', 'repos/dotnet/aspnetcore/commits',
        '-f', `path=${source}`, '-f', `sha=${current.sha}`, '-f', 'per_page=20']);
    histories.push({ label, path: source, boundedEntries: history.length, latestRecordedCommit: history[0]?.sha });
}
for (const [name, query] of [
    ['related-owner-work.json', 'repo:dotnet/aspnetcore "JsonStoredDataSerializer"'],
    ['related-session-work.json', 'repo:dotnet/aspnetcore "SupplyParameterFromSession"'],
    ['related-buffer-work.json', 'repo:dotnet/aspnetcore "SerializeValue" "ArrayBufferWriter"']
]) gh(name, ['api', '--method', 'GET', 'search/issues', '-f', 'q=' + query, '-f', 'per_page=20']);
const fetchArguments = ['fetch', '--quiet', '--no-tags', '--no-recurse-submodules', 'origin', 'main'];
const startedAt = new Date().toISOString();
git(fetchArguments);
const fetched = gitText(['rev-parse', 'FETCH_HEAD']);
assert.equal(gitText(['rev-parse', `${current.sha}^{tree}`]), current.commit.tree.sha);
git(['merge-base', '--is-ancestor', current.sha, fetched]);
json('source-fetch-command.json', { command: 'git ' + fetchArguments.join(' '), arguments: ['git', ...fetchArguments],
    exitCode: 0, startedAt, completedAt: new Date().toISOString(), capturedCurrentDefaultRevision: current.sha,
    actualFetchedMainRevision: fetched, actualCapturedDefaultTree: current.commit.tree.sha,
    canonicalSourceCameFromActualFetchedGitObjects: true });
const sources = [
    'src\\Components\\Endpoints\\src\\Serialization\\JsonStoredDataSerializer.cs',
    'src\\Components\\Endpoints\\src\\Serialization\\IStoredDataSerializer.cs',
    'src\\Components\\Endpoints\\src\\SessionCascadingValueSupplier.cs',
    'src\\Components\\Endpoints\\src\\RazorComponentEndpointInvoker.cs',
    'src\\Components\\Endpoints\\src\\Rendering\\EndpointHtmlRenderer.cs',
    'src\\Components\\Endpoints\\src\\Rendering\\EndpointHtmlRenderer.Prerendering.cs',
    'src\\Components\\Endpoints\\src\\Results\\RazorComponentResult.cs',
    'src\\Components\\Endpoints\\src\\Results\\RazorComponentResultExecutor.cs',
    'src\\Components\\Endpoints\\src\\DependencyInjection\\RazorComponentsServiceCollectionExtensions.cs',
    'src\\Components\\Endpoints\\src\\TempData\\TempDataProviderServiceCollectionExtensions.cs',
    'src\\Components\\Endpoints\\src\\SessionEstablishmentHelper.cs',
    'src\\Components\\Endpoints\\src\\SessionResolver.cs',
    'src\\Components\\Endpoints\\src\\Microsoft.AspNetCore.Components.Endpoints.csproj',
    'src\\Components\\Endpoints\\test\\TempData\\JsonStoredDataSerializerTest.cs',
    'src\\Components\\Endpoints\\test\\Session\\SessionCascadingValueSupplierTest.cs',
    'src\\Components\\Endpoints\\test\\Session\\SessionSubscriptionTest.cs',
    'src\\Components\\Web\\src\\SupplyParameterFromSessionAttribute.cs',
    'src\\Middleware\\Session\\src\\DistributedSession.cs',
    'src\\Middleware\\Session\\src\\DistributedSessionStore.cs',
    'src\\Middleware\\Session\\src\\SessionMiddleware.cs',
    'src\\Middleware\\Session\\src\\Microsoft.AspNetCore.Session.csproj',
    'src\\Shared\\PooledArrayBufferWriter.cs',
    'src\\Shared\\Buffers\\RefPooledArrayBufferWriter.cs',
    'src\\Components\\Endpoints\\src\\Forms\\ClientValidationDataWriter.cs',
    '.editorconfig'
];
const copies = sources.map(source =>
{
    const gitPath = source.replaceAll('\\', '/');
    const clean = git(['show', `${current.sha}:${gitPath}`]), original = git(['show', `${baseline}:${gitPath}`]);
    const raw = fs.readFileSync(path.join(repo, source));
    const currentBlob = gitText(['rev-parse', `${current.sha}:${gitPath}`]);
    const baselineBlob = gitText(['rev-parse', `${baseline}:${gitPath}`]);
    const workingBlob = git(['hash-object', '--path=' + gitPath, '--stdin'], raw).toString('utf8').trim();
    const rawSnapshot = path.join('producer-source', source);
    const canonicalSnapshot = path.join('current-default-canonical', source);
    const baselineSnapshot = path.join('baseline-canonical', source);
    for (const [relative, bytes] of [[rawSnapshot, raw], [canonicalSnapshot, clean], [baselineSnapshot, original]])
    {
        fs.mkdirSync(path.dirname(path.join(run, relative)), { recursive: true });
        fs.writeFileSync(path.join(run, relative), bytes);
    }

    return { path: source, currentDefaultGitBlob: currentBlob, baselineGitBlob: baselineBlob, workingGitBlob: workingBlob,
        equalityVerified: currentBlob === baselineBlob && baselineBlob === workingBlob,
        rawSnapshot, rawSha256: hash(raw), rawBytes: raw.length, canonicalSnapshot,
        canonicalSha256: hash(clean), canonicalBytes: clean.length, baselineSnapshot,
        baselineSha256: hash(original), baselineBytes: original.length, actualDefaultRevision: current.sha,
        actualCapturedDefaultTree: current.commit.tree.sha, actualFetchedMainRevision: fetched,
        canonicalGitCleanFilterSeparateFromRawBytes: true };
});
json('producer-source-copies.json', copies);
json('current-source-investigation.json', {
    candidate: 'F112', branch, sourceRevision: baseline, currentDefaultRevision: current.sha, fetchedMainRevision: fetched,
    capturedScopedSources: copies.length, matchingScopedSources: copies.filter(row => row.equalityVerified).length,
    histories, boundedIssueQueriesNotAbsenceProof: true, noShippingSourceChange: true,
    separateF111SerializeDataUnchangedAndNotInherited: true,
    lspWorkspaceSymbolsFound: 0, lspInterfaceReferencesOnlyDeclarationNotCoverage: true,
    availableBluebirdScopeIsUnrelatedAdoNotThisGitHubRepository: true,
    exactLocalLexicalCallSite: 'SessionCascadingValueSupplier.PersistAllValues:value getter->SerializeValue->ISession.Set',
    endpointProducer: 'RazorComponentEndpointInvoker invokes PersistAllValues after quiescence/streaming completion.',
    proposedFaithfulBenchmarkBoundary: 'Actual public RazorComponentResult rendering outside timing creates real SupplyParameterFromSession property subscriptions;bind actual internal PersistAllValues once outside timing and measure real property getter/serializer/DistributedSession copying. Public result itself does not persist;full routed sample must independently prove normal endpoint reachability.',
    recordedAt: new Date().toISOString()
});
assert(copies.every(row => row.equalityVerified), 'Inspect scoped current/default/baseline differences before implementation.');
console.log(`F112:${copies.length} exact scoped current/baseline/working identities;actual routed session/property producer/history captured;F111 remains independent and finalized.`);
