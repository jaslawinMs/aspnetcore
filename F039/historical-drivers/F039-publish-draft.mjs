import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F039');
const results = path.join(session, 'autoperf-published-results');
const capsule = path.join(results, 'F039');
const execution = path.join(session, 'F039-draft-publication');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const source = read(path.join(run, 'source-publication', 'verified-source-publication.json'));
const decision = read(path.join(capsule, 'raw', 'decision.json'));
const copies = read(path.join(capsule, 'raw-file-copy-verification.json'));
const live = read(path.join(capsule, 'raw', 'live-file-audit.json'));
const archive = read(path.join(session, 'F039-evidence-publication', 'verified-result.json'));
const portable = read(path.join(session, 'F039-evidence-publication', 'portable-audit.stdout'));
const evidence = fs.readFileSync(path.join(session, 'F039-results-commit.txt'), 'utf8').trim();
const count = Number(fs.readFileSync(path.join(session, 'F039-immutable-file-count.txt'), 'utf8').trim());
const verified = read(path.join(session, 'F039-remote-blob-verification.json'));
const ledger = read(path.join(session, 'autoperf-campaign.json'));
assert.equal(ledger.candidates.filter(row => ['drafted', 'no-gain', 'rejected', 'duplicate'].includes(row.status)).length, 116);
assert.equal(ledger.candidates.find(row => row.id === 'F039').status, 'validated');
assert.equal(ledger.candidates.find(row => row.id === 'F039').pr_url, null);
assert.equal(verified.length, count);
assert.ok(verified.every(row => row.verified_remote_blob));
assert.equal(source.actualAllSourceRefChecksPassed, true);
assert.equal(decision.actualAllApplicableAcceptanceChecksPassed, true);
assert.equal(decision.disposition, 'qualified-tempdata-contains-fork-draft');
assert.equal(decision.actualCompletedSourceComparisonPairs, 2);
assert.equal(decision.actualFailedSourceComparisonAttempts, 1);
assert.equal(decision.actualSourceComparisonBudgetPermanentlyClosed, true);
assert.equal(archive.actualEvidenceCommit, evidence);
assert.equal(archive.actualStagedAndRemoteImmutableBlobsVerified, true);
assert.equal(archive.actualAuthoredWhitespaceExit, 0);
assert.equal(archive.actualPortableAuditExit, 0);
assert.equal(portable.actualRawStdoutAndJsonSamplesRecomputed, 1280);
assert.equal(fs.existsSync(path.join(capsule, 'publication.json')), false);
fs.mkdirSync(execution, { recursive: true });
const invocationsFile = path.join(execution, 'actual-invocations.json');
const invocations = fs.existsSync(invocationsFile) ? read(invocationsFile) : [];
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(execution, `executed-driver-${String(invocations.length).padStart(3, '0')}.mjs`));
if (!fs.existsSync(path.join(execution, 'ledger-before-publication.json')))
  fs.copyFileSync(path.join(session, 'autoperf-campaign.json'), path.join(execution, 'ledger-before-publication.json'));
function capture(command, args) {
  const index = String(invocations.length + 1).padStart(3, '0');
  const started = new Date().toISOString();
  const result = spawnSync(command, args, { cwd: session, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
  assert.ifError(result.error);
  fs.writeFileSync(path.join(execution, `${index}.stdout`), result.stdout ?? '');
  fs.writeFileSync(path.join(execution, `${index}.stderr`), result.stderr ?? '');
  invocations.push({ command, args, workingDirectory: session, started, completed: new Date().toISOString(),
    actualExitCode: result.status, stdout: `${index}.stdout`, stderr: `${index}.stderr` });
  fs.writeFileSync(invocationsFile, JSON.stringify(invocations, null, 2) + '\n');
  assert.equal(result.status, 0, `${command}: ${result.stderr}`);
  return result.stdout.toString().trim();
}
const gh = endpoint => JSON.parse(capture('gh', ['api', endpoint]));
assert.equal(gh(`repos/jaslawinMs/aspnetcore/git/ref/heads/${source.sourceBranch}`).object.sha, source.sourceCommit);
assert.equal(gh('repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf-results').object.sha, evidence);
const normalized = text => text.replaceAll('\r\n', '\n');
const issueTitle = '[AutoPerf F039] Measure non-consuming TempData collection containment';
const issueBody = fs.readFileSync(path.join(session, 'F039-issue-template.md'), 'utf8').replaceAll('@EVIDENCE_COMMIT@', evidence);
assert.ok(!/@[A-Z_]+@/.test(issueBody));
const issueBodyFile = path.join(execution, 'issue-body.md');
fs.writeFileSync(issueBodyFile, issueBody);
const issues = JSON.parse(capture('gh', ['issue', 'list', '--repo', 'jaslawinMs/aspnetcore', '--state', 'all',
  '--search', 'F039 in:title', '--limit', '100', '--json', 'number,url,title,body']));
assert.ok(issues.length <= 1, 'Reconcile existing tracking issues; never create duplicates.');
let issueUrl;
if (issues.length) {
  assert.equal(issues[0].title, issueTitle);
  assert.equal(normalized(issues[0].body), normalized(issueBody));
  issueUrl = issues[0].url;
} else issueUrl = capture('gh', ['issue', 'create', '--repo', 'jaslawinMs/aspnetcore', '--title', issueTitle, '--body-file', issueBodyFile]);
assert.match(issueUrl, /^https:\/\/github\.com\/jaslawinMs\/aspnetcore\/issues\/\d+$/i);
fs.writeFileSync(path.join(execution, 'created-or-reused-issue.json'), JSON.stringify({ issueUrl, reusedExisting: issues.length === 1 }, null, 2) + '\n');
const issueNumber = Number(issueUrl.match(/(\d+)$/)[1]);
const issue = gh(`repos/jaslawinMs/aspnetcore/issues/${issueNumber}`);
assert.equal(issue.html_url, issueUrl);
assert.equal(issue.title, issueTitle);
assert.equal(normalized(issue.body), normalized(issueBody));
assert.equal(issue.state, 'open');
assert.equal(issue.pull_request, undefined);
const prTitle = '[AutoPerf F039] Avoid duplicate lookups in TempData collection Contains';
const prBody = fs.readFileSync(path.join(session, 'F039-pr-template.md'), 'utf8')
  .replaceAll('@EVIDENCE_COMMIT@', evidence).replaceAll('@TRACKING_NUMBER@', String(issueNumber));
assert.ok(!/@[A-Z_]+@/.test(prBody));
const template = normalized(fs.readFileSync(path.join(run, 'pr-template-main.md'), 'utf8'));
for (const comment of template.matchAll(/<!--[\s\S]*?-->/g))
  assert.ok(normalized(prBody).includes(comment[0]), 'Preserve every repository template comment.');
let previousChecklistIndex = -1;
for (const checklist of template.split('\n').filter(line => line.startsWith('- [ ]'))) {
  const index = normalized(prBody).indexOf(checklist.replace('- [ ]', '- [x]'));
  assert.ok(index > previousChecklistIndex);
  previousChecklistIndex = index;
}
assert.ok(prBody.indexOf('## Description') > prBody.indexOf('<!-- Once all that is done'));
assert.ok(normalized(prBody).endsWith(`Fixes #${issueNumber}\n`));
const prBodyFile = path.join(execution, 'pr-body.md');
fs.writeFileSync(prBodyFile, prBody);
const prs = JSON.parse(capture('gh', ['pr', 'list', '--repo', 'jaslawinMs/aspnetcore', '--head', source.sourceBranch,
  '--state', 'all', '--json', 'number,url,title,body,headRefName,isDraft']));
assert.ok(prs.length <= 1, 'One finding must not create duplicate drafts.');
let prUrl;
if (prs.length) {
  assert.equal(prs[0].title, prTitle);
  assert.equal(normalized(prs[0].body), normalized(prBody));
  assert.equal(prs[0].isDraft, true);
  prUrl = prs[0].url;
} else prUrl = capture('gh', ['pr', 'create', '--repo', 'jaslawinMs/aspnetcore', '--draft',
  '--base', 'main', '--head', source.sourceBranch, '--title', prTitle, '--body-file', prBodyFile]);
assert.match(prUrl, /^https:\/\/github\.com\/jaslawinMs\/aspnetcore\/pull\/\d+$/i);
fs.writeFileSync(path.join(execution, 'created-or-reused-pr.json'), JSON.stringify({ prUrl, reusedExisting: prs.length === 1 }, null, 2) + '\n');
const browserFile = path.join(execution, 'browser-launch-request.json');
if (!fs.existsSync(browserFile)) {
  capture('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `Start-Process -FilePath '${prUrl}'`]);
  fs.writeFileSync(browserFile, JSON.stringify({ actualPrUrl: prUrl, actualBrowserLaunchRequested: true,
    actualShellExitCode: 0, actualRequestedImmediatelyAfterCreateBeforePrVerification: true,
    actualBrowserWindowVisibilityIndependentlyVerified: false }, null, 2) + '\n');
}
const prNumber = Number(prUrl.match(/(\d+)$/)[1]);
const pr = gh(`repos/jaslawinMs/aspnetcore/pulls/${prNumber}`);
assert.equal(pr.html_url, prUrl);
assert.equal(pr.title, prTitle);
assert.equal(normalized(pr.body), normalized(prBody));
assert.equal(pr.draft, true);
assert.equal(pr.state, 'open');
assert.equal(pr.head.ref, source.sourceBranch);
assert.equal(pr.head.sha, source.sourceCommit);
assert.equal(pr.head.repo.full_name.toLowerCase(), 'jaslawinms/aspnetcore');
assert.equal(pr.base.repo.full_name.toLowerCase(), 'jaslawinms/aspnetcore');
assert.equal(pr.base.ref, 'main');
assert.equal(pr.base.sha, source.actualForkBase);
const files = gh(`repos/jaslawinMs/aspnetcore/pulls/${prNumber}/files?per_page=100`);
assert.deepEqual(files.map(file => file.filename), source.actualOnlyChangedFiles);
assert.deepEqual(files.map(file => [file.additions, file.deletions]), [[1, 1], [48, 0]]);
fs.writeFileSync(path.join(execution, 'actual-issue.json'), JSON.stringify(issue, null, 2) + '\n');
fs.writeFileSync(path.join(execution, 'actual-pr.json'), JSON.stringify(pr, null, 2) + '\n');
fs.writeFileSync(path.join(execution, 'actual-pr-files.json'), JSON.stringify(files, null, 2) + '\n');
const receipt = {
  candidate: 'F039', disposition: 'drafted', qualification: decision.qualification, mergeReady: false,
  actualTrackingIssueUrl: issueUrl, actualTrackingIssueNumber: issueNumber, actualTrackingIssueBody: issue.body,
  actualPerformancePrCreated: true, actualPerformancePrUrl: prUrl, actualPerformancePrNumber: prNumber,
  actualPrDraft: true, actualPrBody: pr.body, actualPrHeadAndTwoFileDiffVerified: true,
  actualRepositoryPrTemplateCommentsHeadingsChecklistAndOrderPreserved: true,
  actualBrowserLaunchRequested: true, actualBrowserLaunch: read(browserFile),
  actualSourceBranch: source.sourceBranch, actualSourceCommit: source.sourceCommit,
  actualHistoricalMeasuredBuildHead: source.actualMeasuredBuildHead, actualMeasuredSourceWasUncommittedOnBaseline: true,
  actualCommittedLfCanonicalTextEqualsTestedSources: true, actualSourceRemoteRef: source.actualRemoteRef,
  actualCurrentDefaultRechecked: source.actualCurrentDefault, actualSelectedDefaultPairs: 18,
  actualSelectedDefaultBaselineMatches: 18, actualFullCurrentDefaultBuildOrDependencyEquivalenceClaimed: false,
  actualImmutableEvidenceCommit: evidence, actualImmutableEvidenceFiles: count,
  actualVerifiedRemoteImmutableBlobs: verified.length, actualAllImmutableRemoteBlobsVerifiedBeforePr: true,
  actualSourceComparisons: 3, actualCompletedSourceComparisonPairs: 2, actualFailedSourceComparisonAttempts: 1,
  actualFirstFailedBeforeTiming: true, actualFirstFailedNativeExit: -532462766, actualFirstFailedTimingSamples: 0,
  actualBothHarnessEpochsAndSealsPreservedWithoutBudgetReset: true,
  maximumSourceComparisons: 3, actualTimedNativeMembersCompleted: 4, actualNativeMeasurementMembersStartedIncludingFailure: 5,
  actualResultRows: 160, actualRetainedRawResults: 1280, actualNativeStdoutSamplesMatchedToJson: 1280,
  actualMeasurementBudgetPermanentlyClosed: true, actualNoFourthComparison: true,
  actualPrimary: decision.actualPrimary, actualPrimaryRepeatedMedianCriterionPassed: true,
  actualAllAdverseEmptyAndControlRowsPublished: true,
  actualOriginalOwningRows: 74, actualCandidateOwningRows: 74, actualOwningSkipped: 0,
  actualNewPreservationTheoryRows: 8, actualNewPreservationFacts: 1, actualSemanticBugRedGreenClaimed: false,
  actualExistingSeleniumRows: 10, actualSeleniumSkipped: 0,
  actualSeleniumConfiguration: decision.actualSeleniumConfiguration,
  actualPreQuarantinedExcludedTest: decision.actualPreQuarantinedExcludedCase,
  actualStaticSsrBrowserStepsEachVariant: 8, actualPageAndConsoleErrorsEachVariant: 0,
  actualMatchedSemanticRecordsPerCharacterization: 15, actualMatchedBenchmarkLifecyclesPerCharacterization: 40,
  actualCharacterizations: 5, actualIndependentSevenFileProjectRebuiltAndCharacterized: true,
  actualMeasuredConsumerFiles: 197, actualOnlyChangedMeasuredConsumerFiles: decision.actualOnlyConsumerDelta,
  actualIdenticalMeasuredHarnessDllAndPdb: true, actualUnchangedConsumerFilesIncludingHarness: 195,
  actualOtherUnchangedNonHarnessFiles: 193,
  actualFilesPhysicallyRehashed: live.actualUniquePhysicalFilesRehashed, actualBindingsPhysicallyRehashed: live.actualBindingsRehashed,
  actualConsumerBindingsPhysicallyRehashed: live.actualConsumerBindings,
  actualLoadedAssemblyBindingsPhysicallyRehashed: live.actualLoadedAssemblyBindings,
  actualSelectedSourcePePdbAssociations: live.actualSourcePePdbDocumentAssociations,
  actualByteExactCopiesPublished: copies.actualByteExactCopies, actualHashedOmissions: copies.actualHashedOmissions,
  actualPublicationWhitespaceExit: 0, actualPortableFileAndStatisticsAuditExit: 0,
  actualNativeBinaryBytesPublished: false, portableAuditRehashesOmittedNativeBytes: false,
  actualF040CollectionRemoveChanged: false, actualPublicOrProtectedApiChanges: 0,
  actualMaximumProfileCvPercent: decision.actualMaximumCvPercent,
  actualEveryMeasuredAllocationReportZero: true, structuralAllocationReductionClaimed: false,
  wholeAppOrCookieOrBrowserOrMonoAotPerformanceClaimed: false,
  actualSharedVmNotIsolated: true, actualPriorityAffinityOrPowerChanged: false,
  campaignFinalizedAfterVerifiedReceipt: 117, campaignTotal: 358, campaignUnfinishedAfterVerifiedReceipt: 241,
  actualCreated: new Date().toISOString(),
};
fs.writeFileSync(path.join(capsule, 'publication.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(session, 'F039-draft-publication.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ actualTrackingIssueUrl: issueUrl, actualDraftPrUrl: prUrl,
  actualBrowserLaunchRequested: true, actualPrBodyAndTwoFileHeadVerified: true,
  actualImmutableRemoteBlobsVerified: verified.length }, null, 2));
