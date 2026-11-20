import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const root = path.join(session, 'autoperf-parallelism', 'finding-F147-F149-implementation-011');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function inventory(directory, relative = '')
{
    return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry =>
    {
        assert.equal(entry.isSymbolicLink(), false);
        const logical = relative ? relative + '/' + entry.name : entry.name;
        const file = path.join(directory, entry.name);
        return entry.isDirectory() ? inventory(file, logical) : [{ file: logical, bytes: fs.statSync(file).size, sha256: hash(file) }];
    });
}
function same(directory, files)
{
    assert.deepEqual(inventory(directory), files);
}
const [role, variant] = process.argv.slice(2);
assert.equal(process.argv.length, 4);
assert.ok(['Original', 'CurrentDefault'].includes(role));
assert.ok(['Baseline', 'F147', 'F149'].includes(variant));
const plan = read(path.join(root, 'acceptance.json'));
const setup = read(path.join(root, 'source-graphs.json'));
assert.equal(hash(path.join(root, 'acceptance.json')), setup.actualAcceptancePlanSha256);
const graph = setup.actualSourceGraphs.find(item => item.role === role);
const commonGraph = setup.actualSourceGraphs.find(item => item.role === 'Original').graph;
const commonOutput = path.join(commonGraph, 'artifacts', 'bin', 'InMemory.FunctionalTests', 'Release', 'net12.0');
const fixtureReceipt = read(path.join(root, 'logs', 'Original-Baseline-Fixture-2.receipt.json'));
assert.equal(fixtureReceipt.exitCode, 0);
const commonFile = path.join(root, 'common-identity.json');
if (!fs.existsSync(commonFile))
{
    assert.equal(role, 'Original');
    assert.equal(variant, 'Baseline');
    const config = read(path.join(commonOutput, 'InMemory.FunctionalTests.runtimeconfig.json'));
    assert.equal(config.runtimeOptions.framework.version, plan.sourceAndRuntimeBoundary.runtime);
    const files = inventory(commonOutput);
    const canonicalNames = ['InMemory.FunctionalTests.dll', 'InMemory.FunctionalTests.pdb',
        'InMemory.FunctionalTests.deps.json', 'InMemory.FunctionalTests.runtimeconfig.json'];
    const runtimeDirectory = path.join(String.raw`C:\src\aspnetcore\.dotnet`, 'shared', 'Microsoft.NETCore.App', plan.sourceAndRuntimeBoundary.runtime);
    write(commonFile, { recordedAt: new Date().toISOString(), actualSuccessfulCompilations: 1,
        graph: commonGraph, actualOutputDirectory: commonOutput, actualFiles: files,
        actualCanonicalFiles: canonicalNames.map(file => files.find(item => item.file === file)),
        actualArtifactSourceSha256: hash(path.join(root, 'prepared', 'CompiledSampleProducerTests.cs')),
        actualCustomTargetsSha256: hash(path.join(root, 'prepared', 'Probe010.targets')),
        actualRuntimeDirectory: runtimeDirectory, actualAllRuntimeFiles: inventory(runtimeDirectory),
        actualWholeDefaultFrameworkClaimed: false, actualNoTimingOrCounterStarted: true });
}
const common = read(commonFile);
same(commonOutput, common.actualFiles);
assert.equal(hash(path.join(root, 'prepared', 'CompiledSampleProducerTests.cs')), common.actualArtifactSourceSha256);
const source = path.join(graph.graph, plan.target);
const raw = fs.readFileSync(source);
const original = fs.readFileSync(path.join(session, 'autoperf-parallelism', 'finding-F147-F149-010',
    'capsule', 'evidence', 'raw-source', 'Original', plan.target));
const normalized = bytes => bytes.toString('utf8').replaceAll('\r\n', '\n');
const first = 'Encoding.Default.GetString(memory[..length].ToArray())';
const second = 'Encoding.Default.GetString(outputMemory.ToArray())';
assert.equal(normalized(original).split(first).length, 2);
assert.equal(normalized(original).split(second).length, 2);
const expected = variant === 'F147'
    ? normalized(original).replace(first, 'Encoding.Default.GetString(memory.Span[..length])')
    : variant === 'F149'
        ? normalized(original).replace(second, 'Encoding.Default.GetString(outputMemory.Span)')
        : normalized(original);
assert.equal(normalized(raw), expected, 'Variant source must be the exact independent one-line candidate.');
const output = path.join(graph.graph, 'artifacts', 'bin', 'WebTransportInteractiveSampleApp', 'Release', 'net12.0');
const destination = path.join(root, 'images', role, variant);
assert.equal(fs.existsSync(destination), false);
fs.mkdirSync(path.dirname(destination), { recursive: true });
const files = inventory(output);
fs.cpSync(output, destination, { recursive: true, errorOnExist: true, force: false });
same(destination, files);
const sourceDirectory = path.join(root, 'inputs', role, variant);
fs.mkdirSync(sourceDirectory, { recursive: true });
fs.copyFileSync(source, path.join(sourceDirectory, 'Program.cs'), fs.constants.COPYFILE_EXCL);
const record = { recordedAt: new Date().toISOString(), role, variant, sourceCommit: graph.sourceCommit,
    actualSourceGraph: graph.graph, actualImagePath: destination, actualAllImageFiles: files,
    actualRawSourceSnapshot: path.join(sourceDirectory, 'Program.cs'), actualRawSourceSha256: hash(source),
    actualNormalizedSourceIsExactPlannedVariant: true, actualOwnerSha256: hash(path.join(destination, 'WebTransportInteractiveSampleApp.dll')),
    actualOwnerPdbSha256: hash(path.join(destination, 'WebTransportInteractiveSampleApp.pdb')),
    actualCommonIdentitySha256: hash(commonFile), actualAcceptancePlanSha256: hash(path.join(root, 'acceptance.json')),
    actualCommonGraphOriginalForEveryRole: true, actualRuntime: plan.sourceAndRuntimeBoundary.runtime,
    actualWholeDefaultFrameworkClaimed: false, actualPrefixExemptions: [], actualNoTimingOrCounterStarted: true };
write(path.join(root, 'evidence', role + '-' + variant + '-image.json'), record);
console.log(JSON.stringify({ role, variant, actualImageFiles: files.length, actualCommonFiles: common.actualFiles.length,
    actualAllRuntimeFiles: common.actualAllRuntimeFiles.length, actualOwnerSha256: record.actualOwnerSha256,
    actualCommonCanonicalFiles: common.actualCanonicalFiles, actualNoTimingOrCounterStarted: true }, null, 2));
