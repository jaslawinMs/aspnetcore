import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { here, repo, owner, write, guard, git, gh, text, sha256, execute } from './capture-core-002.mjs';

execute(fileURLToPath(import.meta.url), () => {
  guard('009-qualification-entry');
  const json = name => JSON.parse(fs.readFileSync(path.join(here, name)));
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const audit = json('source-audit-results-008.json');
  const pins = json('source-pins-002.json');
  assert(audit.checksFailed === 0 && audit.checksPassed === 765 && audit.completeRawSourceBindings === 160, 'Source qualification audit did not pass.');
  const helper = json('audit-source-008.result.json');
  const launch = json('launch-008.receipt.json');
  const request = json('launch-008.request.json');
  assert(helper.bodyReturned && sha256(fs.readFileSync(helper.entryPath)) === helper.entrySha256 && sha256(fs.readFileSync(helper.corePath)) === helper.coreSha256, 'Executed audit helper bytes changed.');
  assert(launch.childRootWaitReturned && launch.bothRawStreamCopiesReturned && launch.childExitCodeAfterWait === 0 && launch.stdoutSha256 === sha256(fs.readFileSync(path.join(here, 'launch-008.stdout.bin'))) && launch.stderrSha256 === sha256(fs.readFileSync(path.join(here, 'launch-008.stderr.bin'))) && request.launcherSha256 === sha256(fs.readFileSync(request.launcherPath)), 'Actual audit root/stream closure or exact launcher byte binding missing.');
  const head = text(git('009-reserved-head', ['rev-parse', 'HEAD'])).trim();
  const branch = text(git('009-reserved-branch', ['symbolic-ref', 'HEAD'])).trim();
  const status = text(git('009-reserved-status', ['status', '--porcelain=v1', '--untracked-files=normal']));
  const currentDefault = JSON.parse(text(gh('009-main-reobservation', ['api', '--method', 'GET', 'repos/dotnet/aspnetcore/commits/main']))).sha;
  assert(head === pins.reserved.head && branch === pins.reserved.branch && status === pins.reserved.status, 'Reserved navigation worktree HEAD/branch/status changed; no no-change handoff authorized.');
  assert(currentDefault === pins.defaultCommit, 'Default branch moved after the source qualification pin; no final equivalence claim authorized.');
  const reports = json('reserved-report-hashes-008.json').map(record => {
    const bytes = fs.readFileSync(record.path);
    assert(bytes.length === record.bytes && sha256(bytes) === record.sha256, `Protected report changed since the first hash observation: ${record.path}`);
    return { ...record, reobservedUtc: new Date().toISOString(), matchedFinalAuditObservation: true };
  });
  const roots = [];
  for (const name of fs.readdirSync(path.join(here, 'commands')).filter(n => n.endsWith('.receipt.json')).sort()) {
    const receipt = json(path.join('commands', name));
    const stem = path.join(here, 'commands', name.slice(0, -'.receipt.json'.length));
    const stdout = fs.readFileSync(`${stem}.stdout.bin`);
    const stderr = fs.readFileSync(`${stem}.stderr.bin`);
    assert(receipt.productNativeCommand === false && ['git.exe', 'gh.exe'].includes(receipt.executable) && receipt.synchronousRootAndBothStreamsReturned && receipt.error === null && receipt.signal === null && receipt.allowedExitCodes.includes(receipt.status) && Number.isInteger(receipt.childRootPidObservedBySpawnSync), `Unclosed or failed source-tool root: ${name}`);
    assert(stdout.length === receipt.stdoutBytes && stderr.length === receipt.stderrBytes && sha256(stdout) === receipt.stdoutSha256 && sha256(stderr) === receipt.stderrSha256, `Raw source-tool stream mismatch: ${name}`);
    const g = json(receipt.guard);
    assert(g.owner === owner && g.registrationOwner === owner && !g.leaseExists && g.HOLD === false && g.quiesced === false && g.ownerCount <= 4 && g.scopeCount <= 4, `Invalid recorded start guard: ${name}`);
    roots.push({ label: receipt.label, executable: receipt.executable, argv: receipt.argv, childRootPidObservedBySpawnSync: receipt.childRootPidObservedBySpawnSync, status: receipt.status, signal: receipt.signal, error: receipt.error, rootAndBothStreamsReturned: true, requestAndFullStreamsStem: path.relative(here, stem) });
  }
  assert(fs.statSync(path.join(here, 'candidate.diff')).size === 0, 'Unexpected retained candidate.');
  write('source-root-terminal-index-009.json', roots);
  const result = {
    finding: 'F220',
    scope: 243,
    owner,
    disposition: 'bounded-source-only-no-material-candidate',
    materialCandidateQualified: false,
    exactDuplicateOfF190: false,
    sourceAudit: { checksPassed: audit.checksPassed, checksFailed: audit.checksFailed, completeRawSourceBindings: audit.completeRawSourceBindings, sourceIntegrityOnly: true },
    sourcePins: { original: pins.original, default: pins.defaultCommit, freshFinalReobservedDefault: currentDefault },
    reserved: { path: repo, role: 'navigation/object store, not Default', head, branch, status },
    protectedReports: reports,
    protectedReportLimit: 'Initial presence/status and owner no-write discipline are established; content hashes were first taken at source audit008, and matched again now. No full-initial-period byte-identity claim.',
    capturedSourceToolRootCount: roots.length,
    sourceToolRootExitCounts: roots.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {}),
    allCapturedSourceToolRootsAndBothStreamsReturned: true,
    pendingOwnedProductNativeRoots: [],
    productBuildTestApplicationRoots: [],
    productBuildTestApplicationChildren: [],
    productBuildTestApplicationStarts: 0,
    sdkActivations: 0,
    restoreOrInstallStarts: 0,
    timingWarmupAllocationProfilingStarts: 0,
    comparisons: 0,
    benchmarkBudgetConsumption: 0,
    productTests: 'Not run: no materially qualified candidate; source audit is not correctness or runtime verification.',
    noUniversalDescendantOrUnrelatedProcessCensusClaim: true,
    ancillaryToolAndOuterConsoleLimits: 'tool-boundaries.json',
    immutableAuditHelper008: { entrySha256: helper.entrySha256, coreSha256: helper.coreSha256, launcherSha256: request.launcherSha256, observedActualNodeExit: launch.childExitCodeAfterWait },
    finalGuard: guard('009-before-native-closure-and-seal'),
    ownProcessFutureExitNotAttested: true,
    nextActor: 'Parent alone accepts/rejects/finalizes campaign disposition. Stop after the actual final tool result returns.',
  };
  write('seal-inputs-009.json', result);
  return { sourceAuditChecksPassed: audit.checksPassed, sourceAuditChecksFailed: audit.checksFailed, completeRawSourceBindings: audit.completeRawSourceBindings, capturedSourceToolRootCount: roots.length, nativeProductStarts: 0, comparisons: 0, qualification: 'seal-inputs-009.json', ownProcessFutureExitNotAttested: true };
});
