# NavLink common-prefix casing trade-offs (F070)

**Qualified fork-only proposal, not merge-ready:** the final strategy reduced
the actual managed 64-link toggle/query scenarios by **68.70% / 67.45%**, but
fully mixed-case prepared matching regressed **59.73-110.51%** and the one-way
trailing-slash case regressed **179.98%**. These costs are not hidden by the
same-case wins. No production URI-case distribution or universal benefit was
established.

The [seven-line owner change](https://github.com/jaslawinMs/aspnetcore/blob/4b3d4f7ad754b66d99e361ded9ec62bf04e41b0b/src/Components/Web/src/Routing/NavLink.cs)
skips only an ordinal-identical common prefix when the two spans have equal
lengths. The existing lowercase-character comparer, hash behavior, caller
branches, URI normalization, query/fragment switch, and one-way trailing-slash
logic remain unchanged. Forty-seven added test lines preserve existing
behavior; no public API, cache, lifetime, package, or configuration changes.

## Provenance and budget

- Current-main intake baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- Independent branch: `autoperf/F070-navlink-casing`.
- Source/test commit: `4b3d4f7ad754b66d99e361ded9ec62bf04e41b0b`.
- Original/final actual Web owner SHA-256: `729DD060F70F6287C1635F0625A42FAB717CD3B6031CAE15D23EE65BBEB5A3E0` / `9B22FEE33BF0109518B2651E3348D0494898990DAEB811486B5F31DC6ED09C7E`.
- Exactly **three** measured comparisons, three measured source strategies,
  one unchanged canonical harness. The final source has **one pair**, not
  three repetitions. No fourth comparison or dry/smoke timing run.
- All **180 outcomes / 90 pairs / 1,440 actual samples / 186 loaded-owner
  markers** passed the [reproducible audit](measurement-audit.json).
- Each measured recursive DLL/JSON closure has **94 files**, with only
  `Microsoft.AspNetCore.Components.Web.dll` differing. Tested/frozen owner
  equality, portable-PDB source hashes, and committed-source identity are
  recorded in the identity JSON files.

The original comparer history is dotnet/aspnetcore#59903. The historical
[pre-edit acceptance record](acceptance-before-owner-edit.md) and subsequent
strategy decisions are retained, including an unmeasured caller-level
alternative. That alternative's tests/contracts are not another measurement.

## Actual measurement boundary

The [BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj) references the
in-tree Web owner and tested dependencies, not a copied character loop.
Twenty-four profiles time the protected shipping matcher on a component whose
href was populated by actual renderer parameter handling and URI resolution.
Exact-route descriptor strings are constructed independently and normalized
separately, not injected into private href state.

Six profiles render ordinary shipping NavLink menus through `HtmlRenderer`,
then call public navigation through a real `NavigationManager` subclass.
The timed operation includes actual URI resolution, framework notification
subscribers, the dispatcher adapter, and managed render-tree updates.
Validation reads exact rendered href/CSS/aria values before and after cycles.
`HtmlRenderer` is noninteractive and omits interactive after-render behavior:
these are **CLR managed menu costs, not browser, circuit, network, or full
application navigation throughput**.

SDK `12.0.100-alpha.1.26557.102`, runtime `.NET 12.0.0 (12.0.26.56305)`,
BenchmarkDotNet `0.13.0`, C# 13, concurrent server GC, in-process Short job:
3 warmups, 8 iterations, 100 ms target, outliers retained. Runs were serial,
before/after, after/before, before/after. This is a shared Windows 11 guest,
not a dedicated benchmark host; no power, affinity, or machine changes.
BDN reports CPU as unknown; prior hardware inspection identified a Xeon
Platinum 8473C guest with 8 cores, 16 logical processors and about 64 GiB RAM.

## Final pair: selected rows, both directions retained

Positive time change means **slower**. The [complete final table](comparison.md)
contains all 30 profiles and allocation results; raw exports retain spread.

| Profile | Before ns/op | After ns/op | Time change |
|---|---:|---:|---:|
| Exact16 | 57.87 | 6.12 | -89.42% |
| Exact64 | 107.40 | 8.95 | -91.66% |
| Exact256 | 315.43 | 20.07 | -93.64% |
| LateMismatch64 | 342.41 | 59.67 | -82.57% |
| CurrentQuery64 | 120.64 | 17.95 | -85.12% |
| MenuToggle8 | 3549.93 | 2081.91 | -41.35% |
| MenuToggle64 | 17282.49 | 5408.79 | -68.70% |
| MenuQuery8 | 1955.90 | 996.11 | -49.07% |
| MenuQuery64 | 11506.13 | 3745.07 | -67.45% |
| MenuMixed8 | 3842.56 | 3841.38 | -0.03% |
| MenuMixed64 | 19414.04 | 20172.55 | +3.91% |
| Mixed16 | 63.32 | 101.14 | +59.73% |
| Mixed64 | 125.03 | 245.42 | +96.28% |
| Mixed256 | 382.03 | 804.20 | +110.51% |
| DeepMixed64 | 143.73 | 289.87 | +101.68% |
| HrefTrailingSlash64 | 112.20 | 314.15 | +179.98% |
| PrefixChild64 | 10.10 | 11.18 | +10.72% |
| PrefixNeighbor64 | 10.76 | 12.38 | +15.02% |

CurrentTrailingSlash64 is +3.01%; LengthMismatch64 is +0.14%. The untouched
MissingHref control is 1.62 -> 2.25 ns (+38.32%), not a target-path gain.
Prepared matching remains **0 -> 0 B/op**. Menu allocations remain roughly
896-969 B/op; the one-byte rounding differences are not a structural allocation
saving or retained-memory measurement.

Comparison 1's per-character identity guard improved same-case/late-mismatch
work, but fully mixed prepared cases regressed 38.96-50.89% and mixed menus
5.68-13.22%. Comparison 2's exact-span guards inside the helper improved exact
cases but sharply regressed fallback and every managed-menu scenario. Its
first CurrentFragment64 observation has a very high spread (33.66 ns mean,
41.81 ns standard deviation). Both strategies and all raw samples remain
separate in [all-comparisons.json](all-comparisons.json); no final average
mixes these implementations. A causal JIT/codegen explanation was not
separately verified.

## Correctness and real browsers

**Requirement coverage** is preservation evidence, not a functional-red bug
fix claim. The new theory already passes on the original.

| Requirement | Evidence |
|---|---|
| URI resolution remains unchanged | All five `NavLink_WithRelativeToCurrentUri_ResolvesHrefCorrectly` rows and both existing facts pass on original/final. |
| Exact/mixed case, misses, absent/empty href, slash, query/fragment, separator and encoded Unicode retain CSS/aria | All 14 rows of `NavLink_MatchingPreservesActiveClassAndAriaCurrent` pass on original/final; each row independently checks class and aria. |
| Default/strict switch and managed menu notifications preserve actual rendering | 30 profiles in each separate switch process, 180 rendered-state receipts per variant; original/final JSON byte-identical. |
| Original character contract is unchanged | 65,536 reflexive UTF16 values and nine differing pairs per process; raw diagnostics do not prove browser-URI reachability. |
| Actual browser link interception and active navigation remain functional | `Microsoft.AspNetCore.Components.E2ETest.Tests.RoutingTest.CanFollowLinkToOtherPage` passes 1/1 on original/final through the owning Selenium/Chrome client path. |
| Retained real server router updates DOM after real input | Canonical `BlazorWebAppGlobal`, explicitly InteractiveServer, passes the same nine states on original/final; trusted counter input, retained instance, exact CSS/aria, actual fingerprinted framework script HTTP 200, zero current-page errors, WebSocket 101. |

Exact argument/result receipts accompany every test, asset/sample build,
contract process, formatting check, browser run and measurement. The unit
selector `dotnet test src\Components\Web\test\Microsoft.AspNetCore.Components.Web.Tests.csproj --no-restore -c Release -m:2 --filter FullyQualifiedName~NavLinkTest`
with the recorded TRX/properties arguments passed **21/21 original and final**.
The owning E2E project with the exact selector above, Debug, `-m:2`,
`BuildNodeJS=true` and recorded remaining arguments passed **1/1 each**.
Both scoped `dotnet format whitespace --folder --include ... --verify-no-changes`
checks passed without modifying the measured source.

The initial broad managed build failed on unrelated missing restore/ReadyToRun
prerequisites; no successful marker was fabricated. Scoped source/test restores,
real static-assets and sample builds passed. No Playwright tool was available;
dependency-free Edge **CDP** was used without weakening TLS/auth or changing
feeds. The first counter-readiness failure and second incorrect plain-asset
filename observer are preserved. The corrected probe waits for the actual
installed event handler, performs trusted input, and observes the DOM's actual
fingerprinted script request. It does not inject callbacks or event-handler
state. Temporary sample edits and only owned stopped profiles were removed.

## Independent reproduction

Build the actual NavLink tests at the stated baseline/proposal with the locally
activated repo SDK and recorded build properties before building the external
project. `AspNetCoreRoot` can point to each clone/worktree; do not silently use
installed framework assemblies. Freeze identical harness/non-owner files and
the actual differing owner before measuring.

```powershell
Set-Location C:\src\aspnetcore
. .\activate.ps1
dotnet build <EVIDENCE>\harness\AutoPerf.Benchmarks.csproj -c Release -m:2 -p:AspNetCoreRoot=C:\src\aspnetcore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false
dotnet <FROZEN>\AutoPerf.Benchmarks.dll --filter "*NavLinkBenchmark*" --inProcess --exporters json csv --artifacts <NEW_OUTPUT> --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
node <EVIDENCE>\reproduce-analysis.mjs <EVIDENCE> --verify
```

The last command verifies the existing published raw/derived records without
running another benchmark. The historical browser runner has redacted session
paths; the actual reusable driver is `browser-probe.mjs`, and the exact
temporary scenario source is under `browser-scenario-source`.
Static SSR/WASM/Auto performance, AOT/trimming, other runtimes/architectures,
real production distributions and universal navigation latency remain
unverified. Functional browser preservation does not prove those timings.
