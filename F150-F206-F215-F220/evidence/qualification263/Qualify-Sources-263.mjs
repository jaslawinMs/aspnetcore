import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gitId, sha256, treeEntries, verifyMembership } from '../../autoperf-published-results/F150-F206-F215-F220/source-objects.mjs';

const root = import.meta.dirname, parallel = path.dirname(root), session = path.dirname(parallel);
const repo = String.raw`C:\src\aspnetcore`, read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const logical = text => text.replaceAll('\\', '/').replace(/^\.\//, '');
function write(file, raw)
{
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, raw, { flag: 'wx' });
}
const jsonWrite = (file, value) => write(path.join(root, file), JSON.stringify(value, null, 2) + '\n');
const commands = [];
function git(label, argv, input)
{
    assert.ok(commands.length < 16);
    const raw = fs.readFileSync(path.join(parallel, 'policy.json')), policy = JSON.parse(raw);
    assert.equal(policy.actualWorkerBuildHoldActive, false);
    assert.equal(policy.buildAndTestWorkQuiesced, false);
    assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
    const args = ['--no-pager', '-C', repo, ...argv], startedUtc = new Date().toISOString();
    const result = spawnSync('git', args, { cwd: repo, input, windowsHide: true, timeout: 90000,
        maxBuffer: 64 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', GIT_PAGER: '' } });
    const prefix = 'commands/' + String(commands.length + 1).padStart(3, '0') + '-' + label;
    write(path.join(root, prefix + '.stdout'), result.stdout ?? Buffer.alloc(0));
    write(path.join(root, prefix + '.stderr'), result.stderr ?? Buffer.alloc(0));
    if (input) write(path.join(root, prefix + '.stdin'), input);
    const record = { label, argv: args, pid: result.pid, startedUtc, endedUtc: new Date().toISOString(),
        policySha256: sha256(raw), actualOwners: policy.independentFindingPreparationWorkers,
        exitCode: result.status, signal: result.signal, error: result.error?.message ?? null,
        stdout: prefix + '.stdout', stderr: prefix + '.stderr', stdin: input ? prefix + '.stdin' : null,
        rootWaited: true, bothStreamsReturned: true };
    commands.push(record);
    jsonWrite(prefix + '.json', record);
    assert.ifError(result.error);
    assert.equal(result.status, 0, (result.stderr ?? Buffer.alloc(0)).toString('utf8'));
    return result.stdout;
}
const before = {
    head: git('reserved-head-before', ['rev-parse', 'HEAD']).toString('utf8'),
    status: git('reserved-status-before', ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
};
const requests = [], seedBlobs = new Map(), reusable = new Map(), objects = new Map();
function request(finding, folder, item, capture, suppliedBlob)
{
    const raw = fs.readFileSync(path.join(parallel, folder, ...capture.split(/[\\/]/)));
    assert.equal(raw.length, item.bytes);
    assert.equal(sha256(raw), item.sha256);
    const blob = gitId('blob', raw);
    if (suppliedBlob) assert.equal(blob, suppliedBlob);
    const role = { original: 'Original', default: 'Default', Original: 'Original', Default: 'Default' }[item.role];
    assert.ok(role);
    assert.match(item.commit, /^[a-f0-9]{40}$/);
    requests.push({ finding, role, commit: item.commit, path: logical(item.path),
        recordedCapture: { folder, path: logical(capture), bytes: raw.length, sha256: sha256(raw), blob },
        recordedRaw: raw, parts: logical(item.path).split('/'), position: 0 });
    seedBlobs.set(blob, raw);
}
for (const item of read(path.join(parallel, 'finding-F150-246', 'closure-003', 'source-manifest.json')).sources)
    request('F150', 'finding-F150-246', { ...item, path: item.repositoryPath }, item.evidencePath);
const initial206 = read(path.join(parallel, 'finding-F206-245', 'collection-initial-v1.json'));
const closure206 = read(path.join(parallel, 'finding-F206-245', 'collection-closure-v1.json'));
for (const item of [...initial206.copiedFiles, ...closure206.files].filter(x => ['Original', 'Default'].includes(x.role)))
    request('F206', 'finding-F206-245', { ...item, path: item.logicalPath,
        commit: item.commit ?? (item.role === 'Original' ? initial206.originalCommit : initial206.defaultCommit) }, item.path);
for (const item of read(path.join(parallel, 'finding-F215-249', 'source-membership.json')).sources)
    request('F215', 'finding-F215-249', item, item.artifact, item.blob);
for (const file of ['source-bindings-003.json', 'source-bindings-004.json', 'source-bindings-005.json', 'source-bindings-006.json'])
    for (const item of read(path.join(parallel, 'finding-F220-243', file)))
        request('F220', 'finding-F220-243', { ...item, path: item.repositoryPath }, item.artifact, item.gitBlob);
assert.equal(requests.length, 334);
for (const directory of [path.join(session, 'autoperf-published-results', 'F212-F217-F218-F221'),
    path.join(parallel, 'finding-F215-249')])
{
    const index = read(path.join(directory, 'source-membership.json'));
    verifyMembership(directory, index);
    for (const item of index.objects) if (!reusable.has(item.sha)) reusable.set(item.sha, { ...item, directory });
}
function save(type, sha, raw)
{
    assert.equal(gitId(type, raw), sha);
    assert.equal(objects.has(sha), false);
    const file = `raw-git/objects/${sha}.payload`;
    write(path.join(root, file), raw);
    objects.set(sha, { type, sha, file, bytes: raw.length, sha256: sha256(raw), raw });
}
function ensure(type, hashes)
{
    const missing = [];
    for (const sha of new Set(hashes))
    {
        if (objects.has(sha))
        {
            assert.equal(objects.get(sha).type, type);
            continue;
        }
        if (type === 'blob' && seedBlobs.has(sha)) save(type, sha, seedBlobs.get(sha));
        else if (reusable.has(sha))
        {
            const old = reusable.get(sha), raw = fs.readFileSync(path.join(old.directory, old.file));
            assert.equal(old.type, type);
            assert.equal(raw.length, old.bytes);
            assert.equal(sha256(raw), old.sha256);
            save(type, sha, raw);
        }
        else missing.push(sha);
    }
    if (!missing.length) return;
    const raw = git(`raw-${type}-batch-${commands.length}`, ['cat-file', '--batch'], Buffer.from(missing.join('\n') + '\n'));
    let offset = 0;
    for (const sha of missing)
    {
        const end = raw.indexOf(10, offset);
        assert.ok(end >= offset);
        const header = raw.subarray(offset, end).toString('ascii').match(/^([a-f0-9]{40}) (commit|tree|blob) (\d+)$/);
        assert.ok(header);
        assert.equal(header[1], sha);
        assert.equal(header[2], type);
        const length = Number(header[3]), start = end + 1;
        assert.equal(raw[start + length], 10);
        save(type, sha, raw.subarray(start, start + length));
        offset = start + length + 1;
    }
    assert.equal(offset, raw.length);
}
ensure('commit', requests.map(x => x.commit));
for (const item of requests) item.current = objects.get(item.commit).raw.toString('utf8').match(/^tree ([a-f0-9]{40})$/m)[1];
while (requests.some(x => x.position < x.parts.length))
{
    const active = requests.filter(x => x.position < x.parts.length);
    ensure('tree', active.map(x => x.current));
    for (const item of active)
    {
        const entry = treeEntries(objects.get(item.current).raw).get(item.parts[item.position]);
        assert.ok(entry, item.path);
        const last = item.position === item.parts.length - 1;
        assert.ok(last ? ['100644', '100755'].includes(entry.mode) : entry.mode === '40000');
        item.current = entry.sha;
        item.position++;
        if (last) item.mode = entry.mode;
    }
}
ensure('blob', requests.map(x => x.current));
const sources = [], mismatches = [];
for (const item of requests)
{
    const actual = objects.get(item.current), artifact = `qualified-source/${item.finding}/${item.role}/${item.path}`;
    write(path.join(root, artifact), actual.raw);
    const matches = item.recordedCapture.blob === actual.sha;
    sources.push({ finding: item.finding, role: item.role, commit: item.commit, path: item.path,
        mode: item.mode, blob: actual.sha, artifact, bytes: actual.bytes, sha256: actual.sha256,
        retainedCapture: item.recordedCapture, retainedCaptureMatchesImmutableSource: matches });
    if (!matches)
    {
        const beforeText = item.recordedRaw.toString('utf8'), afterText = actual.raw.toString('utf8');
        const bothUtf8 = Buffer.from(beforeText).equals(item.recordedRaw) && Buffer.from(afterText).equals(actual.raw);
        const beforeLines = beforeText.split(/\r?\n/), afterLines = afterText.split(/\r?\n/);
        let line = 0;
        while (line < Math.min(beforeLines.length, afterLines.length) && beforeLines[line] === afterLines[line]) line++;
        mismatches.push({ finding: item.finding, role: item.role, commit: item.commit, path: item.path,
            retainedCapture: item.recordedCapture, actual: { artifact, blob: actual.sha, bytes: actual.bytes, sha256: actual.sha256 },
            bothValidUtf8: bothUtf8, crlfOnlyDifference: bothUtf8 && beforeText.replaceAll('\r\n', '\n') === afterText.replaceAll('\r\n', '\n'),
            firstDifferingLine: line + 1, retainedLine: beforeLines[line] ?? null, actualLine: afterLines[line] ?? null });
    }
}
const membership = { objects: [...objects.values()].map(({ raw, ...item }) => item), sources };
jsonWrite('source-membership.json', membership);
const verified = verifyMembership(root, membership);
const after = {
    head: git('reserved-head-after', ['rev-parse', 'HEAD']).toString('utf8'),
    status: git('reserved-status-after', ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
};
assert.deepEqual(after, before);
jsonWrite('COMMANDS.json', commands);
jsonWrite('capture-mismatches.json', mismatches);
const result = {
    observedUtc: new Date().toISOString(), status: 'RAW_SOURCE_QUALIFIED_PARENT_MISMATCH_REVIEW_REQUIRED',
    actualRawMemberships: verified.memberships, rawGitObjects: verified.objects,
    exactRetainedCaptures: sources.filter(x => x.retainedCaptureMatchesImmutableSource).length,
    mismatchingRetainedCaptures: mismatches.length, mismatches,
    sourceUtilityRoots: commands.length, allDirectRootsWaitedAndStreamsReturned: true,
    reservedBeforeAfterEqual: true, before, after, productNativeOrComparisonStarts: 0,
    failed260HelperSha256: sha256(fs.readFileSync(path.join(parallel, 'source-outcomes-260', 'Collect-And-Package-260.mjs'))),
    actualFailed260Tool: 'autoperf-source-package-260 completed with exit code 1',
    priorCaptureOrExecutedHelperEdits: 0, officialCampaignFinalizations: 0,
    ownFinalToolExit: 'Not self-attested; bind actual enclosing tool completion after return.'
};
jsonWrite('QUALIFICATION.json', result);
console.log(JSON.stringify(result));
