import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(session, 'autoperf-parallelism', 'finding-F237-F238-059');
const previous = path.join(root, 'common-062');
const current = path.join(root, 'common-066');
const failed = path.join(root, 'common-Original-Compile-first-062');
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const read = file => fs.readFileSync(file);
const failure = JSON.parse(read(path.join(failed, 'exit.json')));
assert.equal(failure.actualExitCode, 1);
assert.equal(failure.actualOutputConsumerSha256, null);
assert(read(path.join(failed, 'stdout.txt')).toString('utf8').includes('error CS1701:'));
assert(!fs.existsSync(current));
assert(!fs.existsSync(path.join(previous, 'RuntimePageDiscovery.CommonProbe.dll')));
fs.mkdirSync(current);
for (const name of ['Program.cs', 'fixture-plan.json', 'fixture-input-inventory.json', 'reference-inputs.json']) {
    fs.copyFileSync(path.join(previous, name), path.join(current, name), fs.constants.COPYFILE_EXCL);
}
fs.cpSync(path.join(previous, 'fixture-inputs'), path.join(current, 'fixture-inputs'), {
    recursive: true, errorOnExist: true, force: false
});
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(current, 'executed-prepare-common-066.mjs'));
const previousResponse = read(path.join(previous, 'compile.rsp')).toString('utf8');
assert.equal(previousResponse.split('/warnaserror+\r\n').length, 2);
const response = previousResponse.replaceAll(previous, current)
    .replace('/warnaserror+\r\n', '/warnaserror+\r\n/warnaserror-:1701\r\n');
fs.writeFileSync(path.join(current, 'compile.rsp'), response, { flag: 'wx' });
const previousPlan = JSON.parse(read(path.join(previous, 'compile-plan.json')));
const plan = {
    ...previousPlan, recordedAt: new Date().toISOString(),
    actualResponseFileSha256: hash(Buffer.from(response)),
    actualPreviousFrozenPlanSha256: hash(read(path.join(previous, 'compile-plan.json'))),
    actualPriorFailedCompileReceiptSha256: hash(read(path.join(failed, 'exit.json'))),
    actualPriorFailedCompileStdoutSha256: hash(read(path.join(failed, 'stdout.txt'))),
    actualPriorCompilerFailureAndEveryPreviousInputPreserved: true,
    actualSourceFixturePlanAndReferenceInputBytesUnchanged: true,
    actualOnlyDiagnosticPolicyChange: 'Emit and retain CS1701 as a warning, not an error: pinned Moq references System.Linq.Expressions v6 and this actual .NET12 reference image is v12. All other warnings remain errors; this does not assert runtime compatibility.',
    actualRuntimeCompatibilityStillRequiresBothRealRoleExecutions: true
};
assert.equal(hash(read(path.join(current, 'Program.cs'))), plan.actualSourceSha256);
assert.equal(hash(read(path.join(current, 'fixture-plan.json'))), plan.actualFixturePlanSha256);
fs.writeFileSync(path.join(current, 'compile-plan.json'), JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualPrepared: true, actualNewCohort: current,
    actualPriorCompilerFailurePreserved: true, actualSourceAndFixtureBytesUnchanged: true,
    actualSpecificCS1701WarningWillRemainVisible: true, actualNoCompilerStarted: true }, null, 2));
