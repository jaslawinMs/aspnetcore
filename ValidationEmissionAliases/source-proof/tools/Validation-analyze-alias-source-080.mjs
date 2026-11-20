import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2]);
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, ''));
const text = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, '').replaceAll('\r\n', '\n');
const hash = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
const plan = read('analysis-plan.json'), manifest = read('source-manifest.json'), records = read('retained-findings.json');
const source = (role, originalFile) => {
    const matches = manifest.sources.filter(item => item.role === role && item.originalFile === originalFile);
    assert.equal(matches.length, 1, originalFile);
    return matches[0];
};
const templatePath = name => 'src/Validation/gen/Templates/' + name;
const lineAt = (value, offset) => value.slice(0, offset).split('\n').length;
function unique(value, needle) {
    const first = value.indexOf(needle);
    assert(first >= 0 && value.indexOf(needle, first + needle.length) < 0, 'Exact required source block must occur once.');
    return first;
}
function match(record, family, role, override) {
    assert.equal(record.finding.card_id, 'uncached-reflection-in-hot-path');
    const input = source(role, record.finding.file), template = source(role, templatePath(family.template));
    const body = text(template.file).replace(/\n+$/, '');
    assert(body.startsWith('file '));
    assert(body.includes('class ' + family.className));
    const actual = override ?? text(input.file), resourceRecord = record.finding.file === template.originalFile;
    const emitted = resourceRecord ? body : body.split('\n').map(line => line.length ? '    ' + line : '').join('\n');
    const blockStart = unique(actual, emitted), blockEnd = blockStart + emitted.length;
    const lines = actual.split('\n'), firstLine = record.finding.line_start, lastLine = record.finding.line_end;
    assert(firstLine > 0 && lastLine >= firstLine && lastLine <= lines.length);
    const first = lines.slice(0, firstLine - 1).reduce((sum, line) => sum + line.length + 1, 0);
    const last = first + lines.slice(firstLine - 1, lastLine).join('\n').length;
    assert(first >= blockStart && last <= blockEnd, 'Reported range must belong to this exact resource.');
    const reported = actual.slice(first, last);
    let seam, seamStart, seamEnd;
    if (family.kind === 'type-constructor') {
        seam = '_implementedInterfaces = type.GetInterfaces();';
        seamStart = blockStart + unique(emitted, seam);
        seamEnd = seamStart + seam.length;
        assert(reported.includes(seam), 'The reported constructor assignment was not found.');
    } else if (family.kind === 'property-accessor') {
        const declaration = '    private global::System.Reflection.PropertyInfo Property';
        const bodyLines = body.split('\n'), index = bodyLines.indexOf(declaration);
        assert(index >= 0 && bodyLines.lastIndexOf(declaration) === index);
        assert(bodyLines[index + 1].startsWith('        => DeclaringType.GetProperty(Name, global::System.Reflection.BindingFlags.Instance | global::System.Reflection.BindingFlags.Public | global::System.Reflection.BindingFlags.DeclaredOnly) ?? throw new global::System.InvalidOperationException('));
        assert(bodyLines[index + 1].endsWith(';'));
        const pair = bodyLines.slice(index, index + 2);
        seam = pair.map(line => resourceRecord ? line : '    ' + line).join('\n');
        seamStart = blockStart + unique(emitted, seam);
        seamEnd = seamStart + seam.length;
        assert(first >= seamStart && last <= seamEnd, 'The reported range is not the exact two-line Property declaration.');
    } else {
        assert.equal(family.kind, 'parameter-resolver-class');
        seam = 'GetCustomAttributes<global::System.ComponentModel.DataAnnotations.ValidationAttribute>(parameterInfo)';
        seamStart = blockStart + unique(emitted, seam);
        seamEnd = seamStart + seam.length;
        assert(reported.includes(seam), 'Parameter attribute reflection must occur inside the reported range.');
    }
    return {
        findingId: record.id, canonical: family.canonical, role, kind: family.kind, className: family.className,
        originalFile: input.originalFile, actualSourceFile: input.file, actualSourceSha256: input.sha256,
        actualTemplateFile: template.file, actualTemplateOriginalFile: template.originalFile,
        actualWholeResourceLfBodySha256: hash(body), actualUniqueEntireResourceMatched: true,
        actualTemplateRecordNotEmittedSnapshot: resourceRecord,
        actualBlockFirstLine: lineAt(actual, blockStart), actualBlockLastLine: lineAt(actual, blockEnd),
        actualBlockStart: blockStart, actualBlockEnd: blockEnd,
        reportedFirstLine: firstLine, reportedLastLine: lastLine, actualReportedSpan: reported,
        actualInventorySnippetUnchanged: record.finding.snippet,
        actualInventorySnippetLiteralInReportedSpan: reported.includes(record.finding.snippet),
        actualSeam: seam, actualSeamFirstLine: lineAt(actual, seamStart), actualSeamLastLine: lineAt(actual, seamEnd),
        actualNoWholeFixtureOrRuntimeEquivalence: true
    };
}
const flows = [];
for (const role of ['Original', 'Default']) {
    const get = file => text(source(role, 'src/Validation/gen/' + file).file);
    const project = get('Microsoft.Extensions.Validation.ValidationsGenerator.csproj');
    assert(project.includes('<Compile Remove="Templates\\**\\*.cs" />'));
    assert(project.includes('<EmbeddedResource Include="Templates\\**\\*.cs" />'));
    const helper = get('Emitters/ValidationsGenerator.InfoClasses.Emitter.cs');
    const list = helper.match(/private static readonly string\[\] s_infoClassTemplates =\s*\[([\s\S]*?)\];/)?.[1];
    assert(list);
    assert.deepEqual([...list.matchAll(/"([^"]+\.cs)"/g)].map(item => item[1]), plan.templates);
    for (const statement of [
        'internal static string EmitInfoClasses() => s_infoClasses.Value;',
        'var assembly = typeof(ValidationsGenerator).Assembly;',
        'assembly.GetManifestResourceNames()', 'assembly.GetManifestResourceStream(resourceName)!',
        'new StreamReader(stream, Encoding.UTF8)', 'body.Replace("\\r\\n", "\\n").Split(\'\\n\')',
        'sb.Append("    ").AppendLine(line);', "return sb.ToString().TrimEnd('\\r', '\\n');"
    ]) assert(helper.includes(statement), statement);
    assert(get('Emitters/ValidationsGenerator.Emitter.cs').includes('{{EmitInfoClasses()}}'));
    assert(get('Emitters/ValidationsGenerator.Emitter.cs').includes('context.AddSource("ValidatableInfoResolver.g.cs"'));
    assert(get('ValidationsGenerator.cs').includes('Emit(context, (emitInputs.Left, emitInputs.Right))'));
    flows.push({ role, actualProjectEmbedsRatherThanCompilesTemplates: true,
        actualFixedFourSpaceResourceEmissionSourceVerified: true, actualHelperLfSha256: hash(helper),
        actualNativeGeneratorNotExecutedByThisSourceAnalysis: true });
}
assert.equal(flows[0].actualHelperLfSha256, flows[1].actualHelperLfSha256);
const observations = [], exclusions = [];
for (const role of ['Original', 'Default']) {
    for (const record of records) {
        const families = plan.families.filter(item => item.ids.includes(record.id));
        assert.equal(families.length, 1);
        try {
            observations.push(match(record, families[0], role));
        } catch (error) {
            if (!(error instanceof assert.AssertionError)) throw error;
            exclusions.push({ role, findingId: record.id, actualUnestablishedMapping: error.message });
        }
    }
}
const groups = [];
for (const family of plan.families) {
    const rows = observations.filter(item => family.ids.includes(item.findingId));
    if (rows.length === family.ids.length * 2 && new Set(rows.map(item => item.actualWholeResourceLfBodySha256)).size === 1) {
        groups.push({ canonical: family.canonical, aliases: family.ids.filter(id => id !== family.canonical),
            actualResource: templatePath(family.template), actualResourceLfBodySha256: rows[0].actualWholeResourceLfBodySha256,
            actualClass: family.className, actualScope: family.scope, actualCanonicalRemainsPending: true });
    }
}
const primary = records.find(item => item.id === 'F345'), family = plan.families.find(item => item.canonical === 'F345');
assert(primary && family);
const original = text(source('Original', primary.finding.file).file);
const controls = [];
function control(name, expectedMatch, action) {
    let matched = true;
    try { action(); } catch (error) { if (!(error instanceof assert.AssertionError)) throw error; matched = false; }
    assert.equal(matched, expectedMatch, name);
    controls.push({ name, expectedMatch, actualMatched: matched, actualPassed: true,
        actualSyntheticMappingAlgorithmOnlyNotRuntimeCoverage: true });
}
control('changed-resource-rejected', false, () => match(primary, family, 'Original',
    original.replace('DeclaringType.GetProperty(Name', 'DeclaringType.GetProperty(ChangedName')));
const template = text(source('Original', templatePath(family.template)).file).replace(/\n+$/, '');
const indented = template.split('\n').map(line => line.length ? '    ' + line : '').join('\n');
control('duplicated-resource-rejected', false, () => match(primary, family, 'Original', original + '\n' + indented));
const wrong = structuredClone(primary), block = unique(original, indented);
wrong.finding.line_start = wrong.finding.line_end = lineAt(original, block + unique(indented, '        internal string Name { get; }'));
control('wrong-reported-member-rejected', false, () => match(wrong, family, 'Original'));
const wrongCard = structuredClone(primary);
wrongCard.finding.card_id = 'not-this-retained-card';
control('wrong-card-rejected', false, () => match(wrongCard, family, 'Original'));
control('unrelated-fixture-trivia-retains-source-alias', true, () =>
    match(primary, family, 'Original', original + '\n// Synthetic source-boundary control only.\n'));
assert.deepEqual(controls.map(item => item.name), plan.actualNegativeControls);
const accepted = observations.length === 52 && exclusions.length === 0 && groups.length === 3 &&
    groups.reduce((sum, item) => sum + item.aliases.length, 0) === 23;
const report = { actualSourceAnalysisAcceptanceMet: accepted, actualSourceOnlyNotRuntimeOrPerformance: true,
    actualInputRecords: 26, actualMappedRoleObservations: observations.length, actualGroups: groups,
    actualAliases: groups.reduce((sum, item) => sum + item.aliases.length, 0),
    actualCompilerOrProductTestRuns: 0, actualPerformanceComparisons: 0, actualCanonicalBudgetsUntouched: true,
    actualOriginalAbbreviatedInventorySnippetsNeverPromotedToLiteralProof: true,
    flows, observations, exclusions, controls, recordedAt: new Date().toISOString() };
fs.writeFileSync(path.join(root, 'alias-observations.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualSourceAnalysisAcceptanceMet: accepted, actualMappedRoleObservations: observations.length,
    actualAliases: report.actualAliases, actualGroups: groups.length, actualExclusions: exclusions.length,
    actualMappingControlsPassed: controls.length, actualCompilerProductTestOrPerformanceRuns: 0 }, null, 2));
if (!accepted) process.exitCode = 2;
