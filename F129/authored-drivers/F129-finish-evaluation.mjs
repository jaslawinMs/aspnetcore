import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F129');
const root = String.raw`C:\src\aspnetcore`;
const read = file => JSON.parse(fs.readFileSync(path.join(run, file), 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(path.join(run, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.equal(fs.existsSync(path.join(run, 'decision.json')), false);
assert.equal(hash(path.join(run, 'plan.json')), read('plan-seal.json').sha256);
const preservation = read('preservation-baseline.json');
for (const file of preservation.protectedFiles) assert.equal(hash(path.join(root, file.file)), file.sha256);
const git = spawnSync('git', ['--no-pager', 'status', '--porcelain', '--untracked-files=no'], { cwd: root, encoding: 'utf8', windowsHide: true });
assert.equal(git.status, 0);
assert.equal(git.stdout.trim(), '', 'Reject without retaining shipping edits');
assert.equal(read('reconstruction-001/verified-reproduction.json').actualNoAdditionalTimingOrAllocationMeasurement, true);
const original = read('validation/original-characterize-001/observations.json');
const prototype = read('validation/prototype-characterize-001/observations.json');
const matrix = original.Observations.filter(row => row.Repetition === 1).map(row =>
{
    const after = prototype.Observations.find(candidate => candidate.Profile === row.Profile && candidate.Repetition === 1);
    return { profile: row.Profile, originalHtml: row.Html, prototypeHtml: after.Html,
        originalException: row.Exception ? { type: row.Exception.Type, message: row.Exception.Message } : null,
        prototypeException: after.Exception ? { type: after.Exception.Type, message: after.Exception.Message } : null,
        actualToStringCallsOriginal: row.ToStringCalls, actualToStringCallsPrototype: after.ToStringCalls,
        actualOriginalSourceAfterValue: row.SourceAfterValue, actualPrototypeSourceAfterValue: after.SourceAfterValue,
        actualPrototypeFailures: after.Failures };
});
write('semantic-matrix.json', matrix);
const before = path.join(run, 'images', 'Original', 'source', 'src', 'Components', 'Media', 'src', 'FileDownload.cs');
const after = path.join(run, 'images', 'Prototype', 'source', 'src', 'Components', 'Media', 'src', 'FileDownload.cs');
assert.equal(hash(path.join(root, 'src', 'Components', 'Media', 'src', 'FileDownload.cs')), hash(before));
const diff = spawnSync('git', ['--no-pager', 'diff', '--no-index', '--', before, after], { encoding: 'utf8', windowsHide: true });
assert.equal(diff.status, 1, 'Expect an actual preserved throwaway source delta');
fs.writeFileSync(path.join(run, 'prototype.patch'), diff.stdout, { flag: 'wx' });
write('diagnostic-budget.json', {
    findingId: 'F129', maximumAuthorizations: 3, authorizations: [], permanentlyClosed: true,
    actualTimingComparisons: 0, actualFailedOrPartialTimingAuthorizations: 0,
    actualUnusedAuthorizationsPermanentlyClosed: 3, actualTimingOrAllocationMeasurementPerformed: false,
    closedAt: new Date().toISOString(),
    reason: 'Semantic rejection of an unbuffered recommendation; no timing authorization was opened. Do not benchmark or replay this rejected prototype.',
});
write('budget-closure.json', { findingId: 'F129', closedAt: new Date().toISOString(),
    closedBudgetSha256: hash(path.join(run, 'diagnostic-budget.json')), actualPreviouslyConsumed: 0,
    actualUnusedPermanentlyClosed: 3, actualNumericalOutcomeSelected: false });
for (const file of ['F129-audit-trx.ps1', 'F129-verify.mjs'])
{
    fs.copyFileSync(path.join(session, file), path.join(run, file), fs.constants.COPYFILE_EXCL);
}
const auditArgs = [path.join(run, 'F129-verify.mjs'), run, '--live-images'];
const audit = spawnSync(process.execPath, auditArgs, { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
write('live-audit.command.json', { executable: process.execPath, arguments: auditArgs, exitCode: audit.status, completedAt: new Date().toISOString() });
fs.writeFileSync(path.join(run, 'live-audit.stdout.txt'), audit.stdout ?? '', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'live-audit.stderr.txt'), audit.stderr ?? '', { flag: 'wx' });
assert.equal(audit.status, 0, audit.stderr);
const summary = JSON.parse(audit.stdout);
write('audit-summary.json', summary);
write('decision.json', {
    findingId: 'F129', disposition: 'rejected', mergeReady: false,
    reasonCode: 'unbuffered-filter-breaks-observable-attribute-snapshot',
    reason: 'Actual object-valued attributes are converted by RenderTreeBuilder.AddAttribute(object). Application-owned ToString can update or add entries in the supplied dictionary. The original href-present branch finishes its copy before conversion; the lazy prototype interleaves conversion with source enumeration, changing actual HTML or throwing.',
    actualOriginalDefaultAndRestoredPreservationChecksGreen: true,
    actualSameAssertionsRedOnPrototypeProfiles: ['ReplaceValueWithHref', 'AddKeyWithHref'],
    actualThreeRepetitionsPerProfilePerRole: true,
    actualFreshTwoInputBuildReproducedBothRoles: true,
    actualExistingUnitTestsDidNotDetectTheProposedDifference: true,
    actualHistoricalExistingXmlExecutions: 28, actualExistingXmlFailuresOrSkips: 0,
    actualRealComponentRendererExecutions: 162, actualExpectedPrototypeContractFailureRows: 12,
    actualShippingSourceChanged: false, actualPermanentTestsAdded: false,
    actualSourceBranchPublished: false, actualPerformancePrWarranted: false,
    actualTimingComparisons: 0, actualUnusedTimingAuthorizationsPermanentlyClosed: 3,
    actualNoNumericalNoGainVerdict: true,
    actualPlanSha256: hash(path.join(run, 'plan.json')),
    actualClosedBudgetSha256: hash(path.join(run, 'diagnostic-budget.json')),
    actualDefaultCommit: read('plan.json').actualDefaultCommit,
    actualSourceRestoredByteExactly: true, actualOriginalCompiledConsumerReproducedAll30Files: true,
    actualNoUniversalOptimizationImpossibilityClaim: true,
    unverified: ['Browser/download/JS behavior', 'Representative frequency of supplied href plus reentrant object values',
        'Performance or allocation improvement', 'Alternative buffered/list/array/pooling/constructor designs',
        'Server/WebAssembly/Auto lifecycle', 'Full repository build, AOT/trimming and packaging', 'Complete compiler provenance or global caller census'],
    recordedAt: new Date().toISOString(),
});
console.log(JSON.stringify(summary, null, 2));
