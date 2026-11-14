# F319: gRPC service-descriptor PropertyInfo cache -- no supported net startup gain

**No optimization PR.** The temporary weak-key PropertyInfo cache makes the two
generated-service helper diagnostics 10.37-12.48% faster, but only one of five
real startup workloads improves in every comparison. The other startup results
are mixed, including an unstable four-Colon workload with a +17.37% median.
Reported startup allocation reductions also reverse in the third pair,
including the unchanged no-bind control. They are not supported structural
savings attributable to this cache.

The original shipping helper was restored byte-for-byte. The independent
[tests-only source commit](https://github.com/jaslawinMs/aspnetcore/commit/eb1fb6318cd36937b5fe12ffb03f6e84650a45ab)
adds six getter-contract rows; it contains no cache, public API change, or other
performance proposal. All 78 measured outcomes, 78 actual producer receipts,
and 946 individual test outcomes are retained. Three comparisons are closed;
there was no tuning, discarded timing launch, or fourth comparison.

## Current-default producer and scope

Baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`. The actual caller is
[JsonTranscodingServiceMethodProvider.OnServiceMethodDiscovery](https://github.com/dotnet/aspnetcore/blob/37e809ead5824bc753a1c3d56f11615bdb1296c5/src/Grpc/JsonTranscoding/src/Microsoft.AspNetCore.Grpc.JsonTranscoding/Internal/Binding/JsonTranscodingServiceMethodProvider.cs#L44-L87):
it passes the generated BindService method's declaring type to
`ServiceDescriptorHelpers.GetServiceDescriptor` before descriptor registration
and endpoint binding. This is **endpoint discovery/startup**, not an established
per-request path or a dormant helper. LSP navigation missed the live caller;
bounded current-source inspection found it. The empty
`swagger-consumer-removal.patch` is not evidence that this consumer was removed.
Target history and bounded related-work searches are retained.

The prototype caches **PropertyInfo, not descriptor values** in a
`ConditionalWeakTable<Type, DescriptorProperty>`. Every call still invokes the
getter and preserves its current result, null, and reflection exceptions.
Caching metadata would introduce process-wide state and require metadata
invalidation/Hot Reload and lifetime handling before any shipping proposal.
Those boundaries were not implemented or verified; no cache is shipped.

## Fixed actual workloads

`harness/AutoPerf.Benchmarks.csproj` generates the repository's real
`transcoding.proto` with pinned Grpc.Tools 2.83.0 and Google.Api.CommonProtos
2.15.0. Startup cases execute fresh `AddGrpc`/`AddJsonTranscoding`, build DI,
call `MapGrpcService<TService>()`, and materialize the actual endpoint data
source. The established test recipe excludes the ordinary gRPC discovery
provider, retaining the actual JSON transcoding provider.

`Map_Greeter_1/4/16` and `Map_Colon_1/4` perform that many **fresh provider/startup
operations**, not that many registrations in one retained app. Untimed setup
asserts nine/two actual HTTP bindings, descriptor identity, real handler
creation, GET/DELETE additional bindings and POST colon routes. The resulting
data sources include the existing gRPC fallback endpoints; the Greeter result
is eleven total endpoints, not an assumed total of nine. `Map_NoBind_Control`
has no generated BindService method and does not execute the changed helper.

Six explicitly diagnostic helper/getter cases and the direct-descriptor
control complete the 13-case matrix. These do not establish request hotness.
Setup warms descriptors and cache entries; these are repeated fresh-app
operations in a warm process, **not cold first-process startup**.

## All paired timing outcomes

Each percentage is `(after mean / before mean - 1) * 100`; negative is faster.
The median is the median of the three paired percentages, not pooled samples.

| Case | Pair 1 | Pair 2 | Pair 3 | Median | Maximum within-run CV |
|---|---:|---:|---:|---:|---:|
| Direct_Descriptor_Control | +0.01% | +0.41% | +1.01% | +0.41% | 2.64% |
| Helper_Colon | -12.48% | -15.65% | -12.39% | -12.48% | 1.11% |
| Helper_Greeter | -10.37% | -14.52% | -10.06% | -10.37% | 1.06% |
| Helper_Missing | +3.19% | +3.15% | +1.21% | +3.15% | 1.18% |
| Helper_Null | -13.16% | -15.15% | -15.18% | -15.15% | 0.78% |
| Helper_Throw | +2.25% | +1.08% | +0.02% | +1.08% | 1.05% |
| Helper_Wrong | +0.10% | -0.48% | -1.07% | -0.48% | 1.05% |
| Map_Colon_1 | +4.78% | -11.12% | -0.47% | -0.47% | 15.95% |
| Map_Colon_4 | -25.92% | +68.11% | +17.37% | +17.37% | 36.90% |
| Map_Greeter_1 | -1.13% | +0.13% | +4.37% | +0.13% | 3.55% |
| Map_Greeter_16 | +0.81% | -3.02% | +0.35% | +0.35% | 3.49% |
| Map_Greeter_4 | -3.13% | -3.79% | -0.40% | -3.13% | 3.99% |
| Map_NoBind_Control | -2.30% | -1.39% | +6.30% | -1.39% | 3.18% |

The only repeatable startup time reduction is the small four-Greeter result.
Four other startup cases have mixed signs. The large first-pair Colon result
is not repeatable. The three simple helper diagnostics retain zero B/op in
both variants; the throwing-getter diagnostic reports **21/20/20 extra B/op**,
with no asserted causal explanation. The missing-property diagnostic is
slower in every pair.

| Actual startup/control | Pair 1 B/op delta | Pair 2 B/op delta | Pair 3 B/op delta |
|---|---:|---:|---:|
| Map_Colon_1 | -24,878 | -12,033 | +13,821 |
| Map_Colon_4 | -100,102 | -48,119 | +56,044 |
| Map_Greeter_1 | -19,185 | -12,887 | +4,663 |
| Map_Greeter_16 | -307,960 | -206,712 | +76,116 |
| Map_Greeter_4 | -77,050 | -51,690 | +18,626 |
| Map_NoBind_Control | -4,431 | -229 | +14,751 |

All affected startup heap directions and the unchanged control reverse in
pair three. Do not promote the first two pairs or median B/op to a structural
allocation-saving claim. Full means and allocation arrays are in
[comparison.md](comparison.md) and [comparison.json](comparison.json);
all eight samples, raw console/CSV/JSON/Markdown, and variance are retained.

### Allocation investigation: explicit unresolved boundary

The pinned DI implementation
[conditionally queues compilation after a second service resolution](https://github.com/dotnet/dotnet/blob/dfd6ac738610ea05f42e704be82b386e71052e12/src/runtime/src/libraries/Microsoft.Extensions.DependencyInjection/src/ServiceLookup/DynamicServiceProviderEngine.cs).
BenchmarkDotNet 0.13.0
[uses precise total allocated bytes on this runtime](https://github.com/dotnet/BenchmarkDotNet/blob/v0.13.0/src/BenchmarkDotNet/Engines/GcStats.cs).
Neither source fact establishes that background DI compilation occurred in
these actual startup cases or caused the reported heap differences.

An attempted diagnostic assertion that off-thread DI compilation occurred
**timed out**; that failed assumption and console are retained. The corrected
untimed `producer-audit` project observes the real immutable startup fixture
with the DI EventSource enabled. Four captures (original/cache, Greeter/no-bind)
each observe two built/disposed providers but **no off-thread compilation
event in the bounded ten-second window**. This is not a fourth timing/heap
comparison, nor proof that the mechanism is impossible in every context.
The allocation differences remain **unattributed**. No native/JIT/inlining or
causal speedup explanation is asserted.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| Invoke the real getter on every call and preserve changed descriptor identity | `GetServiceDescriptor_ReadsCurrentDescriptorOnEveryCall`; both exact identities and two getter reads |
| Preserve null and actual getter execution | `GetServiceDescriptor_NullGetterResultIsPreserved`; null and one getter read |
| Preserve wrapped getter exception and inner message | `GetServiceDescriptor_ThrowingGetterPreservesInvocationException` |
| Preserve missing-property lookup, including inherited static property behavior | Both rows of `GetServiceDescriptor_MissingDeclaredPropertyPreservesException`, `MissingDescriptor` and `InheritedDescriptor`; exact existing exception message, typo unchanged |
| Preserve wrong getter CLR-value exception | `GetServiceDescriptor_WrongGetterTypePreservesInvalidCastException` |
| Exercise the actual startup producer/materialized HTTP contract | All 13 immutable fixtures and all 78 measured `setup-correctness.json` receipts; existing `JsonTranscodingServiceMethodProviderTests` |
| Same original harness/configuration and exactly one owning DLL difference | 84 recursive DLL/JSON entries in `assembly-hashes.json`, every actual owner/MVID receipt |
| Restore shipping source/owner and keep the final diff tests-only | Baseline source blob, original/restored SHA-256, `provenance.json`, tests-only commit; owned App.Ref BOM restored exactly |
| Cache invalidation, collectible-key lifetime, cold insertion/retained size | **Unverified and excluded; prototype restored, not shipped** |

Existing startup/helper tests pass **13/13 before additions**. The containing
suite passes **311/311, zero skips** on original, prototype, and restored source;
each of the six new rows passes in all three runs. All **946 individual
outcomes** are in `all-test-outcomes.json` and retained TRX files.

## Commands and reproducibility

Run from the ASP.NET Core source root, with the repository's existing source
build prerequisites and activated SDK. Containing tests require the local
source-built `Microsoft.AspNetCore.App/12.0.0-dev` documented by the
[F295 framework installation evidence](../F295/dev-framework-installation.json).
Repository SDK/package configuration and NuGet files were left unchanged;
the standalone harness contains its required pinned dependencies. No
power/affinity settings or unrelated processes were changed.

```powershell
. .\activate.ps1
$evidence = 'C:\src\autoperf-results\F319'
$test = '.\src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.csproj'
dotnet test $test -c Release -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false --logger 'trx;LogFileName=results.trx' --results-directory "$evidence\tests-replay" -v quiet
dotnet build "$evidence\harness\AutoPerf.Benchmarks.csproj" -c Release -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -v quiet
dotnet "$evidence\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll" --verify-setups
dotnet "$evidence\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll" --filter '*ServiceDescriptorStartupBenchmark*' --inProcess --exporters json csv --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
```

**Recorded results:** containing test command passed 311/311 for each variant;
final harness build passed with zero warnings/errors; all 13 setup assertions
passed; all six measured launches exited zero with eight measurements per case.
Focused test whitespace validation with `--verify-no-changes` passed.
`execution.json` records each exact measured command and successful result.
The original experiment used immutable before/after snapshots in A/B, B/A,
A/B order, not an overwritten single output directory.

For A/B replay, retain the committed tests and exact original harness in both
variants; replace **only** the owning helper with the byte-identical
`source-before.cs` or discarded `source-experiment.cs`, build, and freeze copied
outputs. Reuse the original harness DLL/PDB/runtime/deps in the candidate
snapshot and verify the owner-only closure before running either variant.
The raw prototype is diagnostic evidence, not an implementation proposal.

Preparation failures are retained: missing standalone framework/DI/logging
implementations, missing routing abstractions and HTTP extensions, an incorrect
initial metadata namespace oracle, the failed background-compilation assumption,
and a PowerShell interpolation error rejected before command execution. None
consumed another measured pair or was hidden by an omitted case.

Measurements are serial observations on the shared Windows/.NET 12 box with
BenchmarkDotNet 0.13.0, server GC, three warmups, eight measured iterations,
100-ms iteration targets, and `DontRemove` outliers. Hardware/SDK/runtime are
in `environment.json`; hashes/source mapping are in `provenance.json`.
No request-throughput, concurrent-startup, true cold-start, retained-cache
size, Hot Reload, or other-platform benefit is established.
