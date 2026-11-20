import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const root = String.raw`C:\src\aspnetcore`, run = path.join(session, 'autoperf-runs', 'F142');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const failed = JSON.parse(fs.readFileSync(path.join(run, 'alias-native', '006.json')));
assert.equal(failed.actualExitCode, 128);
assert.match(fs.readFileSync(path.join(run, 'alias-native', '006.stderr'), 'utf8'), /Filename too long/);
const preparation = path.join(run, 'alias-preparation-001');
assert.equal(fs.existsSync(preparation), false);
assert.equal(fs.existsSync(path.join(run, 'alias-validation')), false, 'No source-analysis build or execution preceded the correction');
fs.mkdirSync(preparation);
fs.renameSync(path.join(run, 'alias-native'), path.join(preparation, 'alias-native'));
fs.renameSync(path.join(run, 'alias-source'), path.join(preparation, 'alias-source'));
write(path.join(preparation, 'correction.json'), {
    recordedAt: new Date().toISOString(), actualFailure: failed,
    actualEarlierDotnetExecutions: 0, actualPlanPreviouslySealed: false,
    correction: 'Resolve full paths from pinned short-prefix git ls-tree output, then read by immutable blob ID. No persistent Git, machine or long-path setting is changed.',
    scope: 'Exact failed native command/streams and partial source are preserved; the original orchestration was an inline command, not a separately archived helper file.',
});
fs.mkdirSync(path.join(run, 'alias-native'));
let sequence = 0;
function execute(executable, args)
{
    const actual = spawnSync(executable, args, { cwd: root, windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
    const label = String(++sequence).padStart(3, '0');
    fs.writeFileSync(path.join(run, 'alias-native', label + '.stdout'), actual.stdout ?? Buffer.alloc(0), { flag: 'wx' });
    fs.writeFileSync(path.join(run, 'alias-native', label + '.stderr'), actual.stderr ?? Buffer.alloc(0), { flag: 'wx' });
    write(path.join(run, 'alias-native', label + '.json'), { executable, arguments: args, actualExitCode: actual.status,
        stdoutSha256: hash(actual.stdout ?? Buffer.alloc(0)), stderrSha256: hash(actual.stderr ?? Buffer.alloc(0)) });
    assert.equal(actual.status, 0, actual.stderr?.toString());
    return actual.stdout;
}
const git = (...args) => execute('git', ['--no-pager', ...args]);
const plan = JSON.parse(fs.readFileSync(path.join(run, 'alias-analysis-plan.json')));
assert.equal(execute('gh', ['api', 'repos/dotnet/aspnetcore/commits/main', '--jq', '.sha']).toString().trim(), plan.observedDefault);
assert.equal(git('rev-parse', 'HEAD').toString().trim(), plan.baseline);
assert.equal(git('status', '--porcelain', '--untracked-files=no').toString().trim(), '');
const ledgerFile = path.join(session, 'autoperf-campaign.json'), ledger = JSON.parse(fs.readFileSync(ledgerFile));
const findings = ledger.candidates.filter(entry => entry.status === 'pending' &&
    entry.finding.file.startsWith('src/OpenApi/test/Microsoft.AspNetCore.OpenApi.SourceGenerators.Tests/snapshots/'));
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(run, 'retained-snapshot-findings.json'))), findings);
const files = [...new Set([plan.producer, ...findings.map(entry => entry.finding.file)])].sort(), snapshots = [];
for (const [role, commit] of [['Original', plan.baseline], ['Default', plan.observedDefault]])
{
    const tree = git('ls-tree', '-r', '-z', commit, '--', 'src/OpenApi/gen', 'src/OpenApi/test/Microsoft.AspNetCore.OpenApi.SourceGenerators.Tests/snapshots')
        .toString('utf8').split('\0').filter(Boolean).map(line =>
        {
            const match = line.match(/^100644 blob ([a-f0-9]{40})\t(.+)$/);
            assert.ok(match, line);
            return { file: match[2], gitBlob: match[1] };
        });
    for (const file of files)
    {
        const { gitBlob } = tree.find(entry => entry.file === file) ?? {};
        assert.ok(gitBlob, 'Exact selected path must exist in the pinned tree: ' + file);
        const bytes = git('cat-file', 'blob', gitBlob);
        assert.equal(crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), gitBlob);
        const destination = path.join(run, 'alias-source', role, ...file.split('/'));
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, bytes, { flag: 'wx' });
        snapshots.push({ role, commit, file, bytes: bytes.length, sha256: hash(bytes), gitBlob });
    }
}
git('log', '-10', '--format=%H %cI %s', '--follow', plan.observedDefault, '--', plan.producer);
git('blame', '-L', '325,360', plan.observedDefault, '--', plan.producer);
write(path.join(run, 'alias-source-manifest.json'), { recordedAt: new Date().toISOString(), actualInputFindings: findings.length,
    actualDistinctSnapshotFiles: files.length - 1, actualSourceSnapshots: snapshots });
write(path.join(run, 'alias-plan-seal.json'), { sha256: hash(fs.readFileSync(path.join(run, 'alias-analysis-plan.json'))),
    recordedAt: new Date().toISOString(), actualBeforeSourceAnalysisExecution: true });
write(path.join(run, 'alias-preservation-baseline.json'), {
    recordedAt: new Date().toISOString(), actualPrivateLedgerSha256: hash(fs.readFileSync(ledgerFile)), actualRootHead: plan.baseline,
    actualPublishedHead: git('-C', path.join(session, 'autoperf-published-results'), 'rev-parse', 'HEAD').toString().trim(),
    actualFixedReportBlob: git('-C', path.join(session, 'autoperf-published-results'), 'rev-parse', 'HEAD:REPORT.md').toString().trim(),
    actualProtectedGlobalJsonSha256: hash(fs.readFileSync(path.join(root, 'global.json'))),
    actualToolInputs: ['AutoPerf.OpenApiSourceAliases.csproj', 'Program.cs'].map(file =>
        ({ file, sha256: hash(fs.readFileSync(path.join(run, 'alias-tool', file))) })),
});
console.log(JSON.stringify({ actualPinnedInputFindings: findings.length, actualSourceSnapshots: snapshots.length,
    actualDistinctSnapshotFiles: files.length - 1, actualNativeReceipts: sequence, actualTiming: 0 }));
