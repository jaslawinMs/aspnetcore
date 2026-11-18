import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const results = path.join(session, 'autoperf-published-results');
const execution = path.join(session, 'F039-receipt-publication');
const root = String.raw`C:\src\aspnetcore`;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const receipt = read(path.join(results, 'F039', 'publication.json'));
const evidence = fs.readFileSync(path.join(session, 'F039-results-commit.txt'), 'utf8').trim();
const count = Number(fs.readFileSync(path.join(session, 'F039-immutable-file-count.txt'), 'utf8').trim());
assert.equal(receipt.actualImmutableEvidenceCommit, evidence);
assert.equal(receipt.actualImmutableEvidenceFiles, count);
assert.equal(receipt.actualVerifiedRemoteImmutableBlobs, count);
assert.equal(receipt.actualPerformancePrCreated, true);
assert.equal(receipt.actualPrDraft, true);
assert.equal(receipt.actualMeasurementBudgetPermanentlyClosed, true);
assert.equal(receipt.actualRetainedRawResults, 1280);
assert.equal(receipt.actualCompletedSourceComparisonPairs, 2);
assert.equal(receipt.actualFailedSourceComparisonAttempts, 1);
assert.equal(receipt.actualExistingSeleniumRows, 10);
fs.mkdirSync(execution);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(execution, 'executed-driver.mjs'));
const calls = [];
function capture(command, args, cwd = results) {
  const index = String(calls.length + 1).padStart(3, '0');
  const started = new Date().toISOString();
  const result = spawnSync(command, args, { cwd, maxBuffer: 64 * 1024 * 1024, windowsHide: true,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  assert.ifError(result.error);
  fs.writeFileSync(path.join(execution, `${index}.stdout`), result.stdout ?? '');
  fs.writeFileSync(path.join(execution, `${index}.stderr`), result.stderr ?? '');
  calls.push({ executable: command, arguments: args, workingDirectory: cwd, started,
    completed: new Date().toISOString(), actualExitCode: result.status,
    stdout: `${index}.stdout`, stderr: `${index}.stderr` });
  fs.writeFileSync(path.join(execution, 'actual-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, `${command}: ${result.stderr}`);
  return result.stdout.toString().trim();
}
const normalized = text => text.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n').trimEnd();
assert.equal(capture('git', ['branch', '--show-current']), 'autoperf-results');
assert.equal(capture('git', ['rev-parse', 'HEAD']), evidence);
assert.match(capture('git', ['remote', 'get-url', 'origin']), /^https:\/\/github\.com\/jaslawinMs\/aspnetcore(?:\.git)?$/i);
assert.equal(capture('git', ['rev-parse', 'HEAD'], root), receipt.actualSourceCommit);
assert.equal(capture('git', ['branch', '--show-current'], root), receipt.actualSourceBranch);
assert.equal(capture('git', ['status', '--porcelain=v1', '--untracked-files=no'], root), '');
assert.deepEqual(capture('git', ['ls-files', '--others', '--exclude-standard'], root).split(/\r?\n/).sort(),
  ['autoperf-scan-report.md', 'autoperf-issue-70219-duplicate-report.html',
    'autoperf-issue-70219-deduplicated-report.html', 'performance-antipattern-findings.md'].sort());
const ledger = read(path.join(session, 'autoperf-campaign.json'));
assert.deepEqual(read(path.join(results, 'campaign.json')), ledger);
const expected = { drafted: 71, 'no-gain': 19, rejected: 21, duplicate: 6 };
for (const [status, number] of Object.entries(expected))
  assert.equal(ledger.candidates.filter(row => row.status === status).length, number);
assert.equal(ledger.candidates.length, 358);
assert.equal(ledger.candidates.filter(row => Object.hasOwn(expected, row.status)).length, 117);
assert.equal(ledger.candidates.find(row => row.id === 'F039').status, 'drafted');
assert.equal(ledger.candidates.find(row => row.id === 'F039').pr_url, receipt.actualPerformancePrUrl);
const oldLedger = JSON.parse(capture('git', ['show', `${evidence}:campaign.json`]).replace(/^\uFEFF/, ''));
for (const [key, value] of Object.entries(oldLedger)) if (key !== 'candidates') assert.deepEqual(ledger[key], value, key);
for (const row of oldLedger.candidates) if (row.id !== 'F039')
  assert.deepEqual(ledger.candidates.find(candidate => candidate.id === row.id), row, row.id);
const index = normalized(fs.readFileSync(path.join(results, 'README.md'), 'utf8'));
const oldIndex = normalized(capture('git', ['show', `${evidence}:README.md`]));
const newRow = `| F039 | [Draft jaslawinMs/aspnetcore#${receipt.actualPerformancePrNumber}](${receipt.actualPerformancePrUrl}); primary 45.83/45.62% less time, 0 B/op unchanged; 3 closed attempts include 1 before-timing failure and 2 completed comparisons/1,280 samples; 74+74 managed and 10 existing Selenium passes; loaded-lookup-only gain, all adverse/control rows retained, not cookie/app performance or merge-ready | [TempData collection Contains](F039/README.md) |`;
assert.equal(index, oldIndex
  .replace('**Progress: 116/358 finalized**: 70 drafts, 19 no-gain, 21 rejected and 6 duplicates;',
    '**Progress: 117/358 finalized**: 71 drafts, 19 no-gain, 21 rejected and 6 duplicates;')
  .replace('242 findings remain unfinished.', '241 findings remain unfinished.')
  .replace('|---|---|---|', `|---|---|---|\n${newRow}`));
const oldFindings = normalized(capture('git', ['show', `${evidence}:findings.md`])).split('\n');
const findings = normalized(fs.readFileSync(path.join(results, 'findings.md'), 'utf8')).split('\n');
assert.equal(findings.length, oldFindings.length);
for (let line = 0; line < findings.length; line++) if (!oldFindings[line].startsWith('| F039 |'))
  assert.equal(findings[line], oldFindings[line], `findings line ${line + 1}`);
assert.ok(findings.some(line => line.startsWith('| F039 | drafted |') && line.includes(receipt.actualPerformancePrUrl)));
const actualIssue = JSON.parse(capture('gh', ['api', `repos/jaslawinMs/aspnetcore/issues/${receipt.actualTrackingIssueNumber}`]));
assert.equal(actualIssue.html_url, receipt.actualTrackingIssueUrl);
assert.equal(normalized(actualIssue.body), normalized(receipt.actualTrackingIssueBody));
assert.equal(actualIssue.pull_request, undefined);
assert.equal(actualIssue.state, 'open');
const actualPr = JSON.parse(capture('gh', ['api', `repos/jaslawinMs/aspnetcore/pulls/${receipt.actualPerformancePrNumber}`]));
assert.equal(actualPr.html_url, receipt.actualPerformancePrUrl);
assert.equal(normalized(actualPr.body), normalized(receipt.actualPrBody));
assert.equal(actualPr.head.sha, receipt.actualSourceCommit);
assert.equal(actualPr.head.ref, receipt.actualSourceBranch);
assert.equal(actualPr.head.repo.full_name.toLowerCase(), 'jaslawinms/aspnetcore');
assert.equal(actualPr.base.repo.full_name.toLowerCase(), 'jaslawinms/aspnetcore');
assert.equal(actualPr.base.ref, 'main');
assert.equal(actualPr.draft, true);
assert.equal(actualPr.state, 'open');
assert.deepEqual(capture('git', ['diff', '--name-only', 'HEAD']).split(/\r?\n/).filter(Boolean).sort(),
  ['README.md', 'campaign.json', 'findings.md']);
assert.equal(capture('git', ['diff', '--cached', '--name-only']), '');
assert.deepEqual(capture('git', ['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).filter(Boolean), ['F039/publication.json']);
const finalFiles = ['F039/publication.json', 'README.md', 'campaign.json', 'findings.md'];
capture('git', ['add', '--', String.raw`F039\publication.json`, 'README.md', 'campaign.json', 'findings.md']);
assert.deepEqual(capture('git', ['diff', '--cached', '--name-only']).split(/\r?\n/).sort(), finalFiles);
capture('git', ['-c', 'core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol',
  '--no-pager', 'diff', '--cached', '--check', '--', 'README.md', 'findings.md', String.raw`F039\publication.json`]);
capture(process.execPath, [path.join(session, 'autoperf-verify-publication.mjs'), 'F039', 'receipt-staged', String(count)], session);
capture('git', ['commit', '--quiet', '-m', 'Record F039 measured draft receipt and campaign progress\n\n' +
  'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>\n' +
  'Copilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00']);
const commit = capture('git', ['rev-parse', 'HEAD']);
assert.equal(capture('git', ['rev-parse', 'HEAD^']), evidence);
fs.writeFileSync(path.join(session, 'F039-publication-results-commit.txt'), commit + '\n');
capture('git', ['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential',
  'push', 'origin', 'HEAD:refs/heads/autoperf-results']);
capture(process.execPath, [path.join(session, 'autoperf-verify-publication.mjs'), 'F039', 'receipt', String(count)], session);
const blobs = read(path.join(session, 'F039-receipt-blob-verification.json'));
assert.equal(blobs.length, count + 4);
assert.equal(new Set(blobs.map(row => row.path)).size, count + 4);
assert.equal(blobs.filter(row => row.verified_remote_blob).length, count);
assert.equal(blobs.filter(row => row.verified_receipt_or_index).length, 4);
assert.ok(blobs.every(row => row.verified_remote_blob || row.verified_receipt_or_index));
assert.equal(capture('git', ['status', '--porcelain=v1']), '');
assert.equal(capture('git', ['status', '--porcelain=v1', '--untracked-files=no'], root), '');
assert.equal(JSON.parse(capture('gh', ['api', 'repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf-results'])).object.sha, commit);
fs.writeFileSync(path.join(session, 'F039-final-verification.json'), JSON.stringify({
  candidate: 'F039', actualAllPublicationChecksPassed: true, disposition: 'drafted',
  actualTrackingIssueUrl: receipt.actualTrackingIssueUrl, actualPerformancePrUrl: receipt.actualPerformancePrUrl,
  actualPerformancePrCreated: true, actualPrDraft: true, actualPrHeadAndTemplateVerified: true,
  actualBrowserLaunchRequested: true, actualBrowserPageVisibilityVerified: false,
  actualImmutableEvidenceCommit: evidence, actualImmutableEvidenceFiles: count,
  actualFinalReceiptCommit: commit, actualVerifiedRemoteImmutableReceiptIndexEntries: blobs.length,
  actualExactFinalReceiptIndexChangedFiles: finalFiles,
  actualResultsStatusEntries: 0, actualSourceTrackedStatusEntries: 0,
  actualSourceComparisonsConcluded: 3, actualCompletedComparisons: 2, actualFailedBeforeTiming: 1,
  actualAllRawSamples: 1280, actualPrimary: receipt.actualPrimary,
  actualOriginalOwningRows: 74, actualCandidateOwningRows: 74, actualExistingSeleniumRows: 10,
  actualAllOtherLedgerEntriesUnchanged: true, actualOnlyF039FindingsRowChanged: true,
  actualOlderReadmeContentIncludingF004AndF032ClarificationsPreserved: true,
  actualFinalized: 117, actualTotal: 358, actualDrafts: 71, actualNoGain: 19,
  actualRejected: 21, actualDuplicates: 6, actualUnfinished: 241,
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualDraftPrUrl: receipt.actualPerformancePrUrl,
  actualFinalized: 117, actualDrafts: 71, actualUnfinished: 241,
  actualFinalReceiptCommit: commit, actualRemoteEntriesVerified: blobs.length }, null, 2));
