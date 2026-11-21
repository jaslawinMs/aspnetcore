import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gitId, sha256 } from '../../autoperf-published-results/F150-F206-F215-F220/source-objects.mjs';

const root = import.meta.dirname, parallel = path.dirname(root), session = path.dirname(parallel);
const policyBytes = fs.readFileSync(path.join(parallel, 'policy.json')), policy = JSON.parse(policyBytes);
assert.deepEqual(Object.keys(policy.independentFindingPreparationWorkers).sort(), ['F209', 'F231', 'F234', 'F239']);
assert.equal(policy.actualWorkerBuildHoldActive, false);
assert.equal(policy.buildAndTestWorkQuiesced, false);
assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
const specification = JSON.parse(fs.readFileSync(path.join(root, 'ACCEPTANCE.json'), 'utf8'));
const priorTree = JSON.parse(fs.readFileSync(path.join(parallel, 'finding-F222-F223-F224-273',
    'commands', '015-xunit-declared-source-tree.stdout'), 'utf8'));
const entry = priorTree.tree.find(x => x.path === specification.path);
assert.equal(entry.sha, specification.blob);
assert.equal(entry.size, specification.bytes);
const argv = ['api', '--method', 'GET', `repos/xunit/assert.xunit/git/blobs/${entry.sha}`];
const startedUtc = new Date().toISOString();
const result = spawnSync('gh', argv, { cwd: String.raw`C:\src\aspnetcore`, timeout: 90000, windowsHide: true,
    maxBuffer: 1024 * 1024, env: { ...process.env, GH_PROMPT_DISABLED: '1' } });
function write(file, raw)
{
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, raw, { flag: 'wx' });
}
write(path.join(root, 'license.stdout'), result.stdout ?? Buffer.alloc(0));
write(path.join(root, 'license.stderr'), result.stderr ?? Buffer.alloc(0));
const command = { executable: 'gh', argv, pid: result.pid, startedUtc, endedUtc: new Date().toISOString(),
    exitCode: result.status, error: result.error?.message ?? null, policySha256: sha256(policyBytes),
    rootWaited: result.status !== null && !result.error, bothRawStreamsReturned: !result.error,
    universalDescendantCensusNotClaimed: true };
write(path.join(root, 'COMMAND.json'), JSON.stringify(command, null, 2) + '\n');
assert.ifError(result.error);
assert.equal(result.status, 0);
const response = JSON.parse(result.stdout.toString('utf8'));
assert.equal(response.encoding, 'base64');
const raw = Buffer.from(response.content, 'base64');
assert.equal(raw.length, specification.bytes);
assert.equal(gitId('blob', raw), specification.blob);
write(path.join(root, 'LICENSE.txt'), raw);
write(path.join(root, 'LICENSE-SOURCE.json'), JSON.stringify({ ...specification, sha256: sha256(raw),
    sourceAnalysisUnchanged: true, upstreamNoticeCopiedVerbatim: true, aggregateGitGhRoots: 32 }, null, 2) + '\n');
const destination = path.join(session, 'autoperf-published-results', 'F222-F223-F224', 'licenses', 'xunit-assert');
for (const entry of fs.readdirSync(root, { withFileTypes: true }))
{
    assert.equal(entry.isFile(), true);
    write(path.join(destination, entry.name), fs.readFileSync(path.join(root, entry.name)));
}
console.log(JSON.stringify({ licenseBytes: raw.length, licenseBlob: specification.blob,
    noticeCopiedVerbatim: true, newGhRoots: 1, aggregateGitGhRoots: 32, noProductOrPriorEvidenceChanges: true }));
