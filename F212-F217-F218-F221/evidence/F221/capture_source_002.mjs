import fs from 'node:fs';
import path from 'node:path';
import { ROOT, REPO, ORIGINAL, OWNER, utc, sha256, writeBytes, writeJson, run, localBlob, remoteBlob, helperStart, helperEnd } from './capture_common_002.mjs';

helperStart('capture_source_002');
const policyRaw = fs.readFileSync(path.join(ROOT, '..', 'policy.json'));
const policy = JSON.parse(policyRaw.toString());
writeBytes(String.raw`guards\policy-start.json`, policyRaw);
writeJson(String.raw`guards\point-observation-start.json`, {
    observedUtc: utc(), policySha256: sha256(policyRaw),
    registeredOwner: policy.independentFindingPreparationWorkers.F221,
    scope: policy.activeWorkerPreparationScopes.F221,
    actualWorkerBuildHoldActive: policy.actualWorkerBuildHoldActive,
    buildAndTestWorkQuiesced: policy.buildAndTestWorkQuiesced,
    benchmarkLeaseExists: fs.existsSync(path.join(ROOT, '..', 'benchmark-exclusive.lease.json')),
    notPerpetualNativePermission: true, sourceOnlyStart: true,
});
if (policy.independentFindingPreparationWorkers.F221 !== OWNER) throw new Error('F221 owner mismatch');

const reservation = {};
for (const [label, args] of [
    ['head', ['rev-parse', 'HEAD']],
    ['branch', ['branch', '--show-current']],
    ['status', ['status', '--porcelain=v1', '--untracked-files=all']],
    ['tracked-diff', ['diff', '--no-ext-diff', '--binary', 'HEAD', '--']],
    ['index-tree', ['ls-files', '--stage']],
]) {
    const data = run(`reserved-start-${label}`, ['git', '--no-pager', ...args]);
    reservation[label] = { bytes: data.length, sha256: sha256(data), stdout: `commands\\reserved-start-${label}\\stdout.bin` };
}
writeJson('reserved-start.json', reservation);
const defaultRef = JSON.parse(run('fresh-upstream-main-ref', ['gh', 'api', 'repos/dotnet/aspnetcore/git/ref/heads/main']).toString());
const currentDefault = defaultRef.object.sha;
writeJson('source-roles.json', {
    repository: 'dotnet/aspnetcore', original: ORIGINAL, default: currentDefault,
    defaultObservedUtc: utc(),
    defaultObservation: 'Fresh read-only gh git/ref/heads/main; subsequently pinned contents by returned full commit.',
    reservedCheckoutIsNotDefault: true, host: process.env.COMPUTERNAME,
});
const paths = [
    'src/Components/Testing/gen/ServiceOverrideAnalyzer.cs',
    'src/Components/Testing/gen/Microsoft.AspNetCore.Components.Testing.Generators.csproj',
];
const sources = [];
for (const gitPath of paths) {
    sources.push(localBlob('Original', ORIGINAL, gitPath));
    sources.push(remoteBlob('Default', currentDefault, gitPath));
}
writeJson('source-stage1.json', sources);
run('original-testing-tree', ['git', '--no-pager', 'ls-tree', '-r', '--name-only', ORIGINAL, '--', 'src/Components/Testing']);
run('original-analyzer-history', ['git', '--no-pager', 'log', '--follow', '--name-status', '-n', '8', '--format=fuller', ORIGINAL, '--', paths[0]]);
run('default-analyzer-history', [
    'gh', 'api', '--method', 'GET', 'repos/dotnet/aspnetcore/commits',
    '-f', `sha=${currentDefault}`, '-f', `path=${paths[0]}`, '-f', 'per_page=8',
]);
run('original-testing-serviceoverride-search', [
    'git', '--no-pager', 'grep', '-n', '-E',
    'ConfigureServices|ServiceOverrideAnalyzer|ServiceOverrideGenerator|ServiceOverride',
    ORIGINAL, '--', 'src/Components/Testing', ':!src/Components/Testing/gen/ServiceOverrideAnalyzer.cs',
], [0, 1]);
const guidancePaths = [
    'src/Components/AGENTS.md', 'src/Components/Testing/AGENTS.md',
    '.github/instructions/components.instructions.md',
    '.github/instructions/cross-cutting-guidance.instructions.md',
    '.github/instructions/build.instructions.md',
    'docs/BlazorComponentsGuidance.md', 'docs/CrossCuttingGuidance.md',
    'docs/BuildFromSource.md', 'src/Components/build.cmd',
];
const guidance = [];
for (const gitPath of guidancePaths) {
    const raw = fs.readFileSync(path.join(REPO, gitPath));
    const artifact = path.join('guidance-reserved', gitPath);
    writeBytes(artifact, raw);
    guidance.push({ path: gitPath, artifact, bytes: raw.length, sha256: sha256(raw), role: 'Reserved checkout guidance, not Default source evidence' });
}
writeJson('guidance-manifest.json', guidance);
helperEnd('capture_source_002');
