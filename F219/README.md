# F219: OpenAPI body selection, comparison inconclusive before warmup

**No performance result or implementation PR.** The private single-pass candidate passed the selected compatibility checks, but the first Original authorization failed BenchmarkDotNet's concrete in-process toolchain validation before its engine, warmup or counters ran. One baseline .NET process started and exited 1; **zero candidate measurement processes, paired samples or baseline controls exist**. The frozen budget is permanently closed **one of three**, including that failed authorization.

The campaign's administrative `no-gain` bucket means **no qualified proposal**, not measured zero benefit. This is a private harness admission defect, not evidence that the framework change helps or regresses performance. No retry, Default comparison, result-driven protocol change or new browser window is authorized.

## Changed seam and faithful boundary

`ApiDescriptionExtensions.TryGetBodyParameter` creates a deferred body-only query, counts it, then selects its single element. The private candidate replaces that work with one indexed scan of the existing parameter list. It retains false/null for zero or multiple Body descriptions, true and the exact object for one, and the separate Form/FormFile selector. Only this method changed: **15 insertions, 5 deletions** in one file. No public API, package, fixture or dataset changed.

This runs during **OpenAPI document generation**, not on each business request. The unchanged repository `GenerationBenchmarks.GenerateDocument` exercises the real API-description/document producer at EndpointCount 10, 100 and 1000. Actual untimed documents contained **34, 304 and 3004 operations**, respectively, in both causal roles. These are repository benchmark workloads, not a claim about production document sizes or request frequency, HTTP serialization or application throughput.

Original was `37e809ead5824bc753a1c3d56f11615bdb1296c5`. Public main was freshly rechecked at `d3483989953ae3cccd773aea5ea04cb0c7198531`; the target Git blob was unchanged. No Default candidate or Default comparison ran.

## Connected evidence

| Artifact | Evidence |
|---|---|
| Before-candidate frozen protocol and unchanged seal | [Plan](run/plan.json), [seal](run/plan-seal.json) |
| Original and candidate source, unchanged fixture and owning test sources | [Source](source/) |
| Actual green causal preparation and complete private image inventories | [Prepared roles](preparation/prepared-roles.json), [accepted images](run/accepted-images-Original.json) |
| Exact native commands, streams, raw XML and actual direct-child exit receipts | [Baseline](preparation/Baseline/native/), [candidate](preparation/Candidate/native/) |
| Real loaded helper/document results and CLR/owner/fixture identities | [Baseline inspection](preparation/Baseline/inspection/), [candidate inspection](preparation/Candidate/inspection/) |
| Selected DLL/PDB/source associations | [Metadata](selected-metadata.json), [copied bytes](authoritative-copies.json) |
| Exact executed private adapter, driver, launcher and unchanged gateway | [Executed code](executed/) |
| Failed first-baseline output, lifecycle and original failed budget | [Authorization 1](run/comparisons/001/) |
| Permanent closure and explicit dead-slot retirement | [Closed budget](run/diagnostic-budget.json), [retirement](run/comparisons/001/explicit-failed-slot-retirement.json) |
| Coordinator disposition and exclusions | [Acceptance](coordinator-acceptance.json) |

### Compatibility, not performance qualification

Each causal role passed all **15 existing xUnit/VSTest rows**, including both values of every Boolean theory. That is 30 executions of 15 distinct rows, not 30 unique tests:

| Requirement | Exact existing test names |
|---|---|
| JSON body selection and documentation | `GetRequestBody_HandlesJsonBody`, `GetRequestBody_HandlesJsonBodyWithAttribute`, `GetRequestBody_HandlesJsonBodyWithConsumesAttribute`, `GetRequestBody_HandlesJsonBodyWithAcceptsMetadata` |
| JSON optionality | `GetRequestBody_HandlesJsonBodyOptionality(False/True)` |
| No Body description | `GetOpenApiRequestBody_SetsNullRequestBodyWithNoParameters` |
| Separate file/form branches | `GetRequestBody_HandlesIFormFile(False/True)`, `GetRequestBody_HandlesIFormFileOptionality(False/True)`, `GetRequestBody_HandlesIFormFileCollection(False/True)`, `GetRequestBody_HandlesIFormFileCollectionOptionality(False/True)` |

The full class is `OpenApiDocumentServiceTests`; raw XML retains exact parameter names and values. The no-body test has a query parameter: it does not prove an empty total parameter list.

The loaded real helper separately passed **Empty, QueryOnly, BodyOnly, BodyBetweenOtherSources, TwoBodies, TwoBodiesWithOtherSources, FormsAreNotBody** in both causal roles. These assertions check Boolean output plus exact object/null identity. Manually supplied multi-body descriptions characterize the helper contract; they do not establish supported multiple physically bound JSON bodies.

Real helper/document inspection observed CoreCLR **12.0.0-alpha.1.26562.105**, server GC, owner/fixture hashes and MVIDs, and native coreclr/clrjit/hostpolicy hashes. Both causal images used the same fixture and dependencies; only OpenApi owner DLL/PDB changed in benchmark/native consumers. Native xUnit rows were run by the real runner; their separate testhost CLR/MVID is not established by a runtime listing.

The isolated candidate Release owner build passed with **0 warnings and 0 errors** after actual missing local SDK/generated-build-file prerequisites. Exact commands/results are copied under [candidate build](candidate-build/). Managed builds used supported process-local `BuildNodeJS=false`, `UseIisNativeAssets=false` and `StaticWebAssetsEnabled=false`; no Blazor JavaScript, IIS native or static-web-assets pipeline coverage is claimed. Earlier private prerequisite failures remain preserved, not reclassified as passing.

## Why there is no benchmark result

Pinned BenchmarkDotNet **0.13.0** normally changes process/thread priorities in its stock in-process executor. A private executor/toolchain adapter omitted those assignments and power-plan enforcement while retaining the existing engine. The untimed converter also produced inherited default jobs; only the three predeclared safe-toolchain cases were selected, and those inherited default jobs never executed.

The first actual baseline process then rejected all three selected cases:

```text
InfrastructureMode.Toolchain should be instance of InProcessEmitToolchain or InProcessNoEmitToolchain.
```

The stock no-emit support validator does not accept the adapter's concrete type. The process exited before the engine or any workload warmup/measurement; the outer driver preserved the failure and consumed authorization 1. Its earlier inspect mode established functional/image/configuration facts, **not successful BenchmarkDotNet support validation**.

The frozen seven fresh BaselineBefore/Candidate/BaselineAfter blocks, all three parameters, 5% primary materiality, directional/regression gates and every-block baseline control remain **unexecuted**, not retrospectively evaluated. Original did not qualify, so Default was prohibited. Fixing the harness does not reopen this closed finding.

The actual gateway, driver and baseline process were checked absent; the coordinator acquired the global mutex, archived the exact failed lease and explicitly removed that token. No process was killed and no machine, priority, affinity or power setting changed. No dedicated isolation, arbitrary third-party inactivity, universal descendant closure or performance benefit is claimed.

## Offline verification

```powershell
node .\verify.mjs
# PASS: selected copied bytes, PE/PDB/source links, exact saved native rows,
# real helper/document results, and pre-warmup failure/closed-budget boundary.
# Does not execute a target, test, benchmark, restore or remote command.
```

The verifier covers selected copied bytes and metadata only. Complete causal images, SDK/compiler/runtimes and diagnostic logs are deliberately omitted; their saved private inventories are **not a public rehash of omitted files**, whole-source/compiler closure or execution census. The fixed classified REPORT and its existing browser window remain untouched.
