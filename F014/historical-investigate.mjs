import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const repo = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F014');
const prior = path.join(session, 'autoperf-runs', 'F011');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const acceptance = read(path.join(run, 'acceptance.json'));
const previous = read(path.join(prior, 'current-source-investigation.json'));
const output = path.join(run, 'current-source-investigation.json');
const git = (...args) => execFileSync('git', args, { cwd: repo, maxBuffer: 8 * 1024 * 1024 });
const gh = (...args) => execFileSync('gh', args, { cwd: repo, maxBuffer: 8 * 1024 * 1024 });
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const canonical = bytes => bytes.toString('utf8').replaceAll('\r\n', '\n');
const write = (relative, bytes) => {
  const file = path.join(run, relative);
  if (fs.existsSync(file)) {
    assert(fs.readFileSync(file).equals(Buffer.from(bytes)), 'Preserve actual capture: ' + relative);
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
};
assert(!fs.existsSync(output));
assert.equal(git('diff', '--name-only').toString().trim(), '');
assert.equal(git('diff', '--cached', '--name-only').toString().trim(), '');
const branch = git('branch', '--show-current').toString().trim();
assert(['autoperf/F013-signalr-targeted-membership', acceptance.branch].includes(branch));
assert.equal(git('rev-parse', 'HEAD').toString().trim(), acceptance.baseline);
if (branch !== acceptance.branch) git('switch', '-c', acceptance.branch, acceptance.baseline);
const freshBytes = gh('api', 'repos/dotnet/aspnetcore/commits/main');
const fresh = JSON.parse(freshBytes);
write('investigation/fresh-current-default.json', freshBytes);
assert.match(fresh.sha, /^[0-9a-f]{40}$/);
git('cat-file', '-e', fresh.sha + '^{commit}');
const selected = [
  ...previous.sources.filter(row => row.file.startsWith('src\\SignalR\\') || row.file.startsWith('src\\Servers\\')).map(row => row.file),
  'src\\SignalR\\server\\Core\\src\\DefaultUserIdProvider.cs',
  'src\\SignalR\\server\\Core\\src\\IUserIdProvider.cs',
  'src\\Servers\\Connections.Abstractions\\src\\Features\\IConnectionUserFeature.cs',
];
const sources = selected.map(file => {
    const gitPath = file.replaceAll('\\', '/');
    const baseline = git('show', `${acceptance.baseline}:${gitPath}`);
    const current = git('show', `${fresh.sha}:${gitPath}`);
    const working = fs.readFileSync(path.join(repo, file));
    write(path.join('baseline-canonical', file), baseline);
    write(path.join('current-default-canonical', file), current);
    write(path.join('producer-source', file), working);
    assert.equal(canonical(baseline), canonical(working), 'Independent baseline source: ' + file);
    return {
      file, baselineSha256: hash(baseline), currentDefaultSha256: hash(current), workingSha256: hash(working),
      canonicalEqual: canonical(baseline) === canonical(current),
    };
  });
assert.equal(sources.length, 23);
assert(sources.find(row => row.file.endsWith('\\DefaultHubLifetimeManager.cs')).canonicalEqual);
assert.deepEqual(sources.filter(row => !row.canonicalEqual).map(row => row.file),
  ['src\\SignalR\\common\\Protocols.Json\\src\\Protocol\\JsonHubProtocol.cs']);
assert.equal(fresh.sha, previous.currentDefault, 'Investigate a new current producer before borrowing previously compiled bytes.');
write('investigation/selected-source-delta.patch',
  git('--no-pager', 'diff', acceptance.baseline, fresh.sha, '--', ...sources.map(row => row.file.replaceAll('\\', '/'))));
write('investigation/owner-history.json', gh('api',
  `repos/dotnet/aspnetcore/commits?sha=${fresh.sha}&path=src/SignalR/server/Core/src/DefaultHubLifetimeManager.cs&per_page=5`));
write('investigation/provider-history.json', gh('api',
  `repos/dotnet/aspnetcore/commits?sha=${fresh.sha}&path=src/SignalR/server/Core/src/DefaultUserIdProvider.cs&per_page=3`));
write('investigation/context-history.json', gh('api',
  `repos/dotnet/aspnetcore/commits?sha=${fresh.sha}&path=src/SignalR/server/Core/src/HubConnectionContext.cs&per_page=3`));
write('investigation/open-exact-symbol-pr-search.json', gh('search', 'prs', 'SendUsersAsync repo:dotnet/aspnetcore',
  '--state', 'open', '--limit', '20', '--json', 'number,title,url,author,updatedAt'));
const borrowed = [];
for (const name of ['related-pr-69189.json', 'related-pr-69189.patch', 'related-pr-69189-readable.txt']) {
  const bytes = fs.readFileSync(path.join(prior, 'investigation', name));
  write(path.join('investigation', name), bytes);
  borrowed.push({ source: `F011/investigation/${name}`, destination: `investigation/${name}`, sha256: hash(bytes) });
}
write('investigation/prior-art-attribution.json', JSON.stringify({
  candidate: 'F014', priorF011EvidenceIsNotUserSendBehaviorProof: true,
  originalAndCapturedDefaultRevisionsUnchanged: true, files: borrowed,
  qualifiedReuse: 'Actual prior merged PR metadata/full diff/body reused with exact hashes; fresh default, owner history and open exact-symbol search captured independently. No upstream or F011 timing reused.',
}, null, 2) + '\n');
for (const file of ['.github\\instructions\\cross-cutting-guidance.instructions.md', '.github\\instructions\\build.instructions.md',
  'docs\\CrossCuttingGuidance.md', 'docs\\BuildFromSource.md']) {
  write(path.join('investigation', 'guidance', file), fs.readFileSync(path.join(repo, file)));
}
const context = ['global.json', 'eng\\Versions.props', 'Directory.Build.props', 'Directory.Build.targets'].map(file => {
  const gitPath = file.replaceAll('\\', '/');
  const baseline = git('show', `${acceptance.baseline}:${gitPath}`);
  const current = git('show', `${fresh.sha}:${gitPath}`);
  write(path.join('investigation', 'sdk-context', 'baseline', file), baseline);
  write(path.join('investigation', 'sdk-context', 'captured-default', file), current);
  return { file, baselineSha256: hash(baseline), capturedDefaultSha256: hash(current), equal: baseline.equals(current) };
});
write('investigation/borrowed-original-evidence-plan.json', JSON.stringify({
  candidate: 'F014', sourceCandidateCount: 0,
  priorOriginalOwnerDllSha256: read(path.join(prior, 'manifest-original.json')).ownerDllSha256,
  priorOriginalTests: 'F011/tests/original; all27 historical rows passed with identical owner/source/SDK. Explicit old preparation evidence only, not a fresh F014 suite; any selected compatible candidate requires fresh focused owning tests and actual user-send producer controls.',
  currentProducer: 'F011 captured-default JSON DLL/PDB may be reused only after rehashing source/bytes and rerunning every actual F014 user-send probe. This does not reuse F011/F012/F013 observations or timing.',
  untimedOwningTestRerunPlanned: false,
}, null, 2) + '\n');
write('current-source-investigation.json', JSON.stringify({
  candidate: 'F014', baseline: acceptance.baseline, branch: acceptance.branch,
  currentDefault: fresh.sha, capturedAt: new Date().toISOString(), sources, sdkContext: context,
  differingSelectedSources: sources.filter(row => !row.canonicalEqual).map(row => row.file),
  sourceCandidateSelected: false, wholeCurrentDefaultSdkIntegration: false,
  relatedWork: { number: 69189, subject: 'Actual owner diff optimizes SendConnectionsAsync, not the independent SendUsersAsync user-identifier scan. No upstream or prior group/broadcast/connection timing reused.', measurementsReused: false },
  unavailableNavigation: [
    'Known user-send owner, actual DefaultUserIdProvider/public user features and shared SendToAllConnections body read directly. LSP returned no workspace symbols for provider/feature; no complete caller/dispatch graph claim.',
    'Prior GitHub semantic search returned HTTP404; Azure One configured index is not this GitHub repository. No complete-caller/absence claim.',
  ],
  scopedSignalRAgentsDiscovery: 'Prior scoped SignalR discovery returned no area AGENTS; same baseline tree.',
  workingTreeStatus: git('status', '--short').toString(),
}, null, 2) + '\n');
console.log(`F014 independent branch ready: ${sources.length} actual source triples; real JSON delta retained, fresh default ${fresh.sha}. No candidate or timing.`);
