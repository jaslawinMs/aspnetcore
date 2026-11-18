import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const root = String.raw`C:\src\aspnetcore`;
const currentDefaultRoot = String.raw`C:\src\autoperf-F042-default`;
const runRoot = path.join(session, 'autoperf-runs', 'F043');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const expectedDefault = 'c5baf473f31fa3bbe9f8201e3411361c632f3a91';
const expectedPrevious = '737aae8c1a3de33f7474a2e19a26cb1b567f5290';
const branch = 'autoperf/F043-razor-section-try-add';
const selected = [
  String.raw`src\Mvc\Mvc.Razor\src\RazorPage.cs`,
  String.raw`src\Mvc\Mvc.Razor\src\RazorPageBase.cs`,
  String.raw`src\Mvc\Mvc.Razor\src\RazorView.cs`,
  String.raw`src\Mvc\Mvc.Razor\src\IRazorPage.cs`,
  String.raw`src\Mvc\Mvc.Razor\src\Microsoft.AspNetCore.Mvc.Razor.csproj`,
  String.raw`src\Mvc\Mvc.Razor\test\RazorPageTest.cs`,
  String.raw`src\Mvc\Mvc.Razor\test\Microsoft.AspNetCore.Mvc.Razor.Test.csproj`
];
function require(condition, message) {
  if (!condition) throw new Error(message);
}
function sha(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
}
require(!fs.existsSync(runRoot), 'F043 already has an intake; do not overwrite historical work.');
fs.mkdirSync(path.join(runRoot, 'intake'), { recursive: true });
function write(name, value) {
  fs.writeFileSync(path.join(runRoot, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
function invoke(label, executable, args, cwd = root) {
  if (executable === 'git') args = ['-c', 'core.longpaths=true', ...args];
  const startedAt = new Date().toISOString();
  const result = spawnSync(executable, args, {
    cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024
  });
  const record = {
    executable, arguments: args, cwd, startedAt, completedAt: new Date().toISOString(),
    exitCode: result.status, signal: result.signal,
    launchError: result.error?.message ?? null,
    stdout: result.stdout ?? '', stderr: result.stderr ?? ''
  };
  write(path.join('intake', label + '.json'), record);
  require(result.status === 0 && !result.error, `${label} failed; see retained command record.`);
  return record.stdout.trim();
}
const ledger = JSON.parse(fs.readFileSync(path.join(session, 'autoperf-campaign.json'), 'utf8').replace(/^\uFEFF/, ''));
const entry = ledger.candidates.filter(item => item.id === 'F043');
require(entry.length === 1 && ['pending', 'investigating'].includes(entry[0].status), 'Require the unresolved exact stable F043 entry.');
write('finding.json', entry[0]);
const planBytes = fs.readFileSync(path.join(session, 'F043-acceptance-plan.json'));
const plan = JSON.parse(planBytes);
require(plan.candidate === 'F043' && plan.profiles.length === 6 && plan.primary.profile === 'Two', 'Require the declared primary plan.');
fs.writeFileSync(path.join(runRoot, 'acceptance-plan.json'), planBytes, { flag: 'wx' });
require(invoke('primary-head-before', 'git', ['rev-parse', 'HEAD']) === expectedPrevious, 'Unexpected primary starting commit.');
require(invoke('primary-tracked-status-before', 'git', ['status', '--porcelain', '--untracked-files=no']) === '', 'Do not switch a dirty tracked tree.');
const untrackedBefore = invoke('primary-untracked-status-before', 'git', ['status', '--porcelain', '--untracked-files=all']);
const protectedPaths = [
  'global.json', 'autoperf-issue-70219-deduplicated-report.html',
  'autoperf-issue-70219-duplicate-report.html', 'autoperf-scan-report.md',
  'performance-antipattern-findings.md'
];
const protectedFiles = protectedPaths.map(relative => ({ path: relative, sha256: sha(fs.readFileSync(path.join(root, relative))) }));
require(protectedFiles[0].sha256 === 'C3D6E7C29D94C34B6343D4A2EFE74164929F29BFA26FD84B5E2020A15091CD53', 'Protected primary SDK pin changed.');
const remoteDefault = JSON.parse(invoke('fresh-upstream-main', 'gh', ['api', 'repos/dotnet/aspnetcore/branches/main']));
require(remoteDefault.commit.sha === expectedDefault, 'Upstream moved; re-evaluate before using the named current-default worktree.');
require(invoke('current-default-head', 'git', ['rev-parse', 'HEAD'], currentDefaultRoot) === expectedDefault, 'Wrong detached current-default revision.');
require(invoke('current-default-tracked-status', 'git', ['status', '--porcelain', '--untracked-files=no'], currentDefaultRoot) === '', 'Current-default tracked sources are dirty.');
const originalTree = invoke('baseline-razor-tree', 'git', ['rev-parse', `${baseline}:src/Mvc/Mvc.Razor`]);
const defaultTree = invoke('default-razor-tree', 'git', ['rev-parse', `${expectedDefault}:src/Mvc/Mvc.Razor`]);
require(originalTree === defaultTree, 'MVC Razor area source is not equivalent to current default; investigate instead.');
invoke('current-default-scoped-history', 'git', [
  '--no-pager', 'log', '-8', '--format=%H %ad %s', '--date=iso-strict',
  expectedDefault, '--', selected[0], selected[1]
]);
invoke('section-override-follow-history', 'git', [
  '--no-pager', 'log', '--follow', '-S', 'override void DefineSection',
  '--format=%H %ad %s', '--date=iso-strict', '--name-status', expectedDefault, '--', selected[0]
]);
invoke('upstream-define-section-issues', 'gh', [
  'issue', 'list', '--repo', 'dotnet/aspnetcore', '--state', 'all',
  '--search', '"DefineSection" in:title,body', '--limit', '15', '--json', 'number,title,url,state'
]);
invoke('upstream-try-add-pr-search', 'gh', [
  'pr', 'list', '--repo', 'dotnet/aspnetcore', '--state', 'all',
  '--search', '"DefineSection" "TryAdd"', '--limit', '15', '--json', 'number,title,url,state'
]);
const relatedPr = JSON.parse(invoke('upstream70128', 'gh', [
  'pr', 'view', '70128', '--repo', 'dotnet/aspnetcore',
  '--json', 'number,title,body,author,state,headRefOid,baseRefOid,url'
]));
const relatedFiles = JSON.parse(invoke('upstream70128-files', 'gh', [
  'api', '--paginate', '--slurp', 'repos/dotnet/aspnetcore/pulls/70128/files'
])).flat();
require(relatedFiles.length === 5 && relatedFiles.every(file => typeof file.patch === 'string'), 'Require the actual complete known related PR file patches.');
const razorRelated = relatedFiles.find(file => file.filename === 'src/Mvc/Mvc.Razor/src/RazorPage.cs');
require(razorRelated && !razorRelated.patch.includes('DefineSection'), 'Known related PR touches registration; re-evaluate overlap.');
write('research.json', {
  recordedAt: new Date().toISOString(),
  candidate: 'F043', root, currentDefaultRoot, baseline, currentDefault: expectedDefault,
  canonicalWholeRazorAreaTreeIdentical: originalTree,
  actualBuildOrRuntimeEquivalenceEstablishedByThisIntake: false,
  knownStoreInvariant: 'RazorPageBase is non-partial; its sole readonly _sectionWriters initializer creates an ordinal-ignore-case Dictionary. Its non-virtual get-only SectionWriters returns that field. C# LSP found only the initializer and getter references. No supported setter or virtual replacement exists.',
  publicContract: 'The existing IDictionary<string, RenderAsyncDelegate> return type and public override remain unchanged; no new API or framework assembly-boundary mechanism is proposed.',
  lookupCaveatToValidateUntimed: 'Do not credit IDictionary extension TryAdd with a single lookup. Adjacent target-runtime counting-comparer diagnostics must be labelled BCL diagnostics, not instrumented production Razor dictionary counts.',
  firstRegistrationCaveat: 'The fresh unallocated dictionary first-registration path need not hash during ContainsKey; measure and publish One rather than presume every registration saves a hash.',
  separateFinding: 'F044 remains pending and targets the separate RazorPageBase implementation; this proposal must not modify it.',
  relatedWork: {
    number: relatedPr.number, url: relatedPr.url, head: relatedPr.headRefOid,
    disposition: 'Related, not the same optimization. Actual five-file patches change lazy per-page collections, layout bookkeeping and benchmarking, not DefineSection. Do not copy or claim those savings.',
    reviewedPatches: relatedFiles.map(file => file.filename),
    completenessLimit: 'Bounded metadata searches and the complete named PR file patches are not a proof that no other upstream PR exists.'
  },
  documentation: {
    url: 'https://learn.microsoft.com/en-us/aspnet/core/mvc/views/layout?view=aspnetcore-10.0#sections',
    observedDocsCommit: '3693f2731062e678620df08e9c029c1acada66db',
    relevantContract: 'Content pages define sections for their immediate layout. The view engine requires each body and section to be rendered or explicitly ignored.',
    readVia: 'web_fetch before implementation; no third-party article content republished'
  },
  scopeOfPlannedValidation: 'SDK-compiled real section registration plus the actual managed RazorView transfer/buffering/output boundary, not a hosted application or browser.',
  settings: 'Shared environment; no process-priority, thread-priority, affinity, power or unrelated-process modifications.',
  acceptancePlanSha256: sha(planBytes),
  noShippingChangesAtIntake: true
});
write('diagnostic-budget.json', {
  candidate: 'F043', maximumSourceComparisons: 3, consumed: 0, completed: 0,
  state: 'declared-before-shipping-implementation-and-timing', closed: false,
  authorizations: [], standaloneOriginalTimingAllowed: false,
  failedOrPartialTimedAuthorizationsCountAgainstMaximum: true,
  createdAt: new Date().toISOString(), acceptancePlanSha256: sha(planBytes)
});
const sourceFiles = selected.map(relative => {
  const original = fs.readFileSync(path.join(root, relative));
  const current = fs.readFileSync(path.join(currentDefaultRoot, relative));
  require(sha(original) === sha(current), `Physical original/default source differs: ${relative}`);
  return { path: relative, sha256: sha(original), bytes: original.length,
    pdbDocumentRequired: selected.slice(0, 3).includes(relative) };
});
write('intake-source-inputs.json', { candidate: 'F043', sourceFiles });
invoke('create-independent-source-branch', 'git', ['switch', '-c', branch, baseline]);
require(invoke('independent-source-head', 'git', ['rev-parse', 'HEAD']) === baseline, 'The independent branch inherited another candidate.');
require(invoke('independent-source-branch', 'git', ['branch', '--show-current']) === branch, 'Wrong independent branch.');
require(invoke('independent-source-tracked-status', 'git', ['status', '--porcelain', '--untracked-files=no']) === '', 'Unexpected tracked changes after branch creation.');
require(invoke('untracked-status-after', 'git', ['status', '--porcelain', '--untracked-files=all']) === untrackedBefore, 'Untracked user reports changed.');
for (const file of protectedFiles) require(sha(fs.readFileSync(path.join(root, file.path))) === file.sha256, `Protected file changed: ${file.path}`);
write('intake-completed.json', {
  candidate: 'F043', completedAt: new Date().toISOString(), branch, head: baseline,
  previousCandidateCommittedAndPreserved: expectedPrevious, sourceFiles: sourceFiles.length,
  noShippingChanges: true, sourceComparisonsConsumed: 0, protectedFiles,
  nextGate: 'Build actual current-default owner and pass faithful untimed characterization before any shipping edit.'
});
console.log(JSON.stringify({ candidate: 'F043', intake: 'passed', branch, head: baseline, sourceInputs: sourceFiles.length, comparisonsConsumed: 0 }, null, 2));
