import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const implementation = path.join(session, 'autoperf-parallelism', 'finding-F147-F149-implementation-011');
const driver = path.join(session, 'F147-F149-compare-011.mjs');
const runner = path.join(session, 'F147-F149-run-variant-011.ps1');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const writeOnce = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.equal(process.argv.length, 3);
const powershell = process.argv[2];
assert.ok(path.isAbsolute(powershell) && fs.existsSync(powershell));
assert.equal(fs.existsSync(path.join(session, 'autoperf-parallelism', 'benchmark-exclusive.lease.json')), false);
const acceptanceFile = path.join(implementation, 'acceptance.json');
const acceptance = read(acceptanceFile), graphs = read(path.join(implementation, 'source-graphs.json'));
assert.equal(hash(acceptanceFile), 'ADCCCE55C334C43B59C9FD44ABE51483094F724BD6307AD32F287B70607ABE48');
assert.equal(hash(acceptanceFile), graphs.actualAcceptancePlanSha256);
const common = read(path.join(implementation, 'common-identity.json'));
const metadataFile = path.join(implementation, 'evidence', 'native-identity-acceptance-011.json');
const metadata = read(metadataFile);
assert.equal(metadata.passed, true);
assert.equal(metadata.actualAllNativeXmlRows, 120);
assert.equal(metadata.actualSelectedPairsFreshlyParsed.length, 7);
assert.equal(metadata.actualCausalPairImageComparisons.length, 4);
assert.equal(metadata.actualNoBenchmarkOrCounters, true);
const toolchain = new Map();
function selected(file, expected)
{
    const sha256 = hash(file);
    if (expected !== undefined) { assert.equal(sha256, expected); }
    toolchain.set(file.toLowerCase(), { file, bytes: fs.statSync(file).size, sha256 });
}
selected(process.execPath);
selected(powershell);
selected(path.join(common.graph, '.dotnet', 'dotnet.exe'));
for (const name of ['dotnet.dll', 'MSBuild.dll', 'vstest.console.dll'])
{
    selected(path.join(common.graph, '.dotnet', 'sdk', '12.0.100-alpha.1.26557.102', name));
}
const hostWitnesses = [];
for (const report of metadata.actualNativeReports)
{
    const xml = fs.readFileSync(report.file, 'utf8');
    const records = [...xml.matchAll(/ACTUAL_HOST module=(\S+) path=(.+?) sha256=([0-9A-F]{64}) version=(.+?) rollForward=Disable/g)];
    assert.ok(records.length >= 4);
    const names = new Set();
    for (const match of records)
    {
        const [, name, file, sha256, version] = match;
        selected(file, sha256);
        names.add(name);
        if (!hostWitnesses.some(w => w.report === report.file && w.name === name))
        {
            hostWitnesses.push({ report: report.file, name, file, sha256, version,
                actualWitnessBoundary: 'Actual untimed functional testhost module observation, not a future measured-process attestation.' });
        }
    }
    assert.deepEqual([...names].sort(), ['coreclr.dll', 'hostfxr.dll', 'hostpolicy.dll', 'testhost.exe']);
}
const commonCore = common.actualFiles.find(f => f.file === 'Microsoft.AspNetCore.Server.Kestrel.Core.dll');
assert.ok(commonCore);
const sourceRoles = Object.fromEntries(graphs.actualSourceGraphs.map(g => [g.role, {
    sourceCommit: g.sourceCommit, sourceGraph: g.graph, globalJsonSha256: g.actualGlobalJsonSha256,
    roleLabel: g.role === 'Original' ? 'Original' : 'CurrentDefaultSampleOwner'
}]));
for (const finding of ['F147', 'F149'])
{
    const root = path.join(session, 'autoperf-runs', finding);
    assert.equal(fs.existsSync(path.join(root, 'diagnostic-budget.json')), false);
    assert.equal(fs.existsSync(path.join(root, 'plan.json')), false);
    fs.mkdirSync(path.join(root, 'comparisons'), { recursive: true });
    const images = {}, observations = [];
    for (const role of ['Original', 'CurrentDefault'])
    {
        images[role] = {};
        for (const [variant, sourceVariant] of [['baseline', 'Baseline'], ['candidate', finding]])
        {
            const imageFile = path.join(implementation, 'evidence', `${role}-${sourceVariant}-image.json`);
            const image = read(imageFile);
            assert.equal(image.actualAcceptancePlanSha256, hash(acceptanceFile));
            assert.equal(image.actualNormalizedSourceIsExactPlannedVariant, true);
            images[role][variant] = image;
            const functionalFile = path.join(implementation, 'results', `${role}-${sourceVariant}-functional-1`, 'functional-acceptance.json');
            const functional = read(functionalFile);
            assert.equal(functional.actualRows.length, 20);
            assert.equal(functional.actualNoStopwatchOrAllocationCounterExecuted, true);
            assert.equal(functional.actualCommonFixtureCompiledOnce, true);
            assert.equal(functional.actualCommonImageFilesAllUnchanged, true);
            const receiptFile = path.join(implementation, 'logs', `${role}-${sourceVariant}-functional-1.receipt.json`);
            const receipt = read(receiptFile);
            assert.equal(receipt.exitCode, 0);
            assert.ok(receipt.ownedProcessObservations.every(p => p.originalProcessStillRunning === false));
            for (const file of [imageFile, functionalFile, receiptFile, functional.actualNativeTrx])
            {
                if (!observations.some(o => o.file === file)) { observations.push({ file, sha256: hash(file) }); }
            }
        }
    }
    for (const file of [metadataFile, path.join(implementation, 'source-graphs.json'),
        path.join(implementation, 'common-identity.json'),
        path.join(implementation, 'prepared', 'CompiledSampleProducerTests.cs'),
        path.join(implementation, 'prepared', 'Probe010.targets')])
    {
        observations.push({ file, sha256: hash(file) });
    }
    const plan = {
        definedAt: new Date().toISOString(), findingId: finding,
        acceptanceFile, acceptanceSha256: hash(acceptanceFile), acceptanceDefinedBeforeCandidatesOrCounters: true,
        protocol: acceptance.performanceAcceptance, sourceRoles, sourceAndRuntimeBoundary: acceptance.sourceAndRuntimeBoundary,
        admission: acceptance.admission, intentionalExclusions: acceptance.intentionalExclusions,
        candidate: finding === 'F147' ? acceptance.candidateF147 : acceptance.candidateF149,
        powershell, powershellSha256: hash(powershell), expectedMachine: process.env.COMPUTERNAME,
        driver, driverSha256: hash(driver), runner, runnerSha256: hash(runner),
        actualSameHostAndExactRuntimeWithinEachPairRequired: true,
        actualNoWholeDefaultFrameworkOrNativeTransportPerformanceClaim: true
    };
    const accepted = {
        recordedAt: new Date().toISOString(), findingId: finding, images, common,
        commonCoreSha256: commonCore.sha256, metadataAcceptance: { file: metadataFile, sha256: hash(metadataFile) },
        actualCausalPairDifferences: metadata.actualCausalPairImageComparisons.filter(p => p.finding === finding),
        actualAllImageFilesComparedPerPair: 156, actualPrefixExemptions: [],
        actualCommonAll224FilesAndRuntimeAll197FilesEqual: true,
        toolchainAndHostInputs: [...toolchain.values()], actualUntimedHostWitnesses: hostWitnesses,
        toolchainBoundary: 'Selected CLI/SDK/host files and complete declared sample/common/runtime scopes, not a full SDK/package/OS/compiler-input attestation.',
        actualNoMeasurementStarted: true
    };
    const functional = {
        recordedAt: new Date().toISOString(), findingId: finding,
        actualAllFourRequiredImagesPassed: true, actualRowsPerRequiredImage: 20,
        actualAllSixImagesAcrossBothFindingsPassedRows: 120, actualCommonCompiledOnceAndUnchanged: true,
        actualNoStopwatchOrAllocationCounterExecuted: true, actualAllObservedNativeProcessIdentitiesTerminal: true,
        actualExhaustiveProcessCensusClaimed: false, actualWholeDefaultFrameworkClaimed: false,
        runnerSha256: hash(runner), observations
    };
    for (const [stem, value] of [['plan', plan], ['accepted-images', accepted], ['functional-acceptance', functional]])
    {
        const file = path.join(root, stem + '.json');
        writeOnce(file, value);
        writeOnce(path.join(root, stem + '-seal.json'), { sealedAt: new Date().toISOString(),
            file, sha256: hash(file), actualSealedBeforeAnyWarmupOrAllocationCounter: true });
    }
    writeOnce(path.join(root, 'diagnostic-budget.json'), {
        findingId: finding, openedAt: new Date().toISOString(), closed: false,
        maximumAuthorizationsIncludingFailedOrPartial: 3, plannedAuthorizations: 2,
        requiredSourceRoles: ['Original', 'CurrentDefaultSampleOwner'],
        unusedThirdPermanentlyClosedAfterRequiredComparisons: true,
        noResultDrivenRetryOrTuning: true, noHistoricalReplay: true, noTimingYet: true, authorizations: []
    });
    console.log(JSON.stringify({ finding, actualSealedPlanSha256: hash(path.join(root, 'plan.json')),
        actualSealedImagesSha256: hash(path.join(root, 'accepted-images.json')),
        actualSealedFunctionalSha256: hash(path.join(root, 'functional-acceptance.json')),
        actualDriverSha256: hash(driver), actualRunnerSha256: hash(runner),
        actualNoTimingStartedOrAuthorizedByThisScript: true }));
}
