import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F032');
const published = path.join(session, 'autoperf-published-results', 'F032');
const execution = path.join(session, 'F032-no-gain-publication');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const source = read(path.join(run, 'source-publication', 'verified-source-publication.json'));
const decision = read(path.join(published, 'decision.json'));
const copies = read(path.join(published, 'raw-file-copy-verification.json'));
const live = read(path.join(published, 'live-frozen-closure-audit.json'));
const whitespace = read(path.join(session, 'F032-publication-whitespace.json'));
const evidence = fs.readFileSync(path.join(session, 'F032-results-commit.txt'), 'utf8').trim();
const count = Number(fs.readFileSync(path.join(session, 'F032-immutable-file-count.txt'), 'utf8').trim());
const verified = read(path.join(session, 'F032-remote-blob-verification.json'));
const ledger = read(path.join(session, 'autoperf-campaign.json'));
const finalized = ledger.candidates.filter(row => ['drafted', 'no-gain', 'rejected', 'duplicate'].includes(row.status));
assert.equal(finalized.length, 111);
assert.equal(ledger.candidates.find(row => row.id === 'F032').status, 'benchmarking');
assert.equal(ledger.candidates.find(row => row.id === 'F032').pr_url, null);
assert.equal(verified.length, count);
assert.ok(verified.every(row => row.verified_remote_blob));
assert.equal(source.actualAllSourceRefChecksPassed, true);
assert.equal(decision.disposition, 'no-gain');
assert.equal(decision.actualFinalShippingChanges, 0);
assert.equal(decision.actualSourceComparisons, 3);
assert.equal(decision.actualCompletedSourceComparisonPairs, 2);
assert.equal(decision.actualSourceComparisonBudgetPermanentlyClosed, true);
assert.equal(whitespace.actualAuthoredPublicationWhitespaceExit, 0);
assert.equal(fs.existsSync(path.join(published, 'publication.json')), false);
fs.mkdirSync(execution);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(execution, 'executed-driver.mjs'));
fs.copyFileSync(path.join(session, 'autoperf-campaign.json'), path.join(execution, 'ledger-before-publication.json'));
const invocations = [];
function capture(command, args) {
  const index = String(invocations.length + 1).padStart(3, '0');
  const started = new Date().toISOString();
  const result = spawnSync(command, args, { cwd: session, maxBuffer: 8 * 1024 * 1024 });
  fs.writeFileSync(path.join(execution, index + '.stdout'), result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(path.join(execution, index + '.stderr'), result.stderr ?? Buffer.alloc(0));
  invocations.push({ command, args, started, completed: new Date().toISOString(),
    actualExitCode: result.status, stdout: index + '.stdout', stderr: index + '.stderr' });
  fs.writeFileSync(path.join(execution, 'actual-invocations.json'), JSON.stringify(invocations, null, 2) + '\n');
  assert.equal(result.status, 0, `${command}: ${result.stderr}`);
  return result.stdout.toString().trim();
}
const gh = endpoint => JSON.parse(capture('gh', ['api', endpoint]));
assert.equal(gh(`repos/jaslawinMs/aspnetcore/git/ref/heads/${source.sourceBranch}`).object.sha, source.sourceCommit);
assert.equal(gh('repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf-results').object.sha, evidence);
const prs = JSON.parse(capture('gh', ['pr', 'list', '--repo', 'jaslawinMs/aspnetcore', '--head',
  source.sourceBranch, '--state', 'all', '--json', 'number,url,headRefName']));
assert.deepEqual(prs, [], 'An unchanged no-gain source branch must not have a performance PR.');
const title = '[AutoPerf F032] HTTP.sys Flush completed-task guard: no convincing gain';
const issueBody = fs.readFileSync(path.join(session, 'F032-issue-template.md'), 'utf8')
  .replaceAll('@EVIDENCE_COMMIT@', evidence);
assert.ok(!/@[A-Z_]+@/.test(issueBody));
const bodyFile = path.join(execution, 'issue-body.md');
fs.writeFileSync(bodyFile, issueBody);
const existing = JSON.parse(capture('gh', ['issue', 'list', '--repo', 'jaslawinMs/aspnetcore',
  '--state', 'all', '--search', 'F032 in:title', '--limit', '100', '--json', 'number,url,title,body']));
assert.ok(existing.length <= 1, 'Reconcile existing tracking issues instead of creating duplicates.');
let issueUrl;
if (existing.length === 1) {
  assert.equal(existing[0].title, title);
  assert.equal(existing[0].body.replaceAll('\r\n', '\n'), issueBody.replaceAll('\r\n', '\n'));
  issueUrl = existing[0].url;
} else {
  issueUrl = capture('gh', ['issue', 'create', '--repo', 'jaslawinMs/aspnetcore', '--title', title, '--body-file', bodyFile]);
}
assert.match(issueUrl, /^https:\/\/github\.com\/jaslawinMs\/aspnetcore\/issues\/\d+$/i);
fs.writeFileSync(path.join(execution, 'created-or-reused-issue.json'),
  JSON.stringify({ issueUrl, reusedExisting: existing.length === 1 }, null, 2) + '\n');
const number = Number(issueUrl.match(/(\d+)$/)[1]);
const actual = gh(`repos/jaslawinMs/aspnetcore/issues/${number}`);
assert.equal(actual.html_url, issueUrl);
assert.equal(actual.title, title);
assert.equal(actual.body.replaceAll('\r\n', '\n'), issueBody.replaceAll('\r\n', '\n'));
assert.equal(actual.pull_request, undefined);
fs.writeFileSync(path.join(execution, 'actual-issue.json'), JSON.stringify(actual, null, 2) + '\n');
const receipt = {
  candidate: 'F032', disposition: 'no-gain', qualification: decision.qualification,
  actualTrackingIssueUrl: issueUrl, actualTrackingIssueNumber: number, actualTrackingIssueBody: actual.body,
  actualSourceBranch: source.sourceBranch, actualSourceCommit: source.sourceCommit,
  actualSourceTrackedUnchanged: true, actualRemoteSourceRef: source.actualRemoteRef,
  actualImmutableEvidenceCommit: evidence, actualImmutableEvidenceFiles: count,
  actualVerifiedRemoteImmutableBlobs: verified.length, actualAllImmutableRemoteBlobsVerifiedBeforeIssue: true,
  actualPerformancePrCreated: false, actualPerformancePrUrl: null, actualBrowserLaunchRequested: false,
  actualSourceComparisons: 3, actualCompletedSourceComparisonPairs: 2, actualFailedSetupAttemptsRetained: 1,
  maximumSourceComparisons: 3, actualStrategyVariants: 1, actualTimedNativeProfiles: 4, actualFailedTimedNativeProfiles: 1,
  actualResultRows: 24, actualRetainedRawResults: 192, actualNativeStdoutSamplesMatchedToJson: 192,
  actualMeasurementBudgetPermanentlyClosed: true, actualOriginalOwningRows: 15, actualCandidateOwningRows: 15,
  actualOwningSkipped: 0, actualCorrectedCharacterizedImageVariants: ['measured-original', 'same-harness-guard', 'byte-exact-relocated-original'],
  actualCompletedProfilesPerImage: 6, actualAdditionalProducerContractsPerImage: 12, actualBenchmarkLifecycleProfilesPerCorrectedImage: 6,
  actualEarlierCharacterizedImageVariantsRetained: 2, actualRealPublicHttpSysAcceptedRequestAndOnStartingProducer: true,
  synchronousHarnessWaitInsideServerCallExcluded: true, untimedBenchmarkLifecycleAdaptersWaitSynchronously: true,
  actualIdenticalMeasuredHarnessDllAndPdb: true, actualOnlyChangedMeasuredConsumerFiles: decision.actualOnlyChangedMeasuredConsumerFiles,
  actualPassingAuthoritativeBuildWarnings: 0, actualPassingAuthoritativeBuildErrors: 0,
  actualInitialUncharacterizedPreparationWarnings: 11, actualWhitespaceVerifiedBeforeFreeze: true,
  actualFailedOwnerRebuildPostconditionWrappersRetained: 1, actualTestRerunForRebuildPostcondition: false,
  actualHistoricalMeasuredSourcesAndImagesUnmodified: true,
  actualFilesPhysicallyRehashed: live.actualUniquePhysicalFilesRehashed, actualBindingsPhysicallyRehashed: live.actualBindingsRehashed,
  actualConsumerBindingsPhysicallyRehashed: live.actualConsumerBindings, actualLoadedAssemblyBindingsPhysicallyRehashed: live.actualLoadedRuntimeBindings,
  actualSuccessfulNativeListenerDisposalReceipts: 47, actualFailedListenerGracefulDisposalUnverified: true,
  actualAllRecordedNativeProcessIdsAbsent: true, actualMaximumCvPercent: decision.actualMaximumCvPercent,
  actualSettingsObservations: 48, actualFailedAttemptSettingsObservations: 2,
  actualTimedGlobalSeconds: decision.actualTimedGlobalSeconds, actualFailedGlobalSeconds: decision.actualFailedGlobalSeconds,
  actualPreparedPrimaryPairs: decision.actualPreparedPrimaryPairs, actualByteExactCopiesPublished: copies.actualByteExactCopies,
  actualHashedOmissions: copies.actualHashedOmissions, actualPublicationWhitespace: whitespace, actualNativeBinaryBytesPublished: false,
  portableAuditRehashesOmittedNativeBytes: false, measuredConvincingOverallImprovementClaimed: false,
  productionFrequencyOrApplicationSpeedupClaimed: false, mergeReady: false,
  campaignFinalizedAfterVerifiedReceipt: 112, campaignTotal: 358, campaignUnfinishedAfterVerifiedReceipt: 246,
  actualCreated: new Date().toISOString(),
};
fs.writeFileSync(path.join(published, 'publication.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(session, 'F032-no-gain-publication.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ actualTrackingIssueUrl: issueUrl, actualIssueBodyVerified: true,
  actualPerformancePrCreated: false, actualImmutableRemoteBlobsVerified: verified.length }, null, 2));
