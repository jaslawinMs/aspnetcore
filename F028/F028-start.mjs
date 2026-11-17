import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F028');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F028-external-login-scheme-source';
fs.mkdirSync(run);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(run, 'executed-start.mjs'));
const calls = [];
function capture(command, args, label, allowFailure = false) {
  const started = new Date().toISOString();
  const result = spawnSync(command, args, { cwd: root, maxBuffer: 16 * 1024 * 1024 });
  fs.writeFileSync(path.join(run, `${label}.stdout`), result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(path.join(run, `${label}.stderr`), result.stderr ?? Buffer.alloc(0));
  calls.push({ command, args, workingDirectory: root, started, completed: new Date().toISOString(),
    actualExitCode: result.status, stdout: `${label}.stdout`, stderr: `${label}.stderr` });
  fs.writeFileSync(path.join(run, 'initial-actual-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  if (!allowFailure) {
    assert.equal(result.status, 0, `${label}:${result.stderr}`);
  }
  return { ...result, text: (result.stdout ?? Buffer.alloc(0)).toString().trim() };
}
const git = (args, label) => capture('git', args, label).text;
const gh = (endpoint, label) => JSON.parse(capture('gh', ['api', endpoint], label).text);
const digest = value => createHash('sha256').update(value).digest('hex').toUpperCase();
assert.equal(git(['status', '--porcelain', '--untracked-files=no'], 'initial-tracked-status'), '');
assert.deepEqual(git(['ls-files', '--others', '--exclude-standard'], 'initial-untracked').split('\n').sort(), [
  'autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
  'autoperf-scan-report.md', 'performance-antipattern-findings.md',
].sort());
const ledger = JSON.parse(fs.readFileSync(path.join(session, 'autoperf-campaign.json'), 'utf8').replace(/^\uFEFF/, ''));
const finding = ledger.candidates.find(row => row.id === 'F028');
assert.equal(finding.status, 'pending');
fs.writeFileSync(path.join(run, 'finding.json'), JSON.stringify(finding, null, 2) + '\n');
const current = gh('repos/dotnet/aspnetcore/branches/main', 'actual-current-default').commit.sha;
const exists = capture('git', ['cat-file', '-e', `${current}^{commit}`], 'current-local-probe', true);
if (exists.status !== 0) {
  git(['fetch', '--no-tags', 'origin', current], 'fetch-actual-current');
}
assert.equal(capture('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`],
  'new-local-branch-probe', true).status, 1);
assert.equal(git(['ls-remote', '--heads', 'autoperf', `refs/heads/${branch}`], 'new-fork-branch-probe'), '');
git(['switch', '--create', branch, baseline], 'create-independent-branch');
assert.equal(git(['rev-parse', 'HEAD'], 'actual-independent-parent'), baseline);
const selected = [
  'src/Identity/Core/src/SignInManager.cs',
  'src/Identity/Core/src/Microsoft.AspNetCore.Identity.csproj',
  'src/Identity/Core/src/PublicAPI.Shipped.txt',
  'src/Identity/Core/src/PublicAPI.Unshipped.txt',
  'src/Identity/test/Identity.Test/SignInManagerTest.cs',
  'src/Identity/test/Identity.Test/Microsoft.AspNetCore.Identity.Test.csproj',
  'src/Http/Authentication.Core/src/AuthenticationSchemeProvider.cs',
  'src/Http/Authentication.Core/src/Microsoft.AspNetCore.Authentication.Core.csproj',
  'src/Http/Authentication.Abstractions/src/IAuthenticationSchemeProvider.cs',
  'src/Http/Authentication.Abstractions/src/AuthenticationScheme.cs',
  'src/Http/Authentication.Abstractions/src/AuthenticationProperties.cs',
];
const context = ['global.json', 'eng/Versions.props'];
const snapshots = path.join(run, 'source-snapshots');
fs.mkdirSync(snapshots);
const parity = [];
for (const [index, file] of [...selected, ...context].entries()) {
  const before = capture('git', ['show', `${baseline}:${file}`], `snapshot-${index}-baseline`).stdout;
  const after = capture('git', ['show', `${current}:${file}`], `snapshot-${index}-current`).stdout;
  const working = fs.readFileSync(path.join(root, ...file.split('/')));
  const prefix = String(index).padStart(2, '0') + '-' + path.basename(file);
  for (const [variant, bytes] of [['baseline', before], ['current', after], ['working', working]]) {
    fs.writeFileSync(path.join(snapshots, `${prefix}.${variant}`), bytes);
  }
  parity.push({ file, core: selected.includes(file), actualBaselineBlobBytesSha256: digest(before),
    actualCurrentBlobBytesSha256: digest(after), actualWorkingBytesSha256: digest(working),
    actualBaselineAndCurrentBlobBytesEqual: before.equals(after),
    actualWorkingLfBytesMatchBaselineBlob: Buffer.from(working.toString().replaceAll('\r\n', '\n')).equals(before) });
}
const history = git(['--no-pager', 'log', '--format=%H %s', `${baseline}..${current}`, '--', ...selected],
  'selected-intervening-history');
gh(`repos/dotnet/aspnetcore/commits?path=src/Identity/Core/src/SignInManager.cs&per_page=8&sha=${current}`,
  'actual-owner-history');
gh('repos/dotnet/aspnetcore/pulls/12074', 'prior-properties-contract-pr');
for (const [label, kind, query] of [
  ['owner', 'prs', 'GetExternalLoginInfoAsync'],
  ['virtual', 'prs', 'GetExternalAuthenticationSchemesAsync'],
  ['lookup', 'issues', 'SignInManager scheme lookup'],
]) {
  capture('gh', ['search', kind, query, '--repo', 'dotnet/aspnetcore', '--limit', '10',
    '--json', 'number,title,url,state,updatedAt'], `actual-upstream-search-${label}`);
}
const acceptance = {
  candidate: 'F028', definedBeforeProductEditsOrTiming: true,
  scope: 'Investigate a guarded name-keyed lookup only for exact default SignInManager<TUser> and exact AuthenticationSchemeProvider. Every derived/custom manager or provider retains the existing virtual enumeration/filter/first-match path. No new cache or API.',
  importantCorrectionToScan: 'Default GetAllSchemesAsync returns a reused safe snapshot;it does not rebuild that snapshot per lookup. The linear scan and per-call async/iterator/predicate work remain.',
  requirements: [
    'Verify original owning tests and actual public GetExternalLoginInfoAsync output before editing product code.',
    'Preserve principal/provider key,properties/tokens and exact provider-name fallback;default null/empty display names are excluded,whitespace names retained,comparison ordinal/case-sensitive.',
    'Keep derived manager virtual sequences authoritative,including empty/custom/duplicate sequences,first-match ordering,null fallback and deliberately empty override display names.',
    'Keep custom/derived provider GetAllSchemesAsync authoritative;do not assume its keyed lookup has the same behavior. Pending completion,failure and actual virtual dispatch remain.',
    'Use current actual default-provider AddScheme/RemoveScheme behavior without caching;unknown names and later updates must not become stale.',
    'Keep all early-return paths before scheme resolution and retain exact original public signatures/defaults,one target framework and assembly boundaries.',
    'Establish a focused original resource red for exact default types versus behavior-equivalent derived fallback,then green selected;parse every actual theory row and preserve all original passing rows.',
    'Freeze actual source/PE/PDB and use one byte-identical common harness/consumer closure for original/selected. Public boundary must be actual owner and provider,not a copied lookup implementation.',
    'At most3actual timing comparisons including failed/partial attempts;preserve controls,adverse results and first-use costs. No OS/process/thread priority,affinity or power changes on this shared machine.',
    'Build/characterize a physically relocated runnable project without extending the historical comparison budget;publish only qualified actual gain and all unverified boundaries.',
  ],
  noClaims: ['No full external-provider login/browser/network,production-frequency,dedicated-machine or merge/release-readiness claim.'],
  maximumActualComparisons: 3, actualComparisonsStarted: 0,
};
fs.writeFileSync(path.join(run, 'acceptance.json'), JSON.stringify(acceptance, null, 2) + '\n');
const investigation = { candidate: 'F028', baseline, branch, actualCurrentDefault: current,
  actualRawSnapshots: parity.length * 3, actualSelectedFilePairs: selected.length, parity,
  actualSelectedInterveningHistory: history,
  actualSelectedSourceParity: parity.filter(row => row.core).every(row => row.actualBaselineAndCurrentBlobBytesEqual),
  actualNewShippingEditPerformed: false, actualTimingPerformed: false,
  codeIntelligenceLimit: 'GitHub semantic repository resolution returned404 and local C# workspace symbol lookup returned no symbols. Known source paths and actual local/Git source are used without graph-completeness claims.',
  actualInstructionScope: 'Cross-cutting source instructions/guide read;no Identity AGENTS.md found. No build props,public surface or existing IVT grant is to be changed.',
  limit: 'Selected source/history parity only,not newer-default SDK integration. Bounded searches do not prove universal absence of other work.' };
fs.writeFileSync(path.join(run, 'investigation.json'), JSON.stringify(investigation, null, 2) + '\n');
console.log(JSON.stringify({ branch, baseline, actualCurrentDefault: current,
  actualSelectedSourceParity: investigation.actualSelectedSourceParity,
  actualChangedSelectedFiles: parity.filter(row => row.core && !row.actualBaselineAndCurrentBlobBytesEqual).map(row => row.file),
  actualRawSnapshots: investigation.actualRawSnapshots, actualTimingPerformed: false }, null, 2));
