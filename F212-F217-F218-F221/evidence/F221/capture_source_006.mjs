import fs from 'node:fs';
import path from 'node:path';
import { ROOT, ORIGINAL, readJson, utc, sha256, writeBytes, writeJson, run, helperStart, helperEnd } from './capture_common_002.mjs';

helperStart('capture_source_006');
const roles = readJson('source-roles.json');
run('source-only-serverinstance-delta', [
    'git', '--no-pager', 'diff', '--no-ext-diff', '--unified=3', ORIGINAL, roles.default,
    '--', 'src/Components/Testing/src/Infrastructure/ServerInstance.cs',
]);
const consumerPath = 'src/Components/Testing/src/Infrastructure/ServerInstance.cs';
const consumerBody = role => {
    const text = fs.readFileSync(path.join(ROOT, 'source', role, consumerPath), 'utf8');
    const start = text.indexOf('    internal static IReadOnlyDictionary<string, string> BuildProcessEnvironment(');
    const end = text.indexOf('    internal static ProcessStartInfo BuildProcessStartInfo(', start);
    if (start < 0 || end <= start) throw new Error('Consumer span not found');
    return text.slice(start, end);
};
writeJson('consumer-source-boundary.json', {
    path: consumerPath,
    originalCommit: ORIGINAL,
    defaultCommit: roles.default,
    wholeFileBytesDiffer: true,
    observedBody: 'BuildProcessEnvironment, ending before BuildProcessStartInfo',
    originalConsumerBodySha256: sha256(consumerBody('Original')),
    defaultConsumerBodySha256: sha256(consumerBody('Default')),
    consumerBodyBytesEqual: consumerBody('Original') === consumerBody('Default'),
    limitation: 'Source-only consumer boundary. Whole file difference is preserved, not modified or independently assessed.',
});
const terminal = {};
const initial = readJson('reserved-start.json');
for (const [label, args] of [
    ['head', ['rev-parse', 'HEAD']],
    ['branch', ['branch', '--show-current']],
    ['status', ['status', '--porcelain=v1', '--untracked-files=all']],
    ['tracked-diff', ['diff', '--no-ext-diff', '--binary', 'HEAD', '--']],
    ['index-tree', ['ls-files', '--stage']],
]) {
    const data = run(`reserved-terminal-${label}`, ['git', '--no-pager', ...args]);
    terminal[label] = {
        bytes: data.length, sha256: sha256(data), stdout: `commands\\reserved-terminal-${label}\\stdout.bin`,
        equalToStart: initial[label].bytes === data.length && initial[label].sha256 === sha256(data),
    };
}
writeJson('reserved-terminal.json', {
    observation: terminal,
    allRecordedLogicalStateUnchanged: Object.values(terminal).every(item => item.equalToStart),
    reservedWritesByThisWorker: 0,
    limitation: 'Read-only HEAD/branch/tracked-diff/logical staged entries/status inventory. Unrelated untracked report contents were not read or written; physical index-file bytes were not inventoried.',
});
const policyRaw = fs.readFileSync(path.join(ROOT, '..', 'policy.json'));
writeBytes(String.raw`guards\policy-terminal.bin`, policyRaw);
let policy = null;
let parseError = null;
try { policy = JSON.parse(policyRaw.toString()); } catch (error) { parseError = String(error); }
writeJson(String.raw`guards\point-observation-terminal.json`, {
    observedUtc: utc(), policySha256: sha256(policyRaw), policyParseError: parseError,
    registeredOwner: policy?.independentFindingPreparationWorkers?.F221 ?? null,
    actualWorkerBuildHoldActive: policy?.actualWorkerBuildHoldActive ?? null,
    benchmarkLeaseExists: fs.existsSync(path.join(ROOT, '..', 'benchmark-exclusive.lease.json')),
    sourceOnly: true, notNativePermission: true,
});
writeBytes('candidate.diff', Buffer.alloc(0));
writeJson('native-work-disposition.json', {
    implementedCandidate: false, privateSourceGraphsCreated: [],
    builds: [], tests: [], dotnetInvocations: [], restores: [], benchmarkInvocations: [],
    existingLspService: 'Queries only; no server or child agent launched by worker.',
    sourceUtilityChildren: 'All direct git/gh child argv, PID, exits and full raw streams are in commands\\*\\receipt.json and adjacent streams.',
    helperRoots: 'All Python/Node roots, including failed attempts, are in launches\\*\\receipt.json and adjacent full stdout/stderr.',
    streamWaits: 'Launchers use WaitForExit then await both streams; source utility calls are synchronous spawnSync.',
    outstandingOwnedBuildTestApplicationWork: [],
    processStops: [],
    noSystemWideQuiescenceClaim: true,
    limitation: 'Direct source-utility process exits are observed; arbitrary unrelated machine processes and unobserved utility-internal descendants are not a system-wide quiescence proof.',
});
helperEnd('capture_source_006');
