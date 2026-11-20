import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2]);
const bytes = file => fs.readFileSync(path.join(root, file));
const read = file => JSON.parse(bytes(file).toString('utf8').replace(/^\uFEFF/, ''));
const hash = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
const gitHash = (type, value) => crypto.createHash('sha1').update(`${type} ${value.length}\0`).update(value).digest('hex');
const lf = file => bytes(file).toString('utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const plan = read('analysis-plan.json'), seal = read('plan-seal.json'), manifest = read('source-manifest.json');
const findings = read('retained-findings.json'), result = read('alias-observations.json');
assert.equal(hash(bytes('analysis-plan.json')), seal.actualPlanSha256);
assert.equal(hash(bytes('retained-findings.json')), seal.actualFindingsSha256);
assert.equal(hash(bytes('source-manifest.json')), seal.actualSourceManifestSha256);
assert.equal(seal.actualBeforeSourceAnalysisExecution, true);
assert.equal(plan.actualSourceOnly, true);
assert.equal(plan.actualNoCandidateOrCanonicalVerdict, true);
assert.equal(plan.actualCanonicalBudgetsUntouched, true);
assert.equal(findings.length, 26);
assert(findings.every(item => item.status === 'pending'));
assert.equal(new Set(findings.map(item => item.id)).size, 26);
for (const tool of plan.tools) {
    assert.equal(bytes(path.join('tools', tool.file)).length, tool.bytes);
    assert.equal(hash(bytes(path.join('tools', tool.file))), tool.sha256);
}
assert.equal(manifest.sources.length, 44);
assert.equal(manifest.memberships.length, 44);
const objectMap = new Map(manifest.objects.map(item => [item.id, item]));
for (const object of manifest.objects) {
    const raw = bytes(object.file);
    assert.equal(raw.length, object.bytes);
    assert.equal(hash(raw), object.sha256);
    assert.equal(gitHash(object.type, raw), object.id);
}
function treeEntries(id) {
    const object = objectMap.get(id);
    assert(object && object.type === 'tree');
    const raw = bytes(object.file), entries = [];
    let cursor = 0;
    while (cursor < raw.length) {
        const modeEnd = raw.indexOf(32, cursor), nameEnd = raw.indexOf(0, modeEnd + 1);
        assert(modeEnd > cursor && nameEnd > modeEnd && nameEnd + 21 <= raw.length);
        entries.push({ mode: raw.toString('ascii', cursor, modeEnd),
            name: raw.toString('utf8', modeEnd + 1, nameEnd), id: raw.subarray(nameEnd + 1, nameEnd + 21).toString('hex') });
        cursor = nameEnd + 21;
    }
    return entries;
}
for (const source of manifest.sources) {
    const raw = bytes(source.file);
    assert.equal(raw.length, source.bytes);
    assert.equal(hash(raw), source.sha256);
    assert.equal(gitHash('blob', raw), source.gitBlob);
    const proof = manifest.memberships.filter(item => item.role === source.role && item.originalFile === source.originalFile);
    assert.equal(proof.length, 1);
    const commit = objectMap.get(proof[0].commit);
    assert(commit && commit.type === 'commit');
    assert(bytes(commit.file).toString('utf8').startsWith('tree ' + proof[0].rootTree + '\n'));
    assert.equal(proof[0].commit, source.role === 'Original' ? plan.original : plan.observedDefault);
    let current = proof[0].rootTree;
    const parts = source.originalFile.split('/');
    assert.equal(proof[0].edges.length, parts.length);
    for (const [index, name] of parts.entries()) {
        const candidates = treeEntries(current).filter(item => item.name === name);
        assert.equal(candidates.length, 1);
        const entry = candidates[0], saved = proof[0].edges[index];
        assert.deepEqual(saved, { tree: current, name, mode: entry.mode, target: entry.id });
        assert.equal(entry.mode, index === parts.length - 1 ? '100644' : '40000');
        current = entry.id;
    }
    assert.equal(current, source.gitBlob);
}
const locate = (role, originalFile) => {
    const rows = manifest.sources.filter(item => item.role === role && item.originalFile === originalFile);
    assert.equal(rows.length, 1);
    return rows[0];
};
const count = (value, needle) => value.split(needle).length - 1;
const lineNumber = (value, position) => value.substring(0, position).split('\n').length;
function independentMapping(record, family, role, changedSource) {
    assert.equal(record.finding.card_id, 'uncached-reflection-in-hot-path');
    const originalTemplate = 'src/Validation/gen/Templates/' + family.template;
    const template = lf(locate(role, originalTemplate).file).replace(/\n+$/, '');
    const isTemplate = record.finding.file === originalTemplate;
    const projected = isTemplate ? template : template.replace(/^(?=.)/gm, '    ');
    const actual = changedSource ?? lf(locate(role, record.finding.file).file);
    assert.equal(count(actual, projected), 1);
    const position = actual.indexOf(projected), allLines = actual.split('\n');
    const start = record.finding.line_start, end = record.finding.line_end;
    assert(start >= 1 && end >= start && end <= allLines.length);
    const offset = allLines.slice(0, start - 1).join('\n').length + (start > 1 ? 1 : 0);
    const reported = allLines.slice(start - 1, end).join('\n');
    assert(offset >= position && offset + reported.length <= position + projected.length);
    let seam;
    if (family.kind === 'type-constructor') {
        seam = '_implementedInterfaces = type.GetInterfaces();';
        assert(reported.includes(seam));
    } else if (family.kind === 'parameter-resolver-class') {
        seam = 'GetCustomAttributes<global::System.ComponentModel.DataAnnotations.ValidationAttribute>(parameterInfo)';
        assert(reported.includes(seam));
    } else {
        assert.equal(family.kind, 'property-accessor');
        const lines = projected.split('\n');
        const matches = lines.map((line, index) => line.trimStart() === 'private global::System.Reflection.PropertyInfo Property' ? index : -1)
            .filter(index => index >= 0);
        assert.equal(matches.length, 1);
        seam = lines.slice(matches[0], matches[0] + 2).join('\n');
        assert(seam.includes('=> DeclaringType.GetProperty(Name, global::System.Reflection.BindingFlags.Instance | global::System.Reflection.BindingFlags.Public | global::System.Reflection.BindingFlags.DeclaredOnly) ?? throw new global::System.InvalidOperationException('));
        const declarationStart = position + projected.indexOf(seam);
        assert(offset >= declarationStart && offset + reported.length <= declarationStart + seam.length);
    }
    assert.equal(count(projected, seam), 1);
    return { template, projected, actual, position, reported, seam,
        seamFirst: lineNumber(actual, position + projected.indexOf(seam)),
        seamLast: lineNumber(actual, position + projected.indexOf(seam) + seam.length) };
}
assert.equal(result.actualSourceAnalysisAcceptanceMet, true);
assert.equal(result.actualSourceOnlyNotRuntimeOrPerformance, true);
assert.equal(result.actualCompilerOrProductTestRuns, 0);
assert.equal(result.actualPerformanceComparisons, 0);
assert.equal(result.actualCanonicalBudgetsUntouched, true);
assert.equal(result.observations.length, 52);
assert.deepEqual(result.exclusions, []);
for (const record of findings) {
    const families = plan.families.filter(item => item.ids.includes(record.id));
    assert.equal(families.length, 1);
    for (const role of ['Original', 'Default']) {
        const rows = result.observations.filter(item => item.findingId === record.id && item.role === role);
        assert.equal(rows.length, 1);
        const row = rows[0], actual = independentMapping(record, families[0], role);
        assert.equal(row.actualUniqueEntireResourceMatched, true);
        assert.equal(row.actualWholeResourceLfBodySha256, hash(actual.template));
        assert.equal(row.actualBlockStart, actual.position);
        assert.equal(row.actualBlockEnd, actual.position + actual.projected.length);
        assert.equal(row.actualReportedSpan, actual.reported);
        assert.equal(row.actualInventorySnippetUnchanged, record.finding.snippet);
        assert.equal(row.actualInventorySnippetLiteralInReportedSpan, actual.reported.includes(record.finding.snippet));
        assert.equal(row.actualSeam, actual.seam);
        assert.equal(row.actualSeamFirstLine, actual.seamFirst);
        assert.equal(row.actualSeamLastLine, actual.seamLast);
        assert.equal(row.canonical, families[0].canonical);
    }
}
assert.equal(result.actualGroups.length, 3);
const aliases = [];
for (const family of plan.families) {
    const groups = result.actualGroups.filter(item => item.canonical === family.canonical);
    assert.equal(groups.length, 1);
    assert.deepEqual(groups[0].aliases, family.ids.filter(id => id !== family.canonical));
    assert.equal(groups[0].actualCanonicalRemainsPending, true);
    const rows = result.observations.filter(item => family.ids.includes(item.findingId));
    assert.equal(new Set(rows.map(item => item.actualWholeResourceLfBodySha256)).size, 1);
    aliases.push(...groups[0].aliases);
}
assert.equal(new Set(aliases).size, 23);
const primary = findings.find(item => item.id === 'F345'), family = plan.families.find(item => item.canonical === 'F345');
const actual = independentMapping(primary, family, 'Original');
assert.throws(() => independentMapping(primary, family, 'Original',
    actual.actual.replace('DeclaringType.GetProperty(Name', 'DeclaringType.GetProperty(ChangedName')), assert.AssertionError);
assert.throws(() => independentMapping(primary, family, 'Original', actual.actual + '\n' + actual.projected), assert.AssertionError);
const wrong = structuredClone(primary);
wrong.finding.line_start = wrong.finding.line_end = lineNumber(actual.actual,
    actual.position + actual.projected.indexOf('        internal string Name { get; }'));
assert.throws(() => independentMapping(wrong, family, 'Original'), assert.AssertionError);
const wrongCard = structuredClone(primary);
wrongCard.finding.card_id = 'not-this-retained-card';
assert.throws(() => independentMapping(wrongCard, family, 'Original'), assert.AssertionError);
assert.doesNotThrow(() => independentMapping(primary, family, 'Original', actual.actual + '\n// Independent fixture-trivia boundary control.\n'));
assert.deepEqual(result.controls.map(item => item.name), plan.actualNegativeControls);
assert(result.controls.every(item => item.actualPassed));
for (const name of fs.readdirSync(path.join(root, 'git-native')).filter(file => file.endsWith('.json'))) {
    const receipt = read(path.join('git-native', name)), prefix = path.join('git-native', name.slice(0, -5));
    assert.equal(receipt.actualExitCode, 0);
    assert.equal(hash(bytes(prefix + '.stdout')), receipt.stdoutSha256);
    assert.equal(hash(bytes(prefix + '.stderr')), receipt.stderrSha256);
    assert.equal(receipt.actualCreationAndDescendantsNotObserved, true);
}
console.log(JSON.stringify({ actualAudit: 'PASS', actualSourceSnapshots: 44,
    actualRawGitObjects: manifest.objects.length, actualGitMemberships: 44,
    actualIndependentlyMatchedWholeResourceAndReportedSeams: 52,
    actualIndependentMappingControlsPassed: 5, actualSourceEmissionAliases: 23,
    actualCanonicalStudiesRemainPending: ['F343', 'F344', 'F345'],
    actualProductCompilerTestOrPerformanceRuns: 0,
    actualNotWholeFixtureOrGeneratedAssemblyRuntimeEquivalence: true }, null, 2));
