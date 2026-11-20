import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F142');
const common = path.join(session, 'autoperf-runs', 'F142-common');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const rows = ['Undocumented', 'Zero', 'One', 'Four', 'Aliased', 'Ignored', 'Body'];
const frozen = path.join(run, 'canonical-preflight-inputs-005');
const planSha256 = hash(path.join(run, 'plan.json'));
assert.equal(planSha256, read(path.join(run, 'plan-seal.json')).sha256);
const budget = read(path.join(run, 'diagnostic-budget.json'));
assert.equal(budget.authorizations.length, 0); assert.equal(budget.closed, false);
assert.equal(fs.existsSync(path.join(session, 'autoperf-parallelism', 'benchmark-exclusive.lease.json')), false);
const roots = { Original: path.join(run, 'canonical-preflight-005', 'Original'),
    Candidate: path.join(run, 'canonical-candidate-001', 'Candidate') };
const sourcePins = { Original: '37e809ead5824bc753a1c3d56f11615bdb1296c5', Candidate: 'c663c44e4d0e1d5bed71200ab191a728f9f9c5d9' };
const images = {};
const observations = {};
for (const role of ['Original', 'Candidate'])
{
    const root = roots[role], completion = read(path.join(root, 'completed.json'));
    assert.equal(completion.actualSourceRevision, sourcePins[role]);
    assert.equal(completion.actualAllCommandsCompleted, true);
    assert.equal(completion.actualProtectedGlobalJsonUnchanged, true);
    assert.equal(completion.actualNoCandidateOrShippingSourceChange, role === 'Original');
    assert.equal(completion.actualTiming, false); assert.equal(completion.actualUntimedMeasurementSetupVerified, true);
    for (const command of read(path.join(root, 'commands.json')))
    {
        assert.equal(command.exitCode, 0, `Unexpected preparation failure: ${role}/${command.label}`);
        assert.ok(command.actualOwnedChildPid > 0 && command.completedAt);
    }
    const documents = fs.readFileSync(path.join(root, 'characterize-001.stdout.txt'), 'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line)).filter(item => item.profile);
    const setups = fs.readFileSync(path.join(root, 'measurement-verify-001.stdout.txt'), 'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line));
    assert.deepEqual(documents.map(item => item.profile), rows);
    assert.deepEqual(setups.map(item => item.profile), rows);
    for (const row of documents) { assert.equal(row.passed, true); assert.equal(row.timed, false); }
    for (const row of setups) { assert.equal(row.passed, true); assert.equal(row.measured, false); assert.deepEqual(row.samples, []); }
    observations[role] = setups;
    for (const file of read(path.join(frozen, 'input-seal.json')).actualExactInputs)
    {
        assert.equal(hash(path.join(frozen, ...file.file.split('/'))), file.sha256);
        if (file.file !== 'Invoke-Characterization.ps1')
        {
            assert.equal(hash(path.join(root, 'exact-inputs', ...file.file.split('/'))), file.sha256);
        }
    }
    const inventory = path.join(root, 'measurement-consumer-inventory.json');
    const consumer = path.join(root, 'measurement-consumer');
    assert.equal(read(inventory).PlatformVersion, '12.0.0-alpha.1.26565.104');
    for (const file of read(inventory).Files)
    {
        const absolute = path.join(consumer, file.File);
        assert.equal(fs.statSync(absolute).size, file.Bytes); assert.equal(hash(absolute), file.Sha256);
    }
    images[role] = { sourceRevision: sourcePins[role], consumer, inventory, inventorySha256: hash(inventory),
        canonicalDocuments: path.join(root, 'observations'), generatedOwnerSha256: setups[0].actualGeneratedOwnerSha256 };
    assert.equal(hash(path.join(consumer, 'AutoPerf.F142.GeneratedOwner.dll')), images[role].generatedOwnerSha256);
}
for (const [index, profile] of rows.entries())
{
    assert.deepEqual(fs.readFileSync(path.join(images.Original.canonicalDocuments, profile + '.json')),
        fs.readFileSync(path.join(images.Candidate.canonicalDocuments, profile + '.json')));
    assert.equal(observations.Original[index].expectedOperation, observations.Candidate[index].expectedOperation);
}
const originalDependencies = read(images.Original.inventory).Files.filter(file => !file.File.startsWith('AutoPerf.F142.'));
const candidateDependencies = read(images.Candidate.inventory).Files.filter(file => !file.File.startsWith('AutoPerf.F142.'));
assert.deepEqual(candidateDependencies, originalDependencies, 'All non-fixture consumer dependencies must be byte-identical.');
const git = args => execFileSync('git', ['--no-pager', '-C', String.raw`C:\src\aspnetcore`, ...args], { encoding: 'utf8' }).trim();
assert.equal(git(['rev-parse', 'HEAD']), sourcePins.Candidate);
assert.equal(git(['diff', '--numstat', sourcePins.Original, sourcePins.Candidate]), '2\t1\tsrc/OpenApi/gen/XmlCommentGenerator.Emitter.cs');
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
const actualRuntime = '12.0.0-alpha.1.26565.104';
const runtimeRoot = path.join(String.raw`C:\src\aspnetcore\.dotnet\shared\Microsoft.NETCore.App`, actualRuntime);
const launcher = path.join(common, 'Invoke-MeasurementChild.ps1');
const runtimeFiles = [String.raw`C:\src\aspnetcore\.dotnet\dotnet.exe`,
    ...['System.Private.CoreLib.dll', 'coreclr.dll', 'clrjit.dll', 'hostpolicy.dll'].map(file => path.join(runtimeRoot, file))]
    .map(file => ({ path: file, sha256: hash(file) }));
write(path.join(run, 'accepted-images.json'), { recordedAt: new Date().toISOString(), actualBeforeAnyTiming: true, actualPlanSha256: planSha256,
    actualRuntime, roles: images, actualSevenCompleteDocumentsAndOperationSnapshotsByteIdentical: true,
    actualIdenticalNonFixtureDependencyFiles: originalDependencies.length,
    inputSealSha256: hash(path.join(frozen, 'input-seal.json')), runtimeFiles,
    protectedGlobalJsonSha256: hash(String.raw`C:\src\aspnetcore\global.json`),
    driverSha256: hash(path.join(session, 'F142-compare.mjs')), launcher, launcherSha256: hash(launcher),
    powerShell: String.raw`C:\Program Files\PowerShell\7\pwsh.exe`,
    processOnlyRuntimeConfiguration: { DOTNET_TieredCompilation: '0', COMPlus_TieredCompilation: '0',
        reason: 'Identical optimized non-tiered child configuration, pinned before first timing. Not a machine-wide change or application-tuning recommendation.' },
    scope: 'Warm isolated actual generated transformer; real provider-produced operation/context. Selected runtime/source/image checks, not full compiler-input or loader attestation.',
    boundariesNotClaimed: ['whole-document or server throughput', 'Native AOT/trimming', 'runtime12.0.0-alpha.1.26568.110', 'a dedicated idle machine'] });
write(path.join(run, 'accepted-images-seal.json'), { recordedAt: new Date().toISOString(), sha256: hash(path.join(run, 'accepted-images.json')), actualBeforeAnyTiming: true });
fs.mkdirSync(path.join(run, 'comparisons'));
console.log(JSON.stringify({ actualCandidateSourceRevision: sourcePins.Candidate, actualOriginalAndCandidateCorrectnessRows: 14,
    actualOriginalAndCandidateUntimedSetupRows: 14, actualIdenticalNonFixtureDependencies: originalDependencies.length,
    actualAcceptedImagesSha256: hash(path.join(run, 'accepted-images.json')), actualAuthorizationsStillZero: true }, null, 2));
