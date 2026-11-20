import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F133');
const root = String.raw`C:\src\aspnetcore`, current = String.raw`C:\src\autoperf-F042-default`;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const git = (cwd, ...args) =>
{
    const result = spawnSync('git', ['--no-pager', ...args], { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
};
assert.equal(fs.existsSync(path.join(run, 'plan.json')), false);
assert.equal(git(root, 'rev-parse', 'HEAD'), '37e809ead5824bc753a1c3d56f11615bdb1296c5');
assert.equal(git(current, 'rev-parse', 'HEAD'), read(path.join(run, 'research', 'upstream-main.json')).sha);
assert.equal(git(root, 'status', '--porcelain', '--untracked-files=no'), '');
assert.equal(git(current, 'status', '--porcelain', '--untracked-files=no'), '');
const files = [
    String.raw`src\Mvc\Mvc.Core\src\ModelBinding\Validation\DefaultUnionValidationStrategy.cs`,
    String.raw`src\Mvc\Mvc.Core\src\ModelBinding\Validation\ValidationVisitor.cs`,
    String.raw`src\Mvc\Mvc.Core\src\ModelBinding\Validation\DefaultComplexObjectValidationStrategy.cs`,
    String.raw`src\Mvc\Mvc.Core\src\ModelBinding\Metadata\DefaultModelMetadata.cs`,
    String.raw`src\Mvc\Mvc.Core\src\ModelBinding\Metadata\DefaultModelMetadataProvider.cs`,
    String.raw`src\Mvc\Mvc.Abstractions\src\ModelBinding\ModelMetadata.cs`,
    String.raw`src\Mvc\test\Mvc.IntegrationTests\UnionValidationIntegrationTest.cs`,
    String.raw`src\Mvc\test\Mvc.IntegrationTests\Microsoft.AspNetCore.Mvc.IntegrationTests.csproj`,
];
const snapshots = [];
const defaultDeltas = [];
for (const file of files)
{
    const diff = git(root, 'diff', '37e809ead5824bc753a1c3d56f11615bdb1296c5', git(current, 'rev-parse', 'HEAD'), '--', file);
    if (diff)
    {
        const name = file.replaceAll('\\', '_') + '.diff.txt';
        fs.writeFileSync(path.join(run, 'research', name), diff + '\n', { flag: 'wx' });
        defaultDeltas.push({ file, recordedDiff: 'research/' + name, sha256: sha(Buffer.from(diff + '\n')) });
    }
    for (const [role, checkout] of [['Original', root], ['Default', current]])
    {
        const bytes = fs.readFileSync(path.join(checkout, file));
        const destination = path.join(run, 'selected-source', role, file);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, bytes, { flag: 'wx' });
        snapshots.push({ role, file, bytes: bytes.length, sha256: sha(bytes) });
    }
}
const preserved = read(path.join(session, 'autoperf-runs', 'F132', 'preservation-baseline.json')).protectedFiles;
for (const file of preserved) assert.equal(sha(fs.readFileSync(path.join(root, file.file))), file.sha256);
const campaignFile = path.join(session, 'autoperf-campaign.json');
const plan = {
    findingId: 'F133', recordedAt: new Date().toISOString(), actualFinding: read(path.join(run, 'finding-intake.json')).next.finding,
    originalCommit: git(root, 'rev-parse', 'HEAD'), actualCurrentDefault: git(current, 'rev-parse', 'HEAD'),
    actualSelectedGitTextEqualFiles: files.filter(file => !defaultDeltas.some(delta => delta.file === file)),
    actualSupplementalDefaultDeltas: defaultDeltas, actualPhysicalSnapshots: snapshots,
    hypothesis: 'The flagged ContainerType.GetProperty fallback is guarded by Property metadata named Value and is bypassed by DefaultModelMetadata. Calling IsUnionValueProperty for every entry is not equivalent to rediscovering a property for every entry. Provider decoration alone need not produce non-default metadata. Establish the actual normal metadata producer and validation effect before proposing another cache.',
    acceptance: [
        'Run the actual existing UnionValidationIntegrationTest class from Original and actual Default, retain every individual XML execution/outcome and duplicate display-name rows.',
        'An unchanged C#13 public DI/IObjectModelValidator probe runs seven fixed profiles, both ordinary and decorated providers and two repetitions per role. Validate exact model-state keys/messages, actual union getters and real IValidatableObject invocation counts. Many-property union has seventeen reflected properties but only one Value-name candidate.',
        'Observe real metadata CLR types and stable cached references. Label fallback eligibility as a source predicate over actual metadata, not instrumented GetProperty calls. Do not equate provider decoration with replacement ModelMetadata or conflate other union reflection with this exact fallback.',
        'Bind six selected Core/Abstractions physical source documents to the actually loaded PE/PDB and capture runtime assembly paths/hashes. Freeze complete consumer inventories; no silent shared-framework owner substitution.',
        'Rebuild the exact two common inputs in a genuinely fresh project and repeat unchanged original/default characterization without timing. Do not call this an owner-graph or complete compiler-input reconstruction.',
        'If only the default/cached producer is established, reject the proposed default-hot-path/cache inference narrowly, with custom non-default metadata performance explicitly unmeasured, not unreachable or impossible. Do not claim a measured no-gain or a literal no-op.',
        'If realistic actionable custom-metadata evidence instead emerges, seal a separate fixed prototype/primary/control/qualification plan before edits or timing. Never infer speed or improvement from call counts alone.',
        'Keep all shipping files, protected root files, unrelated reports, previous capsules and fixed REPORT unchanged. No source PR or browser launch for an unestablished/rejected proposal.',
    ],
    fixedProbeProfiles: ['PublicInvalid', 'PublicValid', 'ManyPropertiesInvalid', 'ExplicitInvalid', 'NamesakeRequired', 'NamesakeCase', 'OrdinaryObject'],
    fixedProviderModes: ['Default', 'DecoratedProvider'], repetitions: 2,
    actualExpectedRowsPerRole: 28, actualTimingAuthorizedByThisPlan: false,
    observationBoundary: 'Actual public model validation and metadata production below HTTP; no callback injection, fake reflection counter, custom ModelMetadata producer, HTTP/browser, trimming/AOT or live metadata delta claim.',
    actualCodeNavigationLimit: 'Configured ADO scope is unrelated. Local C# LSP references returned only the same file and workspace symbols omitted known symbols; bounded Mvc.Core text fallback is not a global caller census.',
};
const bytes = Buffer.from(JSON.stringify(plan, null, 2) + '\n');
fs.writeFileSync(path.join(run, 'plan.json'), bytes, { flag: 'wx' });
fs.writeFileSync(path.join(run, 'plan-seal.json'), JSON.stringify({ sha256: sha(bytes), sealedAt: new Date().toISOString(), actualBeforeProbeBuildOrProductEdit: true }, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'diagnostic-budget.json'), JSON.stringify({ findingId: 'F133', maximumComparisons: 3, authorizations: [], closed: false, actualNoTimingAuthorizedByCurrentPlan: true }, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'preservation-baseline.json'), JSON.stringify({ recordedAt: new Date().toISOString(),
    root, current, rootHead: plan.originalCommit, currentHead: plan.actualCurrentDefault, rootBranch: git(root, 'branch', '--show-current'),
    rootStatus: git(root, 'status', '--porcelain'), protectedFiles: preserved, privateLedgerSha256: sha(fs.readFileSync(campaignFile)),
    publishedHead: git(path.join(session, 'autoperf-published-results'), 'rev-parse', 'HEAD'),
    fixedReportBlob: '73abf142464b1f81676e03a1eebc766c279cb47b' }, null, 2) + '\n', { flag: 'wx' });
git(root, 'switch', '-c', 'autoperf/F133-characterize-union-validation-metadata', plan.originalCommit);
console.log(JSON.stringify({ findingId: 'F133', sealedAcceptanceSha256: sha(bytes), selectedFiles: files.length,
    actualDefault: plan.actualCurrentDefault, actualSourceEdits: 0, actualTimingAuthorizations: 0 }, null, 2));
