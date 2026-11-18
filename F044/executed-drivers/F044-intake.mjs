import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F044');
const root = String.raw`C:\src\aspnetcore`;
const current = String.raw`C:\src\autoperf-F042-default`;
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const defaultHead = '31c15331c03714b7a602e1817e65881474c29e2e';
const branch = 'autoperf/F044-razor-base-section-try-add';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
assert.equal(fs.existsSync(path.join(run, 'intake-completed.json')), false);
const invocations = [];
function execute(executable, args, cwd = root) {
  const result = spawnSync(executable, args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  invocations.push({ executable, arguments: args, cwd, exitCode: result.status, stdout: result.stdout, stderr: result.stderr });
  fs.writeFileSync(path.join(run, 'intake-invocations.json'), JSON.stringify(invocations, null, 2) + '\n');
  assert.equal(result.status, 0, `${executable} ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
}
const git = (args, cwd = root) => execute('git', ['-c', 'core.longpaths=true', ...args], cwd);
function write(file, value) {
  fs.writeFileSync(path.join(run, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
const priorBudget = path.join(session, 'autoperf-runs', 'F043', 'diagnostic-budget.json');
assert.equal(sha(fs.readFileSync(priorBudget)), 'FC4E64AD84EF421F8EB317A82B01F870EB316FD6CFD05667C5503284E3DFFB0E');
assert.equal(read(path.join(session, 'autoperf-campaign.json')).candidates.find(item => item.id === 'F044').status, 'pending');
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
assert.equal(git(['rev-parse', 'HEAD']), 'c486eef54e98f8e982509480019cd55490287193');
assert.equal(git(['status', '--porcelain', '--untracked-files=no'], current), '');
assert.equal(git(['rev-parse', 'HEAD'], current), 'c5baf473f31fa3bbe9f8201e3411361c632f3a91');
assert.equal(git(['rev-parse', 'refs/remotes/origin/main']), defaultHead);
assert.match(git(['remote', 'get-url', 'origin']), /github\.com[:/]dotnet\/aspnetcore/i);
assert.match(git(['remote', 'get-url', 'autoperf']), /github\.com[:/]jaslawinms\/aspnetcore/i);
const sourceInputs = [
  ['src\\Mvc\\Mvc.Razor\\src\\RazorPage.cs', true],
  ['src\\Mvc\\Mvc.Razor\\src\\RazorPageBase.cs', true],
  ['src\\Mvc\\Mvc.Razor\\src\\RazorView.cs', true],
  ['src\\Mvc\\Mvc.Razor\\src\\IRazorPage.cs', false],
  ['src\\Mvc\\Mvc.Razor\\src\\Microsoft.AspNetCore.Mvc.Razor.csproj', false],
  ['src\\Mvc\\Mvc.Razor\\test\\RazorPageTest.cs', false],
  ['src\\Mvc\\Mvc.Razor\\test\\Microsoft.AspNetCore.Mvc.Razor.Test.csproj', false]
].map(([file, pdbDocumentRequired]) => ({ path: file, pdbDocumentRequired }));
const originalPin = sha(fs.readFileSync(path.join(root, 'global.json')));
const previousDefaultPin = sha(fs.readFileSync(path.join(current, 'global.json')));
const originalArea = git(['rev-parse', baseline + ':src/Mvc/Mvc.Razor']);
const defaultArea = git(['rev-parse', defaultHead + ':src/Mvc/Mvc.Razor']);
assert.equal(originalArea, defaultArea);
git(['switch', '-c', branch, baseline]);
git(['switch', '--detach', defaultHead], current);
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
assert.equal(git(['status', '--porcelain', '--untracked-files=no'], current), '');
assert.equal(sha(fs.readFileSync(path.join(root, 'global.json'))), originalPin);
assert.equal(sha(fs.readFileSync(path.join(current, 'global.json'))), previousDefaultPin);
const selected = sourceInputs.map(item => ({
  ...item, originalSha256: sha(fs.readFileSync(path.join(root, item.path))),
  currentDefaultSha256: sha(fs.readFileSync(path.join(current, item.path)))
}));
assert.ok(selected.every(item => item.originalSha256 === item.currentDefaultSha256));
write('intake-source-inputs.json', { candidate: 'F044', sourceFiles: selected });
const baseSource = fs.readFileSync(path.join(root, sourceInputs[1].path), 'utf8');
const baseMethod = baseSource.match(/public virtual void DefineSection\(string name, RenderAsyncDelegate section\)[\s\S]*?\n    \}/)?.[0];
assert.ok(baseMethod?.includes('SectionWriters.ContainsKey(name)') && baseMethod.includes('SectionWriters[name] = section;'));
const history = git(['--no-pager', 'blame', '-L', '380,391', defaultHead, '--', sourceInputs[1].path]);
const relatedPr = JSON.parse(execute('gh', ['api', 'repos/dotnet/aspnetcore/pulls/70128']));
const relatedFiles = JSON.parse(execute('gh', ['api', 'repos/dotnet/aspnetcore/pulls/70128/files?per_page=100']));
assert.ok(relatedFiles.length <= 100);
write('related-upstream-70128.json', {
  observedAt: new Date().toISOString(), number: relatedPr.number, url: relatedPr.html_url,
  title: relatedPr.title, state: relatedPr.state, head: relatedPr.head.sha,
  actualFiles: relatedFiles.map(item => ({ path: item.filename, sha: item.sha, status: item.status, patch: item.patch })),
  exhaustiveUpstreamAbsenceClaimed: false
});
const search = JSON.parse(execute('gh', ['search', 'prs', 'DefineSection', '--repo', 'dotnet/aspnetcore',
  '--limit', '20', '--json', 'number,title,state,url']));
write('bounded-upstream-search.json', { query: 'DefineSection', actualReturned: search, exhaustiveAbsenceClaimed: false });
const plan = read(path.join(run, 'acceptance-plan.json'));
assert.equal(plan.currentDefaultToRevalidate, defaultHead);
assert.equal(plan.declaredBeforeShippingImplementation, true);
write('diagnostic-budget.json', {
  candidate: 'F044', maximumSourceComparisons: 3, consumed: 0, completed: 0,
  state: 'preparing-untimed-baseline', closed: false, authorizations: [],
  standaloneOriginalTimingAllowed: false, failedOrPartialTimedAuthorizationsCountAgainstMaximum: true,
  createdAt: new Date().toISOString(), acceptancePlanSha256: sha(fs.readFileSync(path.join(run, 'acceptance-plan.json')))
});
write('intake-completed.json', {
  candidate: 'F044', branch, independentBase: baseline, actualDefaultHead: defaultHead,
  actualPreviousDefaultHead: 'c5baf473f31fa3bbe9f8201e3411361c632f3a91',
  actualOwningAreaGitTree: originalArea, actualAllSevenSelectedSourceInputsEqual: true,
  actualOriginalGlobalJsonSha256: originalPin, actualCurrentDefaultGlobalJsonSha256: previousDefaultPin,
  actualBaseMethod: baseMethod, actualCurrentDefaultBlame: history,
  actualCodeIntelligenceBoundary: 'Available Bluebird scopes are Azure DevOps projects, not this GitHub repo. GitHub semantic returned404; local LSP found the definition and legacy forwarding reference, not an exhaustive runtime caller set.',
  actualOrdinaryRazorPageOverrideIsNotThisBody: true,
  actualSourceCodeNotYetEdited: true, actualProtectedPinsUnchanged: true,
  actualF043BudgetUnchanged: true, actualTimingConsumed: 0, completedAt: new Date().toISOString()
});
console.log(JSON.stringify({ branch, baseline, defaultHead, originalArea, sourceInputs: selected.length,
  timingConsumed: 0, actualSourceCodeNotYetEdited: true }, null, 2));
