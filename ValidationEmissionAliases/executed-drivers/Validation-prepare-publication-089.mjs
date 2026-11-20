import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const parallel = path.join(session, 'autoperf-parallelism');
const source = path.join(parallel, 'finding-ValidationAliases-080');
const root = path.join(session, 'autoperf-published-results', 'ValidationEmissionAliases');
const run = path.join(session, 'autoperf-runs', 'ValidationEmissionAliases');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.deepEqual(fs.readdirSync(root).sort(), ['.gitattributes', 'README.md', 'verify.mjs']);
assert(!fs.existsSync(run));
assert(!fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')));
const audit = read(path.join(parallel, 'Validation-Verify-080.stdout.txt'));
assert.equal(audit.actualAudit, 'PASS');
assert.equal(audit.actualIndependentlyMatchedWholeResourceAndReportedSeams, 52);
assert.equal(audit.actualIndependentMappingControlsPassed, 5);
assert.equal(audit.actualSourceEmissionAliases, 23);
for (const stage of ['Analyze', 'Verify']) {
    const receipt = read(path.join(parallel, 'Validation-' + stage + '-080.exit.json'));
    assert.equal(receipt.actualExitCode, 0);
    assert.equal(receipt.actualRootTerminal, true);
    assert.equal(receipt.actualStdoutDrained, true);
    assert.equal(receipt.actualStderrDrained, true);
}
const capture = read(path.join(parallel, 'Validation-capture-080.exit.json'));
assert.equal(capture.actualExitCode, 0);
assert.equal(capture.actualRootTerminal, true);
assert.equal(capture.actualStreamsDrained, true);
const campaignFile = path.join(session, 'autoperf-campaign.json'), campaign = read(campaignFile);
const preservation = read(path.join(source, 'preservation-baseline.json'));
assert.equal(sha(fs.readFileSync(campaignFile)), preservation.actualPrivateLedgerSha256);
const result = read(path.join(source, 'alias-observations.json'));
const groups = result.actualGroups, ids = groups.flatMap(item => item.aliases).sort();
const canonical = groups.map(item => item.canonical);
assert.equal(ids.length, 23);
assert.deepEqual(canonical, ['F343', 'F344', 'F345']);
for (const id of [...canonical, ...ids]) assert.equal(campaign.candidates.find(item => item.id === id).status, 'pending');
fs.mkdirSync(run);
const canonicalBefore = canonical.map(findingId => {
    const file = path.join(session, 'autoperf-runs', findingId, 'diagnostic-budget.json');
    return { findingId, actualKnownPrivateBudgetPath: file, actualExistedBefore: fs.existsSync(file),
        actualSha256Before: fs.existsSync(file) ? sha(fs.readFileSync(file)) : null };
});
write(path.join(root, 'canonical-budget-preservation.json'), {
    actualCanonicalRecords: campaign.candidates.filter(item => canonical.includes(item.id)),
    actualKnownCanonicalBudgetPathsBefore: canonicalBefore,
    actualNoCanonicalBudgetCreatedOrModified: true,
    actualThisOperationClosesOnlyThe23PredeclaredAliasBudgets: true,
    actualExpectedCanonicalRecordsUnchangedThroughPublication: true
});
const copies = [];
function copy(file, logical) {
    const raw = fs.readFileSync(file), destination = path.join(root, ...logical.split('/'));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, raw, { flag: 'wx' });
    assert.equal(sha(fs.readFileSync(destination)), sha(raw));
    copies.push({ file: logical, actualSourcePath: file, bytes: raw.length, sha256: sha(raw) });
}
function copyTree(directory, prefix) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        assert(!entry.isSymbolicLink());
        const file = path.join(directory, entry.name), logical = prefix + '/' + entry.name;
        if (entry.isDirectory()) copyTree(file, logical);
        else {
            assert(entry.isFile());
            copy(file, logical);
        }
    }
}
copyTree(source, 'source-proof');
const sourceFiles = copies.length, sourceBytes = copies.reduce((sum, item) => sum + item.bytes, 0);
for (const suffix of ['stdout.txt', 'stderr.txt', 'exit.json']) {
    copy(path.join(parallel, 'Validation-capture-080.' + suffix), 'execution/capture.' + suffix);
}
for (const stage of ['Analyze', 'Verify']) {
    for (const suffix of ['stdout.txt', 'stderr.txt', 'exit.json', 'executed-command.ps1']) {
        copy(path.join(parallel, 'Validation-' + stage + '-080.' + suffix), 'execution/' + stage.toLowerCase() + '.' + suffix);
    }
}
for (const name of ['Validation-prepare-publication-089.mjs', 'Validation-publication-command-089.ps1', 'autoperf-publish-bounded-outcome-033.mjs']) {
    copy(path.join(session, name), 'executed-drivers/' + name);
}
write(path.join(root, 'authoritative-copies.json'), copies);
const decision = {
    recordedAt: new Date().toISOString(), actualSourceEmissionAliases: 23, actualAliases: ids,
    actualCanonicalStudiesRemainPending: canonical, actualCanonicalBudgetsUntouched: true,
    actualWholeResourcesAndReportedSeamsMatchedOnBothPins: 52,
    actualSourceFiles: 44, actualRawGitObjects: 35, actualMemberships: 44, actualMappingControls: 5,
    actualOriginalRecordsAndAbbreviatedSnippetsUnchanged: true,
    actualSourceOnlyNotNativeGeneratorExecutionOrPerformanceVerdict: true,
    actualNoWholeFixtureOrGeneratedAssemblyRuntimeEquivalence: true,
    actualNoMaterialWorkloadOrCacheCorrectnessClaimForCanonicals: true,
    actualProductTestOrPerformanceRuns: 0, actualPerformancePrAuthorized: false,
    actualNoCandidatePrWindowOrFixedReportChange: true,
    actualSourceEnvelopeFiles: sourceFiles, actualSourceEnvelopeBytes: sourceBytes,
    actualCopiedFiles: copies.length, actualCopiedBytes: copies.reduce((sum, item) => sum + item.bytes, 0),
    actualNoCopyOmissions: true, groups
};
write(path.join(root, 'alias-decision.json'), decision);
const budgets = ids.map(findingId => {
    const group = groups.find(item => item.aliases.includes(findingId));
    return { findingId, canonical: group.canonical, maximumComparisons: 3, authorizations: [], closed: true,
        actualComparisons: 0, actualCandidateWritten: false, actualUnusedAuthorizationsPermanentlyClosed: 3,
        closedAt: new Date().toISOString(),
        closingReason: 'Source-verified emission alias of pending ' + group.canonical +
            '; not an independent fix, measured improvement, no-gain or canonical verdict.' };
});
write(path.join(root, 'closed-alias-budgets.json'), budgets);
for (const budget of budgets) {
    const directory = path.join(run, budget.findingId);
    fs.mkdirSync(directory);
    write(path.join(directory, 'diagnostic-budget.json'), budget);
}
for (const before of canonicalBefore) {
    assert.equal(fs.existsSync(before.actualKnownPrivateBudgetPath), before.actualExistedBefore);
    if (before.actualExistedBefore) assert.equal(sha(fs.readFileSync(before.actualKnownPrivateBudgetPath)), before.actualSha256Before);
}
write(path.join(run, 'publication-config.json'), {
    folder: 'ValidationEmissionAliases', run, expectedParentIndex: '7c8eccd84b536ee2a444b4bb536c364b4dce63d4',
    performancePrAuthorized: false, subtype: 'source-verified-validation-resource-emission-alias',
    authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf ValidationEmissionAliases] Consolidate 23 repeated source-emission findings',
    issueSearch: '"AutoPerf ValidationEmissionAliases" in:title',
    evidenceCommitTitle: 'Preserve exact validation resource emission aliases and owner boundaries',
    evidenceCommitDescription: 'Frozen26retainedrecordscope beforesourceclassification. Original37/currentobservedDefaultd348;44fullsources/35rawGitobjects/44memberships/51readOnlyGitGhcommands. Actualprojectembeds7resources,helperprefixesnonemptylines4spaces,mainemitterinsertsunchangedfilelocalclasses. Independentwhole-resource/reported-seam52roleproofs,5syntheticmappingcontrols. Originalabbreviatedsnippetsunchanged,F343rangeclassnotonecontainingmethod. CanonicalF343/F344/F345remainpending;only23repeatedemissionsitesduplicate. Not23fixes,whole-fixture/runtimeequivalence,nativegeneratorexecution,materialworkloadorcachecorrectnessclaim. Alias0of3permanentlyclosed;canonicalbudgetsunchanged. No candidate,producttest,benchmark,performancePR,Edgewindow,protectedconfigorfixedREPORTchange.',
    indexCommitTitle: 'Index 23 validation emission aliases without closing canonical studies',
    outcomes: ids.map(id => {
        const group = groups.find(item => item.aliases.includes(id));
        return { id, status: 'duplicate',
            note: 'Source-verified repeated embedded-resource emission of pending ' + group.canonical + ': ' +
                group.actualResource + '. Frozen26recordscope;Original37/Defaultd348,44sources35rawGitobjects44memberships51GitGhcommands. Wholeexactclassbodyplusreportedreflectionseamuniquelymatchedbothpins,52roleproofsand5independentmappingcontrols;originalshorthandsnippetnotpromotedtoliteralidentity. F343rangeclassnotfalselyonecontainingmethod. Notanindependentfix,measuredgain,no-gain,fullfixture/generatedassemblyruntimeequivalence,nativeproducttest,materialworkloadorcachecorrectnessverdict. CanonicalremainsPENDING/budgetuntouched,aliasonly0of3permanentlyclosed;no candidate/benchmark/performancePR/window/REPORTchange.',
            readmeRow: '| ' + id + ' | **Source-emission alias** of pending ' + group.canonical +
                '; not an independent fix or measured improvement. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [Resource/seam evidence](ValidationEmissionAliases/README.md), [verified publication](ValidationEmissionAliases/publication.json) |' };
    })
});
console.log(JSON.stringify({ actualPreparedSourceEmissionAliases: ids, actualCanonicalsStillPending: canonical,
    actualSourceEnvelopeFiles: sourceFiles, actualSourceEnvelopeBytes: sourceBytes,
    actualCopiedFiles: copies.length, actualCopiedBytes: decision.actualCopiedBytes,
    actualEachAliasPermanentlyClosed: '0of3', actualProductCompilerTestConsumerOrPerformanceRuns: 0 }, null, 2));
