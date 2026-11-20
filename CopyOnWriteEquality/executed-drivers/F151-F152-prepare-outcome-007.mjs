import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const parallel = path.join(session, 'autoperf-parallelism');
const source = path.join(parallel, 'finding-F151-F152-005');
const canonical = path.join(parallel, 'finding-F151-F152-canonical-007');
const published = path.join(session, 'autoperf-published-results');
const folder = 'CopyOnWriteEquality';
const capsule = path.join(published, folder);
const run = path.join(session, 'autoperf-runs', 'F151-F152');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.equal(fs.existsSync(capsule), false);
assert.equal(fs.existsSync(run), false);
assert.equal(hash(path.join(source, 'frozen-files.json')), '9A079C70E97F65AF6B5E72CB3D5E39301E51BA978528D9348807843557312818');
assert.equal(read(path.join(canonical, 'verified-canonical-default.json')).actualCanonicalDefaultTestRowsPassed, 3);
fs.mkdirSync(capsule);
fs.mkdirSync(run);
fs.writeFileSync(path.join(capsule, '.gitattributes'), '* -text\n', { flag: 'wx' });
const copies = [], omitted = [];
function copy(sourceFile, relative, skip = false)
{
    const stat = fs.statSync(sourceFile);
    const metadata = { file: relative.replaceAll('\\', '/'), bytes: stat.size, sha256: hash(sourceFile), actualSourcePath: sourceFile };
    if (skip || /\.(dll|pdb|exe|cache)$/i.test(sourceFile))
    {
        omitted.push(metadata);
        return;
    }
    const target = path.join(capsule, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(sourceFile, target, fs.constants.COPYFILE_EXCL);
    assert.equal(hash(target), metadata.sha256);
    copies.push(metadata);
}
for (const item of read(path.join(source, 'frozen-files.json')))
{
    assert.equal(hash(path.join(source, item.path)), item.sha256);
    copy(path.join(source, item.path), path.join('owner-handoff', item.path));
}
for (const file of ['frozen-files.json', 'frozen-files.sha256'])
{
    copy(path.join(source, file), path.join('owner-handoff', file));
}
function copyCanonical(directory, relative = '')
{
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }))
    {
        assert.equal(entry.isSymbolicLink(), false);
        const file = path.join(directory, entry.name), logical = path.join(relative, entry.name);
        if (entry.isDirectory()) { copyCanonical(file, logical); }
        else { copy(file, path.join('canonical-default-007', logical), logical.split(path.sep)[0] === 'consumer'); }
    }
}
copyCanonical(canonical);
copy(path.join(session, 'F151-verify-canonical-default-007.ps1'), 'F151-verify-canonical-default-007.ps1');
copy(path.join(parallel, 'coordinator-frozen-handoff-007-verification.json'), 'coordinator-frozen-handoff-007-verification.json');
copy(path.join(session, 'F151-F152-prepare-outcome-007.mjs'), 'executed-drivers/F151-F152-prepare-outcome-007.mjs');
copy(path.join(session, 'autoperf-publish-bounded-outcome-007.mjs'), 'executed-drivers/autoperf-publish-bounded-outcome-007.mjs');
const identities = [];
const codePath = 'src/Mvc/Mvc.Core/src/Infrastructure/CopyOnWriteList.cs';
for (const revision of ['37e809ead5824bc753a1c3d56f11615bdb1296c5', 'ae89581dfd24c6277b4267a9779d05f7b9f047f1', '00560e2dd1954a2acf2bc54b35422b0f32484bf1'])
{
    const actualGitBlob = revision.startsWith('00560')
        ? execFileSync('gh', ['api', `repos/dotnet/aspnetcore/contents/${codePath}?ref=${revision}`, '--jq', '.sha'], { encoding: 'utf8', windowsHide: true }).trim()
        : execFileSync('git', ['--no-pager', '-C', String.raw`C:\src\aspnetcore`, 'rev-parse', revision + ':' + codePath], { encoding: 'utf8', windowsHide: true }).trim();
    assert.equal(actualGitBlob, '0c33a107e4464129ce8eb5b6fda3f78cc9d889e7');
    identities.push({ revision, path: codePath, actualGitBlob });
}
write(path.join(capsule, 'latest-target-identity.json'), { recordedAt: new Date().toISOString(), identities,
    boundary: 'Exact target file identity only. Existing runtime producer graphs remain explicitly pinned37e809/ae89581; no claim that the full later00560 framework graph was rebuilt.' });
const decisions = ['F151', 'F152'].map(id => ({
    id, disposition: 'rejected', subtype: 'boxing-prerequisite-unestablished',
    actualNoCandidateAppliedOrComparisonAuthorized: true,
    rationale: 'Real exercised MVC producers close CopyOnWriteList over IValueProviderFactory, a reference interface, even when storing an already-boxed struct factory. No material shipping value-type T producer established. Concrete helper-only divergent IEquatable<T> witnesses demonstrate conditional comparer-contract differences, not a shipping MVC incompatibility or complete absence proof.',
    contract: id === 'F151' ? 'Contains membership' : 'IndexOf first matching index/-1',
    actualDistinctFindingsNotAliasesOrReplayedF123: true
}));
write(path.join(capsule, 'decisions.json'), { recordedAt: new Date().toISOString(), decisions,
    actualMeasuredNoGain: false, actualLiteralNoOpOrZeroBoxingEverywhereClaim: false,
    actualExistingRemoveEqualityBehaviorUnchanged: true, actualNewPerformancePrAuthorized: false });
for (const decision of decisions)
{
    const caseRoot = path.join(session, 'autoperf-runs', decision.id);
    fs.mkdirSync(caseRoot, { recursive: true });
    const budget = { findingId: decision.id, maximumAuthorizations: 3, authorizations: [], closed: true,
        closedAt: new Date().toISOString(), closureReason: 'Unestablished material value-type generic producer; no candidate or performance comparison admitted. Conditional helper equality changes retained. Not measured no-gain or absence proof.' };
    write(path.join(caseRoot, 'diagnostic-budget.json'), budget);
    write(path.join(capsule, decision.id + '-closed-budget.json'), budget);
}
write(path.join(capsule, 'authoritative-copies.json'), copies);
write(path.join(capsule, 'omitted-file-hashes.json'), { reason: 'Compiled images and complete copied native test consumer omitted; exact hashes retained. Source projects/probes/scripts and actual JSON/TRX/native host traces retained. Existing pinned source/output/runtime inputs remain prerequisites, not turnkey full-clone reconstruction.', files: omitted });
const note = id => id + ' boxing optimization not admitted: actual original/default MVC registration/routing/resource-filter producers close T=IValueProviderFactory(reference interface), including a struct already boxed at options insertion; no material value-type T shipping producer established, not proof universal absence. Both pins183assertions each:136realMVC,36explicitly helper-only divergent IEquatable,11identity/runtime. Contains membership and IndexOf first-index/-1 before/after real Add-triggered copy, configured options and next-request isolation preserved. Helper comparer substitution changes concrete equality witnesses but is not claimed to break this real interface-closed MVC producer. Original canonical3/3 on62, default explicit fallback3/3 on57, then unchanged canonical268config3/3 using already available private runtime, native host trace retained; old230-file capsule preserved. Selected ownerPE/PDB plus4source documents/pin; both producers on exact57, not a whole-framework comparison. Later00560 target Git blob unchanged; full later framework not rebuilt. Zero candidate changes/timings; separate closed0of3budgets, no alias/replay, no performancePR.';
const config = {
    folder, run, expectedParentIndex: '9424fb114e9fa345ff7f3c0c332c9119ef80ded5', performancePrAuthorized: false,
    subtype: 'boxing-prerequisite-unestablished', authoredMarkdown: ['README.md', 'validation-commands.md'],
    issueTitle: '[AutoPerf F151/F152] MVC boxing prerequisite remains unestablished', issueSearch: 'F151 in:title',
    evidenceCommitTitle: 'Publish bounded MVC CopyOnWriteList equality evidence',
    evidenceCommitDescription: 'Keep F151 Contains and F152 IndexOf distinct. Actual MVC closes T over IValueProviderFactory, including already-boxed struct entries; no material value-type generic producer is established. Preserve136 real MVC plus36 helper-only plus11 identity assertions per source, four selected source/PE/PDB associations per pin, original and explicitly labeled fallback tests, then all3 default canonical-runtime tests using an existing private runtime with unchanged config and native host trace. No source/candidate changes, comparisons or performance PR, no universal absence/no-op claim. Existing Remove semantics and previous F120/F123 studies untouched.',
    indexCommitTitle: 'Index two unestablished MVC boxing proposals',
    outcomes: decisions.map(decision => ({
        id: decision.id, status: 'rejected', note: note(decision.id),
        readmeRow: `| ${decision.id} | Not admitted: ${decision.contract}; no material value-type T producer established in real MVC. Helper-only comparer contract differences are not shipping reachability proof.183 assertions/pin, canonical3/3 tests per role plus explicit fallback preserved;0 comparisons/no PR. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [Bounded MVC equality study](CopyOnWriteEquality/README.md), [verified publication](CopyOnWriteEquality/publication.json) |`
    }))
};
write(path.join(run, 'publication-config.json'), config);
console.log(JSON.stringify({ actualCopiedFiles: copies.length, actualIndividuallyHashedOmissions: omitted.length, capsule, config: path.join(run, 'publication-config.json') }, null, 2));
