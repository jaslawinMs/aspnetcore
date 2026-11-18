import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F041');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const upstream = fs.readFileSync(path.join(run, 'upstream-default-head.txt'), 'utf8').trim();
const calls = [];
function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, maxBuffer: 8 * 1024 * 1024 });
  assert.ifError(result.error);
  calls.push({ executable: 'git', arguments: args, actualExitCode: result.status,
    stdout: result.stdout, stderr: result.stderr });
  fs.writeFileSync(path.join(run, 'source-snapshot-v2-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
}
assert.equal(git(['rev-parse', 'HEAD']), baseline);
assert.equal(git(['branch', '--show-current']), 'autoperf/F041-field-registry-get-or-create');
assert.equal(git(['status', '--porcelain=v1', '--untracked-files=no']), '');
git(['cat-file', '-e', `${upstream}^{commit}`]);
const files = [
  'src/Components/Web/src/Forms/ClientValidation/RenderedFieldRegistry.cs',
  'src/Components/Forms/src/EditContextProperties.cs',
  'src/Components/Forms/src/EditContext.cs',
  'src/Components/Web/src/Forms/InputBase.cs',
  'src/Components/Web/src/Forms/EditForm.cs',
  'src/Components/Web/src/Forms/ClientValidation/ClientValidationData.cs',
  'src/Components/Web/src/Forms/ClientValidation/ClientValidationProvider.cs',
  'src/Components/Forms/src/DataAnnotationsValidator.cs',
  'src/Components/Forms/src/Microsoft.AspNetCore.Components.Forms.csproj',
  'src/Components/Web/src/Microsoft.AspNetCore.Components.Web.csproj',
  'src/Components/Web/test/Microsoft.AspNetCore.Components.Web.Tests.csproj',
  'src/Components/Web/test/Forms/InputBaseTest.cs',
  'src/Components/Forms/test/EditContextTest.cs',
];
let changed = 0;
const sourceFiles = files.map(relative => {
  const before = git(['rev-parse', `${baseline}:${relative}`]);
  const current = git(['rev-parse', `${upstream}:${relative}`]);
  const local = path.join(root, ...relative.split('/'));
  const bytes = fs.readFileSync(local);
  let firstInitializationIdentical;
  if (before !== current) {
    changed++;
    assert.equal(relative, 'src/Components/Web/src/Forms/InputBase.cs');
    assert.equal(before, 'bc1e815e62f4cb12e53b70b507e03de53ec3e9ce');
    assert.equal(current, '2bfe561fccd8316fde834befe205386eb46cc31a');
    const text = git(['show', `${upstream}:${relative}`]);
    fs.writeFileSync(path.join(run, 'current-default-InputBase.cs'), text + '\n', { flag: 'wx' });
    const initialBlock = value => {
      const normalized = value.replaceAll('\r\n', '\n');
      const start = normalized.indexOf('        if (!_hasInitializedParameters)\n');
      const end = normalized.indexOf('        else if (CascadedEditContext != EditContext)\n', start);
      assert.ok(start > 0 && end > start);
      return normalized.slice(start, end);
    };
    assert.equal(initialBlock(bytes.toString('utf8')), initialBlock(text));
    assert.ok(text.includes('public TValue? Value { get; set; }'));
    firstInitializationIdentical = true;
  }
  const copied = path.join(run, 'source-files', ...relative.split('/'));
  fs.mkdirSync(path.dirname(copied), { recursive: true });
  fs.writeFileSync(copied, bytes, { flag: 'wx' });
  return { path: relative.replaceAll('/', '\\'), gitPath: relative,
    baselineBlob: before, defaultBlob: current, actualDefaultFileIdentical: before === current,
    actualFirstInitializationBlockIdentical: firstInitializationIdentical,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(), bytes: bytes.length };
});
assert.equal(changed, 1);
const untracked = git(['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).sort();
assert.deepEqual(untracked, ['autoperf-scan-report.md', 'autoperf-issue-70219-duplicate-report.html',
  'autoperf-issue-70219-deduplicated-report.html', 'performance-antipattern-findings.md'].sort());
const reports = untracked.map(relative => ({ path: relative,
  sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex').toUpperCase() }));
fs.writeFileSync(path.join(run, 'source-inputs.json'), JSON.stringify({
  candidate: 'F041', capturedUtc: new Date().toISOString(), baseline, upstreamDefault: upstream,
  branch: 'autoperf/F041-field-registry-get-or-create', selectedFiles: sourceFiles.length,
  actualIdenticalSelectedDefaultFiles: sourceFiles.length - changed,
  actualAllSelectedDefaultBlobsEqualBaseline: false,
  actualAssessedInitialRegistryProducerBlockIdentical: true,
  actualCurrentDefaultBuildOrParsingRecoveryClaimed: false,
  sourceFiles, preservedUntrackedReports: reports,
  codeIntelligenceBoundary: 'Primary code index is configured for unrelated msazure/One, with prior unavailable GitHub semantic routes retained in campaign history. Current local LSP returned no Properties definition and only the GetOrCreate declaration; these are not evidence of no callers. Bounded actual Forms/Web source reads and literal references establish the explicit producer/consumer traced here.',
  relatedWorkBoundary: 'Exact-name open issue/PR searches returned zero for RenderedFieldRegistry and EditContextProperties; this is not an exhaustive changed-file search.',
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualSelectedFiles: sourceFiles.length,
  actualIdenticalDefaultFiles: sourceFiles.length - changed,
  actualAssessedFirstInitializationBlockIdentical: true,
  actualWholeCurrentDefaultBuildOrRuntimeEquivalenceClaimed: false }, null, 2));
