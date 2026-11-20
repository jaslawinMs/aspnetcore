import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
function classifyAuthorization(comparison, budget, authorization)
{
    if (['completed', 'failed'].includes(authorization.status)) { return authorization.status; }
    assert.equal(comparison.findingId, 'F198');
    assert.equal(budget.authorizations.length, 1);
    assert.equal(budget.noRetryAfterFailedOrPartialComparison, true);
    assert.equal(authorization.sourceRole, 'Original');
    assert.equal(authorization.status, 'inconclusive-control-drift');
    const bytes = fs.readFileSync(comparison.actualOutcomeFile);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(), comparison.actualOutcomeSha256);
    const outcome = JSON.parse(bytes.toString('utf8'));
    assert.equal(outcome.status, 'inconclusive-control-drift');
    assert.equal(outcome.controlsPassed, false);
    assert.equal(outcome.actualCompleteBlocks, 7);
    assert.equal(outcome.actualManagedBenchmarkHostProcesses, 21);
    assert.equal(outcome.controls.length, 28);
    assert.equal(outcome.controls.filter(item => item.passed === false).length, 5);
    return 'completed';
}
const completedComparisons = config.completedComparisons ?? [];
let previouslyCompletedComparisonCount = 0;
let previouslyFailedAuthorizationCount = 0;
for (const comparison of completedComparisons)
{
    const bytes = fs.readFileSync(comparison.closedBudgetFile);
    const budget = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(), comparison.closedBudgetSha256);
    assert.equal(budget.closed, true);
    assert.equal(budget.findingId, comparison.findingId);
    assert.equal(budget.authorizations.length, comparison.authorizations);
    const statuses = budget.authorizations.map(item => classifyAuthorization(comparison, budget, item));
    assert.ok(statuses.every(item => ['completed', 'failed'].includes(item)));
    assert.ok(config.outcomes.some(item => item.id === comparison.findingId));
    previouslyCompletedComparisonCount += statuses.filter(item => item === 'completed').length;
    previouslyFailedAuthorizationCount += statuses.filter(item => item === 'failed').length;
}
const previouslyConsumedAuthorizationCount = completedComparisons.reduce((sum, item) => sum + item.authorizations, 0);
assert.equal(previouslyCompletedComparisonCount + previouslyFailedAuthorizationCount, previouslyConsumedAuthorizationCount);
const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const published = path.join(session, 'autoperf-published-results');
const directory = path.join(published, config.folder);
const run = config.run;
const report = '73abf142464b1f81676e03a1eebc766c279cb47b';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const normalize = text => text.replaceAll('\r\n', '\n').trimEnd();
const calls = [];
function execute(command, args)
{
    const result = spawnSync(command, args, { cwd: published, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
    assert.ifError(result.error);
    calls.push({ command, arguments: args, actualExitCode: result.status, stdout: result.stdout, stderr: result.stderr });
    fs.writeFileSync(path.join(run, 'publication-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
    assert.equal(result.status, 0, result.stderr + '\n' + result.stdout);
    return result.stdout.trim();
}
const git = args => execute('git', ['-c', 'core.longpaths=true', '--no-pager', ...args]);
const api = endpoint => JSON.parse(execute('gh', ['api', endpoint]));
assert.match(config.folder, /^[A-Za-z0-9-]+$/);
assert.equal(config.performancePrAuthorized, false);
assert.equal(fs.existsSync(path.join(run, 'verified-final-publication.json')), false);
assert.equal(git(['rev-parse', 'HEAD']), config.expectedParentIndex);
assert.equal(git(['branch', '--show-current']), 'autoperf-results');
assert.equal(git(['diff', '--name-only']), '');
assert.equal(git(['diff', '--cached', '--name-only']), '');
assert.equal(git(['status', '--porcelain', '--untracked-files=normal']), '?? ' + config.folder + '/');
assert.match(git(['remote', 'get-url', 'origin']), /^https:\/\/github\.com\/jaslawinMs\/aspnetcore(?:\.git)?$/i);
assert.equal(api('repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf-results').object.sha, config.expectedParentIndex);
assert.equal(git(['rev-parse', 'HEAD:REPORT.md']), report);
const privateFile = path.join(session, 'autoperf-campaign.json');
const previous = read(privateFile);
assert.deepEqual(previous, read(path.join(published, 'campaign.json')));
const ids = config.outcomes.map(item => item.id);
assert.equal(new Set(ids).size, ids.length);
for (const outcome of config.outcomes)
{
    assert.match(outcome.id, /^F\d{3}$/);
    assert.ok(['rejected', 'no-gain', 'duplicate'].includes(outcome.status));
    assert.equal(previous.candidates.find(item => item.id === outcome.id).status, 'pending');
}
const audit = JSON.parse(execute('node', [path.join(directory, 'verify.mjs'), directory]));
write(path.join(directory, 'historical-audit.json'), audit);
function inventory(current, relative = '')
{
    return fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry =>
    {
        assert.equal(entry.isSymbolicLink(), false);
        const file = path.join(current, entry.name), logical = path.join(relative, entry.name);
        return entry.isDirectory() ? inventory(file, logical) : [{ file: logical.replaceAll('\\', '/'), bytes: fs.statSync(file).size, sha256: hash(file) }];
    });
}
const material = inventory(directory);
assert.equal(material.some(item => ['capsule-file-hashes.json', 'publication.json'].includes(item.file)), false);
write(path.join(directory, 'capsule-file-hashes.json'), { recordedAt: new Date().toISOString(), files: material });
execute('node', [path.join(directory, 'verify.mjs'), directory, '--require-seal']);
for (const file of config.authoredMarkdown)
{
    for (const match of fs.readFileSync(path.join(directory, file), 'utf8').matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g))
    {
        if (!/^(https?:|mailto:)/.test(match[1])) { assert.ok(fs.existsSync(path.resolve(directory, match[1])), match[1]); }
    }
}
const corePaths = [...material.map(item => config.folder + '/' + item.file), config.folder + '/capsule-file-hashes.json'].sort();
git(['add', '--', config.folder]);
assert.deepEqual(git(['diff', '--cached', '--name-only']).split(/\r?\n/).sort(), corePaths);
git(['-c', 'core.whitespace=cr-at-eol', 'diff', '--cached', '--check', '--', ...config.authoredMarkdown.map(file => config.folder + '/' + file)]);
const staged = git(['ls-files', '--stage', '--', config.folder]).split(/\r?\n/).map(line =>
{
    const match = line.match(/^100644 ([a-f0-9]{40}) 0\t(.+)$/);
    assert.ok(match, line);
    const bytes = fs.readFileSync(path.join(published, match[2]));
    assert.equal(crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), match[1]);
    return { file: match[2], sha: match[1] };
});
const trailers = 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>\nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00';
git(['commit', '-m', config.evidenceCommitTitle, '-m', config.evidenceCommitDescription, '-m', trailers]);
const evidenceCommit = git(['rev-parse', 'HEAD']);
fs.writeFileSync(path.join(run, 'evidence-commit.txt'), evidenceCommit + '\n', { flag: 'wx' });
assert.equal(git(['rev-parse', 'HEAD:REPORT.md']), report);
assert.equal(git(['status', '--porcelain']), '');
git(['push', 'origin', 'HEAD:refs/heads/autoperf-results']);
assert.equal(api('repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf-results').object.sha, evidenceCommit);
const remoteCommit = api('repos/jaslawinMs/aspnetcore/git/commits/' + evidenceCommit);
const rootTree = api('repos/jaslawinMs/aspnetcore/git/trees/' + remoteCommit.tree.sha);
assert.equal(rootTree.truncated, false);
assert.equal(rootTree.tree.find(item => item.path === 'REPORT.md').sha, report);
const subtree = rootTree.tree.find(item => item.path === config.folder);
assert.equal(subtree.type, 'tree');
const remoteTree = api('repos/jaslawinMs/aspnetcore/git/trees/' + subtree.sha + '?recursive=1');
assert.equal(remoteTree.truncated, false);
const blobs = remoteTree.tree.filter(item => item.type === 'blob');
assert.equal(blobs.length, corePaths.length);
for (const item of staged) { assert.equal(blobs.find(blob => config.folder + '/' + blob.path === item.file)?.sha, item.sha); }
write(path.join(run, 'evidence-publication.json'), { evidenceCommit, actualCoreBlobsVerified: blobs.length, actualSealedBytesEqualRemoteBlobs: true });
const base = `https://github.com/jaslawinMs/aspnetcore/blob/${evidenceCommit}/${config.folder}/`;
const absoluteLinks = text => text.replace(/(\[[^\]]+\]\()([^)]+)(\))/g, (all, before, target, after) =>
    /^(https?:|#)/.test(target) ? all : before + new URL(target, base).href + after);
const issueBody = absoluteLinks(fs.readFileSync(path.join(directory, 'README.md'), 'utf8')) +
    `\nThe immutable evidence has ${blobs.length} remotely verified core blobs. No performance PR or extra timing is authorized. Later issue/index linkage is additive in [publication.json](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/${config.folder}/publication.json); all sealed files and the fixed classified report remain unchanged.\n`;
const issueFile = path.join(run, 'tracking-issue-body.md');
fs.writeFileSync(issueFile, issueBody, { flag: 'wx' });
const issues = JSON.parse(execute('gh', ['issue', 'list', '--repo', 'jaslawinMs/aspnetcore', '--state', 'all',
    '--search', config.issueSearch, '--limit', '30', '--json', 'number,url,title,body']));
assert.ok(issues.length <= 1);
let issueUrl;
if (issues.length)
{
    assert.equal(issues[0].title, config.issueTitle);
    assert.equal(normalize(issues[0].body), normalize(issueBody));
    issueUrl = issues[0].url;
}
else
{
    issueUrl = execute('gh', ['issue', 'create', '--repo', 'jaslawinMs/aspnetcore', '--title', config.issueTitle, '--body-file', issueFile]);
}
assert.match(issueUrl, /^https:\/\/github\.com\/jaslawinMs\/aspnetcore\/issues\/\d+$/i);
const issueNumber = Number(issueUrl.match(/(\d+)$/)[1]);
write(path.join(run, 'created-tracking-issue.json'), { issueUrl, issueNumber });
execute('gh', ['api', '--method', 'PATCH', 'repos/jaslawinMs/aspnetcore/issues/' + issueNumber, '-f', 'state=closed', '-f', 'state_reason=not_planned']);
const issue = api('repos/jaslawinMs/aspnetcore/issues/' + issueNumber);
assert.equal(issue.state, 'closed'); assert.equal(issue.state_reason, 'not_planned');
assert.equal(issue.title, config.issueTitle); assert.equal(normalize(issue.body), normalize(issueBody));
assert.equal(issue.pull_request, undefined);
const campaign = structuredClone(previous);
for (const outcome of config.outcomes)
{
    const entry = campaign.candidates.find(item => item.id === outcome.id);
    entry.status = outcome.status; entry.updated_at = new Date().toISOString();
    assert.equal(entry.pr_url, null);
    entry.notes.push(outcome.note + ' Immutable evidence ' + evidenceCommit + '; tracking ' + issueUrl +
        '; no performance PR or new browser window, fixed report untouched.');
}
assert.deepEqual(campaign.candidates.filter(item => !ids.includes(item.id)), previous.candidates.filter(item => !ids.includes(item.id)));
const count = value => Object.fromEntries(['drafted', 'no-gain', 'rejected', 'duplicate', 'pending'].map(status => [status, value.candidates.filter(item => item.status === status).length]));
const oldCounts = count(previous), counts = count(campaign), total = campaign.candidates.length;
const finalized = total - counts.pending, priorFinalized = total - oldCounts.pending;
const progress = (number, current) => `**Progress: ${number}/${total} finalized**: ${current.drafted} drafts, ${current['no-gain']} no-gain, ${current.rejected} rejected and ${current.duplicate} duplicates;\n${current.pending} findings remain unfinished.`;
const oldReadme = fs.readFileSync(path.join(published, 'README.md'), 'utf8');
assert.equal(oldReadme.split(progress(priorFinalized, oldCounts)).length, 2);
const table = '| Candidate | Disposition | Evaluation |\n|---|---|---|\n';
assert.equal(oldReadme.split(table).length, 2);
const addedRows = config.outcomes.map(outcome =>
{
    assert.equal(oldReadme.includes('| ' + outcome.id + ' |'), false);
    return outcome.readmeRow.replaceAll('{{ISSUE_NUMBER}}', String(issueNumber)).replaceAll('{{ISSUE_URL}}', issueUrl) + '\n';
}).join('');
const nextReadme = oldReadme.replace(progress(priorFinalized, oldCounts), progress(finalized, counts)).replace(table, table + addedRows);
assert.equal(nextReadme.replace(addedRows, '').replace(progress(finalized, counts), progress(priorFinalized, oldCounts)), oldReadme);
const oldFindings = fs.readFileSync(path.join(published, 'findings.md'), 'utf8');
let nextFindings = oldFindings;
for (const outcome of config.outcomes)
{
    const matches = nextFindings.split(/\r?\n/).filter(line => line.startsWith('| ' + outcome.id + ' | pending |'));
    assert.equal(matches.length, 1);
    nextFindings = nextFindings.replace(matches[0], matches[0].replace('| pending |', '| ' + outcome.status + ' |'));
}
const publication = { case: config.folder, outcomes: config.outcomes.map(({ id, status }) => ({ id, status })),
    subtype: config.subtype, actualPerformancePrCreated: false, actualPerformancePrUrl: null,
    actualTrackingIssueUrl: issueUrl, actualTrackingIssueNumber: issueNumber, actualTrackingIssueState: issue.state,
    actualTrackingIssueStateReason: issue.state_reason, actualIssueTitleAndBodyVerified: true,
    evidenceCommit, actualCoreBlobsVerified: blobs.length, actualImmutableCoreFilesUnchanged: true,
    actualReportBlobUnchanged: report, actualBrowserLaunchRequested: false,
    actualExistingReportWindowNotReopenedOrClosed: true, actualNewComparisons: 0,
    actualPreviouslyCompletedComparisons: previouslyCompletedComparisonCount,
    actualPreviouslyFailedAuthorizations: previouslyFailedAuthorizationCount,
    actualPreviouslyConsumedAuthorizations: previouslyConsumedAuthorizationCount,
    campaignFinalizedAfterVerifiedReceipt: finalized, campaignUnfinishedAfterVerifiedReceipt: counts.pending,
    campaignTotal: total, campaignDispositionCounts: counts, recordedAt: new Date().toISOString() };
write(path.join(directory, 'publication.json'), publication);
fs.copyFileSync(privateFile, path.join(run, 'private-ledger-before-index.json'), fs.constants.COPYFILE_EXCL);
fs.writeFileSync(path.join(published, 'campaign.json'), JSON.stringify(campaign, null, 2) + '\n');
fs.writeFileSync(path.join(published, 'README.md'), nextReadme);
fs.writeFileSync(path.join(published, 'findings.md'), nextFindings);
const finalPaths = [config.folder + '/publication.json', 'README.md', 'campaign.json', 'findings.md'].sort();
git(['add', '--', ...finalPaths]);
assert.deepEqual(git(['diff', '--cached', '--name-only']).split(/\r?\n/).sort(), finalPaths);
git(['-c', 'core.whitespace=cr-at-eol', 'diff', '--cached', '--check', '--', ...finalPaths]);
git(['commit', '-m', config.indexCommitTitle, '-m', `Finalize only${ids.join(',')}:${finalized}of${total},${counts.pending}pending. Closed tracking${issueNumber}; no performance PR or new comparisons;${previouslyCompletedComparisonCount} previously completed comparisons,${previouslyFailedAuthorizationCount} failed authorizations,${previouslyConsumedAuthorizationCount} consumed authorizations. Preserve${blobs.length} immutable core blobs and fixed report.`, '-m', trailers]);
const index = git(['rev-parse', 'HEAD']);
assert.equal(git(['rev-parse', 'HEAD^']), evidenceCommit);
assert.equal(git(['rev-parse', 'HEAD:REPORT.md']), report);
for (const item of material) { assert.equal(hash(path.join(directory, item.file)), item.sha256); }
assert.equal(git(['status', '--porcelain']), '');
git(['push', 'origin', 'HEAD:refs/heads/autoperf-results']);
assert.equal(api('repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf-results').object.sha, index);
const bindings = [];
for (const file of finalPaths)
{
    const sha = git(['rev-parse', index + ':' + file]);
    const remote = api('repos/jaslawinMs/aspnetcore/git/blobs/' + sha);
    const bytes = Buffer.from(remote.content.replace(/\s/g, ''), 'base64');
    assert.equal(crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), sha);
    const local = fs.readFileSync(path.join(published, file));
    if (file.endsWith('.md')) { assert.equal(normalize(bytes.toString('utf8')), normalize(local.toString('utf8'))); }
    else { assert.deepEqual(bytes, local); }
    bindings.push({ file, sha });
}
assert.deepEqual(read(privateFile), previous);
fs.writeFileSync(privateFile, JSON.stringify(campaign, null, 2) + '\n');
assert.deepEqual(read(privateFile), read(path.join(published, 'campaign.json')));
const result = { ...publication, actualFinalIndexCommit: index, actualVerifiedIndexBindings: bindings,
    actualPrivateAndPublicLedgersSynchronized: true, actualFinalizationVerifiedAt: new Date().toISOString() };
write(path.join(run, 'verified-final-publication.json'), result);
console.log(JSON.stringify(result, null, 2));
