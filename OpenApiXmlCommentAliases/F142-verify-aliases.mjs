import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? '.');
const read = file => JSON.parse(fs.readFileSync(path.join(root, ...file.split('/')), 'utf8').replace(/^\uFEFF/, ''));
const bytesHash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const hash = file => bytesHash(fs.readFileSync(path.join(root, ...file.split('/'))));
const textHash = text => bytesHash(Buffer.from(text, 'utf8'));
const normalize = text => text.trim().split(/\s+/).join(' ');
assert.equal(hash('alias-analysis-plan.json'), read('alias-plan-seal.json').sha256);
assert.equal(read('alias-plan-seal.json').actualBeforeSourceAnalysisExecution, true);
const findings = read('retained-snapshot-findings.json'), report = read('alias-observations.json'), sources = read('alias-source-manifest.json');
assert.equal(findings.length, 41);
assert.equal(new Set(findings.map(item => item.id)).size, 41);
assert.ok(findings.every(item => item.status === 'pending'));
assert.equal(report.ActualTiming, false);
assert.equal(report.ActualMethodIdentityIsSourceEvidenceOnly, true);
assert.equal(report.ActualNoRuntimeReachabilityOrImprovementClaim, true);
assert.equal(report.ActualInputFindings, 41);
assert.equal(report.ActualMappedRoleObservations, 58);
assert.equal(report.ActualOriginalDefaultVerifiedFindings, 29);
assert.equal(report.ActualAliasGroups, 10);
assert.equal(report.ActualAliases, 19);
assert.equal(report.Observations.length, 58);
assert.equal(report.Exclusions.length, 24);
assert.equal(sources.actualSourceSnapshots.length, 10);
for (const source of sources.actualSourceSnapshots)
{
    const bytes = fs.readFileSync(path.join(root, 'alias-source', source.role, ...source.file.split('/')));
    assert.equal(bytes.length, source.bytes);
    assert.equal(bytesHash(bytes), source.sha256);
    assert.equal(crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), source.gitBlob);
}
let actualIndependentlyMatchedWholeMethods = 0;
for (const row of report.Observations)
{
    const source = fs.readFileSync(path.join(root, 'alias-source', row.Role, ...row.SourceFile.split('/')), 'utf8').replaceAll('\r\n', '\n');
    const lines = source.split('\n');
    const actualSpan = lines.slice(row.ReportedFirstLine - 1, row.ReportedLastLine).join('\n');
    assert.equal(actualSpan, row.ActualReportedSpan);
    assert.ok(normalize(actualSpan).includes(normalize(row.OriginalSnippet)));
    const method = lines.slice(row.MethodFirstLine - 1, row.MethodLastLine).join('\n').trim();
    assert.equal(textHash(method), row.MethodTextSha256);
    const emitter = fs.readFileSync(path.join(root, 'alias-source', row.Role, 'src', 'OpenApi', 'gen', 'XmlCommentGenerator.Emitter.cs'), 'utf8').replaceAll('\r\n', '\n');
    assert.ok(emitter.includes(method), 'Independent literal method text is absent from generator source: ' + row.FindingId);
    assert.equal(normalize(row.OriginalSnippet), row.NormalizedSnippet);
    assert.equal(normalize(method).split(row.NormalizedSnippet).length - 1, 1);
    assert.ok(row.ActualProducerLiteralFirstLine > 0 && row.ActualProducerLiteralLastLine >= row.ActualProducerLiteralFirstLine);
    assert.match(row.MethodTokenSha256, /^[A-F0-9]{64}$/);
    actualIndependentlyMatchedWholeMethods++;
}
const allAliases = report.Groups.flatMap(group => group.AliasFindingIds), canonicals = report.Groups.map(group => group.CanonicalFindingId);
assert.equal(new Set(allAliases).size, 19);
assert.equal(new Set(canonicals).size, 10);
assert.ok(allAliases.every(id => !canonicals.includes(id)));
for (const group of report.Groups)
{
    const ids = [group.CanonicalFindingId, ...group.AliasFindingIds];
    assert.equal(group.ActualWholeMethodMatchedOwningProducerLiteral, true);
    assert.equal(group.ActualOriginalDefaultMethodIdentityVerified, true);
    assert.equal(group.ActualCanonicalFindingRemainsPending, true);
    assert.equal(group.ActualDistinctFixtureDataNotEquated, true);
    assert.equal(group.ActualRuntimeOrPerformanceEquivalenceNotClaimed, true);
    assert.equal(ids.map(id => Number(id.slice(1))).sort((a, b) => a - b)[0], Number(group.CanonicalFindingId.slice(1)));
    let exactTextHash;
    for (const id of ids)
    {
        assert.equal(findings.find(finding => finding.id === id).finding.card_id, group.Card);
        for (const role of ['Original', 'Default'])
        {
            const rows = report.Observations.filter(row => row.FindingId === id && row.Role === role);
            assert.equal(rows.length, 1);
            const row = rows[0];
            assert.equal(row.MethodTokenSha256, group.MethodTokenSha256);
            assert.equal(row.ContainingType, group.ContainingType);
            assert.equal(row.ContainingMethod, group.ContainingMethod);
            assert.equal(row.NormalizedSnippet, group.NormalizedSnippet);
            if (!exactTextHash) exactTextHash = row.MethodTextSha256;
            else assert.equal(row.MethodTextSha256, exactTextHash, 'This publication additionally requires exact whole-method text, not only token identity');
        }
    }
}
const excluded = report.Exclusions.filter(row => row.Role === 'Original').map(row => row.FindingId);
assert.equal(excluded.length, 12);
assert.ok(excluded.every(id => !allAliases.includes(id) && !canonicals.includes(id)));
for (const input of read('alias-preservation-baseline.json').actualToolInputs) assert.equal(hash('alias-tool/' + input.file), input.sha256);
const commands = read('alias-validation/receipt.json');
assert.equal(commands.actualProtectedGlobalJsonBefore, commands.actualProtectedGlobalJsonAfter);
assert.equal(commands.actualTiming, false);
assert.equal(commands.actualCommands.length, 2);
for (const command of commands.actualCommands)
{
    assert.equal(command.exitCode, 0);
    assert.equal(command.activation, '. .\\activate.ps1');
    assert.equal(hash('alias-validation/' + command.label + '.stdout.txt'), command.stdoutSha256);
    assert.equal(hash('alias-validation/' + command.label + '.stderr.txt'), command.stderrSha256);
}
for (const directory of ['alias-native', 'alias-preparation-001/alias-native'])
{
    for (const file of fs.readdirSync(path.join(root, directory)).filter(name => name.endsWith('.json')).sort())
    {
        const command = read(directory + '/' + file), prefix = directory + '/' + file.slice(0, -5);
        assert.equal(hash(prefix + '.stdout'), command.stdoutSha256);
        assert.equal(hash(prefix + '.stderr'), command.stderrSha256);
        assert.equal(command.actualExitCode, directory.includes('preparation') && file === '006.json' ? 128 : 0);
    }
}
if (process.argv.includes('--require-budgets'))
{
    const budgets = read('closed-alias-budgets.json');
    assert.deepEqual(budgets.map(budget => budget.findingId).sort(), allAliases.toSorted());
    for (const budget of budgets)
    {
        assert.equal(budget.closed, true);
        assert.equal(budget.authorizations.length, 0);
        assert.equal(budget.actualUnusedAuthorizationsPermanentlyClosed, 3);
        assert.ok(canonicals.includes(budget.canonicalFindingId));
    }
}
if (process.argv.includes('--require-seal'))
{
    for (const entry of read('capsule-file-hashes.json').files)
    {
        assert.equal(hash(entry.file), entry.sha256);
        assert.equal(fs.statSync(path.join(root, ...entry.file.split('/'))).size, entry.bytes);
    }
}
console.log(JSON.stringify({ actualAuditPassed: true, actualOriginalDefaultSourceSnapshots: 10,
    actualRetainedFindingsAssessed: 41, actualRoslynMappedRoleObservations: 58,
    actualIndependentExactMethodTextAndGeneratorMatches: actualIndependentlyMatchedWholeMethods,
    actualProvenAliases: 19, actualCanonicalStudiesRemainPending: 10,
    actualUnacceptedFindingsRemainPending: 12, actualNewFixesOrGainsClaimed: 0,
    actualNewPerformanceComparisons: 0, actualSourceIdentityOnlyNotRuntimeEquivalence: true }, null, 2));
