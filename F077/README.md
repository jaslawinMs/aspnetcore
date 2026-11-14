# F077: rejected Newtonsoft JSON Patch token bridge

**Rejected despite large-case speedups.** Replacing the JSON text bridge with
`JToken.FromObject(value).ToObject(type, JsonSerializer.CreateDefault(settings))`
changes three independently observed public patch contracts. No optimization
draft PR was created, and shipping source was restored byte-for-byte.

Baseline: dotnet/aspnetcore `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
The [published source branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F077-jsonpatch-token-bridge)
at [`8ea2e0d63e6d90ebc56591666d7f727f849e7db6`](https://github.com/jaslawinMs/aspnetcore/commit/8ea2e0d63e6d90ebc56591666d7f727f849e7db6)
contains only three passing compatibility tests: one new file, 100 additions.
The rejected implementation is preserved in [source-prototype.cs](source-prototype.cs)
and [prototype-source.patch](prototype-source.patch), not in the branch head.

## Why this replacement is incompatible

The producer is the public `JsonPatchDocument.Replace` API, followed by actual
`ApplyTo`, POCO property resolution and the ordinary conversion helper. No
internal conversion callback is injected. These tests pass on the original
source, fail for the expected reason with the token bridge, and pass again
after restoring the original source.

| Requirement | Evidence |
|---|---|
| Preserve text-reader ISO-date parsing for nested `object` properties | `ConversionIntegrationTest.Replace_NestedObjectValue_PreservesDateParsing`: baseline `DateTime` with UTC value/kind; prototype `String`. |
| Preserve text-reader floating-point representation for nested `object` properties | `ConversionIntegrationTest.Replace_NestedObjectValue_PreservesFloatingPointParsing`: baseline `Double` 1.25; prototype `Decimal` 1.25. |
| Preserve the token presented to a real destination converter | `ConversionIntegrationTest.Replace_ByteArrayValue_UsesTextTokenForDestinationConverter`: baseline supplies `String` and succeeds with `AAH/`; prototype supplies `Bytes` and fails public `ApplyTo` with an invalid-value error. |
| Keep independent global-default participation | Isolated-process `IndependentDefaultSettingsStages` receipt: two actual `JsonConvert.DefaultSettings` factory calls in both variants. No parallel unit test mutates global settings. |
| Preserve ordinary values and independent copies in measured cases | All 28 before/after setup receipts have identical incoming types, operation counts and full output hashes. Both Copy controls assert distinct objects/arrays and mutate the copy without changing its source. |
| Preserve the full owning suite in the final published branch | Original 290/290; rejected prototype 287/290, exactly the three named failures; restored source 290/290. Individual outcomes are retained. |

The first two cases can serialize back to identical JSON while still changing
observable CLR types. The converter case changes success into a patch error.
The existing caught-failure behavior was not altered or bypassed.

This rejects the evaluated general token bridge, **not every possible future
compatible optimization**. It does not justify changing the established
conversion contract to fit a faster implementation.

## Measurements, including unfavorable cases

One complete A/B pair, 28 public `ApplyTo` cases, eight retained samples per
launch, three warmups, 100 ms requested iteration time, MemoryDiagnoser,
server GC, no outlier removal. Identical harness/runtime/dependency
configuration; only `Microsoft.AspNetCore.JsonPatch.dll` differs.

The three incompatible contracts are separate untimed probes and **are not
counted as benchmark gains**. The 28 timed setups verify their own complete
before/after equivalence. Twenty have lower times and eight higher times:

| Compatible measured workload | Paired time change |
|---|---:|
| JSON-produced object, 16,384-character text, one/eight operations | -93.50% / -93.93% |
| Programmatic object, 16,384-character text, one/eight operations | -92.99% / -93.13% |
| Small JSON-produced object, 16-character text, one/eight operations | +32.99% / +27.56% |
| Small programmatic object, 16-character text, one/eight operations | +26.14% / +29.90% |
| Small/large assignability controls | +1.87% / +0.35% |
| One/64-operation independent-copy controls | +3.20% / -0.15% |
| One/64-operation nullable-null controls | -0.15% / +1.41% |

All 22 affected ordinary cases allocate less in this pair; the six controls
have unchanged allocation. Nevertheless, neither those allocation reductions
nor the large-case timings override the compatibility failures. Four cases
exceed the user's 50% early-stop threshold; this item consumes **1/3** permitted
comparisons. There was no source tuning and no further measurement.

All results, including scalar and middle-sized workloads, are in
[comparison.md](comparison.md), [comparison.json](comparison.json) and the raw
[before](round-1-before/results.json)/[after](round-1-after/results.json) exports.
One pair is not evidence of repeatability or a production throughput win.

## Mechanism and provenance

Newtonsoft.Json 13.0.4's
[`JToken.FromObjectInternal`](https://github.com/JamesNK/Newtonsoft.Json/blob/13.0.4/Src/Newtonsoft.Json/Linq/JToken.cs)
serializes through `JTokenWriter`.
[`JTokenWriter`](https://github.com/JamesNK/Newtonsoft.Json/blob/13.0.4/Src/Newtonsoft.Json/Linq/JTokenWriter.cs)
stores decimal/date/byte-array values in typed `JValue` tokens.
The original
[`JsonConvert` text bridge](https://github.com/JamesNK/Newtonsoft.Json/blob/13.0.4/Src/Newtonsoft.Json/JsonConvert.cs)
uses `StringBuilder`/`JsonTextWriter`, then `StringReader`/`JsonTextReader`.
Removing that parse step is therefore not just a storage substitution.

The prototype changed two existing conversion statements and added one using.
It preserved null/assignability shortcuts, resolver branches, two independent
serializer configurations, existing catches, public signatures, and all of
`CopyTo`. No metadata cache or retained state was added.

Historical resolver branches were added in
`51828cc4f9a4d8cafad0d6c5039941dfa88f06b0`; the resolver overload became
internal in `7c4ccff710f524cbb439934d8187c3b7cd9a7d0d`.
Closed dotnet/aspnetcore#17032 discusses nested resolver propagation; its
unmerged code is not treated as shipped history. Open
dotnet/aspnetcore#70323 changes adapter null/empty test semantics, not this
bridge. Those proposed behavior changes are excluded.

See [provenance.json](provenance.json), [assembly hashes](assembly-hashes.json),
[actual timed loads](assembly-loads.json), [setup receipts](setup-correctness.json),
[semantic receipts](semantic-contracts.json), [individual test outcomes](all-test-outcomes.json)
and the immutable capture manifests. Capture revisions/dirty state remain
as captured; the final passing test commit is not misrepresented as the
measured prototype commit. Raw binaries are retained privately, not published.

## Reproduction and command outcomes

Use the repository's pinned SDK/runtime and activate it from the checkout
before every separate command session. The standalone project in [harness](harness)
references the actual source project, not a copied implementation.

```powershell
. .\activate.ps1
dotnet build <harness>\AutoPerf.Benchmarks.csproj -c Release -m:2 -p:AspNetCoreRoot=C:\src\aspnetcore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -o <build-output> --nologo
dotnet <build-output>\AutoPerf.Benchmarks.dll --verify-setups
dotnet <build-output>\AutoPerf.Benchmarks.dll --verify-contracts
dotnet test src\Features\JsonPatch\test\Microsoft.AspNetCore.JsonPatch.Tests.csproj -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false --nologo -v:quiet --logger "trx;LogFileName=results.trx" --results-directory <test-results>
dotnet build src\Features\JsonPatch\src\Microsoft.AspNetCore.JsonPatch.csproj -c Release -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false --nologo -v:minimal
dotnet format whitespace --folder . --include src\Features\JsonPatch\test\IntegrationTests\ConversionIntegrationTest.cs --verify-no-changes --verbosity quiet
dotnet <snapshot>\AutoPerf.Benchmarks.dll --filter "*NewtonsoftPatchBenchmark*" --inProcess --exporters json csv --artifacts <artifacts> --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
```

Harness builds and all 28 setups passed in both variants. Contract mode passed
original source and failed the prototype with exactly three incompatibilities.
The test command passed 290/290 original/restored and failed 3/290 with the
prototype. Shipping builds passed **net12.0, net462 and netstandard2.0** without
warnings/errors in both prototype/restored states. The new test's whitespace
check passed. Both measured launches exited zero and contain all 28 cases.

The first attempted area command incorrectly supplied the ambiguous `-build`
flag and stopped before building/testing. The documented focused `dotnet test`
alternative above then reached every requested assertion; that failed command
is not represented as a passing area build.

To reproduce the rejected result, add the included compatibility-test file to
the baseline, apply `prototype-source.patch`, build a separate output and run
the contracts/tests. Restore the original source before publishing usable
code. Never compare variants using different harnesses or dependency closures.

Measurements are from a shared Windows host, not a dedicated sandbox.
BenchmarkDotNet 0.13.0 reports .NET 12.0.0 (12.0.26.56305), x64, SDK
12.0.100-alpha.1.26557.102. Its CPU fields are unknown; no CPU isolation claim
is made. Native IIS, hosted HTTP throughput, cold-cache behavior, other
serializer configurations, other runtimes and composition with other proposals
were not validated.
