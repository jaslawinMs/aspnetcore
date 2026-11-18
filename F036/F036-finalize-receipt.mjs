import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const results = path.join(session, 'autoperf-published-results');
const execution = path.join(session, 'F036-receipt-publication');
const root = String.raw`C:\src\aspnetcore`;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const receipt = read(path.join(results, 'F036', 'publication.json'));
const evidence = fs.readFileSync(path.join(session, 'F036-results-commit.txt'), 'utf8').trim();
const count = Number(fs.readFileSync(path.join(session, 'F036-immutable-file-count.txt'), 'utf8').trim());
assert.equal(receipt.actualImmutableEvidenceCommit, evidence);
assert.equal(receipt.actualImmutableEvidenceFiles, count);
assert.equal(receipt.actualVerifiedRemoteImmutableBlobs, count);
assert.equal(receipt.actualPerformancePrCreated, false);
assert.equal(receipt.actualMeasurementBudgetsPermanentlyClosed, true);
assert.equal(receipt.actualRetainedRawResults, 1792);
assert.equal(receipt.actualPairedRawSamples, 1536);
fs.mkdirSync(execution);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(execution, 'executed-driver.mjs'));
const calls = [];
function capture(command, args, cwd = results) {
  const index = String(calls.length + 1).padStart(3, '0');
  const started = new Date().toISOString();
  const result = spawnSync(command, args, { cwd, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  fs.writeFileSync(path.join(execution, index + '.stdout'), result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(path.join(execution, index + '.stderr'), result.stderr ?? Buffer.alloc(0));
  calls.push({ executable: command, arguments: args, workingDirectory: cwd, started,
    completed: new Date().toISOString(), actualExitCode: result.status,
    stdout: index + '.stdout', stderr: index + '.stderr' });
  fs.writeFileSync(path.join(execution, 'actual-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, `${command}: ${result.stderr}`);
  return result.stdout.toString().trim();
}
assert.equal(capture('git', ['branch', '--show-current']), 'autoperf-results');
assert.equal(capture('git', ['rev-parse', 'HEAD']), evidence);
assert.match(capture('git', ['remote', 'get-url', 'origin']), /^https:\/\/github\.com\/jaslawinMs\/aspnetcore(?:\.git)?$/i);
assert.equal(capture('git', ['rev-parse', 'HEAD'], root), '37e809ead5824bc753a1c3d56f11615bdb1296c5');
assert.equal(capture('git', ['branch', '--show-current'], root), 'autoperf/F036-viewdata-enumeration');
assert.equal(capture('git', ['status', '--porcelain=v1', '--untracked-files=no'], root), '');
const ledger = read(path.join(session, 'autoperf-campaign.json'));
assert.deepEqual(read(path.join(results, 'campaign.json')), ledger);
const expected = { drafted: 69, 'no-gain': 19, rejected: 21, duplicate: 6 };
for (const [status, number] of Object.entries(expected)) {
  assert.equal(ledger.candidates.filter(row => row.status === status).length, number);
}
assert.equal(ledger.candidates.length, 358);
assert.equal(ledger.candidates.filter(row => Object.hasOwn(expected, row.status)).length, 115);
assert.equal(ledger.candidates.find(row => row.id === 'F036').status, 'no-gain');
assert.equal(ledger.candidates.find(row => row.id === 'F036').pr_url, null);
const index = fs.readFileSync(path.join(results, 'README.md'), 'utf8');
assert.ok(index.includes('**Progress: 115/358 finalized**: 69 drafts, 19 no-gain, 21 rejected and 6 duplicates;'));
assert.ok(index.includes('243 findings remain unfinished.'));
assert.ok(index.includes('| F036 | No-gain;'));
assert.ok(index.includes(receipt.actualTrackingIssueUrl));
assert.ok(index.includes('[additive identity observation](F004-harness-identity-clarification.json)'));
assert.ok(index.includes('[additive count clarification](F032-consumer-count-clarification.json)'));
assert.ok(fs.readFileSync(path.join(results, 'findings.md'), 'utf8').includes('| F036 | no-gain |'));
const actualIssue = JSON.parse(capture('gh', ['api', `repos/jaslawinMs/aspnetcore/issues/${receipt.actualTrackingIssueNumber}`]));
assert.equal(actualIssue.html_url, receipt.actualTrackingIssueUrl);
assert.equal(actualIssue.body.replaceAll('\r\n', '\n'), receipt.actualTrackingIssueBody.replaceAll('\r\n', '\n'));
assert.equal(actualIssue.pull_request, undefined);
assert.deepEqual(capture('git', ['diff', '--name-only', 'HEAD']).split(/\r?\n/).filter(Boolean).sort(),
  ['README.md', 'campaign.json', 'findings.md']);
assert.equal(capture('git', ['diff', '--cached', '--name-only']), '');
assert.deepEqual(capture('git', ['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).filter(Boolean),
  ['F036/publication.json']);
capture('git', ['add', '--', String.raw`F036\publication.json`, 'README.md', 'campaign.json', 'findings.md']);
assert.deepEqual(capture('git', ['diff', '--cached', '--name-only']).split(/\r?\n/).sort(),
  ['F036/publication.json', 'README.md', 'campaign.json', 'findings.md']);
capture('git', ['-c', 'core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol',
  '--no-pager', 'diff', '--cached', '--check', '--', 'README.md', 'findings.md', String.raw`F036\publication.json`]);
capture(process.execPath, [path.join(session, 'autoperf-verify-publication.mjs'), 'F036', 'receipt-staged', String(count)], session);
const message = 'Record F036 no-gain tracking receipt and progress\n\n' +
  'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>\n' +
  'Copilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00';
capture('git', ['commit', '--quiet', '-m', message]);
const commit = capture('git', ['rev-parse', 'HEAD']);
assert.equal(capture('git', ['rev-parse', 'HEAD^']), evidence);
fs.writeFileSync(path.join(session, 'F036-publication-results-commit.txt'), commit + '\n');
capture('git', ['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential',
  'push', 'origin', 'HEAD:refs/heads/autoperf-results']);
capture(process.execPath, [path.join(session, 'autoperf-verify-publication.mjs'), 'F036', 'receipt', String(count)], session);
const blobs = read(path.join(session, 'F036-receipt-blob-verification.json'));
assert.equal(blobs.length, count + 4);
assert.equal(new Set(blobs.map(row => row.path)).size, count + 4);
assert.equal(blobs.filter(row => row.verified_remote_blob).length, count);
assert.equal(blobs.filter(row => row.verified_receipt_or_index).length, 4);
assert.ok(blobs.every(row => row.verified_remote_blob || row.verified_receipt_or_index));
assert.equal(capture('git', ['status', '--porcelain=v1']), '');
assert.equal(capture('git', ['status', '--porcelain=v1', '--untracked-files=no'], root), '');
const ref = JSON.parse(capture('gh', ['api', 'repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf-results']));
assert.equal(ref.object.sha, commit);
fs.writeFileSync(path.join(session, 'F036-final-verification.json'), JSON.stringify({
  candidate: 'F036', actualAllPublicationChecksPassed: true, disposition: 'no-gain',
  actualTrackingIssueUrl: receipt.actualTrackingIssueUrl, actualPerformancePrCreated: false,
  actualBrowserLaunchRequested: receipt.actualBrowserLaunchRequested, actualBrowserPageVisibilityVerified: false,
  actualImmutableEvidenceCommit: evidence, actualImmutableEvidenceFiles: count,
  actualFinalReceiptCommit: commit, actualVerifiedRemoteImmutableReceiptIndexEntries: blobs.length,
  actualExactFinalReceiptIndexChangedFiles: ['F036/publication.json', 'README.md', 'campaign.json', 'findings.md'],
  actualResultsStatusExitCode: 0, actualResultsStatusEntries: 0, actualSourceTrackedStatusExitCode: 0,
  actualSourceTrackedStatusEntries: 0, actualSourceComparisonsConcluded: 3,
  actualPairedRawSamples: 1536, actualSeparateDiagnosticRawSamples: 256, actualAllRawSamples: 1792,
  actualOriginalShippingSourceAndProductRestored: true, actualFinalized: 115, actualTotal: 358,
  actualDrafts: 69, actualNoGain: 19, actualRejected: 21, actualDuplicates: 6, actualUnfinished: 243,
  actualOlderF004AndF032ClarificationsPreserved: true,
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualTrackingIssueUrl: receipt.actualTrackingIssueUrl,
  actualFinalized: 115, actualUnfinished: 243, actualFinalReceiptCommit: commit,
  actualRemoteEntriesVerified: blobs.length, actualNoPerformancePr: true }, null, 2));
