import fs from 'node:fs';
import path from 'node:path';
import { ROOT, REPO, CAMPAIGN, OWNER, utc, sha256, writeJson, snapshot, run, git } from './collect_source_213.mjs';

const initial = JSON.parse(fs.readFileSync(path.join(ROOT, 'INITIAL.json')));
const roles = JSON.parse(fs.readFileSync(path.join(ROOT, 'SOURCE-ROLES.json')));
const policySnapshot = snapshot('policy-final.json', path.join(CAMPAIGN, 'policy.json'));
const policy = JSON.parse(fs.readFileSync(path.join(ROOT, policySnapshot.artifact)));
const lease = path.join(policy.runsRoot, 'benchmark-exclusive.lease.json');
const leaseObservation = { path: lease, exists: fs.existsSync(lease), observedUtc: utc() };
if (leaseObservation.exists) leaseObservation.snapshot = snapshot('benchmark-lease-final.json', lease);

const status = git('reserved-final-status', ['status', '--porcelain=v1', '-uall']);
const head = git('reserved-final-head', ['rev-parse', 'HEAD']).toString('utf8').trim();
const branch = git('reserved-final-branch', ['symbolic-ref', '--short', 'HEAD']).toString('utf8').trim();
const worktreeDiff = git('reserved-final-diff', ['diff', '--binary', '--no-ext-diff']);
const indexDiff = git('reserved-final-index-diff', ['diff', '--cached', '--binary', '--no-ext-diff']);
const initialStatus = fs.readFileSync(path.join(ROOT, 'commands', 'reserved-initial-status.stdout.txt'));
const reports = initial.reservedReports.map(item => {
    const data = fs.readFileSync(item.path);
    return {
        ...item, finalBytes: data.length, finalSha256: sha256(data),
        unchanged: item.bytes === data.length && item.sha256 === sha256(data),
    };
});
const defaultBytes = run('upstream-default-final-observation', [
    'gh', 'api', `repos/dotnet/aspnetcore/branches/${roles.observedDefaultBranch}`,
], [0, 1]);
const defaultCommand = JSON.parse(fs.readFileSync(path.join(ROOT, 'commands', 'upstream-default-final-observation.json')));
let finalDefault = null;
try { finalDefault = JSON.parse(defaultBytes).commit?.sha ?? null; } catch { }
writeJson('FINAL-OBSERVATIONS.json', {
    recordedUtc: utc(), collectorPid: process.pid,
    policy: policySnapshot,
    actualRegisteredOwner: policy.independentFindingPreparationWorkers?.F193 ?? null,
    ownerStillMatches: policy.independentFindingPreparationWorkers?.F193 === OWNER,
    registeredOwnerCount: Object.keys(policy.independentFindingPreparationWorkers ?? {}).length,
    maximumRegisteredOwners: policy.maximumRegisteredPreparationOwners,
    actualWorkerBuildHoldActive: policy.actualWorkerBuildHoldActive,
    buildAndTestWorkQuiesced: policy.buildAndTestWorkQuiesced,
    actualLease: leaseObservation,
    nativeWorkStartedRegardlessOfAdmissionState: false,
    reserved: {
        root: REPO, branch, head,
        branchMatches: branch === 'autoperf/F145-hoist-large-response-utf8-encoding',
        headMatches: head === '24875ef5dabb55567870b39f6eb0002170435e2f',
        statusSameCompleteBytesAsInitial: status.equals(initialStatus),
        trackedWorktreeDiffBytes: worktreeDiff.length,
        trackedIndexDiffBytes: indexDiff.length,
        inheritedReports: reports,
        inheritedReportsUnchanged: reports.every(item => item.unchanged),
        reservedCheckoutIsNotABaseline: true,
    },
    privateGraphs: [
        { path: String.raw`C:\src\ap-F193-o213`, createdByThisOwner: false, existsAtFinalObservation: fs.existsSync(String.raw`C:\src\ap-F193-o213`) },
        { path: String.raw`C:\src\ap-F193-d213`, createdByThisOwner: false, existsAtFinalObservation: fs.existsSync(String.raw`C:\src\ap-F193-d213`) },
    ],
    upstreamDefault: {
        initialObservedRevision: roles.observedDefaultCommit,
        initialObservationStartedUtc: roles.defaultObservationStartedUtc,
        finalObservedRevision: finalDefault,
        finalObservationStartedUtc: defaultCommand.startedUtc,
        finalObservationFinishedUtc: defaultCommand.finishedUtc,
        finalCommandExit: defaultCommand.returnCode,
        sameAsSourcePin: finalDefault === roles.observedDefaultCommit,
        noRefUpdatesOrFetch: true,
        changedOrUnavailableConsequence: 'If final observation differs or is unavailable, the source gate is bounded to the initial explicitly observed pin; no older pin is silently relabeled current.',
    },
    processScope: {
        sourceCommandsSynchronousAndStreamsAwaited: true,
        nativeBuildTestRestoreRoots: [],
        benchmarkRoots: [], observedNativeDescendants: [],
        noHostWideQuiescenceOrDedicatedHostClaim: true,
        noPolicyRegistryLeaseLedgerMutation: true,
        limitation: 'Source command root PIDs/exits/streams are retained. No universal unobserved-descendant or unrelated-process absence claim.',
    },
});
writeJson('BOOTSTRAP-TRANSCRIPTION.json', {
    provenance: 'Transcribed from actual tool request/result history; bootstrap not replayed',
    tool: 'functions.powershell', shellId: '4465', exitCode: 0,
    exactCommand: "$p='C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-parallelism'; Get-ChildItem -LiteralPath $p -Force | Select-Object Name,Mode,Length; git --no-pager -C C:\\src\\aspnetcore status --porcelain=v1 -uall; git --no-pager -C C:\\src\\aspnetcore branch --show-current; git --no-pager -C C:\\src\\aspnetcore rev-parse HEAD",
    result: {
        foundPolicy: path.join(CAMPAIGN, 'policy.json'),
        branch: 'autoperf/F145-hoist-large-response-utf8-encoding',
        head: '24875ef5dabb55567870b39f6eb0002170435e2f',
        untrackedReports: initial.reservedReports.map(item => path.basename(item.path)),
    },
    retentionLimitation: 'The initial full directory listing/stdout remains in tool history, not a local artifact; complete command stdout/stderr capture began with the collector launch attempts. No native command preceded capture.',
});
console.log(JSON.stringify({
    phase: 'final-source-observations-captured', collectorPid: process.pid,
    reservedUnchanged: reports.every(item => item.unchanged) && status.equals(initialStatus) &&
        worktreeDiff.length === 0 && indexDiff.length === 0,
    defaultStillSourcePin: finalDefault === roles.observedDefaultCommit,
    finalDefault,
}));
