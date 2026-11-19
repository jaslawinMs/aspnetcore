import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F123');
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const sha = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex').toUpperCase();
assert.equal(read(path.join(run, 'baseline-validation.json')).actualSealedBeforeAnyShippingEdit, true);
assert.equal(read(path.join(run, 'diagnostic-budget.json')).authorized.length, 0);
const owner = ['src', 'Mvc', 'Mvc.Core', 'src', 'Infrastructure', 'CopyOnWriteList.cs'];
const original = fs.readFileSync(path.join(run, 'source-files-original', ...owner), 'utf8');
const candidate = fs.readFileSync(path.join(String.raw`C:\src\aspnetcore`, ...owner), 'utf8');
const seam = original.indexOf('        foreach (var obj in Readable)', original.indexOf('    public int IndexOf(T item)'));
assert.ok(seam > 0);
assert.ok(candidate.startsWith(original.slice(0, seam)), 'Preserve every original byte before the insertion.');
assert.ok(candidate.endsWith(original.slice(seam)), 'Preserve every original byte after the insertion, including the complete source fallback.');
const inserted = candidate.slice(seam, candidate.length - original.length + seam).replaceAll('\r\n', '\n');
assert.equal(inserted, [
  '        if (_copy is not null)', '        {', '            foreach (var obj in _copy)', '            {',
  '                if (object.Equals(obj, item))', '                {', '                    return i;', '                }',
  '', '                i++;', '            }', '', '            return -1;', '        }', '', ''
].join('\n'));
fs.writeFileSync(path.join(run, 'candidate-seam-verification.json'), JSON.stringify({
  candidate: 'F123', actualOriginalPrefixAndCompleteSuffixByteExact: true,
  actualOnlyInsertionLines: 15, actualSourceFallbackChanged: false,
  actualOriginalOwnerSha256: sha(path.join(run, 'source-files-original', ...owner)),
  actualCandidateOwnerSha256: sha(path.join(String.raw`C:\src\aspnetcore`, ...owner))
}, null, 2) + '\n', { flag: 'wx' });
function node(args) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(process.execPath, args, {
    encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024
  });
  fs.appendFileSync(path.join(run, 'candidate-driver-invocations.jsonl'), JSON.stringify({
    executable: process.execPath, arguments: args, actualStartedAt: startedAt,
    actualCompletedAt: new Date().toISOString(), exitCode: result.status,
    launchError: result.error?.message ?? null, stdout: result.stdout ?? '', stderr: result.stderr ?? ''
  }) + '\n');
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  assert.ifError(result.error);
  assert.equal(result.status, 0);
}
for (const label of ['candidate-core-build-001', 'candidate-core-tests-001', 'candidate-pages-build-001',
  'candidate-pages-tests-001', 'candidate-source-whitespace-001']) {
  const old = read(path.join(session, 'autoperf-runs', 'F121', 'validation', label, 'command.json'));
  node([path.join(session, 'F123-managed-command.mjs'), label, old.cwd,
    ...old.arguments.map(value => value.replaceAll('F121', 'F123'))]);
  if (label.includes('-tests-')) {
    const core = label.includes('-core-');
    node([path.join(session, 'F123-audit-test-results.mjs'), label, core ? '40' : '9', core ? '12' : '0']);
  }
}
node([path.join(session, 'F123-freeze.mjs'), 'Candidate']);
const old = read(path.join(session, 'autoperf-runs', 'F122', 'validation', 'original-characterize-001', 'command.json'));
const args = old.arguments.map(value => value.replaceAll('F122', 'F123')
  .replaceAll('original-characterize-001', 'candidate-characterize-001')
  .replaceAll('consumer-original', 'consumer-candidate').replaceAll('closure-original.json', 'closure-candidate.json')
  .replaceAll('source-inputs-original.json', 'source-inputs-candidate.json').replaceAll('source-files-original', 'source-files-candidate'))
  .map(value => value === 'Original' ? 'Candidate' : value);
fs.mkdirSync(args[2], { recursive: true });
fs.mkdirSync(args[6], { recursive: true });
node([path.join(session, 'F123-managed-command.mjs'), 'candidate-characterize-001', old.cwd, ...args]);
node([path.join(session, 'F123-seal.mjs'), 'measurement']);
