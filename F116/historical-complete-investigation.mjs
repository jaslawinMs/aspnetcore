import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url)), repo = 'C:\\src\\aspnetcore';
const root = path.join(session, 'autoperf-runs', 'F116'), initial = path.join(root, 'investigation', 'source-and-history');
const directory = path.join(root, 'investigation', 'completed-source-scope');
assert(!fs.existsSync(directory)); fs.mkdirSync(directory, { recursive: true });
const commands = JSON.parse(fs.readFileSync(path.join(initial, 'commands.json'), 'utf8')).commands;
assert(commands.every(row => row.exitCode === 0)); const priorCommands = commands.length;
const hash = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
function run(name, args)
{
    const result = spawnSync('git', args, { cwd: repo, maxBuffer: 32 * 1024 * 1024 });
    fs.writeFileSync(path.join(directory, name + '.log'), result.stdout, { flag: 'wx' });
    fs.writeFileSync(path.join(directory, name + '.stderr.log'), result.stderr, { flag: 'wx' });
    commands.push({ name, entryPoint: 'git', arguments: args, exitCode: result.status });
    fs.writeFileSync(path.join(directory, 'commands.json'), JSON.stringify({ commands: commands.slice(priorCommands) }, null, 2) + '\n');
    assert.equal(result.status, 0, name);

    return result.stdout;
}
assert.equal(run('still-tracked-clean', ['status', '--porcelain', '--untracked-files=no']).length, 0);
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5', freshDefault = '0d5708d05bb47d5ae84cecd1b12dff7b1d90c84b';
assert.equal(run('still-baseline', ['rev-parse', 'HEAD']).toString().trim(), baseline);
const files = commands.slice(0, priorCommands).filter(row => /^baseline-\d+$/.test(row.name)).map(row => row.arguments[1].slice(41).replaceAll('/', '\\'));
assert.equal(files.length, 22);
const identities = files.map(relative =>
{
    const original = fs.readFileSync(path.join(root, 'baseline-canonical', relative));
    const current = fs.readFileSync(path.join(root, 'current-default-canonical', relative));
    const working = fs.readFileSync(path.join(repo, relative));
    assert(original.equals(Buffer.from(working.toString('utf8').replace(/\r\n/g, '\n'))));
    assert(working.equals(fs.readFileSync(path.join(root, 'producer-source', relative))));

    return { path: relative, baselineCanonicalSha256: hash(original), currentCanonicalSha256: hash(current),
        workingRawSha256: hash(working), canonicalEqual: original.equals(current) };
});
const different = identities.filter(row => !row.canonicalEqual), testPath = 'src\\Servers\\Kestrel\\test\\InMemory.FunctionalTests\\KestrelMetricsTests.cs';
assert.deepEqual(different.map(row => row.path), [testPath]);
const original = fs.readFileSync(path.join(root, 'baseline-canonical', testPath), 'utf8');
const current = fs.readFileSync(path.join(root, 'current-default-canonical', testPath), 'utf8');
const assertion = '        Assert.Collection(connectionDuration.GetMeasurementSnapshot(), m => AssertDuration(m, "127.0.0.1", localPort: 0, "tcp", "ipv4", KestrelMetrics.Http2, error: KestrelMetrics.GetErrorType(ConnectionEndReason.AppShutdownTimeout)));';
const wait = '        await connectionDuration.WaitForMeasurementsAsync(minCount: 1).DefaultTimeout();\n\n';
assert(current.includes(wait + assertion)); assert.equal(current.replace(wait + assertion, assertion), original);
run('actual-default-owner-differences', ['diff', baseline, freshDefault, '--', ...files.map(file => file.replaceAll('\\', '/'))]);
run('helper-history', ['log', '-12', '--format=%H %ad %s', '--date=iso-strict', freshDefault, '--', 'src/Shared/ConnectionEndpointTags.cs']);
run('first-port-change', ['show', '--format=fuller', '05cf391d127a8267a4cc3a65eb76e3c3f8ef68d2', '--', 'src/Shared/ConnectionEndpointTags.cs']);
run('shared-source-links', ['grep', '-n', 'ConnectionEndpointTags.cs', freshDefault, '--', 'src']);
run('shared-call-sites', ['grep', '-n', 'ConnectionEndpointTags.AddConnectionEndpointTags', freshDefault, '--', 'src']);
const amendment = {
    candidate: 'F116', shippingChangesBeforeAmendment: false, actualTimingProfilesBeforeAmendment: 0,
    initialSourceHelperExitCode: 1, allInitialGitChildCommandsExitedZero: true,
    initialAssumption: 'Expected any whole-file current-default difference to be in HTTP2 padded-DATA accounting.',
    observedDifference: 'Only KestrelMetricsTests differs:one awaited metric-observation wait before an HTTP2 shutdown assertion. The actual22 scoped snapshots show21 exact files,including all shipping/metric/helper/dispatcher/HTTP2/HTTP3 source.',
    initialAcceptancePreserved: 'development\\pre-edit-source-scope\\acceptance-initial.json',
    resourceGoalSha256Unchanged: hash(fs.readFileSync(path.join(root, 'resource-goals.json'))),
    correction: 'Audit existing captured bytes and preserve full test difference;do not alter baseline shipping/test source or claim full current-default integration execution.'
};
const result = {
    candidate: 'F116', baseline, freshDefault, branch: 'autoperf/F116-boxed-port-cache', shippingChanges: false,
    scopedSourceIdentities: identities, exactScopedIdentities: 21, scopedSources: 22, wholeFileDifferences: [testPath],
    currentTestOnlyDifferenceVerified: true, sourceScopeAmendment: amendment,
    unchangedMeasuredComponent: 'All21 scoped shipping/other files match. Only a current owning test adds one awaited observation;captured baseline test remains unchanged. This establishes component-source equivalence,not a full current-default server build/run.',
    contract: 'Integer server.port and endpoint/transport/protocol tags preserved. Three separately linked assembly copies have independent static caches;bounded source search finds live Kestrel/SignalR callers,not a Http.Connections hot consumer.',
    existingWork: 'Merged69558 intentionally caches first port and leaves other boxes;replacing-last regressed under contention. Follow-on two stable slots must retain read-only steady state,bounded startup/retention,first/all-miss/concurrent controls.',
    toolingBoundary: 'GitHub semantic search404 and LSP no GetBoxedPort symbol;targeted actual sources/projects used,no complete resolved graph claim.',
    earlierReadOnlyAttempt: 'An inline PowerShell evidence-read command was rejected before execution for piping after foreach. This is a transcript-failure note,not an invented raw log.',
    commands
};
fs.writeFileSync(path.join(root, 'pre-edit-source-scope-amendment.json'), JSON.stringify(amendment, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(root, 'current-source-investigation.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
assert.equal(read(path.join(root, 'measurement-budget.json')).startedSourceComparisons, 0);
console.log('F116:22 captured sources/21 exact current-default files;only one owning-test wait differs,all shipping component/producer source identical;pre-edit scope amendment preserved.');
