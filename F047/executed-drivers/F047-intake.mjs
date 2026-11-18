import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = 'C:\\src\\aspnetcore';
const current = 'C:\\src\\autoperf-F042-default';
const run = path.join(session, 'autoperf-runs', 'F047');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F047-ssr-parameter-enumeration';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
assert.equal(fs.existsSync(run), false, 'Never overwrite F047 evidence.');
const ledger = read(path.join(session, 'autoperf-campaign.json'));
assert.equal(ledger.candidates.find(row => row.id === 'F047').status, 'pending');
assert.equal(ledger.candidates.filter(row => ['drafted', 'no-gain', 'rejected', 'duplicate'].includes(row.status)).length, 123);
assert.deepEqual(ledger, read(path.join(session, 'autoperf-published-results', 'campaign.json')));
fs.mkdirSync(run, { recursive: true });
const calls = [];
function capture(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, windowsHide: true, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.ifError(result.error);
  calls.push({ command, arguments: args, workingDirectory: cwd, actualExitCode: result.status, stdout: result.stdout, stderr: result.stderr });
  fs.writeFileSync(path.join(run, 'intake-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, `${command}: ${result.stderr}\n${result.stdout}`);
  return result.stdout.trim();
}
const git = (args, cwd = root) => capture('git', ['-c', 'core.longpaths=true', '--no-pager', ...args], cwd);
assert.equal(git(['diff', '--name-only']), '');
assert.equal(git(['diff', '--cached', '--name-only']), '');
assert.equal(git(['rev-parse', 'HEAD']), '4b84f010b923c6dd7154d5a3cc19dc0b17874bbc');
assert.equal(git(['diff', '--name-only'], current), '');
const actualDefault = capture('gh', ['api', 'repos/dotnet/aspnetcore/commits/main', '--jq', '.sha']);
assert.equal(git(['rev-parse', 'HEAD'], current), actualDefault);
const protectedNames = ['global.json', 'package.json', 'package-lock.json',
  'autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
  'autoperf-scan-report.md', 'performance-antipattern-findings.md'];
const nuget = fs.readdirSync(root).filter(name => name.toLowerCase() === 'nuget.config');
assert.equal(nuget.length, 1);
protectedNames.push(nuget[0]);
const protectedFiles = protectedNames.map(file => ({ path: file, sha256: sha(fs.readFileSync(path.join(root, file))) }));
assert.equal(protectedFiles[0].sha256, 'C3D6E7C29D94C34B6343D4A2EFE74164929F29BFA26FD84B5E2020A15091CD53');
const selected = [
  'src/Components/Endpoints/src/Rendering/SSRRenderModeBoundary.cs',
  'src/Components/Endpoints/src/Rendering/EndpointHtmlRenderer.cs',
  'src/Components/Endpoints/src/Rendering/EndpointHtmlRenderer.Prerendering.cs',
  'src/Components/Endpoints/src/Microsoft.AspNetCore.Components.Endpoints.csproj',
  'src/Components/Endpoints/test/SSRRenderModeBoundaryTest.cs',
  'src/Components/Endpoints/test/EndpointHtmlRendererTest.cs',
  'src/Components/Endpoints/test/RenderFragmentSerializerTest.cs',
  'src/Components/Endpoints/test/Microsoft.AspNetCore.Components.Endpoints.Tests.csproj',
  'src/Components/Shared/src/RenderFragmentCapture.cs',
  'src/Components/Shared/src/RenderFragmentSerializer.cs',
  'src/Components/Components/src/ParameterView.cs',
  'src/Components/Components/src/RenderTree/Renderer.cs',
  'src/Components/Components/src/Rendering/RenderTreeBuilder.cs',
  'src/Components/test/E2ETest/ServerRenderingTests/RenderFragmentSerializationTest.cs',
  'src/Components/test/testassets/Components.TestServer/RazorComponents/Pages/RenderFragmentInteractive.razor',
  'src/Components/test/testassets/TestContentPackage/RenderFragmentChild.razor',
  'src/Components/Samples/BlazorWebAppPerPage/Program.cs',
  'src/Components/Samples/BlazorWebAppPerPage/BlazorWebAppPerPage.csproj',
  'src/Components/Samples/BlazorWebAppPerPage.Client/BlazorWebAppPerPage.Client.csproj'
];
const snapshots = selected.map(file => {
  const pair = git(['rev-parse', baseline + ':' + file, actualDefault + ':' + file]).split(/\r?\n/);
  assert.equal(pair.length, 2);
  if (!file.endsWith('/Renderer.cs')) {
    assert.equal(pair[0], pair[1], 'Inspect any additional default-branch divergence before proceeding: ' + file);
  }
  const variants = [['original', root], ['current-default', current]].map(([variant, checkout]) => {
    const bytes = fs.readFileSync(path.join(checkout, ...file.split('/')));
    const relative = path.join('source-files-' + variant, ...file.split('/'));
    const destination = path.join(run, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes, { flag: 'wx' });
    return { variant, path: relative.replaceAll('\\', '/'), sha256: sha(bytes), bytes: bytes.length };
  });
  return { path: file, baselineBlob: pair[0], actualDefaultBlob: pair[1], actualGitTextIdentical: pair[0] === pair[1], snapshots: variants };
});
const target = selected[0];
const overlaps = ledger.candidates.filter(row => row.finding.file === target).map(row => ({
  id: row.id, status: row.status, summary: row.finding.summary, lineStart: row.finding.line_start
}));
assert.deepEqual(overlaps.map(row => row.id), ['F047']);
const history = git(['log', '--follow', '-6', '--date=iso-strict', '--format=%H %ad %s', '--', target]);
fs.writeFileSync(path.join(run, 'target-history.txt'), history + '\n', { flag: 'wx' });
const introduced = git(['show', '654900e3a13f96b0544aca7d0e779dd996d386cd', '--', target]);
fs.writeFileSync(path.join(run, 'fragment-introduction.diff'), introduced + '\n', { flag: 'wx' });
const overwrite = JSON.parse(capture('gh', ['pr', 'view', '34667', '--repo', 'dotnet/runtime',
  '--json', 'title,body,mergedAt,mergeCommit,files']));
assert.equal(overwrite.title, 'Allow Dictionary overwrites during enumeration');
assert.equal(overwrite.mergeCommit.oid, 'c007a0d1ced0f3e5f69758f72cdf32a31d983db7');
fs.writeFileSync(path.join(run, 'official-dictionary-overwrite-pr.json'), JSON.stringify(overwrite, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'official-dictionary-overwrite.diff'),
  capture('gh', ['pr', 'diff', '34667', '--repo', 'dotnet/runtime']) + '\n', { flag: 'wx' });
const related = JSON.parse(capture('gh', ['pr', 'list', '--repo', 'dotnet/aspnetcore', '--state', 'open',
  '--search', 'SSRRenderModeBoundary', '--limit', '20', '--json', 'number,title,url,headRefOid']));
fs.writeFileSync(path.join(run, 'bounded-related-open-work.json'), JSON.stringify({
  query: 'SSRRenderModeBoundary', limit: 20, actualReturned: related,
  actualNotAnExhaustiveChangedFileOrDuplicateProof: true
}, null, 2) + '\n', { flag: 'wx' });
git(['switch', '-c', branch, baseline]);
assert.equal(git(['rev-parse', 'HEAD']), baseline);
assert.equal(git(['branch', '--show-current']), branch);
for (const item of protectedFiles) {
  assert.equal(sha(fs.readFileSync(path.join(root, item.path))), item.sha256);
}
const plan = {
  candidate: 'F047', declaredAt: new Date().toISOString(), baseline, actualCurrentDefault: actualDefault, branch,
  actualDeclaredBeforeAnyF047ShippingSourceEditOrTiming: true,
  target: 'SSRRenderModeBoundary.SetParametersAsync: top-level RenderFragment capture wrapping',
  actualSourceProducer: 'EndpointHtmlRenderer.ResolveComponentForRenderMode and PrerenderComponentAsync create the boundary; Renderer supplies ParameterView, which is snapshotted before wrapping and rendering.',
  actualScalarInputsAlsoPayTheOldKeysSnapshotCost: true,
  proposedChange: 'Enumerate the owned exact Dictionary key/value pairs and test each value directly; only overwrite existing values with capture delegates. Preserve the ParameterView snapshot, validation, wrapper construction, branch order and render/serialization flow.',
  authoritativeOverwriteContract: {
    pullRequest: 'https://github.com/dotnet/runtime/pull/34667',
    mergeCommit: overwrite.mergeCommit.oid, mergedAt: overwrite.mergedAt,
    actualOfficialTestsExplicitlyAllowOverwriteDuringEnumeration: true,
    actualNoKeyAdditionRemovalOrCapacityChangeInTargetLoop: true,
    documentationCaveat: 'The current generic enumerator remarks list Remove/Clear but omit the later overwrite change; the actual official runtime change/tests, not synthesized search text, establish this operation.'
  },
  requiredPreservation: [
    'Keep parameters.ToDictionary and validation first, including generic-fragment/other-delegate error behavior and no retained ParameterView.',
    'Keep canonical snapshot names, insertion/value order, scalar and null identities and original RenderFragment delegates untouched in the incoming frames.',
    'Every top-level fragment, including several fragments interleaved with scalar/null values, receives its own capture and renders/serializes equivalently.',
    'Prerender-disabled scalar parameters remain on an unchanged legal control path; disabled prerendering with fragments is not mislabeled a successful serialization path.',
    'Nested-fragment serialization, Server/WebAssembly/Auto markers, and all existing public/protected APIs stay unchanged.',
    'Only the actual Endpoints owner DLL/PDB may differ between measured frozen consumer images; the common harness and other dependency bytes must match.',
    'No shipping IVT/UnsafeAccessor, dependency or protected-manifest edits, or unrelated formatting.'
  ],
  behaviorMatrix: {
    managed: ['Server prerender enabled/disabled', 'WebAssembly prerender enabled/disabled', 'Auto prerender enabled/disabled'],
    browser: ['Per-page Server: mixed fragments with prerendering and scalar-only without', 'Per-page WebAssembly: mixed fragments with prerendering and scalar-only without', 'Per-page Auto: first activation with the same legal inputs'],
    intentionallyExcluded: ['Cached versus uncached Auto runtime choice', 'Global Router templates', 'Enhanced navigation/streaming overlap', 'Native AOT/trimming', 'Application or HTTP throughput']
  },
  permanentBoundary: {
    behaviorOwner: 'Server-side Endpoints SSR boundary snapshot/capture preparation.',
    productionProducer: 'Real EndpointHtmlRenderer component activation and parameter delivery, followed by capture execution, ToMarker serialization and actual interactive activation.',
    finalObservable: 'Scalar/null and fragment output preserved through prerendering/serialization; actual interactive child handles a real click after activation.',
    selectedPermanentSurface: 'Existing Endpoints renderer/fragment tests plus focused missing multiple-top-level-fragment coverage when needed, and the owning RenderFragmentSerializationTest Selenium suite.',
    lowerBoundaryFalsePassRisk: 'Directly injecting capture callbacks or inspecting a dictionary does not establish real boundary creation, fragment invocation, serialization/deserialization or browser activation.'
  },
  requiredValidationBeforeTiming: [
    'Build and characterize actual original and current-default source-built owners before a product edit; do not substitute installed framework assemblies.',
    'Add and validate a temporary canonical sample before new permanent tests/product edits; record exact loaded owner and framework asset behavior.',
    'Exercise real managed renderer boundaries, all eight actual benchmark lifecycles, multiple top-level/nested fragments and invalid delegates.',
    'Build candidate and run focused preservation tests with every parameterized XML row independently checked.',
    'Validate the candidate sample and owning permanent browser tests before publishing a retained implementation; remove only task-owned sample files after coverage passes.'
  ],
  benchmarkMethod: 'FreshBoundarySetAndDispose',
  measuredBoundary: 'Actual source-built internal SSR boundary construction, real Renderer attach/SetParametersAsync/child render and root removal/disposal, using stable prepared incoming ParameterView frames. No copied wrapping algorithm, marker serialization, HTTP hosting or browser work is timed.',
  primary: 'PrerenderScalar1',
  unchangedControl: 'NonPrerenderScalar1',
  profileKeys: ['PrerenderScalar1', 'NonPrerenderScalar1', 'PrerenderEmpty', 'PrerenderScalar4',
    'PrerenderFragment1', 'PrerenderMixed4', 'PrerenderFragments8', 'NonPrerenderScalar4'],
  actualScaledAndFragmentProfilesDoNotEstablishProductionFrequency: true,
  benchmarkCasesPerSource: 8, warmupIterations: 3, retainedIterations: 8, requestedIterationMilliseconds: 100,
  unrollFactor: 1, outlierRemoval: 'DontRemove', benchmarkDotNetVersion: '0.13.0',
  sourceComparisonsMaximum: 3, failedOrPartialComparisonAuthorizationsConsumeBudget: true,
  comparisonOrders: [['Original', 'Candidate'], ['Candidate', 'Original'], ['Original', 'Candidate']],
  clearPrimaryGainMayStopEarlyAtPercent: 50,
  numericalTimingCriterion: 'At least5% median paired less time and primary faster in at least2of3 completed pairs.',
  allocationCriterion: 'Alternative primary structural managed saving at least32B/op, repeated in at least2of3 completed pairs, distinguished from unchanged-control drift.',
  controlCredibilityCriterion: 'Reject timing-only qualification if primary apparent benefit is no greater than the corresponding unchanged control in at least2of3; retain/review all adverse timing and allocation outcomes.',
  actualStableAdversePrimaryTimingMustNotBeHiddenByAllocationSaving: true,
  imageCriterion: 'One byte-identical measured harness and full closures, only the Endpoints owner DLL/PDB differs.',
  reconstructionCriterion: 'Relocate exact authored project inputs, restore/rebuild and characterize both source variants without extra timing.',
  sampleAuditCriterion: 'Independently reconstruct raw actual-minus-overhead statistics, allocation rounding, settings and every individual test-result row.',
  environment: 'Shared Windows machine; no priority, affinity, power, URL ACL, firewall or OS changes; no unrelated process termination; serialize overlapping builds/benchmarks with at most2MSBuild workers.',
  protectedFiles
};
fs.writeFileSync(path.join(run, 'acceptance-plan.json'), JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'diagnostic-budget.json'), JSON.stringify({
  candidate: 'F047', maximumSourceComparisons: 3, state: 'open', authorized: [], completed: [],
  failedOrPartialAttempts: [], permanentlyClosed: false, actualCreated: new Date().toISOString()
}, null, 2) + '\n', { flag: 'wx' });
const intake = {
  candidate: 'F047', baseline, actualCurrentDefault: actualDefault, branch, root, currentDefaultRoot: current,
  actualIndependentBranchCreated: true, actualShippingEditsAtIntake: 0, actualNewPermanentTestsAtIntake: 0,
  actualRecordedComparisonAuthorizations: 0, protectedFiles,
  protectedCurrentDefaultGlobalJson: sha(fs.readFileSync(path.join(current, 'global.json'))),
  actualSelectedSources: snapshots, actualOtherSelectedSourcesMatchExceptReportedRenderer: true,
  actualSameFileRetainedFindings: overlaps, actualCurrentDefaultBuildAndProducerCharacterizationStillRequired: true,
  actualCodeIntelligenceBoundary: 'Bluebird scope is Azure DevOps rather than this GitHub repo; the prior GitHub semantic lookup returned404. C# document symbols are available, but incoming constructor calls and ToDictionary definitions did not resolve; these zeros are not absence/completeness evidence. Actual source, renderer execution and compiled owner evidence must establish reachability.',
  actualHistory: { fragmentFeature: '654900e3a13f96b0544aca7d0e779dd996d386cd', cacheMetadata: '564927ca501248f945c68e1704cbb4b1a112aae2' },
  actualCompleted: new Date().toISOString()
};
fs.writeFileSync(path.join(run, 'intake-completed.json'), JSON.stringify(intake, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(session, 'F047-managed-command.mjs'),
  fs.readFileSync(path.join(session, 'F046-managed-command.mjs'), 'utf8').replaceAll('F046', 'F047'), { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F047', branch, actualCurrentDefault: actualDefault,
  actualSelectedSourcePairs: snapshots.length,
  actualSelectedSourceDifferences: snapshots.filter(item => !item.actualGitTextIdentical).map(item => item.path),
  actualPreimplementationCriteriaDeclared: true, actualShippingEdits: 0, actualTimingAuthorizations: 0 }, null, 2));
