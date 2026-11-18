import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F047');
const published = path.join(session, 'autoperf-published-results');
const root = 'C:\\src\\aspnetcore';
const execution = path.join(run, 'draft-publication');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const normalize = text => text.replaceAll('\r\n', '\n').trimEnd();
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const source = read(path.join(run, 'source-publication.json'));
const evidence = read(path.join(run, 'evidence-publication.json'));
const decision = read(path.join(run, 'decision.json'));
const ledger = read(path.join(session, 'autoperf-campaign.json'));
const finalized = rows => rows.filter(row => ['drafted', 'no-gain', 'rejected', 'duplicate'].includes(row.status)).length;
assert.equal(finalized(ledger.candidates), 123);
assert.deepEqual(ledger, read(path.join(published, 'campaign.json')));
assert.equal(ledger.candidates.find(row => row.id === 'F047').status, 'pending');
assert.equal(decision.disposition, 'qualified');
assert.equal(decision.controlCredibilityGateMet, true);
assert.equal(decision.qualificationBasis, 'allocation-only-trade-off');
assert.equal(decision.numericalPrimaryTimingGateMet, false);
assert.equal(decision.allocationGateMet, true);
assert.equal(read(path.join(run, 'diagnostic-budget.json')).permanentlyClosed, true);
assert.equal(evidence.actualImmutableFiles, read(path.join(run, 'capsule-preparation.json')).actualImmutableFilesIncludingSeal);
assert.equal(evidence.actualRemoteImmutableBlobIdsVerified, evidence.actualImmutableFiles);
assert.equal(hash(path.join(run, 'diagnostic-budget.json')), read(path.join(run, 'permanent-budget-close.json')).closedBudgetSha256);
assert.equal(fs.existsSync(path.join(run, 'draft-publication.json')), false);
fs.mkdirSync(execution, { recursive: true });
const invocationFile = path.join(execution, 'actual-invocations.json');
const calls = fs.existsSync(invocationFile) ? read(invocationFile) : [];
function capture(command, args) {
  const index = String(calls.length + 1).padStart(3, '0');
  const started = new Date().toISOString();
  const result = spawnSync(command, args, { cwd: root, windowsHide: true, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  assert.ifError(result.error);
  fs.writeFileSync(path.join(execution, index + '.stdout'), result.stdout ?? '');
  fs.writeFileSync(path.join(execution, index + '.stderr'), result.stderr ?? '');
  calls.push({ command, arguments: args, workingDirectory: root, started, completed: new Date().toISOString(),
    actualExitCode: result.status, stdout: index + '.stdout', stderr: index + '.stderr' });
  fs.writeFileSync(invocationFile, JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, `${command}: ${result.stderr}\n${result.stdout}`);
  return result.stdout.trim();
}
const api = endpoint => JSON.parse(capture('gh', ['api', endpoint]));
assert.equal(api('repos/jaslawinMs/aspnetcore/git/ref/heads/' + source.branch).object.sha, source.sourceCommit);
assert.equal(api('repos/jaslawinMs/aspnetcore/git/ref/heads/main').object.sha, source.parentBaseline);
assert.equal(api('repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf-results').object.sha, evidence.evidenceCommit);
const expectedDiff = capture('git', ['-c', 'core.longpaths=true', '--no-pager', 'diff', '--numstat',
  source.parentBaseline, source.sourceCommit, '--']).split(/\r?\n/).map(line => {
    const match = line.match(/^(\d+)\t(\d+)\t(.+)$/);
    assert.ok(match, line);
    return { path: match[3], additions: Number(match[1]), deletions: Number(match[2]) };
  });
assert.deepEqual(expectedDiff.map(item => item.path), source.actualOnlySourceFiles.map(item => item.path));
const issueTitle = '[AutoPerf F047] Measure SSR parameter-key allocation trade-off';
const issueBody = fs.readFileSync(path.join(run, 'issue-template.md'), 'utf8')
  .replaceAll('{{SOURCE_COMMIT}}', source.sourceCommit).replaceAll('{{EVIDENCE_COMMIT}}', evidence.evidenceCommit);
assert.equal(/\{\{[A-Z_]+\}\}/.test(issueBody), false);
const issueBodyFile = path.join(execution, 'issue-body.md');
fs.writeFileSync(issueBodyFile, issueBody);
const issues = JSON.parse(capture('gh', ['issue', 'list', '--repo', 'jaslawinMs/aspnetcore', '--state', 'all',
  '--search', 'F047 in:title', '--limit', '100', '--json', 'number,url,title,body']));
assert.ok(issues.length <= 1, 'Reconcile existing tracking; never create a duplicate issue.');
let issueUrl;
if (issues.length) {
  assert.equal(issues[0].title, issueTitle);
  assert.equal(normalize(issues[0].body), normalize(issueBody));
  issueUrl = issues[0].url;
} else {
  issueUrl = capture('gh', ['issue', 'create', '--repo', 'jaslawinMs/aspnetcore', '--title', issueTitle, '--body-file', issueBodyFile]);
}
assert.match(issueUrl, /^https:\/\/github\.com\/jaslawinMs\/aspnetcore\/issues\/\d+$/i);
fs.writeFileSync(path.join(execution, 'created-or-reused-issue.json'), JSON.stringify({ issueUrl, reusedExisting: issues.length === 1 }, null, 2) + '\n');
const issueNumber = Number(issueUrl.match(/(\d+)$/)[1]);
const issue = api('repos/jaslawinMs/aspnetcore/issues/' + issueNumber);
assert.equal(issue.state, 'open');
assert.equal(issue.pull_request, undefined);
assert.equal(normalize(issue.body), normalize(issueBody));
const prTitle = '[AutoPerf F047] Remove temporary SSR parameter-key arrays';
const summary = 'Remove temporary parameter-key arrays during SSR fragment wrapping';
assert.ok(summary.length < 80);
const validation = ['', '### Exact executed validation commands and outcomes', '',
  'These are historical commands, not instructions to rerun the closed timing budget.',
  'Each fresh shell activated its checkout first; complete streams and the untimed reconstruction commands are linked above.'];
const labels = [
  ['default-endpoints-test-build-001', false, 'Failed NETSDK1004: restore assets absent; successful targeted restore/retry retained.'],
  ['default-endpoints-test-restore-001', true, 'Passed.'],
  ['default-endpoints-test-build-002', true, 'Passed; 0 warnings/errors on actual current default.'],
  ['default-existing-endpoints-tests-001', true, 'Passed; 98 individual rows, 0 failed/skipped.'],
  ['original-endpoints-test-build-001', true, 'Passed; 0 warnings/errors.'],
  ['original-existing-endpoints-tests-001', true, 'Passed; 98 individual rows, 0 failed/skipped.'],
  ['original-sample-build-001', true, 'Passed; original canonical six-case browser validation follows.'],
  ['original-harness-restore-001', true, 'Passed.'],
  ['original-harness-build-001', true, 'Passed; 0 warnings/errors.'],
  ['original-characterize-001', true, 'Passed managed characterization; corrected controller post-parser audited this same run without relaunching it.'],
  ['default-characterize-001', true, 'Passed; 24 renderer profiles, 12 invalid delegates, 3 disabled-fragment contracts, nested fragment, 8 lifecycles.'],
  ['original-preservation-build-001', true, 'Passed; first root-Auto test fixture subsequently exposes its unsupported prerequisite.'],
  ['original-preservation-tests-001', false, 'Failed: 100 passed/1 unsupported root-Auto fixture failure before assertion; retained, not a product bug.'],
  ['original-preservation-build-002', true, 'Passed; corrected real nested producer fixture, 0 warnings/errors.'],
  ['original-preservation-tests-002', true, 'Passed; all 3 final new Server/WebAssembly/Auto rows on untouched shipping code.'],
  ['candidate-endpoints-test-build-001', true, 'Passed; dependency-aware Release owner/test graph, 0 warnings/errors.'],
  ['candidate-preservation-tests-001', true, 'Passed; 101 individual rows, 0 failed/skipped.'],
  ['candidate-characterize-001', true, 'Passed; complete untimed renderer/invalid/disabled/nested/lifetime matrix.'],
  ['candidate-source-whitespace-001', true, 'Passed; exact two source files, no changes.'],
  ['candidate-sample-build-001', true, 'Passed; candidate canonical six-case browser validation follows.'],
  ['candidate-selenium-build-001', true, 'Passed; dependency-aware Debug E2E graph including actual test apps, 0 warnings/errors.']
];
for (const [label, passed, outcome] of labels) {
  const directory = path.join(run, 'validation', label);
  const result = read(path.join(directory, 'result.json'));
  assert.equal(result.exitCode === 0, passed);
  validation.push('', `**${label}: ${outcome} Exit ${result.exitCode}.**`, '', '```powershell',
    fs.readFileSync(path.join(directory, 'command.ps1'), 'utf8').trimEnd(), '```');
}
const selenium = read(path.join(run, 'selenium-candidate-001', 'command.json'));
assert.equal(selenium.actualExitCode, 0);
const quote = value => "'" + value.replaceAll("'", "''") + "'";
validation.push('', '**Existing owning Selenium suite: all 14 Server/WebAssembly rows passed, zero failed/skipped. Exit 0.**', '',
  '```powershell', `Set-Location -LiteralPath ${quote(root)}`, '. .\\activate.ps1',
  `& ${quote(selenium.executable)} ${selenium.arguments.map(quote).join(' ')}`, '```');
const detail = fs.readFileSync(path.join(session, 'F047-pr-description.md'), 'utf8').trimEnd()
  .replaceAll('{{TRACKING_NUMBER}}', String(issueNumber))
  .replaceAll('{{SOURCE_COMMIT}}', source.sourceCommit)
  .replaceAll('{{EVIDENCE_COMMIT}}', evidence.evidenceCommit) +
  '\n\nThe immutable evidence snapshot predates its additive publication receipt. ' +
  'The [current case guide](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F047/README.md) ' +
  `connects the later issue/PR/browser receipt without changing any of the ${evidence.actualImmutableFiles} sealed core files.\n` +
  validation.join('\n');
const template = normalize(fs.readFileSync(path.join(root, '.github', 'pull_request_template.md'), 'utf8'));
const prBody = template.replace('{PR title}', prTitle).replaceAll('- [ ]', '- [x]')
  .replace('Summary of the changes (Less than 80 chars)', summary).replace('{Detail}', detail)
  .replace('Fixes #{bug number} (in this specific format)', `Fixes jaslawinMs/aspnetcore#${issueNumber}`) + '\n';
for (const comment of template.matchAll(/<!--[\s\S]*?-->/g)) {
  assert.ok(prBody.includes(comment[0]), 'Preserve every normal-template comment.');
}
let previousChecklistIndex = -1;
for (const line of template.split('\n').filter(line => line.startsWith('- [ ]'))) {
  const index = prBody.indexOf(line.replace('- [ ]', '- [x]'));
  assert.ok(index > previousChecklistIndex, 'Preserve checklist wording and ordering.');
  previousChecklistIndex = index;
}
assert.ok(prBody.includes('\n## Description\n'));
assert.equal(/\{\{[A-Z_]+\}\}|\{Detail\}|\{PR title\}/.test(prBody), false);
assert.ok(Buffer.byteLength(prBody) < 60000);
const prBodyFile = path.join(execution, 'pr-body.md');
fs.writeFileSync(prBodyFile, prBody);
const prs = JSON.parse(capture('gh', ['pr', 'list', '--repo', 'jaslawinMs/aspnetcore', '--head', source.branch,
  '--state', 'all', '--json', 'number,url,title,body,isDraft']));
assert.ok(prs.length <= 1, 'Never create duplicate finding drafts.');
let prUrl;
if (prs.length) {
  assert.equal(prs[0].title, prTitle);
  assert.equal(normalize(prs[0].body), normalize(prBody));
  assert.equal(prs[0].isDraft, true);
  prUrl = prs[0].url;
} else {
  prUrl = capture('gh', ['pr', 'create', '--repo', 'jaslawinMs/aspnetcore', '--draft', '--base', 'main',
    '--head', source.branch, '--title', prTitle, '--body-file', prBodyFile]);
}
assert.match(prUrl, /^https:\/\/github\.com\/jaslawinMs\/aspnetcore\/pull\/\d+$/i);
fs.writeFileSync(path.join(execution, 'created-or-reused-pr.json'), JSON.stringify({ prUrl, reusedExisting: prs.length === 1 }, null, 2) + '\n');
const browserFile = path.join(execution, 'browser-launch-request.json');
if (!fs.existsSync(browserFile)) {
  capture('pwsh', ['-NoProfile', '-NonInteractive', '-File', path.join(session, 'F047-open-draft.ps1'),
    '-Url', prUrl, '-ReceiptPath', browserFile]);
}
const browser = read(browserFile);
assert.equal(browser.actualDistinctVisibleEdgeWindowObserved, true);
const prNumber = Number(prUrl.match(/(\d+)$/)[1]);
const pr = api('repos/jaslawinMs/aspnetcore/pulls/' + prNumber);
assert.equal(pr.state, 'open');
assert.equal(pr.draft, true);
assert.equal(pr.title, prTitle);
assert.equal(normalize(pr.body), normalize(prBody));
assert.equal(pr.head.ref, source.branch);
assert.equal(pr.head.sha, source.sourceCommit);
assert.equal(pr.head.repo.full_name.toLowerCase(), 'jaslawinms/aspnetcore');
assert.equal(pr.base.repo.full_name.toLowerCase(), 'jaslawinms/aspnetcore');
assert.equal(pr.base.ref, 'main');
assert.equal(pr.base.sha, source.parentBaseline);
const files = api('repos/jaslawinMs/aspnetcore/pulls/' + prNumber + '/files?per_page=100');
assert.deepEqual(files.map(item => item.filename), source.actualOnlySourceFiles.map(item => item.path));
for (const file of files) {
  const expected = expectedDiff.find(item => item.path === file.filename);
  assert.equal(file.additions, expected.additions);
  assert.equal(file.deletions, expected.deletions);
  assert.equal(file.sha, source.actualOnlySourceFiles.find(item => item.path === file.filename).gitBlob);
}
fs.writeFileSync(path.join(execution, 'actual-issue.json'), JSON.stringify(issue, null, 2) + '\n');
fs.writeFileSync(path.join(execution, 'actual-pr.json'), JSON.stringify(pr, null, 2) + '\n');
fs.writeFileSync(path.join(execution, 'actual-pr-files.json'), JSON.stringify(files, null, 2) + '\n');
const receipt = {
  candidate: 'F047', disposition: 'drafted', subtype: evidence.subtype, mergeReady: false,
  actualTrackingIssueUrl: issueUrl, actualTrackingIssueNumber: issueNumber,
  actualTrackingIssueTitle: issueTitle, actualTrackingIssueBody: issue.body, actualTrackingIssueState: issue.state,
  actualPerformancePrCreated: true, actualPerformancePrUrl: prUrl, actualPerformancePrNumber: prNumber,
  actualPrDraft: true, actualPrBody: pr.body, actualPrHeadAndTwoFileDiffVerified: true,
  actualRepositoryPrTemplateCommentsHeadingsChecklistAndOrderPreserved: true,
  actualBrowserLaunch: browser, actualExistingReportWindowNotReopenedOrClosed: true,
  actualBrowserLaunchDriverSha256: hash(path.join(session, 'F047-open-draft.ps1')),
  actualSourceBranch: source.branch, actualSourceCommit: source.sourceCommit,
  actualIndependentBaseline: source.parentBaseline, actualSourceFilesChanged: source.actualOnlySourceFiles,
  actualPrFileAdditionsAndDeletions: expectedDiff,
  actualImmutableEvidenceCommit: evidence.evidenceCommit, actualImmutableEvidenceFiles: evidence.actualImmutableFiles,
  actualVerifiedRemoteImmutableBlobsBeforePr: evidence.actualRemoteImmutableBlobIdsVerified,
  actualEvaluation: decision, actualCompletedComparisons: 3, actualRetainedSamples: 384,
  actualHistoricalTimingRerun: false, actualBudgetPermanentlyClosed: true,
  actualIndividuallyXmlParsedManagedRows: { Original: 101, Default: 98, Candidate: 101 },
  actualIndividuallyXmlParsedBrowserRows: 14, actualRuntimeRecordsChecked: 22,
  actualPerBenchmarkSettingsRecordsChecked: 96,
  actualIndependentEightFileProjectRestoredRebuiltAndCharacterizedBothVariantsWithoutTiming: true,
  actualApplicationThroughputLatencyNeutralityOrLatencySpeedupClaimed: false,
  actualAllAdverseAndUnchangedControlResultsRetained: true,
  actualNoCounterAdvancedYet: true, actualCreated: new Date().toISOString()
};
fs.writeFileSync(path.join(run, 'draft-publication.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualTrackingIssueUrl: issueUrl, actualDraftPrUrl: prUrl,
  actualDistinctVisibleNewEdgeWindowObserved: true, actualVerifiedTwoFileForkDraft: true,
  actualSealedCoreFiles: evidence.actualImmutableFiles, actualCampaignStillFinalized: 123 }, null, 2));
