import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const output = path.join(session, 'autoperf-runs', 'F022', 'current-default-recheck');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const previous = '49147673007a4b1d676694e2c5f85b83ad76c36f';
const current = 'fa10021db581bdb7dc44e84953842ac9ccb34009';
const git = args => execFileSync('git', args, { cwd: root, maxBuffer: 8 * 1024 * 1024 });
const core = [
  'src/Mvc/Mvc.ViewFeatures/src/ExpressionHelper.cs',
  'src/Mvc/Mvc.ViewFeatures/src/ModelExpressionProvider.cs',
  'src/Mvc/Mvc.ViewFeatures/src/ExpressionMetadataProvider.cs',
  'src/Mvc/Mvc.ViewFeatures/src/ModelExplorer.cs',
  'src/Mvc/Mvc.ViewFeatures/src/CachedExpressionCompiler.cs',
  'src/Mvc/Mvc.ViewFeatures/src/LambdaExpressionComparer.cs',
  'src/Mvc/Mvc.ViewFeatures/src/HtmlAttributePropertyHelper.cs',
  'src/Mvc/Mvc.ViewFeatures/src/Microsoft.AspNetCore.Mvc.ViewFeatures.csproj',
  'src/Mvc/Mvc.ViewFeatures/test/ExpressionHelperTest.cs',
  'src/Mvc/Mvc.ViewFeatures/test/ExpressionMetadataProviderTest.cs',
  'src/Mvc/Mvc.ViewFeatures/test/Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj',
  'src/Mvc/Mvc/src/HotReloadService.cs',
  'src/Mvc/Mvc.Razor/src/RazorHotReload.cs',
  'src/Servers/IIS/IIS/src/Microsoft.AspNetCore.Server.IIS.csproj',
];
const infrastructure = ['global.json', 'eng/Versions.props', 'Directory.Build.props', 'Directory.Build.targets',
  '.github/pull_request_template.md'];
const rows = [];
for (const file of [...core, ...infrastructure]) {
  const snapshots = [];
  for (const [variant, revision] of [['baseline', baseline], ['new-default', current]]) {
    const bytes = git(['show', `${revision}:${file}`]);
    const relative = `${variant}-${path.posix.basename(file)}`;
    fs.writeFileSync(path.join(output, relative), bytes, { flag: 'wx' });
    snapshots.push({ variant, revision, path: relative, bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex').toUpperCase(),
      actualGitBlob: git(['rev-parse', `${revision}:${file}`]).toString().trim() });
  }
  rows.push({ file, core: core.includes(file), actualGitBlobEqual: snapshots[0].actualGitBlob === snapshots[1].actualGitBlob, snapshots });
}
const log = git(['--no-pager', 'log', '--format=%H %s', `${previous}..${current}`, '--', ...core]);
fs.writeFileSync(path.join(output, 'actual-intervening-core-history.stdout'), log, { flag: 'wx' });
const proof = {
  candidate: 'F022', baseline, previouslyCapturedDefaultRevision: previous, actualDefaultRevision: current,
  actualRawGitSnapshots: rows.length * 2, actualCoreFilePairs: core.length,
  actualAllCoreGitBlobsEqual: rows.filter(row => row.core).every(row => row.actualGitBlobEqual),
  actualInfrastructureDifferences: rows.filter(row => !row.core && !row.actualGitBlobEqual).map(row => row.file),
  actualInterveningCoreHistoryEmpty: log.toString().trim().length === 0,
  snapshots: rows, actualRootWorktreeChanged: false, timingProfiles: 0,
  limit: 'Selected source/history parity only;not a build/test or full SDK integration on the newer default branch. The captured baseline SDK/runtime remains the measured environment.',
};
fs.writeFileSync(path.join(output, 'verified-default-parity.json'), JSON.stringify(proof, null, 2) + '\n', { flag: 'wx' });
assert.equal(proof.actualAllCoreGitBlobsEqual, true, 'Inspect actual newer core source before any source publication.');
assert.equal(proof.actualInterveningCoreHistoryEmpty, true, 'Inspect intervening core history before publication.');
console.log(JSON.stringify({
  actualDefaultRevision: current, actualCoreFilePairs: core.length, actualRawGitSnapshots: proof.actualRawGitSnapshots,
  actualAllCoreGitBlobsEqual: proof.actualAllCoreGitBlobsEqual,
  actualInfrastructureDifferences: proof.actualInfrastructureDifferences,
  actualInterveningCoreHistoryEmpty: proof.actualInterveningCoreHistoryEmpty, timingProfiles: 0,
}, null, 2));
