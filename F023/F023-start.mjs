import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F023');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const current = 'fa10021db581bdb7dc44e84953842ac9ccb34009';
const git = args => execFileSync('git', args, { cwd: root, maxBuffer: 8 * 1024 * 1024 });
const files = [
  'src/Middleware/Session/src/DistributedSession.cs',
  'src/Middleware/Session/src/SessionOptions.cs',
  'src/Middleware/Session/src/SessionMiddleware.cs',
  'src/Middleware/Session/src/DistributedSessionStore.cs',
  'src/Middleware/Session/src/Microsoft.AspNetCore.Session.csproj',
  'src/Middleware/Session/test/SessionTests.cs',
  'src/Middleware/Session/test/Microsoft.AspNetCore.Session.Tests.csproj',
];
const snapshots = [];
for (const file of files) {
  for (const [variant, revision] of [['baseline', baseline], ['current-default', current], ['working', null]]) {
    const bytes = revision ? git(['show', `${revision}:${file}`]) : fs.readFileSync(path.join(root, ...file.split('/')));
    const relative = `${variant}-${path.posix.basename(file)}`;
    fs.writeFileSync(path.join(run, relative), bytes, { flag: 'wx' });
    snapshots.push({ file, variant, path: relative, bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex').toUpperCase(),
      actualGitBlob: createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex') });
  }
}
const parity = files.map(file => {
  const rows = snapshots.filter(row => row.file === file);
  return { file, actualBaselineAndCurrentGitBlobsEqual: rows[0].actualGitBlob === rows[1].actualGitBlob };
});
assert.ok(parity.every(row => row.actualBaselineAndCurrentGitBlobsEqual));
const history = git(['--no-pager', 'log', '--format=%H %s', `${baseline}..${current}`, '--', ...files]);
fs.writeFileSync(path.join(run, 'actual-intervening-area-history.stdout'), history, { flag: 'wx' });
const proof = {
  candidate: 'F023', baseline, capturedCurrentDefault: current,
  actualIndependentBranch: git(['branch', '--show-current']).toString().trim(),
  actualSourceHeadBeforeEdits: git(['rev-parse', 'HEAD']).toString().trim(),
  actualSourceFiles: files.length, actualRawSnapshots: snapshots.length, snapshots, parity,
  actualInterveningSelectedHistoryEmpty: history.toString().trim().length === 0,
  owningTestsProject: 'src/Middleware/Session/test/Microsoft.AspNetCore.Session.Tests.csproj',
  knownSingleTfm: 'net12.0', ownerIsPackable: false, publicApiChangeProposed: false,
  sourceChangesCreated: 0, actualComparativeTimingProfiles: 0,
  limit: 'Selected source/history parity only;not whole-current-default SDK integration. No runtime source substitution for the failed exact runtime commit lookup.',
};
assert.equal(proof.actualSourceHeadBeforeEdits, baseline);
assert.equal(proof.actualIndependentBranch, 'autoperf/F023-session-load-timeout-source');
fs.writeFileSync(path.join(run, 'investigation.json'), JSON.stringify(proof, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualRawSnapshots: snapshots.length, actualCoreFilePairsEqual: parity.length,
  actualInterveningSelectedHistoryEmpty: proof.actualInterveningSelectedHistoryEmpty, productEdits: 0, timingProfiles: 0 }, null, 2));
