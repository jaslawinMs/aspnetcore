import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const output = import.meta.dirname;
const parallel = path.dirname(output);
const owner = 'a4e76420-cb81-4c3e-9008-491e049270d2';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(path.join(output, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const derived = readJson(path.join(output, 'derived-source-data-299.json'));
const pins = readJson(path.join(output, 'pins.json'));
const acceptance = readJson(path.join(output, 'PARENT-ACCEPTANCE.json'));
const policyBytes = fs.readFileSync(path.join(parallel, 'policy.json'));
const policy = JSON.parse(policyBytes);
const campaignFile = path.join(path.dirname(parallel), 'autoperf-campaign.json');
const campaignBytes = fs.readFileSync(campaignFile);
const campaign = JSON.parse(campaignBytes);
assert.equal(acceptance.actualOwner, owner);
assert.equal(policy.independentFindingPreparationWorkers.F258, owner);
assert.equal(policy.activeWorkerPreparationScopes.F258, acceptance.scope);
assert.equal(policy.actualWorkerBuildHoldActive, false);
assert.equal(policy.buildAndTestWorkQuiesced, false);
assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
const pending = campaign.candidates.filter(value => ['F258', 'F259'].includes(value.id));
assert.equal(pending.length, 2);
assert.ok(pending.every(value => value.status === 'pending'));
fs.writeFileSync(path.join(output, 'final-observed-policy.bin'), policyBytes, { flag: 'wx' });
writeJson('final-observed-guards.json', {
    utc: new Date().toISOString(), actualOwner: owner, exactScope: acceptance.scope,
    noLease: true, noHold: true, nonquiesced: true,
    policySha256: sha256(policyBytes), policyBytes: policyBytes.length,
    canonicalCampaignSha256: sha256(campaignBytes), canonicalCampaignBytes: campaignBytes.length,
    pending: pending.map(value => ({ id: value.id, status: value.status })),
    observationBoundary: 'Finite filesystem observations only; no global lease acquired and no process census claimed.'
});
const originalBodies = fs.readdirSync(output).filter(file => /^bodies-Original-.*\.json$/.test(file)).sort()
    .flatMap(file => readJson(path.join(output, file)).entries);
function cite(repositoryPath, needle)
{
    const entry = originalBodies.find(value => value.path === repositoryPath);
    assert.ok(entry);
    const text = fs.readFileSync(path.join(output, entry.file), 'utf8');
    const offset = text.indexOf(needle);
    assert.ok(offset >= 0, `Missing report citation in selected whole body: ${repositoryPath}: ${needle}`);
    return {
        path: repositoryPath, startLine: text.slice(0, offset).split('\n').length,
        roles: ['Original', 'Default'], roleBodiesByteIdentical: true,
        blob: entry.blob, sha256: entry.sha256
    };
}
const knownPath = 'src/Servers/Kestrel/shared/KnownHeaders.cs';
const generatorProject = 'src/Servers/Kestrel/tools/CodeGenerator/CodeGenerator.csproj';
const programPath = 'src/Servers/Kestrel/tools/CodeGenerator/Program.cs';
const generatedTest = 'src/Servers/Kestrel/Kestrel/test/GeneratedCodeTests.cs';
const generatedProject = 'src/Servers/Kestrel/Kestrel/test/Microsoft.AspNetCore.Server.Kestrel.Tests.csproj';
const coreTestProject = 'src/Servers/Kestrel/Core/test/Microsoft.AspNetCore.Server.Kestrel.Core.Tests.csproj';
const coreRequestTest = 'src/Servers/Kestrel/Core/test/HttpRequestHeadersTests.cs';
const generatedOutput = 'src/Servers/Kestrel/Core/src/Internal/Http/HttpHeaders.Generated.cs';
const historyParts = fs.readFileSync(path.join(output, '12-history-Original-knownheaders-owner.stdout.bin'), 'utf8').split('\0');
const history = [];
for (let index = 0; index + 3 < historyParts.length; index += 4)
{
    history.push({
        commit: historyParts[index].replace(/^\r?\n/, ''),
        authorDate: historyParts[index + 1], author: historyParts[index + 2], subject: historyParts[index + 3]
    });
}
const counts = derived.roles.Original;
const report = {
    phase: 299,
    actualOwner: owner,
    findings: ['F258', 'F259'],
    status: 'SOURCE_ONLY_SEALED_HANDOFF_FOR_PARENT_ACCEPTANCE_NOT_CANONICAL_DISPOSITION',
    completionBoundary: 'Finite source characterization completed at the 15-body-per-role cap. No product execution, implementation, performance qualification, ledger update, owner retirement, or publication was authorized or performed.',
    pins: {
        Original: pins.original, Default: pins.default,
        reservedWorkingTree: pins.reservedWorkingTree,
        allFifteenSelectedBodiesByteIdenticalBetweenRoles: true,
        equivalenceEvidence: 'derived-source-data-299.json:pairwiseSourceEquivalence'
    },
    acceptanceCriteria: [
        { criterion: 'Fresh registered actual-ID, exact299 scope, pending F258/F259, no lease/HOLD, nonquiesced guards before every Git/gh root.', evidence: 'initial-guard.json; all fifteen *.guard.json; final-observed-guards.json', sourceScopeSatisfied: true },
        { criterion: 'Identify actual producers, containing projects, entry points, generated-output ownership, cardinalities and semantic constraints for each distinct site.', evidence: 'Fifteen whole bodies per role and derived-source-data-299.json; bounded import/runtime gaps explicitly listed below.', sourceScopeSatisfied: true },
        { criterion: 'Compare pinned Original to one newly observed upstream Default, with bounded history/docs/tests.', evidence: '01/02 upstream metadata, 03/04 trees, fifteen pairs of framed byte-exact bodies, eight historical metadata entries per role.', sourceScopeSatisfied: true },
        { criterion: 'No synthetic or amplified workload, generator/test/native run, or source/candidate/shared changes.', evidence: 'All fifteen direct commands and preserved helper sources; only new isolated evidence output.', sourceScopeSatisfied: true },
        { criterion: 'Return two distinct source decisions, not runtime/materiality qualification.', evidence: 'distinctDecisions below.', sourceScopeSatisfied: true },
        { criterion: 'Preserve and seal full actual input/output inventory with actual completed roots/helpers; enclosing sealer exit is not predicted.', evidence: 'Final inventory/seal and enclosing tool result are separate; parent must record/accept actual final outer return.', sourceScopeSatisfied: null }
    ],
    budget: {
        repositoryWholeBodiesPerRole: { Original: 15, Default: 15 },
        repositoryWholeBodyMaximumPerRole: 15,
        chargedInjectedCommonContextsPerRole: 2,
        inclusiveLogicalInputsPerRole: 17,
        inclusiveMaximumPerRole: 17,
        accounting: derived.commonContextAccounting,
        GitGhRootsIncludingFailures: 15,
        rootMaximum: 32,
        actualNonzeroGitGhRoots: 0,
        capAction: 'Stopped further repository body reads at fifteen. No replacement selection, hidden snippets, broadening, missing-member retry, or nested delegation.',
        wholeBodyIndexes: ['bodies-Original-selection-01.json', 'bodies-Original-selection-02.json', 'bodies-Original-selection-03.json',
            'bodies-Default-selection-01.json', 'bodies-Default-selection-02.json', 'bodies-Default-selection-03.json']
    },
    lifecycleAndOwnership: {
        containingCompilations: [
            {
                project: generatorProject,
                facts: 'Exe, IsTestAssetProject=true, TargetFramework=$(DefaultNetCoreTargetFramework), explicit Compile of KestrelSharedSourceRoot KnownHeaders.cs; explicit linked Shared InternalHeaderNames and HPack/QPack support source.',
                evidence: cite(generatorProject, '<Compile Include="$(KestrelSharedSourceRoot)KnownHeaders.cs"')
            },
            {
                project: coreTestProject,
                facts: 'Also explicitly compiles the same KnownHeaders.cs into the Core.Tests assembly. Therefore generator-only/offline-only is not an exhaustive lifecycle statement for F258.',
                evidence: cite(coreTestProject, '<Compile Include="$(KestrelSharedSourceRoot)KnownHeaders.cs"')
            }
        ],
        sourceRootResolution: {
            fact: 'Kestrel Directory.Build.props assigns KestrelRoot to its directory and KestrelSharedSourceRoot to that directory plus shared. Its ancestor props import is visible but the full ancestor import graph is outside this body budget.',
            evidence: cite('src/Servers/Kestrel/Directory.Build.props', '<KestrelSharedSourceRoot>')
        },
        invocationChains: [
            {
                chain: 'Program.Main requires at least five output-path arguments, calls Program.Run once, then returns 0. Program.Run invokes KnownHeaders.GeneratedFile once, computes four other generator outputs, and updates all five target files.',
                evidence: [cite(programPath, 'public static int Main'), cite(programPath, 'var knownHeadersContent = KnownHeaders.GeneratedFile();')]
            },
            {
                chain: 'GeneratedCodeTests.GeneratedCodeIsUpToDate calls the real CodeGenerator.Program.Run once and compares all five generated texts with copied checked-in files. This is an owning generator producer, not injected membership calls.',
                evidence: cite(generatedTest, 'CodeGenerator.Program.Run(testHttpHeadersGeneratedPath,')
            },
            {
                chain: 'Core HttpRequestHeadersTests imports using static CodeGenerator.KnownHeaders; its KnownRequestHeaders MemberData provider enumerates RequestHeaders without Content-Length for true and false reuse values. There are nine MemberData attributes and 98 data rows per full provider enumeration at the pinned literal size. This does not imply 98 type initializations per theory.',
                evidence: [cite(coreRequestTest, 'using static CodeGenerator.KnownHeaders;'), cite(coreRequestTest, 'public static IEnumerable<object[]> KnownRequestHeaders')]
            }
        ],
        documentedBuildAndRunRoute: {
            projectReference: 'Microsoft.AspNetCore.Server.Kestrel.Tests references CodeGenerator.csproj, and copies five generated source files into shared/GeneratedContent for GeneratedCodeTests.',
            evidence: cite(generatedProject, 'CodeGenerator.csproj'),
            generatorStartConfiguration: 'CodeGenerator.csproj sets StartWorkingDirectory to the Kestrel directory and StartArguments to the five actual Core/shared output paths. This is launch configuration, not evidence that every build runs generation.',
            launchEvidence: cite(generatorProject, '<StartWorkingDirectory>'),
            documentedValidationCommandNotRun: '.\\eng\\build.cmd -test -projects .\\src\\Servers\\Kestrel\\Kestrel\\test\\Microsoft.AspNetCore.Server.Kestrel.Tests.csproj',
            documentedCommandBasis: cite('docs/BuildFromSource.md', '## Guide to the build script'),
            nativeInvocationObserved: false,
            automaticGenerationOnEveryBuildEstablished: false,
            limitation: 'The selected projects show compilation/reference/copy ownership and explicit test invocation. Imported targets and the repository-wide CI graph were not evaluated or exhaustively read; no manual-only or every-build assertion is made.'
        },
        outputOwnership: {
            fact: 'The generator returns source text for HttpRequestHeaders, HttpResponseHeaders, and HttpResponseTrailers and associated tables; Program.UpdateFile owns the target write only if generated and existing strings differ. The captured Core project is an SDK shipping project whose tree contains the checked-in HttpHeaders.Generated.cs. Its explicit shared Compile items do not name KnownHeaders.cs.',
            evidence: [
                cite(knownPath, 'public static string GeneratedFile()'),
                cite(programPath, 'public static void UpdateFile'),
                cite('src/Servers/Kestrel/Core/src/Microsoft.AspNetCore.Server.Kestrel.Core.csproj', '<IsAspNetCoreApp>true</IsAspNetCoreApp>')
            ],
            checkedInGeneratedBytes: 672523,
            sourceArithmeticMaskEvidence: [
                cite(generatedOutput, '_pseudoBits = _bits & 496;'),
                cite(generatedOutput, 'HasInvalidH2H3Headers => (_bits & 13161725953)')
            ],
            conclusion: 'The F258 membership queries and F259 API-loop membership predicate are evaluated by the producer, not emitted as equivalent request-time LINQ. Generated ClearPseudoRequestHeaders embeds 496 and generated invalid-response logic embeds 13161725953. This is source ownership evidence, not a measured server workload or complete call-graph census.'
        },
        lifetimeAndFrequency: [
            'F258 runs during successful KnownHeaders type initialization, not once per generated header or each theory row. The directly observed source is compiled into both the CodeGenerator executable assembly and the Core.Tests assembly; separate loaded type identities/processes/contexts may each initialize it.',
            'F259 is inside GeneratedFile. Each actual Program.Run invokes it once and its loops array contains exactly three entries from the retained RequestHeaders, ResponseHeaders, and ResponseTrailers arrays.',
            'The inspected generated-code test invokes Run once per test-method execution. The number of CI/test-host invocations and assembly-load contexts is not observed. Build-time work is not assigned zero value by categorization.',
            'GeneratedFile mutates response/trailer KnownHeader.BytesOffset and adds to BytesCount with +=. An artificial repeated-generator benchmark would change retained state and is explicitly not proposed.'
        ]
    },
    actualProducerData: {
        definitionSource: [
            cite('src/Http/Headers/src/HeaderNames.cs', 'public static class HeaderNames'),
            cite('src/Shared/InternalHeaderNames.cs', 'internal static class InternalHeaderNames'),
            cite(knownPath, 'public static readonly string[] DefinedHeaderNames')
        ],
        tableConstruction: 'Request: common 11 + request literals 35 + CORS 3 + appended Content-Length 1 = 50. Response: common 11 + response literals 21 + CORS 6 + appended Content-Length 1 = 39. Trailers: 3 literals. No duplicates by wire name or resolved identifier in these three current literal tables.',
        retainedArrayWidths: 'Request primary 4, response primary 5, request-existence 3, request-count 1, response-existence 5, enhanced 5, invalid H2/H3 response 5; formatted-internal 7 of which 6 pseudo identifiers. Five pseudo identifiers occur in the request table; Status does not.',
        apiNameProducer: 'HeaderNames declares 96 public static readonly string fields. Five are Obsolete and excluded by the reflection filter, leaving 91 field names. NonApiHeaders has 9 distinct entries formed from two nonpublic wire names plus seven internal identifiers; among the 91 defined public field names only DNT is removed, leaving 90 API names.',
        duplicateContract: 'WebSocketSubProtocols and SecWebSocketProtocol have the same wire value, but DefinedHeaderNames selects field names, so both field-name API entries survive. NonApiHeaders mixes the Alt-Used wire value with the AltUsed identifier; neither is silently normalized.',
        perRoleCalculations: 'derived-source-data-299.json:roles.Original and roles.Default; both independently read from their exact captured bodies.',
        F258: counts.F258,
        F259: counts.F259,
        perLoopFallbackCounts: { HttpRequestHeaders: 46, HttpResponseHeaders: 51, HttpResponseTrailers: 86 },
        calculationLimits: derived.modelLimits
    },
    contracts: {
        equality: 'All contested string Contains calls omit a comparer and use default string equality, which is ordinal and case-sensitive. Any membership index must match that equality; runtime header case-insensitivity elsewhere is not permission to use OrdinalIgnoreCase here. Identifier matching is against resolved field-name identifiers, not raw wire-name text.',
        ordering: 'Keep existing primary-first OrderBy and ThenBy(header => header), whose default string ordering is culture-sensitive; keep index assignments and Content-Length special indices. ApiHeaderNames originates from reflection field names and Except; preserve the existing ApiHeaderNames sequence when emitting F259 fallback properties. Do not enumerate a replacement set to emit source. The offline derivation does not execute reflection or culture-sensitive sorting.',
        duplicates: 'Membership does not require duplicate output removal. Preserve original table arrays and original API field-name sequence; Except already has its own distinct/default-equality behavior. Deduplicating by wire values would incorrectly collapse the two WebSocket API aliases.',
        mutation: 'Readonly array fields do not make array elements immutable. FormattedInternalHeaderNames elements have read-only properties but the public array elements can be replaced. KnownHeader exposes mutable Name, ClassName, Index, byte metadata and flags. No selected normal producer changes Name during filtering; only byte metadata writes are observed during GeneratedFile. That observation is not a universal prohibition on mutation.',
        enumeration: 'F258 ToArray/Aggregate executes the selected initialization pipelines; do not turn a membership cache into the emitted-table producer. F259 Each first calls Any on the filtered API sequence and then enumerates it again through Select/Aggregate. Full passes make 267 membership predicates, plus 3 to 87 additional Any-prefix memberships independent of reflection ordering. The source-order output agrees with the checked-in fallback sequence, but actual runtime reflection enumeration was not executed.',
        exceptions: 'Current literal producers resolve to non-null strings and the two no-seed Aggregate bit queries are nonempty (five matches each). If generalized or externally mutated to empty/null data, existing Aggregate/Identifier resolution can throw. Eager set materialization changes evaluation time, short-circuit reachability, and potentially exception ordering for malformed or concurrently mutated arrays. Do not claim arbitrary mutable-input exception equivalence from these literal-source checks.',
        concurrency: 'No concurrent generator/table mutation path is established in the selected normal producers. Public mutable tables and += byte-state writes mean thread-safe concurrent generation is not established either. No locks, new concurrency model, or global cache is proposed.',
        resultBoundary: 'These are source contracts and static consistency checks against captured output, not red/green execution or proof of arbitrary caller behavior.'
    },
    distinctDecisions: [
        {
            finding: 'F258',
            decision: 'NO_MATERIAL_CANDIDATE_ESTABLISHED_BY_BOUNDED_SOURCE',
            canonicalStatusChanged: false,
            sourceEvidence: cite(knownPath, '.OrderBy(header => !requestPrimaryHeaders.Contains(header))'),
            decisionReason: 'The repeated-lookup shape is retained, including the PseudoRequestHeadersBits projection. At the actual literal sizes it performs 542 membership calls per successful type initialization, with 1..7-element retained sources and a conservative 2547 sequential-equality-position bound plus at most 350 pseudo-filter item visits. It also initializes for actual Core.Tests data production, so generator-only dismissal is incorrect. There is no source-backed multiplicative request/header-row frequency and no observed materiality basis for adding a family of membership structures.',
            sourceOnlyAlternative: 'If later owner evidence shows meaningful aggregate type-initialization cost, consider only local membership preparation in the initializer while preserving all source arrays, ordering, flags and masks. Do not blindly replace the width-one check or add permanent global sets for tiny arrays.',
            notClaimed: 'This is not a measured no-gain result, a rejection merely because work is build/test-time, or runtime/performance qualification. No native gate was consumed.'
        },
        {
            finding: 'F259',
            decision: 'FINITE_SOURCE_PROPOSAL_WITH_CONTRACT_GATE_NOT_QUALIFIED',
            canonicalStatusChanged: false,
            sourceEvidence: cite(knownPath, 'Each(ApiHeaderNames.Where(header => header != "ContentLength"'),
            decisionReason: 'This is a distinct per-GeneratedFile API-complement calculation, not an alias of static table construction. The actual three loop tables are 50/39/3 and the API producer is 90 field names. Each complete emission pass checks 89 non-ContentLength API names per loop, hence 267 membership calls and a conservative 8188 projected-Identifier-visit bound, plus Each.Any prefix work. Identifier recomputation is real source work via ResolveIdentifier, although no allocation or timing amount was measured.',
            finiteProposal: 'For the supported unmodified literal-table producer, prepare one ephemeral ordinal identifier-membership index for each actual loop and use it only to answer F259 membership. Keep ApiHeaderNames as the outer producer, the ContentLength exclusion, the original three loops and every array/order/duplicate/output contract. Do not share F258 state or cache identifiers statically across calls.',
            requiredBeforeImplementation: [
                'Resolve whether externally mutated/reentrant/concurrent KnownHeader.Name inputs are supported. Eager projection does not preserve every short-circuit exception or mutation observation; this source pass does not authorize changing those contracts.',
                'After separate approval, compare the full real GeneratedFile/Program.Run output from an unmodified owning producer against its checked-in baseline and cover special ContentLength, internal/pseudo names, and both WebSocket alias field names. Do not test just an isolated membership helper.',
                'If materiality is pursued, use the actual single producer invocation/test lifecycle with exact real inputs and account for index construction. Do not pad API/header tables, repeat the stateful generator to manufacture a workload, or infer a server-throughput benefit.'
            ],
            notClaimed: 'No candidate, source edit, generator run, correctness pass, throughput/allocation improvement, or runtime qualification exists. This proposal is a finite next gate for the parent, not execution authority.'
        }
    ],
    boundedHistory: {
        rootFiles: ['12-history-Original-knownheaders-owner.stdout.bin', '13-history-Default-knownheaders-owner.stdout.bin'],
        perRoleMaxEntries: 8,
        exactHistoryOutputsIdentical: true,
        trackedPaths: [knownPath, generatorProject, programPath, generatedTest, 'src/Http/Headers/src/HeaderNames.cs', 'src/Shared/InternalHeaderNames.cs'],
        metadataEntries: history,
        interpretation: 'The bounded metadata includes the 2024 ContentLength-enumeration change and explicit-reference maintenance. Selected current body identity proves no change between the two pins for those bodies; subjects alone do not prove historical implementation intent. No historical source body, patch, PR thread, or unbounded history was read.'
    },
    validationBoundary: {
        executed: 'Offline Node metadata/source arithmetic, complete-byte hashes/framing checks, fifteen paired body-equality checks, static generated field/property/mask consistency, and actual direct Git/gh exit/stream observations only.',
        notExecuted: [
            { name: 'GeneratedCodeTests.GeneratedCodeIsUpToDate', reason: 'Explicit source-only authority forbids SDK activation, generator/native execution and tests. Its own implementation creates temporary paths; it was only read, never invoked.' },
            { name: 'HttpRequestHeadersTests MemberData theories and other Core.Tests', reason: 'Explicit source-only authority; no test runner, discovery or case execution.' },
            { name: 'CodeGenerator.Program.Main/Run or KnownHeaders.GeneratedFile', reason: 'Explicit source-only authority; no product/generator execution or output-file regeneration.' }
        ],
        existingTestLimitation: {
            fact: 'GeneratedCodeIsUpToDate compares trimmed text while ignoring line-ending differences, not exact output bytes.',
            evidence: cite(generatedTest, 'Assert.Equal(expected.Trim(), actual.Trim(), ignoreLineEndingDifferences: true);')
        },
        noRedGreenOrBehavioralVerificationClaim: true
    },
    stoppedUnreadGaps: [
        'The fifteen repository-body budget is exhausted. No further source bodies will be read under299.',
        'Global/ancestor MSBuild imports, Common.props framework-property resolution, implicit compilation evaluation, complete transitive HeaderNames assembly resolution, source-build/IDE/CI routes, and scripts/targets outside the selected bodies remain unread/unevaluated. net12.0 remains the retained finding metadata, not a newly evaluated target-framework claim.',
        'The lexical path evidence is bounded to Kestrel plus the named eng/docs/root metadata search. It is not a complete resolved repository call graph, wildcard-Compile proof, or universal census of alias-based callers.',
        'The connected Azure Bluebird scope is unrelated msazure/One and was not queried. Working-tree LSP cannot establish these immutable commit roles; no empty/partial LSP result was used as absence proof.',
        'Historical source implementations, attribute/compiler-emitted reflection ordering, runtime LINQ/string internals, actual CI invocation rates and cold-init costs are not observed.',
        'Other generator families and their HPack/QPack input bodies were not captured; Program.Run names their invocations but no conclusions about their own performance or validity are made.',
        'docs/CrossCuttingGuidance.md and BuildErrors.md were not followed recursively. No shipping code/build-infrastructure change or build execution was attempted; captured applicable guidance bodies were fully charged.',
        'No delegation occurred. Any additional source-contract or native gate requires a separate parent scope, not a silent budget extension.'
    ],
    custodyAndTerminalBoundary: {
        sourceCapture: 'Each whole body has commit:path, tree mode/blob/bytes, recomputed git blob ID, SHA256 and exact byte framing within full cat-file stdout. Raw streams and stdin are unchanged. Metadata tree stdout is also retained in full.',
        rootObservation: 'Every direct Git/gh root has command, guard, spawn PID, exit event, close event, complete stdin/stdout/stderr and terminal receipt. All fifteen returned zero. There was no timeout, stop, process-name kill, lease acquisition or retry.',
        helperObservation: 'run-299.ps1 waits each owned Node helper and both raw stream drains and records its actual exit separately. Those child receipts do not predict the wrapper/tool exit.',
        descendantBoundary: 'Only directly spawned root identities are independently observed. Descendants are not exhaustively enumerated; no universal process census, unrelated-user idleness, complete arbitrary descendant closure or dedicated-host claim is made.',
        finalEnclosingSealerExitCode: null,
        actualFinalOuterReceiptMustBeRecordedAfterToolReturns: true,
        parentOwns: ['independent byte/raw qualification', 'acceptance', 'canonical status/ledger decisions', 'owner retirement', 'publication/finalization']
    }
};
writeJson('SOURCE-REPORT-299.json', report);
console.log(JSON.stringify({
    report: 'SOURCE-REPORT-299.json', phase: 299,
    decisions: report.distinctDecisions.map(value => ({ finding: value.finding, decision: value.decision })),
    repositoryBodiesPerRole: 15, inclusiveLogicalInputsPerRole: 17,
    directGitGhRoots: 15, nativeProductRoots: 0, canonicalStatusesRemainPending: true
}, null, 2));
