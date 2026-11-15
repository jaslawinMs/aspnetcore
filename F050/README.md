# F050: avoid numeric quality exceptions in Accept parsing

**Measured malformed-input tradeoff draft, not a universal net-performance win.**
Actual request-header `DefaultOutputFormatterSelector` is **94.73% faster for32**
invalid numeric-quality values followed by valid `text/plain`, **91.77% faster
for8**, and **83.29% faster for mixed-eight input** in the final paired means.
The32-value selection saves14596 B/op (16060 to1464); mixed-eight saves1825 B/op.
All17 malformed-quality parser/selector targets are faster and allocate less.

**Retained costs:** all seven public factory controls are slower. Valid public
cases are8.73-25.28% slower (about9-14ns for the shown tiny operations).
Public invalid quality is16.23% slower and adds168 B/op (456 to624), despite
identical observed exception type/message. Public empty-quality-at-end is
6.30% slower with unchanged heap. The complete control table is below.
Review is needed to decide whether that tradeoff is acceptable.

All three permitted comparisons are consumed. Only **round3**, the final
source and corrected diagnostic checksum harness, supports final claims.
Rounds1/2 retain different rejected source shapes and the initial observer.
No fourth comparison or retrospective artifact replacement.

Originating issue: https://github.com/jaslawinMs/aspnetcore/issues/50. Source [d16c7fc5d6fbcfaebac99940070f123b67fd5ddf](https://github.com/jaslawinMs/aspnetcore/commit/d16c7fc5d6fbcfaebac99940070f123b67fd5ddf), independent branch `autoperf/F050-accept-header-parse-without-exception`.
Fresh upstream baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.

## Actual production seam and compatibility

`AcceptHeaderParser.TryParseValue` already ignores unparseable media types,
catches parser exceptions, and recovers at the next comma. Its media-type
factory calls `double.Parse(parameter.Value.AsSpan(), AllowDecimalPoint,
InvariantInfo)` for numeric `q` values. Six real-parser rows prove that
malformed numeric values produce one actual first-chance `FormatException`
while the subsequent `text/plain` value is preserved. Malformed type/subtype
syntax often already returns default; it is not all an exception path.

The [exact three-file diff](source.patch) shares the existing media-type
parameter parser through an internal overload using `double.TryParse` with the
same style/provider. On numeric failure it returns default and the invalid
`StringSegment` as nullable out data. The Accept helper discards that error
data and keeps the original recovery/catch/locals/branch structure.

The public factory uses the same core and still runs `double.Parse` on the
failed numeric segment to preserve its public exception details.
An empty numeric segment before a comma is a *non-null nullable containing a
default StringSegment*, not "no numeric error". Public `q=` at the end throws
`ArgumentOutOfRangeException` with parameter `index` before numeric parsing.
That syntax/index fallback is deliberately retained, including in Accept
selection; this is not a no-exceptions-for-every-invalid-header claim.

Quoted quality, duplicate-valid-q last-wins, invalid-earlier-q rejection,
out-of-range numeric quality and nonfinite values retain original outcomes.
No new RFC range restriction, public API signature/default, duplicate parser,
cross-assembly private-access mechanism, logging or exception suppression.
The original broad catch is neither removed nor expanded.

[Owner history](owner-history.log) and the bounded existing-PR query are
retained. The inspected [dotnet/aspnetcore#70166 patches](existing-pr70166-relevant-patches.log)
optimize StringValues boxing/list growth/formatter enumeration, not this
numeric-quality exception seam. This is not exhaustive duplicate proof.

## Faithful producer/consumer and immutable experiments

Both pinned benchmark projects fix39 uniquely identifiable cases.
The internal actual source-built Accept parser is reached through a cached
delegate whose reflection binding occurs only during setup. No parser copy
or per-operation reflection. Actual `DefaultOutputFormatterSelector` consumes
fresh `DefaultHttpContext.Request.Headers.Accept`, with real
`StringOutputFormatter` and `SystemTextJsonOutputFormatter`, actual quality
ordering, browser wildcard options and unsupported-result fallback.
Each selector invocation creates a fresh request/formatter context.
Response serialization and network delivery are not measured.

Public factory controls use its real shipped signature. Workload construction,
input generation, oracle hashing and checks are outside timing. Timed parsing
includes list creation and result consumption; selection includes context,
headers, actual negotiation and content-type checksum. Final list consumption
uses an index loop to avoid observer interface-enumerator boxing.

[Initial oracles](contract-oracles.json) and
[final original-owner oracles](contract-oracles-final.json) retain exact headers,
media-type buffer identities/offsets/lengths/quality bits, selected formatter,
content-type/server-defined flag, checksum and real thread-filtered first-chance
exceptions. The final oracle additionally preserves exact measured public
exception messages/parameters. Every one of234 measured setup receipts matches
the corresponding original material output; the17 affected non-public cases
have zero numeric `FormatException`s after each experiment.
The public throwing and empty-at-end error partitions remain unchanged.
No callback is injected to manufacture the disputed exception.

The loaded Mvc.Core path/MVID is checked against the actual PE module.
Three complete75-file recursive DLL/JSON inventories differ **only in
Mvc.Core within each pair**:
[round1](assembly-hashes.json), [round2](assembly-hashes-after-2.json),
[final](assembly-hashes-after-3.json).

Rounds1/2 reuse the identical initial harness DLL/PDB/runtime/deps.
Final `before-final` reuses the exact initial original Mvc.Core DLL/PDB with
the byte-identical final harness/runtime/deps/other assemblies from `after-3`.
Its manifest identifies that reuse, not a fresh build of current proposed
source. Original source snapshots/hashes and both harness revisions are
preserved. No binary/PDB/bin/obj is published.

## Final source and final harness: all39 outcomes, round3 only

Each case has eight observations, three warmups,100ms iteration time and
`DontRemove` outliers. One final comparison is a paired mean-ratio result,
not repeatability across final-source launches, significance, or production
throughput. Negative percentage means faster. All controls/CVs remain visible.

| Case | Time change% | Before ns/op | After ns/op | Before B/op | After B/op | Max CV% |
|---|---:|---:|---:|---:|---:|---:|
| Parse_AllInvalid_8 | -95.72 | 17128.18 | 732.32 | 3680.00 | 32.00 | 1.05 |
| Parse_DuplicateInvalidFirst | -91.93 | 2270.13 | 183.17 | 608.00 | 152.00 | 1.10 |
| Parse_DuplicateInvalidLast | -90.18 | 2406.09 | 236.32 | 608.00 | 152.00 | 1.36 |
| Parse_DuplicateValid | 1.17 | 210.65 | 213.12 | 152.00 | 152.00 | 3.86 |
| Parse_EmptyQuality_Comma | -92.33 | 2291.69 | 175.85 | 568.00 | 152.00 | 1.19 |
| Parse_EmptyQuality_End | -2.10 | 4242.91 | 4153.62 | 976.00 | 976.00 | 1.35 |
| Parse_Invalid_1 | -92.08 | 2306.96 | 182.70 | 608.00 | 152.00 | 2.82 |
| Parse_Invalid_32 | -95.73 | 68216.63 | 2914.78 | 14747.00 | 152.00 | 1.12 |
| Parse_Invalid_8 | -95.21 | 17220.91 | 825.00 | 3801.00 | 152.00 | 1.74 |
| Parse_InvalidEnd | -95.70 | 2165.04 | 93.07 | 488.00 | 32.00 | 1.59 |
| Parse_Mixed_8 | -90.70 | 9255.61 | 861.19 | 1977.00 | 152.00 | 0.84 |
| Parse_MultipleHeaders | -90.14 | 2377.20 | 234.44 | 608.00 | 152.00 | 1.26 |
| Parse_Nonfinite | -1.03 | 264.38 | 261.67 | 152.00 | 152.00 | 1.81 |
| Parse_OutOfRange | 4.72 | 152.49 | 159.69 | 152.00 | 152.00 | 3.40 |
| Parse_QuotedInvalid | -90.81 | 2333.47 | 214.42 | 608.00 | 152.00 | 2.94 |
| Parse_QuotedValid | -1.53 | 174.85 | 172.17 | 152.00 | 152.00 | 2.13 |
| Parse_Valid_1 | 2.03 | 96.58 | 98.53 | 152.00 | 152.00 | 4.63 |
| Parse_Valid_8 | -1.06 | 1049.13 | 1038.05 | 368.00 | 368.00 | 0.78 |
| Public_DuplicateQuality | 8.73 | 148.91 | 161.91 | 0.00 | 0.00 | 2.19 |
| Public_EmptyQualityEnd | 6.30 | 4228.74 | 4495.22 | 944.00 | 944.00 | 0.97 |
| Public_InvalidQuality | 16.23 | 2107.13 | 2449.20 | 456.00 | 624.00 | 1.08 |
| Public_OutOfRange | 9.08 | 95.44 | 104.11 | 0.00 | 0.00 | 0.51 |
| Public_QuotedQuality | 12.93 | 109.63 | 123.80 | 0.00 | 0.00 | 0.83 |
| Public_ValidPlain | 25.28 | 36.02 | 45.13 | 0.00 | 0.00 | 0.89 |
| Public_ValidQuality | 10.77 | 94.24 | 104.39 | 0.00 | 0.00 | 0.53 |
| Selector_AllInvalid_8 | -93.16 | 17796.17 | 1217.10 | 5033.00 | 1384.00 | 1.27 |
| Selector_BrowserIgnore | -1.04 | 840.19 | 831.43 | 1504.00 | 1504.00 | 5.32 |
| Selector_BrowserRespect | -2.19 | 1148.82 | 1123.63 | 1464.00 | 1464.00 | 3.06 |
| Selector_EmptyQualityEnd | -5.24 | 5133.05 | 4864.15 | 2328.00 | 2328.00 | 10.82 |
| Selector_Invalid_1 | -73.23 | 3173.63 | 849.50 | 1920.00 | 1464.00 | 8.21 |
| Selector_Invalid_32 | -94.73 | 69093.15 | 3640.69 | 16060.00 | 1464.00 | 1.00 |
| Selector_Invalid_8 | -91.77 | 18047.46 | 1486.18 | 5113.00 | 1464.00 | 1.21 |
| Selector_Mixed_8 | -83.29 | 10282.65 | 1718.38 | 3289.00 | 1464.00 | 1.26 |
| Selector_MultipleHeaders | -70.71 | 3219.21 | 942.91 | 1920.00 | 1464.00 | 3.39 |
| Selector_UnsupportedReturn406 | 7.31 | 953.21 | 1022.88 | 1464.00 | 1464.00 | 5.63 |
| Selector_ValidJson | -3.48 | 864.71 | 834.59 | 1464.00 | 1464.00 | 5.74 |
| Selector_ValidQuality | 2.52 | 1193.64 | 1223.70 | 1464.00 | 1464.00 | 6.39 |
| Selector_ValidText | 2.05 | 713.72 | 728.36 | 1464.00 | 1464.00 | 2.79 |
| Selector_ZeroQuality | -0.49 | 957.60 | 952.89 | 1464.00 | 1464.00 | 7.29 |

Eleven direct parser targets improve90.14-95.73%; six actual selector targets
improve70.71-94.73%. A single ordinary malformed numeric value saves456 B/op;
an empty numeric value before a comma saves416 B/op. Most valid/other controls
keep heap, with small mixed time directions. Parse_OutOfRange is+4.72%;
Selector_UnsupportedReturn406 is+7.31%/CV5.63%.
Selector_EmptyQualityEnd is-5.24% but CV10.82%; no attribution.

Public_ValidPlain is36.02 to45.13ns (+25.28%), Public_ValidQuality94.24 to
104.39ns (+10.77%), Public_QuotedQuality109.63 to123.80ns (+12.93%),
and Public_DuplicateQuality+8.73%. Public invalid quality is2107.13 to2449.20ns
(+16.23%) and456 to624 B. Low measured CV does not erase those costs.
No frame/JIT/allocation-cause attribution is asserted.

## Discarded source shapes and initial observer

Round1 used a throwing/nonthrowing Boolean overload, then round2 added an
AggressiveInlining annotation on that new helper. The hint was rejected:
public valid controls became21.58-30.35% slower. It restored the public invalid
control to456 B, but some direct parser observations added56 B, matching a
potential boxed List enumerator in the initial interface-foreach observer.
That cause was not proved by JIT/native analysis. The final observer therefore
uses an index loop, with its own immutable harness snapshots. Only final
round3 supports final parser-allocation claims.

Both rejected source shapes and all78 outcomes from each are retained.
The first Boolean shape, hinted shape and final out-segment shape have separate
source snapshots; no "all-pair median" combines those implementations.

<details><summary>Discarded round1: all39 initial-harness outcomes</summary>

| Case | Time change% | Before B/op | After B/op | Max CV% |
|---|---:|---:|---:|---:|
| Parse_AllInvalid_8 | -87.24 | 5025.00 | 32.00 | 32.34 |
| Parse_DuplicateInvalidFirst | -92.03 | 608.00 | 152.00 | 1.16 |
| Parse_DuplicateInvalidLast | -89.87 | 608.00 | 152.00 | 1.09 |
| Parse_DuplicateValid | -0.97 | 152.00 | 152.00 | 3.30 |
| Parse_EmptyQuality_Comma | -92.29 | 568.00 | 152.00 | 0.90 |
| Parse_EmptyQuality_End | -0.14 | 976.00 | 976.00 | 1.20 |
| Parse_Invalid_1 | -92.24 | 608.00 | 152.00 | 1.10 |
| Parse_Invalid_32 | -95.61 | 14748.00 | 152.00 | 0.87 |
| Parse_Invalid_8 | -95.15 | 3800.00 | 152.00 | 1.38 |
| Parse_InvalidEnd | -95.50 | 488.00 | 32.00 | 1.98 |
| Parse_Mixed_8 | -90.56 | 1977.00 | 152.00 | 0.95 |
| Parse_MultipleHeaders | -89.59 | 608.00 | 152.00 | 1.51 |
| Parse_Nonfinite | 3.53 | 152.00 | 152.00 | 1.78 |
| Parse_OutOfRange | 2.85 | 152.00 | 152.00 | 2.87 |
| Parse_QuotedInvalid | -91.05 | 608.00 | 152.00 | 2.28 |
| Parse_QuotedValid | 4.25 | 152.00 | 152.00 | 1.44 |
| Parse_Valid_1 | 19.74 | 152.00 | 152.00 | 2.39 |
| Parse_Valid_8 | -0.54 | 368.00 | 368.00 | 1.20 |
| Public_DuplicateQuality | 1.23 | 0.00 | 0.00 | 1.06 |
| Public_EmptyQualityEnd | -1.54 | 944.00 | 944.00 | 1.52 |
| Public_InvalidQuality | 36.15 | 456.00 | 624.00 | 0.83 |
| Public_OutOfRange | 4.39 | 0.00 | 0.00 | 0.95 |
| Public_QuotedQuality | 3.45 | 0.00 | 0.00 | 0.88 |
| Public_ValidPlain | 1.72 | 0.00 | 0.00 | 0.82 |
| Public_ValidQuality | 4.16 | 0.00 | 0.00 | 0.71 |
| Selector_AllInvalid_8 | -92.89 | 5033.00 | 1384.00 | 4.39 |
| Selector_BrowserIgnore | 4.76 | 1504.00 | 1504.00 | 2.53 |
| Selector_BrowserRespect | 3.41 | 1464.00 | 1464.00 | 2.65 |
| Selector_EmptyQualityEnd | -1.10 | 2328.00 | 2328.00 | 2.70 |
| Selector_Invalid_1 | -72.78 | 1920.00 | 1464.00 | 2.12 |
| Selector_Invalid_32 | -94.02 | 16060.00 | 1464.00 | 0.92 |
| Selector_Invalid_8 | -91.68 | 5113.00 | 1464.00 | 1.38 |
| Selector_Mixed_8 | -83.24 | 3289.00 | 1464.00 | 1.88 |
| Selector_MultipleHeaders | -71.17 | 1920.00 | 1464.00 | 1.67 |
| Selector_UnsupportedReturn406 | 1.04 | 1464.00 | 1464.00 | 4.04 |
| Selector_ValidJson | -0.24 | 1464.00 | 1464.00 | 1.39 |
| Selector_ValidQuality | 1.31 | 1464.00 | 1464.00 | 3.74 |
| Selector_ValidText | 0.95 | 1464.00 | 1464.00 | 1.76 |
| Selector_ZeroQuality | -0.35 | 1464.00 | 1464.00 | 1.73 |

</details>

<details><summary>Discarded round2: all39 initial-harness outcomes</summary>

| Case | Time change% | Before B/op | After B/op | Max CV% |
|---|---:|---:|---:|---:|
| Parse_AllInvalid_8 | -97.09 | 3682.00 | 32.00 | 30.77 |
| Parse_DuplicateInvalidFirst | -90.31 | 608.00 | 208.00 | 1.99 |
| Parse_DuplicateInvalidLast | -88.05 | 608.00 | 208.00 | 1.09 |
| Parse_DuplicateValid | 26.64 | 152.00 | 208.00 | 2.27 |
| Parse_EmptyQuality_Comma | -90.32 | 568.00 | 208.00 | 5.19 |
| Parse_EmptyQuality_End | -9.33 | 976.00 | 976.00 | 1.43 |
| Parse_Invalid_1 | -90.58 | 608.00 | 208.00 | 0.98 |
| Parse_Invalid_32 | -95.64 | 14748.00 | 208.00 | 1.05 |
| Parse_Invalid_8 | -94.94 | 3801.00 | 208.00 | 0.76 |
| Parse_InvalidEnd | -95.68 | 488.00 | 32.00 | 1.26 |
| Parse_Mixed_8 | -89.79 | 1977.00 | 208.00 | 1.28 |
| Parse_MultipleHeaders | -88.41 | 608.00 | 208.00 | 1.16 |
| Parse_Nonfinite | 22.73 | 152.00 | 208.00 | 0.96 |
| Parse_OutOfRange | 33.84 | 152.00 | 208.00 | 4.93 |
| Parse_QuotedInvalid | -89.19 | 608.00 | 208.00 | 1.44 |
| Parse_QuotedValid | 31.55 | 152.00 | 208.00 | 4.16 |
| Parse_Valid_1 | 46.12 | 152.00 | 208.00 | 5.22 |
| Parse_Valid_8 | 19.54 | 368.00 | 424.00 | 1.13 |
| Public_DuplicateQuality | 28.37 | 0.00 | 0.00 | 0.90 |
| Public_EmptyQualityEnd | -0.67 | 944.00 | 944.00 | 0.79 |
| Public_InvalidQuality | -0.87 | 456.00 | 456.00 | 0.83 |
| Public_OutOfRange | 30.20 | 0.00 | 0.00 | 0.91 |
| Public_QuotedQuality | 21.58 | 0.00 | 0.00 | 1.21 |
| Public_ValidPlain | 24.87 | 0.00 | 0.00 | 1.57 |
| Public_ValidQuality | 30.35 | 0.00 | 0.00 | 0.80 |
| Selector_AllInvalid_8 | -92.95 | 5033.00 | 1384.00 | 1.47 |
| Selector_BrowserIgnore | -16.70 | 1504.00 | 1504.00 | 10.05 |
| Selector_BrowserRespect | -5.78 | 1464.00 | 1464.00 | 1.96 |
| Selector_EmptyQualityEnd | -4.99 | 2328.00 | 2328.00 | 2.88 |
| Selector_Invalid_1 | -75.15 | 1920.00 | 1464.00 | 2.58 |
| Selector_Invalid_32 | -94.80 | 16060.00 | 1464.00 | 1.62 |
| Selector_Invalid_8 | -91.88 | 5113.00 | 1464.00 | 0.73 |
| Selector_Mixed_8 | -83.62 | 3289.00 | 1464.00 | 1.08 |
| Selector_MultipleHeaders | -72.94 | 1920.00 | 1464.00 | 2.12 |
| Selector_UnsupportedReturn406 | -9.60 | 1464.00 | 1464.00 | 9.87 |
| Selector_ValidJson | -7.23 | 1464.00 | 1464.00 | 3.03 |
| Selector_ValidQuality | -14.26 | 1464.00 | 1464.00 | 3.66 |
| Selector_ValidText | -15.40 | 1464.00 | 1464.00 | 9.55 |
| Selector_ZeroQuality | -4.01 | 1464.00 | 1464.00 | 3.25 |

</details>

[Raw outcomes](raw-case-outcomes.json) retain all234 means, deviations, heap
and iteration counts. [Paired outcomes](all-paired-outcomes.json) retain117
rows and exact source identity; [setup receipts](setup-correctness.json) retain
all234 actual producer/consumer captures.
**Do not use [all-paired-summary.json](all-paired-summary.json)'s mixed history
medians as final results.** [final-paired-summary.json](final-paired-summary.json)
selects only `after-3` round3.

## Correctness, actual exceptions and report-safe test identities

Final targeted coverage is164/164, including all13 unique added rows.
Exact original owner with final test binaries passes158 existing/public-control
rows, including all seven public-contract rows, and fails exactly the six
actual exception-count rows for `Expected:0 / Actual:1`.
Every row's reason is verified, not inferred from the aggregate failure count.
Final parsing still returns exactly the following `text/plain`, original
buffer/offset and default quality, but produces zero actual FormatExceptions.
Observers are synchronous/thread-filtered and removed in finally.

The valid original/prototype/prototype/final/original-final suites contain
817 outcomes:805 passing and12 expected original exception-count failures
across two original suites, with no skips. Their full TRX,
[all test outcomes](all-test-outcomes.json) and
[focused correctness](correctness.json) are retained.
The original-final test snapshot reuses exactly the immutable original Mvc.Core
DLL/PDB in isolated final test outputs; see
[reuse receipt](original-final-test-reuse.json).

| Requirement | Evidence |
|---|---|
| Actual numeric exceptions avoided while recovery/buffer/offset/default quality remains | `AcceptHeaderParserTest.ParseAcceptHeader_InvalidQuality_RecoversWithoutThrowing` (six individually red/green rows) |
| Nonempty invalid public quality keeps FormatException | `AcceptHeaderParserTest.CreateMediaTypeSegmentWithQuality_InvalidQuality_PreservesPublicException` (five rows) |
| Public empty-at-end keeps index ArgumentOutOfRangeException | `AcceptHeaderParserTest.CreateMediaTypeSegmentWithQuality_EmptyQualityAtEnd_PreservesPublicException` |
| Public empty-before-comma still throws for the default numeric segment | `AcceptHeaderParserTest.CreateMediaTypeSegmentWithQuality_EmptyQualityBeforeComma_PreservesPublicException` |
| Existing valid parser/media-type/actual selector contracts | Existing `AcceptHeaderParserTest`, `MediaTypeTest`, actual `DefaultObjectResultExecutorTest` coverage |
| Real producer liveness, downstream selection and measured public error details |39 original case oracles and234 actual setup receipts; exact final error-message captures |

Preparation evidence is not hidden: the first chosen command lacked MVC test
assets and required a restore; a nullable annotation in the established
annotation-disabled test context caused a compilation error and was removed;
the initial public empty-at-end expectation incorrectly asked for FormatException
instead of ArgumentOutOfRangeException (156 pass/seven failures), then was
corrected before shipping changes. Initial harness compilation required explicit
actual project references for MVC/HTTP abstractions. Those logs and the
mistaken-expectation TRX are retained separately, not counted as functional
red/green proof or valid-suite results.

## Exact commands and results

Every direct .NET command session first activated `. .\activate.ps1` from
`C:\src\aspnetcore`. The missing-assets restore and both pinned harness restores
**passed** with the same flags and `-m:2`; no repository dependency manifests
or SDK configuration changed:

```powershell
dotnet restore .\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
dotnet restore '<RUN>\harness-final\AutoPerf.Benchmarks.csproj' -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
```

This exact targeted project command is **expected red on original**
(157 pass/six specifically verified exceptions), **passed on both prototypes**
(163 each), and **passed on final** (164):

```powershell
dotnet test .\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --filter 'FullyQualifiedName~AcceptHeaderParserTest|FullyQualifiedName~MediaTypeTest|FullyQualifiedName~DefaultObjectResultExecutorTest' --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-<variant>'
```

The exact original-owner/final-test binary command is **expected red** with
158 passing controls/seven public-contract rows and exactly six verified
exception-count failures:

```powershell
dotnet test '<RUN>\tests-original-final-binaries\Microsoft.AspNetCore.Mvc.Core.Test.dll' --filter 'FullyQualifiedName~AcceptHeaderParserTest|FullyQualifiedName~MediaTypeTest|FullyQualifiedName~DefaultObjectResultExecutorTest' --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-before-final'
```

All initial/final benchmark builds **passed with zero warnings/errors** after
the documented preparation correction (`harness` for initial, `harness-final`
for final):

```powershell
dotnet build '<RUN>\harness-final\AutoPerf.Benchmarks.csproj' -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
```

Both original-owner oracle captures and all five immutable snapshot checks
**passed all39 cases**. The final original-owner capture is explicitly from
a copy of final harness outputs with the original Mvc.Core DLL/PDB:

```powershell
dotnet '<RUN>\oracle-capture-original\AutoPerf.Benchmarks.dll' --capture-oracles '<RUN>\contract-oracles-final.json'
dotnet '<RUN>\binaries\<snapshot>\AutoPerf.Benchmarks.dll' --verify-setups
```

Scoped final/prototype formatting and source `git diff --check` **passed**:

```powershell
dotnet format whitespace .\src\Mvc\Mvc.Core --folder --include .\src\Mvc\Mvc.Core\src\Formatters\MediaType.cs .\src\Mvc\Mvc.Core\src\Formatters\AcceptHeaderParser.cs .\src\Mvc\Mvc.Core\test\Formatters\AcceptHeaderParserTest.cs --verify-no-changes --verbosity quiet
```

All six serial measured launches **passed39 cases/eight observations each**:

```powershell
dotnet '<RUN>\binaries\<snapshot>\AutoPerf.Benchmarks.dll' --filter '*AcceptHeaderParsingBenchmark*' --inProcess --exporters json csv --artifacts '<RUN>\round-<round>-<variant>' --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
```

Serial order A/B,B/A,A/B. `execution.json` records every exact path/argument/
timestamp/result. Final before=`before-final`, after=`after-3`.
Reproduce the final project at the same source baseline/proposal and pinned
repository SDK/runtime, capturing original oracles before comparing owners;
the small corrected checksum and message schema are in [harness-final](harness-final).
Do not overwrite captured snapshots or mix the initial harness with final
source claims. [summarize.ps1](summarize.ps1) reproduces all five derived JSON
files byte-identically from these public raw reports/oracles/receipts:

```powershell
.\summarize.ps1 -RunRoot .
```

## Environment and limitations

BDN0.13.0, .NET12.0.0/12.0.26.56305, runtime pin12.0.0-alpha.1.26562.105,
SDK12.0.100-alpha.1.26557.102, C#13, Release/x64/in-process/memory diagnostics,
concurrent server GC. Windows11 Enterprise10.0.26300; shared Xeon Platinum8473C
guest with8 cores/16 logical and about64GiB. BDN's Unknown processor is
supplemented by [CIM hardware metadata](hardware.json), not guessed.
Builds use maximum2 nodes; builds/tests/measurements are serialized.
No power, priority, affinity or unrelated process settings changed.

The final source/harness has only one measured pair; final effect-size
repeatability, production/header-frequency weighted net win, whole-MVC
functional workflows, HTTP serialization/network throughput, concurrency,
memory pressure, cold/JIT, native-code/frame attribution and other runtimes/
platforms remain unverified. Empty-at-end retains its syntax exception.
The public factory regressions are material review tradeoffs, not erased by
large malformed-input wins. This is a fork-only parked draft.
