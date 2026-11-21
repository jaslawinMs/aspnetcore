import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gitId, sha256, verifyMembership } from './source-objects.mjs';

const root = path.resolve(process.argv[2] ?? import.meta.dirname);
function content(relative)
{
    const file = path.resolve(root, ...relative.split(/[\\/]/));
    assert.ok(file.startsWith(root + path.sep), relative);
    return fs.readFileSync(file);
}
const json = relative => JSON.parse(content(relative).toString('utf8').replace(/^\uFEFF/, ''));
function checked(relative, bytes, hash)
{
    const raw = content(relative);
    assert.equal(raw.length, bytes, relative);
    assert.equal(sha256(raw), hash.toUpperCase(), relative);
    return raw;
}
const evidence = json('evidence-index.json');
assert.equal(new Set(evidence.files.map(item => item.file)).size, evidence.files.length);
for (const item of evidence.files)
{
    checked(item.file, item.bytes, item.sha256);
}
const handoff = json('evidence/HANDOFF.json');
assert.equal(sha256(content('evidence/HASHES.json')), handoff.indexSha256);
const index = json('evidence/HASHES.json');
assert.equal(index.files.length + 2, evidence.files.length);
for (const item of index.files)
{
    checked('evidence/' + item.path, item.bytes, item.sha256);
}
assert.equal(handoff.decision, 'bounded-source-only-no-material-candidates');
assert.equal(handoff.nativeStarts, 0);
assert.equal(handoff.comparisonsAuthorized, 0);
const membership = json('evidence/source-membership.json');
const objects = verifyMembership(path.join(root, 'evidence'), membership);
assert.equal(objects.memberships, 28);
assert.equal(objects.objects, 34);
for (const item of membership.sources)
{
    assert.equal(gitId('blob', checked('evidence/' + item.artifact, item.bytes, item.sha256)), item.blob);
}
const external = json('evidence/external-source.json');
assert.equal(external.length, 16);
for (const item of external)
{
    const raw = checked('evidence/' + item.artifact, item.bytes, item.sha256);
    assert.equal(gitId('blob', raw), item.gitBlob);
    assert.equal(item.actualLoadedRuntimeObserved, false);
    const versions = content(`evidence/source/${item.role}/eng/Version.Details.xml`).toString('utf8');
    const name = item.dependencyName.replaceAll('.', '\\.');
    const dependency = versions.match(new RegExp(`<Dependency Name="${name}" Version="([^"]+)">([\\s\\S]*?)<\\/Dependency>`));
    assert.equal(dependency[1], item.declaredVersion);
    assert.ok(dependency[2].includes('<Sha>' + item.commit + '</Sha>'));
}
for (const role of ['Original', 'Default'])
{
    const source = file => content(`evidence/source/${role}/${file}`).toString('utf8');
    const program = source('src/Servers/Kestrel/samples/http2cat/Program.cs');
    assert.ok(program.includes('Trace.Assert(headersFrame.Type == Http2FrameType.HEADERS, headersFrame.Type.ToString());'));
    assert.ok(program.includes('h2Connection.Logger.LogInformation(Encoding.UTF8.GetString(dataFrame.Payload.ToArray()));'));
    assert.ok(program.includes('loggingBuilder.AddConsole();'));
    assert.equal(program.split('var dataFrame = await h2Connection.ReceiveFrameAsync();').length, 2);
    const helper = source('src/Shared/Http2cat/Http2Utilities.cs');
    assert.ok(helper.includes('public Memory<byte> Payload { get; set; }'));
    assert.ok(helper.includes('frame.Payload = framePayload.ToArray();'));
    assert.ok(helper.includes('_pair.Application.Input.AdvanceTo(consumed, examined);'));
    const service = source('src/Shared/Http2cat/Http2CatHostedService.cs');
    assert.equal(service.split('await Options.Scenaro(http2Utilities);').length, 2);
    assert.ok(service.includes('HostApplicationLifetime.StopApplication();'));
    const peer = source('src/Shared/ServerInfrastructure/Http2/Http2PeerSettings.cs');
    assert.ok(peer.includes('DefaultMaxFrameSize = MinAllowedMaxFrameSize'));
    assert.ok(peer.includes('MinAllowedMaxFrameSize = 16 * 1024'));
    const dependency = file => content(`evidence/external/${role}/${file}`).toString('utf8');
    assert.ok(dependency('Trace.cs').includes('[Conditional("TRACE")]'));
    assert.ok(dependency('Memory.cs').includes('public T[] ToArray() => Span.ToArray();'));
    assert.ok(dependency('LoggingServiceCollectionExtensions.cs').includes('new DefaultLoggerLevelConfigureOptions(LogLevel.Information)'));
    assert.ok(dependency('LoggerExtensions.cs').includes('LogInformation(this ILogger logger, string? message, params object?[] args)'));
}
const commands = json('evidence/COMMANDS.json');
assert.equal(commands.length, 59);
assert.ok(commands.every(item => item.exitCode === 0 && item.rootWaited && item.redirectedStreamsDrained));
const terminal = json('evidence/owned-terminal.json');
assert.equal(terminal.sourceCommands, 59);
assert.equal(terminal.completedWaitedDrained, 59);
assert.equal(terminal.nativeBuildTestRestoreServerRuntimeProbeStarts, 0);
assert.equal(terminal.benchmarkTimingAllocationCounterProfilerStarts, 0);
assert.deepEqual(terminal.repositoryChanges, []);
assert.deepEqual(terminal.privateGraphsCreated, []);
if (fs.existsSync(path.join(root, 'capsule-file-hashes.json')) || process.argv.includes('--require-seal'))
{
    const seal = json('capsule-file-hashes.json');
    for (const item of seal.files)
    {
        checked(item.file, item.bytes, item.sha256);
    }
    function files(directory, relative = '')
    {
        return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
        {
            assert.equal(entry.isSymbolicLink(), false);
            const logical = relative ? relative + '/' + entry.name : entry.name;
            return entry.isDirectory() ? files(path.join(directory, entry.name), logical) : [logical];
        });
    }
    assert.deepEqual(files(root).filter(item => !['capsule-file-hashes.json', 'publication.json'].includes(item)).sort(),
        seal.files.map(item => item.file).sort());
}
console.log(JSON.stringify({ findings: ['F210', 'F211'], completeCopiedEvidenceFiles: evidence.files.length,
    rawGitObjects: objects.objects, sourceMemberships: objects.memberships, completeDeclaredExternalSourceBlobs: external.length,
    sourceCommandsTerminal: commands.length, actualPayloadType: 'Memory<byte>', frameSizeBoundIsSourceNotObserved: 16384,
    selectedLoggerTraceSymbolsAndRuntimeObserved: false, candidateChanges: 0,
    nativeProductBuildTestServerRuntimeProbesOrComparisons: 0, sourceOnly: true }));
