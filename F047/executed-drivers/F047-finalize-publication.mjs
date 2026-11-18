import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F047');
const published = path.join(session, 'autoperf-published-results');
const directory = path.join(published, 'F047');
const root = 'C:\\src\\aspnetcore';
const reportBlob = '73abf142464b1f81676e03a1eebc766c279cb47b';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const normalize = text => text.replaceAll('\r\n', '\n').trimEnd();
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const receipt = path.join(directory, 'publication.json');
const finished = path.join(run, 'verified-final-publication.json');
assert.equal(fs.existsSync(receipt), false, 'Never replace the late receipt or resume a partial finalization blindly.');
assert.equal(fs.existsSync(finished), false);
const calls = [];
function execute(executable, args) {
  const result = spawnSync(executable, args, { cwd: published, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  assert.ifError(result.error);
  calls.push({ executable, arguments: args, actualExitCode: result.status, stdout: result.stdout, stderr: result.stderr });
  fs.writeFileSync(path.join(run, 'final-publication-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, `${executable} ${args.join(' ')}\n${result.stderr}\n${result.stdout}`);
  return result.stdout.trim();
}
const git = args => execute('git', ['-c', 'core.longpaths=true', '--no-pager', ...args]);
const api = endpoint => JSON.parse(execute('gh', ['api', endpoint]));
const evidence = read(path.join(run, 'evidence-publication.json'));
const source = read(path.join(run, 'source-publication.json'));
const draft = read(path.join(run, 'draft-publication.json'));
const coreFiles = evidence.actualImmutableFiles;
assert.equal(git(['rev-parse', 'HEAD']), evidence.evidenceCommit);
assert.equal(git(['branch', '--show-current']), 'autoperf-results');
assert.match(git(['remote', 'get-url', 'origin']), /^https:\/\/github\.com\/jaslawinMs\/aspnetcore(?:\.git)?$/i);
assert.equal(git(['diff', '--cached', '--name-only']), '');
assert.deepEqual(git(['diff', '--name-only']).split(/\r?\n/).sort(), ['README.md', 'findings.md']);
assert.equal(api('repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf-results').object.sha, evidence.evidenceCommit);
assert.equal(api('repos/jaslawinMs/aspnetcore/git/ref/heads/' + source.branch).object.sha, source.sourceCommit);
assert.equal(hash(path.join(run, 'diagnostic-budget.json')), '43C18A44A78A361DB6CB2447380300E0EE5B53AE7AEE8260C14E9EE5C595835A');
assert.equal(hash(path.join(root, 'global.json')), 'C3D6E7C29D94C34B6343D4A2EFE74164929F29BFA26FD84B5E2020A15091CD53');
for (const item of source.actualOnlySourceFiles) {
  assert.equal(hash(path.join(root, ...item.path.split('/'))), item.actualPhysicalSnapshotSha256);
}
for (const [file, expected] of Object.entries(source.actualUnrelatedReportHashesPreserved)) {
  assert.equal(hash(path.join(root, file)), expected);
}
const previous = JSON.parse(git(['show', 'HEAD:campaign.json']).replace(/^\uFEFF/, ''));
const campaignFile = path.join(session, 'autoperf-campaign.json');
assert.deepEqual(read(campaignFile), previous);
assert.deepEqual(read(path.join(published, 'campaign.json')), previous);
assert.equal(previous.candidates.length, 358);
assert.equal(previous.candidates.find(item => item.id === 'F047').status, 'pending');
const campaign = structuredClone(previous);
const entry = campaign.candidates.find(item => item.id === 'F047');
entry.status = 'drafted';
entry.branch = source.branch;
entry.pr_url = draft.actualPerformancePrUrl;
entry.updated_at = new Date().toISOString();
entry.notes.push('Qualified allocation-only SSR parameter trade-off, not a demonstrated speedup or merge-ready: ' +
  'FreshBoundarySetAndDispose/PrerenderScalar1 saves56 B/op in every pair (1616->1560); unchanged nonprerender controls save0. ' +
  'Primary median paired less-time effect-1.4301071513%; slower2.4821318403% and1.4301071513% in pairs2/3. ' +
  'Pair1 apparent51.2042037488% benefit has an unstable original42.6850651680% CV and declining retained samples; no51% headline. ' +
  'Unchanged four-scalar control swings-26.6533158467%,+24.0388939980%,-6.7075823099%; all adverse outcomes retained. ' +
  'Three permanently closed comparisons/384 independently recomputed samples, identical measured harness/193 unchanged consumer entries, ' +
  '314 individually parsed passing managed/browser XML rows, six canonical browser cases/clicks per source, actual default31c15331 validated separately, ' +
  'independent exact8-file project rebuild and both untimed characterization matrices pass without further timing. ' +
  'Source ' + source.sourceCommit + ';' + coreFiles + '-blob immutable evidence ' + evidence.evidenceCommit + '; tracking ' + draft.actualTrackingIssueUrl +
  '; draft ' + draft.actualPerformancePrUrl + '. Immediately opened in a distinct visible Edge window; existing report window untouched. Not merge-ready.');
assert.deepEqual(campaign.excluded_exact_duplicates, previous.excluded_exact_duplicates);
assert.deepEqual(campaign.candidates.filter(item => item.id !== 'F047'), previous.candidates.filter(item => item.id !== 'F047'));
assert.deepEqual(campaign.candidates.find(item => item.id === 'F047').finding, previous.candidates.find(item => item.id === 'F047').finding);
const counts = Object.fromEntries(['drafted', 'no-gain', 'rejected', 'duplicate'].map(status =>
  [status, campaign.candidates.filter(item => item.status === status).length]));
assert.deepEqual(counts, { drafted: 75, 'no-gain': 21, rejected: 22, duplicate: 6 });
assert.equal(Object.values(counts).reduce((a, b) => a + b, 0), 124);
const rootReadme = fs.readFileSync(path.join(published, 'README.md'), 'utf8');
assert.ok(rootReadme.includes('124/358 finalized') && rootReadme.includes('234 findings remain unfinished.'));
assert.ok(rootReadme.includes(draft.actualPerformancePrUrl) && rootReadme.includes(draft.actualTrackingIssueUrl));
const priorReadme = git(['show', 'HEAD:README.md']);
const addedRows = rootReadme.split(/\r?\n/).filter(line => line.startsWith('| F047 |'));
assert.equal(addedRows.length, 1);
assert.equal(normalize(rootReadme.replaceAll('\r\n', '\n').replace(addedRows[0] + '\n', '')
  .replace('124/358 finalized**: 75 drafts', '123/358 finalized**: 74 drafts')
  .replace('234 findings remain unfinished.', '235 findings remain unfinished.')), normalize(priorReadme));
const findings = fs.readFileSync(path.join(published, 'findings.md'), 'utf8');
const newFindingRow = findings.split(/\r?\n/).find(line => line.startsWith('| F047 | drafted |'));
const oldFindingRow = git(['show', 'HEAD:findings.md']).split(/\r?\n/).find(line => line.startsWith('| F047 | pending |'));
assert.ok(newFindingRow && oldFindingRow);
assert.equal(newFindingRow, oldFindingRow.replace('| pending |', '| drafted |')
  .replace('| - |', `| [jaslawinMs/aspnetcore#${draft.actualPerformancePrNumber}](${draft.actualPerformancePrUrl}) |`));
assert.equal(normalize(findings.replace(newFindingRow, oldFindingRow)), normalize(git(['show', 'HEAD:findings.md'])));
const coreBefore = git(['ls-tree', '-r', 'HEAD', '--', 'F047']);
const coreEntries = coreBefore.split(/\r?\n/).map(line => {
  const match = line.match(/^100644 blob ([a-f0-9]{40})\tF047\/(.+)$/);
  assert.ok(match, line);
  return { path: match[2], sha: match[1] };
});
assert.equal(coreEntries.length, coreFiles);
const audit = read(path.join(directory, 'audit-summary.json'));
assert.equal(audit.actualRetainedSamples, 384);
assert.equal(audit.actualRuntimeRecordsChecked, 22);
assert.equal(audit.actualDisposition, 'qualified');
fs.copyFileSync(campaignFile, path.join(run, 'private-ledger-before-index.json'), fs.constants.COPYFILE_EXCL);
const issue = api('repos/jaslawinMs/aspnetcore/issues/' + draft.actualTrackingIssueNumber);
assert.equal(issue.state, 'open');
assert.equal(normalize(issue.body), normalize(draft.actualTrackingIssueBody));
const addition = '\n\nFork research draft: [jaslawinMs/aspnetcore#' + draft.actualPerformancePrNumber + '](' + draft.actualPerformancePrUrl +
  '). The immutable evidence snapshot predates its additive publication receipt; use the [current case guide]' +
  '(https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F047/README.md) for that late receipt. ' +
  `All ${coreFiles} sealed source/results files stay pinned and unchanged. Allocation-only scope, the failed latency gate and every adverse/control result remain; not merge-ready.\n`;
const body = issue.body.trimEnd() + addition;
execute('gh', ['api', '--method', 'PATCH', 'repos/jaslawinMs/aspnetcore/issues/' + issue.number, '-f', 'body=' + body]);
const updatedIssue = api('repos/jaslawinMs/aspnetcore/issues/' + issue.number);
assert.equal(normalize(updatedIssue.body), normalize(body));
assert.equal(updatedIssue.state, 'open');
const pr = api('repos/jaslawinMs/aspnetcore/pulls/' + draft.actualPerformancePrNumber);
assert.equal(pr.draft, true);
assert.equal(pr.state, 'open');
assert.equal(pr.head.sha, source.sourceCommit);
assert.equal(pr.base.repo.full_name.toLowerCase(), 'jaslawinms/aspnetcore');
assert.equal(pr.base.ref, 'main');
assert.equal(pr.base.sha, source.parentBaseline);
assert.equal(normalize(pr.body), normalize(draft.actualPrBody));
const publication = {
  ...draft,
  actualTrackingIssueBody: updatedIssue.body,
  actualTrackingIssueTitleAndBodyVerified: true,
  actualCopiedAuthoritativeFiles: evidence.actualCopiedAuthoritativeFiles,
  actualHashedOmittedCompiledRestoreFiles: evidence.actualOmittedCompiledRestoreFiles,
  actualPreimplementationPlanAndBudgetPreserved: true,
  actualAdditionalTimingSamplesDuringPublication: 0,
  actualReceiptLinkBoundary: `Immutable evidence predates this additive receipt. The issue and PR link the current guide; all ${coreFiles} sealed core files remain unchanged.`,
  actualPublishedReportBlobUnchanged: reportBlob,
  actualReportRemainsFixed118FinalizedSnapshot: true,
  campaignFinalizedAfterVerifiedReceipt: 124,
  campaignTotal: 358,
  campaignUnfinishedAfterVerifiedReceipt: 234,
  campaignDispositionCounts: counts,
  actualFinalizationCreated: new Date().toISOString()
};
delete publication.actualNoCounterAdvancedYet;
fs.writeFileSync(receipt, JSON.stringify(publication, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(published, 'campaign.json'), JSON.stringify(campaign, null, 2) + '\n');
const expectedPaths = ['F047/publication.json', 'README.md', 'campaign.json', 'findings.md'].sort();
git(['add', '--', ...expectedPaths]);
assert.deepEqual(git(['diff', '--cached', '--name-only']).split(/\r?\n/).sort(), expectedPaths);
git(['-c', 'core.whitespace=cr-at-eol', 'diff', '--cached', '--check', '--', ...expectedPaths]);
git(['commit', '-m', 'Index verified F047 SSR allocation-trade-off research draft',
  '-m', `Connect fork draft${draft.actualPerformancePrNumber}/tracking${draft.actualTrackingIssueNumber} to the independently audited ${coreFiles}-blob capsule and two-file source. Advance only F047:124of358 finalized,75drafts/21no-gain/22rejected/6duplicates. Preserve allocation-only scope, the failed latency gate, every adverse/control outcome, all sealed core files and the fixed classified report. No further timing.`,
  '-m', 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>\nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00']);
const commit = git(['rev-parse', 'HEAD']);
fs.writeFileSync(path.join(run, 'final-publication-commit.txt'), commit + '\n', { flag: 'wx' });
assert.equal(git(['rev-parse', 'HEAD^']), evidence.evidenceCommit);
assert.deepEqual(git(['diff-tree', '--no-commit-id', '--name-only', '-r', commit]).split(/\r?\n/).sort(), expectedPaths);
assert.equal(git(['ls-tree', '-r', evidence.evidenceCommit, '--', 'F047']), coreBefore);
assert.equal(git(['rev-parse', 'HEAD:REPORT.md']), reportBlob);
assert.equal(git(['status', '--porcelain']), '');
git(['push', 'origin', 'HEAD:refs/heads/autoperf-results']);
assert.equal(api('repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf-results').object.sha, commit);
const remoteCommit = api('repos/jaslawinMs/aspnetcore/git/commits/' + commit);
assert.deepEqual(remoteCommit.parents.map(item => item.sha), [evidence.evidenceCommit]);
const finalBindings = expectedPaths.map(file => {
  const blob = git(['rev-parse', commit + ':' + file]);
  const remote = api('repos/jaslawinMs/aspnetcore/git/blobs/' + blob);
  assert.equal(remote.sha, blob);
  const bytes = Buffer.from(remote.content.replace(/\s/g, ''), 'base64');
  assert.equal(crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), blob);
  if (file === 'campaign.json') {
    assert.deepEqual(JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, '')), campaign);
  } else if (file === 'F047/publication.json') {
    const stored = JSON.parse(bytes.toString('utf8'));
    assert.equal(stored.actualPerformancePrUrl, draft.actualPerformancePrUrl);
    assert.equal(stored.actualEvaluation.controlCredibilityGateMet, true);
    assert.equal(stored.actualTrackingIssueBody, updatedIssue.body);
    assert.equal(stored.campaignFinalizedAfterVerifiedReceipt, 124);
    assert.equal(stored.actualBrowserLaunch.actualWindowTitlesNotReadOrRecorded, true);
  } else {
    assert.equal(normalize(bytes.toString('utf8')), normalize(fs.readFileSync(path.join(published, file), 'utf8')));
  }
  return { path: file, gitBlob: blob, actualRemoteBytesVerified: true };
});
const rootTree = api('repos/jaslawinMs/aspnetcore/git/trees/' + remoteCommit.tree.sha);
assert.equal(rootTree.truncated, false);
assert.equal(rootTree.tree.find(item => item.path === 'REPORT.md').sha, reportBlob);
const finalCase = rootTree.tree.find(item => item.path === 'F047');
const finalTree = api('repos/jaslawinMs/aspnetcore/git/trees/' + finalCase.sha + '?recursive=1');
assert.equal(finalTree.truncated, false);
assert.equal(finalTree.tree.filter(item => item.type === 'blob').length, coreFiles + 1);
for (const item of coreEntries) {
  assert.equal(finalTree.tree.find(file => file.path === item.path && file.type === 'blob').sha, item.sha);
}
assert.deepEqual(read(campaignFile), previous, 'Keep the private authoritative progress unchanged until remote verification.');
fs.writeFileSync(campaignFile, JSON.stringify(campaign, null, 2) + '\n');
assert.deepEqual(read(campaignFile), read(path.join(published, 'campaign.json')));
const finalCheck = {
  candidate: 'F047', disposition: 'drafted', subtype: draft.subtype,
  finalIndexCommit: commit, actualVerifiedRemoteIndexAndReceiptBlobs: finalBindings,
  actualImmutableCoreFilesPreserved: coreFiles, actualFinalCaseFilesIncludingLateReceipt: coreFiles + 1,
  actualReportPreserved: true, actualForkDraftPr: draft.actualPerformancePrUrl,
  actualTrackingIssue: updatedIssue.html_url, actualDistinctVisibleNewEdgeWindowObserved: true,
  actualCompletedComparisons: 3, actualRetainedSamples: 384, actualTimingBudgetPermanentlyClosed: true,
  actualCampaignFinalized: 124, actualCampaignTotal: 358, actualUnfinished: 234,
  actualDispositionCounts: counts, actualHistoricalTimingRerun: false,
  actualOnlyF047LedgerEntryChanged: true, actualProtectedPrimaryInputsPreserved: true
};
fs.writeFileSync(finished, JSON.stringify(finalCheck, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(finalCheck, null, 2));
