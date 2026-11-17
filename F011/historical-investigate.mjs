import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const session = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const repo = 'C:\\src\\aspnetcore';
const run = path.join(session, 'autoperf-runs', 'F011');
const acceptance = JSON.parse(fs.readFileSync(path.join(run, 'acceptance.json'), 'utf8'));
const fresh = JSON.parse(fs.readFileSync(path.join(run, 'investigation', 'fresh-current-default.json'), 'utf8'));
const output = path.join(run, 'current-source-investigation.json');
const require = (condition, message) => { if (!condition) throw new Error(message); };
const git = (...args) => execFileSync('git', args, { cwd: repo, maxBuffer: 8 * 1024 * 1024 });
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const canonical = bytes => bytes.toString('utf8').replace(/\r\n/g, '\n');
const write = (file, bytes) => {
  if (fs.existsSync(file)) {
    require(fs.readFileSync(file).equals(Buffer.from(bytes)), 'Existing capture differs: ' + file);
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
};

require(!fs.existsSync(output), 'Preserve original investigation.');
require(git('diff', '--name-only').toString().trim() === '', 'Tracked source must be clean.');
require(git('diff', '--cached', '--name-only').toString().trim() === '', 'Index must be clean.');
const branch = git('branch', '--show-current').toString().trim();
if (branch !== acceptance.branch) {
  require(branch === 'autoperf/F010-claims-allowed-values-membership', 'Unexpected source branch.');
  require(git('rev-parse', 'HEAD').toString().trim() === 'b39b6c0b6675cebb012edd9623874d5ac6e51340',
    'Unexpected completed F010 source identity.');
  git('switch', '-c', acceptance.branch, acceptance.baseline);
}
require(git('rev-parse', 'HEAD').toString().trim() === acceptance.baseline, 'Independent baseline required.');
require(/^[0-9a-f]{40}$/.test(fresh.sha), 'Actual captured default identity required.');
git('cat-file', '-e', fresh.sha + '^{commit}');

const files = [
  'src\\SignalR\\server\\Core\\src\\DefaultHubLifetimeManager.cs',
  'src\\SignalR\\server\\Core\\src\\HubLifetimeManager.cs',
  'src\\SignalR\\server\\Core\\src\\HubConnectionContext.cs',
  'src\\SignalR\\server\\Core\\src\\HubConnectionContextOptions.cs',
  'src\\SignalR\\server\\Core\\src\\HubConnectionStore.cs',
  'src\\SignalR\\server\\Core\\src\\Internal\\HubGroupList.cs',
  'src\\SignalR\\server\\Core\\src\\SerializedHubMessage.cs',
  'src\\SignalR\\server\\Core\\src\\Microsoft.AspNetCore.SignalR.Core.csproj',
  'src\\SignalR\\server\\SignalR\\test\\Microsoft.AspNetCore.SignalR.Tests\\DefaultHubLifetimeManagerTests.cs',
  'src\\SignalR\\server\\SignalR\\test\\Microsoft.AspNetCore.SignalR.Tests\\Microsoft.AspNetCore.SignalR.Tests.csproj',
  'src\\SignalR\\server\\Specification.Tests\\src\\HubLifetimeManagerTestBase.cs',
  'src\\SignalR\\common\\SignalR.Common\\src\\Protocol\\IHubProtocol.cs',
  'src\\SignalR\\common\\Protocols.Json\\src\\Protocol\\JsonHubProtocol.cs',
  'src\\SignalR\\common\\Protocols.Json\\src\\Microsoft.AspNetCore.SignalR.Protocols.Json.csproj',
  'src\\Servers\\Connections.Abstractions\\src\\DefaultConnectionContext.cs',
  'src\\SignalR\\perf\\Microbenchmarks\\DefaultHubLifetimeManagerBenchmark.cs',
  'src\\SignalR\\perf\\Microbenchmarks\\SendConnectionsBenchmark.cs',
  'src\\SignalR\\perf\\Microbenchmarks\\Shared\\TestPipeWriter.cs',
  'src\\SignalR\\perf\\Microbenchmarks\\Microsoft.AspNetCore.SignalR.Microbenchmarks.csproj',
  'src\\SignalR\\build.cmd',
  'src\\Security\\Authorization\\Core\\src\\ClaimsAuthorizationRequirement.cs'
];
const sources = files.map(file => {
  const gitPath = file.replaceAll('\\', '/');
  const baseline = git('show', `${acceptance.baseline}:${gitPath}`);
  const current = git('show', `${fresh.sha}:${gitPath}`);
  const working = fs.readFileSync(path.join(repo, file));
  write(path.join(run, 'baseline-canonical', file), baseline);
  write(path.join(run, 'current-default-canonical', file), current);
  write(path.join(run, 'producer-source', file), working);
  const canonicalEqual = canonical(baseline) === canonical(current) && canonical(baseline) === canonical(working);
  require(canonical(baseline) === canonical(working), 'Working source differs from independent baseline: ' + file);
  return {
    file, baselineSha256: hash(baseline), currentDefaultSha256: hash(current),
    workingSha256: hash(working), canonicalEqual
  };
});
require(sources.find(source => source.file.endsWith('\\DefaultHubLifetimeManager.cs')).canonicalEqual,
  'Target owner changed on captured default; investigate before proceeding.');
write(path.join(run, 'investigation', 'selected-source-delta.patch'),
  git('--no-pager', 'diff', acceptance.baseline, fresh.sha, '--', ...files.map(file => file.replaceAll('\\', '/'))));

for (const file of [
  '.github\\instructions\\cross-cutting-guidance.instructions.md',
  'docs\\CrossCuttingGuidance.md',
  'docs\\BuildFromSource.md'
]) {
  write(path.join(run, 'investigation', 'guidance', file), fs.readFileSync(path.join(repo, file)));
}
const contextFiles = ['global.json', 'eng\\Versions.props', 'Directory.Build.props', 'Directory.Build.targets'];
const context = contextFiles.map(file => {
  const gitPath = file.replaceAll('\\', '/');
  const baseline = git('show', `${acceptance.baseline}:${gitPath}`);
  const current = git('show', `${fresh.sha}:${gitPath}`);
  write(path.join(run, 'investigation', 'sdk-context', 'baseline', file), baseline);
  write(path.join(run, 'investigation', 'sdk-context', 'captured-default', file), current);
  return { file, baselineSha256: hash(baseline), capturedDefaultSha256: hash(current), equal: baseline.equals(current) };
});
const related = JSON.parse(fs.readFileSync(path.join(run, 'investigation', 'related-pr-69189.json'), 'utf8'));
write(path.join(run, 'investigation', 'related-pr-69189-readable.txt'), related.body);
write(output, JSON.stringify({
  candidate: 'F011', baseline: acceptance.baseline, branch: acceptance.branch,
  currentDefault: fresh.sha, capturedAt: new Date().toISOString(), sources, sdkContext: context,
  differingSelectedSources: sources.filter(source => !source.canonicalEqual).map(source => source.file),
  sourceCandidateSelected: false, wholeCurrentDefaultSdkIntegration: false,
  relatedWork: {
    number: 69189, author: related.author, subject: 'Actual owner diff changes SendConnectionsAsync, not SendGroupExceptAsync.',
    measurementsReused: false
  },
  unavailableNavigation: [
    'GitHub repository semantic code search returned HTTP404 during the preceding F011 investigation.',
    'C# document symbols resolved the known owner; cross-file group-store lookup did not resolve. No absence or complete-caller claim follows.'
  ],
  scopedSignalRAgentsDiscovery: 'No matching SignalR AGENTS.md was returned by the prior scoped discovery.',
  workingTreeStatus: git('status', '--short').toString()
}, null, 2) + '\n');
console.log(`F011 independent baseline ready; ${sources.length} source triples captured; ` +
  `${sources.filter(source => !source.canonicalEqual).length} selected baseline/default differences retained for investigation.`);
