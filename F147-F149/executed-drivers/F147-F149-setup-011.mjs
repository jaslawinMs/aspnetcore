import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const repository = String.raw`C:\src\aspnetcore`;
const root = path.join(session, 'autoperf-parallelism', 'finding-F147-F149-implementation-011');
const prior = path.join(session, 'autoperf-parallelism', 'finding-F147-F149-010', 'capsule');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const planPath = path.join(root, 'acceptance.json');
const plan = read(planPath);
assert.equal(plan.definedBeforeCandidateImplementationOrTiming, true);
assert.equal(fs.existsSync(path.join(root, 'source-graphs.json')), false);
assert.equal(fs.existsSync(path.join(root, 'setup')), false);
assert.equal(read(path.join(session, 'F147-F149-coordinator-owner-verification-010.json')).actualParsedNativeRows.length, 26);
assert.equal(read(path.join(session, 'F147-F149-coordinator-selected-metadata-010.json')).actualAuditorResult.passed, true);
assert.equal(hash(path.join(prior, 'MANIFEST.json')), '934EDEC9D40C39FC4C6F1004C2FB97577D824991C6CF60EF506903014B95DA53');
const roles = {
    Original: String.raw`C:\src\autoperf-f147-original-011`,
    CurrentDefault: String.raw`C:\src\autoperf-f147-default-011`
};
for (const graph of Object.values(roles))
{
    assert.equal(fs.existsSync(graph), false, 'Use only new, independent private source graphs.');
}
fs.mkdirSync(path.join(root, 'setup'));
fs.mkdirSync(path.join(root, 'logs'));
fs.mkdirSync(path.join(root, 'prepared'));
fs.mkdirSync(path.join(root, 'results'));
fs.mkdirSync(path.join(root, 'evidence'));
write(path.join(root, 'setup-started.json'), { recordedAt: new Date().toISOString(),
    actualPlanSha256BeforeAnyNativeOrCandidate: hash(planPath), coordinatorPid: process.pid,
    actualNoCandidateOrBenchmarkStarted: true });
let ordinal = 0;
function run(label, executable, args, cwd = root, expectedNonzero = false)
{
    const result = spawnSync(executable, args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
    const receipt = { label, executable, arguments: args, workingDirectory: cwd, actualPid: result.pid,
        actualExitCode: result.status, actualTerminal: result.status !== null, stdout: result.stdout,
        stderr: result.stderr, actualError: result.error?.message ?? null, actualStreamsDrained: !result.error,
        recordedAt: new Date().toISOString(), actualPerformanceMeasurement: false };
    write(path.join(root, 'setup', `${String(++ordinal).padStart(2, '0')}-${label}.json`), receipt);
    assert.ifError(result.error);
    if (!expectedNonzero)
    {
        assert.equal(result.status, 0, label + '\n' + result.stderr + '\n' + result.stdout);
    }

    return result;
}
const defaultPin = run('observe-main', 'gh', ['api', 'repos/dotnet/aspnetcore/commits/main', '--jq', '.sha']).stdout.trim();
assert.match(defaultPin, /^[a-f0-9]{40}$/);
const pins = { Original: plan.originalSource, CurrentDefault: defaultPin };
const sourcePath = 'src/Servers/Kestrel/samples/WebTransportInteractiveSampleApp/Program.cs';
const graphs = [];
for (const [role, graph] of Object.entries(roles))
{
    const remoteBlob = run(`${role}-target-freshness`, 'gh', ['api',
        `repos/dotnet/aspnetcore/contents/${sourcePath}?ref=${pins[role]}`, '--jq', '.sha']).stdout.trim();
    assert.equal(remoteBlob, plan.acceptedTargetGitBlob);
    run(`${role}-clone`, 'git', ['-c', 'core.longpaths=true', 'clone', '--local', '--no-checkout', '--quiet', repository, graph]);
    run(`${role}-longpaths`, 'git', ['config', 'core.longpaths', 'true'], graph);
    run(`${role}-rename-local-cache`, 'git', ['remote', 'rename', 'origin', 'source-cache'], graph);
    run(`${role}-read-only-upstream`, 'git', ['remote', 'add', 'upstream', 'https://github.com/dotnet/aspnetcore.git'], graph);
    const object = run(`${role}-object-probe`, 'git', ['cat-file', '-e', pins[role] + '^{commit}'], graph, true);
    if (object.status !== 0)
    {
        assert.equal(object.status, 128);
        run(`${role}-fetch-exact-pin`, 'git', ['fetch', '--no-tags', '--quiet', 'upstream', pins[role]], graph);
    }
    run(`${role}-detach-pin`, 'git', ['-c', 'core.longpaths=true', 'checkout', '--detach', '--quiet', pins[role]], graph);
    assert.equal(run(`${role}-head`, 'git', ['rev-parse', 'HEAD'], graph).stdout.trim(), pins[role]);
    assert.equal(run(`${role}-target-blob`, 'git', ['rev-parse', 'HEAD:' + sourcePath], graph).stdout.trim(), remoteBlob);
    assert.equal(run(`${role}-tracked-clean`, 'git', ['status', '--porcelain', '--untracked-files=no'], graph).stdout.trim(), '');
    fs.symlinkSync(path.join(repository, '.dotnet'), path.join(graph, '.dotnet'), 'junction');
    assert.equal(fs.realpathSync(path.join(graph, '.dotnet')).toLowerCase(), fs.realpathSync(path.join(repository, '.dotnet')).toLowerCase());
    const global = read(path.join(graph, 'global.json'));
    assert.equal(global.sdk.version, '12.0.100-alpha.1.26557.102');
    graphs.push({ role, graph, sourceCommit: pins[role], actualTargetGitBlob: remoteBlob,
        actualRawSourceSha256: hash(path.join(graph, plan.target)), actualGlobalJsonSha256: hash(path.join(graph, 'global.json')),
        actualSdkVersion: global.sdk.version, actualMsbuildSdks: global['msbuild-sdks'],
        actualDotnetJunctionTarget: fs.realpathSync(path.join(graph, '.dotnet')),
        actualSharedPhysicalToolchain: true, actualNoIndependentlyInstalledSdkClaim: true,
        actualDefaultWholeFrameworkOrRuntimeValidationClaimed: false });
}
for (const file of ['CompiledSampleProducerTests.cs', 'Probe010.targets'])
{
    const source = path.join(prior, 'prepared', file), destination = path.join(root, 'prepared', file);
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    assert.equal(hash(source), hash(destination));
}
const oldNative = path.join(prior, 'Invoke-Native010.ps1');
const newNative = path.join(root, 'Invoke-Native010.ps1');
fs.copyFileSync(oldNative, newNative, fs.constants.COPYFILE_EXCL);
assert.equal(hash(oldNative), hash(newNative));
write(path.join(root, 'source-graphs.json'), { recordedAt: new Date().toISOString(),
    actualAcceptancePlanSha256: hash(planPath), actualFreshDefaultAtEntry: defaultPin,
    actualSourceGraphs: graphs, actualSourceSetupInvocations: ordinal,
    actualNativeDotnetCommandsStarted: 0, actualCandidateApplied: false, actualBenchmarkStarted: false,
    sourceRuntimeBoundary: plan.sourceAndRuntimeBoundary });
console.log(JSON.stringify({ actualSetupInvocations: ordinal, actualGraphs: graphs,
    actualNoDotnetCandidateOrBenchmarkStarted: true }, null, 2));
