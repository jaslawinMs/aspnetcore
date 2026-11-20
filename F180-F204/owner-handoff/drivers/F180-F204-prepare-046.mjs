import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const parallel = path.join(session, 'autoperf-parallelism');
const root = path.join(parallel, 'finding-F180-F204-046');
const repository = String.raw`C:\src\aspnetcore`;
const graph = String.raw`C:\src\ap-F180-d046`;
const seed = String.raw`C:\src\ap-F176-d022\.dotnet`;
const original = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const current = 'd3483989953ae3cccd773aea5ea04cb0c7198531';
const target = 'src/Azure/samples/AzureAppServicesSample/Startup.cs';
const helper = path.join(session, 'autoperf-published-results', 'F141', 'portable-metadata.mjs');
const { hash, parsePe, parsePdb } = await import(pathToFileURL(helper).href);
assert(!fs.existsSync(root), 'Preserve an existing preparation root; do not replay.');
assert(!fs.existsSync(graph), 'Do not reuse or overwrite another graph.');
assert(!fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')));
assert(fs.existsSync(path.join(seed, 'shared', 'Microsoft.NETCore.App', '12.0.0-alpha.1.26569.107')));
fs.mkdirSync(path.join(root, 'commands'), { recursive: true });
const write = (name, value) => fs.writeFileSync(path.join(root, name),
    typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
write('executed-prepare-046.mjs', fs.readFileSync(fileURLToPath(import.meta.url)));
write('portable-metadata.mjs', fs.readFileSync(helper));
let sequence = 0;
const command = (executable, args) => {
    const prefix = `commands\\${String(++sequence).padStart(3, '0')}`;
    const startedAt = new Date().toISOString();
    const result = spawnSync(executable, args, { windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
    write(`${prefix}.stdout.bin`, result.stdout ?? Buffer.alloc(0));
    write(`${prefix}.stderr.bin`, result.stderr ?? Buffer.alloc(0));
    write(`${prefix}.json`, {
        executable, args, actualPid: result.pid, startedAt, finishedAt: new Date().toISOString(),
        actualExitCode: result.status, actualSignal: result.signal, actualSpawnError: result.error?.message ?? null,
        actualGitAndGitHubPreparationOnly: true, actualOsCreationIdentityNotObservedForTheseShortPreparationCommands: true
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr?.toString('utf8'));
    return result.stdout;
};
const git = (...args) => command('git', ['--no-pager', '-C', repository, ...args]);
assert.equal(git('rev-parse', 'origin/main').toString('utf8').trim(), current);
const observed = JSON.parse(command('gh', ['api', 'repos/dotnet/aspnetcore/git/ref/heads/main']));
write('independent-github-default-observation.json', observed);
assert.equal(observed.object.sha, current, 'Observe and explicitly plan a new default rather than silently retargeting.');
assert.equal(git('rev-parse', `${original}:${target}`).toString('utf8').trim(), 'b70eccbc0a5358e5b3368f9752adefcd2e25a06d');
assert.equal(git('rev-parse', `${current}:${target}`).toString('utf8').trim(), 'b70eccbc0a5358e5b3368f9752adefcd2e25a06d');
write('original-git-Startup.cs', git('show', `${original}:${target}`));
write('default-git-Startup.cs', git('show', `${current}:${target}`));
assert.deepEqual(fs.readFileSync(path.join(root, 'original-git-Startup.cs')), fs.readFileSync(path.join(root, 'default-git-Startup.cs')));
write('bounded-history.txt', git('log', '-8', '--format=%H %cI %s', current, '--', target, target.replace('Startup.cs', 'AzureAppServicesSample.csproj')));
write('default-global.json.snapshot', git('show', `${current}:global.json`));
write('original-global.json.snapshot', git('show', `${original}:global.json`));
const defaultGlobal = JSON.parse(fs.readFileSync(path.join(root, 'default-global.json.snapshot'), 'utf8'));
assert(fs.existsSync(path.join(seed, 'sdk', defaultGlobal.sdk.version)));
const nativeSource = path.join(repository, 'artifacts', 'bin', 'AzureAppServicesSample', 'Release', 'net12.0');
const nativeCopy = path.join(root, 'inherited-original-source-native');
fs.cpSync(nativeSource, nativeCopy, { recursive: true, errorOnExist: true, force: false });
const pe = parsePe(fs.readFileSync(path.join(nativeCopy, 'AzureAppServicesSample.dll')));
const pdb = parsePdb(fs.readFileSync(path.join(nativeCopy, 'AzureAppServicesSample.pdb')));
assert(pe.codeView.some(item => item.guid === pdb.guid && item.stamp === pdb.stamp));
fs.mkdirSync(path.join(root, 'inherited-pdb-raw'));
const rawDocuments = pdb.documents.map(document => {
    assert(document.name.startsWith(repository + '\\'));
    assert.equal(document.algorithm, '8829d00f-11b8-4213-878b-770e8597ac16');
    const bytes = fs.readFileSync(document.name);
    assert.equal(hash(bytes), document.checksum, document.name);
    const relative = `inherited-pdb-raw\\${document.row}-${path.basename(document.name)}`;
    write(relative, bytes);
    return { ...document, raw: relative, bytes: bytes.length };
});
const startup = rawDocuments.find(item => item.name.endsWith('\\AzureAppServicesSample\\Startup.cs'));
assert(startup);
assert.equal(hash(fs.readFileSync(path.join(repository, target))), startup.checksum);
const inventory = [];
const inventoryDirectory = (directory, relative = '') => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        assert(!entry.isSymbolicLink(), 'Do not follow an inherited output link.');
        const name = path.join(relative, entry.name);
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) inventoryDirectory(full, name);
        else {
            assert(entry.isFile());
            const bytes = fs.readFileSync(full);
            inventory.push({ file: name, bytes: bytes.length, sha256: hash(bytes) });
        }
    }
};
inventoryDirectory(nativeCopy);
write('inherited-native-identity.json', {
    actualInheritedSourceDirectory: nativeSource, actualNativePe: pe, actualPortablePdb: { ...pdb, documents: rawDocuments },
    actualInventory: inventory,
    actualOwnerStartupRawMatchesPdb: true,
    actualOriginalAndDefaultTargetGitBlobEqual: true,
    actualHistoricalCompilerCommandAndFullOriginalDependencySourceCohortNotReconstructed: true,
    actualThisIsInheritedOriginalSourceNativeNotAFreshOriginal37Build: true
});
for (const [name, source] of [
    ['area-README.md', 'src\\Azure\\README.md'],
    ['samples-README.md', 'src\\Azure\\samples\\README.md'],
    ['sample-project.csproj.snapshot', 'src\\Azure\\samples\\AzureAppServicesSample\\AzureAppServicesSample.csproj']
]) write(name, fs.readFileSync(path.join(repository, source)));
command('git', ['clone', '--quiet', '--local', '--no-hardlinks', '--no-checkout', repository, graph]);
command('git', ['--no-pager', '-C', graph, 'checkout', '--quiet', '--detach', current]);
assert(!fs.existsSync(path.join(graph, '.git', 'objects', 'info', 'alternates')));
assert.equal(command('git', ['--no-pager', '-C', graph, 'status', '--porcelain', '--untracked-files=no']).length, 0);
assert.equal(command('git', ['--no-pager', '-C', graph, 'rev-parse', 'HEAD']).toString('utf8').trim(), current);
fs.symlinkSync(seed, path.join(graph, '.dotnet'), 'junction');
write('entry-plan.json', {
    actualScope: 'F180/F204, one unchanged diagnostic sample Startup class, no candidate or performance authorization',
    originalCommit: original, observedDefaultCommit: current, targetGitPath: target, targetBlob: 'b70eccbc0a5358e5b3368f9752adefcd2e25a06d',
    inheritedOriginalSourceNative: nativeCopy, independentDefaultGraph: graph, actualDefaultSdkJunctionSeed: seed,
    actualNoGitAlternates: true, actualCloneUsedNoHardlinks: true, actualDefaultTrackedTreeInitiallyClean: true,
    expectedRuntimeOriginalSource: '12.0.0-alpha.1.26562.105',
    expectedRuntimeDefault: '12.0.0-alpha.1.26569.107',
    acceptance: [
        'Native Startup.Configure builds the actual RequestDelegate; real OS environment snapshot in explicitly allowlisted owned child only.',
        'Every expected environment key/value appears in case-insensitive sorted order; real diagnostic response sections and headers survive.',
        'Real LoggerFactory Debug enabled and disabled filters: exact enabled Debug record; no disabled Debug record; response assertions in each row.',
        'Same common C#13 consumer bytes preferred, separate actual role images/deps/runtimeconfig; preserve every failed command and missing prerequisite.',
        'No network server, Azure deployment, IIS hosting, production workload prevalence, performance gain or whole-source-cohort claims without evidence.'
    ],
    actualBuildOrRestoreOrDotnetNotYetExecuted: true,
    actualNoBenchmarkOrLeaseOrBudgetOrPolicyOrPublicLedgerMutation: true
});
console.log(JSON.stringify({ actualPrepared: true, root, inheritedMvid: pe.mvid, inheritedRawDocumentsVerified: rawDocuments.length, defaultCommit: current, graph }, null, 2));
