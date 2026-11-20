import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F142');
const published = path.join(session, 'autoperf-published-results');
const target = path.join(published, 'OpenApiXmlCommentAliases');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const hash = file => sha(fs.readFileSync(file));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.equal(fs.existsSync(target), false);
const before = read(path.join(run, 'alias-preservation-baseline.json'));
assert.equal(hash(path.join(session, 'autoperf-campaign.json')), before.actualPrivateLedgerSha256);
const ledger = read(path.join(session, 'autoperf-campaign.json')), report = read(path.join(run, 'alias-observations.json'));
const check = spawnSync(process.execPath, [path.join(session, 'F142-verify-aliases.mjs'), run], { encoding: 'utf8' });
assert.equal(check.status, 0, check.stderr);
fs.writeFileSync(path.join(run, 'alias-audit-summary.json'), check.stdout, { flag: 'wx' });
const budgets = [];
for (const group of report.Groups)
{
    assert.equal(ledger.candidates.find(entry => entry.id === group.CanonicalFindingId).status, 'pending');
    for (const id of group.AliasFindingIds)
    {
        assert.equal(ledger.candidates.find(entry => entry.id === id).status, 'pending');
        const directory = path.join(session, 'autoperf-runs', id), budgetFile = path.join(directory, 'diagnostic-budget.json');
        assert.equal(fs.existsSync(budgetFile), false);
        const budget = { findingId: id, canonicalFindingId: group.CanonicalFindingId, maximumComparisons: 3,
            authorizations: [], closed: true, closedAt: new Date().toISOString(), actualUnusedAuthorizationsPermanentlyClosed: 3,
            actualTimingComparisons: 0, actualSourceIdentityOnly: true, actualCanonicalBudgetChanged: false,
            reason: 'Same retained card/snippet and exact generated containing method from the same source-emitter literal. The canonical study remains pending; distinct fixture data is not extra independent optimization evidence.' };
        fs.mkdirSync(directory, { recursive: true });
        write(budgetFile, budget);
        budgets.push(budget);
    }
}
assert.equal(budgets.length, 19);
write(path.join(run, 'closed-alias-budgets.json'), budgets);
write(path.join(run, 'alias-decision.json'), {
    recordedAt: new Date().toISOString(), disposition: '19 source-verified duplicate aliases; no canonical optimization finalized',
    actualAliasIds: budgets.map(budget => budget.findingId),
    actualCanonicalIdsStillPending: report.Groups.map(group => group.CanonicalFindingId),
    actualUnacceptedOriginalIdsStillPending: report.Exclusions.filter(row => row.Role === 'Original').map(row => row.FindingId),
    actualNoNewFixPerformanceOrRuntimeEquivalenceClaim: true, actualTimingComparisons: 0,
    actualUnusedAuthorizationsPermanentlyClosedPerAlias: 3, actualCanonicalBudgetsUnchanged: true,
    actualOriginalStableIdsAndFullFindingRecordsPreserved: true,
    actualOtherSameMethodCardsNotCollapsed: true,
    actualFirstLongPathNativeFailureAndPartialSourcesPreserved: true,
    actualNoPersistentGitMachineOrSourceConfigChange: true,
    actualFrameworkSourceChangesOrPermanentTestsOrSourcePrOrBrowserLaunch: false,
    limits: 'Exact generated-method/source-emitter identity only. Distinct test fixtures remain valuable. This does not measure frequency, equivalence of complete generated assemblies, whole-app impact, fixes, allocation or speed. Twelve records failed strict mapping and remain pending, including F304; F306 is only the lowest verified member of its two-record group.',
});
fs.mkdirSync(target);
const copied = [], omitted = [];
function walk(directory, relative = '')
{
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)))
    {
        const file = relative ? relative + '/' + entry.name : entry.name, source = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(source, file);
        else
        {
            assert.ok(entry.isFile());
            const bytes = fs.readFileSync(source), identity = { file, bytes: bytes.length, sha256: sha(bytes) };
            if (file.split('/').some(part => part === 'bin' || part === 'obj')) omitted.push(identity);
            else
            {
                const destination = path.join(target, ...file.split('/'));
                fs.mkdirSync(path.dirname(destination), { recursive: true });
                fs.writeFileSync(destination, bytes, { flag: 'wx' });
                copied.push({ ...identity, actualPrivateSource: source });
            }
        }
    }
}
walk(run);
for (const name of ['F142-capture-alias-source.mjs', 'F142-verify-aliases.mjs', 'F142-build-alias-capsule.mjs'])
{
    const source = path.join(session, name), bytes = fs.readFileSync(source);
    fs.writeFileSync(path.join(target, name), bytes, { flag: 'wx' });
    copied.push({ file: name, bytes: bytes.length, sha256: sha(bytes), actualPrivateSource: source });
}
write(path.join(target, 'authoritative-copies.json'), copied);
write(path.join(target, 'omitted-file-hashes.json'), { scope: 'Every bin/obj file in this isolated source-analysis case only, not owner framework builds or other worktrees.', files: omitted });
fs.writeFileSync(path.join(target, '.gitattributes'), '* -text\n', { flag: 'wx' });
const rows = report.Groups.map(group =>
{
    const id = group.CanonicalFindingId, finding = ledger.candidates.find(entry => entry.id === id).finding;
    return `| ${id} (pending) | ${group.AliasFindingIds.join(', ')} | ${finding.summary} | \`${group.ContainingType}.${group.ContainingMethod}${group.ParameterList}\` |`;
}).join('\n');
const excluded = report.Exclusions.filter(row => row.Role === 'Original').map(row => row.FindingId).join(', ');
const readme = `# Generated XML-comment findings: source-verified aliases

**Nineteen retained records are duplicate emission sites of ten still-pending canonical studies. This is not nineteen fixes or measured improvements.** All original IDs and exact finding records remain in the campaign. Different test fixtures are not removed or called redundant tests.

The source scanner found repeated copies of generated boilerplate in four checked-in OpenAPI snapshots. The actual owner is the raw C# output template in \`XmlCommentGenerator.GenerateXmlCommentSupportSource\`, not each snapshot independently. One justified owner fix, if one is eventually established, would flow through the common generator. Canonical performance/correctness decisions are **not** made by this source-only classification.

## Original IDs and shared owner map

| Canonical study | Alias records | Finding | Actual generated method |
|---|---|---|---|
${rows}

F306 is the lowest **verified** member of its two-record group, not proof that the similar F304 is independent. F304 did not meet this pass's exact reported-span criterion and remains pending. Other distinct same-method patterns, such as F142, F243, F244, F245 and F246, retain separate canonical studies even though their containing method hashes match.

## Connected artifacts

| Artifact | Evidence |
|---|---|
| Strict pre-execution scope and acceptance | [Plan](alias-analysis-plan.json), [SHA256 seal](alias-plan-seal.json) |
| All41 original retained records | [Full unchanged findings](retained-snapshot-findings.json) |
| Complete source pins and identities | [Ten source snapshots and Git blob/SHA256/byte identities](alias-source-manifest.json) |
| Actual common producer | [Original emitter](alias-source/Original/src/OpenApi/gen/XmlCommentGenerator.Emitter.cs), [observed-default emitter](alias-source/Default/src/OpenApi/gen/XmlCommentGenerator.Emitter.cs) |
| Runnable C#13 Roslyn source-analysis utility | [Project](alias-tool/AutoPerf.OpenApiSourceAliases.csproj), [Program](alias-tool/Program.cs) |
| Actual execution | [Activated runner](run-alias-tool.ps1), [full command/result/hash receipt](alias-validation/receipt.json), [build output](alias-validation/build-001.stdout.txt), [execution output](alias-validation/execute-001.stdout.txt) |
| Complete method/source observations and exclusions | [Actual58 mapped role observations,10 groups,24 excluded role rows](alias-observations.json) |
| Independent recorded-source audit | [Passed audit](alias-audit-summary.json), [verifier](F142-verify-aliases.mjs) |
| Narrow disposition and closed alias-only budgets | [Decision](alias-decision.json), [19 individual closed budgets](closed-alias-budgets.json) |
| Preparation failure and recovery | [Actual native failure/correction](alias-preparation-001/correction.json), [source capture helper](F142-capture-alias-source.mjs) |
| Preservation and completeness | [Baseline](alias-preservation-baseline.json), [authoritative copies](authoritative-copies.json), [omitted files](omitted-file-hashes.json), [core seal](capsule-file-hashes.json) |

## What the proof establishes

Original is \`37e809ead5824bc753a1c3d56f11615bdb1296c5\`; the live default observed during intake was \`ae89581dfd24c6277b4267a9779d05f7b9f047f1\`. Pinned Git trees resolve the exact paths, and raw blob reads are checked by Git blob identity as well as SHA256 and byte length.

Roslyn parses each exact source snapshot, locates the actual method containing the reported span and checks that the original snippet occurs uniquely in that method and in its reported span. Each accepted group has the same card, containing type, method token kind/text identity and snippet. The entire method text must also occur in a literal chunk of the actual generator's interpolated raw string. Original/default identities are both retained.

The separate Node verifier independently recomputes all58 exact whole-method text hashes from physical line ranges, finds the literal whole method in the actual emitter source and requires byte-identical normalized-newline whole-method text within every published group. It verifies source Git blobs, all native/managed command streams and the original input hashes. This is stronger source evidence than matching one line or grouping by file/card alone; it still is **not** resolved runtime dispatch or full generated-assembly equivalence.

Of41 assessed records,29 mapped on both revisions: ten canonical studies and19 aliases. **Twelve unaccepted records remain pending:** ${excluded}. No mapping failure is a false duplicate or a no-gain decision.

## Execution and limits

The isolated syntax utility actually built and ran under the activated installed SDK: two commands exited0; compilation had zero warnings/errors. It is an untimed source analysis, **not a benchmark or product test**. There is no runtime producer, speed, allocation, safety, public-API, Hot Reload, trimming/AOT or whole-app claim for the canonical candidates.

The first inline native capture stopped on Git's long revision:path argument before any .NET execution or plan seal. Exact native arguments/streams and partial source are preserved. The corrected helper resolves short-prefix pinned trees and reads immutable blobs by ID; no persistent Git/Windows long-path setting was changed. Its capture helper is a historical execution script with fixed machine paths, not a clean path-agnostic bootstrap.

All19 alias budgets have zero authorizations and three unused authorizations permanently closed **per alias**. Canonical budgets remain untouched; measurements, if justified later, must pass the exclusive gateway. No shipping source/config, permanent test, source branch, source PR or browser launch was produced. The fixed classified report remains unchanged.

With matching SDK/Roslyn references, the two-input source-analysis project and captured inputs can reproduce the observations. \`node .\\F142-verify-aliases.mjs . --require-budgets --require-seal\` verifies the recorded public capsule without omitted bin/obj files. The immutable core predates the additive publication receipt and live campaign-index update.
`;
fs.writeFileSync(path.join(target, 'README.md'), readme, { flag: 'wx' });
const files = [];
function inventory(directory, relative = '')
{
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)))
    {
        const file = relative ? relative + '/' + entry.name : entry.name, current = path.join(directory, entry.name);
        if (entry.isDirectory()) inventory(current, file);
        else
        {
            const bytes = fs.readFileSync(current);
            files.push({ file, bytes: bytes.length, sha256: sha(bytes) });
        }
    }
}
inventory(target);
write(path.join(target, 'capsule-file-hashes.json'), { algorithm: 'SHA256', selfExcluded: true, files });
let links = 0;
for (const match of readme.matchAll(/\]\(([^)]+)\)/g))
{
    assert.ok(fs.existsSync(path.join(target, ...match[1].split('/'))), match[1]);
    links++;
}
const audit = spawnSync(process.execPath, [path.join(target, 'F142-verify-aliases.mjs'), target, '--require-budgets', '--require-seal'], { encoding: 'utf8' });
assert.equal(audit.status, 0, audit.stderr);
const preparation = { recordedAt: new Date().toISOString(), actualImmutableCoreFiles: files.length + 1,
    actualAuthoritativeCopies: copied.length, actualIndividuallyHashedOmittedFiles: omitted.length,
    actualLocalLinksChecked: links, actualSealedCapsuleAuditPassed: JSON.parse(audit.stdout).actualAuditPassed,
    actualProvenAliases: 19, actualCanonicalStudiesRemainPending: 10, actualUnacceptedFindingsRemainPending: 12,
    actualNewFixesOrGains: 0, actualTimingComparisons: 0, actualProgressNotYetAdvanced: true };
write(path.join(run, 'alias-capsule-preparation.json'), preparation);
console.log(JSON.stringify(preparation, null, 2));
