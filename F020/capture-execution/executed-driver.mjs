import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = 'C:\\src\\aspnetcore';
const published = path.join(session, 'autoperf-published-results');
const canonical = path.join(published, 'F086');
const run = path.join(session, 'autoperf-runs', 'F020');
const execution = path.join(run, 'capture-execution');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const selected = '4c2d4c04460429a9e49e5c78c2091d82ae53e324';
const evidence = '31f6b082e934a17b7c1136628245c75ae55100e8';
const branch = 'autoperf/F020-jsonpatch-list-type-duplicate';
const owner = 'src/Features/JsonPatch.SystemTextJson/src/Internal/ListAdapter.cs';
const ledger = JSON.parse(fs.readFileSync(path.join(session, 'autoperf-campaign.json'), 'utf8'));
const finding = ledger.candidates.find(entry => entry.id === 'F020');
const previous = ledger.candidates.find(entry => entry.id === 'F086');
const receipt = JSON.parse(fs.readFileSync(path.join(canonical, 'publication.json'), 'utf8'));
if (fs.existsSync(run) || finding?.status !== 'pending' || previous?.status !== 'drafted' ||
  ledger.candidates.filter(entry => ['drafted', 'no-gain', 'rejected', 'duplicate'].includes(entry.status)).length !== 103 ||
  receipt.source_commit !== selected || receipt.immutable_evidence_commit !== evidence || receipt.immutable_evidence_files !== 171 ||
  JSON.parse(fs.readFileSync(path.join(session, 'F019-receipt-blob-verification.json'), 'utf8')).length !== 511) {
  throw new Error('Fresh actual F020 and verified canonical/preceding publications required.');
}
fs.mkdirSync(execution, { recursive: true });
fs.copyFileSync(new URL(import.meta.url), path.join(execution, 'executed-driver.mjs'));
fs.writeFileSync(path.join(run, 'findings.json'), JSON.stringify({ alias: finding, canonical: previous }, null, 2) + '\n', { flag: 'wx' });
let sequence = 0;
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const gitBlob = bytes => crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
function command(label, executable, args, cwd = root) {
  const stem = path.join(execution, `${String(++sequence).padStart(3, '0')}-${label}`);
  const started = new Date().toISOString();
  const result = spawnSync(executable, args, { cwd, encoding: null, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
  fs.writeFileSync(stem + '.stdout', result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(stem + '.stderr', result.stderr ?? Buffer.alloc(0));
  fs.writeFileSync(stem + '.json', JSON.stringify({ executable, arguments: args, workingDirectory: cwd,
    started, completed: new Date().toISOString(), actualExitCode: result.status, spawnError: result.error?.message ?? null }, null, 2) + '\n');
  if (result.status !== 0 || result.error) {
    throw new Error('Actual F020 capture failed; preserve ' + stem);
  }

  return result.stdout;
}
const text = bytes => bytes.toString('utf8').trim();
const normalize = bytes => Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n'));
if (text(command('source-head', 'git', ['rev-parse', 'HEAD'])) !== baseline ||
  text(command('prior-source-branch', 'git', ['branch', '--show-current'])) !== 'autoperf/F019-layoutview-parent-cache' ||
  text(command('source-tracked-status', 'git', ['status', '--porcelain', '--untracked-files=no'])) ||
  text(command('published-status', 'git', ['status', '--porcelain'], published))) {
  throw new Error('Do not disturb a different or dirty source/results checkout.');
}
const reports = text(command('source-complete-status', 'git', ['status', '--porcelain'])).split(/\r?\n/).sort();
const expectedReports = ['autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
  'autoperf-scan-report.md', 'performance-antipattern-findings.md'].map(name => '?? ' + name).sort();
if (JSON.stringify(reports) !== JSON.stringify(expectedReports)) {
  throw new Error('Preserve unexpected untracked source changes.');
}
command('independent-alias-branch', 'git', ['switch', '-c', branch, baseline]);
const current = JSON.parse(command('fresh-default', 'gh', ['api', 'repos/dotnet/aspnetcore/commits/main']));
const original = command('actual-baseline-owner', 'git', ['show', `${baseline}:${owner}`]);
const defaultOwner = command('actual-current-default-owner', 'git', ['show', `${current.sha}:${owner}`]);
const proposal = command('actual-canonical-source-owner', 'git', ['show', `${selected}:${owner}`]);
fs.writeFileSync(path.join(run, 'baseline-owner.cs'), original, { flag: 'wx' });
fs.writeFileSync(path.join(run, 'current-default-owner.cs'), defaultOwner, { flag: 'wx' });
fs.writeFileSync(path.join(run, 'canonical-proposal-owner.cs'), proposal, { flag: 'wx' });
command('owner-history', 'gh', ['api', '-X', 'GET', 'repos/dotnet/aspnetcore/commits', '-f', `sha=${current.sha}`,
  '-f', `path=${owner}`, '-f', 'per_page=6']);
const actualPr = JSON.parse(command('actual-canonical-pr', 'gh', ['api', 'repos/jaslawinMs/aspnetcore/pulls/91']));
if (actualPr.state !== 'open' || !actualPr.draft || actualPr.head.sha !== selected ||
  actualPr.head.repo.full_name !== 'jaslawinMs/aspnetcore' || actualPr.base.repo.full_name !== 'jaslawinMs/aspnetcore' ||
  actualPr.changed_files !== 2 || actualPr.additions !== 171 || actualPr.deletions !== 0) {
  throw new Error('Actual canonical fork proposal differs; inspect rather than infer an alias publication.');
}
const sourceResponse = JSON.parse(command('actual-canonical-api-owner', 'gh',
  ['api', `repos/jaslawinMs/aspnetcore/contents/${owner}?ref=${selected}`]));
const decoded = Buffer.from(sourceResponse.content, 'base64');
if (sourceResponse.encoding !== 'base64' || sourceResponse.path !== owner || !decoded.equals(proposal) ||
  gitBlob(decoded) !== sourceResponse.sha || sourceResponse.size !== decoded.length) {
  throw new Error('Actual canonical proposal source/API Git blob differs.');
}
const before = fs.readFileSync(path.join(canonical, 'source-before.cs'));
const after = fs.readFileSync(path.join(canonical, 'source-after.cs'));
if (!original.equals(defaultOwner) || !normalize(before).equals(original) || !normalize(after).equals(proposal) ||
  !original.includes(Buffer.from('ClosedGenericMatcher.ExtractGenericInterface(listType, typeof(IList<>))')) ||
  finding.finding.card_id !== previous.finding.card_id || finding.finding.file !== previous.finding.file ||
  finding.finding.line_start > previous.finding.line_start || finding.finding.line_end < previous.finding.line_end) {
  throw new Error('Actual named source/range identities do not establish this exact semantic alias.');
}
fs.writeFileSync(path.join(run, 'canonical-original-snapshot.cs'), before, { flag: 'wx' });
fs.writeFileSync(path.join(run, 'canonical-selected-snapshot.cs'), after, { flag: 'wx' });
fs.copyFileSync(path.join(canonical, 'publication.json'), path.join(run, 'canonical-publication.json'));
fs.copyFileSync(path.join(canonical, 'measurement-decision.json'), path.join(run, 'canonical-closed-budget.json'));
const rootTree = JSON.parse(command('actual-canonical-evidence-root', 'gh', ['api', `repos/jaslawinMs/aspnetcore/git/trees/${evidence}`], published));
const directory = rootTree.tree.filter(entry => entry.path === 'F086' && entry.type === 'tree');
if (rootTree.truncated || directory.length !== 1) {
  throw new Error('Complete actual canonical evidence root required.');
}
const remote = JSON.parse(command('actual-canonical-evidence-files', 'gh',
  ['api', `repos/jaslawinMs/aspnetcore/git/trees/${directory[0].sha}?recursive=1`], published));
const local = text(command('actual-local-canonical-evidence-tree', 'git', ['ls-tree', '-r', evidence, '--', 'F086'], published))
  .split(/\r?\n/).map(line => {
    const [metadata, name] = line.split('\t');
    const [, type, blob] = metadata.split(' ');
    if (type !== 'blob') throw new Error('Unexpected non-blob canonical evidence.');

    return { path: name, gitBlob: blob };
  });
const remoteFiles = new Map(remote.tree.filter(entry => entry.type === 'blob').map(entry => ['F086/' + entry.path, entry.sha]));
if (remote.truncated || local.length !== 171 || remoteFiles.size !== 171) {
  throw new Error('Exact actual complete 171-file canonical capsule required.');
}
const verified = local.map(entry => {
  const bytes = fs.readFileSync(path.join(published, ...entry.path.split('/')));
  if (remoteFiles.get(entry.path) !== entry.gitBlob || gitBlob(bytes) !== entry.gitBlob) {
    throw new Error('Actual canonical remote/raw evidence differs: ' + entry.path);
  }

  return { ...entry, bytes: bytes.length, sha256: sha256(bytes), actualRemoteVerified: true };
});
fs.writeFileSync(path.join(run, 'canonical-evidence-verification.json'), JSON.stringify(verified, null, 2) + '\n', { flag: 'wx' });
command('canonical-read-only-raw-replay', 'node', [path.join(canonical, 'reproduce-analysis.mjs'), canonical, '--verify']);
for (const entry of verified) {
  if (sha256(fs.readFileSync(path.join(published, ...entry.path.split('/')))) !== entry.sha256) {
    throw new Error('Read-only replay changed historical canonical evidence: ' + entry.path);
  }
}
const identities = [
  ['baseline-owner.cs', original], ['current-default-owner.cs', defaultOwner],
  ['canonical-proposal-owner.cs', proposal], ['canonical-original-snapshot.cs', before], ['canonical-selected-snapshot.cs', after],
].map(([file, bytes]) => ({ path: file, bytes: bytes.length, sha256: sha256(bytes), rawGitBlob: gitBlob(bytes) }));
fs.writeFileSync(path.join(run, 'provenance.json'), JSON.stringify({
  candidate: 'F020', disposition: 'duplicate', duplicateOf: 'F086', sourceOnly: true,
  baseline, currentDefault: current.sha, independentBranch: branch, sourceIdentities: identities,
  canonicalSourceCommit: selected, canonicalEvidenceCommit: evidence, actualCanonicalPr: actualPr.html_url,
  canonicalPrOpen: true, canonicalPrDraft: true, canonicalRemoteFilesVerified: verified.length,
  canonicalOriginalRawEqualsNativeBaseline: before.equals(original), canonicalOriginalCanonicalContentEqualsBaseline: true,
  canonicalReadOnlyRawAuditPassed: true, canonicalHistoricalEvidenceUnmodified: true,
  newShippingChanges: 0, newBenchmarkProjects: 0, newComparisons: 0,
  canonicalComparisons: 1, canonicalBudgetStaysClosed: true, duplicatedSignalAddsNoIndependentConfidence: true,
  historicalProcessThreadPriorityStateUnverified: true,
  capturedAt: new Date().toISOString(),
}, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'measurement-budget.json'), JSON.stringify({
  candidate: 'F020', duplicateOf: 'F086', newComparisons: 0, newSourceStrategies: 0,
  closed: true, canonicalComparisons: 1, canonicalMaximumComparisons: 3, canonicalBudgetStaysClosed: true,
  canonicalUnusedSlotsDoNotAuthorizeExtraTiming: true,
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F020', duplicateOf: 'F086', currentDefault: current.sha, branch,
  baselineOwnerGitBlob: gitBlob(original), canonicalSource: selected, canonicalVerifiedFiles: verified.length,
  canonicalReadOnlyReplayPassed: true, newComparisons: 0, historicalPriorityStillUnverified: true }, null, 2));
