# F228: reject a dormant query-descriptor membership optimization

**Rejected; no optimization issue or draft PR.** The former Grpc.Swagger consumer
was removed in [dotnet/aspnetcore#67919](https://github.com/dotnet/aspnetcore/pull/67919).
No supported current consumer was established. Large dormant-helper diagnostics
improved, but every affected case allocated more. Shipping source and its compiled
owner were restored byte-for-byte.

The [tests-only branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F228-grpc-query-membership)
contains only 77 compatibility-test additions, at
[`0a4011ce6988b2dc8ca602c419079a7549a33525`](https://github.com/jaslawinMs/aspnetcore/commit/0a4011ce6988b2dc8ca602c419079a7549a33525).
It does **not** contain the measured HashSet experiment. Original and experimental
source, the reversible patch, full benchmark project and raw outcomes are here.
This item used **one comparison; its budget is closed**. Four large diagnostic
cases improved by 67-89%, allowing the requested early stop; no current consumer
or heap advantage justified tuning or a speculative PR.

## Current-default reachability

The independent default-branch baseline was
`37e809ead5824bc753a1c3d56f11615bdb1296c5`, not an earlier optimization branch.
The card's startup-time characterization is stale for current production code:

- [Removed consumer history](consumer-removal.log) preserves the exact deleted
  `GrpcJsonTranscodingDescriptionProvider` invocation in
  `39e1ac975cf138c56fff984dd824ab651a448367`.
- Current
  [ParseRoute/CreateDescriptorInfo](https://github.com/dotnet/aspnetcore/blob/37e809ead5824bc753a1c3d56f11615bdb1296c5/src/Grpc/JsonTranscoding/src/Microsoft.AspNetCore.Grpc.JsonTranscoding/Internal/Binding/JsonTranscodingProviderServiceBinder.cs#L232-L260)
  produce route/body/response metadata, without calling this query-table helper.
- Current
  [GetPathDescriptors](https://github.com/dotnet/aspnetcore/blob/37e809ead5824bc753a1c3d56f11615bdb1296c5/src/Grpc/JsonTranscoding/src/Microsoft.AspNetCore.Grpc.JsonTranscoding/Internal/JsonRequestHelpers.cs#L361-L374)
  resolves incoming paths on demand through `TryResolveDescriptors` and a cache.
  This is source evidence, not a measured HTTP request workflow.
- Both [compiled-owner metadata audits](caller-metadata-audits.json) read all
  490 IL bodies among 496 method definitions, with six bodyless definitions,
  3,252 method operands and 284 string operands. There are zero target-name
  method or string matches and zero unresolved **metadata** operands.
  The audit includes method-token operands; none occurred in this owner.
  This is not whole-repository graph coverage or proof against arbitrary
  external reflection or runtime dispatch.

The initial runtime `ResolveMethod` audit failed on an absent standalone
Http.Abstractions dependency; that [failure](caller-audit-runtime-resolution-failed.log)
is retained, not reported as a zero-caller result. The replacement PE-metadata
audit reads external reference names without loading those runtime assemblies.
An incomplete-decoder preparation failure is also retained.

## Faithful diagnostic boundary

Fourteen cases construct actual protobuf schemas with 8, 64, 256 or 1,024 string
fields. Actual `HttpRoutePattern.Parse` and `ResolveRouteParameterDescriptors`
produce the exclusion descriptors outside timing. The complete dormant
`ResolveQueryParameterDescriptors` call is timed, not a copied Contains loop.
Setup asserts exact ordered JSON keys and original FieldDescriptor identities.
The list is route/body exclusion membership, **not** cycle-detection state.

The wildcard case uses the actual `ResolveBodyDescriptor("*", ...)` producer.
The live control calls the actual private `ParseRoute` on the current generic
service binder through a cached expression bridge. It times parsing, route
adaptation, RoutePattern creation and descriptor-info construction; setup checks
all 16 ordered route names/field identities, no body and an empty path cache.
It does not construct or use the dormant query table.

Before timing, the proposed `LiveParseRoute_256_128` template failed in the real
route-precedence producer: it exceeds the allowed 28 segments. Its
[exact failed fixture source](unreachable-live-harness.cs) and
[actual error](setups-before-live-segment-limit-failed.log) are retained.
The corrected live fixture is explicitly named `LiveParseRoute_256_16`.
Large dormant templates do not establish live-binder reachability.
No removed Swagger consumer was restored or replaced.

## One complete A/B comparison

Means in nanoseconds; positive time change is slower. Each launch retains eight
measured iterations, three warmups and `DontRemove` outliers. These are one-pair
diagnostic observations, not repeatability or production-throughput claims.

| Case | Original ns | HashSet ns | Time change | Original B/op | HashSet B/op |
|---|---:|---:|---:|---:|---:|
| Dormant_8_0 | 481.64 | 509.14 | +5.71% | 1,720 | 1,752 |
| Dormant_8_1 | 401.62 | 439.41 | +9.41% | 1,176 | 1,264 |
| Dormant_8_4 | 321.95 | 412.12 | +28.01% | 960 | 1,240 |
| Dormant_8_8 | 152.00 | 292.59 | +92.49% | 320 | 904 |
| Dormant_64_0 | 3,074.31 | 3,450.82 | +12.25% | 9,384 | 9,416 |
| Dormant_64_1 | 3,161.09 | 3,277.99 | +3.70% | 9,368 | 9,456 |
| Dormant_64_32 | 3,423.98 | 2,465.93 | -27.98% | 5,112 | 6,056 |
| Dormant_64_64 | 2,615.62 | 1,614.25 | -38.28% | 1,288 | 3,528 |
| Dormant_256_0 | 13,012.76 | 13,979.87 | +7.43% | 40,897 | 40,929 |
| Dormant_256_32 | 20,035.04 | 12,431.26 | -37.95% | 39,168 | 40,112 |
| Dormant_256_128 | 30,399.20 | 9,972.01 | -67.20% | 21,722 | 26,905 |
| Dormant_256_256 | 32,947.02 | 6,873.57 | -79.14% | 4,408 | 16,192 |
| Dormant_1024_128 | 157,643.46 | 49,540.86 | -68.57% | 114,928 | 120,106 |
| Dormant_1024_512 | 400,312.70 | 45,044.14 | -88.75% | 93,485 | 119,563 |
| Wildcard_256_128 | 1,000.61 | 2,582.18 | +158.06% | 2,272 | 7,456 |
| LiveParseRoute_256_16 | 11,154.15 | 11,348.05 | +1.74% | 23,953 | 23,953 |

Seven affected cases are faster and eight are slower. All 15 affected cases
allocate more, from 32 to 26,078 additional B/op. The unchanged live control's
+1.74% is retained without a causal/JIT explanation.
[Full statistics and ranges](variance.json), [all 32 outcomes](raw-case-outcomes.json),
[original raw exports](round-1-before/results.json) and
[experimental raw exports](round-1-after/results.json) retain every case.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| Route exclusions, no named body, ordered JSON names and FieldDescriptor identity | `ServiceDescriptorHelpersTests.ResolveQueryParameterDescriptors_PreservesRouteBodyExclusionAndOrderedFieldIdentity`, `namedBody=false`; passed individually on original, experiment and restored code. |
| Named-body exclusion, nested route exclusion and preserved remaining order/identity | The same exact test, `namedBody=true`; passed individually in all three runs. |
| Actual wildcard-body producer preserves an empty query result | `ServiceDescriptorHelpersTests.ResolveQueryParameterDescriptors_WildcardBodyPreservesEmptyResult`; passed in all three runs. |
| Complete real-helper and valid current-route producer outputs | [16 distinct receipts per launch](setup-correctness.json), including exact live route-field identities and empty path cache. |
| Original/experimental isolation and exact restoration | [78 recursive DLL/JSON hashes](assembly-hashes.json), identical original harness/PDB/configuration, owner-only DLL difference and [restored owner hash](restored-owner-hashes.json). |
| Honest rejection rather than a dormant-code performance claim | Removed-consumer history, metadata-only coverage/limits and the actual invalid-live-template failure above. No optimization issue/PR. |

The containing net12.0 suite passed **308/308, zero skips** on original,
experimental and restored shipping code. All three new rows and the existing
class fact passed in each run. An additional 308-test preparation suite is also
retained: [all 1,232 individual test outcomes](all-test-outcomes.json) and all
four complete TRX files are published. These are compatibility checks, not a
new functional bug's red/green demonstration.

## Commands, environment and reproduction

All direct .NET commands first used `. .\activate.ps1` from the source root.
Source SDK: `12.0.100-alpha.1.26557.102`; pinned Core runtime:
`12.0.0-alpha.1.26562.105`; BenchmarkDotNet `0.13.0`, in-process, Release,
C# 13 and server GC. The shared Windows guest exposed an Intel Xeon Platinum
8473C, eight cores/16 logical processors, Windows 11 Enterprise 10.0.26300.
[Read-only hardware evidence](hardware.json) supplements BDN's unknown-CPU label.
No power, affinity or unrelated-process settings were changed.

Paths below are normalized; complete launch arguments/results are in
[execution.json](execution.json). `$caseRoot` is this F228 results directory;
`$snapshot` is an immutable rebuilt before/after directory, not a shipped package.

```powershell
. .\activate.ps1
dotnet test src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.csproj -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false --no-restore --logger 'trx;LogFileName=results.trx' --results-directory "$caseRoot\tests-before" --verbosity quiet
dotnet test src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.csproj -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false --no-restore --logger 'trx;LogFileName=results.trx' --results-directory "$caseRoot\tests-after" --verbosity quiet
dotnet test src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.csproj -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false --no-restore --logger 'trx;LogFileName=results.trx' --results-directory "$caseRoot\tests-restored" --verbosity quiet
dotnet build "$caseRoot\harness\AutoPerf.Benchmarks.csproj" -c Release --no-restore -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -v quiet
dotnet "$snapshot\AutoPerf.Benchmarks.dll" --verify-setups
dotnet "$snapshot\AutoPerf.Benchmarks.dll" --audit-callers
dotnet "$snapshot\AutoPerf.Benchmarks.dll" --filter '*QueryMembershipBenchmark*' --inProcess --exporters json csv --artifacts "$caseRoot\round-1-before" --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
dotnet "$snapshot\AutoPerf.Benchmarks.dll" --filter '*QueryMembershipBenchmark*' --inProcess --exporters json csv --artifacts "$caseRoot\round-1-after" --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
dotnet format whitespace "$caseRoot\harness\AutoPerf.Benchmarks.csproj" --no-restore --verify-no-changes --verbosity quiet
dotnet format whitespace src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.csproj --no-restore --verify-no-changes --include src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\ServiceDescriptorHelpersTests.cs --verbosity quiet
```

Results: each of the three final test commands **passed 308/308**; both
standalone source builds **passed**; both snapshot setup/audit commands **passed**;
both timing launches **passed all 16 cases, N=8**; both final formatting commands
**passed with no changes**. Initial missing Routing/Http.Abstractions references,
the incomplete audit decoder and the invalid 128-segment live template are
explicitly retained as failed preparation, not failed timing or passing checks.
The standalone project added only the existing source Routing and
Http.Abstractions references after their actual dependency failures.

Rebuild against the exact tests-only source commit, supplying
`-p:AspNetCoreRoot=C:\your\source` if needed. The new standalone manifest's first
build requires restore; subsequent builds above used `--no-restore`.
Capture the complete original output, then apply [experiment-source.patch](experiment-source.patch)
and rebuild. Form the experimental snapshot from the original output, replacing
only the newly built owner DLL/PDB; retain the exact original benchmark DLL/PDB,
deps and runtime configuration. The recorded captures verify owner-only
differences across all 78 DLL/JSON files. A rebuilt harness DLL changed with
the owner reference; it was deliberately discarded before the measured capture.

The tests reused the repository-local source-built `Microsoft.AspNetCore.App`
12.0.0-dev prepared for [F295](../F295/README.md); no global .NET install was changed.
Source packaging flags and prerequisites are documented there. The
standalone harness disables transitive shared-framework fallback and pins Core12.

Current hosted HTTP behavior, production startup/throughput, cold-runtime costs,
concurrency, other platforms/runtimes and composition with F295/F272 remain
unverified. The public branch intentionally preserves the original shipping
helper, and no result here licenses optimizing removed Swagger code.
