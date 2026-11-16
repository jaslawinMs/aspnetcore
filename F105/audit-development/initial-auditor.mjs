import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const [root, mode] = process.argv.slice(2);
assert(root && path.isAbsolute(root) && (!mode || mode === '--verify'));
const local = relative => path.join(root, ...relative.split(/[\\/]/));
const textAt = name => fs.readFileSync(name, 'utf8').replace(/^\uFEFF/, '');
const jsonAt = name => JSON.parse(textAt(name));
const digest = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
const gitBlob = value => crypto.createHash('sha1').update(Buffer.from(`blob ${value.length}\0`)).update(value).digest('hex');
const mappings = fs.existsSync(local('authoritative-copy-manifest.json')) ? jsonAt(local('authoritative-copy-manifest.json')) : null;
const mappedRuns = new Map((mappings ?? []).filter(row => row.kind.startsWith('run'))
    .map(row => [row.original.replaceAll('/', '\\'), row]));
function file(relative)
{
    if (!mappings)
    {
        return local(relative);
    }
    const mapped = mappedRuns.get(relative.replaceAll('/', '\\'));
    assert(mapped, 'Authoritative raw artifact mapping is required:' + relative);

    return local(mapped.destination);
}
const bytes = relative => fs.readFileSync(file(relative));
const text = relative => textAt(file(relative));
const read = relative => jsonAt(file(relative));
const hash = relative => digest(bytes(relative));
const equal = (actual, expected, message = 'Recorded evidence differs.') => assert.deepEqual(actual, expected, message);
const near = (actual, expected, message) => assert(Number.isFinite(actual) && Number.isFinite(expected) &&
    Math.abs(actual - expected) <= Math.max(1e-5, Math.abs(expected) * 1e-12), message);
const unique = items => equal(new Set(items).size, items.length, 'Duplicate recorded identity.');
const percentile = (sorted, percent) =>
{
    const position = (sorted.length - 1) * percent / 100;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);

    return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
};
const roundEven = value =>
{
    const lower = Math.floor(value);

    return value - lower === 0.5 ? lower + lower % 2 : Math.round(value);
};
const xmlDecode = value => value.replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const attributes = value => Object.fromEntries([...value.matchAll(/([\w:]+)="([^"]*)"/g)]
    .map(match => [match[1], xmlDecode(match[2])]));
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const harness = 'DFCEF05D3B14C362916FAAFA1A8C78B6A2B3C61A068702D08765C1E5312464A0';
const owner = '6C6655A731796009242B907B3BA44609044D24E0CF64B5018D9CCB121D5D4115';
const counts = [0, 1, 16, 128];
const labels = ['Concrete', 'Generic', 'NonGeneric', 'Retained'].flatMap(kind => counts.map(count => kind + count))
    .concat(['ValidateNull', 'ValidateEmpty', 'ValidateSuppressed', 'ValidateRemapped',
        'ValidateExtra16', 'ValidateExtra128', 'ValidateMetadata', 'ValidateStrategy']);
const manifest = read('original-manifest.json');
const decision = read('final-disposition.json');
const budget = read('measurement-budget.json');
equal([manifest.candidate, manifest.variant, manifest.baselineSourceRevision, manifest.sourceTrackedUnchanged,
    manifest.publicApiChanged, manifest.harnessSha256, manifest.actualOwners[0].sha256],
['F105', 'original', baseline, true, false, harness, owner]);
equal([decision.disposition, decision.sourceChanged, decision.compatibleImplementationSelected,
    decision.modifiedShippingBinaryBuilt, decision.modifiedBinaryCompatibilityFailureExecuted,
    decision.actualPublicResetConsumerExecutedOnOriginal, decision.formalApiReviewApprovalClaimed],
['rejected', false, false, false, false, true, false]);
equal([budget.closed, budget.maximumSourceComparisons, budget.startedSourceComparisons, budget.completedSourceComparisons,
    budget.originalProfilesStarted, budget.originalProfilesCompleted], [true, 3, 0, 0, 1, 1]);
if (mappings)
{
    unique(mappings.filter(row => row.kind.startsWith('run')).map(row => row.original));
    for (const row of mappings)
    {
        const content = fs.readFileSync(local(row.destination));
        equal([content.length, digest(content)], [row.bytes, row.sha256], 'Exact authoritative copy differs:' + row.original);
    }
}
const sourceCopies = read('producer-source-copies.json');
equal(sourceCopies.length, 20);
unique(sourceCopies.map(row => row.path));
const investigation = read('current-source-investigation.json');
const current = read('current-default-commit.json');
equal(investigation.currentDefaultRevision, current.sha);
equal([investigation.verifiedScopedSources, investigation.noShippingSourceChange,
    investigation.related70210StillHasInterfaceReturningEnumeration, investigation.fullFrameworkEnumerationAbsenceClaimed],
[20, true, true, false]);
const fetch = read('source-fetch-command.json');
equal([fetch.exitCode, fetch.actualFetchedMainRevision, fetch.capturedCurrentDefaultRevision,
    fetch.actualCapturedDefaultTree, fetch.canonicalSourceCameFromActualFetchedGitObjects],
[0, investigation.fetchedMainRevision, current.sha, current.commit.tree.sha, true]);
for (const source of sourceCopies)
{
    const raw = bytes(source.rawSnapshot);
    const canonical = bytes(source.canonicalSnapshot);
    const original = bytes(source.baselineSnapshot);
    equal([digest(raw), raw.length, digest(canonical), canonical.length, digest(original), original.length],
        [source.rawSha256, source.rawBytes, source.canonicalSha256, source.canonicalBytes, source.baselineSha256, source.baselineBytes]);
    equal([gitBlob(canonical), gitBlob(original), gitBlob(Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n')))],
        [source.currentDefaultGitBlob, source.baselineGitBlob, source.workingGitBlob]);
    equal([source.currentDefaultGitBlob, source.baselineGitBlob, source.equalityVerified],
        [source.workingGitBlob, source.workingGitBlob, true]);
}
const ownerSource = sourceCopies.find(row => row.path.endsWith('\\ValidationStateDictionary.cs'));
assert(ownerSource);
assert(text(ownerSource.rawSnapshot).includes('public IEnumerator<KeyValuePair<object, ValidationStateEntry>> GetEnumerator()'));
assert(text(ownerSource.rawSnapshot).includes('return ((IDictionary<object, ValidationStateEntry>)_inner).GetEnumerator();'));
const api = text(sourceCopies.find(row => row.path.endsWith('\\PublicAPI.Shipped.txt')).rawSnapshot).split(/\r?\n/)
    .filter(line => line.includes('ValidationStateDictionary.GetEnumerator()'));
equal(api, [investigation.existingPublicEnumerationApi]);
assert(api[0].includes('IEnumerator<'));
const related = read('related-70210-owner-content.json');
const relatedBytes = Buffer.from(related.content, 'base64');
equal([gitBlob(relatedBytes), digest(relatedBytes)], [related.sha, hash('related-70210-owner-canonical.cs')]);
const proposal = read('related-70210-pr.json');
const proposalFiles = read('related-70210-files.json');
equal(proposalFiles.length, 5);
assert(proposalFiles.every(row => row.blob_url.includes('/' + proposal.headRefOid + '/')));
equal(proposal.headRefOid, investigation.related70210Head);
assert(relatedBytes.toString('utf8').includes('public IEnumerator<KeyValuePair<object, ValidationStateEntry>> GetEnumerator()'));
const configuration = read('format-config-source-identity.json');
equal([configuration.rawSourceSha256, configuration.rawHarnessCopySha256], [hash('harness\\.editorconfig'), hash('harness\\.editorconfig')]);
equal([configuration.baselineGitBlob, configuration.currentDefaultGitBlob], [configuration.workingGitBlob, configuration.workingGitBlob]);
const formatting = read('harness-format-commands.json');
assert(formatting.length >= 1 && formatting.at(-1).exitCode === 0 && formatting.at(-1).arguments.includes('--verify-no-changes'));
equal([read('harness-build-initial-command.json').exitCode, read('harness-build-final-formatted-command.json').exitCode], [0, 0]);
assert(text('harness-build-initial.log').includes('warning CS8602:'));
assert(text('harness-build-final-formatted.log').includes('0 Warning(s)'));
const closure = read('execution-closure-original.json');
equal([closure.copiedFiles, closure.files.length, closure.declaredRuntimeAssets, closure.runtimeAssets.length], [305, 305, 126, 126]);
unique(closure.files.map(row => row.file));
const closureByName = new Map(closure.files.map(row => [row.file, row]));
equal(closureByName.get('AutoPerf.Benchmarks.dll').sha256, harness);
for (const actual of manifest.actualOwners)
{
    equal(closureByName.get(actual.assembly + '.dll').sha256, actual.sha256);
}
for (const asset of closure.runtimeAssets)
{
    equal(closureByName.get(asset.copied).sha256, asset.sha256);
}
equal(hash('execution-image-metadata\\original\\AutoPerf.Benchmarks.runtimeconfig.json'), manifest.runtimeConfigurationSha256);
equal(hash('execution-image-metadata\\original\\AutoPerf.Benchmarks.deps.json'), manifest.dependencyConfigurationSha256);
const runtimeConfig = read('execution-image-metadata\\original\\AutoPerf.Benchmarks.runtimeconfig.json').runtimeOptions;
const frameworks = runtimeConfig.frameworks ?? [runtimeConfig.framework];
equal([runtimeConfig.tfm, runtimeConfig.rollForward, frameworks.length, frameworks[0].name, frameworks[0].version,
    runtimeConfig.configProperties['System.GC.Server'], runtimeConfig.configProperties['System.GC.Concurrent']],
['net12.0', 'Disable', 1, 'Microsoft.NETCore.App', '12.0.0-alpha.1.26562.105', true, true]);
const pdbCommands = read('pdb-original-commands.json');
equal(pdbCommands.length, 17);
for (const command of pdbCommands)
{
    equal(command.exitCode, 0);
    const isHarness = command.kind === 'harness';
    const source = isHarness ? 'harness\\' + command.source : sourceCopies.find(row => row.path === command.source)?.rawSnapshot;
    assert(source);
    const basename = path.win32.basename(command.source, '.cs');
    const proof = read(`${isHarness ? 'harness' : 'owner'}-${basename}-pdb-original.json`);
    equal([proof.verified, proof.source_sha256, proof.actual_pdb_document_sha256], [true, hash(source), hash(source)]);
}
const pin = read('bdn-pinned-public-source.json');
equal([pin.revision, pin.benchmarkDotNetAssemblySha256, pin.freshNetworkRetrievalClaimed],
    ['6dcf438fc389d096f2797fc0815da2a85eb3a0d4', closureByName.get('BenchmarkDotNet.dll').sha256, false]);
for (const item of pin.files)
{
    equal([hash(item.file), bytes(item.file).length], [item.sha256, item.bytes]);
}
const inputHashes = new Map();
let inputs = 0;
function inputAt(relative, proof)
{
    assert(labels.includes(proof.label));
    const inputPath = `${relative}\\inputs\\${proof.fileName}`;
    equal([hash(inputPath), bytes(inputPath).length], [proof.sha256, proof.bytes]);
    const input = read(inputPath);
    equal(input.label, proof.label);
    if (inputHashes.has(proof.label))
    {
        equal(proof.sha256, inputHashes.get(proof.label), 'Exact original input bytes must match across frozen processes.');
    }
    else
    {
        inputHashes.set(proof.label, proof.sha256);
    }
    const validation = proof.label.startsWith('Validate');
    const count = validation ? ({ ValidateNull: 0, ValidateEmpty: 0, ValidateExtra16: 17, ValidateExtra128: 129 }[proof.label] ?? 1) :
        Number(proof.label.match(/\d+$/)[0]);
    equal([input.stateCount, input.entries.length], [count, count]);
    const expected = validation ? ['ValidateMetadata', 'ValidateSuppressed'].includes(proof.label) ? 0 :
        proof.label === 'ValidateStrategy' ? 1000 : 10101 :
        Array.from({ length: count }, (_, index) => index + 1 + ('entry-' + (index + 1)).length).reduce((a, b) => a + b, 0);
    equal(input.expectedChecksum, expected);
    if (validation)
    {
        assert(input.dictionaryProducer.startsWith('Actual DefaultModelBindingContext.CreateBindingContext'));
        equal([input.stateSuppliedToValidator, input.requiredErrorMessage, input.inputRootType],
            [proof.label !== 'ValidateNull', 'F105 required value.', 'AutoPerf.RequiredModel']);
        assert(input.providers.includes('Microsoft.AspNetCore.Mvc.DataAnnotations.DataAnnotationsModelValidatorProvider'));
        if (count)
        {
            equal(input.entries[0].keyToken, 'root');
            equal(input.entries[0].SuppressValidation, proof.label === 'ValidateSuppressed');
            equal(input.entries[0].metadataType, proof.label === 'ValidateMetadata' ? 'System.Object' : null);
            equal(input.entries[0].strategyType, proof.label === 'ValidateStrategy' ? 'AutoPerf.EmptyChildrenStrategy' : null);
        }
    }
    else
    {
        equal(input.entries.map(row => [row.keyToken, row.entryKey]),
            Array.from({ length: count }, (_, index) => ['key-' + (index + 1), 'entry-' + (index + 1)]));
    }
    inputs++;

    return input;
}
function contractAt(contract, input)
{
    equal([contract.label, contract.expectedChecksum, contract.first, contract.second, contract.stateCount],
        [input.label, input.expectedChecksum, input.expectedChecksum, input.expectedChecksum, input.stateCount]);
    const outcome = contract.outcome;
    if (input.label.startsWith('Validate'))
    {
        const none = ['ValidateMetadata', 'ValidateSuppressed', 'ValidateStrategy'].includes(input.label);
        equal([outcome.GetterCount, outcome.modelStateCount, outcome.strategyCalls, outcome.actualValidatorType],
            [none ? 0 : 1, none ? 0 : 1, input.label === 'ValidateStrategy' ? 1 : 0,
                'Microsoft.AspNetCore.Mvc.ModelBinding.Validation.DefaultObjectValidator']);
        equal(outcome.errors, none ? [] : [{ key: (input.label === 'ValidateRemapped' ? 'renamed.' : 'input.') + 'Name',
            error: 'F105 required value.', exception: null, validationState: 'Invalid' }]);
    }
    else
    {
        equal(outcome.actualIds, Array.from({ length: input.stateCount }, (_, index) => index + 1));
        equal(outcome.exactInsertedReferences, true);
        equal(outcome.representationProbeOutsideTimingAndNotAllocationProof, true);
        equal([outcome.enumeratorIsValueType, outcome.independentGetsReturnSameReference], [input.stateCount !== 0, input.stateCount === 0]);
        assert(outcome.enumeratorType.includes(input.stateCount ? 'Dictionary' : 'GenericEmptyEnumerator'));
        equal(outcome.retainedInterfaceType, input.label.startsWith('Retained') ? outcome.enumeratorType : null);
    }
}
function runtimeAt(relative)
{
    const runtime = read(`${relative}\\states\\runtime.json`);
    equal([runtime.ownerSha256, runtime.harnessSha256, runtime.architecture, runtime.serverGc, runtime.configuredConcurrentGc],
        [owner, harness, 'X64', true, true]);
    equal(runtime.mvcCoreSha256, manifest.actualOwners[1].sha256);
    equal(runtime.dataAnnotationsSha256, manifest.actualOwners[2].sha256);
    equal(runtime.profiles, labels);
    assert(runtime.processId > 0 && runtime.processorCount > 0 && runtime.baselineOnlyProfileNotOptimizationComparison);

    return runtime;
}
const calipers = [];
const contractsByLabel = new Map();
let independentContracts = 0;
for (const label of ['original', 'post-original'])
{
    const relative = `verification\\${label}`;
    const runtime = runtimeAt(relative);
    const execution = read(`${relative}\\execution.json`);
    equal([execution.exitCode, execution.developmentImage, execution.harnessSha256], [0, false, harness]);
    const probe = read(`${relative}\\states\\original-contract-resources.json`);
    equal([probe.ownerSha256, probe.harnessSha256, probe.processId, probe.contracts.length, probe.resources.length,
        probe.allOperationsCompletedAndChecksumsVerified, probe.sourceComparisons], [owner, harness, runtime.processId, 24, 120, true, 0]);
    unique(probe.contracts.map(row => row.contract.label));
    for (const item of probe.contracts)
    {
        const input = inputAt(relative, item.input);
        contractAt(item.contract, input);
        if (contractsByLabel.has(input.label))
        {
            equal(item.contract, contractsByLabel.get(input.label));
        }
        else
        {
            contractsByLabel.set(input.label, item.contract);
        }
        independentContracts++;
    }
    for (const current of labels)
    {
        const rows = probe.resources.filter(row => row.label === current);
        equal(rows.map(row => row.sample), [0, 1, 2, 3, 4]);
        for (const row of rows)
        {
            equal([row.operations, row.checksum], [65536, 65536 * contractsByLabel.get(current).expectedChecksum]);
            equal(row.allocatedAfter - row.allocatedBefore, row.allocatedBytes);
            near(row.bytesPerOperation, row.allocatedBytes / 65536, 'Actual precise process-wide caliper arithmetic.');
            equal(row.enclosingActualBdnGcHelperBytes, row.allocatedBytes + row.enclosingActualBdnGcHelperExtraBytes);
            assert(row.allocatedBytes >= 0 && row.enclosingActualBdnGcHelperExtraBytes >= 0);
            equal(row.enclosingActualBdnGcHelperBytesPerOperation, roundEven(row.enclosingActualBdnGcHelperBytes / 65536));
            assert(row.elapsedTimeSpanTicks > 0 && row.stopwatchFrequency > 0);
            calipers.push({ run: label, ...row });
        }
    }
    const semantics = probe.semanticControls;
    equal([semantics.shippedReturnPreserved, semantics.valueEqualDistinctKeysEstablished, semantics.actualReferenceIdentityLookupsPassed,
        semantics.actualValueEqualsCalls, semantics.actualValueHashCalls, semantics.liveKeyValueViewsObserveAddAndClear,
        semantics.hypotheticalStructReturnBinaryWasNotBuiltOrExecuted], [true, true, true, 0, 0, true, true]);
    equal(semantics.enumerators.map(row => row.kind), ['Concrete', 'Generic', 'NonGeneric']);
    assert(semantics.enumerators.every(row => row.independentInterleaving && row.publicResetRestarts && row.complete));
    equal(semantics.mutations.length, 9);
    for (const row of semantics.mutations)
    {
        equal([row.exception, row.remaining], row.mutation === 'Add' ? ['System.InvalidOperationException', -1] : [null, 0]);
    }
}
const selection = read('selected-owning-controls.json');
const testAudit = read('tests\\original\\test-audit.json');
const testSource = sourceCopies.find(row => row.path === selection.source);
assert(testSource);
equal([selection.expectedRows, selection.selectedInlineDataRows, selection.sourceSha256], [10, 0, hash(testSource.rawSnapshot)]);
for (const name of selection.factNames)
{
    assert(new RegExp('\\[Fact\\]\\s+public void ' + name + '\\(\\)').test(text(testSource.rawSnapshot)));
}
const expectedTests = selection.factNames.map(name => selection.className + '.' + name).sort();
const testExecution = read('tests\\original\\execution.json');
equal([testExecution.exitCode, testAudit.passed, testAudit.failed, testAudit.skipped], [0, 10, 0, 0]);
equal(testExecution.arguments[testExecution.arguments.indexOf('--filter') + 1].split('|').sort(),
    expectedTests.map(name => 'FullyQualifiedName=' + name).sort());
const trxPath = 'tests\\original\\owning-original.trx';
equal(hash(trxPath), testAudit.trxSha256);
const trx = text(trxPath);
const results = [...trx.matchAll(/<UnitTestResult\b([^>]*?)(?:\/>|>[\s\S]*?<\/UnitTestResult>)/g)].map(match => attributes(match[1]));
const definitions = [...trx.matchAll(/<UnitTest\b([^>]*?)>([\s\S]*?)<\/UnitTest>/g)].map(match =>
    ({ ...attributes(match[1]), body: match[2] }));
const entries = [...trx.matchAll(/<TestEntry\b([^>]*?)\/>/g)].map(match => attributes(match[1]));
equal([results.length, definitions.length, entries.length], [10, 10, 10]);
equal(results.map(row => row.testName).sort(), expectedTests);
unique(results.map(row => row.testId));
unique(results.map(row => row.executionId));
for (const result of results)
{
    equal(result.outcome, 'Passed');
    assert(Number(result.duration.replaceAll(':', '').replace('.', '.')) > 0, 'Actual positive test duration required.');
    const definition = definitions.find(row => row.id === result.testId);
    assert(definition);
    equal(definition.name, result.testName);
    const execution = attributes(definition.body.match(/<Execution\b([^>]*?)\/>/)[1]);
    const method = attributes(definition.body.match(/<TestMethod\b([^>]*?)\/>/)[1]);
    equal([execution.id, method.className.split(',')[0] + '.' + method.name], [result.executionId, result.testName]);
    assert(entries.some(row => row.testId === result.testId && row.executionId === result.executionId));
}
equal(testAudit.actualOwners, manifest.actualOwners);
const testProof = read('tests\\original\\actual-binary-execution-proof.json');
equal([testProof.actualOriginalRows, testProof.sourcePdbAssociations, testProof.actualOutputOwnerIdentities],
    [10, 1, manifest.actualOwners]);
const testPdb = read('tests\\original\\DefaultObjectValidatorTests-source-pdb.json');
equal([testPdb.verified, testPdb.source_sha256, testPdb.actual_pdb_document_sha256],
    [true, hash(testSource.rawSnapshot), hash(testSource.rawSnapshot)]);
for (const toolFile of testProof.evidenceToolSourceCopies)
{
    equal([hash('evidence-tool-source\\' + toolFile.source), toolFile.copySha256], [toolFile.sha256, toolFile.sha256]);
}
const toolPdb = read('evidence-tool-source-pdb.json');
equal([toolPdb.verified, toolPdb.source_sha256, toolPdb.actual_pdb_document_sha256],
    [true, hash('evidence-tool-source\\Program.cs'), hash('evidence-tool-source\\Program.cs')]);
const relative = 'measurements\\original';
const runtime = runtimeAt(relative);
const execution = read('execution-original.json');
equal([execution.exitCode, execution.expectedCases, execution.expectedRetainedResultsPerCase, execution.sourceComparison,
    execution.harnessSha256, execution.actualOwners], [0, 24, 8, false, harness, manifest.actualOwners]);
for (const [flag, expected] of [['--warmupCount', '3'], ['--iterationCount', '8'], ['--iterationTime', '100'], ['--outliers', 'DontRemove']])
{
    equal(execution.arguments[execution.arguments.indexOf(flag) + 1], expected);
}
assert(execution.arguments.includes('--inProcess') && Date.parse(execution.completedAt) > Date.parse(execution.startedAt));
const reportNames = fs.readdirSync(local(`${relative}\\results`)).filter(name => /-report-full.*\.json$/.test(name));
equal(reportNames.length, 1);
const report = read(`${relative}\\results\\${reportNames[0]}`);
equal([report.HostEnvironmentInfo.BenchmarkDotNetVersion, report.HostEnvironmentInfo.Architecture,
    report.HostEnvironmentInfo.ProcessorName, report.HostEnvironmentInfo.PhysicalProcessorCount,
    report.HostEnvironmentInfo.PhysicalCoreCount, report.HostEnvironmentInfo.LogicalCoreCount],
['0.13.0', 'X64', 'Unknown processor', null, null, null]);
equal(report.Benchmarks.length, 24);
unique(report.Benchmarks.map(row => row.Parameters));
const blocks = text(`${relative}\\console.log`).split(/^\/\/ Benchmark: /m).slice(1);
equal(blocks.length, 24);
const outcomes = [];
let warmups = 0;
let actualOverhead = 0;
for (const label of labels)
{
    const benchmark = report.Benchmarks.find(row => row.Parameters === 'Case=' + label);
    assert(benchmark && benchmark.Method === 'CompleteOwner' && benchmark.DisplayInfo.includes('OutlierMode=DontRemove') &&
        benchmark.DisplayInfo.includes('InProcessEmitToolchain'));
    const block = blocks.find(value => value.startsWith(benchmark.DisplayInfo));
    assert(block);
    const setup = read(`${relative}\\states\\setup-${label}.json`);
    equal([setup.label, setup.ownerSha256, setup.harnessSha256, setup.processId, setup.completeRunsCheckedOutsideTiming,
        setup.originalOnlyNotPerformanceComparison], [label, owner, harness, runtime.processId, 2, true]);
    contractAt(setup.contract, inputAt(relative, setup.input));
    equal(setup.contract, contractsByLabel.get(label));
    const marker = [...block.matchAll(/^AUTOPERF_F105_SETUP (\{[^\r\n]+\})/gm)];
    equal(marker.length, 1);
    equal(JSON.parse(marker[0][1]), setup);
    const raw = [...block.matchAll(/^Workload(Warmup|Actual|Result)\s+(\d+):\s+(\d+) op,\s+([\d.]+) ns,\s+([\d.]+) (ms|us|ns)\/op/gm)]
        .map(match => ({ stage: match[1], index: Number(match[2]), operations: Number(match[3]), nanoseconds: Number(match[4]),
            rounded: Number(match[5]), unit: match[6] }));
    equal(['Warmup', 'Actual', 'Result'].map(stage => raw.filter(row => row.stage === stage).length), [3, 8, 8]);
    for (const row of raw)
    {
        assert(row.operations > 0 && row.nanoseconds > 0 &&
            Math.abs(row.nanoseconds / row.operations / ({ ms: 1e6, us: 1e3, ns: 1 }[row.unit]) - row.rounded) <= 0.000050001);
    }
    const actual = raw.filter(row => row.stage === 'Actual');
    const result = raw.filter(row => row.stage === 'Result');
    const overhead = [...block.matchAll(/^OverheadActual\s+(\d+):\s+(\d+) op,\s+([\d.]+) ns/gm)]
        .map(match => ({ index: Number(match[1]), operations: Number(match[2]), nanoseconds: Number(match[3]) }));
    unique(overhead.map(row => row.index));
    assert(overhead.every(row => row.operations === actual[0].operations && row.nanoseconds >= 0));
    const overheadMedian = overhead.length ? percentile(overhead.map(row => row.nanoseconds).sort((a, b) => a - b), 50) : 0;
    equal(result.map(row => [row.index, row.operations, row.nanoseconds]),
        actual.map(row => [row.index, row.operations, Math.max(0, row.nanoseconds - overheadMedian)]));
    equal(benchmark.Measurements, result.map(row => ({ IterationMode: 'Workload', IterationStage: 'Result', LaunchIndex: 1,
        IterationIndex: row.index, Operations: row.operations, Nanoseconds: row.nanoseconds })));
    const samples = result.map(row => row.nanoseconds / row.operations);
    const sorted = [...samples].sort((a, b) => a - b);
    const mean = samples.reduce((a, b) => a + b, 0) / 8;
    const variance = samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / 7;
    const deviation = Math.sqrt(variance);
    const statistics = benchmark.Statistics;
    equal([statistics.N, statistics.OriginalValues], [8, samples]);
    for (const [field, expected] of Object.entries({ Mean: mean, Min: sorted[0], Max: sorted[7], Variance: variance,
        StandardDeviation: deviation, StandardError: deviation / Math.sqrt(8), Median: percentile(sorted, 50),
        Q1: percentile(sorted, 25), Q3: percentile(sorted, 75) }))
    {
        near(statistics[field], expected, 'Raw result arithmetic:' + label + '/' + field);
    }
    near(statistics.InterquartileRange, statistics.Q3 - statistics.Q1, 'Actual IQR.');
    near(statistics.LowerFence, statistics.Q1 - 1.5 * statistics.InterquartileRange, 'Actual lower fence.');
    near(statistics.UpperFence, statistics.Q3 + 1.5 * statistics.InterquartileRange, 'Actual upper fence.');
    equal(statistics.LowerOutliers, sorted.filter(value => value < statistics.LowerFence));
    equal(statistics.UpperOutliers, sorted.filter(value => value > statistics.UpperFence));
    for (const [field, value] of Object.entries(statistics.Percentiles))
    {
        near(value, percentile(sorted, Number(field.slice(1))), 'Actual R7 percentile.');
    }
    const interval = statistics.ConfidenceInterval;
    equal(interval.N, 8);
    near(interval.Mean, mean, 'Recorded confidence mean.');
    near(interval.StandardError, statistics.StandardError, 'Recorded confidence SE.');
    near(interval.Lower, mean - interval.Margin, 'Recorded confidence lower arithmetic.');
    near(interval.Upper, mean + interval.Margin, 'Recorded confidence upper arithmetic.');
    const gc = [...block.matchAll(/^GC:\s+(\d+) (\d+) (\d+) (\d+) (\d+)/gm)];
    equal(gc.length, 1);
    const [gen0, gen1, gen2, allocated, operations] = gc[0].slice(1).map(Number);
    equal([benchmark.Memory.Gen0Collections, benchmark.Memory.Gen1Collections, benchmark.Memory.Gen2Collections,
        benchmark.Memory.TotalOperations, benchmark.Memory.BytesAllocatedPerOperation],
    [gen0, gen1, gen2, operations, roundEven(allocated / operations)]);
    equal(operations, result[0].operations);
    for (const [id, expected] of [['Gen0Collects', gen0 * 1000 / operations], ['Gen1Collects', gen1 * 1000 / operations],
        ['Gen2Collects', gen2 * 1000 / operations], ['Allocated Memory', roundEven(allocated / operations)]])
    {
        near(benchmark.Metrics.find(metric => metric.Descriptor.Id === id)?.Value, expected, 'Raw actual GC/metric arithmetic.');
    }
    outcomes.push({ label, meanNs: mean, medianNs: statistics.Median, cvPercent: 100 * deviation / mean,
        bytesPerOperation: benchmark.Memory.BytesAllocatedPerOperation, actualOverheadSamples: overhead.length,
        actualMedianRawTotalOverheadNanoseconds: overheadMedian });
    warmups += 3;
    actualOverhead += overhead.length;
}
const result = {
    candidate: 'F105', disposition: 'rejected', qualification: decision.qualification, sourceComparisons: 0,
    maximumSourceComparisons: 3, comparisonBudgetClosed: true, originalProfiles: 1, frozenVariants: 1,
    actualBenchmarkOutcomes: 24, actualRetainedResultSamples: 192, actualWorkloadWarmups: warmups,
    actualRetainedOverheadSamples: actualOverhead, actualHashPidLinkedSetups: 24, actualInputProofs: inputs,
    inputOriginalLabels: labels.length, independentFrozenContractObservations: independentContracts,
    frozenProcessWideCaliperSamples: calipers.length, scopedCurrentBaselineWorkingSourceIdentities: 20,
    actualPdbSourceAssociationsPerVariant: 17, existingOriginalOwningTestRows: 10, owningTestSkips: 0,
    copiedApplicationClosureFiles: 305, declaredRuntimeAssets: 126, measuredCompatibleImprovementEstablished: false,
    modifiedSignatureBinaryBuiltOrExecuted: false, publicOriginalResetConsumerExecuted: true,
    formalApiApprovalClaimed: false, originalSourceChanged: false,
    actualMedianRawTotalOverheadSubtractionVerified: true, sampleAndGcRoundingAndR7ArithmeticVerified: true,
    recordedConfidenceIntervalArithmeticVerified: true, independentlyRecomputedConfidenceCriticalValues: false,
    publicAuditRehashesOmittedBinaryPdbOrRuntimePackBytes: false, sourcePdbAssociationNotMethodCoverage: true,
    scopedLookupSourceNotRepositoryWideEnumerationAbsenceProof: true,
    maximumCvPercent: Math.max(...outcomes.map(row => row.cvPercent)), outcomes,
    caliperRanges: labels.map(label => ({ label, min: Math.min(...calipers.filter(row => row.label === label).map(row => row.bytesPerOperation)),
        max: Math.max(...calipers.filter(row => row.label === label).map(row => row.bytesPerOperation)) }))
};
const lines = ['# F105 original public-owner pressure profile', '',
    '**Rejected incompatible struct-returning replacement;no compatible source comparison or improvement claimed.**',
    'One24-case original profile,8 retained results/3 warmups each,DontRemove,in-process,100ms requested.',
    'All values are warmed component measurements,not whole-request throughput or production frequencies.',
    '', '| Profile | Original mean ns/op | Original B/op | CV % | Raw overhead samples |',
    '|---|---:|---:|---:|---:|',
    ...outcomes.map(row => `| ${row.label} | ${row.meanNs.toFixed(3)} | ${row.bytesPerOperation} | ${row.cvPercent.toFixed(2)} | ${row.actualOverheadSamples} |`),
    '', '## Independent frozen-process precise allocation calipers', '',
    'Two actual original processes,5 samples per input/65536 completed operations per sample,16384 warmup operations.',
    'These process-wide totals retain background/transition allocations and all actual enclosing BDN-helper extras.',
    'Concrete16/128 can have near-zero samples in separate processes while this BDN profile reports56B.',
    'No JIT/escape-analysis or other cause was directly traced;do not erase either observation or assert universal boxing.',
    'Validation null-state has some approximately1472B calipers versus1408B later/BDN;all rows remain.',
    '', '| Profile | Original min B/op | Original max B/op |',
    '|---|---:|---:|',
    ...result.caliperRanges.map(row => `| ${row.label} | ${row.min.toFixed(6)} | ${row.max.toFixed(6)} |`),
    '', 'The actual visitor path reads state with TryGetValue. Extra16/128 means17/129 total stored entries,',
    'not timed enumeration of those entries. Dictionary/DI/model-metadata construction and state population',
    'are outside timing. Caller-retained interfaces deliberately characterize an escaping consumer.',
    '', `Raw audit:${result.actualBenchmarkOutcomes} outcomes/${result.actualRetainedResultSamples} retained results/${warmups} warmups/${actualOverhead} actual overhead samples/24 hash-PID setups/${inputs} exact input proofs/48 independent frozen contracts/240 process-wide calipers/10 exact original Facts/17 image source-PDB associations.`,
    'N-1 variance/SE,R7,fences,actual overhead/GC rounding and recorded CI arithmetic are independently checked;',
    'confidence-distribution critical values,omitted binary/PDB/runtime-pack bytes and method coverage are not.',
    'Source/API assessment is local,not formal approval or an executed modified-binary compatibility test.', ''];
const markdown = lines.join('\n');
if (mode === '--verify')
{
    equal(read('measurement-audit.json'), result);
    equal(text('original-profile.md'), markdown);
}
else
{
    fs.writeFileSync(local('measurement-audit.json'), JSON.stringify(result, null, 2) + '\n');
    fs.writeFileSync(local('original-profile.md'), markdown);
}
console.log(`F105 actual audit passed:${result.actualBenchmarkOutcomes} outcomes/192 results/${warmups} warmups/${actualOverhead} overhead/${inputs} exact inputs/48 contracts/240 calipers/10 Facts/17 image PDB-source associations;rejected,0 source comparisons.`);
