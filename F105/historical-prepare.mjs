import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F105');
const repo = 'C:\\src\\aspnetcore';
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F105-validation-state-enumeration';
const read = name => JSON.parse(fs.readFileSync(path.join(run, name), 'utf8').replace(/^\uFEFF/, ''));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const gitBlob = bytes => crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
function git(args, input)
{
    const result = spawnSync('git', args, { cwd: repo, input, maxBuffer: 8 * 1024 * 1024,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
    assert.equal(result.status, 0, `git ${args.join(' ')} failed:${result.stderr.toString()}`);

    return result.stdout;
}
const gitText = args => git(args).toString('utf8').trim();
assert(!fs.existsSync(path.join(run, 'producer-source-copies.json')), 'F105 source capture exists;inspect rather than overwrite.');
assert.equal(gitText(['rev-parse', 'HEAD']), baseline);
assert.equal(gitText(['status', '--porcelain', '--untracked-files=no']), '');
assert(/^https:\/\/github\.com\/dotnet\/aspnetcore(?:\.git)?$/.test(gitText(['remote', 'get-url', 'origin'])),
    'The expected official public Git origin is required.');
const current = read('current-default-commit.json');
const startedAt = new Date().toISOString();
const fetchArguments = ['fetch', '--quiet', '--no-tags', '--no-recurse-submodules', 'origin', 'main'];
git(fetchArguments);
const fetched = gitText(['rev-parse', 'FETCH_HEAD']);
assert.equal(gitText(['rev-parse', `${current.sha}^{tree}`]), current.commit.tree.sha);
git(['merge-base', '--is-ancestor', current.sha, fetched]);
fs.writeFileSync(path.join(run, 'source-fetch-command.json'), JSON.stringify({
    command: 'git ' + fetchArguments.join(' '), exitCode: 0, startedAt, completedAt: new Date().toISOString(),
    capturedCurrentDefaultRevision: current.sha, actualFetchedMainRevision: fetched,
    actualCapturedDefaultTree: current.commit.tree.sha,
    canonicalSourceCameFromActualFetchedGitObjects: true, githubContentsApiRetrievalClaimedForPrimarySources: false,
    sourceCheckoutHeadChanged: false
}, null, 2) + '\n');
const sources = [
    'src\\Mvc\\Mvc.Abstractions\\src\\ModelBinding\\Validation\\ValidationStateDictionary.cs',
    'src\\Mvc\\Mvc.Abstractions\\src\\ModelBinding\\Validation\\ValidationStateEntry.cs',
    'src\\Mvc\\Mvc.Abstractions\\src\\ModelBinding\\ModelBindingContext.cs',
    'src\\Mvc\\Mvc.Abstractions\\src\\PublicAPI.Shipped.txt',
    'src\\Mvc\\Mvc.Abstractions\\src\\PublicAPI.Unshipped.txt',
    'src\\Mvc\\Mvc.Abstractions\\src\\Microsoft.AspNetCore.Mvc.Abstractions.csproj',
    'src\\Mvc\\Mvc.Core\\src\\ModelBinding\\ObjectModelValidator.cs',
    'src\\Mvc\\Mvc.Core\\src\\ModelBinding\\Validation\\DefaultObjectValidator.cs',
    'src\\Mvc\\Mvc.Core\\src\\ModelBinding\\Validation\\ValidationVisitor.cs',
    'src\\Mvc\\Mvc.Core\\src\\ModelBinding\\DefaultModelBindingContext.cs',
    'src\\Mvc\\Mvc.Core\\src\\DependencyInjection\\MvcCoreServiceCollectionExtensions.cs',
    'src\\Mvc\\Mvc.Core\\src\\Microsoft.AspNetCore.Mvc.Core.csproj',
    'src\\Mvc\\Mvc.Core\\test\\ModelBinding\\Validation\\DefaultObjectValidatorTests.cs',
    'src\\Mvc\\Mvc.Core\\test\\Microsoft.AspNetCore.Mvc.Core.Test.csproj',
    'src\\Mvc\\Mvc.DataAnnotations\\src\\DataAnnotationsModelValidator.cs',
    'src\\Mvc\\Mvc.DataAnnotations\\src\\DataAnnotationsModelValidatorProvider.cs',
    'src\\Mvc\\Mvc.DataAnnotations\\src\\RequiredAttributeAdapter.cs',
    'src\\Mvc\\Mvc.DataAnnotations\\src\\DependencyInjection\\MvcDataAnnotationsMvcCoreBuilderExtensions.cs',
    'src\\Mvc\\Mvc.DataAnnotations\\src\\DependencyInjection\\MvcDataAnnotationsMvcOptionsSetup.cs',
    'src\\Mvc\\Mvc.DataAnnotations\\src\\Microsoft.AspNetCore.Mvc.DataAnnotations.csproj'
];
const copies = sources.map(source =>
{
    const gitPath = source.replaceAll('\\', '/');
    const canonical = git(['show', `${current.sha}:${gitPath}`]);
    const baselineBytes = git(['show', `${baseline}:${gitPath}`]);
    const raw = fs.readFileSync(path.join(repo, source));
    const clean = Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
    const actualCurrentBlob = gitText(['rev-parse', `${current.sha}:${gitPath}`]);
    const actualBaselineBlob = gitText(['rev-parse', `${baseline}:${gitPath}`]);
    assert.equal(gitBlob(canonical), actualCurrentBlob);
    assert.equal(gitBlob(baselineBytes), actualBaselineBlob);
    const actualWorkingBlob = git(['hash-object', '--path=' + gitPath, '--stdin'], raw).toString().trim();
    assert.equal(gitBlob(clean), actualWorkingBlob, 'Separate raw source bytes from the verified Git clean representation.');
    const rawSnapshot = path.join('producer-source', source);
    const canonicalSnapshot = path.join('current-default-canonical', source);
    const baselineSnapshot = path.join('baseline-canonical', source);
    for (const [relative, bytes] of [[rawSnapshot, raw], [canonicalSnapshot, canonical], [baselineSnapshot, baselineBytes]])
    {
        fs.mkdirSync(path.dirname(path.join(run, relative)), { recursive: true });
        fs.writeFileSync(path.join(run, relative), bytes);
    }

    return { path: source, currentDefaultGitBlob: actualCurrentBlob, baselineGitBlob: actualBaselineBlob,
        workingGitBlob: actualWorkingBlob,
        equalityVerified: actualCurrentBlob === actualBaselineBlob && actualBaselineBlob === actualWorkingBlob,
        canonicalFetchedBytesVerified: true, rawSnapshot, rawSha256: sha(raw), rawBytes: raw.length,
        canonicalSnapshot, canonicalSha256: sha(canonical), canonicalBytes: canonical.length,
        baselineSnapshot, baselineSha256: sha(baselineBytes), baselineBytes: baselineBytes.length,
        actualCapturedDefaultTree: current.commit.tree.sha, actualFetchedMainRevision: fetched,
        actualDefaultRevision: current.sha, canonicalGitCleanFilterSeparateFromRawBytes: true };
});
fs.writeFileSync(path.join(run, 'producer-source-copies.json'), JSON.stringify(copies, null, 2) + '\n');
assert(copies.every(row => row.equalityVerified), 'Captured scoped source differences require review before building.');
const ownerText = fs.readFileSync(path.join(repo, sources[0]), 'utf8');
assert(ownerText.includes('public IEnumerator<KeyValuePair<object, ValidationStateEntry>> GetEnumerator()'));
assert(ownerText.includes('return ((IDictionary<object, ValidationStateEntry>)_inner).GetEnumerator();'));
const api = fs.readFileSync(path.join(repo, sources[3]), 'utf8').split(/\r?\n/)
    .filter(line => line.includes('ValidationStateDictionary.GetEnumerator()'));
assert.equal(api.length, 1);
const proposal = read('related-70210-pr.json');
const proposalFiles = read('related-70210-files.json');
assert.equal(proposalFiles.length, 5);
assert(proposalFiles.every(row => row.blob_url.includes('/' + proposal.headRefOid + '/')),
    'Related file patches must belong to the actually captured proposal head.');
const related = read('related-70210-owner-content.json');
const relatedBytes = Buffer.from(related.content, 'base64');
assert.equal(gitBlob(relatedBytes), related.sha);
const relatedText = relatedBytes.toString('utf8');
assert(relatedText.includes('public IEnumerator<KeyValuePair<object, ValidationStateEntry>> GetEnumerator()') &&
    relatedText.includes('return ((IDictionary<object, ValidationStateEntry>)Inner).GetEnumerator();'));
fs.writeFileSync(path.join(run, 'related-70210-owner-canonical.cs'), relatedBytes);
fs.copyFileSync(path.join(session, 'F105-acceptance.md'), path.join(run, 'acceptance.md'));
fs.copyFileSync(path.join(session, 'F105-api-assessment.md'), path.join(run, 'api-assessment.md'));
const controlNames = [
    'Validate_SimpleValueType_Valid_WithPrefix',
    'Validate_SimpleReferenceType_Valid_WithPrefix',
    'Validate_SimpleType_MaxErrorsReached',
    'Validate_SimpleType_SuppressValidation',
    'Validate_SimpleType_SuppressValidationWithNullKey',
    'Validate_ComplexValueType_Valid',
    'Validate_ComplexReferenceType_Valid',
    'Validate_ComplexReferenceType_Invalid',
    'Validate_ComplexType_SuppressValidation',
    'Validate_DoesNotUseOverridden_GetHashCodeOrEquals'
];
const tests = fs.readFileSync(path.join(repo, sources[12]), 'utf8');
for (const name of controlNames)
{
    assert(new RegExp('\\[Fact\\]\\s+public void ' + name + '\\(\\)').test(tests), 'Exact existing nonconditional Fact required:' + name);
}
fs.writeFileSync(path.join(run, 'selected-owning-controls.json'), JSON.stringify({
    candidate: 'F105', className: 'Microsoft.AspNetCore.Mvc.ModelBinding.Validation.DefaultObjectValidatorTests',
    source: sources[12], sourceSha256: copies[12].rawSha256, factNames: controlNames,
    expectedRows: 10, selectedInlineDataRows: 0, dedicatedValidationStateDictionaryTestExistsAtBaseline: false
}, null, 2) + '\n');
git(['switch', '-c', branch, baseline]);
const history = read('owner-history.json');
fs.writeFileSync(path.join(run, 'current-source-investigation.json'), JSON.stringify({
    candidate: 'F105', sourceRevision: baseline, branch, currentDefaultRevision: current.sha,
    fetchedMainRevision: fetched, verifiedScopedSources: copies.length,
    existingPublicEnumerationApi: api[0], publicReturnTypeRemainsInterface: true,
    currentOwnerHistoryEntriesInBoundedPathQuery: history.length, latestRecordedOwnerCommit: history[0].sha,
    latestRecordedOwnerDate: history[0].commit.committer.date,
    relatedValidationStatePullRequestMatches: read('related-validation-state-pull-requests.json').length,
    related70210Head: proposal.headRefOid, related70210OwnerBlob: related.sha,
    related70210StillHasInterfaceReturningEnumeration: true,
    related70210StorageLazinessNotSameAsConcreteEnumeratorReturn: true,
    relatedWorkQueryNotExhaustiveAbsenceProof: true,
    githubSemanticIndexUnavailableHttp404: true, lspReturnedOnlyThreeSameFileReferencesNotSolutionCoverage: true,
    inspectedValidationVisitorUsesTryGetValue: true, fullFrameworkEnumerationAbsenceClaimed: false,
    acceptanceRecordedBeforeImplementation: true, noShippingSourceChange: true,
    recordedAt: new Date().toISOString()
}, null, 2) + '\n');
console.log(`F105:${copies.length} exact current/baseline/working source identities/Git-fetched canonical bytes;shipped IEnumerator contract/actual70210 scope and10 selected original Facts captured;independent baseline branch created.`);
