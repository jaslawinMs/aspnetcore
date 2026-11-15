# F074: Render-fragment parameter JSON string allocation

**Qualified allocation-focused draft proposal, not merge-ready.** The actual
owner removes the intermediate UTF16 string; long text is36.82% faster and
large escaped content saves19544B/op (about67%). The full escaped descriptor
case is20.28% slower by median paired time change. That regression is retained,
not explained away as proven noise or hidden behind the owner-only win.

Baseline: dotnet/aspnetcore at `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Source/test commit:
[`8cb5e62997601b1812c642b64f67f357a345779d`](https://github.com/jaslawinMs/aspnetcore/commit/8cb5e62997601b1812c642b64f67f357a345779d).
Branch: `autoperf/F074-render-fragment-parameter-deserialization`.
The only changed existing shipping line replaces `value.GetRawText()` with
`value` in the generic top-level SerializedRenderFragment Deserialize call.
Options, cache, lazy rendering, logging and failure paths remain unchanged.
Independent F075/F076 are untouched; no public API/default/convention changes.

## Measurements and limits

Three comparisons, one unchanged proposal,24 profiles each. Order is
before/after, after/before, before/after. Each has3 warmups and8 result
iterations with a100ms target, concurrent server GC and outliers retained.
BDN0.13.0, C#13 external project, SDK12.0.100-alpha.1.26557.102,
.NET12.0.0(12.0.26.56305), X64 in-process.

| Profile | Paired time changes by round | Median change | Heap saving |
|---|---|---:|---:|
| DirectTextLong | -36.62%/-36.82%/-40.26% | -36.82% | 8296B/op |
| DirectEscapedLong | -7.34%/-10.81%/-9.76% | -9.76% | 19544B/op |
| RenderEscapedLong | -12.74%/-12.48%/-11.72% | -12.48% | 19544-19545B/op |
| DirectElements32 | -9.10%/-10.26%/-6.71% | -9.10% | 30872B/op |
| DirectEmpty | -3.08%/-3.89%/-3.23% | -3.23% | 48B/op |
| DirectTyped1 control | +7.00%/+2.17%/+8.17% | +7.00% | 0B/op |
| DirectTyped8 control | +1.43%/+0.34%/-2.02% | +0.34% | 0B/op |
| CollectionText1 | -1.32%/-2.92%/-5.90% | -2.92% | 232B/op |
| CollectionEscapedLong | +20.28%/-3.50%/+32.68% | +20.28% | 19543-19545B/op |
| CollectionElements8 | -7.64%/-2.27%/+22.24% | -2.27% | 7739-7743B/op |
| CollectionTypedControl | -2.68%/+9.43%/+1.46% | +1.46% | 0-1B/op reporting granularity |

[All24 profiles and every round](comparison.md),
[raw-derived audit](measurement-audit.json),
[all six executed commands/results](all-execution.json).
Each round directory preserves full JSON, CSV, HTML, Markdown and both logs.
The three-comparison budget is closed. No fourth run or unrecorded timing probe.

The prepared owner and materialized-render boundaries are not full HTTP,
network, startup or production throughput. The descriptor-collection boundary
does include the actual existing decode, unprotect, UTF8.GetString, string
JsonTypeInfo parser, root-type lookup and parameter owner. Collection timing
is volatile, but the positive median and two slower escaped-profile pairs
are real observations and unresolved. Ordinary typed controls also move in
time. No causal scheduling/JIT/GC explanation or universal gain is established.
This shared Windows machine was used serially with two MSBuild workers;
no power, affinity or unrelated-process changes. [Hardware](hardware.json).

## Actual producer and owner

The real SSR flow executes RenderFragmentCapture, captures frames, creates
the Endpoints SerializedRenderFragment DTO and emits a Server marker.
ServerComponentDeserializer decodes the actual marker and supplies JsonElement
values to ComponentParameterDeserializer. The harness uses actual Endpoints
capture/serializer/DTO identities, not the Server shared-source DTO identity
or a substitute primitive. Reflection and external IL adapters are setup-only;
timed methods invoke the actual internal owner. No shipping IVT/UnsafeAccessor.

Profiles cover empty, small/scaled/long text, escaped Unicode, nested keyed
elements with typed attributes, markup, two fragments, mixed parameters,
ordinary typed controls, materialization and stateless descriptor collection.
Nested component captures that were never executed are not synthesized.
All24 before/after contracts are byte-identical and compare materialized frames
with the executed source fragment. Actual sample and Selenium evidence cover
the SSR renderer producer rather than treating a capture-only unit test as E2E.

Both source/PDB documents match and all six launches identify the intended
owner. Original owner SHA256:
`C997B7D333814BCCABD5614453CE0D1BDE075FC5DDC7CEBB6D2FF1688C098136`.
Proposed:
`12B0C5C16469726C3808681C3270257716A8E6BC64A0A4F58E81EA4D3BF4252B`.
Identical harness/runtime/dependency manifests and209 common copied files
change only Server.dll/PDB. One extra validation source-generator compiler
output is outside the identical runtime manifest; all90 runtime assets were
verified. The first PowerShell enumeration wrongly reported zero and its
correction is explicit in [closure evidence](execution-closure.json).

The frozen harness's provisional string-size prediction used24+2*n and
overpredicts some lengths by8B. The external audit uses22+2*n including the
UTF16 terminator, aligned to8, retaining the original harness/contracts.
Savings match the corrected model within BDN allocation reporting granularity.
No changed snapshot or source strategy is substituted between rounds.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| Empty, ASCII, escaped Unicode/LF, large and nested/keyed captured content | All5 `CanParseCapturedRenderFragmentParameters` rows |
| Invalid DTO shapes, default failed out-view and exact Debug4 event/tags/exception | All5 `InvalidRenderFragmentParameter_PreservesDebugFailure` rows |
| Undefined/disposed JsonElement failure | Both `UnavailableRenderFragmentElement_PreservesDebugFailure` rows |
| Existing lazy/deferred failure | Both `InvalidRenderFragmentNodes_PreserveDeferredRenderingFailure` rows |
| Real SSR restoration, exact DOM Unicode/LF/attribute and trusted rerender | `RenderFragmentCrossesBoundary_EscapedUnicodeContent` |
| Existing opposite/broader controls | Existing simple/nested/markup/attribute/key/typed/nested-fragment Server/Wasm rows; existing typed/null/union descriptor rows |
| Performance boundary and heap effect |24 actual-owner/capture/collection contracts;144 measured outcomes,72 pairs and1152 raw result samples |

Original/proposed managed suites each passed47/47; selected owning Selenium
suites each passed15/15, no skips. Canonical BlazorWebAppPerPage passed six
plain/Unicode/no-fragment states before/after, framework200, actual Server
WebSocket101, trusted input and zero current-page errors.
[Exact successful validation commands with results](validation-commands.md).
The formatting command in [formatting.json](formatting.json) passed, unchanged
source. Preservation tests are green before/after, not a functional-red bug fix.

Two original Selenium attempts failed because string property transport
changed every LF into CRLF. An isolated native browser producer returned
DOM codes65,10,66 and getter codes65,13,10,66. The permanent C# Selenium
scenario reads numeric UTF16 for that one operation, preserving the exact
assertion without normalizing expected/observed content. Temporary diagnostics
were removed; all failed receipts and native/raw bytes remain published.
The two temporary sample files were removed after permanent coverage passed
and their source is retained under `sample-source`.

Initial broad build failed missing assets; the restored retry was aborted on
unrelated MSB4057 CreateWixInstaller. No full-build sentinel was created.
The smaller dependency-aware sample/test/harness builds passed. Initial
new-test analyzer/default-out-view failures, external readonly/logger-field
setup errors, both Selenium failures and the analyzer correction are retained.
They reached no successful performance comparison and did not consume the
three-pair budget.

Introduction/history and existing work are linked in [acceptance](acceptance.md).
dotnet/aspnetcore#66528 introduced this feature; disabled prerendering and
uncaptured fragments are explicitly unsupported. dotnet/aspnetcore#68295
retains the F074 GetRawText seam; its typed-parameter overlap concerns F075.
Auto/global/enhanced-navigation, AOT/trimming and cross-version behavior are
not claimed. No cache, new assembly boundary or lifecycle change is proposed.

## Reproduction

Use the baseline checkout and apply the four-file `source.patch` except the
single owner argument for the original. Activate `. .\activate.ps1`, then run
the managed test command to prepare tested Release dependencies. Download the
`harness` directory outside the checkout and build its project with
`-p:AspNetCoreRoot=<checkout>` and the documented flags in command receipts.
The project deliberately requires actual tested dependencies rather than an
installed ASP.NET shared framework.

Copy original build outputs before applying the one owner line; rebuild and
copy proposed outputs. Keep AutoPerf.Benchmarks.dll/PDB/runtime/deps identical.
For each frozen variant, the executed measurement settings are:

```powershell
dotnet '<variant>\AutoPerf.Benchmarks.dll' --filter '*RenderFragmentBenchmark*' --inProcess --exporters json csv --artifacts '<output>' --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
```

That command passed24 measured profiles in each of six recorded launches.
`--contracts --output <file>` is untimed and passed24 profiles for both owners.
Private binaries are not published; hashes, source, PDB correspondence and
runtime closure are. The source benchmark project and every raw result are here.

```powershell
node .\reproduce-analysis.mjs . --verify
```

This non-timing audit passed and regenerates arithmetic, identities, sample
counts, preservation and exact browser diagnostics. It does not resolve the
full-descriptor timing regression or grant merge readiness.
