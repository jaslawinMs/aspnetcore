import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F036');
const investigation = JSON.parse(fs.readFileSync(path.join(run, 'investigation.json'), 'utf8'));
const output = path.join(run, 'constructor-dependency-review');
assert.equal(fs.existsSync(output), false, 'Do not overwrite an actual dependency observation.');
fs.mkdirSync(output);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(output, 'executed-driver.mjs'));
const calls = [];
function git(args, label) {
  const started = new Date().toISOString();
  const result = spawnSync('git', args, { cwd: root, maxBuffer: 8 * 1024 * 1024 });
  fs.writeFileSync(path.join(output, label + '.stdout'), result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(path.join(output, label + '.stderr'), result.stderr ?? Buffer.alloc(0));
  calls.push({ executable: 'git', arguments: args, workingDirectory: root, started,
    completed: new Date().toISOString(), actualExitCode: result.status,
    stdout: label + '.stdout', stderr: label + '.stderr' });
  fs.writeFileSync(path.join(output, 'actual-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, `${label}:${result.stderr}`);
  return result.stdout;
}
const file = 'src/Mvc/Mvc.ViewFeatures/src/TemplateInfo.cs';
const baseline = git(['show', `${investigation.baseline}:${file}`], 'template-info-baseline');
const current = git(['show', `${investigation.actualCurrentDefault}:${file}`], 'template-info-current-default');
const working = fs.readFileSync(path.join(root, ...file.split('/')));
fs.writeFileSync(path.join(output, 'TemplateInfo.cs.working'), working);
assert.ok(Buffer.from(working.toString().replaceAll('\r\n', '\n')).equals(baseline));
assert.equal(baseline.equals(current), false);
git(['--no-pager', 'diff', investigation.baseline, investigation.actualCurrentDefault, '--', file], 'actual-template-info-diff');
git(['--no-pager', 'log', '--format=%H %cI %s', `${investigation.baseline}..${investigation.actualCurrentDefault}`,
  '--', file], 'actual-template-info-intervening-history');
const hash = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const receipt = {
  candidate: 'F036', file, actualBaseline: investigation.baseline,
  actualCurrentDefault: investigation.actualCurrentDefault,
  actualBaselineBlobSha256: hash(baseline), actualCurrentDefaultBlobSha256: hash(current),
  actualWorkingBytesSha256: hash(working), actualWorkingLfBytesMatchBaselineBlob: true,
  actualBaselineAndCurrentBlobBytesEqual: false,
  actualInitialSelectedTwelveFileParityStillTrue: investigation.actualSelectedSourceParity,
  actualAllThirteenFileParity: false,
  consequence: 'Current main lazily allocates TemplateInfo visited-object storage. The original independent37e809e experiment is not a full-current-main construction/allocation measurement.',
  premeasurementRestriction: 'Any original-only enumeration diagnostics must prepare base/typed/copy/materialized dictionaries and all TemplateInfo construction/writes outside timing. Do not time copy construction or detachment or claim their costs represent current main. Preserve this dependency drift and both raw sources.',
  actualSourceComparisonAttempts: 0, actualShippingEdits: 0, actualTimingPerformed: false,
};
fs.writeFileSync(path.join(output, 'verified-dependency-drift.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
