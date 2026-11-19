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
assert.equal(read(path.join(run, 'validation', 'original-preservation-build-002', 'result.json')).exitCode, 0);
for (const [prior, label] of [
  ['original-preservation-tests-001', 'original-preservation-tests-003'],
  ['default-existing-tests-001', 'default-existing-tests-001'],
  ['preservation-format-001', 'preservation-format-001']
]) {
  const old = read(path.join(session, 'autoperf-runs', 'F122', 'validation', prior, 'command.json'));
  const args = old.arguments.map(value => value.replaceAll('F122', 'F123').replaceAll(prior, label));
  const result = spawnSync(process.execPath, [
    path.join(session, 'F123-managed-command.mjs'), label, old.cwd, ...args
  ], { stdio: 'inherit', windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.status, 0, label);
  if (label.includes('-tests-')) {
    const focused = label.startsWith('original') ? 12 : 0;
    const audit = spawnSync(process.execPath, [
      path.join(session, 'F123-audit-test-results.mjs'), label, String(28 + focused), String(focused)
    ], { stdio: 'inherit', windowsHide: true });
    assert.ifError(audit.error);
    assert.equal(audit.status, 0);
  }
}
const receipt = {
  candidate: 'F123',
  actualScope: 'test-fixture and report-routing preparation only',
  actualFailedPreparation: 'original-preservation-tests-001',
  actualInitialPassed: 38, actualInitialFailed: 2,
  actualPreviouslyBlockedRows: [
    'IndexOf_ArbitrarySourceDisposesOnCurrentOrEqualityFailure(equalityFailure: False)',
    'IndexOf_ArbitrarySourceDisposesOnCurrentOrEqualityFailure(equalityFailure: True)'
  ],
  actualCause: 'Moq could not proxy IEnumerator<private ObservedEquality>; these two initial rows did not reach IndexOf or their assertion.',
  actualCorrection: 'Keep the helper private; mock IEnumerator<object>/IReadOnlyList<object> while returning the same real equality-callback objects. No friend assembly or new access mechanism.',
  actualReportRoutingFailure: 'original-preservation-tests-002 passed all 40 rows, but its reused --results-directory overwrote the first attempt TRX. The initial failing TRX is not preserved; initial raw stdout/stderr and exit are preserved. Do not attribute that now-successful TRX to the initial failing run.',
  actualFreshReportSuccessor: 'original-preservation-tests-003',
  actualSuccessfulOriginalRowsIndividuallyParsed: 40,
  actualEveryFocusedSuccessorRowPassed: 12,
  actualSuccessfulDefaultRowsIndividuallyParsed: 28,
  actualNoShippingSourceChange: true,
  actualNotShippingBugFixRedGreen: true,
  actualTimingAuthorizationsConsumed: 0,
  actualCorrectedTestSourceSha256: sha(String.raw`C:\src\aspnetcore\src\Mvc\Mvc.Core\test\Infrastructure\CopyOnWriteListTest.cs`),
  actualOriginalFailureStdoutSha256: sha(path.join(run, 'validation', 'original-preservation-tests-001', 'stdout.txt')),
  actualOriginalFailureStderrSha256: sha(path.join(run, 'validation', 'original-preservation-tests-001', 'stderr.txt')),
  actualManagedCommandGuardSha256: sha(path.join(session, 'F123-managed-command.mjs'))
};
fs.writeFileSync(path.join(run, 'preparation-correction.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt, null, 2));
