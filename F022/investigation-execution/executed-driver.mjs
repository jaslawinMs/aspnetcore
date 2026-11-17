import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = 'C:\\src\\aspnetcore';
const published = path.join(session, 'autoperf-published-results');
const run = path.join(session, 'autoperf-runs', 'F022');
const execution = path.join(run, 'investigation-execution');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F022-indexer-metadata-cache';
const ledger = JSON.parse(fs.readFileSync(path.join(session, 'autoperf-campaign.json'), 'utf8'));
const entry = ledger.candidates.find(candidate => candidate.id === 'F022');
const preceding = JSON.parse(fs.readFileSync(path.join(session, 'F020-final-publication.json'), 'utf8'));
if (fs.existsSync(run) || entry?.status !== 'pending' || preceding.campaignFinalized !== 104 ||
  preceding.actualRemoteEvidenceReceiptIndexEntriesVerified !== 125 ||
  ledger.candidates.filter(candidate => ['drafted', 'no-gain', 'rejected', 'duplicate'].includes(candidate.status)).length !== 104) {
  throw new Error('Fresh F022 paths, pending ledger and actual104-item publication required.');
}
fs.mkdirSync(execution, { recursive: true });
fs.copyFileSync(new URL(import.meta.url), path.join(execution, 'executed-driver.mjs'));
fs.writeFileSync(path.join(run, 'finding.json'), JSON.stringify(entry, null, 2) + '\n', { flag: 'wx' });
let sequence = 0;
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const blob = bytes => crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
function capture(label, executable, args, cwd = root) {
  const stem = path.join(execution, `${String(++sequence).padStart(3, '0')}-${label}`);
  const started = new Date().toISOString();
  const result = spawnSync(executable, args, { cwd, encoding: null, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
  fs.writeFileSync(stem + '.stdout', result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(stem + '.stderr', result.stderr ?? Buffer.alloc(0));
  fs.writeFileSync(stem + '.json', JSON.stringify({ executable, arguments: args, workingDirectory: cwd,
    started, completed: new Date().toISOString(), actualExitCode: result.status, spawnError: result.error?.message ?? null }, null, 2) + '\n');
  if (result.status !== 0 || result.error) throw new Error('Actual F022 capture failed; preserve ' + stem);

  return result.stdout;
}
const text = bytes => bytes.toString('utf8').trim();
if (text(capture('source-head', 'git', ['rev-parse', 'HEAD'])) !== baseline ||
  text(capture('prior-source-branch', 'git', ['branch', '--show-current'])) !== 'autoperf/F020-jsonpatch-list-type-duplicate' ||
  text(capture('source-tracked-status', 'git', ['status', '--porcelain', '--untracked-files=no'])) ||
  text(capture('published-head', 'git', ['rev-parse', 'HEAD'], published)) !== preceding.publicationReceiptCommit ||
  text(capture('published-status', 'git', ['status', '--porcelain'], published))) {
  throw new Error('Do not disturb a different or dirty source/results checkout.');
}
const reports = text(capture('complete-source-status', 'git', ['status', '--porcelain'])).split(/\r?\n/).sort();
const expectedReports = ['autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
  'autoperf-scan-report.md', 'performance-antipattern-findings.md'].map(name => '?? ' + name).sort();
if (JSON.stringify(reports) !== JSON.stringify(expectedReports)) throw new Error('Preserve unexpected untracked source changes.');
capture('independent-source-branch', 'git', ['switch', '-c', branch, baseline]);
const current = JSON.parse(capture('fresh-current-default', 'gh', ['api', 'repos/dotnet/aspnetcore/commits/main']));
if (current.sha !== '49147673007a4b1d676694e2c5f85b83ad76c36f') {
  capture('fetch-fresh-default-object', 'git', ['fetch', '--quiet', '--no-tags', 'origin', current.sha]);
}
const files = [
  'src/Mvc/Mvc.ViewFeatures/src/ExpressionHelper.cs',
  'src/Mvc/Mvc.ViewFeatures/test/ExpressionHelperTest.cs',
  'src/Mvc/Mvc.ViewFeatures/src/ModelExpressionProvider.cs',
  'src/Mvc/Mvc.ViewFeatures/src/CachedExpressionCompiler.cs',
  'src/Mvc/Mvc/src/HotReloadService.cs',
  'src/Mvc/Mvc.Razor/src/RazorHotReload.cs',
];
const snapshots = [];
for (const [index, file] of files.entries()) {
  const original = capture(`baseline-${index + 1}`, 'git', ['show', `${baseline}:${file}`]);
  const latest = capture(`current-default-${index + 1}`, 'git', ['show', `${current.sha}:${file}`]);
  const working = fs.readFileSync(path.join(root, ...file.split('/')));
  const name = path.basename(file);
  for (const [variant, bytes] of [['baseline', original], ['current-default', latest], ['working', working]]) {
    const relative = `${variant}-${name}`;
    fs.writeFileSync(path.join(run, relative), bytes, { flag: 'wx' });
    snapshots.push({ file, variant, path: relative, bytes: bytes.length, sha256: sha(bytes), rawGitBlob: blob(bytes) });
  }
  capture(`history-${index + 1}`, 'gh', ['api', '-X', 'GET', 'repos/dotnet/aspnetcore/commits',
    '-f', `sha=${current.sha}`, '-f', `path=${file}`, '-f', 'per_page=6']);
}
for (const term of ['ExpressionHelper', 'DefaultMember', 'indexer']) {
  capture(`open-proposals-${term.toLowerCase()}`, 'gh', ['api', '-X', 'GET', 'search/issues',
    '-f', `q=repo:dotnet/aspnetcore is:pr is:open ${term}`, '-f', 'per_page=20']);
}
fs.writeFileSync(path.join(run, 'investigation.json'), JSON.stringify({
  candidate: 'F022', baseline, capturedCurrentDefault: current.sha, branch, snapshots,
  sourceFiles: files.length, originalCurrentDefaultWorkingSnapshots: snapshots.length,
  currentDefaultGitBlobParity: files.map(file => ({ file,
    equal: snapshots.find(row => row.file === file && row.variant === 'baseline').rawGitBlob ===
      snapshots.find(row => row.file === file && row.variant === 'current-default').rawGitBlob })),
  sourceChangesCreated: 0, measuredComparisons: 0,
  codeIntelligenceBoundary: 'Azure index targets a different organization;C#LSP syntax inspection available,but workspace symbol lookup empty. Exact known local source is the scoped fallback.',
  openProposalSearchLimit: 'Three title/body keyword searches,20 results each;not complete changed-code search or evidence of absence.',
  capturedAt: new Date().toISOString(),
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F022', branch, baseline, currentDefault: current.sha,
  sourceFiles: files.length, snapshots: snapshots.length,
  currentDefaultMatches: files.map(file => ({ file,
    equal: snapshots.find(row => row.file === file && row.variant === 'baseline').rawGitBlob ===
      snapshots.find(row => row.file === file && row.variant === 'current-default').rawGitBlob })),
  newShippingChanges: 0, measuredComparisons: 0 }, null, 2));
