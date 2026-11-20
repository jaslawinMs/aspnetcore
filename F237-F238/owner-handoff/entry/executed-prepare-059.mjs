import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(session, 'autoperf-parallelism', 'finding-F237-F238-059');
const repository = String.raw`C:\src\aspnetcore`;
const graphs = { Original: String.raw`C:\src\ap-F237-o059`, Default: String.raw`C:\src\ap-F237-d059` };
const original = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const sdk = String.raw`C:\src\ap-F176-d022\.dotnet`;
const target = 'src/Mvc/Mvc.Razor.RuntimeCompilation/src/RazorProjectPageRouteModelProvider.cs';
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
assert(!fs.existsSync(root));
for (const graph of Object.values(graphs)) assert(!fs.existsSync(graph));
assert(fs.existsSync(path.join(sdk, 'dotnet.exe')));
fs.mkdirSync(root);
fs.mkdirSync(path.join(root, 'commands'));
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(root, 'executed-prepare-059.mjs'));
let serial = 0;
const commands = [];
function execute(command, args) {
    const id = String(++serial).padStart(3, '0');
    const value = spawnSync(command, args, { cwd: repository, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
    assert.ifError(value.error);
    fs.writeFileSync(path.join(root, 'commands', id + '.stdout'), value.stdout, { flag: 'wx' });
    fs.writeFileSync(path.join(root, 'commands', id + '.stderr'), value.stderr, { flag: 'wx' });
    commands.push({ id, command, arguments: args, actualExitCode: value.status });
    fs.writeFileSync(path.join(root, 'commands.json'), JSON.stringify(commands, null, 2) + '\n');
    assert.equal(value.status, 0, value.stderr.toString('utf8'));
    return value.stdout;
}
const defaultObservation = execute('gh', ['api', 'repos/dotnet/aspnetcore/commits/main']);
fs.writeFileSync(path.join(root, 'independent-github-default-observation.json'), defaultObservation, { flag: 'wx' });
const observedDefault = JSON.parse(defaultObservation.toString('utf8')).sha;
assert.match(observedDefault, /^[a-f0-9]{40}$/);
execute('git', ['--no-pager', 'cat-file', '-e', observedDefault + '^{commit}']);
const blob = {};
for (const [role, commit] of [['Original', original], ['Default', observedDefault]]) {
    blob[role] = execute('git', ['--no-pager', 'rev-parse', commit + ':' + target]).toString('utf8').trim();
    const source = execute('git', ['--no-pager', 'show', commit + ':' + target]);
    fs.writeFileSync(path.join(root, role + '-git-provider.cs'), source, { flag: 'wx' });
    fs.writeFileSync(path.join(root, role + '-global.json.snapshot'), execute('git', ['--no-pager', 'show', commit + ':global.json']), { flag: 'wx' });
    execute('git', ['-c', 'core.longpaths=true', '--no-pager', 'clone', '--no-hardlinks', '--no-checkout', repository, graphs[role]]);
    execute('git', ['-c', 'core.longpaths=true', '--no-pager', '-C', graphs[role], 'checkout', '--detach', commit]);
    assert(!fs.existsSync(path.join(graphs[role], '.git', 'objects', 'info', 'alternates')));
    fs.symlinkSync(sdk, path.join(graphs[role], '.dotnet'), 'junction');
}
assert.equal(blob.Original, blob.Default);
fs.writeFileSync(path.join(root, 'bounded-provider-history.txt'),
    execute('git', ['--no-pager', 'log', '-8', '--format=%H %cI %s', observedDefault, '--', target]), { flag: 'wx' });
for (const [name, source] of [
    ['area-AGENTS.md', 'src/Mvc/AGENTS.md'],
    ['BuildFromSource.md', 'docs/BuildFromSource.md'],
    ['PageDirectiveFeature.cs', 'src/Mvc/Mvc.Razor.RuntimeCompilation/src/PageDirectiveFeature.cs'],
    ['PageRouteModelFactory.cs', 'src/Mvc/Mvc.RazorPages/src/ApplicationModels/PageRouteModelFactory.cs'],
    ['registration-and-obsolescence.cs', 'src/Mvc/Mvc.Razor.RuntimeCompilation/src/DependencyInjection/RazorRuntimeCompilationMvcCoreBuilderExtensions.cs']
]) fs.writeFileSync(path.join(root, name), execute('git', ['--no-pager', 'show', observedDefault + ':' + source]), { flag: 'wx' });
const plan = {
    recordedAt: new Date().toISOString(), findings: ['F237', 'F238'], actualOriginal: original, actualPinnedDefault: observedDefault,
    actualTarget: target, actualEqualTargetBlob: blob.Original, actualIndependentGraphs: graphs,
    actualSdkReadOnlyJunctionTarget: sdk, actualSdkResolvedPath: fs.realpathSync(sdk),
    actualNoGitHardlinksOrAlternatesRequested: true,
    actualNoNativeTestOrCandidateOrCounterOrBudgetAuthorizationYet: true,
    nativeProject: 'src\\Mvc\\Mvc.Razor.RuntimeCompilation\\test\\Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test.csproj',
    nativeFilter: 'FullyQualifiedName~FileProviderRazorProjectFileSystemTest|FullyQualifiedName~RazorRuntimeCompilationMvcCoreBuilderExtensionsTest',
    selectionFrozenBeforeFirstNativeCompile: true,
    focusedOwner: 'ONE RazorProjectPageRouteModelProvider, real physical file-provider/Razor page-directive/factory producers; not synthetic prefetched route lists',
    acceptance: [
        'Actual registered provider, area-before-normal order, RelativePath.OrdinalIgnoreCase not ViewEnginePath',
        'Owned real physical empty/singleton/multiple files, normal-root versus overlapping-root, actual page directive parsing and real model/selector/area values',
        'Actual unsupported area paths and non-page files do not become prematurely registered; distinguish diagnostics from model output',
        'Duplicate area/normal overlap must be produced by the real physical file-system enumerations, not injected repeated rows',
        'Compiled/prepopulated model and malformed-directive cases require their own faithful producer evidence before any candidate claim',
        'One accepted CSharp13 common DLL for role-native owner/dependency/runtime images; actual runtime/managed hash/MVID observations',
        'Native focused XML rows/definitions/entries/counters and common actual effect assertions, all failures retained'
    ],
    workloadGate: 'Public registration explicitly says runtime compilation is obsolete/not recommended for production; development should use Hot Reload. No material supported discovery workload established yet. Do not equate quadratic source shape with a justified performance proposal.',
    hotReloadScope: 'Any prospective lookup index would be per-OnProvidersExecuting invocation, not a process-wide metadata cache. Existing subsystem refresh/lifetime must not be changed.',
    actualNoPerformanceAcceptanceDatasetOrCandidateAuthorized: true,
    actualPreserveAllSealedCasesAndCoordinatorF145Worktree: true,
    actualOtherPreparationOwners: ['1c035f72-adf2-474b-a351-8aa038d29537', '0e85e324-8f1c-4eb5-8036-b8f2a9e3f6d4'],
    actualGlobalJsonBefore: hash(fs.readFileSync(path.join(repository, 'global.json')))
};
fs.writeFileSync(path.join(root, 'entry-plan.json'), JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualPrepared: true, actualOriginal: original, actualPinnedDefault: observedDefault,
    actualEqualTargetBlob: blob.Original, actualIndependentGraphs: graphs, actualNoNativeOrCandidateOrMeasurement: true }, null, 2));
