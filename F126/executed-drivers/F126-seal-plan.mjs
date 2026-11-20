import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = 'C:\\src\\aspnetcore';
const run = path.join(session, 'autoperf-runs', 'F126');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const discovery = read(path.join(run, 'discovery-completed.json'));
assert.equal(discovery.actualChangedSelectedInputs.length, 0);
assert.equal(discovery.actualSelectedInputs.length, 26);
const git = spawnSync('git', ['--no-pager', 'status', '--porcelain', '--untracked-files=no'],
  { cwd: root, encoding: 'utf8', windowsHide: true });
assert.equal(git.status, 0, git.stderr);
assert.equal(git.stdout.trim(), '');
for (const item of discovery.actualSelectedInputs) {
  assert.equal(sha(path.join(root, ...item.path.split('/'))), item.originalPhysicalSha256);
}
const plan = {
  candidate: 'F126', actualSealedAt: new Date().toISOString(),
  actualBaseline: discovery.actualBaseline, actualCurrentDefault: discovery.actualCurrentDefault,
  actualBranch: discovery.branch, actualSelectedInputs: 26,
  actualSealedBeforeShippingEditsNewTestsAndAnyTiming: true,
  target: 'Enable the existing framework endpoint policy cache only for the deterministic internal MinimumAgePolicyProvider sample, instead of introducing a private unbounded name cache or changing parsing.',
  actualPrivateSampleNotPublicFrameworkApiChange: 'The implementing sample type is internal; the existing public interface default, framework provider behavior, request evaluation, parsing and all shipping framework APIs stay unchanged.',
  proposedSourceFiles: [
    'src/Security/samples/CustomPolicyProvider/Authorization/MinimumAgePolicyProvider.cs',
    'src/Security/samples/CustomPolicyProvider/readme.md',
    'src/Security/test/AuthSamples.FunctionalTests/CustomPolicyProviderTests.cs'
  ],
  requirements: [
    {
      id: 'existing-real-http',
      evidence: 'All seven existing CustomPolicyProviderTests run on original, actual default and candidate through the real WebApplicationFactory/MVC/cookie pipeline. Preserve root, both actual age endpoints, original redirects and existing different-user page results.',
      exactTests: ['DefaultReturns200', 'MinimumAge10RedirectsWhenNotLoggedIn', 'MinimumAge10WorksIfOldEnough',
        'MinimumAge10FailsIfNotOldEnough', 'MinimumAge50WorksIfOldEnough', 'MinimumAge50FailsIfNotOldEnough',
        'MinimumAge50RedirectsWhenNotLoggedIn']
    },
    {
      id: 'real-producer-cache-contract',
      exactTest: 'MinimumAgePolicyIsCachedBetweenRequests',
      rows: ['MinimumAge10', 'MinimumAge50'],
      evidence: 'New focused functional Theory decorates the actual Startup-registered provider with a strict Moq forwarding spy. Its AllowsCachingPolicies getter forwards the real owner value. Each datum sends two real routed HTTP requests, asserts both original redirect outcomes and then exactly one actual policy construction. Both rows must first fail specifically with two real calls on original and pass with one on candidate, never by injecting a cache entry, endpoint or callback.'
    },
    {
      id: 'provider-and-policy-preservation',
      evidence: 'Characterize real original/default/candidate DI owners: named ages, case-insensitive prefix, invalid and unknown fallback, configured fallback named/default/fallback policies, actual requirement age and per-request evaluation. Direct GetPolicyAsync remains uncached and returns equivalent requirements. Observe actual MVC-produced endpoint metadata; no copied policy builder or handler.'
    },
    {
      id: 'lifetime-and-hot-reload',
      evidence: 'Reuse existing AuthorizationPolicyCache/DataSourceDependentCache endpoint-lifetime disposal and change-token invalidation, not a new handler or cache. Before any justified PR, exercise a real supported controller-attribute edit under dotnet watch: warm age10, change its metadata to11, observe changes applied without a restart/PID replacement and the actual handler log using11; restore the exact controller bytes and stop all owned watch/app processes. A manually raised change callback is not live-edit proof.'
    },
    {
      id: 'source-image-and-reconstruction',
      evidence: 'Genuinely build the source project/test graph, then one common eight-input runnable benchmark. Freeze complete consumer inventories, actual source/PE/PDB associations and protected root hashes. Original/candidate must share exact compiled harness and every non-owner byte; only the real sample owner DLL/PDB may change. Rebuild the exact common project in a new directory and characterize both measured owner images without more timing. Clearly limit selected-input and default-owner evidence rather than claiming complete compiler provenance.'
    }
  ],
  testProject: 'src/Security/test/AuthSamples.FunctionalTests/AuthSamples.FunctionalTests.csproj',
  testFilter: 'FullyQualifiedName~AuthSamples.FunctionalTests.CustomPolicyProviderTests',
  managedBuildScope: {
    configuration: 'Release', framework: 'net12.0', activatedCheckoutRequired: true,
    noRestoreFirst: true, restoreOnlyAfterActualMissingDependencyFailure: true,
    existingCommandScopedProperties: ['UseIisNativeAssets=false', 'BuildNodeJS=false', 'StaticWebAssetsEnabled=false',
      'UseSharedCompilation=false', '/m:2', '/nr:false'],
    exclusions: 'No IIS/ANCM native, JavaScript/static-asset production or packaging, browser, full-repository build or legacy-TFM claim. Changed sample targets only net12.'
  },
  producerBoundary: 'Actual source-built sample Startup and MVC controller endpoints hosted by TestServer/WebHostBuilder; real source-built UseAuthorization and cookie challenge, with logging disabled and test-local ephemeral data protection. No socket/network or general application-throughput claim.',
  profiles: [
    { name: 'MinimumAge10', path: '/Home/MinimumAge10', policyName: 'MinimumAge10', expectedStatus: 302,
      role: 'predeclared primary; actual existing sample route' },
    { name: 'MinimumAge50', path: '/Home/MinimumAge50', policyName: 'MinimumAge50', expectedStatus: 302,
      role: 'second real route, not a replacement primary' }
  ],
  methods: [
    { name: 'WarmRequest', role: 'Actual routed in-process HTTP request after one warm request; provider flag forwarded unchanged. Primary method.' },
    { name: 'CachingDisabledRequest', role: 'Matched real hosted/request control; same real provider, but harness decorator forces AllowsCachingPolicies=false in both source variants. Not described as the unmodified application.' },
    { name: 'DirectGetPolicy', role: 'Unchanged direct real-provider lookup; outside the endpoint cache, must continue real parsing/construction. Secondary guard, not primary.' }
  ],
  primary: { method: 'WarmRequest', profile: 'MinimumAge10', unchangedMatchedMethod: 'CachingDisabledRequest' },
  measurements: {
    maximumBeforeAfterAuthorizations: 3, failedOrPartialAuthorizationsConsumeSlot: true,
    completedPairOrders: [['Original', 'Candidate'], ['Candidate', 'Original'], ['Original', 'Candidate']],
    warmups: 3, retainedPerCase: 8, requestedIterationMilliseconds: 100, unrollFactor: 1,
    outliers: 'DontRemove', inProcess: 'Settings-preserving emitter; never raise priority or change power/affinity',
    sourceTuningOrPrimarySubstitutionAfterTiming: false, noHistoricalReplay: true
  },
  qualification: {
    timing: 'Median paired primary less-time >=10%, faster in at least2/3 completed pairs and primary effects exceed absolute same-profile matched-control movement in at least2 pairs.',
    allocation: 'Alternative allocation-only qualification: save >=32 reported primary B/op in at least2 pairs, with matched disabled-cache allocation savings at least32 B/op smaller. Every raw GC observation remains.',
    guard: 'Reject qualification if unchanged DirectGetPolicy/MinimumAge10 median slowdown>=10%, slower in at least2 pairs and adverse effects exceed absolute matched-request control movement in at least2 pairs.',
    preserveAll: 'Retain every real route, direct/matched control, adverse result, allocation, variability, failed prerequisite, source-image correction and execution record. No whole-app/network claim or automatic merge readiness.'
  },
  actualAdditionalPolicyInstancesUnderColdConcurrencyNotPromised: true,
  actualEndpointPolicyReuseNotCachingPerRequestEvaluationResults: true,
  actualNoFrameworkPublicApiOrAssemblyBoundaryAccessChangePermitted: true
};
function write(name, value) {
  fs.writeFileSync(path.join(run, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
write('acceptance-plan.json', plan);
write('diagnostic-budget.json', {
  candidate: 'F126', maximumComparisonAuthorizations: 3, authorizations: [], permanentlyClosed: false,
  actualAcceptancePlanSha256: sha(path.join(run, 'acceptance-plan.json')),
  actualFailedOrPartialComparisonConsumesAuthorization: true, actualNoHistoricalReplayOrPrimarySubstitution: true
});
write('documentation-review.json', {
  candidate: 'F126', actualReviewedBeforeImplementation: true,
  publicReferences: [
    { url: 'https://learn.microsoft.com/dotnet/api/microsoft.aspnetcore.authorization.iauthorizationpolicyprovider.allowscachingpolicies?view=aspnetcore-10.0',
      actualRedirectedUrl: 'https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.authorization.iauthorizationpolicyprovider.allowscachingpolicies?view=aspnetcore-10.0',
      actualDocumentationSourceCommit: 'aa613c8419b05f146e7b0c34e0f4ec499cf44b92',
      conclusion: 'Existing interface cache opt-in defaults false; the framework API is not being changed.' },
    { url: 'https://learn.microsoft.com/aspnet/core/security/authorization/iauthorizationpolicyprovider?view=aspnetcore-11.0',
      actualRedirectedUrl: 'https://learn.microsoft.com/en-us/aspnet/core/security/authorization/custom-authorization-policy-providers?view=aspnetcore-11.0',
      actualDocumentationSourceCommit: 'c07773fd86fe6f0be62c4207fc3f55b5d8810ca4',
      conclusion: 'Current conceptual docs distinguish parameterized name-based policies and providers backed by external changing data; they point to the older MVC sample. Do not copy the default opt-in to a general dynamic provider or migrate the docs Blazor sample.' }
  ],
  actualSourceLifetimeReview: [
    'src/Security/Authorization/Policy/src/AuthorizationPolicyCache.cs',
    'src/Http/Routing/src/DataSourceDependentCache.cs',
    'src/Mvc/Mvc/src/HotReloadService.cs'
  ],
  actualLiveHotReloadNotYetVerified: true,
  actualHistory: { sampleIntroduced: '8d0f84ea464ed3c0f9ec0a28d9f5f7ecd02617c0',
    interfaceRename: '63fb7a86b560452a4ba8291f0234aef47cf2843f',
    existingApiReview: 'https://github.com/dotnet/aspnetcore/issues/43227',
    relatedClosedNonDuplicateQuestion: 'https://github.com/dotnet/aspnetcore/issues/17493' }
});
write('intake-completed.json', { ...discovery,
  actualAcceptancePlanSha256: sha(path.join(run, 'acceptance-plan.json')),
  actualNoNewTestsOrShippingEditsBeforePlan: true });
console.log(JSON.stringify({ candidate: 'F126', actualSealedBeforeImplementationAndTiming: true,
  actualCurrentDefault: discovery.actualCurrentDefault, actualSelectedMatchingInputs: 26,
  actualPrimary: plan.primary, actualMaximumComparisons: 3, actualRequiredLiveHotReload: true }, null, 2));
