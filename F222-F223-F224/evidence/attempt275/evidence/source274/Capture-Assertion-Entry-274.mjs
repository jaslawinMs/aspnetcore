import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gitId, sha256 } from '../../autoperf-published-results/F150-F206-F215-F220/source-objects.mjs';

const root = import.meta.dirname, parallel = path.dirname(root);
const prior = path.join(parallel, 'finding-F222-F223-F224-273');
const commit = 'cac8b688c193c0f244a0bedf3bb60feeb32d377a';
const tree = JSON.parse(fs.readFileSync(path.join(prior, 'commands', '015-xunit-declared-source-tree.stdout'), 'utf8'));
const commands = [], sources = [];
function write(file, raw)
{
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, raw, { flag: 'wx' });
}
const json = (file, value) => write(path.join(root, file), JSON.stringify(value, null, 2) + '\n');
function get(label, endpoint)
{
    assert.ok(commands.length < 3);
    const policyBytes = fs.readFileSync(path.join(parallel, 'policy.json')), policy = JSON.parse(policyBytes);
    assert.deepEqual(Object.keys(policy.independentFindingPreparationWorkers).sort(), ['F209', 'F231', 'F234', 'F239']);
    assert.equal(policy.actualWorkerBuildHoldActive, false);
    assert.equal(policy.buildAndTestWorkQuiesced, false);
    assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
    const argv = ['api', '--method', 'GET', endpoint], startedUtc = new Date().toISOString();
    const result = spawnSync('gh', argv, { cwd: String.raw`C:\src\aspnetcore`, timeout: 90000,
        windowsHide: true, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, GH_PROMPT_DISABLED: '1' } });
    const prefix = 'commands/' + String(commands.length + 1).padStart(3, '0') + '-' + label;
    write(path.join(root, prefix + '.stdout'), result.stdout ?? Buffer.alloc(0));
    write(path.join(root, prefix + '.stderr'), result.stderr ?? Buffer.alloc(0));
    const record = { executable: 'gh', argv, cwd: String.raw`C:\src\aspnetcore`, pid: result.pid,
        startedUtc, endedUtc: new Date().toISOString(), exitCode: result.status, error: result.error?.message ?? null,
        policySha256: sha256(policyBytes), rootWaited: result.status !== null && !result.error,
        bothRawStreamsReturned: !result.error, universalDescendantCensusNotClaimed: true,
        stdout: prefix + '.stdout', stderr: prefix + '.stderr' };
    commands.push(record);
    json(prefix + '.json', record);
    assert.ifError(result.error);
    assert.equal(result.status, 0, (result.stderr ?? Buffer.alloc(0)).toString('utf8'));
    return JSON.parse(result.stdout.toString('utf8'));
}
for (const file of ['CollectionAsserts.cs', 'Sdk/ArgumentFormatter.cs'])
{
    const entry = tree.tree.find(x => x.path === file);
    assert.equal(entry.type, 'blob');
    const response = get('xunit-' + path.basename(file, '.cs'), `repos/xunit/assert.xunit/git/blobs/${entry.sha}`);
    assert.equal(response.encoding, 'base64');
    const raw = Buffer.from(response.content, 'base64'), artifact = 'external/xunit-assert-2.9.2/' + file;
    assert.equal(raw.length, response.size);
    assert.equal(raw.length, entry.size);
    assert.equal(gitId('blob', raw), entry.sha);
    write(path.join(root, artifact), raw);
    sources.push({ repository: 'xunit/assert.xunit', commit, path: file, blob: entry.sha,
        artifact, bytes: raw.length, sha256: sha256(raw), wholeFile: true });
}
const release = get('xunit-release-v2-2.9.2', 'repos/xunit/xunit/git/trees/v2-2.9.2?recursive=1');
assert.equal(release.truncated, false);
const binding = release.tree.find(x => x.path === 'src/xunit.assert/Asserts');
assert.equal(binding.type, 'commit');
assert.equal(binding.mode, '160000');
assert.equal(binding.sha, commit);
json('external-source.json', sources);
json('COMMANDS.json', commands);
json('ASSERTION-ENTRY.json', {
    findings: ['F222'], newCommonExternalWholeFiles: sources.length, directGhSourceRoots: commands.length,
    inheritedSourceRoots: 22, aggregateRoots: 22 + commands.length,
    conservativeInputsPerRole: 23 + 5 + sources.length + 5,
    declaredReleaseBinding: { repository: 'xunit/xunit', ref: 'v2-2.9.2', returnedTree: release.sha, ...binding },
    rawExternalCommitTreeGraphOrExecutingBinaryNotClaimed: true,
    productNativeActivationBuildTestBrowserCandidateOrComparisonStarts: 0,
    actualEnclosingToolExitNotSelfAttested: true
});
console.log(JSON.stringify({ newWholeExternalFiles: sources.length, sourceRoots: commands.length,
    releaseSubmodule: binding.sha, conservativeInputsPerRole: 35, aggregateSourceRoots: 25,
    selectedExecutingBinaryOrRuntimeTestsNotQualified: true }));
