# OutputFormatter unconstrained metadata parsing (F072)

**Qualified fork-only proposal, not merge-ready:** the selected direct branch
improves prepared null-content-type queries by **55.06-74.23%** for ordinary
3/8/32-entry lists and **63.14-89.62%** for long 1/32-entry lists. Actual
prepared API metadata generation with 32 plain types improves **9.79%**.
Typical three-type metadata is a **non-win (+1.55%)**; null wildcard-only
32-entry queries cost **10.47%** more. No universal or production benefit is claimed.

The [13-line owner addition](https://github.com/jaslawinMs/aspnetcore/blob/ca0b3c832436d8d7ef51ec0392b23b255fde3774/src/Mvc/Mvc.Core/src/Formatters/OutputFormatter.cs)
directly adds a supported string only when the requested content type is null
and the supported value is nonempty and contains neither semicolon nor asterisk.
Empty, parameterized and wildcard values retain the complete original parser
and branches. Raw strings, ordering, list capacity and live configuration
remain unchanged. `CanWriteResult` is untouched; F073 stays independent.
63 test lines were added; no existing source/test lines changed.

## Actual boundary and provenance

The scanner card `repeated-parsing-without-cache` classified this as stable
configuration on a content-negotiation path. That is candidate provenance,
not a correct lifetime or heap-allocation claim. `SupportedMediaTypes` is
explicitly **mutable** in public XML documentation. The actual call sites in
`ApiResponseTypeProvider.CalculateResponseFormatForType` produce API response
metadata through `DefaultApiDescriptionProvider`; the group provider caches
results by actual action-descriptor Version. No collection/action/process
cache was adopted. No public API/default/convention change was made.

Null requests are produced when response types lack a declared Produces content
type. The external [BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj)
references the in-tree MVC.Core and ApiExplorer owners and actual tested
dependencies. It does not copy owner/parser code or substitute an installed framework.

Thirty profiles cover prepared public method calls, four cold metadata profiles,
a genuinely cached metadata control and two adjacent CanWriteResult controls.
The real service collection uses AddMvcCore/AddApiExplorer and AssemblyPart
controller discovery. Four actual controller actions produce implicit, typed,
unmatched declared and void response descriptions. Status, type, raw formats,
formatter identity and declared fallback are checked in the independent audit.
An owner type-check counter distinguishes cold production from cached lookup.

The cold metadata operation creates a fresh public group provider around
prepared actual descriptors/providers, generates response metadata and counts
formats. DI construction, controller/descriptor discovery and formatter
configuration are outside timing; initial metadata/model caches are warmed in
setup. This is **prepared cold API-description-group generation**, not full
startup, ordinary per-request negotiation, controller execution or HTTP/network
latency. The public constructor omits optional internal logging initialization.
The cached control includes caller traversal/counting; its 224 B/op is not
attributed to GetSupportedContentTypes, which it demonstrably does not reach.

- Fresh current-main intake: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- Independent branch: `autoperf/F072-output-formatter-supported-types`.
- Source/test commit: `ca0b3c832436d8d7ef51ec0392b23b255fde3774`.
- Original/final actual MVC.Core SHA-256:
  `10F0D202F7F2EBA6FC71D05BEDE4C1DA71EB71B21718DF1AAD8D9CAE032F5E56` /
  `3F2B882AF68A8E159DD09D82EE5586240AEFDB76B0CCB8E5AFE1E42D8CAB9421`.
- Exactly **three comparisons, two source strategies**; the selected `after-2`
  source is repeated unchanged in rounds 2 and 3. Final paired medians aggregate
  those two pairs only, never the superseded first strategy. No fourth timing run.
- All **180 outcomes / 90 pairs / 1,440 actual samples / 186 loaded-owner
  markers** are reproduced by [the non-timing audit](reproduce-analysis.mjs).
  Seven actual PDB document hashes, committed source identity and two 165-path
  recursive DLL/JSON owner-only closure proofs are retained.

Latest relevant owner changes at intake: nullable content-type contract
`fab448a153e8e2683a652f1fd1e8ef7d917c3110` (2025, dotnet/aspnetcore#63040)
and suffix support `4f351bd37c0f77b891a26763d535c04f831554d0` (2017).
Existing dotnet/aspnetcore#18891 discusses omitted wildcard content types for
null API metadata requests. This proposal preserves that behavior; it does
not fix that issue. Targeted searches found no exact optimization overlap,
not exhaustive proof of absence.

The GitHub semantic index returned 404; C# symbol/reference lookup returned no
relevant evidence. Exact scoped local discovery was used; zero symbol results
are not evidence of absent callers. An initial GitHub CLI qualifier/query
was malformed and corrected using a separate repository argument.

## Selected strategy: repeatable gains and retained costs

Positive change means slower. The [full selected table](comparison.md) retains
both before/after means, paired percentages and memory counters for all 30 cases.
The following are medians of the two paired changes, not a ratio of pooled samples.

| Profile | Round 2 time change | Round 3 time change | Paired median |
|---|---:|---:|---:|
| NullPlain1 | -38.21% | -29.48% | -33.84% |
| NullPlain3 | -57.29% | -52.82% | -55.06% |
| NullPlain8 | -72.23% | -70.09% | -71.16% |
| NullPlain32 | -74.58% | -73.87% | -74.23% |
| NullLong1 | -61.39% | -64.88% | -63.14% |
| NullLong32 | -89.15% | -90.10% | -89.62% |
| NullMixed3 | -34.05% | -36.56% | -35.30% |
| NullMixed32 | -47.34% | -48.71% | -48.03% |
| MetadataPlain32 | -10.99% | -8.58% | -9.79% |
| MetadataPlain3 | +1.25% | +1.86% | +1.55% |
| MetadataParams3 | +0.17% | +4.09% | +2.13% |
| NullWildcards32 | +9.49% | +11.45% | +10.47% |
| Miss32 | +4.13% | +3.42% | +3.77% |
| AllApplication32 | +3.38% | +1.81% | +2.60% |

Prepared calls and cached controls have **unchanged allocations**.
The only final cold-metadata difference is MetadataMixed3 in round 2:
24,676 to 24,673 B/op; round 3 is 24,673 B/op on both sides. That small,
non-repeated counter difference is not a structural allocation saving.
MediaType is value-based; constructor count is not a heap-allocation count.

**Spread-sensitive results are not clean gain/cost evidence:** round 2 Suffix1
is +30.33%, with proposed 196.34 ns mean and 22.55 ns standard deviation.
Its eight proposed samples range 167.80-234.84 ns; round 3 is +0.62% with
152.75 ns mean and 1.29 ns standard deviation. The mechanical +15.48% paired
median remains published, not presented as a stable 15% regression.

Round 2 MetadataMixed3 is apparently -14.83%, but original mean 16,047.90 ns
and standard deviation 2,277.37 ns span 14,121.43-20,370.79 ns. Round 3 is
**+1.96%**, not a gain; the mechanical -6.43% paired median is not credited
as a credible whole-metadata improvement. [All eight series](spread-inspection.json)
and every raw sample are retained without trimming or substitution.
NullParams1 also changes direction (-13.72% / +7.91%); no gain is credited.
No causal JIT/codegen or host-interference explanation was independently established.

The superseded round 1 used default(MediaType) for eligible values but kept
HasWildcard evaluation/original branches. It improved ordinary prepared
null lists by 19.65-48.12% and long lists by 50.84-80.36%, but AllApplication32
and NullWildcards32 cost about 20% more. Its source, hashes and all raw outcomes
remain separate in [all-comparisons.json](all-comparisons.json).

## Preserved requirements

Preservation evidence is **not a functional-red bug fix**: new cases pass on
the original implementation as well.

| Requirement | Evidence |
|---|---|
| Original raw values/reference identity, casing, spacing, parameterless incomplete values and wildcard omissions | All nine `GetSupportedContentTypes_NullContentType_PreservesRawValues` rows pass original/final; 13 actual public collection/owner raw outcomes agree byte-for-byte. |
| Empty and malformed-parameter errors cannot be hidden by the shortcut | Both `GetSupportedContentTypes_NullContentType_PreservesParsingErrors` rows pass original/final; the actual raw producer preserves ArgumentOutOfRangeException(offset) and ArgumentOutOfRangeException(index). |
| Live public collection changes, ordering and earlier result snapshots | `GetSupportedContentTypes_ObservesSupportedMediaTypeChanges` passes original/final; the actual mutation contract checks overwrite/add/remove and unchanged earlier results. |
| Existing declared matching, suffixes, no-match, unsupported types and adjacent CanWriteResult behavior | Existing `GetSupportedContentTypes_ReturnsMatchingWildcardContentTypes_WithContentType`, `GetSupportedContentTypes_ReturnsMoreSpecificMatchingContentTypes_WithContentType`, `GetSupportedContentTypes_ReturnsMatchingContentTypes_NoMatches`, `GetSupportedContentTypes_ReturnsNull_ForUnsupportedType` and both `CanWriteResult_MatchesWildcardsOnlyWhenContentTypeProvidedByServer` rows pass original/final. |
| Real metadata producers, unmatched declared fallback, typed/implicit/void responses and warm-cache nonreachability | All five actual metadata profile contracts are byte-identical; all 28 owning `ApiResponseTypeProviderTest` rows pass original/final. The independent audit checks actual four-action descriptions, status/type/formatter identities and owner-reached flags. |

Exact focused OutputFormatterTests runs pass **23/23** on original, strategy 1
and selected strategy 2. Owning ApiResponseTypeProviderTest runs pass **28/28**
on all three owners. Every row, exact argument array, command result and TRX
is retained under its named test directory. The selected actual API-test
MVC.Core hash equals the frozen `after-2` owner.

The first broad OutputFormatter selector genuinely passed 43 rows across
OutputFormatter/String/Text tests; a script's expected-count check failed,
not the tests. The exact 23-row selector was then used. The first owning API
run failed NETSDK1004; scoped restore succeeded, followed by passing suites.
The first harness build emitted CS0108 because the frozen controller's Empty
method hides ControllerBase.Empty; it was not a build/test failure and was
not silently renamed after measurement. All original diagnostics remain.
Whitespace verification passed without editing either measured/test source.

SDK `12.0.100-alpha.1.26557.102`, runtime `.NET 12.0.0 (12.0.26.56305)`,
BenchmarkDotNet `0.13.0`, C# 13, concurrent server GC, in-process Short job:
3 warmups, 8 iterations, 100 ms target, outliers retained. Runs were serial
before/after, after/before, before/after. This is a **shared** Windows 11 guest,
not a dedicated benchmark machine; no power/affinity/machine changes.
BDN reports CPU unknown. Prior hardware inspection identified a Xeon Platinum
8473C guest, 8 cores/16 logical processors and about 64 GiB RAM.

## Reproduction

Use each stated original/proposal checkout, activate its repository SDK and
build/test the actual owner before the external harness. Keep identical
harness/config/non-owner dependencies and freeze actual owner variants.

```powershell
Set-Location C:\src\aspnetcore
. .\activate.ps1
dotnet test src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj --no-restore -c Release -m:2 --filter "FullyQualifiedName~Microsoft.AspNetCore.Mvc.Formatters.OutputFormatterTests" -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false
dotnet test src\Mvc\Mvc.ApiExplorer\test\Microsoft.AspNetCore.Mvc.ApiExplorer.Test.csproj --no-restore -c Release -m:2 --filter "FullyQualifiedName~ApiResponseTypeProviderTest" -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false
dotnet build <EVIDENCE>\harness\AutoPerf.Benchmarks.csproj -c Release -m:2 -p:AspNetCoreRoot=C:\src\aspnetcore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false
dotnet <FROZEN>\AutoPerf.Benchmarks.dll --contracts --output <NEW_CONTRACTS_JSON>
dotnet <FROZEN>\AutoPerf.Benchmarks.dll --filter "*OutputFormatterBenchmark*" --inProcess --exporters json csv --artifacts <NEW_OUTPUT> --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
node <EVIDENCE>\reproduce-analysis.mjs <EVIDENCE> --verify
```

These are portable reproduction forms; actual fully expanded commands and
successful results are in `tests-before/command.json`, `tests-after-2/command.json`,
`api-tests-original-restored/command.json`, `api-tests-after-2/command.json`,
the build/restore directories and `all-execution.json`. The last command
audits existing evidence **without running more timings**.
Historical storage paths require the campaign layout; AspNetCoreRoot is portable.
The actual reused PDB checker source is retained in `tools`; only its `pdb`
mode was used for F072. Its `self` mode is a historical F071 diagnostic,
not F072 evidence. Rebuild its referenced frozen original dependencies before
using `pdb <PDB> OutputFormatter.cs <SOURCE_SNAPSHOT>`.

No full startup/HTTP benchmark, production configuration distribution, other
architecture/runtime, AOT/trimming or retained-memory benefit was established.
