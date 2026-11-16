import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url)), repo = 'C:\\src\\aspnetcore';
const root = path.join(session, 'autoperf-runs', 'F116'), directory = path.join(root, 'investigation', 'source-and-history');
assert(!fs.existsSync(directory)); fs.mkdirSync(directory, { recursive: true });
const commands = [], baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5', branch = 'autoperf/F116-boxed-port-cache';
const hash = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
function run(name, args)
{
    const result = spawnSync('git', args, { cwd: repo, maxBuffer: 32 * 1024 * 1024 });
    fs.writeFileSync(path.join(directory, name + '.log'), result.stdout, { flag: 'wx' });
    fs.writeFileSync(path.join(directory, name + '.stderr.log'), result.stderr, { flag: 'wx' });
    commands.push({ name, entryPoint: 'git', arguments: args, exitCode: result.status });
    fs.writeFileSync(path.join(directory, 'commands.json'), JSON.stringify({ commands }, null, 2) + '\n');
    assert.equal(result.status, 0, name + ':' + result.stderr.toString());

    return result.stdout;
}
assert.equal(run('baseline-head', ['rev-parse', 'HEAD']).toString().trim(), baseline);
assert.equal(run('branch', ['branch', '--show-current']).toString().trim(), branch);
assert.equal(run('tracked-clean', ['status', '--porcelain', '--untracked-files=no']).length, 0);
const freshDefault = run('fresh-default', ['rev-parse', 'FETCH_HEAD']).toString().trim();
assert.equal(freshDefault, '0d5708d05bb47d5ae84cecd1b12dff7b1d90c84b');
const files = [
    'src\\Shared\\ConnectionEndpointTags.cs',
    'src\\Servers\\Kestrel\\Core\\src\\Internal\\Infrastructure\\KestrelMetrics.cs',
    'src\\Servers\\Kestrel\\Core\\src\\Internal\\Infrastructure\\ConnectionMetricsContext.cs',
    'src\\Servers\\Kestrel\\Core\\src\\Microsoft.AspNetCore.Server.Kestrel.Core.csproj',
    'src\\SignalR\\server\\Core\\src\\Microsoft.AspNetCore.SignalR.Core.csproj',
    'src\\SignalR\\common\\Http.Connections\\src\\Microsoft.AspNetCore.Http.Connections.csproj',
    'src\\SignalR\\server\\Core\\src\\Internal\\DefaultHubDispatcher.cs',
    'src\\Servers\\Kestrel\\perf\\Microbenchmarks\\KestrelMetricsBenchmark.cs',
    'src\\SignalR\\perf\\Microbenchmarks\\DefaultHubDispatcherTelemetryBenchmark.cs',
    'src\\Servers\\Kestrel\\test\\InMemory.FunctionalTests\\KestrelMetricsTests.cs',
    'src\\Servers\\Kestrel\\test\\InMemory.FunctionalTests\\InMemory.FunctionalTests.csproj',
    'src\\SignalR\\server\\SignalR\\test\\Microsoft.AspNetCore.SignalR.Tests\\Microsoft.AspNetCore.SignalR.Tests.csproj',
    'src\\SignalR\\server\\SignalR\\test\\Microsoft.AspNetCore.SignalR.Tests\\HubConnectionHandlerTests.Activity.cs',
    'src\\Servers\\Connections.Abstractions\\src\\DefaultConnectionContext.cs',
    'src\\Servers\\Connections.Abstractions\\src\\BaseConnectionContext.cs',
    'src\\Servers\\Connections.Abstractions\\src\\MultiplexedConnectionContext.cs',
    'src\\Servers\\Connections.Abstractions\\src\\NamedPipeEndPoint.cs',
    'src\\Shared\\Metrics\\TestMeterFactory.cs',
    'src\\Servers\\Kestrel\\Core\\src\\Internal\\Http2\\Http2Connection.cs',
    'src\\Servers\\Kestrel\\Core\\src\\Internal\\Http2\\Http2StreamOfT.cs',
    'src\\Servers\\Kestrel\\Core\\src\\Internal\\Http3\\Http3Connection.cs',
    'src\\Servers\\Kestrel\\Core\\src\\Internal\\Http3\\Http3StreamOfT.cs'
];
const identities = files.map((relative, index) =>
{
    const gitPath = relative.replaceAll('\\', '/'), original = run(`baseline-${index}`, ['show', `${baseline}:${gitPath}`]);
    const current = run(`default-${index}`, ['show', `${freshDefault}:${gitPath}`]), working = fs.readFileSync(path.join(repo, relative));
    const canonical = Buffer.from(working.toString('utf8').replace(/\r\n/g, '\n')); assert(original.equals(canonical));
    for (const [prefix, bytes] of [['baseline-canonical', original], ['current-default-canonical', current], ['producer-source', working]])
    {
        const destination = path.join(root, prefix, relative); fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, bytes, { flag: 'wx' });
    }

    return { path: relative, baselineCanonicalSha256: hash(original), currentCanonicalSha256: hash(current),
        workingRawSha256: hash(working), canonicalEqual: original.equals(current) };
});
const different = identities.filter(row => !row.canonicalEqual);
assert(different.every(row => row.path === 'src\\Servers\\Kestrel\\Core\\src\\Internal\\Http2\\Http2Connection.cs'));
const http2Name = 'src\\Servers\\Kestrel\\Core\\src\\Internal\\Http2\\Http2Connection.cs';
const queued = '_context.ServiceContext.Metrics.RequestQueuedStart(_metricsContext, KestrelMetrics.Http2);';
for (const prefix of ['baseline-canonical', 'current-default-canonical'])
    assert(fs.readFileSync(path.join(root, prefix, http2Name), 'utf8').includes(queued));
run('actual-default-owner-differences', ['diff', baseline, freshDefault, '--', ...files.map(file => file.replaceAll('\\', '/'))]);
run('helper-history', ['log', '-12', '--format=%H %ad %s', '--date=iso-strict', freshDefault, '--', 'src/Shared/ConnectionEndpointTags.cs']);
run('first-port-change', ['show', '--format=fuller', '05cf391d127a8267a4cc3a65eb76e3c3f8ef68d2', '--', 'src/Shared/ConnectionEndpointTags.cs']);
run('shared-source-links', ['grep', '-n', 'ConnectionEndpointTags.cs', freshDefault, '--', 'src']);
run('shared-call-sites', ['grep', '-n', 'ConnectionEndpointTags.AddConnectionEndpointTags', freshDefault, '--', 'src']);
const result = {
    candidate: 'F116', baseline, freshDefault, branch, shippingChanges: false, scopedSourceIdentities: identities,
    exactScopedIdentities: identities.length - different.length, scopedSources: identities.length,
    wholeFileDifferences: different.map(row => row.path),
    unchangedMeasuredComponent: 'ConnectionEndpointTags,KestrelMetrics,ConnectionMetricsContext,SignalR dispatcher,source links and selected owning tests match default/baseline. Fresh default HTTP2 padded-DATA accounting differs in another path;the actual queued-metrics call is retained.',
    contract: 'Integer server.port and endpoint/transport/protocol tag semantics must remain. Source is linked separately into Kestrel.Core,SignalR.Core,Http.Connections;static caches are per assembly. Bounded search finds live Kestrel and SignalR callers,not a Http.Connections hot consumer.',
    existingWork: 'Merged69558 intentionally caches only the first port;replacing the last value regressed under contention. Any follow-on must preserve read-only steady state,bounded retention,first-port and all-miss/concurrent controls. Non-primary-port remainder is not a new unconditional boxing bug.',
    toolingBoundary: 'GitHub semantic code search returned404;LSP found no GetBoxedPort symbol. Targeted actual source/file/project inspection used instead;no complete resolved graph claimed.',
    earlierReadOnlyAttempt: 'An inline PowerShell evidence-read command was rejected before execution for piping directly after foreach. Corrected helper retained actual GitHub reads;this records the transcript failure,not an invented raw log.',
    commands
};
fs.writeFileSync(path.join(root, 'current-source-investigation.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(`F116:${identities.length} scoped sources/${identities.length - different.length} exact current-default identities;${different.length} explicit unrelated whole-file difference,unchanged actual queued-metrics call.`);
