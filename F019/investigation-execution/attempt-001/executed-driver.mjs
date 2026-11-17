import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = 'C:\\src\\aspnetcore';
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F019-layoutview-parent-cache';
const run = path.join(session, 'autoperf-runs', 'F019');
const execution = path.join(run, 'investigation-execution', 'attempt-001');
const ledger = JSON.parse(fs.readFileSync(path.join(session, 'autoperf-campaign.json'), 'utf8'));
const candidate = ledger.candidates.filter(entry => entry.id === 'F019');
const preceding = JSON.parse(fs.readFileSync(path.join(session, 'autoperf-published-results', 'F018', 'publication.json'), 'utf8'));
if (fs.existsSync(run) || candidate.length !== 1 || candidate[0].status !== 'pending' ||
  preceding.campaign_finalized !== 102 || preceding.actual_draft !== true ||
  JSON.parse(fs.readFileSync(path.join(session, 'F018-receipt-blob-verification.json'), 'utf8')).length !== 1163) {
  throw new Error('Fresh pending F019 and persistently verified preceding F018 publication required.');
}
fs.mkdirSync(execution, { recursive: true });
fs.copyFileSync(new URL(import.meta.url), path.join(execution, 'executed-driver.mjs'));
fs.writeFileSync(path.join(run, 'inventory.json'), JSON.stringify(candidate[0], null, 2) + '\n', { flag: 'wx' });
let sequence = 0;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
function command(label, executable, args, allowFailure = false) {
  const stem = path.join(execution, `${String(++sequence).padStart(3, '0')}-${label}`);
  const started = new Date().toISOString();
  const result = spawnSync(executable, args, { cwd: root, encoding: null, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
  fs.writeFileSync(stem + '.stdout', result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(stem + '.stderr', result.stderr ?? Buffer.alloc(0));
  fs.writeFileSync(stem + '.json', JSON.stringify({
    executable, arguments: args, workingDirectory: root, started, completed: new Date().toISOString(),
    actualExitCode: result.status, signal: result.signal, spawnError: result.error?.message ?? null,
    deliberateNonzeroProbePermitted: allowFailure,
  }, null, 2) + '\n');
  if ((result.error || result.status !== 0) && !allowFailure) {
    throw new Error('Actual investigation failed; preserve ' + stem);
  }

  return result;
}
const text = result => result.stdout.toString('utf8').trim();
if (text(command('head', 'git', ['rev-parse', 'HEAD'])) !== preceding.source_commit ||
  text(command('preceding-branch', 'git', ['branch', '--show-current'])) !== preceding.source_branch ||
  text(command('tracked-status', 'git', ['status', '--porcelain', '--untracked-files=no']))) {
  throw new Error('Do not disturb a different or dirty source checkout.');
}
const status = text(command('complete-status', 'git', ['status', '--porcelain']));
const expectedReports = ['autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
  'autoperf-scan-report.md', 'performance-antipattern-findings.md'].map(name => '?? ' + name).sort();
if (JSON.stringify(status.split(/\r?\n/).sort()) !== JSON.stringify(expectedReports)) {
  throw new Error('Preserve unexpected source checkout changes without switching.');
}
command('independent-branch', 'git', ['switch', '-c', branch, baseline]);
const current = JSON.parse(command('fresh-default', 'gh', ['api', 'repos/dotnet/aspnetcore/commits/main']).stdout);
const present = command('default-object-check', 'git', ['cat-file', '-e', `${current.sha}^{commit}`], true);
if (present.status !== 0) {
  command('fetch-default', 'git', ['fetch', '--no-tags', 'origin', 'main']);
}
for (const [label, file] of [
  ['owner-history', 'src/Components/Components/src/LayoutView.cs'],
  ['owning-test-history', 'src/Components/Components/test/LayoutViewTest.cs'],
  ['hot-reload-owner-history', 'src/Components/Shared/src/HotReloadManager.cs'],
]) {
  command(label, 'gh', ['api', '-X', 'GET', 'repos/dotnet/aspnetcore/commits', '-f', `sha=${current.sha}`,
    '-f', `path=${file}`, '-f', 'per_page=6']);
}
for (const [label, query] of [
  ['open-owner-pr-search', 'LayoutView'],
  ['open-layout-cache-pr-search', 'layout cache'],
  ['open-parent-lookup-pr-search', 'GetParentLayoutType'],
]) {
  command(label, 'gh', ['search', 'prs', query, '--repo', 'dotnet/aspnetcore', '--state', 'open',
    '--limit', '40', '--json', 'number,title,url,updatedAt']);
}
const files = [
  'src\\Components\\Components\\src\\LayoutView.cs',
  'src\\Components\\Components\\src\\LayoutAttribute.cs',
  'src\\Components\\Components\\src\\LayoutComponentBase.cs',
  'src\\Components\\Components\\src\\RouteView.cs',
  'src\\Components\\Components\\src\\RenderTree\\Renderer.cs',
  'src\\Components\\Shared\\src\\HotReloadManager.cs',
  'src\\Components\\Components\\test\\LayoutViewTest.cs',
  'src\\Components\\Components\\src\\Microsoft.AspNetCore.Components.csproj',
  'src\\Components\\Components\\test\\Microsoft.AspNetCore.Components.Tests.csproj',
  'src\\Components\\Components\\src\\PublicAPI.Shipped.txt',
  'src\\Components\\Components\\src\\PublicAPI.Unshipped.txt',
  'Directory.Build.props',
  'eng\\Versions.props',
  '.editorconfig',
  'src\\Components\\AGENTS.md',
  '.github\\instructions\\components.instructions.md',
  'docs\\BlazorComponentsGuidance.md',
  'docs\\CrossCuttingGuidance.md',
  'docs\\BuildFromSource.md',
];
const triples = [];
for (const [index, relative] of files.entries()) {
  const gitPath = relative.replaceAll('\\', '/');
  const roles = {};
  for (const [role, revision] of [['baseline', baseline], ['current-default', current.sha]]) {
    const bytes = command(`source-${String(index).padStart(2, '0')}-${role}`, 'git', ['show', `${revision}:${gitPath}`]).stdout;
    const destination = path.join(run, 'sources', role, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes, { flag: 'wx' });
    const gitBlob = text(command(`blob-${String(index).padStart(2, '0')}-${role}`, 'git', ['rev-parse', `${revision}:${gitPath}`]));
    roles[role] = { revision, sha256: hash(bytes), bytes: bytes.length, gitBlob };
  }
  const absolute = path.join(root, relative);
  const bytes = fs.readFileSync(absolute);
  const destination = path.join(run, 'sources', 'working', relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes, { flag: 'wx' });
  const canonicalGitBlob = text(command(`canonical-working-${String(index).padStart(2, '0')}`, 'git', ['hash-object', `--path=${gitPath}`, absolute]));
  roles.working = { sha256: hash(bytes), bytes: bytes.length, canonicalGitBlob };
  triples.push({ path: relative, roles, workingMatchesBaselineCanonicalBlob: canonicalGitBlob === roles.baseline.gitBlob,
    currentDefaultMatchesBaselineCanonicalBlob: roles['current-default'].gitBlob === roles.baseline.gitBlob });
}
if (triples.some(entry => !entry.workingMatchesBaselineCanonicalBlob)) {
  throw new Error('Actual working source differs from the independent original.');
}
const owner = fs.readFileSync(path.join(run, 'sources', 'current-default', files[0]), 'utf8');
if (!owner.includes('type.GetCustomAttribute<LayoutAttribute>()?.LayoutType') ||
  !owner.includes('layoutType = GetParentLayoutType(layoutType);')) {
  throw new Error('Captured current default no longer has the original parent-layout reflection seam.');
}
fs.writeFileSync(path.join(run, 'investigation.json'), JSON.stringify({
  candidate: 'F019', baseline, capturedDefault: current.sha, defaultCommittedAt: current.commit.committer.date,
  independentBranch: branch, sourceTripleCount: triples.length, sourceTriples: triples,
  checkedActualDefaultNotJustCampaignSnapshot: true, shippingSourceCandidateCreated: false,
  currentDefaultUncachedLayoutParentSeamVerified: true,
  originalFindingQualification: 'LayoutView parameter-triggered rendering,not every child render or every HTTP request. Production layout depth/frequency is unestablished. Metadata is not immutable under Hot Reload.',
  applicableWorkflow: 'Canonical Components sample/browser validation before product edits and permanent tests;real metadata delta must apply without restart,not just direct cache/event injection. Existing RouteView cache is prior art,not F019 measurement.',
  codeIntelligenceBoundary: 'GitHub semantic repository resolution returned404;local CSharp workspaceSymbol returned no LayoutView symbols;configured Azure code index targets msazure/One,not this GitHub checkout. Bounded actual local source fallback used.',
  capturedAt: new Date().toISOString(),
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F019', sourceTriples: triples.length, baseline, capturedDefault: current.sha, branch,
  changedOnDefault: triples.filter(entry => !entry.currentDefaultMatchesBaselineCanonicalBlob).map(entry => entry.path) }, null, 2));
