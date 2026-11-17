import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F024');
const published = path.join(session, 'autoperf-published-results', 'F024');
const execution = path.join(session, 'F024-draft-publication');
fs.mkdirSync(execution);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(execution, 'executed-driver.mjs'));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const source = read(path.join(run, 'source-publication', 'verified-source-publication.json'));
const evidence = fs.readFileSync(path.join(session, 'F024-results-commit.txt'), 'utf8').trim();
const count = Number(fs.readFileSync(path.join(session, 'F024-immutable-file-count.txt'), 'utf8').trim());
const verified = read(path.join(session, 'F024-remote-blob-verification.json'));
assert.match(evidence, /^[a-f0-9]{40}$/);
assert.equal(verified.length, count);
assert.ok(verified.every(row => row.verified_remote_blob));
assert.equal(source.actualAllRemoteSourceRefsAndBlobsVerified, true);
assert.equal(fs.existsSync(path.join(published, 'publication.json')), false);
const invocations = [];
function capture(command, args) {
  const index = String(invocations.length + 1).padStart(3, '0');
  const started = new Date().toISOString();
  const result = spawnSync(command, args, { cwd: session, maxBuffer: 8 * 1024 * 1024 });
  fs.writeFileSync(path.join(execution, `${index}.stdout`), result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(path.join(execution, `${index}.stderr`), result.stderr ?? Buffer.alloc(0));
  invocations.push({ command, args, started, completed: new Date().toISOString(), actualExitCode: result.status,
    stdout: `${index}.stdout`, stderr: `${index}.stderr` });
  fs.writeFileSync(path.join(execution, 'actual-invocations.json'), JSON.stringify(invocations, null, 2) + '\n');
  assert.equal(result.status, 0, `${command} failed:${result.stderr}`);
  return result.stdout.toString().trim();
}
const gh = endpoint => JSON.parse(capture('gh', ['api', endpoint]));
assert.equal(gh(`repos/jaslawinMs/aspnetcore/git/ref/heads/${source.actualSourceBranch}`).object.sha, source.actualSourceCommit);
assert.equal(gh('repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf-results').object.sha, evidence);
const substitute = value => value.replaceAll('@SOURCE_COMMIT@', source.actualSourceCommit).replaceAll('@EVIDENCE_COMMIT@', evidence);
const template = fs.readFileSync(path.join(published, 'pr-template-source.md'), 'utf8').replaceAll('\r\n', '\n');
assert.equal(template, fs.readFileSync(String.raw`C:\src\aspnetcore\.github\pull_request_template.md`, 'utf8').replaceAll('\r\n', '\n'));
for (const marker of ['# {PR title}', 'Summary of the changes (Less than 80 chars)', '{Detail}', 'Fixes #{bug number} (in this specific format)']) {
  assert.ok(template.includes(marker), `Actual repository PR template changed:${marker}`);
}
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const validationCommands = ['```powershell'];
for (const label of ['original-existing', 'original-resource-characterization', 'selected-owning']) {
  const record = read(path.join(published, 'validation', label, 'invocation.json'));
  const result = read(path.join(published, 'validation', label, 'verified-result.json'));
  validationCommands.push(`Set-Location ${quote(record.workingDirectory)}`, '. .\\activate.ps1',
    `& ${quote(record.executable)} ${record.arguments.map(quote).join(' ')}`,
    `# ${label}:actual runner exit${record.actualExitCode};${result.actualPassed} passed,${result.actualExpectedRed} expected allocation red,${result.actualSkipped} skipped.`);
}
validationCommands.push('```');
const issueBody = substitute(fs.readFileSync(path.join(session, 'F024-issue-template.md'), 'utf8'));
assert.ok(!/@[A-Z_]+@/.test(issueBody));
const issueFile = path.join(execution, 'issue-body.md');
fs.writeFileSync(issueFile, issueBody);
const issueUrl = capture('gh', ['issue', 'create', '--repo', 'jaslawinMs/aspnetcore',
  '--title', '[AutoPerf F024] Avoid a disabled timer for infinite session commits', '--body-file', issueFile]);
assert.match(issueUrl, /^https:\/\/github\.com\/jaslawinMs\/aspnetcore\/issues\/\d+$/i);
fs.writeFileSync(path.join(execution, 'created-issue.json'), JSON.stringify({ issueUrl }, null, 2) + '\n');
const title = '[AutoPerf F024] Avoid disabled timers for infinite session commits';
const detail = substitute(fs.readFileSync(path.join(session, 'F024-pr-detail-template.md'), 'utf8'))
  .replaceAll('@ISSUE_URL@', issueUrl).replaceAll('@VALIDATION_COMMANDS@', validationCommands.join('\n')).trim();
const issueNumber = Number(issueUrl.match(/(\d+)$/)[1]);
const body = template.replace('# {PR title}', `# ${title}`)
  .replace('Summary of the changes (Less than 80 chars)', 'Skip disabled commit timers only for explicit infinite I/O timeouts.')
  .replace('{Detail}', detail).replace('Fixes #{bug number} (in this specific format)', `Fixes #${issueNumber}`);
assert.ok(!/@[A-Z_]+@|\{PR title\}|\{Detail\}|#\{bug number\}/.test(body));
const templateComments = [...template.matchAll(/<!--[\s\S]*?-->/g)].map(match => match[0]);
assert.ok(templateComments.every(comment => body.includes(comment)));
const checklist = template.split('\n').filter(line => line.startsWith('- [ ]'));
assert.deepEqual(body.split('\n').filter(line => line.startsWith('- [ ]')), checklist);
const bodyFile = path.join(execution, 'pr-body.md');
fs.writeFileSync(bodyFile, body);
const prUrl = capture('gh', ['pr', 'create', '--repo', 'jaslawinMs/aspnetcore', '--draft',
  '--base', 'main', '--head', source.actualSourceBranch, '--title', title, '--body-file', bodyFile]);
assert.match(prUrl, /^https:\/\/github\.com\/jaslawinMs\/aspnetcore\/pull\/\d+$/i);
fs.writeFileSync(path.join(execution, 'created-pr.json'), JSON.stringify({ prUrl, issueUrl, source: source.actualSourceCommit, evidence }, null, 2) + '\n');
const browserStarted = new Date().toISOString();
const browserResult = capture('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command',
  `$ErrorActionPreference = 'Stop'; Start-Process -FilePath '${prUrl}'; 'Accepted by Windows default URL handler.'`]);
const browser = { prUrl, attemptedImmediatelyAfterActualDraftCreation: true, attemptedBeforeFurtherGithubReads: true,
  started: browserStarted, completed: new Date().toISOString(), actualExitCode: 0, actualOutput: browserResult,
  actualBrowserVisualRenderingVerified: false };
fs.writeFileSync(path.join(execution, 'browser-open.json'), JSON.stringify(browser, null, 2) + '\n');
const number = Number(prUrl.match(/(\d+)$/)[1]);
const actual = gh(`repos/jaslawinMs/aspnetcore/pulls/${number}`);
assert.equal(actual.html_url, prUrl);
assert.equal(actual.draft, true);
assert.equal(actual.state, 'open');
assert.equal(actual.title, title);
assert.equal(actual.head.repo.full_name.toLowerCase(), 'jaslawinms/aspnetcore');
assert.equal(actual.base.repo.full_name.toLowerCase(), 'jaslawinms/aspnetcore');
assert.equal(actual.head.ref, source.actualSourceBranch);
assert.equal(actual.head.sha, source.actualSourceCommit);
assert.equal(actual.base.ref, 'main');
assert.equal(actual.base.sha, source.actualBaseline);
assert.equal(actual.body.replaceAll('\r\n', '\n'), body.replaceAll('\r\n', '\n'));
const actualIssue = gh(`repos/jaslawinMs/aspnetcore/issues/${issueNumber}`);
assert.equal(actualIssue.html_url, issueUrl);
assert.equal(actualIssue.body.replaceAll('\r\n', '\n'), issueBody.replaceAll('\r\n', '\n'));
fs.writeFileSync(path.join(execution, 'actual-pr.json'), JSON.stringify(actual, null, 2) + '\n');
fs.writeFileSync(path.join(execution, 'actual-issue.json'), JSON.stringify(actualIssue, null, 2) + '\n');
const receipt = {
  candidate: 'F024', actualPrUrl: prUrl, actualPrNumber: number, actualIssueUrl: issueUrl, actualIssueNumber: issueNumber,
  actualSourceCommit: source.actualSourceCommit, actualSourceBranch: source.actualSourceBranch,
  actualImmutableEvidenceCommit: evidence, actualImmutableEvidenceFiles: count,
  actualAllImmutableRemoteBlobsVerifiedBeforeDraft: true, actualForkOnlyDraftVerified: true,
  actualBody: actual.body, actualTrackingIssueBody: actualIssue.body, actualRepositoryTemplatePreserved: true,
  actualBrowser: browser, actualBudgetPermanentlyClosed: true, actualComparisons: 3, actualNativeProfiles: 18,
  actualNativeWarmRows: 48, actualFirstObservedRows: 12,
  actualAllInfiniteProfileSavingsBytesPerOperationByComparison: [160, 96, 32],
  actualFiniteControlSavingsBytesPerOperationByComparison: [64, 0, -64],
  actualTimeoutMatchedControlRelativeSavingBytesPerOperation: 96,
  actualAdditional64ByteMovementMechanismEstablished: false,
  defaultConfigurationGainClaim: false, applicationSpeedupClaim: false, mergeReady: false,
};
fs.writeFileSync(path.join(published, 'publication.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(session, 'F024-draft-publication.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ actualPrUrl: prUrl, actualIssueUrl: issueUrl, actualBrowserLaunchAccepted: true,
  actualDraftHeadBaseAndBodyVerified: true, actualVisualRenderingVerified: false }, null, 2));
