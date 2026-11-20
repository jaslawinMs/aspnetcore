import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F133');
const common = path.join(session, 'autoperf-runs', 'F133-common');
const published = path.join(session, 'autoperf-published-results');
const target = path.join(published, 'F133');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const hash = file => sha(fs.readFileSync(file));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function git(directory, ...args)
{
    const result = spawnSync('git', ['--no-pager', ...args], { cwd: directory, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
}
assert.equal(fs.existsSync(target), false, 'Never rewrite a public case');
assert.equal(git(published, 'rev-parse', 'HEAD'), 'a90c276808c4f3011d971e165c1ded76c1a77d24');
assert.equal(git(published, 'status', '--porcelain'), '');
assert.equal(git(published, 'rev-parse', 'HEAD:REPORT.md'), '73abf142464b1f81676e03a1eebc766c279cb47b');
const plan = read(path.join(run, 'plan.json')), before = read(path.join(run, 'preservation-baseline.json'));
assert.equal(git(before.root, 'rev-parse', 'HEAD'), plan.originalCommit);
assert.equal(git(before.current, 'rev-parse', 'HEAD'), plan.actualCurrentDefault);
assert.equal(git(before.root, 'status', '--porcelain', '--untracked-files=no'), '');
assert.equal(git(before.current, 'status', '--porcelain', '--untracked-files=no'), '');
assert.equal(git(before.root, 'branch', '--show-current'), 'autoperf/F133-characterize-union-validation-metadata');
for (const entry of before.protectedFiles) assert.equal(hash(path.join(before.root, entry.file)), entry.sha256);
for (const entry of plan.actualPhysicalSnapshots)
{
    assert.equal(hash(path.join(entry.role === 'Original' ? before.root : before.current, entry.file)), entry.sha256);
}
assert.equal(hash(path.join(session, 'autoperf-campaign.json')), before.privateLedgerSha256);
const verification = spawnSync(process.execPath, [path.join(session, 'F133-verify.mjs'), run, '--live-images'], { encoding: 'utf8' });
assert.equal(verification.status, 0, verification.stderr);
const audit = JSON.parse(verification.stdout);
assert.equal(audit.actualAuditPassed, true);
assert.equal(audit.actualLiveImagesVerified, true);
fs.writeFileSync(path.join(run, 'audit-summary.json'), verification.stdout, { flag: 'wx' });
const budget = read(path.join(run, 'diagnostic-budget.json'));
assert.equal(budget.closed, true);
assert.equal(budget.authorizations.length, 0);
const decision = {
    findingId: 'F133', disposition: 'rejected', recordedAt: new Date().toISOString(),
    meaning: 'Not pursued as a justified optimization proposal; no quantified refutation of the original explicit custom non-default metadata scenario, and not a measured no-gain.',
    actualOriginalCardAlreadySaysNonDefaultMetadata: true,
    actualNormalMetadataAlreadyRetainsPropertyInfo: true,
    actualHelperHasPropertyKindAndValueNameGuard: true,
    actualObservedDefaultAndForwardingDecoratorReturnDefaultModelMetadata: true,
    actualSourcePredicateOnlyNotInvocationInstrumentation: true,
    actualObservedRootPropertyMetadataNotEveryInternalVisitorObject: true,
    actualCustomNonDefaultMetadataProducerExercised: false,
    actualCustomMetadataPerformanceBenefitOrNoGainEstablished: false,
    actualOtherUnionReflectionRemains: true,
    actualGetPropertyInvocationCountInstrumented: false,
    actualNoCustomMetadataUnreachabilityClaim: true,
    actualSourceStrategyUnchangedOnObservedDefault: true,
    actualSupplementalModelMetadataDefaultSourceDeltaRetained: true,
    actualAudit: audit, actualIndependentReconstruction: read(path.join(run, 'reconstruction-001', 'verified-reproduction.json')),
    actualTimingComparisons: 0, actualClosedBudgetSha256: hash(path.join(run, 'diagnostic-budget.json')),
    actualUnusedAuthorizationsPermanentlyClosed: 3, actualNoFurtherTimingPermitted: true,
    actualShippingSourceChanged: false, actualPrototypeImplemented: false, actualSourceBranchPublished: false,
    actualPerformancePrCreated: false, actualBrowserLaunchRequested: false, actualPermanentTestsAdded: false,
    actualPublicApiOrProcessWideCacheAdded: false,
    preparationDisclosures: [
        'Initial intake equality assumption stopped before plan seal/branch/runtime work on a real supplemental default ModelMetadata.cs delta; exact failed helper, partial snapshots and correction are preserved.',
        'Three actual NETSDK1004 missing-assets attempts were each followed by a restore only after observed failure, then successful executions.',
        'Common compilation002 preceded a pre-execution metadata-array-length guard. Accepted frozen source begins at compilation003; no earlier runtime observation or complete earlier binary/input reconstruction is claimed.',
    ],
    limits: 'Actual public managed validation and default metadata below HTTP. Explicit custom non-default metadata workload/performance remains unmeasured, not unreachable. No GetProperty invocation counter, all-internal-metadata census, HTTP/browser, live metadata delta, AOT/trimming, complete compiler-input, global caller coverage or whole-app claim.',
};
write(path.join(run, 'decision.json'), decision);
write(path.join(run, 'final-source-preservation.json'), {
    recordedAt: new Date().toISOString(), actualRootHead: git(before.root, 'rev-parse', 'HEAD'),
    actualDefaultHead: git(before.current, 'rev-parse', 'HEAD'),
    actualRootStatus: git(before.root, 'status', '--porcelain'),
    actualDefaultTrackedStatus: git(before.current, 'status', '--porcelain', '--untracked-files=no'),
    actualAllEightSelectedInputsInEachRoleStillMatchOwnSnapshot: true,
    actualProtectedRootAndUnrelatedFileHashes: before.protectedFiles,
    actualDefaultGlobalJsonSha256: hash(path.join(before.current, 'global.json')),
    actualPrivateLedgerUnchangedSha256: before.privateLedgerSha256, actualNoShippingEditOrRestorationRequired: true,
    actualFixedReportBlob: before.fixedReportBlob,
});
const commandRows = fs.readdirSync(path.join(run, 'validation')).sort().map(label =>
{
    const commandFile = path.join(run, 'validation', label, 'command.json');
    if (!fs.existsSync(commandFile)) return null;
    const command = read(commandFile), result = read(path.join(run, 'validation', label, 'result.json'));
    return { label, command, result };
}).filter(Boolean);
fs.writeFileSync(path.join(run, 'validation-commands.md'),
    '# F133 actual activated commands and results\n\nEach exact PowerShell script activates the recorded repository environment first. Full stdout/stderr and the actual exit/command hashes are retained. Nothing in this case measures performance.\n\n' +
    '| Attempt | Exact command | Actual result | Complete streams |\n|---|---|---|---|\n' +
    commandRows.map(({ label, result }) => `| ${label} | [Activated command](validation/${label}/command.ps1), [arguments](validation/${label}/command.json) | Exit ${result.exitCode}: ${result.exitCode ? 'NETSDK1004 missing-assets preparation failure; subsequent restore/execution retained' : 'passed'} | [stdout](validation/${label}/stdout.txt), [stderr](validation/${label}/stderr.txt), [receipt](validation/${label}/result.json) |`).join('\n') +
    '\n\nThe original and default union integration commands each passed 34 individual XML executions. Four untimed common-probe executions each passed 28 observations. Failed initial preparations do not become passed by aggregation. No test is a fix red/green claim: no product fix was applied.\n',
    { flag: 'wx' });
fs.mkdirSync(target);
const copied = [], omitted = [];
function walk(directory, relative = '')
{
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)))
    {
        const next = relative ? relative + '/' + entry.name : entry.name;
        const source = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(source, next);
        else
        {
            assert.ok(entry.isFile());
            const bytes = fs.readFileSync(source), identity = { file: next, bytes: bytes.length, sha256: sha(bytes) };
            if (next.split('/').some(part => part === 'bin' || part === 'obj')) omitted.push(identity);
            else
            {
                const destination = path.join(target, ...next.split('/'));
                fs.mkdirSync(path.dirname(destination), { recursive: true });
                fs.writeFileSync(destination, bytes, { flag: 'wx' });
                copied.push({ ...identity, actualPrivateSource: source });
            }
        }
    }
}
walk(run);
for (const name of ['AutoPerf.UnionMetadata.csproj', 'Program.cs'])
{
    const source = path.join(common, name), bytes = fs.readFileSync(source), file = 'harness/' + name;
    fs.mkdirSync(path.join(target, 'harness'), { recursive: true });
    fs.writeFileSync(path.join(target, ...file.split('/')), bytes, { flag: 'wx' });
    copied.push({ file, bytes: bytes.length, sha256: sha(bytes), actualPrivateSource: source });
}
for (const name of ['F133-intake.mjs', 'F133-managed-command.mjs', 'F133-freeze.mjs', 'F133-reproduce-untimed.mjs', 'F133-verify.mjs', 'F133-build-capsule.mjs'])
{
    const source = path.join(session, name), bytes = fs.readFileSync(source);
    fs.writeFileSync(path.join(target, name), bytes, { flag: 'wx' });
    copied.push({ file: name, bytes: bytes.length, sha256: sha(bytes), actualPrivateSource: source });
}
write(path.join(target, 'authoritative-copies.json'), copied);
write(path.join(target, 'omitted-file-hashes.json'), {
    scope: 'Every individually inventoried private F133 case-directory bin/obj file; not the separate initial common-project intermediates, every repository output, or complete compiler inputs.',
    files: omitted,
});
fs.writeFileSync(path.join(target, '.gitattributes'), '* -text\n', { flag: 'wx' });
const files = [];
function inventory(directory, relative = '')
{
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)))
    {
        const next = relative ? relative + '/' + entry.name : entry.name;
        if (entry.isDirectory()) inventory(path.join(directory, entry.name), next);
        else
        {
            const bytes = fs.readFileSync(path.join(directory, entry.name));
            files.push({ file: next, bytes: bytes.length, sha256: sha(bytes) });
        }
    }
}
inventory(target);
write(path.join(target, 'capsule-file-hashes.json'), { findingId: 'F133', algorithm: 'SHA256', selfExcluded: true, files });
let links = 0;
for (const name of ['README.md', 'validation-commands.md'])
{
    const source = fs.readFileSync(path.join(target, name), 'utf8');
    for (const match of source.matchAll(/\]\(([^)]+)\)/g))
    {
        if (/^(?:https?:|#)/.test(match[1])) continue;
        assert.ok(fs.existsSync(path.join(target, ...decodeURI(match[1].split('#')[0]).split('/'))), match[1]);
        links++;
    }
}
const portable = spawnSync(process.execPath, [path.join(target, 'F133-verify.mjs'), target, '--require-seal'], { encoding: 'utf8' });
assert.equal(portable.status, 0, portable.stderr);
assert.equal(JSON.parse(portable.stdout).actualAuditPassed, true);
const preparation = { findingId: 'F133', recordedAt: new Date().toISOString(), immutableCoreFiles: files.length + 1,
    actualCopiedAuthoritativeFiles: copied.length, actualIndividuallyHashedOmittedFiles: omitted.length,
    actualAuthoredLocalLinksChecked: links, actualLiveAuditPassed: true, actualSealedCapsuleAuditPassed: true,
    actualOriginalDefaultExistingTestExecutions: 68, actualPublicValidationObservations: 112,
    actualSelectedSourcePePdbAssociations: 24, actualRuntimeAssemblyRecords: 88,
    actualTimingComparisons: 0, actualProgressNotYetAdvanced: true, actualFixedReportUnchanged: true };
write(path.join(run, 'capsule-preparation.json'), preparation);
console.log(JSON.stringify(preparation, null, 2));
