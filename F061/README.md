# F061: avoid per-header chunk-cookie prefix scans

**Disposition: qualified measured source proposal.** Three unchanged-source comparisons are closed.
Four large mixed/near-miss header profiles improve in every pair, with 53-69% lower
median time. All 38 cases that reach response-header filtering reduce measured
heap in every pair; both unreached empty-response controls retain identical heap.
This is not a universal/default-size or authentication-handler throughput claim:
default4050-byte chunk profiles reverse direction, and the first sorted case is volatile.

## Owner and preservation boundary

The shared `ChunkingCookieManager.DeleteCookie` builds an internally generated list
of base-name and contiguous numbered-chunk prefixes. Its original rejection predicate
runs `keys.Any(k => value.StartsWith(k, OrdinalIgnoreCase))` for every existing
response Set-Cookie value. The existing repository microbenchmark clears response
Set-Cookie after every operation: it never reaches this inner response-header scan.

The proposal retains the key-list construction, request chunk probes, locals,
domain-before-path branches, literal attribute substring matching, ordered retention,
expiration-array construction and response append. Its one changed invocation
uses a private allocation-free matcher for the common name plus either `=` or
canonical `C<positive decimal>=`, bounded by `keys.Count`, not the declared count.
The manual digit loop rejects leading zeros, signs, overflow, trailing NUL and
non-ASCII digits without normalizing caller-owned header names.

Two subtle original contracts are deliberately preserved:
the received `declared chunks + 1` probe enters the rejection list but does not
gain an emitted expiration entry; bulk deletion accepts an empty caller name or
one containing `=`, so the common name must not be split at the first equals.
Missing/empty chunks stop further matching. A null raw response value still throws
without replacing the original headers; using null-tolerant AsSpan alone would differ.
Existing options, UnixEpoch expiry, MaxAge removal and extension order remain intact.
There is no new public API, process-wide cache, IVT or cross-assembly access mechanism.

All three shipping consumers compile this shared file: public Authentication.Cookies
under `SECURITY`, and internal Mvc.Core/Components.Endpoints variants. All three
build on original, proposed and restored final source.
`CookieChunkingTests` in CookiePolicy.Test also compiles a linked internal copy.
That suite is useful preservation coverage, not proof that the public shipping owner
was loaded. The benchmark directly calls the actual public
`Microsoft.AspNetCore.Authentication.Cookies.ChunkingCookieManager`; its loaded
DLL/MVID/hash are checked in every benchmark and standalone verification process.

## Real producers and selected observable

Normal inputs are produced by actual AppendResponseCookie/ResponseCookies, parsed
with real SetCookieHeaderValue, then passed as a Cookie header to the real
RequestCookiesFeature during DeleteCookie. Inputs are immutable and each measured
operation creates a fresh DefaultHttpContext. The timed method includes request
cookie parsing, real DeleteCookie, full ordered response-header construction and
consumption; no copied shipping membership loop is timed.

All 40 original complete contracts pin the generated Set-Cookie input, requested
and actual chunk count, browser-style Cookie header, parsed request-cookie entries
and actual collection types, complete ordered initial/final Set-Cookie arrays,
error type/message and partial-header state. Thirty-four are normal producer-owned
profiles; six explicitly labelled caller header/name diagnostics keep raw malformed
inputs separate from normal appends.

Benchmark GlobalSetup verifies the same original contract twice, but does not emit
those receipts. After each measured pair, separate processes using the exact frozen
owners verify all 40 contracts twice and emit full receipts:
240 explicit post-measurement contract checks/480 repeated complete workloads.
These are outside timing, not falsely described as receipts inside the BDN process.
Original capture, pre-prototype checks and final live-owner checks are also retained.

This is a deterministic managed protocol boundary below browser acceptance:
no HTTP host, browser cookie jar, Blazor renderer/JS interop, external workflow,
application/authentication handler throughput, other runtime or Native AOT is claimed.

## Immutable inputs and comparison method

- Original default branch: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- Source/test proposal: [cb1597eb4c70bab9fc986d8a549fafb5962e1b05](https://github.com/jaslawinMs/aspnetcore/commit/cb1597eb4c70bab9fc986d8a549fafb5962e1b05), branch `autoperf/F061-cookie-deletion-prefix-matching`.
- Three serialized comparisons in A/B, B/A, A/B order; zero source tunes; no fourth comparison.
- Identical frozen harness/oracle/runtime/dependency JSON and recursive 92-file DLL/JSON closure; only `Microsoft.AspNetCore.Authentication.Cookies.dll` differs.
- 240 actual outcomes/120 paired ratios; all eight measurement samples and memory diagnostics retained per case.
- SDK `12.0.100-alpha.1.26557.102`, runtime `12.0.0-alpha.1.26562.105`, BenchmarkDotNet 0.13.0, C#13, in-process Short job, three warmups/eight measured iterations/100-ms iteration time, no outlier removal, concurrent server GC.
- Shared Windows 11 Enterprise10.0.26300 guest; Xeon Platinum8473C, eight guest cores/16 logical processors, 68,665,884,672 bytes RAM. BDN reports an unknown processor; bounded hardware metadata was captured after measurement.
- Builds use `-m:2`; no power, affinity, unrelated process or machine-setting changes.
- Most numbered profiles deliberately configure ChunkSize128 to expose scaling; long-name profiles use512. `DefaultSize*` uses the real default4050. Counts16/64 with128 extra headers are stress profiles, not assumed common browser workloads.
- The original test project/runtime dependency closure is used, not the installed ASP.NET shared framework. Both frozen owners and the final tested shipping DLL are hashed explicitly.

The source commit's Git blobs canonicalize CRLF to LF. `committed-source-identity.json`
proves this is the only difference from the measured text. Measured original/proposed/
mutation/test/harness bytes are preserved unchanged; separate committed/default
Git source blobs are included rather than rewriting the authoritative measured files.
The frozen manifests record pre-commit baseline37e809 plus the actual dirty-source hashes.

## All paired outcomes

Negative time change means the proposed owner was faster. Values are in actual round
order. Median is the middle of the three paired percentages, not a ratio of averages.
All time, heap, controls and maximum within-run CV values remain visible; complete
distributions/environment are in every raw JSON/CSV/Markdown/HTML/log export.

| Case | Before ns/op (1 / 2 / 3) | After ns/op (1 / 2 / 3) | Time change % (1 / 2 / 3) | Median % | B/op before->after (1 / 2 / 3) | Max CV % |
|---|---:|---:|---:|---:|---:|---:|
| `AlternateCase_Chunks16` | 22721.98 / 13587.36 / 25145.98 | 12720.38 / 11980.89 / 21393.81 | -44.02 / -11.82 / -14.92 | -14.92 | 14857->14561 / 14970->14561 / 14968->14505 | 56.91 |
| `CallerLooseAttributes_Chunks4` | 2748.33 / 2412.29 / 2449.27 | 2736.78 / 2396.06 / 2701.97 | -0.42 / -0.67 / 10.32 | -0.42 | 6456->6232 / 6400->6232 / 6400->6288 | 5.60 |
| `CallerMissingEquals_Chunks4` | 2699.04 / 2293.65 / 2313.05 | 3261.78 / 2211.72 / 2632.93 | 20.85 / -3.57 / 13.83 | 13.83 | 6008->5816 / 6008->5816 / 6008->5816 | 9.56 |
| `CallerNameEmpty` | 1148.66 / 1025.14 / 1041.98 | 1220.54 / 1029.08 / 1119.83 | 6.26 / 0.38 / 7.47 | 6.26 | 2912->2864 / 2912->2864 / 2912->2864 | 4.97 |
| `CallerNameEquals` | 1178.97 / 1060.99 / 1069.00 | 1247.60 / 1020.14 / 1191.73 | 5.82 / -3.85 / 11.48 | 5.82 | 2992->2944 / 2992->2944 / 2992->2944 | 6.58 |
| `CallerNullHeader` | 5191.93 / 5238.44 / 5031.89 | 5069.44 / 4952.45 / 5160.75 | -2.36 / -5.46 / 2.56 | -2.36 | 2632->2584 / 2632->2584 / 2632->2584 | 1.40 |
| `CallerNumericNoise_Chunks4` | 2679.87 / 2322.94 / 2466.82 | 2612.92 / 2223.88 / 2555.56 | -2.50 / -4.26 / 3.60 | -2.50 | 6008->5816 / 6008->5816 / 6008->5816 | 4.02 |
| `CanonicalSuffixNoise_Chunks4` | 2853.92 / 2563.62 / 2553.96 | 2682.93 / 2345.85 / 2684.20 | -5.99 / -8.49 / 5.10 | -5.99 | 6296->5984 / 6296->5984 / 6296->5984 | 3.50 |
| `DefaultSize_Chunks4` | 8086.04 / 6439.45 / 6254.84 | 8914.60 / 6205.15 / 8269.08 | 10.25 / -3.64 / 32.20 | 10.25 | 37137->37017 / 37136->37016 / 37136->37017 | 7.21 |
| `DefaultSizeMixed16_Chunks16` | 31175.25 / 24107.91 / 24324.65 | 31813.42 / 22347.75 / 30876.49 | 2.05 / -7.30 / 26.93 | 2.05 | 141546->140754 / 141546->140754 / 141545->140754 | 7.37 |
| `Domain_Chunks16` | 7403.52 / 6506.95 / 6478.44 | 6934.23 / 6004.18 / 6668.95 | -6.34 / -7.73 / 2.94 | -6.34 | 16152->15688 / 16096->15688 / 16096->15744 | 4.85 |
| `Domain_Chunks4` | 2560.24 / 2382.56 / 2354.28 | 2674.12 / 2309.15 / 2510.24 | 4.45 / -3.08 / 6.62 | 4.45 | 6232->6056 / 6176->6056 / 6176->6112 | 7.99 |
| `DomainBeforePath_Chunks4` | 2779.73 / 2493.17 / 2432.82 | 2828.50 / 2356.93 / 2761.10 | 1.75 / -5.46 / 13.49 | 1.75 | 6464->6264 / 6408->6264 / 6408->6320 | 3.86 |
| `DomainMismatch_Chunks4` | 2811.12 / 2551.17 / 2524.67 | 2874.46 / 2459.83 / 2917.66 | 2.25 / -3.58 / 15.57 | 2.25 | 6584->6384 / 6528->6384 / 6528->6440 | 7.08 |
| `EmptyMiddle_Chunks4` | 1873.89 / 1784.07 / 1854.99 | 2026.87 / 1758.33 / 1888.42 | 8.16 / -1.44 / 1.80 | 1.80 | 4408->4288 / 4408->4288 / 4408->4288 | 5.70 |
| `EmptyResponse_Base` | 1125.68 / 1046.06 / 1058.74 | 1252.28 / 1008.63 / 1006.40 | 11.25 / -3.58 / -4.94 | -3.58 | 3048->3048 / 3048->3048 / 3048->3048 | 9.54 |
| `EmptyResponse_Chunks4` | 2187.91 / 1969.69 / 2145.57 | 2310.89 / 1942.36 / 1880.61 | 5.62 / -1.39 / -12.35 | -1.39 | 5592->5592 / 5592->5592 / 5592->5592 | 5.48 |
| `ExtraProbe_Chunks4` | 2549.18 / 2274.52 / 2463.44 | 2602.22 / 2200.91 / 2083.02 | 2.08 / -3.24 / -15.44 | -3.24 | 5912->5768 / 5912->5768 / 5912->5768 | 2.85 |
| `LongName_Chunks16` | 17669.59 / 15874.42 / 16272.38 | 16387.03 / 14053.81 / 12956.54 | -7.26 / -11.47 / -20.38 | -11.47 | 48089->47681 / 48089->47681 / 48089->47681 | 6.85 |
| `LongNameMixed128_Chunks64` | 91120.82 / 84484.84 / 87907.19 | 64117.98 / 51045.99 / 48518.22 | -29.63 / -39.58 / -44.81 | -39.58 | 188662->184028 / 188661->184027 / 188662->184027 | 7.20 |
| `MissingFirst_Chunks4` | 1795.34 / 1787.96 / 1901.42 | 1844.72 / 1588.38 / 1802.44 | 2.75 / -11.16 / -5.21 | -5.21 | 4008->3888 / 4008->3888 / 4008->3888 | 4.60 |
| `MissingMiddle_Chunks4` | 1900.91 / 1807.59 / 2044.92 | 1981.76 / 1715.35 / 1765.68 | 4.25 / -5.10 / -13.66 | -5.10 | 4408->4288 / 4408->4288 / 4408->4288 | 4.82 |
| `Mixed128_Chunks16` | 18411.32 / 16622.44 / 17584.04 | 8749.23 / 7789.79 / 7461.64 | -52.48 / -53.14 / -57.57 | -53.14 | 22321->18840 / 22321->18840 / 22321->18840 | 5.21 |
| `Mixed128_Chunks64` | 72705.50 / 60124.68 / 61763.64 | 21497.08 / 20293.63 / 19934.18 | -70.43 / -66.25 / -67.73 | -67.73 | 59045->54409 / 59044->54409 / 59044->54409 | 4.43 |
| `Mixed16_Chunks4` | 3117.02 / 2870.84 / 3336.13 | 2729.03 / 2533.29 / 2351.33 | -12.45 / -11.76 / -29.52 | -12.45 | 6768->6264 / 6768->6264 / 6768->6264 | 6.30 |
| `NameEndingC1_Chunks4` | 2327.53 / 2129.70 / 2600.54 | 2116.85 / 2080.50 / 2009.86 | -9.05 / -2.31 / -22.71 | -9.05 | 5792->5672 / 5792->5672 / 5792->5672 | 4.31 |
| `NearMiss128_Chunks16` | 19675.42 / 18016.17 / 19420.60 | 7529.98 / 7576.32 / 7788.21 | -61.73 / -57.95 / -59.90 | -59.90 | 22321->18840 / 22321->18840 / 22321->18840 | 4.69 |
| `NearMiss128_Chunks64` | 74700.06 / 62836.68 / 66049.73 | 19980.99 / 20118.69 / 20437.30 | -73.25 / -67.98 / -69.06 | -69.06 | 59045->54409 / 59044->54409 / 59044->54409 | 4.75 |
| `NearMiss16_Chunks4` | 3210.70 / 2966.49 / 3398.04 | 2527.61 / 2439.68 / 2420.81 | -21.28 / -17.76 / -28.76 | -21.28 | 6768->6264 / 6768->6264 / 6768->6264 | 3.96 |
| `Path_Chunks16` | 7269.31 / 6600.66 / 7656.26 | 5885.95 / 6053.09 / 5852.54 | -19.03 / -8.30 / -23.56 | -19.03 | 15776->15368 / 15776->15368 / 15776->15368 | 4.87 |
| `Path_Chunks4` | 2636.73 / 2306.92 / 2751.53 | 2343.43 / 2199.52 / 2646.82 | -11.12 / -4.66 / -3.81 | -4.66 | 6088->5968 / 6088->5968 / 6088->5968 | 12.46 |
| `PathMismatch_Chunks4` | 2764.57 / 2510.59 / 2924.03 | 2462.46 / 2384.29 / 2483.66 | -10.93 / -5.03 / -15.06 | -10.93 | 6440->6296 / 6440->6296 / 6440->6296 | 3.40 |
| `Related_Base` | 1277.46 / 1125.77 / 1263.58 | 1127.84 / 1086.28 / 1062.86 | -11.71 / -3.51 / -15.88 | -11.71 | 3104->3080 / 3104->3080 / 3104->3080 | 5.98 |
| `Related_Chunks16` | 6918.09 / 6408.34 / 7033.36 | 5599.19 / 5572.83 / 5536.82 | -19.06 / -13.04 / -21.28 | -19.06 | 14856->14448 / 14856->14448 / 14856->14448 | 3.86 |
| `Related_Chunks2` | 1674.16 / 1699.02 / 1909.77 | 1659.28 / 1566.23 / 1517.35 | -0.89 / -7.82 / -20.55 | -7.82 | 4408->4336 / 4408->4336 / 4408->4336 | 6.86 |
| `Related_Chunks4` | 2318.43 / 2216.43 / 2553.15 | 2216.90 / 2063.26 / 2022.87 | -4.38 / -6.91 / -20.77 | -6.91 | 5744->5624 / 5744->5624 / 5744->5624 | 8.01 |
| `Related_Chunks64` | 29432.98 / 27528.79 / 29772.09 | 18296.44 / 17526.89 / 17366.42 | -37.84 / -36.33 / -41.67 | -37.84 | 51194->49633 / 51194->49633 / 51194->49633 | 3.91 |
| `Unrelated1_Base` | 1266.33 / 1181.52 / 1647.35 | 1182.62 / 1154.43 / 1134.36 | -6.61 / -2.29 / -31.14 | -6.61 | 3232->3208 / 3232->3208 / 3232->3208 | 8.88 |
| `Unrelated128_Base` | 4292.29 / 3905.68 / 4594.17 | 3292.75 / 3067.04 / 2944.44 | -23.29 / -21.47 / -35.91 | -23.29 | 10416->7344 / 10416->7344 / 10416->7344 | 6.01 |
| `Unrelated16_Base` | 1756.04 / 1612.79 / 1968.25 | 1476.33 / 1440.51 / 1438.70 | -15.93 / -10.68 / -26.90 | -15.93 | 4072->3688 / 4072->3688 / 4072->3688 | 8.72 |
### Interpretation and non-wins

`Mixed128_Chunks16`, `Mixed128_Chunks64`, `NearMiss128_Chunks16` and
`NearMiss128_Chunks64` improve in every pair: medians -53.14%, -67.73%,
-59.90% and -69.06%, with maximum CV at most5.21%. LongNameMixed128_Chunks64
has a -39.58% median. These are high-header/configurable-small-chunk observations.
21 of32 normal reached profiles are faster in all three pairs, not all profiles.

`DefaultSize_Chunks4` is mixed: +10.25%, -3.64%, +32.20% (median+10.25%).
`DefaultSizeMixed16_Chunks16` is also mixed: +2.05%, -7.30%, +26.93%
(median+2.05%). No default chunk-size speedup is established; the slower rows
are retained as material limits, not hidden behind the larger gains.

The first sorted `AlternateCase_Chunks16` has56.91% maximum CV; its first before
samples progressively change from42.91us to8.73us. Its three pair ratios are
-44.02%, -11.82%, -14.92%, not evidence that the whole14.92% median is caused by
the matcher. The two untouched empty-response controls also reverse direction,
including first-pair+11.25% and+5.62%; runtime/process/shared-machine effects
qualify small-case attribution. Ordinary/domain/caller diagnostics include
mixed and slower observations, all kept above.

All114 reached heap pairs decrease; all six empty-response heap pairs are exact
matches. Large mixed16 profiles save3481B/op; mixed64 save4635-4636B/op, while
the one-unrelated/base case saves24B/op. This establishes the observed per-header
allocation benefit at this owner boundary, not a universal per-header byte formula
or a claim about downstream handler/browser allocations.

## Requirement coverage and actual preservation tests

The original linked-source class passes13/13. Thirteen focused rows in the existing
class extend it to26/26 on original, proposed and exact restored final source.
These are preservation tests: they pass the original code, not falsely claimed
original functional red tests. Performance is established by the measured A/B owners.

An unmeasured permissive matcher intentionally splits names at the first equals,
normalizes numeric suffixes through TryParse and incorrectly bounds by the declared
expiration count. Exactly four reached Assert.Equal header assertions fail:
LeadingZero, TrailingNul, extra received chunk and the name containing equals.
All22 other rows pass. Restoring the exact measured matcher returns26/26 to green
and the actual final shipping/test/harness owner hash matches the frozen after DLL.

| Requirement | Evidence |
|---|---|
| Real chunk producer, request parser and complete ordered protocol/error output |34 normal append-produced profiles and six labelled diagnostics; `contract-oracles.json`, all240 explicit post-measurement receipts in `setup-correctness.json`; actual public shipping owner checked. |
| Canonical numbering, leading zeros/signs/overflow/trailing NUL and missing delimiter | `CookieChunkingTests.DeleteChunkedCookieWithNonCanonicalResponseName_RetainsCookie(caseId: "LeadingZero"/"PlusSign"/"Overflow"/"TrailingNul"/"MissingEquals")`; all five rows pass original/prototype/final; LeadingZero/TrailingNul reach expected unsafe-mutation failures. |
| Received declared-count+1 chunk removed without additional expiration entry | `CookieChunkingTests.DeleteChunkedCookieWithExtraRequestChunk_RemovesExtraResponseCookie`; actual append/parser producer; passes original/prototype/final and fails unsafe bound; `ExtraProbe_Chunks4` complete shipping-owner contract. |
| Missing/empty request chunk retains later existing response chunks | `CookieChunkingTests.DeleteChunkedCookieWithMissingOrEmptyFirstChunk_RetainsResponseChunks(empty: false/true)`; both pass, using generated chunks and actual parser; MissingFirst/MissingMiddle/EmptyMiddle shipping-owner cases also retain exact output. |
| Empty/equals-containing caller name matches complete prefix | `CookieChunkingTests.DeleteCookieWithUnusualName_MatchesCompletePrefix(key: ""/"Test=Cookie")`; both pass; equals row rejects the unsafe first-delimiter matcher; caller-owned input explicitly labelled. |
| Null response value retains original throw and partial headers | `CookieChunkingTests.DeleteCookieWithNullResponseHeader_DoesNotReplaceHeaders`; original/prototype/final pass; actual caller-header error/state contract retained. |
| Domain-before-path precedence | `CookieChunkingTests.DeleteCookieWithDomainAndDifferentPath_UsesDomainFirst`; passes; DomainBeforePath/DomainMismatch/PathMismatch/CallerLooseAttributes preserve the original literal matching, not stricter parsed semantics. |
| Ordinal-ignore-case base/chunk names | `CookieChunkingTests.DeleteChunkedCookieWithDifferentResponseCase_RemovesCookies`; passes; AlternateCase shipping-owner contract also matches. |
| Correct owner/three consumers, full comparison budget and reproducible output | All three shared consumers build in every source phase;92 recursive DLL/JSON hashes; six complete BDN launches;117 actual TRX rows; scoped format exit0; all five public derived JSON files reproduce byte-identically. |

| Actual phase | Result | Evidence |
|---|---|---|
| First original test attempt | NETSDK1004 missing assets; no tests reached | `test-before.log`; restore only after this actual failure. |
| Original after restore |13 passed, none skipped/failed | `test-before-restored.log`, `tests-before/results.trx`. |
| Original plus preservation rows |26 passed, none skipped/failed | `test-original-added.log`, `tests-original-added/results.trx`. |
| Proposed source |26 passed, none skipped/failed | `test-prototype.log`, `tests-prototype/results.trx`. |
| Deliberately unsafe matcher |22 passed/four expected reached header assertions | `test-unsafe-mutation.log`, `tests-unsafe-mutation/results.trx`, `unsafe-mutation-failures.json`. |
| Exact measured matcher restored |26 passed, none skipped/failed; formatting exit0 | `test-final.log`, `tests-final/results.trx`, `format-final.log`, `final-proof.json`. |

All five TRXs contain117 actual outcomes:113 pass/four expected mutation failures.
Every exact report-safe case identity and its discovered method/outcome/failure
reason is inspected; raw NUL input stays in data, not case names. No setup failure
or skipped row is treated as green coverage.

## Exact commands and results

From `C:\src\aspnetcore`, each direct .NET shell first activates `. .\activate.ps1`.
For `$phase` respectively before/original-added/prototype/unsafe-mutation/final,
the exact target invocation is below. Results are13 pass/26 pass/26 pass/
22 pass and four expected failures/26 pass. Initial before failed NETSDK1004,
then the recorded restore exited0 and actual13 rows passed.

```powershell
. .\activate.ps1
dotnet test .\src\Security\CookiePolicy\test\Microsoft.AspNetCore.CookiePolicy.Test.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --filter 'FullyQualifiedName~CookieChunkingTests' --logger 'trx;LogFileName=results.trx' --results-directory "$run\tests-$phase"
dotnet restore .\src\Security\CookiePolicy\test\Microsoft.AspNetCore.CookiePolicy.Test.csproj --disable-parallel -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false --verbosity quiet
dotnet format whitespace .\src\Security\CookiePolicy\test\Microsoft.AspNetCore.CookiePolicy.Test.csproj --include .\src\Shared\ChunkingCookieManager\ChunkingCookieManager.cs .\src\Security\CookiePolicy\test\CookieChunkingTests.cs --no-restore --verify-no-changes
```

Restore and scoped final formatting exit0. Original/proposed/final explicit
MVC and Components builds below each exit0; Authentication.Cookies builds
through the real test/harness project reference in each source phase.

```powershell
dotnet build .\src\Mvc\Mvc.Core\src\Microsoft.AspNetCore.Mvc.Core.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
dotnet build .\src\Components\Endpoints\src\Microsoft.AspNetCore.Components.Endpoints.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
dotnet restore "$run\harness\AutoPerf.Benchmarks.csproj" --disable-parallel -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false --verbosity quiet
dotnet build "$run\harness\AutoPerf.Benchmarks.csproj" -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
```

The new-manifest harness restore exits0. All harness builds exit0; final build has
no warnings/errors. Every actual benchmark is `dotnet` plus its full argument array
in `execution.json`, all six processes exit0 with40 measured cases/eight samples:

```powershell
dotnet "$run\binaries\$variant\AutoPerf.Benchmarks.dll" --filter '*CookieDeleteBenchmark*' --inProcess --exporters json csv --artifacts "$run\round-$round-$variant" --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
dotnet "$run\binaries\$variant\AutoPerf.Benchmarks.dll" --verify-setups
```

Each separate post-measurement invocation exits0 and verifies40 original contracts
twice. It runs after its pair, not inside measurement; its actual timing/arguments
are in the corresponding `verification-execution.json`.

### Reproduction and public derivation

Build/run the repository's CookiePolicy.Test Release target first; its tested
current-repo shipping dependency closure is an explicit harness prerequisite.
Use the repository-pinned SDK and `-p:AspNetCoreRoot=C:\src\aspnetcore` if needed.
Capture original contracts once with `--capture-oracles`, then freeze the complete
original output. Replace only the built proposed Authentication.Cookies owner,
retaining the identical original harness/oracle/dependency/runtime configuration
and recursive non-owner DLL/JSON bytes. All three source consumers must build.
Do not compare separately compiled harnesses or silently load installed ASP.NET.
Private binaries are retained locally, not published; rebuild them for reproduction.

```powershell
# $assets is the downloaded F061 evidence directory.
& "$assets\summarize.ps1" -RunRoot $assets
& "$assets\check-tests.ps1" -RunRoot $assets
```

Both commands exit0 against the exported public assets and reproduce all five
derived JSON files byte-identically. Source C#/csproj bytes remain unchanged.
Only personal session paths/computer/run identifiers in textual logs/JSON/TRX
are redacted; TRX uses XML-safe tokens. Empty logs are retained.

## History and preparation corrections

Prior dotnet/aspnetcore#31508/#31625 removed outer LINQ enumeration and grouped
expiration appends in2021, not the retained inner prefix scan. Current source
also preserves the later MaxAge-null fix. Original bounded history/PR patches
and candidate search are included; five matches are not an exhaustive absence claim.
Public DeleteCookie documentation:
https://learn.microsoft.com/dotnet/api/microsoft.aspnetcore.authentication.cookies.chunkingcookiemanager.deletecookie?view=aspnetcore-10.0

The first original diagnostic capture incorrectly expected an empty/equals name
to throw. Actual bulk DeleteCookie accepted both; the harness expectation was
corrected before freezing/measuring, and the failure log is retained. The final
40-case corpus also adds raw numeric/NUL diagnostics before the first pair.
An original-added report-consumer typo failed after the actual26-row test run
passed; the unchanged TRX was parsed correctly without rerunning tests.
A post-verification script interpolation typo prevented launch of the next pair;
it was corrected without changing measurement inputs or consuming a comparison.
An initial raw Git-byte check encountered ordinary CRLF/LF canonicalization;
the final explicit identity proof includes both raw versions rather than asserting
false byte equality. No shipping/proposed-source tune or raw measurement rewrite
was made for these preparation/report corrections.
