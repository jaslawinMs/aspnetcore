import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F033');
const execution = path.join(run, 'prepublication-default-refresh');
assert.equal(fs.existsSync(execution), false, 'Do not overwrite a current-default reassessment.');
fs.mkdirSync(execution);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(execution, 'executed-driver.mjs'));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const investigation = read(path.join(run, 'investigation.json'));
const calls = [];
function capture(command, args, allowFailure = false) {
  const index = String(calls.length + 1).padStart(3, '0');
  const started = new Date().toISOString();
  const result = spawnSync(command, args, { cwd: root, maxBuffer: 8 * 1024 * 1024 });
  fs.writeFileSync(path.join(execution, index + '.stdout'), result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(path.join(execution, index + '.stderr'), result.stderr ?? Buffer.alloc(0));
  calls.push({ executable: command, arguments: args, workingDirectory: root, started,
    completed: new Date().toISOString(), actualExitCode: result.status,
    stdout: index + '.stdout', stderr: index + '.stderr' });
  fs.writeFileSync(path.join(execution, 'actual-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  if (!allowFailure) {
    assert.equal(result.status, 0, `${command}: ${result.stderr}`);
  }
  return result;
}
const git = args => capture('git', args).stdout.toString().trim();
const current = JSON.parse(capture('gh', ['api', 'repos/dotnet/aspnetcore/branches/main']).stdout).commit.sha;
if (capture('git', ['cat-file', '-e', `${current}^{commit}`], true).status !== 0) {
  git(['fetch', '--no-tags', 'origin', current]);
}
const selected = investigation.parity.filter(row => row.core);
const snapshots = path.join(execution, 'current-snapshots');
fs.mkdirSync(snapshots);
const rows = [];
for (const [index, entry] of selected.entries()) {
  const result = capture('git', ['show', `${current}:${entry.file}`]);
  const relative = `current-snapshots/${String(index).padStart(2, '0')}-${entry.file.split('/').at(-1)}.current`;
  fs.writeFileSync(path.join(execution, ...relative.split('/')), result.stdout);
  const hash = createHash('sha256').update(result.stdout).digest('hex').toUpperCase();
  rows.push({ file: entry.file, snapshot: relative, actualLatestBlobSha256: hash,
    expectedBaselineBlobSha256: entry.actualBaselineBlobBytesSha256,
    actualLatestMatchesInvestigatedBaseline: hash === entry.actualBaselineBlobBytesSha256 });
}
const history = git(['--no-pager', 'log', '--format=%H %s',
  `${investigation.actualCurrentDefault}..${current}`, '--', ...selected.map(row => row.file)]);
const receipt = {
  candidate: 'F033', actualInitiallyInvestigatedDefault: investigation.actualCurrentDefault,
  actualCurrentDefault: current, actualSelectedFilePairs: rows.length, actualLatestSourceSnapshots: rows,
  actualSelectedInterveningHistory: history,
  actualAllSelectedSourcesMatchBaseline: rows.every(row => row.actualLatestMatchesInvestigatedBaseline),
  actualAssessmentAfterPublicationGuardStoppedChangedDefault: true,
  actualNewSourceComparisons: 0, actualTimingBudgetRemainsClosed: true,
  qualification: 'Fresh16-file source/history parity only. Native timing remains the original pinned SDK/runtime/baseline plus guard,not a rebuild or whole-newer-default/toolchain integration claim.',
};
fs.writeFileSync(path.join(execution, 'verified-default-reassessment.json'), JSON.stringify(receipt, null, 2) + '\n');
assert.equal(receipt.actualAllSelectedSourcesMatchBaseline, true, 'Selected sources moved;reassess behavior without resetting the closed timing budget.');
assert.equal(history, '', 'Selected owning source history changed;inspect it before publication.');
assert.equal(read(path.join(run, 'measurement-budget.json')).sourceComparisonBudgetClosed, true);
console.log(JSON.stringify({ actualInitiallyInvestigatedDefault: investigation.actualCurrentDefault,
  actualCurrentDefault: current, actualSelectedFilesUnchanged: rows.length, actualNewComparisons: 0 }, null, 2));
