# F062: dispose the SPA proxy's linked cancellation source

**Disposition: qualified measured resource-cleanup proposal.** Retain the
owner-created linked source in a using local, without shortening HTTP response
copy or either WebSocket pump. Ten precise original resource assertions become
green; real public HTTP/WebSocket contracts stay identical. Three comparisons
are closed, with no shipping source tune.

The first comparison exposed a mutable-exception harness artifact. It remains
fully published and consumes one comparison, but is excluded from aggregation.
The two corrected comparisons show 52-95% lower median prepared StopApplication
time at32/1024 completed requests and consistently lower request allocations in
the five reached profiles. **No ordinary request-latency gain is established.**

## Actual owner, producers and lifetime

`SpaProxy.PerformProxyRequest` creates linkage before awaiting the target URI.
The old code keeps only `.Token`, so it cannot unregister the link at completion.
The same link is passed through HTTP SendAsync/ResponseHeadersRead and complete
response stream copy, or both WebSocket pumps awaited with Task.WhenAll.
An early skipped404 or target-task failure must release it too.
The proposal changes only ownership, preserving the existing token local,
branches, target-URI await, result/error contracts and caller-parent ownership.

`ConditionalProxyMiddleware` uses the actual host ApplicationStopping token
with proxy404s:false. The public development-server proxy extension resolves
the same real host lifetime and calls with proxy404s:true. This is a development
proxy, not a production-throughput proposal.

The harness builds that public SPA middleware, real Generic Host lifetime and
source Kestrel loopback upstream. Completed-request benchmarks include real
HTTP send, complete body copy and expected status/body/X-Upstream consumption,
not a copied CTS algorithm. FactoryThrows fails before entering the owner.
FaultedUri reaches link creation and then the original pre-try URI-task failure.
Http200UncancelableRequest still reaches a host-only linked source.

Separate protocol checks run real caller HTTP -> Kestrel SPA frontend -> Kestrel
upstream, plus real caller ClientWebSocket -> SPA proxy ClientWebSocket -> echo
server. Echo is observed while proxy tasks remain pending; completion is driven
by a normal close handshake, real host StopApplication or real caller socket
Abort. These are not injected callbacks or dummy WebSocket pumps.
Each public check produces18 original contract records for24 actual workloads,
including six real TCP HTTP and six real TCP WebSocket workloads.
After both corrected pairs, four separate frozen-owner verification processes
match72 original records/96 workloads byte-identically, including24 TCP HTTP
and24 TCP WebSocket workloads, outside benchmark timing.

## Request witness and the single-GC limitation

The observer tracks each independently created/disposed **caller request-abort
CTS**, not a fabricated linked child. The original live stopping parent retains
the actual owner-created link and indirectly those disposed request sources.
The full six-recipe/count0,1,32,1024 probe has24 rows:
12 request-witness-positive rows, nine genuinely unreached controls, and three
**reached host-only witness-negative rows**. The unused request source in the
last three is collectable even though the original host-only child still exists;
those rows are not untouched controls. Explicit host-only shutdown profiles
were therefore added to the corrected benchmark.
`resource-boundary-correction.json` supersedes the original proof's12-controls
classification rather than disguising it.

Both corrected proposed post-measurement Http200/N1 probes retain **one**
request source at the first single-GC boundary, zero after the later host stop/
GC. Their raw rows and the initial strict-check failure are retained; the root
has not been identified. Do not claim every cold TCP completion is immediately
collectable after one GC.

A separate untimed observer invokes the same frozen real public workload and
exact original/proposed owner DLLs in an independently owner-only101-file
DLL/JSON closure. Eight bounded GC/yield checkpoints occur with the real host
parent continuously live, never stopped during observation. All12 reached
original rows retain exactly1/32/1024 through the observation; all proposed rows
settle to zero. Both variants give36 rows/288 explicit checkpoints.
This supplements deterministic component-level disposal coverage, not universal
immediate quiescence. Observer reflection targets private benchmark classes,
not non-public framework members; no shipping access mechanism is added.

Whole managed heap includes transport caches, weak references and other roots;
its signed delta is retained but is not an attributable retained-byte formula.
Request-witness counts are not claims that every runtime resource is zero.

## Frozen inputs, correction and complete budget

- Baseline current default branch: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- Two-file source/test proposal: [42038a205bd34f18a90d5980cab2c22068220cf1](https://github.com/jaslawinMs/aspnetcore/commit/42038a205bd34f18a90d5980cab2c22068220cf1), branch `autoperf/F062-dispose-spa-proxy-cancellation`.
- Three serialized actual comparisons A/B, B/A, A/B. Zero shipping tunes, one harness correction, no fourth comparison.
- Original18 cases:36 outcomes/18 pairs retained separately. Corrected22 cases:88 outcomes/44 pairs across comparisons2/3. Total124 outcomes/62 pairs/992 actual samples.
- Each launch preserves both full request/shutdown JSON reports plus complete CSV/HTML/Markdown/logs, all eight measurement samples, warnings and statistics. Exact FullName, never abbreviated Parameters, identifies a case.
- All130 actual entrypoint/case owner markers match their frozen shipping owner. Both first and corrected recursive116-file DLL/JSON closures differ only in the SPA owner; corrected snapshots reuse the already verified original/proposed DLLs.
- SDK12.0.100-alpha.1.26557.102; selected NETCore runtime12.0.0-alpha.1.26562.105; actual BDN runtime description is `.NET 12.0.0 (12.0.26.56305)`. BenchmarkDotNet0.13.0, C#13, concurrent server GC, in-process Short, three warmups/eight actual iterations/100ms target, no outlier removal.
- Shared Windows10.0.26300/Windows11 Enterprise guest; bounded prior hardware observation:Xeon Platinum8473C/eight guest cores/16 logical processors/68,665,884,672 bytes RAM. BDN reports an unknown processor; no dedicated-machine, affinity or power-setting assumption.
- Actual source projects/tested references are used with DisableTransitiveFrameworkReferences:true; no mismatched installed ASP.NET framework fallback. Builds serialized at-m:2.

First FaultedUri repeatedly made new faulted tasks around the same mutable
exception, growing exception-dispatch stack state to6294525 B/op. The corrected
workload caches one faulted URI task per lifetime and adds host-only shutdown
profiles. This is a changed harness definition, not a source optimization or
reason to reset the comparison budget. All first reports and exact four first
harness files are preserved in `harness-first` and `comparison-one-paired-outcomes.json`.

Measured raw source/test/harness bytes are preserved exactly. Git source blobs
canonicalize CRLF to LF; `committed-source-identity.json` proves this is the only
difference from measured text. Separate default/committed blobs are included;
raw equality is not falsely asserted.

## All corrected paired outcomes

Negative time change means proposed faster. Entries show comparisons2/3 in that
order; median is the average of those two paired percentages, not a ratio of
averaged means. Shutdown prepares completed requests outside timing and measures
one real StopApplication per sample. All controls and non-wins remain visible.

| Case | Before ns/op (2 / 3) | After ns/op (2 / 3) | Time change % (2 / 3) | Median % | B/op before->after (2 / 3) | Max CV % |
|---|---:|---:|---:|---:|---:|---:|
| `Request/EmptyHttp` | 306185.42 / 300751.12 | 297854.13 / 298989.92 | -2.72 / -0.59 | -1.65 | 6062->5984 / 6060->5991 | 9.69 |
| `Request/FactoryThrows` | 4380.55 / 4475.01 | 5502.53 / 5604.81 | 25.61 / 25.25 | 25.43 | 1944->1944 / 1944->1944 | 27.83 |
| `Request/FaultedUri` | 8458.94 / 8562.24 | 8841.68 / 8795.74 | 4.52 / 2.73 | 3.63 | 3808->3728 / 3808->3728 | 3.73 |
| `Request/Http200` | 237263.28 / 163954.04 | 165018.93 / 211832.78 | -30.45 / 29.20 | -0.62 | 6376->6297 / 6373->6297 | 14.06 |
| `Request/Http200UncancelableRequest` | 177549.07 / 162276.52 | 163089.02 / 160373.66 | -8.14 / -1.17 | -4.66 | 6208->6145 / 6206->6143 | 6.88 |
| `Request/Http404` | 170830.35 / 165449.64 | 163431.03 / 173495.57 | -4.33 / 4.86 | 0.27 | 6397->6333 / 6406->6332 | 10.85 |
| `Stop/FactoryThrows/N0` | 4587.50 / 3237.50 | 6487.50 / 3600.00 | 41.42 / 11.20 | 26.31 | 5664->6000 / 0->0 | 98.65 |
| `Stop/FactoryThrows/N1` | 3475.00 / 3387.50 | 3450.00 / 2362.50 | -0.72 / -30.26 | -15.49 | 360->2016 / 6000->6024 | 30.83 |
| `Stop/FactoryThrows/N32` | 2212.50 / 2737.50 | 2912.50 / 2375.00 | 31.64 / -13.24 | 9.20 | 2688->360 / 6024->0 | 58.94 |
| `Stop/FactoryThrows/N1024` | 3612.50 / 3600.00 | 4450.00 / 4600.00 | 23.18 / 27.78 | 25.48 | 6024->0 / 1344->360 | 28.09 |
| `Stop/FaultedUri/N0` | 2750.00 / 2475.00 | 3337.50 / 2612.50 | 21.36 / 5.56 | 13.46 | 5600->560 / 5664->0 | 32.89 |
| `Stop/FaultedUri/N1` | 3400.00 / 4087.50 | 3087.50 / 2625.00 | -9.19 / -35.78 | -22.49 | 6024->5664 / 0->5664 | 33.88 |
| `Stop/FaultedUri/N32` | 6962.50 / 6587.50 | 3450.00 / 3037.50 | -50.45 / -53.89 | -52.17 | 5688->2688 / 384->24 | 30.53 |
| `Stop/FaultedUri/N1024` | 50650.00 / 56087.50 | 5100.00 / 6650.00 | -89.93 / -88.14 | -89.04 | 6024->6000 / 2976->6024 | 46.51 |
| `Stop/Http200/N0` | 2562.50 / 2687.50 | 2500.00 / 3137.50 | -2.44 / 16.74 | 7.15 | 5664->24 / 4056->2016 | 38.97 |
| `Stop/Http200/N1` | 2912.50 / 2850.00 | 6562.50 / 3850.00 | 125.32 / 35.09 | 80.20 | 2016->160 / 496->0 | 163.71 |
| `Stop/Http200/N32` | 11837.50 / 10687.50 | 3537.50 / 4362.50 | -70.12 / -59.18 | -64.65 | 24->24 / 0->360 | 27.26 |
| `Stop/Http200/N1024` | 86662.50 / 86050.00 | 3437.50 / 5287.50 | -96.03 / -93.86 | -94.94 | 0->136 / 24->0 | 49.95 |
| `Stop/Http200UncancelableRequest/N0` | 2575.00 / 2162.50 | 2300.00 / 4487.50 | -10.68 / 107.51 | 48.42 | 6024->0 / 0->6000 | 139.31 |
| `Stop/Http200UncancelableRequest/N1` | 2500.00 / 2737.50 | 2050.00 / 2612.50 | -18.00 / -4.57 | -11.28 | 2976->160 / 2488->160 | 106.17 |
| `Stop/Http200UncancelableRequest/N32` | 8212.50 / 6662.50 | 2575.00 / 2112.50 | -68.65 / -68.29 | -68.47 | 160->0 / 0->0 | 46.22 |
| `Stop/Http200UncancelableRequest/N1024` | 63112.50 / 71250.00 | 5662.50 / 2475.00 | -91.03 / -96.53 | -93.78 | 824->0 / 24->0 | 90.19 |
### Interpretation and non-wins

All six reached32/1024 stop profiles improve both corrected pairs. Median
reductions are52.17%/89.04% for FaultedUri,64.65%/94.94% for Http200,
68.47%/93.78% for host-only Http200. They measure one stopping signal after
prepared work, not full host/application shutdown or representative traffic.
Tiny stop samples have high CV (including163.71% in Http200/N1 and90.19% in
host-only/N1024); stop B/op can change even in genuinely untouched controls.
Those stop allocation differences are not credited to source cleanup.

Http200 request time changes-30.45% then+29.21%; Http404 also reverses.
Cached FaultedUri is slower in both pairs. Untouched FactoryThrows requests
slow about25% in both pairs with identical1944 B/op. Thus ordinary latency is
not established as a gain, despite the five reached request allocation pairs
being lower in both comparisons. All overhead and process/shared-machine drift
are retained, rather than using the first artifact or best latency result.

## Requirement coverage and actual tests

| Requirement | Evidence |
|---|---|
| Release on success, skipped/proxied404, URI-task failure, send cancellation/I/O/request exception and body-copy I/O failure | `PerformProxyRequest_DoesNotRetainRequestCancellationSource` rows Http200,Skipped404,Proxied404,BaseUriFailure,SendCanceled,SendIOException,SendHttpRequestException,CopyIOException assert exact result/body/exception before the real BCL request-source weak assertion. All eight independently original-red and proposed/final-green. |
| Keep linkage through pending body copy, then dispose on success or I/O completion without canceling caller parents | `PerformProxyRequest_KeepsCancellationLinkedUntilResponseCopyCompletes(false/true)` reaches an observable async Stream gate, verifies pending linkage/nondefault registration, then default registration after completion and no later parent-to-child cancellation. Both post-copy assertions original-red; both final-green. |
| Either real parent still cancels pending response copy, without canceling the other parent | `PerformProxyRequest_CancelsPendingResponseCopyFromEitherParent(false/true)` invokes the real BCL parent Cancel and observes actual WaitAsync cancellation/proxy completion/empty output. Both rows original/proposed/final-green. |
| Existing URI combination behavior | All eleven `PerformProxyRequest_TestUrlCombination` rows pass original/proposed/final. |
| Real public transport/WS lifetime and output contracts | Original public oracle and all four corrected post-comparison receipts match18 full records/24 workloads each, including real TCP HTTP/WS normal-close/host-stop/caller-Abort producer boundaries. |
| Exact source and owner isolation, budget, format and persistent publication | Final23/23 TRX, final shipping build/two scoped formats, raw source/owner identities, committed text proof,116-file measurement and101-file observer closures, all three pairs/six reproducible JSON derivations. |

| Actual phase | Passed | Failed | Meaning |
|---|---:|---:|---|
| Original restored class |11|0|Initial original command first failed NETSDK1004 before assertions; exact-project restore followed only then. |
| First added-test fixture |11|12|MemoryStream optimization bypassed async overrides; four gates timed out and CopyIOException missed its intended producer. Not faithful red evidence. |
| Corrected added tests/original owner |13|10|Stream wrapper reaches eight exact Assert.False and two post-copy Assert.Equal failures; every genuine row inspected. |
| Proposed owner |23|0|All10 genuine original-red rows individually green. |
| Final exact owner/source |23|0|All23 rows green, no skips; final loaded shipping DLL equals measured proposed owner. |

Total103 actual outcomes:81 pass/22 fail, with12 bad-fixture failures kept
distinct from10 genuine resource assertion failures. Component tests use the
existing test IVT and actual shipping owner, not a linked proxy copy or new IVT.
Moq's HTTP handler is a component seam, not transport proof. Stream gates are
observable with30-second failure bounds and no sleep.

Preparation-only compiler/reference/fixture corrections are retained in their
logs: initial missing assets, pattern-variable conflict, generator-reference
Roslyn conflict, obsolete web-host API and missing required ASP.NET framework.
The final new-manifest harness and diagnostic builds have zero warnings/errors.
None of those preparation failures is counted as a successful test or measurement.

## Exact final commands and results

Each direct .NET shell first runs `. .\activate.ps1` from the repository root.
The following actual final commands all exit0:23/23 tests, shipping build,
owner format and test format. Restore is not repeated after assets are present.

```powershell
dotnet test .\src\Middleware\Spa\SpaServices.Extensions\test\Microsoft.AspNetCore.SpaServices.Extensions.Tests.csproj -c Release --no-restore -m:2 --filter FullyQualifiedName~SpaProxyTests --logger 'trx;LogFileName=results.trx' --results-directory "$run\tests-final" -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false
dotnet build .\src\Middleware\Spa\SpaServices.Extensions\src\Microsoft.AspNetCore.SpaServices.Extensions.csproj -c Release --no-restore -m:2 -v minimal -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false
$env:UseIisNativeAssets='false'; $env:BuildNodeJS='false'; $env:CrossgenOutput='false'; $env:GenerateInstallers='false'
dotnet format whitespace .\src\Middleware\Spa\SpaServices.Extensions\src\Microsoft.AspNetCore.SpaServices.Extensions.csproj --no-restore --verify-no-changes --include 'src\Middleware\Spa\SpaServices.Extensions\src\Proxying\SpaProxy.cs' --verbosity quiet
dotnet format whitespace .\src\Middleware\Spa\SpaServices.Extensions\test\Microsoft.AspNetCore.SpaServices.Extensions.Tests.csproj --no-restore --verify-no-changes --include 'src\Middleware\Spa\SpaServices.Extensions\test\SpaProxyTests.cs' --verbosity quiet
```

Every actual benchmark launch exits0 (18 cases in comparison1,22 in comparisons2/3).
Both full reports/eight samples per case are required by the published summarizer.
The four corrected public/retention launches exit0; public contracts are exact,
while the two cold single-GC residuals explicitly remain nonzero observations.

```powershell
dotnet "$run\binaries\$snapshot\AutoPerf.Benchmarks.dll" --filter '*Proxy*Benchmark*' --inProcess --exporters json csv --artifacts "$run\round-$round-$variant" --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
dotnet "$run\binaries\$snapshot\AutoPerf.Benchmarks.dll" --verify-public-contracts "$run\round-$round-$variant\verify-public-contracts.json"
dotnet "$run\binaries\$snapshot\AutoPerf.Benchmarks.dll" --verify-retention "$run\round-$round-$variant\verify-retention.json"
dotnet "$run\diagnostic-binaries\$variant\AutoPerf.RetentionProbe.dll" $verifiedOwnerSha256 "$run\quiescence-$variant.json"
& "$assets\summarize.ps1" -RunRoot $assets
& "$assets\check-tests.ps1" -RunRoot $assets
```

Both independent diagnostic commands exit0 with18 rows/eight no-host-stop
checkpoints each. Both public derivation commands exit0 and reproduce all six
derived JSON files byte-identically after path/user redaction.
Historical coordinator scripts record the exact private run-folder layout;
use the full commands above or supply that layout, not literal redaction tokens.

## Reproduce using the actual owner

Use the baseline and source-commit checkouts separately, serializing builds.
Restore each checkout's local SDK/prerequisites only when missing, activate it,
then build the exact test project (original11 rows or proposed23) and this
`harness\AutoPerf.Benchmarks.csproj` with `-p:AspNetCoreRoot=<checkout-root>`,
the same Release/no-IIS/no-Node/no-crossgen/no-installers properties and-m:2.
Restore the new benchmark manifest before its first build.
The explicit tested-dependency guard prevents substituting an installed ASP.NET
framework. Use the exact corrected harness for both variants, freeze its entire
recursive DLL/JSON output, replace only the actual original/proposed SPA owner,
and verify the resulting owner-only closure before alternating the commands.
Do not rerun this campaign's already closed three-comparison budget.

Download this whole evidence directory; `summarize.ps1 -RunRoot` and
`check-tests.ps1 -RunRoot` require no benchmarks or shipping-source changes.
`provenance.json`, all manifests, raw contracts, checkpoints, TRX/logs and both
harness definitions are preserved. Separate raw/default/committed C# files keep
Git canonicalization distinct from measured bytes.

**Unverified boundaries:** browser/Node development-server workflows,
every runtime/architecture, NativeAOT, production throughput, full application
shutdown, universal normal latency or immediate cold single-GC collectability.
This fork-only draft is not an upstream submission or release approval.
