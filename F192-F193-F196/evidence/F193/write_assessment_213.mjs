import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, utc, sha256, writeJson } from './collect_source_213.mjs';

const sourceManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'source-manifest.json')));
const externalManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'external-source-manifest.json')));
const roles = JSON.parse(fs.readFileSync(path.join(ROOT, 'SOURCE-ROLES.json')));
const comparisons = JSON.parse(fs.readFileSync(path.join(ROOT, 'SOURCE-COMPARISON.json')));
const controller = 'src/Components/test/testassets/Components.TestServer/Controllers/PersonController.cs';
const test = 'src/Components/test/E2ETest/Tests/HttpClientTest.cs';
const component = 'src/Components/test/testassets/BasicTestApp/HttpClientTest/HttpRequestsComponent.razor';
const stringValues = 'src/runtime/src/libraries/Microsoft.Extensions.Primitives/src/StringValues.cs';
const stringManipulation = 'src/runtime/src/libraries/System.Private.CoreLib/src/System/String.Manipulation.cs';

function reference(gitPath, lines, role = 'Default') {
    const item = [...sourceManifest, ...externalManifest]
        .find(item => item.role === role && item.gitPath === gitPath && item.present !== false);
    if (!item) throw new Error('Missing complete source for evidence reference: ' + role + ':' + gitPath);
    return {
        role, revision: item.revision, gitPath, lines, artifact: item.artifact,
        gitBlob: item.gitBlob, sha256: item.sha256,
    };
}

const verifications = [];
for (const item of [...sourceManifest, ...externalManifest].filter(item => item.present !== false)) {
    const data = fs.readFileSync(path.join(ROOT, item.artifact));
    const gitBlob = crypto.createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
    if (data.length !== item.bytes || sha256(data) !== item.sha256 || gitBlob !== item.gitBlob) {
        throw new Error('Retained source identity mismatch: ' + item.artifact);
    }
    verifications.push({ artifact: item.artifact, rawBytesAndGitBlobReverified: true });
}
const joinRegions = [];
for (const role of ['Original', 'Default']) {
    const item = externalManifest.find(item => item.role === role && item.gitPath === stringManipulation);
    const text = fs.readFileSync(path.join(ROOT, item.artifact), 'utf8');
    const begin = text.indexOf('        public static string Join(char separator, params string?[] value)');
    const end = text.indexOf('        public string PadLeft', begin);
    if (begin < 0 || end < begin) throw new Error('Join region selectors missing');
    const region = text.slice(begin, end);
    joinRegions.push({
        role, artifact: item.artifact, sourceRevision: item.revision,
        startLine: text.slice(0, begin).split('\n').length,
        endLine: text.slice(0, end).split('\n').length - 1,
        utf8RegionSha256: sha256(Buffer.from(region)),
    });
}
if (joinRegions[0].utf8RegionSha256 !== joinRegions[1].utf8RegionSha256) {
    throw new Error('Join source differs across declared dependencies; do not silently reuse semantics');
}
for (const gitPath of [controller, test, component]) {
    if (!comparisons.aspnetcore.find(item => item.gitPath === gitPath)?.sameCompleteBytes) {
        throw new Error('Finding/producer/consumer full-byte identity changed across roles');
    }
}
writeJson('SOURCE-CHECKS.json', {
    recordedUtc: utc(), checkClass: 'Source and artifact integrity only; not tests or runtime verification',
    presentSourceEntries: verifications.length, verifications,
    missingSourceEntries: sourceManifest.filter(item => !item.present),
    findingControllerProducerConsumerSameCompleteBytesAcrossRoles: true,
    declaredStringValuesSameCompleteBytesAcrossRoles: comparisons.declaredDependencySource
        .find(item => item.gitPath === stringValues).sameCompleteBytes,
    joinRegions, joinRegionsSameBytes: true,
    stringManipulationWholeFileDiff: 'commands\\dependency-source-diff-String_Manipulation_cs.stdout.txt',
    stringManipulationDiffAssessment: 'The sole full-file difference changes a packed-index-of support check at line 2325, outside the unchanged Join region.',
    runtimeOrCompilerExecution: false,
});

writeJson('PRODUCER-SEMANTICS.json', {
    finding: 'F193', preparation: 213, recordedUtc: utc(),
    validationBoundary: 'Pinned source only; no request, browser, test, compiler, timing or allocation observation',
    sourceRoles: roles.roles,
    backingSourceScope: 'Declared Microsoft.Extensions.Primitives and Microsoft.NETCore.App.Ref source revisions in eng\\Version.Details.xml; not proof of any loaded implementation image',
    sourceIdentityEvidence: ['source-manifest.json', 'external-source-manifest.json', 'SOURCE-COMPARISON.json', 'SOURCE-CHECKS.json'],
    producerToConsumer: [
        {
            step: 'Existing owning test and workload',
            fact: 'HttpClientTest uses the WASM BasicTestApp fixture and a separate BasicTestAppServerSiteFixture<CorsStartup>. CanSendRequestHeaders adds testheader=Value from test and another-header=Another value, each once, then issues one DELETE per test invocation. There is no header-count, rate or loop workload inferred beyond this source scenario.',
            evidence: [reference(test, [16, 40]), reference(test, [86, 95]), reference(test, [138, 163])],
        },
        {
            step: 'Real request creation and configured cardinalities',
            fact: 'HttpRequestsComponent owns a List<RequestHeader>, creates a new HttpRequestMessage for the click, and calls TryAddWithoutValidation once per configured row. The owning test configures two different names with one nonempty string each and an empty body, so this code supplies no HttpContent for that DELETE. Browser/transport-added headers, total received field count and protocol were not observed.',
            evidence: [reference(component, [57, 99]), reference('src/Components/test/testassets/BasicTestApp/Program.cs', [25, 44])],
        },
        {
            step: 'Client null normalization and browser dispatch',
            fact: 'HttpHeaders.TryAddWithoutValidation(string,string?) normalizes null to string.Empty, stores a first raw value as a string, and retains further values rather than discarding empty slots. BrowserHttpController flattens each request/content header value into ordered names/values; http_wasm_fetch appends them into native Headers and calls fetch_like. Source does not establish exact native Headers coalescing, wire representation, or browser-added values; comma-containing text must not be equated with StringValues.Count > 1.',
            evidence: [
                reference('src/runtime/src/libraries/System.Net.Http/src/System/Net/Http/Headers/HttpHeaders.cs', [160, 190]),
                reference('src/runtime/src/libraries/System.Net.Http/src/System/Net/Http/BrowserHttpHandler/BrowserHttpHandler.cs', [200, 237]),
                reference('src/runtime/src/mono/browser/runtime/http.ts', [152, 187]),
            ],
        },
        {
            step: 'HTTP server and endpoint',
            fact: 'The API fixture selects TestServer.Program.BuildWebHost<CorsStartup>; its loopback host uses ConfigureWebHostDefaults and CorsStartup maps /subdir, routing and controllers. PersonController has route api/[controller] and HttpDelete on Delete. This is a synchronous request-header echo in the existing test asset, not a component render-loop optimization.',
            evidence: [
                reference('src/Components/test/E2ETest/Infrastructure/ServerFixtures/BasicTestAppServerSiteFixture.cs', [14, 19]),
                reference('src/Components/test/E2ETest/Infrastructure/ServerFixtures/AspNetSiteServerFixture.cs', [29, 55]),
                reference('src/Components/test/testassets/Components.TestServer/Program.cs', [81, 106]),
                reference('src/Components/test/testassets/Components.TestServer/CorsStartup.cs', [49, 65]),
                reference(controller, [11, 13]), reference(controller, [47, 57]),
            ],
        },
        {
            step: 'Server-owned StringValues producer and backing',
            fact: 'In the retained Kestrel HTTP/1 source path, parser callbacks flow through Http1ParsingHandler.OnHeader to HttpProtocol.OnHeader and HttpRequestHeaders.Append. First known fields use new StringValues(decodedString); unknown fields use AppendUnknownHeaders and AppendValue -> StringValues.Concat(existing,string). Concat(empty,string) yields scalar backing; a repeated field appends into an array, preserving append order. The two test-named custom headers are unknown names on this path. This establishes concrete source producers, not an observed browser request or an all-protocol equivalence claim.',
            evidence: [
                reference('src/Servers/Kestrel/Core/src/Internal/Http/Http1ParsingHandler.cs', [23, 32]),
                reference('src/Servers/Kestrel/Core/src/Internal/Http/HttpProtocol.cs', [549, 554]),
                reference('src/Servers/Kestrel/Core/src/Internal/Http/HttpHeaders.Generated.cs', [7877, 7923]),
                reference('src/Servers/Kestrel/Core/src/Internal/Http/HttpRequestHeaders.cs', [158, 170]),
                reference('src/Servers/Kestrel/Core/src/Internal/Http/HttpHeaders.cs', [149, 152]),
                reference(stringValues, [475, 493]),
            ],
        },
        {
            step: 'Header access and lifetime',
            fact: 'HttpProtocol resets its request header container and assigns RequestHeaders=HttpRequestHeaders for a new request. DefaultHttpRequest.Headers exposes IHttpRequestFeature.Headers, whose Kestrel implementation exposes that RequestHeaders value. Header strings may be reused across requests for known headers; unknown values are cleared at reset. Delete enumerates and joins immediately, holds no header-array reference past the synchronous action and introduces no cache or asynchronous deferred consumer.',
            evidence: [
                reference('src/Servers/Kestrel/Core/src/Internal/Http/HttpProtocol.cs', [404, 414]),
                reference('src/Servers/Kestrel/Core/src/Internal/Http/HttpProtocol.FeatureCollection.cs', [76, 80]),
                reference('src/Http/Http/src/Internal/DefaultHttpRequest.cs', [133, 136]),
                reference('src/Servers/Kestrel/Core/src/Internal/Http/HttpRequestHeaders.cs', [59, 71]),
                reference(controller, [48, 57]),
            ],
        },
        {
            step: 'Response contract and actual existing consumer',
            fact: 'Delete appends each currently enumerated header as key, colon-space, comma-without-added-space joined values, then an AppendLine newline; it prefixes REQUEST HEADERS followed by LF. The default MVC options register StringOutputFormatter, which writes a string to the HTTP response. HttpRequestsComponent reads response.Content.ReadAsStringAsync and renders it in response-body; CanSendRequestHeaders asserts OK and Contains for the two values. It does not assert total header count, whole body, key iteration order or null/empty/multiple-value rows.',
            evidence: [
                reference(controller, [48, 57]),
                reference('src/Mvc/Mvc.Core/src/Infrastructure/MvcCoreMvcOptionsSetup.cs', [72, 86]),
                reference('src/Mvc/Mvc.Core/src/Formatters/StringOutputFormatter.cs', [43, 55]),
                reference(component, [42, 47]), reference(component, [99, 107]), reference(test, [86, 95]),
            ],
        },
    ],
    stringValuesBackingAndToArray: {
        documentationAndImplementation: [reference(stringValues, [19, 47]), reference(stringValues, [91, 112]), reference(stringValues, [269, 300])],
        facts: [
            'The instance ToArray method is selected on StringValues, not Enumerable.ToArray.',
            'Null backing, including default(StringValues) and a null string constructor, has Count zero; ToArray substitutes shared Array.Empty<string>().',
            'Any string[] backing is returned by identity, including newly allocated zero-length arrays, one-element arrays and multi-element arrays. This path does not copy or enumerate its elements.',
            'A scalar string backing, including an empty string, has Count one; GetArrayValue constructs a new one-element array holding that same string reference.',
            'The declared source therefore contains a one-element-array construction for the scalar path, but no runtime allocation bytes, frequency or savings were measured.',
            'Missing request keys are not entries in the foreach. Null elements are not demonstrated by the inspected wire decoder path; general array-backed StringValues can contain them and source contract analysis retains that distinction.',
        ],
    },
    joinAndToString: {
        baseline: 'ToArray returns string?[]; the baseline has an identity conversion to Join(string? separator, params string?[] value), which delegates to the span JoinCore. No new params wrapper or IEnumerable walk is required by that source call shape.',
        baselineEvidence: [reference(stringValues, [277, 300]), reference(stringManipulation, [763, 770]), reference(stringManipulation, [1054, 1143])],
        sequenceSemantics: 'Join preserves element positions and order, writing a comma for every boundary. Null elements contribute no characters but do not remove boundaries. Empty arrays yield empty string; one null element yields empty string; a scalar comma-containing string remains one element and is not parsed, quoted, split or trimmed.',
        toStringDifference: 'StringValues.ToString returns GetStringValue() ?? string.Empty; its multi-array join skips both null and empty values. It is not a generally behavior-preserving replacement for the existing Join. This is source-level contract reasoning, not a reproduced failure of CanSendRequestHeaders.',
        toStringEvidence: [reference(stringValues, [167, 258])],
        explicitEnumerableAlternative: 'Passing StringValues explicitly as IEnumerable<string?> would use the enumerable Join path, not its concrete List<string> or string[] shortcuts. The readonly struct and its struct enumerator cross interface boundaries. No assumption is made that this beats the existing array specialization, nor that source boxing conversions establish runtime allocation counts.',
        enumerableEvidence: [reference(stringValues, [19, 20]), reference(stringValues, [397, 411]), reference(stringManipulation, [804, 849]), reference(stringManipulation, [935, 959])],
        bareRemovalCaution: 'Removing only .ToArray() is not established to select an IEnumerable overload. Related issue 44509 documents implicit-array overload selection and null-array behavior on .NET 6. The current source still distinguishes implicit string[] conversion (which can return null) from ToArray (never null). No hypothetical .NET 12/C# compiler binding was executed or claimed.',
        implicitConversionEvidence: [reference(stringValues, [80, 86]), reference(stringValues, [277, 300])],
        relatedEvidence: 'related-work-null-array-excerpts.json',
        ordering: 'Preserve the order of values in a header and the current foreach output; no key sorting or claimed header-name order guarantee is introduced. Existing consumer assertions are substring checks.',
        delimiter: 'The controller Join adds comma without space; spaces or commas already in individual wire values remain ordinary characters. AppendLine uses Environment.NewLine while the existing prefix uses LF; neither is changed.',
    },
    semanticCases: {
        nature: 'Source-derived table only. These rows were not sent, tested, benchmarked, or used to inflate the existing workload.',
        columns: ['backing', 'count', 'toArray', 'baselineJoinComma', 'StringValuesToString', 'producerBoundary'],
        rows: [
            ['null/default', 0, 'shared empty array', '', '', 'Not a demonstrated enumerated header in the configured DELETE'],
            ['string.Empty scalar', 1, 'new one-element array', '', '', 'Client normalizes null to empty; received empty-field behavior was not run'],
            ['nonempty scalar Value from test', 1, 'new one-element array', 'Value from test', 'Value from test', 'Concrete configured value in owning test; server scalar path established in source'],
            ['caller-provided empty string[]', 0, 'same backing array', '', '', 'General StringValues representation, not a configured test request'],
            ['string[] containing null', 1, 'same backing array', '', '', 'General StringValues representation, not demonstrated by decoded-string producer'],
            ['string[] containing a single empty string', 1, 'same backing array', '', '', 'Representation differs from scalar empty despite same Count'],
            ['string[] [b,a]', 2, 'same backing array', 'b,a', 'b,a', 'Repeated field source path can create arrays; this row was not sent'],
            ['string[] [a,empty,b]', 3, 'same backing array', 'a,,b', 'a,b', 'Demonstrates source contract distinction, not an observed browser/wire case'],
            ['string[] [a,null,b]', 3, 'same backing array', 'a,,b', 'a,b', 'General nullable array contract, not demonstrated wire producer'],
            ['string[] [empty,empty]', 2, 'same backing array', ',', '', 'Demonstrates empty-slot delimiter distinction at general contract boundary'],
            ['string[] [null,null]', 2, 'same backing array', ',', '', 'General nullable array contract only'],
            ['string[] [null,a,empty]', 3, 'same backing array', ',a,', 'a', 'General nullable array contract only'],
            ['scalar a,b', 1, 'new one-element array', 'a,b', 'a,b', 'Comma-containing text is not proof of multiple StringValues elements'],
        ],
    },
    historyAndRelatedWork: {
        focusedHistory: [
            'commands\\history-Original-controller-follow.stdout.txt',
            'commands\\history-Default-controller-follow.stdout.txt',
            'commands\\history-2018-httpclient-controller-change.stdout.txt',
        ],
        facts: [
            'Follow history resolves the current file through the April 2023 TestServer -> Components.TestServer rename, January 2019 testapps -> testassets relocation and November 2018 Components relocation.',
            'Commit 8590f6e7a53e9eee1262ae1323511dee4383e9cb (2018-02-23), Remainder of initial HttpClient features plus E2E tests, already contains the DELETE header echo with header.Value.ToArray(). Its historical path and full bytes are retained.',
            'The finding line, owning request component and owning test have identical complete source bytes at Original and observed Default.',
        ],
        boundedQueries: 'related-work-query-index.json',
        queryCounts: { upstreamPersonController: 9, upstreamStringValuesToArray: 17, forkPersonController: 0, forkStringValuesToArray: 0 },
        limitation: 'Search page 1, at most 20 issue/PR title/body results for each exact query. Results are not exhaustive code/fork-branch proof or assurance that no related change exists. Fork repository metadata never serves as upstream Default.',
        documentation: ['instruction-read-manifest.json', 'source\\Default\\docs\\BuildFromSource.md', 'source\\Default\\docs\\CrossCuttingGuidance.md', 'source\\Default\\docs\\BlazorComponentsGuidance.md'],
    },
    limitations: [
        'No real request or browser was run; exact wire cardinalities, protocol, browser normalization and automatically added headers remain unobserved.',
        'No throughput, allocation, latency, JIT, trimming or GC claim is made.',
        'Pinned declared dependency source is not proof of selected SDK, resolved packages or loaded runtime image; no native graph was created or activated.',
        'LSP provided navigation but no semantic hover/binding for Join; unavailable server log lookup is retained in navigation-tool-results.json.',
        'This is not a behavioral bug report and no behavioral failure/red-green result is fabricated.',
    ],
});

writeJson('MATERIALITY-GATE.json', {
    finding: 'F193', preparation: 213, recordedUtc: utc(),
    disposition: 'bounded-source-level-no-candidate',
    candidateQualified: false, privateGraphsCreated: false,
    reasoning: [
        'The reported single-use materialization is representation-dependent: array-backed StringValues is already reused by identity, while real scalar-producing branches construct a one-element array.',
        'The concrete owning test configures two distinct nonempty custom-header values and performs one DELETE per invocation. Additional browser headers and actual request frequency were not observed; no high-rate, large-header or hot-loop workload is invented.',
        'This is an informational test asset supporting an HTTP-client functional assertion, not an established material runtime bottleneck. Source evidence does not justify spending native preparation or comparison scope on a change here.',
        'A ToString substitution is not generally equivalent for multi-array empty/null slots. Explicit IEnumerable Join is not established to improve the existing array-specialized path. Bare ToArray removal has unresolved current compiler/implicit-conversion consequences and is not assumed to be the enumerable alternative.',
        'A small Count-one fast path could be investigated if a real material scenario were supplied, but it is not admitted or patched merely to turn an informational finding into a completed change.',
    ],
    boundedConclusion: 'No justified candidate for this preparation from the inspected source and existing configured workload. This does not prove universal immateriality, optimality, no benefit or runtime equivalence.',
    rejectedDirections: [
        { direction: 'StringValues.ToString or direct interpolation', reason: 'Changes general empty/null multi-array delimiter semantics; no such failure was reproduced in the owning test.' },
        { direction: 'Explicit IEnumerable Join', reason: 'Loses concrete array specialization for boxed StringValues; source alone does not establish a useful improvement.' },
        { direction: 'Remove only .ToArray()', reason: 'Do not assume overload selection or empty-value safety from syntax; current hypothetical binding not executed.' },
        { direction: 'Count <= 1 fast path', reason: 'No demonstrated material need to justify a conditional change in this informational test asset; not implemented or measured.' },
    ],
    nativeDisposition: {
        coordinatorGo213Received: true,
        candidateSurvivalPrerequisiteMet: false,
        dotnetInvocations: 0, builds: 0, tests: 0, restores: 0,
        compilerInvocations: 0, browserRuns: 0, benchmarkOrCounterRuns: 0,
        benchmarkAuthorizationsConsumed: 0,
        exactExistingTest: 'Microsoft.AspNetCore.Components.E2ETest.Tests.HttpClientTest.CanSendRequestHeaders',
        existingProject: 'src\\Components\\test\\E2ETest\\Microsoft.AspNetCore.Components.E2ETests.csproj',
        testResult: 'Not scheduled or run: source/materiality gate admitted no candidate. Not a pass, failed assertion, missing-dependency failure or red/green verification.',
        SDKActivationAndExistence: 'Not attempted or asserted because no native start was warranted.',
        noRestoreExceptionNeeded: true,
    },
    nextActor: 'Coordinator alone reviews and accepts this bounded no-candidate handoff; no comparison or publication is requested.',
});
writeJson('DIFF-INDEX.json', {
    finding: 'F193', preparation: 213,
    disposition: 'No candidate admitted; no source or test edits and no private worktree created',
    candidateDiffs: [], originalCandidate: null, defaultCandidate: null,
    reservedRootWasNotEdited: true,
    reservedWorktreeFinalChecks: [
        'commands\\reserved-final-status.json',
        'commands\\reserved-final-diff.json',
        'commands\\reserved-final-index-diff.json',
        'FINAL-OBSERVATIONS.json',
    ],
    dependencySourceComparisonDiffIsNotACandidate: 'commands\\dependency-source-diff-String_Manipulation_cs.stdout.txt',
});
console.log(JSON.stringify({ phase: 'bounded-source-level-no-candidate', collectorPid: process.pid,
    sourceEntriesReverified: verifications.length, joinRegionSameBytes: true }));
