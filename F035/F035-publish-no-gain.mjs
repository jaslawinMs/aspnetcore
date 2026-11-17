import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F035');
const published = path.join(session, 'autoperf-published-results', 'F035');
const execution = path.join(session, 'F035-no-gain-publication');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const source = read(path.join(run, 'source-publication', 'verified-source-publication.json'));
const decision = read(path.join(published, 'decision.json'));
const copies = read(path.join(published, 'raw-file-copy-verification.json'));
const live = read(path.join(published, 'live-file-audit.json'));
const whitespace = read(path.join(session, 'F035-publication-whitespace.json'));
const evidence = fs.readFileSync(path.join(session, 'F035-results-commit.txt'), 'utf8').trim();
const count = Number(fs.readFileSync(path.join(session, 'F035-immutable-file-count.txt'), 'utf8').trim());
const verified = read(path.join(session, 'F035-remote-blob-verification.json'));
const ledger = read(path.join(session, 'autoperf-campaign.json'));
assert.equal(ledger.candidates.filter(row => ['drafted', 'no-gain', 'rejected', 'duplicate'].includes(row.status)).length, 113);
assert.equal(ledger.candidates.find(row => row.id === 'F035').status, 'benchmarking');
assert.equal(ledger.candidates.find(row => row.id === 'F035').pr_url, null);
assert.equal(verified.length, count);
assert.ok(verified.every(row => row.verified_remote_blob));
assert.equal(source.actualAllSourceRefChecksPassed, true);
assert.equal(source.actualSourceTrackedUnchanged, true);
assert.equal(decision.disposition, 'no-gain');
assert.equal(decision.actualFinalShippingChangedFiles, 0);
assert.equal(decision.actualSourceComparisons, 3);
assert.equal(decision.actualCompletedSourceComparisonPairs, 3);
assert.equal(decision.actualRawResultSamples, 960);
assert.equal(whitespace.actualAuthoredPublicationWhitespaceExit, 0);
assert.equal(fs.existsSync(path.join(published, 'publication.json')), false);
fs.mkdirSync(execution);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(execution, 'executed-driver.mjs'));
fs.copyFileSync(path.join(session, 'autoperf-campaign.json'), path.join(execution, 'ledger-before-publication.json'));
const calls = [];
function capture(command, args) {
  const index = String(calls.length + 1).padStart(3, '0');
  const started = new Date().toISOString();
  const result = spawnSync(command, args, { cwd: session, maxBuffer: 8 * 1024 * 1024 });
  fs.writeFileSync(path.join(execution, index + '.stdout'), result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(path.join(execution, index + '.stderr'), result.stderr ?? Buffer.alloc(0));
  calls.push({ executable: command, arguments: args, workingDirectory: session, started,
    completed: new Date().toISOString(), actualExitCode: result.status,
    stdout: index + '.stdout', stderr: index + '.stderr' });
  fs.writeFileSync(path.join(execution, 'actual-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, `${command}: ${result.stderr}`);
  return result.stdout.toString().trim();
}
const gh = endpoint => JSON.parse(capture('gh', ['api', endpoint]));
const fork = gh('repos/jaslawinMs/aspnetcore');
assert.equal(fork.full_name.toLowerCase(), 'jaslawinms/aspnetcore');
assert.equal(fork.private, false);
assert.equal(fork.fork, true);
assert.equal(fork.parent.full_name, 'dotnet/aspnetcore');
assert.equal(gh(`repos/jaslawinMs/aspnetcore/git/ref/heads/${source.sourceBranch}`).object.sha, source.sourceCommit);
assert.equal(gh('repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf-results').object.sha, evidence);
const prs = JSON.parse(capture('gh', ['pr', 'list', '--repo', 'jaslawinMs/aspnetcore', '--head',
  source.sourceBranch, '--state', 'all', '--json', 'number,url,headRefName']));
assert.deepEqual(prs, [], 'An unchanged no-gain branch must not receive an artificial performance PR.');
const title = '[AutoPerf F035] MVC ValueProviderResult enumeration: no convincing gain';
const body = fs.readFileSync(path.join(session, 'F035-issue-template.md'), 'utf8').replaceAll('@EVIDENCE_COMMIT@', evidence);
assert.ok(!/@[A-Z_]+@/.test(body));
const bodyFile = path.join(execution, 'issue-body.md');
fs.writeFileSync(bodyFile, body);
const existing = JSON.parse(capture('gh', ['issue', 'list', '--repo', 'jaslawinMs/aspnetcore',
  '--state', 'all', '--search', 'F035 in:title', '--limit', '100', '--json', 'number,url,title,body']));
assert.ok(existing.length <= 1, 'Reconcile an existing tracking issue instead of creating duplicates.');
let issueUrl;
if (existing.length === 1) {
  assert.equal(existing[0].title, title);
  assert.equal(existing[0].body.replaceAll('\r\n', '\n'), body.replaceAll('\r\n', '\n'));
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
assert.equal(actual.body.replaceAll('\r\n', '\n'), body.replaceAll('\r\n', '\n'));
assert.equal(actual.pull_request, undefined);
fs.writeFileSync(path.join(execution, 'actual-issue.json'), JSON.stringify(actual, null, 2) + '\n');
const receipt = {
  candidate: 'F035', disposition: 'no-gain',
  actualTrackingIssueUrl: issueUrl, actualTrackingIssueNumber: number, actualTrackingIssueBody: actual.body,
  actualSourceBranch: source.sourceBranch, actualSourceCommit: source.sourceCommit,
  actualSourceTrackedUnchanged: true, actualRemoteSourceRef: source.actualRemoteRef,
  actualImmutableEvidenceCommit: evidence, actualImmutableEvidenceFiles: count,
  actualVerifiedRemoteImmutableBlobs: verified.length, actualAllImmutableRemoteBlobsVerifiedBeforeIssue: true,
  actualPerformancePrCreated: false, actualPerformancePrUrl: null, actualBrowserLaunchRequested: false,
  actualSourceComparisons: 3, actualCompletedSourceComparisonPairs: 3, actualFailedTimedSourceComparisons: 0,
  maximumSourceComparisons: 3, actualStrategyVariants: 1, actualTimedNativeProfiles: 6,
  actualResultRows: 120, actualRetainedRawResults: 960, actualNativeStdoutSamplesMatchedToJson: 960,
  actualMeasurementBudgetPermanentlyClosed: true, actualOriginalOwningRows: 34, actualCandidateOwningRows: 34,
  actualOwningSkipped: 0, actualSuccessfulCharacterizations: 3,
  actualConcreteObservationsPerImage: 61, actualBenchmarkLifecycleProfilesIncludedPerImage: 20,
  actualAllConcreteObservationsMatch: true, actualIndependentRelocatedSourceProjectFiles: 6,
  actualRuntimeAsyncRealCollectionBinderCallConfirmed: true,
  actualIdenticalMeasuredHarnessDllAndPdb: true, actualChangedOwnerFiles: decision.actualChangedOwnerFiles,
  actualMeasuredConsumerFilesEach: 304, actualUnchangedMeasuredConsumerFilesIncludingHarness: 302,
  actualHarnessFilesIncludedInUnchanged302: 2, actualOtherUnchangedMeasuredConsumerFiles: 300,
  actualPassingAuthoritativeBuildWarnings: 0, actualPassingAuthoritativeBuildErrors: 0,
  actualFailedInitialStandaloneBuildsRetained: 1, actualInitialStandaloneWarnings: 2, actualInitialStandaloneErrors: 1,
  actualFailedUntimedCharacterizationsRetained: 1, actualFailedUntimedMetadataNativeExit: -532462766,
  actualFailedUntimedMetadataRuntimePidCaptured: false, actualOwnerForcedRebuildsByteMatched: 2,
  actualNewTestExecutionForOwnerRestoration: false, actualHistoricalMeasuredSourcesAndImagesUnmodified: true,
  actualFilesPhysicallyRehashed: live.actualUniqueRehashedFiles,
  actualConsumerFileChecksPhysicallyRehashed: live.actualFrozenConsumerFileChecks,
  actualLoadedAssemblyBindingObservationsPhysicallyRehashed: live.actualLoadedAssemblyBindingObservations,
  actualKnownSuccessfulNativeProcessesChecked: 9, actualNativeExternalListenersCreated: 0,
  actualSelectedPePdbSourceDocumentAssociations: 100, actualSettingsObservations: 240,
  actualPrimaryPairs: decision.actualPrimaryPairs, actualMaximumCvPercent: decision.actualMaximumCvPercent,
  actualByteExactCopiesPublished: copies.actualByteExactCopies, actualHashedOmissions: copies.actualHashedOmissions,
  actualPublicationWhitespace: whitespace, actualNativeBinaryBytesPublished: false,
  portableAuditRehashesOmittedNativeBytes: false, measuredConvincingOverallImprovementClaimed: false,
  productionFrequencyOrApplicationSpeedupClaimed: false, mergeReady: false,
  campaignFinalizedAfterVerifiedReceipt: 114, campaignTotal: 358, campaignUnfinishedAfterVerifiedReceipt: 244,
  actualCreated: new Date().toISOString(),
};
fs.writeFileSync(path.join(published, 'publication.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(session, 'F035-no-gain-publication.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ actualTrackingIssueUrl: issueUrl, actualIssueBodyVerified: true,
  actualPerformancePrCreated: false, actualImmutableRemoteBlobsVerified: verified.length }, null, 2));
