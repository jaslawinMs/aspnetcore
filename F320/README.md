# F320: stop constructing unused gRPC body-property metadata

**Measured proposal, not a request-throughput improvement.** The complete body
descriptor helper is consistently faster and allocates less after removing its
unused CLR property lookup. All six full binder `ParseRoute` named-body cases
save 88-920 B/op in every pair; their time results are smaller/mixed. Full startup
results are noisy and are not attributed to this change.

Source: [fa079e6c0ef9aa82d40dfba63dc7217617a47ea2](https://github.com/jaslawinMs/aspnetcore/commit/fa079e6c0ef9aa82d40dfba63dc7217617a47ea2),
on independent branch `autoperf/F320-grpc-body-property`, based on current main
[37e809ead5824bc753a1c3d56f11615bdb1296c5](https://github.com/dotnet/aspnetcore/commit/37e809ead5824bc753a1c3d56f11615bdb1296c5).
No F295 formatter/F319 cache change is included. F321's wildcard
method/request-parameter reflection is untouched.

## Actual owner and reason for deleting work rather than caching

The retained scan occurrence was informational, cold endpoint-setup work:
`ResolveBodyDescriptor` projected a protobuf body field name to a CLR property
name, called `Type.GetProperty`, and stored that `PropertyInfo`.

The live `JsonTranscodingProviderServiceBinder<TService>.CreateDescriptorInfo`
calls the helper, but copies only the protobuf message/field descriptors and
repetition flag into `CallHandlerDescriptorInfo`. It discards CLR
`PropertyInfo`/`ParameterInfo`. The old Swagger description provider consumed
those members; it was removed by
[dotnet/aspnetcore#67919](https://github.com/dotnet/aspnetcore/pull/67919),
commit 39e1ac975cf138c56fff984dd824ab651a448367.
The [actual removal diff](actual-swagger-consumer-removal.patch) and
[former member consumers](former-swagger-member-consumers.log) preserve that
history. Earlier empty, incorrectly rooted Swagger-path filters are retained,
explicitly **not** treated as evidence.

The complete [original owning-assembly audit](owner-audit-before.log) scans all
496 method definitions: 490 IL bodies and 6 bodyless declarations, 3,252 method
operands and 284 string operands. It finds the real binder call and zero CLR
metadata getter calls/name-string matches. The
[proposed-owner audit](owner-audit-after.log) independently checks the same
boundary. These are owning-assembly/static evidence, not a whole-repository
code graph or proof that arbitrary external reflection cannot exist.

The shipping diff only removes the name projection/GetProperty locals and the
unused argument in each named-body constructor call. Descriptor/field selection,
repetition, empty/wildcard branches and invalid-body guards remain. The nested
internal-owner metadata shape/defaults remain; there is no public API change,
new cache, retention policy or Hot Reload invalidation mechanism.

## Three complete comparisons, all outcomes retained

Negative time change means faster. Each row is a median of three **paired mean
ratios**, not pooled independent observations or a statistical-significance
claim. Each launch has 8 measured iterations, 3 warmups and `DontRemove` outliers.
Order: A/B, B/A, A/B; no tuning and no fourth comparison.

| Case | Pair1% | Pair2% | Pair3% | Median% | B/op before -> after |
|---|---:|---:|---:|---:|---|
| Helper_Repeated | -78.44 | -77.79 | -78.10 | -78.10 |776 ->160|
| Helper_Sub | -43.29 | -41.30 | -34.33 | -41.30 |224 ->136|
| Parse_Sub | +3.15 | -4.16 | -8.91 | -4.16 |4576 ->4488|
| Parse_SubData | -3.18 | -1.41 | +10.24 | -1.41 |4728 ->4496|
| Parse_Repeated | -7.21 | -4.55 | -6.49 | -6.49 |5128 ->4512|
| Parse_RepeatedMsg | -7.01 | -4.16 | +9.58 | -4.16 |5192 ->4520|
| Parse_Map | -4.58 | -2.69 | -0.04 | -2.69 |4864 ->4504|
| Parse_RepeatedWrap | -10.51 | -9.56 | -17.84 | -10.51 |5448 ->4528|
| Parse_Empty_Control | +3.46 | +1.01 | -4.31 | +1.01 |4352 ->4352|
| Parse_Wild_Control | +2.01 | -0.54 | +13.98 | +2.01 |4448 ->4448|
| Parse_Miss_Control | +0.65 | +0.20 | +4.01 | +0.65 |4032 ->4032|
| Parse_Nest_Control | -2.73 | -1.65 | -0.92 | -1.65 |4056 ->4056|
| Map_Greeter_1 | +5.23 | -5.20 | -51.87 | -5.20 |202416/200115/201427 ->200732/199109/184040|
| Map_Greeter_4 | -3.86 | -3.31 | -10.86 | -3.86 |801942/793606/799289 ->795773/789999/735629|
| Map_Colon_Control | -3.41 | -0.54 | -13.29 | -3.41 |131967/130785/133342 ->126860/130782/116687|
| Map_NoBind_Control | -2.55 | +4.75 | +1.74 | +1.74 |84602/82320/92383 ->82781/81754/86767|

Helper_Sub saves 88 B/op (39.29%); Helper_Repeated saves 616 B/op (79.38%).
The six named full-parse cases consistently save 1.92-16.89% heap. Only
three of six have lower mean time in **every** pair; Parse_Map's third
-0.04% is not a meaningful timing win by itself.

**All non-wins matter:** Parse_Sub is slower in pair1; SubData/repeated-message
are slower in pair3. Four of six unchanged control medians are higher; the
wildcard control's pair 3 is +13.98%. The existing colon startup control is faster
in all three pairs although its named-body path is unaffected.

Greeter_1's apparent pair 3 -51.87% is **not** a supported attributable startup win.
Its maximum within-launch CV is 16.25%; Greeter_4 reaches 12.08%, colon 11.66%.
All startup allocation magnitudes shift, including unchanged startup controls.
No causal/native/JIT or DI-compilation explanation was established for those
shifts. The stable component allocation savings do not establish those larger
startup heap differences.

All 96 measured outcomes and their 96 actual producer receipts are public:
[paired means/heap](comparison.md), [comparison JSON](comparison.json),
[all paired directions](all-paired-summary.json), [raw case outcomes](raw-case-outcomes.json),
[within-launch variance](variance.json), [producer receipts](setup-correctness.json),
and all six raw JSON/CSV/Markdown/console folders. Nothing was filtered away.

## Faithful boundary and compatibility

The fixed 16-case [harness](harness/BodyPropertyBenchmark.cs) measures the **actual**
complete `ResolveBodyDescriptor`, actual binder `ParseRoute/CreateDescriptorInfo`,
and fresh `AddGrpc/AddJsonTranscoding/DI/MapGrpcService` endpoint materialization.
No copied property-lookup/string formatter is used. The private ParseRoute call
uses an identical expression-compiled wrapper/ValueTuple boxing in both builds;
reflection assertions are outside timed operations.

SubData/map/repeated-message/wrapper selectors use actual generated message
fields as diagnostic body selectors. The current generated Greeter annotations
name `sub` and `repeated_strings`. Startup count 4 means four fresh providers/apps,
not four registrations in one retained provider. Providers are disposed and only
the latest endpoint collection is retained, not accumulating invocation history.

Every measured setup also creates the real generated endpoint handlers and
invokes SubBody, SubRepeatedBody and wildcard Body with JSON bodies and conflicting
query values. It observes exact service request fields and 200 JSON responses:
**288 real producer-to-request-handler checks** across 96 measured setups.
Descriptors are not manually injected into downstream call-handler objects.

This deliberately selects produced RequestDelegates directly: middleware/network
route matching is **not** exercised (the generated fixture has overlapping POST
routes). The material body/query/response boundary is exercised, not external
HTTP/browser E2E or per-request speed. Cold first-process, arbitrary external
reflection/malformed custom CLR metadata, trimming/Native AOT and live-edit
runtime behavior are not validated. No new process-wide metadata state exists.

| Requirement | Evidence |
|---|---|
| Named message/underscore/repeated/map descriptor selection | `ResolveBodyDescriptor_NamedFieldPreservesBindingDescriptors`: all 5 rows pass original/proposed, exact field/message identity and repetition |
| Empty body | `ResolveBodyDescriptor_EmptyBodyPreservesNoBody`, original/proposed |
| Unchanged wildcard request metadata (F321) | `ResolveBodyDescriptor_WildcardPreservesRequestParameterMetadata`, plus real produced wildcard Body JSON request/response |
| Missing/nested invalid bodies | `ResolveBodyDescriptor_MissingFieldPreservesException` and `ResolveBodyDescriptor_NestedFieldPreservesException`, exact original messages |
| Scalar body invalid partition | `ResolveBodyDescriptor_ScalarFieldPreservesException`, original/proposed |
| Actual discovery and material HTTP JSON result | `BodyPropertyBenchmark.Setup` and `VerifyProducedRequestHandlers`: all 16 cases, 96 measured receipts/288 generated-handler outcomes |
| Original/default and proposed compatibility | 12 existing actual startup tests before additions; 315/315 original and 315/315 proposed, zero skips; all 642 individual outcomes in [all-test-outcomes.json](all-test-outcomes.json) |
| Measured source and dependency identity | Same original harness DLL/PDB/runtime/deps; all 86 recursive DLL/JSON files differ only in owner DLL; [recursive closure](recursive-closure.json), [hashes](assembly-hashes.json), [load receipts](assembly-loads.json), [strict provenance](provenance.json) |
| Minimal scope/format | Two-file committed source diff; scoped `dotnet format whitespace --verify-no-changes` and `git diff --check` pass; owned App.Ref XML BOM restored byte-for-byte |

These are preservation tests, not a claim that original behavior was incorrect.
The performance before/after comparison establishes the redundant work/heap
cost; the original and proposed contract tests both pass.

## Commands and reproducibility

Measurements use repository SDK 12.0.100-alpha.1.26557.102, pinned
Core 12.0.0-alpha.1.26562.105 and BDN 0.13.0/in-process/server GC on the shared
Windows Xeon Platinum 8473C guest (eight cores/16 logical processors).
No affinity/power settings or unrelated processes were changed.

Before direct .NET commands from the repository root:

```powershell
. .\activate.ps1
dotnet test .\src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --logger "trx;LogFileName=results.trx" --results-directory "<RESULTS>"
```

Result: original 315 passed/proposed 315 passed, 0 failed/0 skipped, all 10 new rows.
The earlier actual startup-only filter passed 12/12.

```powershell
dotnet format whitespace .\src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.csproj --no-restore --verify-no-changes --include "C:\src\aspnetcore\src\Grpc\JsonTranscoding\src\Shared\ServiceDescriptorHelpers.cs" "C:\src\aspnetcore\src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\ServiceDescriptorHelpersTests.cs" --verbosity quiet
git --no-pager diff --check
```

Result: both passed. [format log](format.log) (zero-byte success is valid).

Build the published standalone [project](harness/AutoPerf.Benchmarks.csproj)
against each independent source checkout, with `AspNetCoreRoot` pointing to it:

```powershell
dotnet build "<HARNESS>\AutoPerf.Benchmarks.csproj" -c Release -p:AspNetCoreRoot="<SOURCE>" -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
dotnet "<IMMUTABLE_SNAPSHOT>\AutoPerf.Benchmarks.dll" --audit-owner
dotnet "<IMMUTABLE_SNAPSHOT>\AutoPerf.Benchmarks.dll" --verify-setups
dotnet "<IMMUTABLE_SNAPSHOT>\AutoPerf.Benchmarks.dll" --filter "*BodyPropertyBenchmark*" --inProcess --exporters json csv --artifacts "<RESULTS>" --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
```

Builds and all fixture/audit commands passed. Exact six launch arguments/results
are in [execution.json](execution.json). Reuse the original harness DLL/PDB and
runtime/deps for A/B, verify owner-only differences, never rebuild between timed
operations. Binary snapshots are intentionally not published.

The source-built App 12.0.0-dev test framework prerequisite from F295 is still
required; its [local installation evidence](../F295/dev-framework-installation.json)
records the exact isolated setup. No global installation/manifests were changed.
Standalone source references include HTTP Features and MVC Core because real
HTTP JSON handling needs them with transitive framework references disabled.

Preparation failures are retained: direct test build initially lacked managed
Crossgen flags (NETSDK1094); the initial harness missed the Routing.Patterns using;
real request fixtures then exposed missing HTTP.Features/MVC.Core dependencies.
These were corrected **before measurements**, not skipped or timed as successes.
The first source-publication path guard also aborted before staging due to
PowerShell join-expression grouping; its corrected guard verified exactly the
two in-scope files. Earlier empty wrong-directory history files remain non-evidence.
