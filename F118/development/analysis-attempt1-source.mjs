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
const copies = fs.existsSync(local('authoritative-copy-manifest.json')) ? jsonAt(local('authoritative-copy-manifest.json')) : null;
const mappings = new Map((copies ?? []).filter(row => row.kind.startsWith('run')).map(row => [row.original.replaceAll('/', '\\'), row]));
const equal = (a, b, label = 'Evidence differs.') => assert.deepEqual(a, b, label);
const near = (a, b, label = 'Numerical evidence differs.') => assert(Number.isFinite(a) && Number.isFinite(b) &&
    Math.abs(a - b) <= Math.max(1e-5, Math.abs(b) * 1e-12), label);
const unique = values => equal(new Set(values).size, values.length);
function file(relative)
{
    if (!copies) return local(relative);
    const row = mappings.get(relative.replaceAll('/', '\\')); assert(row, 'Missing authoritative artifact:' + relative);

    return local(row.destination);
}
const text = relative => textAt(file(relative)), read = relative => jsonAt(file(relative));
const hash = relative => digest(fs.readFileSync(file(relative)));
const percentile = (sorted, p) =>
{
    const rank = (sorted.length - 1) * p / 100, lower = Math.floor(rank), upper = Math.ceil(rank);

    return sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower);
};
const roundEven = value => value - Math.floor(value) === 0.5 ? Math.floor(value) + Math.floor(value) % 2 : Math.round(value);
if (copies)
{
    unique(copies.map(row => row.destination)); unique([...mappings.keys()]);
    for (const row of copies) equal([digest(fs.readFileSync(local(row.destination))), fs.statSync(local(row.destination)).size], [row.sha256, row.bytes], row.original);
}
const source = read('current-source-investigation.json');
equal([source.baseline, source.freshDefault, source.exactScopedIdentities, source.scopedSources],
['37e809ead5824bc753a1c3d56f11615bdb1296c5', '3cd798fe4a76075f68624e8f4a8567aab359ae46', 20, 20]);
equal(source.scopedSourceIdentities.length, 20); unique(source.scopedSourceIdentities.map(row => row.path));
const ready = { original: read('original-ready.json'), candidate1: read('candidate1-ready.json') };
const manifests = Object.fromEntries(Object.entries(ready).map(([variant, value]) => [variant, read(value.manifest)]));
const closures = Object.fromEntries(Object.entries(ready).map(([variant, value]) => [variant, read(value.closureFile)]));
const primary = 'src\\Mvc\\Mvc.Razor\\src\\TagHelpers\\UrlResolutionTagHelper.cs';
const owners = ['Microsoft.AspNetCore.Mvc.Razor', 'Microsoft.AspNetCore.Razor.Runtime', 'Microsoft.AspNetCore.Razor',
    'Microsoft.AspNetCore.Html.Abstractions', 'Microsoft.AspNetCore.Mvc.Core', 'Microsoft.Extensions.ObjectPool'];
for (const row of source.scopedSourceIdentities)
{
    const raw = fs.readFileSync(file('producer-source\\' + row.path)), canonical = Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n'));
    equal([digest(raw), digest(canonical)], [row.workingRawSha256, row.baselineCanonicalSha256]);
    equal(hash('baseline-canonical\\' + row.path), digest(canonical));
    equal(hash('current-default-canonical\\' + row.path), digest(canonical));
    equal(hash(ready.original.sourceRelative + '\\' + row.path), digest(raw));
    if (row.path !== primary) equal(hash(ready.candidate1.sourceRelative + '\\' + row.path), digest(raw));
}
const budget = read('measurement-budget.json'), disposition = read('final-evaluation.json');
equal([budget.maximumSourceComparisons, budget.startedSourceComparisons, budget.completedSourceComparisons,
    budget.candidateSourceShapes.length, budget.originalProfilesStarted, budget.candidateProfilesStarted, budget.completedProfiles.length, budget.closed],
[3, 3, 3, 1, 3, 3, 6, true]);
equal(budget.completedProfiles, ['round1-original', 'round1-candidate1', 'round2-candidate1', 'round2-original', 'round3-original', 'round3-candidate1']);
const candidateSourceHash = hash(ready.candidate1.sourceRelative + '\\' + primary);
equal(candidateSourceHash, budget.candidateSourceShapes[0].sourceSha256);
equal(candidateSourceHash, manifests.candidate1.sourceSha256);
equal(candidateSourceHash, disposition.sourceSha256);
const before = text(ready.original.sourceRelative + '\\' + primary).replace(/\r\n/g, '\n');
const after = text(ready.candidate1.sourceRelative + '\\' + primary).replace(/\r\n/g, '\n');
const expectedSource = before
    .replace('using System.Diagnostics.CodeAnalysis;\n', 'using System.Diagnostics.CodeAnalysis;\nusing System.Text;\n')
    .replace('using Microsoft.AspNetCore.Razor.TagHelpers;\n', 'using Microsoft.AspNetCore.Razor.TagHelpers;\nusing Microsoft.Extensions.ObjectPool;\n')
    .replace('    private static readonly Dictionary<string, string[]> ElementAttributeLookups =',
        '    private static readonly ObjectPool<StringBuilder> StringBuilderPool = ObjectPool.Create(new StringBuilderPooledObjectPolicy());\n\n    private static readonly Dictionary<string, string[]> ElementAttributeLookups =')
    .replace([
        '                        using (var writer = new StringWriter())',
        '                        {',
        '                            htmlContent.WriteTo(writer, HtmlEncoder);',
        '                            stringValue = writer.ToString();',
        '                        }'
    ].join('\n'), [
        '                        var builder = StringBuilderPool.Get();',
        '                        try',
        '                        {',
        '                            using (var writer = new StringWriter(builder))',
        '                            {',
        '                                htmlContent.WriteTo(writer, HtmlEncoder);',
        '                                stringValue = writer.ToString();',
        '                            }',
        '                        }',
        '                        finally',
        '                        {',
        '                            StringBuilderPool.Return(builder);',
        '                        }'
    ].join('\n'));
equal(after, expectedSource, 'Surgical private pooling seam;all other existing source must remain unchanged.');
equal(closures.original.files.map(row => row.file), closures.candidate1.files.map(row => row.file));
equal(closures.original.files.filter(row => row.sha256 !== closures.candidate1.files.find(other => other.file === row.file).sha256).map(row => row.file).sort(),
['Microsoft.AspNetCore.Mvc.Razor.dll', 'Microsoft.AspNetCore.Mvc.Razor.pdb']);
for (const variant of ['original', 'candidate1'])
{
    const manifest = manifests[variant], closure = closures[variant];
    equal([manifest.candidate, manifest.variant, manifest.actualTestedProducerMatches, manifest.semanticRows, closure.copiedFiles,
        closure.files.length, closure.declaredRuntimeAssets, closure.runtimeAssets.length, closure.onlyMicrosoftNetCoreFramework],
    ['F118', variant, true, 38, 284, 284, 118, 118, true]);
    unique(closure.files.map(row => row.file));
    for (const row of manifest.executionIdentities) equal(closure.files.find(item => item.file === row.file)?.sha256, row.sha256);
    for (const row of closure.runtimeAssets) equal(closure.files.find(item => item.file === row.copied)?.sha256, row.sha256);
    if (!copies)
    {
        for (const row of closure.files) equal([hash(manifest.imageRelative + '\\' + row.file), fs.statSync(file(manifest.imageRelative + '\\' + row.file)).size], [row.sha256, row.bytes]);
    }
    const config = read(manifest.imageRelative + '\\AutoPerf.Benchmarks.runtimeconfig.json').runtimeOptions;
    equal([config.tfm, config.rollForward, config.framework.name, config.framework.version,
        config.configProperties['System.GC.Server'], config.configProperties['System.GC.Concurrent']],
    ['net12.0', 'Disable', 'Microsoft.NETCore.App', '12.0.0-alpha.1.26562.105', true, true]);
    for (const name of ['Program.cs', 'Workloads.cs', 'ParallelWork.cs', 'Controls.cs', 'SettingsPreservingEmitToolchain.cs', 'AutoPerf.Benchmarks.csproj'])
        equal(hash(ready.original.sourceRelative + '\\harness\\' + name), hash(manifest.sourceRelative + '\\harness\\' + name));
}
assert(text(ready.original.sourceRelative + '\\harness\\Program.cs').includes('.WithPowerPlan(Guid.Empty)'));
assert(!/(?:\.PriorityClass|Thread\.CurrentThread\.Priority|\.ProcessorAffinity)\s*=(?!=)/.test(text(ready.original.sourceRelative + '\\harness\\SettingsPreservingEmitToolchain.cs')));
assert(text('investigation\\bdn-memory-accounting\\GcStats.cs').includes('GetTotalAllocatedBytesDelegate.Invoke(true)'));
equal(read('investigation\\bdn-memory-accounting\\execution.json').exitCode, 0);
const runtimeInventory = read('runtime-inventory.json');
equal([runtimeInventory.runtime, runtimeInventory.files.length], ['12.0.0-alpha.1.26562.105', 200]);
unique(runtimeInventory.files.map(row => row.file));
if (!copies)
{
    for (const row of runtimeInventory.files)
        equal([digest(fs.readFileSync(path.join(runtimeInventory.dotnetRoot, row.file))), fs.statSync(path.join(runtimeInventory.dotnetRoot, row.file)).size], [row.sha256, row.bytes]);
}
const specs = [
    ['PreparedShort', 'Prepared', 64], ['Prepared256', 'Prepared', 256], ['Prepared1K', 'Prepared', 1024],
    ['Prepared2K', 'Prepared', 2048], ['Prepared4K', 'Prepared', 4096], ['PreparedOver4K', 'Prepared', 4097],
    ['Prepared8K', 'Prepared', 8192], ['PreparedEncoded1K', 'Prepared', 1024, 'General', false, true],
    ['PreparedUrl64', 'Prepared', 64, 'General', true], ['PreparedUrl1K', 'Prepared', 1024, 'General', true],
    ['PreparedTwoAttrs', 'Prepared', 1024, 'General', false, false, 2],
    ['RunnerShort', 'Runner', 64], ['Runner1K', 'Runner', 1024], ['Runner8K', 'Runner', 8192],
    ['RunnerUrl', 'Runner', 64, 'General', true], ['RunnerTwoAttrs', 'Runner', 1024, 'General', false, false, 2],
    ['PageBuffered1K', 'Page', 1024], ['StringControl1K', 'Prepared', 1024, 'String'],
    ['HtmlStringControl1K', 'Prepared', 1024, 'HtmlString'], ['NullTagControl', 'Prepared', 1024, 'NullTag'],
    ['UnknownTagControl', 'Prepared', 1024, 'UnknownTag'], ['NonContentBoolControl', 'Prepared', 1024, 'Bool'],
    ['Parallel1K', 'Parallel', 1024], ['ParallelFast', 'Parallel', 1024, 'String']
].map(([Label, Mode, Length, Kind = 'General', Url = false, Encoded = false, Attributes = 1]) => ({ Label, Mode, Length, Kind, Url, Encoded, Attributes }));
const labels = specs.map(spec => spec.Label), fixtureRoot = ready.original.fixtureRelative, fixture = read(fixtureRoot + '\\manifest.json');
equal(ready.candidate1.fixtureRelative, fixtureRoot);
equal(fixture.cases.map(row => row.Label), labels);
const encode = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('\u00E9', '&#xE9;');
for (const spec of specs)
{
    const row = fixture.cases.find(row => row.Label === spec.Label), input = read(`${fixtureRoot}\\inputs\\${spec.Label}.json`);
    const prefix = spec.Url ? '~/' : '/static/', payload = prefix + (spec.Encoded ? 'a&<\u00E9' : 'x').repeat(spec.Length).slice(0, spec.Length - prefix.length);
    const attributes = Array.from({ length: spec.Attributes }, (_, index) =>
        ({ Name: spec.Attributes === 2 ? (index === 0 ? 'archive' : 'data') : 'href', style: index === 0 ? 'DoubleQuotes' : 'SingleQuotes' }));
    equal(input, { ...spec, payload, inputContentType: spec.Kind === 'String' ? 'System.String' : spec.Kind === 'Bool' ? 'System.Boolean'
        : spec.Kind === 'HtmlString' ? 'Microsoft.AspNetCore.Html.HtmlString' : 'Microsoft.AspNetCore.Razor.TagHelpers.DefaultTagHelperContent',
        attributes, pathBase: '/app&root', producerOrder: -2000, resolverOrder: -1999,
        workers: spec.Mode === 'Parallel' ? 12 : 0, callsPerWorker: spec.Mode === 'Parallel' ? 64 : 0 });
    const output = read(`${fixtureRoot}\\expected\\${spec.Label}.json`);
    if (spec.Mode === 'Parallel')
    {
        equal(output, { workers: 12, callsPerWorker: 64, totalAttributeCalls: 768, contentLengthPerCall: spec.Length,
            checksum: spec.Length * 768, expectedChecksum: spec.Length * 768 });
    }
    else
    {
        let value = spec.Kind === 'Bool' ? 'True' : spec.Encoded ? encode(payload) : payload;
        if (spec.Url) value = '/app&amp;root/' + value.slice(2);
        const type = spec.Kind === 'String' ? 'System.String' : spec.Kind === 'Bool' ? 'System.Boolean'
            : ['NullTag', 'UnknownTag'].includes(spec.Kind) ? 'Microsoft.AspNetCore.Razor.TagHelpers.DefaultTagHelperContent'
                : spec.Url ? 'Microsoft.AspNetCore.Mvc.Razor.TagHelpers.UrlResolutionTagHelper+EncodeFirstSegmentContent' : 'Microsoft.AspNetCore.Html.HtmlString';
        equal(output, { tagName: spec.Kind === 'NullTag' ? null : spec.Attributes === 2 ? 'object' : spec.Kind === 'UnknownTag' ? 'div' : 'a',
            attributes: attributes.map((attribute, index) => ({ Name: attribute.Name, valueType: type, style: attribute.style,
                rendered: attribute.Name + '=' + (index === 0 ? '"' : "'") + value + (index === 0 ? '"' : "'") })),
            normalRazorBufferedProducerBypassesGeneralWriter: spec.Mode === 'Page' });
    }
    equal([hash(`${fixtureRoot}\\inputs\\${spec.Label}.json`), hash(`${fixtureRoot}\\expected\\${spec.Label}.json`)], [row.inputSha256, row.outputSha256]);
    for (const part of ['inputs', 'expected'])
        equal(hash(`fixtures\\original-prep1\\${part}\\${spec.Label}.json`), hash(`${fixtureRoot}\\${part}\\${spec.Label}.json`));
}
const renderControls = read(fixtureRoot + '\\render-controls.json');
equal(renderControls.rows.length, 9);
for (let index = 0; index < 3; index++)
{
    const culture = ['en-US', 'fr-FR', 'tr-TR'][index];
    equal(renderControls.rows[index], { name: 'culture', culture, actual: `href="/${index === 0 ? '1234.5' : '1234,5'}"`,
        FormatProviderName: culture, NewLineAtEntry: '\r\n', WriterType: 'System.IO.StringWriter' });
}
equal(renderControls.rows[3], { name: 'throw-partial-then-clean', actualException: 'AutoPerf.Controls+ProbeException', disposed: true,
    clean: 'href="/clean"', nextWriterNewLine: '\r\n' });
equal(renderControls.rows[4], { name: 'reentrant-real-process', actual: 'href="/before|href="/inner"|after"' });
for (let index = 5; index < 8; index++)
{
    const value = renderControls.rows[index], trimmed = value.payload.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '');
    equal(value.actual, 'href="' + (trimmed.startsWith('~/') ? '/app&amp;root/' + trimmed.slice(2) : value.payload) + '"');
}
equal(renderControls.rows[8], { name: 'real-resource-asset-collection', actual: 'href="/app&amp;root/a.fingerprint.js"',
    endpointUrlHelperType: 'Microsoft.AspNetCore.Mvc.Routing.EndpointRoutingUrlHelper' });
equal([renderControls.writerBorrowedSynchronously, renderControls.postDisposalBuilderOwnershipOrFreshCapacityPromiseClaimed], [true, false]);
let runtimeRecords = 0, contracts = 0, calipers = 0, retained = 0, warmups = 0, overheads = 0, setups = 0, settingsRecords = 0, testRows = 0, pdbDocuments = 0;
const expectedSettings = { processPriority: 'Normal', threadPriority: 'Normal', affinity: 65535 };
function runtime(relative, variant)
{
    const r = read(relative + '\\states\\runtime.json'), closure = closures[variant];
    equal([r.variant, r.runtime, r.architecture, r.serverGc, r.configuredConcurrentGc, r.processorCount,
        r.processWidePreciseBdnAllocationDelegateAvailable], [variant, '12.0.0', 'X64', true, true, 16, true]);
    equal(r.settings, expectedSettings); equal(r.fixtureManifestSha256, hash(fixtureRoot + '\\manifest.json')); equal(r.cases, specs);
    assert(Number.isInteger(r.processId) && r.processId > 0);
    equal(r.owners.map(owner => owner.assembly), owners);
    for (const owner of [...r.owners, r.harness, r.benchmarkDotNet])
        equal(owner.sha256, closure.files.find(row => row.file === owner.assembly + '.dll')?.sha256);
    for (const key of ['corelib', 'json'])
    {
        assert(r[key].informationalVersion.startsWith('12.0.0-alpha.1.26562.105+'));
        equal(r[key].sha256, runtimeInventory.files.find(row => row.file.endsWith('\\' + r[key].assembly + '.dll'))?.sha256);
    }
    runtimeRecords++;

    return r;
}
function contract(value)
{
    const row = fixture.cases.find(row => row.Label === value.Label); assert(row);
    equal([value.inputSha256, value.outputSha256, value.passed], [row.inputSha256, row.outputSha256, true]);
    equal(value.result, read(`${fixtureRoot}\\expected\\${row.Label}.json`)); contracts++;
}
function pool(value, variant)
{
    equal(value.present, variant === 'candidate1'); assert(Array.isArray(value.slots) && value.slots.length <= 32);
    if (variant === 'original') equal(value.slots, []);
    else
    {
        equal([value.initializedPoolReadIsNotBeforeTypeInitializerAllocation, value.privateWrites], [true, false]);
        assert(value.slots.every(slot => slot.length === 0 && slot.capacity >= 0 && slot.capacity <= 4096));
    }
}
const resources = read('resource-goals.json');
equal([resources.operationsPerSample, resources.samplesPerGoal, resources.doNotRetune], [4096, 5, true]);
equal(resources.goals.map(goal => [goal.label, goal.renderedNonUrlCharacters, goal.maximumBytesPerOperation]),
[['Prepared256', 256, 1024], ['Prepared1K', 1024, 3072], ['Prepared2K', 2048, 5120]]);
for (const variant of ['original', 'candidate1'])
{
    const relative = ready[variant].characterizationRelative; runtime(relative, variant);
    equal(read(relative + '\\states\\render-controls.json'), renderControls);
    for (const label of labels)
    {
        contract(read(`${relative}\\states\\contract-${label}.json`));
        const value = read(`${relative}\\states\\caliper-${label}.json`); equal([value.Label, value.samples.length], [label, 5]);
        for (const sample of value.samples)
        {
            const parallel = label.startsWith('Parallel'); equal(sample.operations, parallel ? 16 : 4096);
            near(sample.bytesPerOperation, sample.allocatedBytes / sample.operations);
            near(sample.processBytesPerOperation, sample.processAllocatedBytes / sample.operations);
            equal(sample.totalWorkerAllocatedBytes, sample.workerAllocatedBytes.reduce((a, b) => a + b, 0));
            assert(sample.allocatedBytes >= 0 && sample.processAllocatedBytes >= sample.allocatedBytes + sample.totalWorkerAllocatedBytes && sample.diagnosticElapsedMilliseconds > 0);
            equal(sample.workerAllocatedBytes.length, parallel ? 12 : 0);
            if (parallel)
            {
                near(sample.workerBytesPerAttributeCall, sample.totalWorkerAllocatedBytes / (sample.operations * 768));
                near(sample.workerBytesPerAttributeCall, label === 'ParallelFast' ? 0 : variant === 'original' ? 4392 : 2200);
            }
            const goal = resources.goals.find(goal => goal.label === label);
            if (goal) assert(variant === 'original' ? sample.bytesPerOperation > goal.maximumBytesPerOperation : sample.bytesPerOperation <= goal.maximumBytesPerOperation);
            calipers++;
        }
    }
    const proof = read(variant === 'original' ? 'resource-original-original-prep2.json' : 'resource-candidate1.json');
    equal(proof.goalsSha256, hash('resource-goals.json')); equal(proof.goals.length, 3);
    pool(read(relative + '\\states\\final-pool-state.json'), variant);
    for (let sample = 1; sample <= 3; sample++)
    {
        const relative = `cold\\${variant === 'original' ? 'original-prep2' : 'candidate1-prep1'}-${sample}`;
        runtime(relative, variant);
        const cold = read(relative + '\\states\\cold-state.json');
        equal(cold.first, read(`${fixtureRoot}\\expected\\Prepared1K.json`)); equal(cold.oversized, read(`${fixtureRoot}\\expected\\Prepared8K.json`));
        assert(cold.firstWorkloadAndVerificationProcessAllocatedBytes > 0); pool(cold.afterFirst, variant); pool(cold.afterOversized, variant);
        if (variant === 'candidate1') equal([cold.afterFirst.slots, cold.afterOversized.slots], [[{ length: 0, capacity: 1024 }], []]);
    }
}
const decode = value => value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) =>
    entity[0] === '#' ? String.fromCodePoint(entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)))
        : ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[entity.toLowerCase()]);
const attributes = value => Object.fromEntries([...value.matchAll(/([\w:]+)="([^"]*)"/g)].map(match => [match[1], decode(match[2])]));
for (const variant of ['original', 'candidate1'])
{
    const audit = read(`tests\\${variant}\\test-audit.json`); equal([audit.actualRows, audit.allPassed, audit.skipped], [38, true, 0]);
    const xml = text(`tests\\${variant}\\${audit.trx}`);
    equal(hash(`tests\\${variant}\\${audit.trx}`), audit.trxSha256);
    const rows = [...xml.matchAll(/<UnitTestResult\s+([^>]+)>/g)].map(match => attributes(match[1]));
    const definitions = [...xml.matchAll(/<UnitTest\s+([^>]+)>([\s\S]*?)<\/UnitTest>/g)].map(match =>
        ({ ...attributes(match[1]), execution: attributes(match[2].match(/<Execution\s+([^>]+)\/>/)[1]).id }));
    const entries = [...xml.matchAll(/<TestEntry\s+([^>]+)\/>/g)].map(match => attributes(match[1]));
    const discovered = [...text(`tests\\${variant}\\${audit.discoveryLog}`).matchAll(/^\s+(Microsoft\.AspNetCore\..+)$/gm)].map(match => match[1].trim());
    equal([rows.length, definitions.length, entries.length], [38, 38, 38]);
    equal(discovered.sort(), definitions.map(row => row.name).sort()); unique(rows.map(row => row.executionId));
    for (const row of rows)
    {
        equal(row.outcome, 'Passed'); assert(Number(row.duration.split(':').at(-1)) > 0);
        const definition = definitions.filter(value => value.id === row.testId), entry = entries.filter(value => value.executionId === row.executionId && value.testId === row.testId);
        equal([definition.length, entry.length, definition[0].name, definition[0].execution], [1, 1, row.testName, row.executionId]);
        assert(audit.rows.some(value => value.testId === row.testId && value.executionId === row.executionId && value.testName === row.testName && value.outcome === row.outcome));
        testRows++;
    }
    for (const owner of owners)
    {
        for (const extension of ['.dll', '.pdb'])
            equal(audit.capturedTestAndProducerImage.find(row => row.file === owner + extension)?.sha256,
                closures[variant].files.find(row => row.file === owner + extension)?.sha256);
    }
    const pdb = read(`pdb\\${variant}\\document-audit.json`); equal([pdb.verifiedDocuments, pdb.rows.length], [24, 24]);
    for (const row of pdb.rows)
    {
        const actualHash = hash(ready[variant].sourceRelative + '\\' + row.source);
        equal([row.sourceSha256, row.actual.verified, row.actual.source_sha256, row.actual.actual_pdb_document_sha256], [actualHash, true, actualHash, actualHash]);
        equal(row.pdbSha256, closures[variant].files.find(value => value.file === row.owner + '.pdb')?.sha256); pdbDocuments++;
    }
}
equal(read('tests\\original\\initial-discovery-count-failure.json').owningTestRunsBeforeCorrection, 0);
equal(read('development\\original-prep1\\execution.json').commands[0].exitCode, -532462766);
assert(text('development\\original-prep1\\create-fixture.log').includes('Real endpoint metadata/URL factory'));
equal(read('development\\round2-preview-parser-failure.json').timingEntryPointInvoked, false);
for (const attempt of [1, 2, 3]) equal(read(`build\\attempt${attempt}\\execution.json`).exitCode, 0);
equal([read('format\\execution.json').exitCode, read('format\\execution.json').sourceByteUnchanged, read('format\\execution.json').sourceSha256], [0, true, candidateSourceHash]);
const outcomes = [], executions = [];
for (let round = 1; round <= 3; round++)
{
    for (const variant of ['original', 'candidate1'])
    {
        const relative = `measurements\\round${round}-${variant}`, r = runtime(relative, variant);
        equal(read(relative + '\\states\\render-controls.json'), renderControls); pool(read(relative + '\\states\\final-pool-state.json'), variant);
        const execution = read(relative + '\\execution.json'); executions.push(execution); equal(execution.exitCode, 0);
        for (const [flag, expected] of [['--warmupCount', '3'], ['--iterationCount', '8'], ['--iterationTime', '100'], ['--launchCount', '1'], ['--outliers', 'DontRemove']])
            equal(execution.arguments[execution.arguments.indexOf(flag) + 1], expected);
        assert(!execution.arguments.includes('--inProcess') && !execution.arguments.includes('--job'));
        const report = read(relative + '\\results\\AutoPerf.UrlBenchmark-report-full-compressed.json');
        equal([report.Benchmarks.length, report.HostEnvironmentInfo.BenchmarkDotNetVersion], [24, '0.13.0']);
        const blocks = text(relative + '\\console.log').split(/^\/\/ Benchmark: /m).slice(1); equal(blocks.length, 24);
        const byCase = new Map();
        for (const block of blocks)
        {
            const markers = [...block.matchAll(/^AUTOPERF_F118_SETUP (\{[^\r\n]+\})/gm)]; equal(markers.length, 1);
            const setup = JSON.parse(markers[0][1]); assert(labels.includes(setup.Case) && !byCase.has(setup.Case)); byCase.set(setup.Case, { block, setup });
        }
        for (const label of labels)
        {
            const benchmark = report.Benchmarks.find(row => row.FullName === `AutoPerf.UrlBenchmark.ProcessAttribute(Case: "${label}")`); assert(benchmark);
            assert(benchmark.DisplayInfo.includes('Toolchain=SettingsPreservingEmitToolchain') && benchmark.DisplayInfo.includes('OutlierMode=DontRemove') &&
                benchmark.DisplayInfo.includes('PowerPlanMode=00000000-0000-0000-0000-000000000000'));
            const setup = read(`${relative}\\states\\contract-${label}.json`), { block, setup: rawSetup } = byCase.get(label);
            equal([setup.Case, setup.variant, setup.processId], [label, variant, r.processId]); equal(setup.owners, r.owners); equal(setup.harness, r.harness);
            equal(setup.settings, expectedSettings); equal(rawSetup, setup); contract(setup.contract);
            assert(block.startsWith(benchmark.DisplayInfo + '\n') || block.startsWith(benchmark.DisplayInfo + '\r\n'));
            for (const name of [`settings-before-${label}`, `settings-after-${label}`])
            {
                equal(read(`${relative}\\states\\${name}.json`), expectedSettings); settingsRecords++;
            }
            const raw = [...block.matchAll(/^Workload(Warmup|Actual|Result)\s+(\d+):\s+(\d+) op,\s+([\d.]+) ns/gm)]
                .map(match => ({ stage: match[1], index: Number(match[2]), operations: Number(match[3]), nanoseconds: Number(match[4]) }));
            const actual = raw.filter(row => row.stage === 'Actual'), result = raw.filter(row => row.stage === 'Result');
            equal([raw.filter(row => row.stage === 'Warmup').length, actual.length, result.length], [3, 8, 8]);
            const overhead = [...block.matchAll(/^OverheadActual\s+(\d+):\s+(\d+) op,\s+([\d.]+) ns/gm)]
                .map(match => ({ index: Number(match[1]), operations: Number(match[2]), nanoseconds: Number(match[3]) }));
            assert(overhead.every(row => row.operations === actual[0].operations && row.nanoseconds >= 0)); unique(overhead.map(row => row.index));
            const overheadMedian = overhead.length ? percentile(overhead.map(row => row.nanoseconds).sort((a, b) => a - b), 50) : 0;
            equal(actual.map(({ index, operations, nanoseconds }) => ({ index, operations, nanoseconds: Math.max(0, nanoseconds - overheadMedian) })),
                result.map(({ index, operations, nanoseconds }) => ({ index, operations, nanoseconds })));
            equal(benchmark.Measurements, result.map(row => ({ IterationMode: 'Workload', IterationStage: 'Result', LaunchIndex: 1,
                IterationIndex: row.index, Operations: row.operations, Nanoseconds: row.nanoseconds })));
            const samples = result.map(row => row.nanoseconds / row.operations), sorted = [...samples].sort((a, b) => a - b);
            const mean = samples.reduce((a, b) => a + b, 0) / 8, variance = samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / 7, deviation = Math.sqrt(variance);
            const stats = benchmark.Statistics; equal([stats.N, stats.OriginalValues], [8, samples]);
            for (const [key, value] of Object.entries({ Mean: mean, Min: sorted[0], Max: sorted[7], Variance: variance, StandardDeviation: deviation,
                StandardError: deviation / Math.sqrt(8), Median: percentile(sorted, 50), Q1: percentile(sorted, 25), Q3: percentile(sorted, 75) })) near(stats[key], value, label + '/' + key);
            for (const [key, value] of Object.entries(stats.Percentiles)) near(value, percentile(sorted, Number(key.slice(1))));
            near(stats.ConfidenceInterval.Lower, mean - stats.ConfidenceInterval.Margin); near(stats.ConfidenceInterval.Upper, mean + stats.ConfidenceInterval.Margin);
            const gc = [...block.matchAll(/^GC:\s+(\d+) (\d+) (\d+) (\d+) (\d+)/gm)]; equal(gc.length, 1);
            const [gen0, gen1, gen2, allocated, operations] = gc[0].slice(1).map(Number);
            equal([benchmark.Memory.Gen0Collections, benchmark.Memory.Gen1Collections, benchmark.Memory.Gen2Collections,
                benchmark.Memory.TotalOperations, benchmark.Memory.BytesAllocatedPerOperation], [gen0, gen1, gen2, operations, roundEven(allocated / operations)]);
            if (label.startsWith('Parallel'))
            {
                const workers = read(`${relative}\\states\\workers-${label}.json`); equal([workers.initial.length, workers.final.length], [12, 12]);
                for (let worker = 0; worker < 12; worker++)
                {
                    equal(workers.initial[worker], workers.final[worker]); equal(workers.initial[worker].settings, expectedSettings);
                }
            }
            outcomes.push({ round, variant, label, meanNs: mean, medianNs: stats.Median, cvPercent: 100 * deviation / mean,
                bytesPerInvocation: benchmark.Memory.BytesAllocatedPerOperation, confidenceLower: stats.ConfidenceInterval.Lower,
                confidenceUpper: stats.ConfidenceInterval.Upper, rawOverheadMedianNs: overheadMedian });
            retained += 8; warmups += 3; overheads += overhead.length; setups++;
        }
    }
}
equal([outcomes.length, contracts, calipers, retained, warmups, setups, settingsRecords, runtimeRecords, testRows, pdbDocuments],
[144, 192, 240, 1152, 432, 144, 288, 14, 76, 48]);
const comparisons = [];
for (let round = 1; round <= 3; round++)
{
    const ordered = executions.filter(row => row.round === round).sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
    equal(ordered.map(row => row.variant), round === 2 ? ['candidate1', 'original'] : ['original', 'candidate1']);
    assert(Date.parse(ordered[0].completedAt) <= Date.parse(ordered[1].startedAt));
    for (const label of labels)
    {
        const original = outcomes.find(row => row.round === round && row.variant === 'original' && row.label === label);
        const candidate = outcomes.find(row => row.round === round && row.variant === 'candidate1' && row.label === label);
        comparisons.push({ round, label, originalMeanNs: original.meanNs, candidateMeanNs: candidate.meanNs,
            changePercent: 100 * (candidate.meanNs / original.meanNs - 1), originalBytes: original.bytesPerInvocation, candidateBytes: candidate.bytesPerInvocation,
            originalCvPercent: original.cvPercent, candidateCvPercent: candidate.cvPercent,
            reportedIntervalsOverlap: Math.max(original.confidenceLower, candidate.confidenceLower) <= Math.min(original.confidenceUpper, candidate.confidenceUpper) });
    }
}
for (const row of disposition.comparisons)
{
    const actual = comparisons.find(value => value.round === row.round && value.label === row.label); assert(actual);
    for (const key of ['changePercent', 'originalMeanNs', 'candidateMeanNs', 'originalCvPercent', 'candidateCvPercent']) near(row[key], actual[key]);
    equal([row.originalBytes, row.candidateBytes], [actual.originalBytes, actual.candidateBytes]);
}
equal(disposition.comparisons.length, 72);
const result = {
    candidate: 'F118', disposition: disposition.disposition, sourceComparisons: 3, candidateSourceShapes: 1, actualProfiles: 6,
    actualBenchmarkOutcomes: 144, retainedResultSamples: retained, workloadWarmups: warmups, retainedOverheadSamples: overheads,
    exactHashPidLinkedSetups: setups, settingsBeforeAfterRecords: settingsRecords, capturedPerCaseContracts: contracts,
    resourceCalipers: calipers, expectedRedGoalSamples: 15, unchangedGreenGoalSamples: 15, actualOwningTestRows: testRows,
    actualPdbDocumentChecks: pdbDocuments, activeFreshColdProcesses: 6, scopedSourceIdentities: 20, additionalContextSnapshots: 2,
    currentDefaultExactScopedFiles: 20, copiedApplicationFilesPerVariant: 284, declaredRuntimeAssetsPerVariant: 118,
    onlyTwoTestedMvcRazorDllPdbChanged: true, processWidePreciseBdnAllocationVerified: true, pinnedRuntimeHostFiles: 200,
    candidateSourceSha256: candidateSourceHash, maximumCvPercent: Math.max(...outcomes.map(row => row.cvPercent)), observedSettings: expectedSettings,
    ordinaryRazorProducerAlreadyBypassesSelectedSeam: true, postDisposalBuilderOwnershipOrFreshCapacityCompatibilityClaimed: false,
    performancePrJustified: disposition.performancePrJustified, notMergeReady: true, shippedPublicApiOrDefaultChanged: false,
    omittedDllPdbRuntimeRehashedByPublicAudit: false, pdbDocumentChecksAreNotPeBindingOrMethodCoverage: true,
    confidenceCriticalValuesIndependentlyComputed: false,
    qualification: disposition.qualification, outcomes, comparisons
};
const markdown = [
    '# F118: actual general-content URL rendering comparisons', '',
    'Negative change means lower observed component mean,not an ordinary Razor page or application speedup. Eight retained samples per outcome,all outliers retained. Prepared/runner/page cases are one call;parallel is12x64=768 actual attribute calls/coordinated batch including gates. Unchanged page/control drift is not attributed to executing the bypassed pool seam.', '',
    '| Pair | Case | Original ns | Candidate ns | Change | Original B/invocation | Candidate B/invocation | CV original/candidate | Reported CI overlap |',
    '| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |',
    ...comparisons.map(row => `| ${row.round} | ${row.label} | ${row.originalMeanNs.toFixed(3)} | ${row.candidateMeanNs.toFixed(3)} | ${row.changePercent.toFixed(2)}% | ${row.originalBytes} | ${row.candidateBytes} | ${row.originalCvPercent.toFixed(2)}%/${row.candidateCvPercent.toFixed(2)}% | ${row.reportedIntervalsOverlap ? 'yes' : 'no'} |`),
    '', `Raw retained:${retained};warmups:${warmups};actual overhead samples:${overheads};three comparisons,one source shape. No confidence-critical-value or application-frequency inference.`, ''
].join('\n');
if (mode === '--verify')
{
    equal(jsonAt(local('measurement-audit.json')), result); equal(textAt(local('comparison-outcomes.md')), markdown);
}
else
{
    fs.writeFileSync(local('measurement-audit.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    fs.writeFileSync(local('comparison-outcomes.md'), markdown, { flag: 'wx' });
}
console.log(`F118:144 outcomes/${retained} retained/${warmups} warmups/${overheads} overheads,192 contracts/240 calipers/76 exact owning rows/48 PDB documents;six profiles/three comparisons,one unchanged source shape. ${copies ? 'Public copied evidence verified;omitted binaries not rehashed.' : 'Live images and200 pinned runtime/host files rehashed.'}`);
