# F301: concatenate complete Kestrel code-generation fragments

Originating issue [jaslawinMs/aspnetcore#44](https://github.com/jaslawinMs/aspnetcore/issues/44).

**Measured fork-only proposal.** Complete header generation is **51.40% faster**
by median paired mean ratio and reports approximately **72.18% less heap
allocation**. Actual warm five-file `CodeGenerator.Program.Run` is **19.48%
faster** with approximately **63.00% less reported heap**. These are
informational code-generation measurements, not request throughput or an
end-to-end clean-build speedup.

Source: [fdf31c416447d377c63217b441d3eb0534dd5cac](https://github.com/jaslawinMs/aspnetcore/commit/fdf31c416447d377c63217b441d3eb0534dd5cac),
independent branch `autoperf/F301-kestrel-codegen-concat`, based on fresh upstream
main [37e809ead5824bc753a1c3d56f11615bdb1296c5](https://github.com/dotnet/aspnetcore/commit/37e809ead5824bc753a1c3d56f11615bdb1296c5).
The [source diff](source.patch) changes only two private helper return statements
and adds sixteen preservation-test rows. It does not include F258/F259 table
initialization changes, generated shipping files, a new cache or a public API.

## Actual owner and original behavior

`KnownHeaders.cs` is shared source compiled into the actual Kestrel
`CodeGenerator` executable and the established Kestrel Core test project.
Both private `Each` overloads selected template fragments and reduced them with
`Aggregate((a, b) => a + b)`, repeatedly concatenating the accumulated string.
The proposal uses `string.Concat(values.Select(formatter))` while preserving the
existing `Any` probe and empty branch.

This is the retained informational `string-concat-in-loop` finding, not a
shipping request-path finding. [Owner history](owner-history.log) and a
[bounded existing-PR query](existing-prs.json) are retained. That query did not
identify an existing change to these two statements; it is not an exhaustive
all-repository duplicate proof.

The real fresh-process CLI generated all five complete output files before and
after the change. Every UTF-8 file was byte-identical, and the original output
also matched every current tracked generated file. See the
[original output hashes](generator-original-output.json),
[before/after byte parity](generator-byte-parity.json), complete
[original generated files](generated-original), and actual
[original](generator-original.log)/[proposed](generator-proposed.log) CLI logs.
No tracked generated file was overwritten.

## Repeated-generation fidelity and measured boundaries

An important existing lifecycle detail prevents a naive repeated benchmark:
`GeneratedFile` assigns `BytesOffset` and increments `BytesCount` on actual
response/trailer headers. Repeated calls without resetting that state produce
different output.

The identical [harness](harness) records the actual initial offset/count of
42 response/trailer header records once, then restores only those two fields
before **every** operation. This reset cost is included identically in all A/B
cases. The initial defaults are recorded in each console log. No shipping
generator lifecycle change is proposed.

Each setup generates the complete case output three times and checks exact
output identity against the original [contract oracles](contract-oracles.json).
`HeadersFull` additionally compares its 690,154-character output with the real
fresh CLI output. `ProgramWarm` generates and verifies all five persisted files
after each setup repetition. All 90 measured setup receipts match the original
oracles; [complete receipts](setup-correctness.json) retain lengths, hashes,
producer names and the five-file hashes.

`HeadersFull` calls the actual complete `KnownHeaders.GeneratedFile`, not a
cloned formatter. HPACK/QPACK cases include the actual grouping and generated
switch producer; request/response/trailer cases generate the actual switch
sections. Private methods are reached through typed delegates or direct
expression-compiled calls constructed outside measurement, not per-call
reflection or an object-array wrapper.

`ProgramWarm` calls the actual `CodeGenerator.Program.Run`. Setup seeds five
isolated temporary files with the original output. Measurement includes all
five real generators, existing-file reads/comparison, the header state reset,
and stdout suppression/restoration using `try/finally`. File creation,
seeding, correctness hashing and cleanup are outside measurement. No
changed-file write or fresh-process/JIT cost is measured.

Complete generated strings are produced and their lengths consumed.
`ProgramWarm` returns the setup-observed original total of 776,676 output
characters after performing actual generation and file comparison. The tiny
switch and partition cases also include the identical reset and case-dispatch
cost; they are not pure `Each` timings.

## Three complete comparisons: all outcomes retained

Order A/B, B/A, A/B; no tuning, no overwritten comparison, no fourth pair.
Every one of 90 outcomes has eight measured observations, three warmups and
`DontRemove` outliers. Negative time changes mean faster. Medians are medians
of three paired **mean ratios**, not pooled measurements or significance claims.
Positive saved bytes mean lower reported allocation; negative means higher.

| Case | Pair1% | Pair2% | Pair3% | Median% | Saved B/op by pair | Max CV% |
|---|---:|---:|---:|---:|---|---:|
| EmptySwitch | -2.53 | -11.50 | 224.10 | -2.53 | 0 / 0 / 0 | 4.87 |
| HeaderLookup | -88.24 | -85.92 | -88.18 | -88.18 | 332732 / 332731 / 332732 | 25.30 |
| HeadersFull | -49.95 | -51.40 | -54.01 | -51.40 | 25769015 / 25767712 / 25768660 | 14.00 |
| HPackRequest | -53.41 | -50.68 | -44.80 | -50.68 | 181490 / 181492 / 181495 | 17.19 |
| HPackResponse | -51.73 | -43.53 | -42.02 | -43.53 | 124688 / 124689 / 124689 | 11.04 |
| OneSwitch | 5.48 | -0.95 | -6.14 | -0.95 | 0 / 0 / 0 | 12.48 |
| ProgramWarm | -13.87 | -19.48 | -20.23 | -19.48 | 25771762 / 25770608 / 25769882 | 8.13 |
| ProtocolControl | -4.46 | 18.72 | 6.41 | 6.41 | -32 / -21 / 1 | 16.40 |
| QPackMatch | -29.73 | -30.34 | -33.69 | -30.34 | 115458 / 115458 / 115457 | 9.08 |
| QPackRequest | -43.29 | -32.77 | -36.37 | -36.37 | 135808 / 135810 / 135811 | 11.68 |
| QPackResponse | -31.53 | -31.63 | -28.55 | -31.53 | 93700 / 93697 / 93697 | 6.83 |
| RequestSwitch | -32.12 | -37.75 | -39.13 | -37.75 | 649222 / 649225 / 649226 | 12.55 |
| ResponseSwitch | -27.44 | -23.62 | -34.15 | -27.44 | 437354 / 437358 / 437357 | 11.41 |
| TrailersSwitch | -1.67 | -1.72 | -3.75 | -1.72 | 1760 / 1760 / 1760 | 8.98 |
| UtilityControl | -1.82 | -0.12 | -0.97 | -0.97 | 56 / 0 / 647 | 1.18 |

The full header producer improves in every pair, reporting approximately
35.70 MB -> 9.93 MB per generation. The actual warm program improves in every
pair, approximately 40.91 MB -> 15.14 MB. Nine real smaller generation
partitions also improve in every pair, but the small trailer switch is only
-1.72% by median. Absolute means, standard deviations, allocations and iteration
counts for every outcome are in [raw-case-outcomes.json](raw-case-outcomes.json).

**The unexplained `EmptySwitch` pair3 +224.10% result is retained.** It has
unchanged 128 B/op and low within-launch CV; earlier pairs have the opposite
sign. A small median is not evidence this boundary is harmless.
`OneSwitch` regresses +5.48% in pair1, has mixed signs, and always reports
7,288 B/op.

The untouched protocol generator has **+6.41% median**, including pair2
**+18.72%**, with small -32/-21/+1 B saved variation. The untouched utility
generator's -0.97% median and small varying heap counts are not attributed to
this change. HeaderLookup reaches 25.30% within-launch CV; full headers reach
14.00%. No JIT/native or causal explanation for these control shifts is claimed.
The repeated large full-output benefit does not imply every small path improves.

## Correctness and exact successful commands

Original and proposed each passed **927/927** helper/header tests, including
**all sixteen new theory rows** individually inspected. The complete
[original](tests-before/results.trx) and [proposed](tests-after/results.trx)
TRX files and [all 1,854 individual outcomes](all-test-outcomes.json) are retained.

| Requirement | Evidence |
|---|---|
| Empty/single/multiple fragment output, order and indices | `Each_PreservesOrderedFragments` (six rows) |
| Empty branch bypasses a null formatter | `Each_EmptyValues_DoesNotInvokeOrValidateFormatter` (two rows) |
| Non-null singleton string instance retained | `Each_SingleFragment_PreservesInstance` (two rows) |
| Original formatter exception identity, evaluation order and early stop | `Each_PropagatesFormatterException_AfterPriorFragments` (two rows) |
| Empty fragments preserve output | `Each_EmptyFragments_PreservesOutput` (two rows) |
| Null source throws with the original parameter name | `Each_NullSource_PreservesException` (two rows) |
| Complete real fresh-process output remains unchanged | All five actual CLI files in `generator-byte-parity.json` |
| Repeated real generation remains equal to the one-shot output | Three repetitions per setup; all 90 `setup-correctness.json` receipts match original oracles |

These are preservation tests, not a fabricated failing functional regression:
the original already returns the right text. The measured original owner
reports substantially higher full-generation time/heap than the proposed owner.

Every direct command session first ran `. .\activate.ps1` from the repository
root. The following exact covering command passed before and after:

```powershell
dotnet test .\src\Servers\Kestrel\Core\test\Microsoft.AspNetCore.Server.Kestrel.Core.Tests.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --filter 'FullyQualifiedName~KnownHeadersTests|FullyQualifiedName~HttpRequestHeadersTests' --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-<variant>'
```

Original actual generator build passed:

```powershell
dotnet build .\src\Servers\Kestrel\tools\CodeGenerator\CodeGenerator.csproj -c Release -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
```

Final original/proposed benchmark builds both passed with zero warnings/errors:

```powershell
dotnet build '<RUN>\harness\AutoPerf.Benchmarks.csproj' -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
```

Both real fresh CLI runs passed and produced the byte-identical files:

```powershell
dotnet .\artifacts\bin\CodeGenerator\Release\net12.0\CodeGenerator.dll '<OUT>\HttpHeaders.Generated.cs' '<OUT>\HttpProtocol.Generated.cs' '<OUT>\HttpUtilities.Generated.cs' '<OUT>\TransportMultiplexedConnection.Generated.cs' '<OUT>\TransportConnection.Generated.cs'
```

Scoped formatting and `git diff --check` passed:

```powershell
dotnet format whitespace .\src\Servers\Kestrel\Core\test\Microsoft.AspNetCore.Server.Kestrel.Core.Tests.csproj --verify-no-changes --no-restore --include 'C:\src\aspnetcore\src\Servers\Kestrel\shared\KnownHeaders.cs' 'C:\src\aspnetcore\src\Servers\Kestrel\Core\test\KnownHeadersTests.cs' --verbosity quiet
git diff --check
```

Initial generator and newly created harness `--no-restore` builds failed with
NETSDK1004; each was restored only after that missing-assets failure. An
unmeasured harness nullable warning was corrected before the immutable
snapshots. All preparation logs are preserved; none represents a test outcome
or additional measured comparison.

## Reproduction, closure and limits

Use clean baseline/implementation checkouts and the identical published
[harness project](harness/AutoPerf.Benchmarks.csproj), with
`-p:AspNetCoreRoot='<CHECKOUT>'` if not at its default path. Its sibling
`contract-oracles.json` is copied into the build output; the five golden files
come from the unchanged tracked generated files. Activate the pinned repository
SDK and build Release as above, restoring missing packages when required.

Preserve each complete output directory before changing source. Require
identical runtime/deps JSON and reuse the baseline harness DLL/PDB in the
proposed directory, as done here. The recursive
[91-file DLL/JSON closure](recursive-closure.json) differs **only** in
`CodeGenerator.dll`; all five golden files also match.
[Owner load/MVID receipts](assembly-loads.json) are checked against the real
loaded PE module. No raw binaries, PDBs, `bin` or `obj` are published.

Both standalone setup commands passed all fifteen cases:

```powershell
dotnet '<VARIANT>\AutoPerf.Benchmarks.dll' --verify-setups
```

All six measured commands passed using the following identical arguments in
A/B, B/A, A/B order; [execution.json](execution.json) records exact timestamps
and arguments:

```powershell
dotnet '<VARIANT>\AutoPerf.Benchmarks.dll' --filter 'AutoPerf.HeaderGenerationBenchmark*' --inProcess --exporters json csv --artifacts '<ROUND>' --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
```

The full JSON/CSV/Markdown and console reports for all six launches are under
`round-<N>-<variant>`. [summarize.ps1](summarize.ps1) regenerates the four
all-outcome/all-pair/receipt JSON files from those published raw reports:

```powershell
.\F301\summarize.ps1 -RunRoot .\F301
```

SDK 12.0.100-alpha.1.26557.102; pinned runtime
12.0.0-alpha.1.26562.105 (BDN banner .NET 12.0.0/12.0.26.56305);
BenchmarkDotNet 0.13.0, C# 13, X64 RyuJIT, concurrent server GC.
[Environment](environment.json) and independently captured
[hardware](hardware.json) retain the shared Windows host context. Builds/tests
use `-m:2`; builds and measurements were serial. No power, affinity or unrelated
process settings changed.

No end-to-end clean-build wall-clock, first-process/JIT, generated request
performance, changed-file writes, parallel generators, malformed/custom mutable
metadata, other platforms/runtimes, trimming/AOT or native attribution was
validated. Current private callbacks return non-null template fragments from
reusable sequences. Arbitrary singleton-null callbacks and exhausted one-shot
enumerables are explicitly **not** claimed equivalent to the old private
helper. Such synthetic inputs are not current production generator call sites.
