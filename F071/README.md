# FormatFilter first-match parsing trade-offs (F071)

**Qualified fork-only proposal, not merge-ready:** the final first-entry
strategy reduces exact long/vendor media-type cases by **67.68% / 54.42%**,
but late JSON matches and larger JSON misses regress by **21.61-26.40%**, and mixed-case,
more-specific and suffix singleton fallbacks regress by **14.02-16.06%**.
No production distribution or universal benefit was established.

The [eight-line owner addition](https://github.com/jaslawinMs/aspnetcore/blob/7296b9b765674bcbc5ffc02927e59b1114c43999/src/Mvc/Mvc.Core/src/Formatters/FormatFilter.cs)
accepts only a nonempty, ordinal-identical, parameterless **first** supported
entry before constructing either media-type value. The original constructor,
loop, subset/parameter matching and every metadata-provider call are unchanged.
109 added test lines preserve existing behavior. There is no action/process
cache, public API/default/convention change, package or configuration change.

## Provenance and budget

- Current-main intake: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- Independent branch: `autoperf/F071-format-filter-parsing`.
- Source/test commit: `7296b9b765674bcbc5ffc02927e59b1114c43999`.
- Original/final actual MVC.Core SHA-256:
  `10F0D202F7F2EBA6FC71D05BEDE4C1DA71EB71B21718DF1AAD8D9CAE032F5E56` /
  `C565594C6B9C31E4B0ABC43076B5C49FCE031A41405067FE7A9292E9BAD33830`.
- Exactly three measured comparisons, three distinct source strategies,
  one unchanged canonical harness. The final strategy has **one pair**,
  not three repetitions. No fourth comparison, smoke or dry timing run.
- All **180 outcomes / 90 paired rows / 1,440 actual samples** are independently
  reproduced by [the non-timing audit](reproduce-analysis.mjs).
- Each recursive DLL/JSON closure contains **165 paths**, with only
  `Microsoft.AspNetCore.Mvc.Core.dll` differing. Loaded-owner markers,
  eight actual PDB document hashes and committed-source identity are retained.

  The acceptance record predates the first owner edit and describes the initial
  reuse strategy. `source-tests-final.cs` is a preserved historical 35-row
  snapshot; `source-tests-after-3.cs` is the final 36-row test source.

The scanner called the metadata stable, but the actual owner invokes arbitrary
`IApiResponseMetadataProvider.SetContentTypes` providers on every request.
Ordinary `ProducesAttribute.ContentTypes` and formatter mappings are mutable.
The scanner's cache prescription was **not adopted**; its classification is
candidate provenance, not proof of a safe cache lifetime or allocation defect.

The value-based parser was introduced in
`2063356f2442cee3c538bd2abc47b6cbbef7cf3a` (January 2016); the latest owner
change at intake was a 2023 throw-helper update. URL-format documentation is
pinned to dotnet/AspNetCore.Docs revision
`692feee601358eeb5d8915b46143303f45e83887`.
The targeted existing-PR search found no match; issue searches included unrelated
dotnet/aspnetcore#55702. This is not an exhaustive absence-of-overlap claim.

## Actual measurement boundary

The external [BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj)
references the in-tree MVC owner and actual tested dependencies, not copied
parser/filter code or an installed ASP.NET framework. Thirty profiles use real
public formatter mappings, ordinary ProducesAttribute providers, independently
allocated strings and real RouteData/DefaultHttpContext query production.
Setup explicitly rejects accidentally aliased equal benchmark strings.

The timed operation resets a prepared ResourceExecutingContext result and calls
public `FormatFilter.OnResourceExecuting`. It includes the per-request metadata
collection/provider work. Query parsing, fixture construction and configuration
are outside timing. Values 200/404 are **resource decision markers**, not
measured HTTP response statuses or throughput. Untimed checks also invoke
OnResultExecuting and inspect the actual selected ObjectResult content types.

SDK `12.0.100-alpha.1.26557.102`, runtime `.NET 12.0.0 (12.0.26.56305)`,
BenchmarkDotNet `0.13.0`, C# 13, concurrent server GC, in-process Short job:
3 warmups, 8 iterations, 100 ms target, outliers retained. Runs were serial:
before/after, after/before, before/after. This is a **shared** Windows 11 guest,
not a dedicated benchmark machine; no power/affinity/machine changes.
BDN reports CPU unknown. Prior hardware inspection identified a Xeon Platinum
8473C guest, 8 cores/16 logical processors and about 64 GiB RAM.

## Final pair: wins and costs

Positive change means slower. The [full final table](comparison.md) includes
all 30 profiles; JSON/CSV/log exports preserve sample spread.

| Profile | Before ns/op | After ns/op | Time change |
|---|---:|---:|---:|
| ExactLong1 | 266.83 | 86.25 | -67.68% |
| ExactVendor1 | 183.37 | 83.59 | -54.42% |
| ExactJson8 | 212.76 | 134.26 | -36.90% |
| ExactJson32 | 421.90 | 337.43 | -20.02% |
| ExactVendor32 | 461.84 | 339.38 | -26.52% |
| QueryExact1 | 166.36 | 102.49 | -38.39% |
| QueryExact32 | 443.74 | 343.69 | -22.55% |
| LastJson8 | 522.36 | 635.24 | +21.61% |
| LastJson32 | 1781.75 | 2252.14 | +26.40% |
| LastParams32 | 2022.56 | 2371.33 | +17.24% |
| MissJson1 | 157.81 | 179.21 | +13.56% |
| MissJson8 | 528.42 | 650.81 | +23.16% |
| MissJson32 | 1773.75 | 2201.08 | +24.09% |
| QueryMiss32 | 1811.55 | 2237.85 | +23.53% |
| MixedJson1 | 148.95 | 169.83 | +14.02% |
| MoreSpecific1 | 152.75 | 175.50 | +14.89% |
| Suffix1 | 154.83 | 179.70 | +16.06% |
| ParamMiss32 | 3819.36 | 4110.37 | +7.62% |

Parameterized exact cases are -4.22% to -10.52% despite not taking the fast
path; larger mixed/more-specific/suffix profiles are approximately unchanged.
No causal JIT/codegen explanation was independently established.
All final allocations are **unchanged**: ordinary profiles 232/320/752 B/op,
unsupported profiles 256/344/776 B/op, controls 0/24/136 B/op.
There is no constructor allocation saving or retained-memory claim.

**Unstable first-row warning:** final original ExactJson1 mean 481.89 ns,
standard deviation 474.88 ns; proposed mean 83.14 ns, standard deviation
2.12 ns. The apparent -82.75% is **not credible large-win evidence**.
Round 2 also has unstable original ExactJson1 (499.05 ns mean,
320.50 ns standard deviation), apparent -76.68%. Both raw series are retained,
not discarded, silently filtered or substituted with later samples.

Round 1 reused the requested parsed value per matching entry: small/long first
matches improved, but larger last/miss/mixed scenarios regressed about 6-12%.
Round 2 skipped subset parsing for only a parameterless first equality **after**
constructing the requested value: vendor/long/query gains were 27-35%, while
late/missing profiles regressed 24-32%. All implementations and comparisons
remain separate in [all-comparisons.json](all-comparisons.json); final results
do not average those strategies.

## Preserved semantics and actual producers

Preservation evidence is **not a functional-red bug fix**: the new tests pass
on the original implementation too.

| Requirement | Evidence |
|---|---|
| Exact, mixed, suffix and parameter semantics, including duplicates/mismatch | All six `FormatFilter_SupportedMediaTypeMatching_PreservesParameters` rows pass twice per row on original/final. |
| Live metadata and overwriting/clearing mappings still reach resource/result decisions | `FormatFilter_ObservesUpdatedMetadataAndMappings` passes original/final; four ordered provider contracts verify both producers execute every request, clearing/overriding, same-instance updates and selected ObjectResult content type. |
| An invalid earlier entry cannot be skipped; an unreachable later invalid entry remains irrelevant | Both `FormatFilter_DoesNotSkipEarlierInvalidContentTypes` rows pass original/final. |
| Raw equality cannot hide original parameter/constructor errors | Both `FormatFilter_DoesNotBypassParsingForIdenticalContentTypes` rows pass original/final; 27 actual public raw-producer outcomes/errors match, including ArgumentOutOfRangeException(index) for a malformed parameter and ArgumentOutOfRangeException(offset) for an empty mapping. |
| Existing hosted URL-format/content negotiation stays functional | `ContentNegotiationTest.FormatFilter_XmlAsFormat_ReturnsXml`, `ContentNegotiationTest.ProducesAttribute_And_FormatFilterAttribute_Conflicting`, and `ContentNegotiationTest.ProducesAttribute_And_FormatFilterAttribute_Collaborating` pass 3/3 original/final through their owning application/HTTP fixture. |

A legal public `MediaTypeHeaderValue` subclass can override ToString:
FormatterMappings validates its Type/SubType then stores that raw string.
Ordinary mutable ProducesAttribute content types supply the matching value.
The actual original parser throws for malformed empty parameter values;
an unconditional raw-equality shortcut would hide that error. The selected
guard excludes semicolons and empty strings; it does not fix the pre-existing
parser issue or introduce stricter validation for parameterless malformed types.
The empty string necessarily aliases String.Empty in the **untimed** error
corpus; this is not one of the independent-string benchmark profiles.

Original/final owning unit runs pass **36/36**; hosted runs pass **3/3**.
Every row and exact command/exit result is retained beside its TRX.
The existing HTTP cases establish hosted preservation, not that every proposed
fast-path/error scenario ran through those endpoints; real public producer
unit/contract paths establish those preconditions.

The initial hosted run failed NETSDK1004; scoped restore then passed.
The initial helper script had a parse error before .NET executed.
The initial raw diagnostic failed on the original malformed parameter.
These failures and subsequent explicit error-recording diagnostics are retained;
none consumed another measured comparison or became a success-shaped fallback.
Whitespace verification passed without modifying either measured/test source.

## Independent reproduction

Use each stated original/proposal checkout and activate its local SDK first.
Build/test the actual owner before building the external harness. Preserve
identical harness/config/non-owner files and freeze actual owner variants.

```powershell
Set-Location C:\src\aspnetcore
. .\activate.ps1
dotnet test src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj --no-restore -c Release -m:2 --filter "FullyQualifiedName~FormatFilterTests" -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false
dotnet build <EVIDENCE>\harness\AutoPerf.Benchmarks.csproj -c Release -m:2 -p:AspNetCoreRoot=C:\src\aspnetcore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false
dotnet <FROZEN>\AutoPerf.Benchmarks.dll --contracts --output <NEW_CONTRACTS_JSON>
dotnet <FROZEN>\AutoPerf.Benchmarks.dll --filter "*FormatFilterBenchmark*" --inProcess --exporters json csv --artifacts <NEW_OUTPUT> --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
node <EVIDENCE>\reproduce-analysis.mjs <EVIDENCE> --verify
```

The final command audits existing evidence **without running more timings**.
Historical validation storage paths require the original campaign layout; the
portable harness supports AspNetCoreRoot and the actual commands are recorded.
For the PDB/raw producer tool, put the frozen original Microsoft dependencies
under `<EVIDENCE>\binaries\before` before building `tools\AutoPerf.Evidence.csproj`.
To inspect the proposed raw path, copy its complete tool output into a new
directory and overlay only the actual final MVC.Core.dll. Verify owner hashes.

Full HTTP/network latency, workload distributions, other architectures/runtimes,
AOT/trimming and retained memory remain unverified. Functional preservation does
not establish any of those performance claims.
