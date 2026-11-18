import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F120');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const receipt = path.join(run, 'tracking-publication.json');
const created = path.join(run, 'tracking-issue-created.json');
assert.equal(fs.existsSync(receipt), false);
assert.equal(fs.existsSync(created), false, 'Resume a known created issue; never create a duplicate.');
const evidence = read(path.join(run, 'evidence-publication.json'));
const preparation = read(path.join(run, 'capsule-preparation.json'));
assert.equal(evidence.actualRemoteImmutableBlobIdsVerified, preparation.actualImmutableFilesIncludingSeal);
assert.equal(read(path.join(run, 'diagnostic-budget.json')).permanentlyClosed, true);
const calls = [];
function gh(args) {
  const result = spawnSync('gh', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  calls.push({ executable: 'gh', arguments: args, actualExitCode: result.status, stdout: result.stdout, stderr: result.stderr });
  fs.writeFileSync(path.join(run, 'tracking-publication-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}
const existing = JSON.parse(gh(['issue', 'list', '--repo', 'jaslawinMs/aspnetcore', '--state', 'all',
  '--search', 'F120 in:title', '--json', 'number,title,url,state', '--limit', '20']));
assert.equal(existing.length, 0, 'Inspect existing F120 tracking instead of duplicating it.');
const template = fs.readFileSync(path.join(session, 'autoperf-published-results', 'F120', 'issue-template.md'), 'utf8');
const body = template.replaceAll('{{EVIDENCE_URL}}', evidence.evidenceUrl)
  .replaceAll('{{EVIDENCE_COMMIT}}', evidence.evidenceCommit)
  .replaceAll('{{EVIDENCE_BASE}}', `https://github.com/jaslawinMs/aspnetcore/blob/${evidence.evidenceCommit}/F120`);
assert.equal(body.includes('{{'), false);
const bodyFile = path.join(run, 'tracking-issue-body.md');
fs.writeFileSync(bodyFile, body, { flag: 'wx' });
const title = '[AutoPerf F120] MVC copied-store Contains: measured no-gain';
const url = gh(['issue', 'create', '--repo', 'jaslawinMs/aspnetcore', '--title', title, '--body-file', bodyFile]);
const match = url.match(/^https:\/\/github\.com\/jaslawinMs\/aspnetcore\/issues\/(\d+)$/i);
assert.ok(match, url);
const number = Number(match[1]);
fs.writeFileSync(created, JSON.stringify({ number, url, title }, null, 2) + '\n', { flag: 'wx' });
gh(['api', '--method', 'PATCH', `repos/jaslawinMs/aspnetcore/issues/${number}`,
  '-f', 'state=closed', '-f', 'state_reason=not_planned']);
const issue = JSON.parse(gh(['api', `repos/jaslawinMs/aspnetcore/issues/${number}`]));
assert.equal(issue.state, 'closed');
assert.equal(issue.state_reason, 'not_planned');
assert.equal(issue.title, title);
assert.equal(issue.body.replaceAll('\r\n', '\n').trim(), body.replaceAll('\r\n', '\n').trim());
assert.equal(Object.hasOwn(issue, 'pull_request'), false);
const result = {
  candidate: 'F120', disposition: 'no-gain', repository: 'jaslawinMs/aspnetcore',
  number, url: issue.html_url, state: issue.state, stateReason: issue.state_reason,
  actualTitle: issue.title, actualBody: issue.body, actualBodyAndLinksVerified: true,
  actualNewPerformancePullRequestCreated: false, actualBrowserOpenRequested: false, actualCounterAdvanced: false
};
fs.writeFileSync(receipt, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F120', disposition: 'no-gain', number, url: issue.html_url,
  state: issue.state, actualNewPerformancePullRequestCreated: false, actualCounterAdvanced: false }, null, 2));
