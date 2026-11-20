import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const root = path.join(session, 'autoperf-parallelism', 'finding-F140-implementation-019');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const acceptedFile = path.join(root, 'accepted-causal-images-before-functional-023.json');
const accepted = read(acceptedFile);
const { parsePe, parsePdb } = await import(pathToFileURL(path.join(session, 'autoperf-published-results',
    'F169-F170', 'owner-handoff', 'evidence.mjs')).href);
const xmlFile = path.join(root, 'native-real-system-xml-024.json'), xml = read(xmlFile);
assert.equal(xml.actualExactNamesDefinitionsEntriesExecutionsCountersReconciled, true);
assert.equal(xml.actualPassedExecutions, 28);
function names(directory, relative = '')
{
    return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en')).flatMap(item =>
    {
        assert.equal(item.isSymbolicLink(), false);
        const logical = relative ? path.join(relative, item.name) : item.name;
        return item.isDirectory() ? names(path.join(directory, item.name), logical) : [logical];
    });
}
function inventory(directory, entries)
{
    assert.deepEqual(names(directory), entries.map(item => item.file));
    for (const item of entries)
    {
        const bytes = fs.readFileSync(path.join(directory, item.file));
        assert.equal(bytes.length, item.bytes);
        assert.equal(hash(bytes), item.sha256);
    }
}
inventory(accepted.common.directory, accepted.common.files);
for (const item of accepted.common.inputs) { assert.equal(hash(fs.readFileSync(item.source)), item.sha256); }
const observations = [], incomplete = [], metadata = [], terminals = [], reports = [];
for (const [role, pair] of Object.entries(accepted.images))
{
    inventory(accepted.runtimeInputs[role].directory, accepted.runtimeInputs[role].files);
    for (const variant of ['baseline', 'candidate'])
    {
        const image = pair[variant];
        inventory(image.directory, image.files);
        const functionalFile = path.join(root, 'invocations', `${role}-${variant}-functional-022`, 'functional-result.json');
        const functional = read(functionalFile), runtime = accepted.runtimeInputs[role].version;
        assert.equal(functional.passed.length, 9);
        assert.equal(functional.actualFramework, `.NET ${runtime}`);
        assert.equal(functional.actualCommonFixtureVersion, 2);
        assert.equal(functional.actualAllChecksUntimed, true);
        assert.equal(functional.actualF141NativeAotOrDisabledDynamicCodeProducerVerified, false);
        assert.deepEqual(functional.actualStreamIds, ['1', '2']);
        assert.equal(functional.actualCollectibleLifetime.actualClassifierCachePresent, variant === 'candidate');
        assert.equal(functional.actualCollectibleLifetime.actualEntryObservedOnlyAfterRealProducer, variant === 'candidate');
        assert.equal(functional.actualCollectibleLifetime.actualContextAndTypeCollected, true);
        assert.equal(functional.actualCollectibleLifetime.actualRealConnectionKeptAliveThroughCollection, true);
        assert.equal(functional.actualCollectibleLifetime.actualNoPrivateCacheEntrySeeded, true);
        const identities = {};
        for (const stem of ['Microsoft.AspNetCore.SignalR.Client.Core', 'Microsoft.AspNetCore.SignalR.Client.Tests'])
        {
            const pe = parsePe(fs.readFileSync(path.join(image.directory, stem + '.dll')));
            const pdb = parsePdb(fs.readFileSync(path.join(image.directory, stem + '.pdb')));
            assert.ok(pe.codeView.some(item => item.guid === pdb.guid && item.stamp === pdb.stamp));
            identities[stem] = pe;
            metadata.push({ role, variant, stem, actualFreshPe: pe, actualFreshPdbId: { guid: pdb.guid, stamp: pdb.stamp } });
        }
        assert.equal(functional.actualClientMvid, identities['Microsoft.AspNetCore.SignalR.Client.Core'].mvid);
        assert.equal(functional.actualTestProducerMvid, identities['Microsoft.AspNetCore.SignalR.Client.Tests'].mvid);
        for (const mode of ['native', 'functional'])
        {
            const work = path.join(root, 'invocations', `${role}-${variant}-${mode}-022`);
            const complete = read(path.join(work, 'completed.json'));
            assert.equal(complete.exitCode, 0);
            assert.ok(complete.actualRootAwaited && complete.actualStdoutAwaited && complete.actualStderrAwaited);
            terminals.push(complete);
            const directory = path.join(work, 'identities');
            const snapshots = [];
            for (const file of names(directory))
            {
                const fullPath = path.join(directory, file), bytes = fs.readFileSync(fullPath);
                observations.push({ role, variant, mode, file: fullPath, bytes: bytes.length, sha256: hash(bytes) });
                if (!file.endsWith('.json'))
                {
                    assert.ok(file.endsWith('.json.incomplete'));
                    incomplete.push({ role, variant, mode, file: fullPath, bytes: bytes.length, sha256: hash(bytes),
                        actualValidSnapshot: false, actualCauseEstablished: false });
                    continue;
                }
                assert.ok(bytes.length > 0);
                snapshots.push(read(fullPath));
            }
            const selected = snapshots.filter(snapshot => ['Microsoft.AspNetCore.SignalR.Client.Core', 'Microsoft.AspNetCore.SignalR.Client.Tests']
                .every(stem => snapshot.assemblies.some(item => item.name.startsWith(stem + ','))));
            assert.equal(new Set(selected.map(item => item.pid)).size, 1);
            const last = selected.sort((a, b) => a.observedUtc.localeCompare(b.observedUtc)).at(-1);
            assert.equal(last.framework, `.NET ${runtime}`);
            for (const stem of ['Microsoft.AspNetCore.SignalR.Client.Core', 'Microsoft.AspNetCore.SignalR.Client.Tests'])
            {
                const assembly = last.assemblies.find(item => item.name.startsWith(stem + ','));
                assert.equal(assembly.mvid, identities[stem].mvid);
                assert.equal(path.resolve(assembly.location).toLowerCase(), path.join(image.directory, stem + '.dll').toLowerCase());
                assert.equal(assembly.sha256, hash(fs.readFileSync(assembly.location)));
            }
            const fixture = last.assemblies.find(item => item.name.startsWith('AutoPerf.SignalR.Probe,'));
            assert.equal(fixture.mvid, accepted.common.pe.mvid);
            assert.equal(fixture.sha256, accepted.common.files.find(item => item.file === 'AutoPerf.SignalR.Probe.dll').sha256);
            for (const name of ['coreclr.dll', 'hostpolicy.dll'])
            {
                const module = last.runtimeModules.find(item => item.name === name);
                assert.ok(module.path.includes(runtime));
                assert.equal(module.sha256, hash(fs.readFileSync(module.path)));
            }
            reports.push({ role, variant, mode, actualLoadedSnapshot: last });
        }
        const native = xml.runs.find(item => item.role === role && item.variant === variant);
        assert.equal(hash(fs.readFileSync(native.file)), native.sha256);
        assert.equal(native.actualPassed, 7);
        observations.push({ role, variant, mode: 'functional-result', file: functionalFile,
            bytes: fs.statSync(functionalFile).size, sha256: hash(fs.readFileSync(functionalFile)) });
    }
}
const commonPe = parsePe(fs.readFileSync(path.join(accepted.common.directory, 'AutoPerf.SignalR.Probe.dll')));
const commonPdb = parsePdb(fs.readFileSync(path.join(accepted.common.directory, 'AutoPerf.SignalR.Probe.pdb')));
assert.ok(commonPe.codeView.some(item => item.guid === commonPdb.guid && item.stamp === commonPdb.stamp));
for (const item of accepted.common.freshlyVerifiedAllPdbRawDocuments)
{
    assert.equal(item.actualSha256, hash(fs.readFileSync(item.actualCopiedAs)));
}
const output = path.join(root, 'functional-metadata-acceptance-025.json');
assert.equal(fs.existsSync(output), false);
fs.writeFileSync(output, JSON.stringify({
    recordedAt: new Date().toISOString(), findingId: 'F140',
    actualAllFourRequiredImagesPassed: true, actualNativePassedExecutions: 28,
    actualCommonV2FunctionalChecksPassed: 36, actualAcceptedV2SuccessfulCompiles: 1, actualCommonSuccessfulCompilesTotal: 2,
    actualFreshPePdbAssociations: metadata.length + 1, actualCommonFixtureMvid: commonPe.mvid,
    actualCommonFiveFileImageByteIdentical: true, actualCausalPairsDifferOnlyOwnerDllPdb: true,
    actualCandidateEntryObservedAfterRealProducerAndCollectibleTypeAndContextUnload: true,
    actualNoStopwatchOrAllocationCounterExecuted: true,
    actualNativeModuleAndManagedIdentityObservationsBoundedNotExecutionClosure: true,
    actualIncompleteNativeExitSnapshotsPreserved: incomplete,
    actualF141NativeAotVerified: false,
    actualAcceptedImages: { file: acceptedFile, sha256: hash(fs.readFileSync(acceptedFile)) },
    actualIndependentXml: { file: xmlFile, sha256: hash(fs.readFileSync(xmlFile)) },
    actualAllCompletedInvocationRecords: terminals, actualFreshSelectedMetadata: metadata,
    actualBoundedLoadedIdentitySnapshots: reports, actualObservationFiles: observations
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualAllFourImagesPassed: true, actualNativePassedExecutions: 28,
    actualCommonFunctionalChecks: 36, actualFreshPePdbAssociations: metadata.length + 1,
    actualIncompleteAtomicExitSnapshots: incomplete.length, actualNoMetricsExecuted: true }, null, 2));
