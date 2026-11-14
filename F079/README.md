# F079: CookieHeaderValue span concatenation

**Measured compatible formatting proposal.**
Source: `7998aa5d782616f3f8f1dbebbff7722c6a960bd3`.
Branch: `autoperf/F079-cookie-header-concat`.
Independent upstream baseline:
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
No other AutoPerf proposal is carried on this branch.

## Measurements and retained controls

All **21 affected cases** improve time **47.19-75.15%** and allocation
**50.36-74.29%**, saving **104-8,352 B/op** in the one measured pair.
19 time improvements exceed 50%; the two constructed/sliced empty cases
improve 48.31%/47.19%. The clear large win permits early stop under the
three-comparison cap. No tuning or repeat was performed.

All three unchanged SetCookie controls have higher time in this pair:
**+2.44%, +5.31%, +7.59%**, with exactly equal allocation. These regressions
remain, without a harmless-noise or source-causality explanation.
This is component-level formatting evidence, not universal/net production
throughput or repeated/opposite-order evidence.

| Case | Original ns/op | Changed ns/op | Paired time change | Original B/op | Changed B/op |
|---|---:|---:|---:|---:|---:|
| Constructed_Empty | 34.51 | 17.84 | -48.31% | 144 | 40 |
| Constructed_Small | 69.36 | 23.97 | -65.44% | 280 | 72 |
| Constructed_Medium | 215.94 | 92.23 | -57.29% | 1224 | 552 |
| Constructed_Large | 2824.92 | 1198.75 | -57.57% | 16584 | 8232 |
| Parsed_Small | 71.13 | 24.08 | -66.14% | 280 | 72 |
| Parsed_Large | 3237.94 | 1202.59 | -62.86% | 16584 | 8232 |
| Parsed_LongName | 162.38 | 40.35 | -75.15% | 656 | 184 |
| Sliced_Quoted | 74.98 | 23.94 | -68.08% | 280 | 72 |
| SetCookie_Empty | 25.08 | 25.69 | +2.44% | 40 | 40 |
| SetCookie_Small | 29.95 | 32.23 | +7.59% | 72 | 72 |
| SetCookie_Large | 1115.63 | 1174.90 | +5.31% | 8232 | 8232 |

[All 24 cases](comparison.md), [per-case paired values](comparison.json),
[affected/control classification](measurement-summary.json), and both raw
[original](round-1-before) / [changed](round-1-after) exports remain.
Each case has eight retained measured samples; outliers are not removed.

## Minimal mechanism and boundary

The original `ToString` allocates a StringBuilder, appends the name span,
equals character and value span, then allocates the final string.
The proposal replaces that sequence with
`string.Concat(_name.AsSpan(), "=", _value.AsSpan())`, using the existing
three-span overload. Remove only the now-unused `System.Text` import.
Validation, casing, quotes, empty values, separators, fields, public signatures
and virtual `ToString` dispatch are unchanged.
This uses the same pattern already present in `MediaTypeHeaderValue` and
`ContentDispositionHeaderValue` in the assembly; no custom formatter, cache,
pool or metadata/Hot Reload mechanism is introduced.

The [standalone BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj)
times actual public `CookieHeaderValue.ToString`, not extracted concatenation.
The 21 affected setups use actual constructors with whole/sliced inputs or
actual `CookieHeaderValue.Parse` over a bounded slice of a larger buffer.
Each producer covers empty, 16/256/4,096-character values, quotes, valid cookie
punctuation and a 64-character name. Three actual SetCookie serializers serve
as source-unchanged controls.
Validation, construction, parsing, oracle comparison and hashing are outside
timing. There is no parser-throughput claim.

Complete strings and hashes are compared against independently constructed
input expectations. The actual buffer identities and name/value offsets
are checked. The parser canonically produces `StringSegment.Empty` for an empty
value; it does not retain a nonzero empty-value slice. The initial preflight's
incorrect assumption was corrected and explicitly asserted **before any
snapshot or timing**, without altering shipping code.
See [all actual producer/output receipts](setup-correctness.json).

dotnet/aspnetcore#31258 removes CookieHeaderValue allocations from ordinary
`Request.Cookies` parsing. This proposal does **not** improve that parser path.
The serialization API's complete returned string is the faithful material
boundary; no browser/HTTP-hosted workflow, production workload, concurrent
setter mutation or maximum-string-size validation was performed.

## Compatibility and provenance

Original and final owning `Microsoft.Net.Http.Headers.Tests` suites each pass
**1,856 tests**, zero skipped. All eight new rows and all four existing direct
ToString rows pass individually in both variants.

| Requirement | Evidence |
|---|---|
| Constructor-produced nonzero slices, casing, empty/quoted/embedded-equals full output | `CookieHeaderValue_ToString_PreservesStringSegmentSlices`, four rows |
| Actual bounded parser, source buffers/canonical empty state and exact full output | `CookieHeaderValue_ToString_PreservesParsedSegment`, four rows |
| Existing direct formatting behavior | `CookieHeaderValue_ToString`, four original rows |

[All 12 direct serialization outcomes](all-to-string-test-outcomes.json),
[new-row/owning-suite receipts](correctness.json) and
[acceptance](acceptance.json) are retained.
Compatibility passing is not a functional bug-fix red/green claim.

The immutable A/B closure reuses the exact benchmark DLL/PDB after matching
runtime/dependency configuration. Only `Microsoft.Net.Http.Headers.dll`
differs among executable/configuration files; actual target loads and all
hashes are retained in [provenance](provenance.json),
[assembly hashes](assembly-hashes.json) and [loads](assembly-loads.json).
Capture manifests keep actual baseline HEAD and dirty source/test state;
the committed final source is verified separately by hashes.

Pinned SDK: 12.0.100-alpha.1.26557.102; runtime:
12.0.0-alpha.1.26562.105; BenchmarkDotNet 0.13.0 with in-process server GC.
Builds/measurements are serial on a shared Windows machine; no host settings
were changed. One comparison is consumed, no prototype/tune or additional
measured comparison.

## Exact successful commands

From the checkout, activate before each command session:

```powershell
. .\activate.ps1

# Original/final builds: passed, zero warnings/errors; Variant is before/after.
dotnet build "$RunRoot\harness\AutoPerf.Benchmarks.csproj" -c Release `
  -o "$RunRoot\build\$Variant" -m:2 -p:AspNetCoreRoot=C:\src\aspnetcore `
  -p:UseIisNativeAssets=false -p:BuildNodeJS=false --verbosity quiet

# Each original/final executable: all 24 complete output/producer checks passed.
dotnet "$BuildOutput\AutoPerf.Benchmarks.dll" --verify-setups

# Original focused run: all eight new rows passed, zero failed/skipped.
dotnet test src\Http\Headers\test\Microsoft.Net.Http.Headers.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --filter 'FullyQualifiedName~CookieHeaderValue_ToString_Preserves' `
  --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-focused-before" --verbosity quiet

# Original/final full suites: 1856 passed each, zero failed/skipped.
dotnet test src\Http\Headers\test\Microsoft.Net.Http.Headers.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --no-restore --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-$Variant" --verbosity quiet

# Both measured launches: passed, 24 cases each, eight retained samples each.
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*CookieFormattingBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" `
  --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 `
  --outliers DontRemove

# Both touched files: passed, no changes/diagnostics.
dotnet format whitespace --folder . `
  --include src\Http\Headers\src\CookieHeaderValue.cs `
  src\Http\Headers\test\CookieHeaderValueTest.cs `
  --verify-no-changes --verbosity quiet
# Passed.
git --no-pager diff --check
```

No tracked SDK, package, NuGet or Node manifests were changed.
History/docs and existing same-assembly span-Concat precedent were inspected.
No matching narrow-search proposal was found; this is not an exhaustive
duplicate-coverage claim.
