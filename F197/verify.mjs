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
const index = json('evidence/HASHES.json');
assert.equal(sha256(content('evidence/HASHES.json')), handoff.indexSha256);
for (const item of index.files)
{
    checked('evidence/' + item.path, item.bytes, item.sha256);
}
assert.equal(index.files.length + 2, evidence.files.length);
assert.equal(handoff.decision, 'bounded-source-only-no-material-candidate');
assert.equal(handoff.nativeStarts, 0);
assert.equal(handoff.comparisonsAuthorized, 0);
const sourceIndex = json('evidence/source-membership.json');
const objects = verifyMembership(path.join(root, 'evidence'), sourceIndex);
assert.equal(sourceIndex.sources.length, 18);
for (const item of sourceIndex.sources)
{
    const raw = checked('evidence/' + item.artifact, item.bytes, item.sha256);
    assert.equal(gitId('blob', raw), item.blob);
}
for (const role of ['Original', 'Default'])
{
    const base = `evidence/source/${role}/src/ProjectTemplates/`;
    const target = content(base + 'test/Templates.Tests/BaselineTest.cs').toString('utf8');
    const site = 'var filesInFolder = Directory.EnumerateFiles(Project.TemplateOutputDir, "*", SearchOption.AllDirectories).ToArray();';
    assert.equal(target.split(site).length, 2);
    assert.ok(target.indexOf('await Project.RunDotNetNewRawAsync(arguments);') < target.indexOf(site));
    assert.ok(target.indexOf('foreach (var file in filesInFolder)') > target.indexOf(site));
    assert.ok(target.includes('Assert.Contains(relativePath, expectedFiles);'));
    const definitions = json(base + 'test/Templates.Tests/template-baselines.json');
    const cases = Object.values(definitions).flatMap(scenarios => Object.values(scenarios));
    assert.equal(cases.length, 75);
    assert.ok(cases.every(item => Array.isArray(item.Files) && item.Files.every(file => typeof file === 'string')));
    assert.equal(Math.min(...cases.map(item => item.Files.length)), 2);
    assert.equal(Math.max(...cases.map(item => item.Files.length)), 136);
    const facts = json('evidence/source-facts.json').find(item => item.role === role);
    assert.equal(facts.caseCount, cases.length);
    assert.equal(facts.retainedSourceSiteLine, 87);
    assert.equal(facts.actualGeneratedFileCountsObserved, false);
    assert.equal(facts.nativeProjectOrDotnetNewExecuted, false);
}
const commands = json('evidence/COMMANDS.json');
assert.equal(commands.length, 29);
assert.ok(commands.every(item => item.exitCode === 0 && item.rootWaited === true && item.redirectedStreamsDrained === true));
const terminal = json('evidence/owned-terminal.json');
assert.equal(terminal.sourceCommands, commands.length);
assert.equal(terminal.completedWaitedDrained, commands.length);
assert.equal(terminal.nativeBuildTestRestoreStarts, 0);
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
console.log(JSON.stringify({ finding: 'F197', completeCopiedEvidenceFiles: evidence.files.length,
    sourceMemberships: objects.memberships, rawGitObjects: objects.objects, sourceCommandsTerminal: commands.length,
    scenariosPerRole: 75, expectedNameCountsNotRuntime: [2, 136], candidateChanges: 0,
    nativeBuildsTestsDotnetNewOrComparisons: 0, sourceOnly: true }));
