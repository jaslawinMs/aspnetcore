# F295: bounded gRPC underscore-name formatting

**Qualified warmed metadata-formatting proposal, not a universal speedup.**
The final complete additional-bindings body descriptor is 57.63% faster by
median paired change, allocating 224 rather than 952 B/op. All three allowed
comparisons are consumed: one initial StringBuilder pair and two final bounded
character-buffer pairs. The two implementations are never aggregated.

Independent baseline: dotnet/aspnetcore
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
[Final measured source and compatibility tests](https://github.com/jaslawinMs/aspnetcore/commit/d251897b3f9dffb2b614b98345a752b47dd5f3d7):
`d251897b3f9dffb2b614b98345a752b47dd5f3d7`.
The informational finding concerns metadata-name construction, not a
demonstrated request bottleneck.

## Final measured trade-offs

The fixed 22-case matrix includes seventeen actual formatter inputs, two
complete actual body-field descriptors, and three unchanged controls.
Negative changes mean lower time; these are medians of the two paired
percentage changes, not ratios of median means.

| Case | Pair 2 / 3 time change | Median paired change | Reported B/op before to after |
|---|---:|---:|---:|
| Body_AdditionalBindings | -58.33 / -56.94% | -57.63% | 952 to 224 |
| Body_Custom | -28.06 / -25.64% | -26.85% | 328 to 176 |
| Ordinary_RepeatedStrings | -77.70 / -76.72% | -77.21% | 616 to 56 |
| Ordinary_SubData | -62.00 / -58.45% | -60.22% | 232 to 40 |
| Unicode | -53.85 / -51.98% | -52.91% | 232 to 40 |
| Medium_64 | -89.86 / -89.79% | -89.83% | 5,760 to 152 |
| Long_256 | -93.92 / -95.10% | -94.51% | 72,193 to 1,072 |
| Stress_1024 | -98.22 / -98.17% | -98.20% | 1,075,209 / 1,075,210 to 4,144 |
| Stress_4096 | -99.49 / -99.60% | -99.55% | 16,883,800 / 16,883,830 to 16,433 |
| Empty | +124.62 / +100.42% | +112.52% | 0 to 0 |
| SingleLower | +33.50 / +34.55% | +34.02% | 24 to 24 |
| SingleUpper | +32.05 / +26.78% | +29.41% | 24 to 24 |
| Separators_32 | +65.77 / +102.83% | +84.30% | 0 to 0 |

All fifteen affected nontrivial-output cases improve in both final pairs and
allocate less in each. Four small/no-output cases are slower in both pairs.
Empty changes from 2.58 / 2.87 to 5.80 / 5.75 ns; single letters add about
4-5 ns; separators change from 48.38 / 48.63 to 80.20 / 98.63 ns.
Those regressions remain part of the proposal, not hidden as controls.

Overall sixteen of 22 medians are lower and six higher. The untouched controls
change +0.72% for missing-body errors, +0.94% for star body resolution and
-3.06% for echo. Their heap is unchanged. Echo is sub-nanosecond, so its
percentage is not a material gain. Control/other variance has no verified
harmless-noise or JIT explanation.

Acronym original means differ substantially, 299.85 / 157.46 ns, while changed
means are 47.63 / 43.81 ns. Its -78.15% paired median is not an expected
production effect size. Every SD, range and outlier remains available.
Very long inputs are stress boundaries, not common protobuf-name claims.

[All 22 final paired means/allocations](comparison.md),
[exact paired changes](comparison.json),
[all 132 raw case outcomes](raw-case-outcomes.json),
[variance](variance.json), and full JSON/CSV/Markdown/console exporters for
all six launches are retained.

## Initial implementation retained separately

StringBuilder removed repeated string growth but increased allocation for
empty, single-character and separator-only inputs. Its single pair showed
51.74% faster complete additional-bindings resolution, yet allocated 104 B/op
for empty, 104 rather than 24 for each single character, and 136 rather than
zero for separators. That motivated one tune, not selective rerunning.

The exact [StringBuilder source](source-stringbuilder.cs),
[discarded source diff](stringbuilder-source.patch),
[all 22 first-pair outcomes](stringbuilder-comparison.json),
original/experimental manifests and full first-pair exporters remain distinct.
The final proposal restores zero empty/separator heap and 24 B/op single
characters, but does not eliminate their time regressions. No fourth pair.

## What changes and what is actually exercised

Replace only the growing result string and its seven append sites with an
operation-local char span and written-length counter, then construct one final
string. Inputs up to 128 characters use at most 256 bytes of stack; larger
inputs allocate a char array. The input length bounds output length because
each input contributes at most one char, including the replaced trailing #.
All original loops, branches, capitalization local, invariant casing,
separator/period handling and explanatory comments are unchanged.

The benchmark invokes the actual compiled `FormatUnderscoreName` via a cached
delegate. Complete body cases use actual Google.Protobuf descriptor production,
the actual `ResolveBodyDescriptor`, and real generated `Google.Api.HttpRule`
fields. Setup proves exact CLR property and nonempty value identity for
`Custom` and `AdditionalBindings`. Star control resolves an actual parameter;
missing-field control preserves the real exception message. Echo never reaches
the changed method.

Descriptor construction, reflection/delegate/expression-bridge compilation,
fixture values and all assertions are outside timing. The complete descriptor
lookup/property selection/result object are inside the body-case timing.
There is no copied formatter algorithm, timed Moq or growing retained state.
All 22 setup receipts match between snapshots and every measured launch:
[actual producer receipts](setup-correctness.json).
This is not a hosted transcoding endpoint or HTTP test.

Only two source files change: 87 additions and nine removals, including 76
focused-test lines. No intended public API/default/convention, process-wide
cache, new shipping dependency or assembly-boundary change.

## Requirement coverage

Original and final complete gRPC suites both pass **334/334, zero skips**.
Each of 29 new parameterized rows is individually present and passed on both
sources. The whole focused class has thirty rows, including one existing fact.
The initial StringBuilder matrix passed 328/328 on each source before six
buffer-boundary rows were added. These are optimization compatibility checks,
not functional bug-fix red/green evidence.

| Requirement | Evidence |
|---|---|
| Exact empty/separator/case/acronym/digit/period/trailing-marker/Unicode/surrogate outputs, all four flag combinations in every row | `FormatUnderscoreName_PreservesCharacterTransitions`, all eighteen rows |
| Letters, separator-only zero output and trailing-marker replacement at 0/1/127/128/129/1,024; real stack/fallback producer | `FormatUnderscoreName_PreservesOutputAtBufferBoundaries`, all six rows |
| Actual generated field/repetition/CLR property selection and distinct value identity for five body fields | `ResolveBodyDescriptor_PreservesGeneratedPropertySelection`, all five rows |
| Complete actual descriptor/formatter, star/missing/echo controls and exact property/value identity | `NameFormattingBenchmark.Setup`, all 22 receipts per snapshot/launch |

[Focused outcomes](correctness.json), [all 1,324 test outcomes](all-test-outcomes.json),
and all four full passing TRX reports are retained. The aborted pre-installation
testhost report is separately named and is not a passing test or timed launch.

## Exact successful commands

From the repository root, activate `. .\activate.ps1` before direct .NET calls.
`RunRoot` is the local F295 artifact directory. Before capture, both original
and initial/final source-built harness builds passed with zero warnings/errors:

```powershell
dotnet build "$RunRoot\harness\AutoPerf.Benchmarks.csproj" -c Release -m:2 `
  -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false `
  -p:GenerateInstallers=false --no-restore -v quiet
```

All 22 actual-owner fixtures passed on each immutable snapshot:

```powershell
dotnet "$RunRoot\binaries\before\AutoPerf.Benchmarks.dll" --verify-setups
dotnet "$RunRoot\binaries\after\AutoPerf.Benchmarks.dll" --verify-setups
dotnet "$RunRoot\binaries\after-2\AutoPerf.Benchmarks.dll" --verify-setups
```

Each of the following final commands passed 334/334/all 29 new rows:

```powershell
dotnet test src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  -p:CrossgenOutput=false -p:GenerateInstallers=false --no-restore `
  --logger 'trx;LogFileName=results.trx' --results-directory "$RunRoot\tests-before" --verbosity quiet

dotnet test src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  -p:CrossgenOutput=false -p:GenerateInstallers=false --no-restore `
  --logger 'trx;LogFileName=results.trx' --results-directory "$RunRoot\tests-after" --verbosity quiet
```

Final changed-file/harness whitespace checks and staged source diff check passed:

```powershell
dotnet format whitespace src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.csproj `
  --no-restore --include src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\ServiceDescriptorHelpersTests.cs `
    src\Grpc\JsonTranscoding\src\Shared\ServiceDescriptorHelpers.cs --verify-no-changes --verbosity quiet
dotnet format whitespace "$RunRoot\harness\AutoPerf.Benchmarks.csproj" --no-restore `
  --include "$RunRoot\harness\Program.cs" "$RunRoot\harness\NameFormattingBenchmark.cs" `
  --verify-no-changes --verbosity quiet
git diff --cached --check
```

All six launches passed all 22 measured cases/N=8 with allocation diagnostics,
in original/initial, final/original, original/final order:

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*NameFormattingBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" --job Short `
  --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
```

## Reproduction prerequisites and limits

The standalone [C# 13/BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj)
uses `AspNetCoreRoot`, pins the Core12 runtime, and disables transitive ASP.NET
shared-framework fallback. Original benchmark DLL/PDB/deps/runtime configuration
is reused exactly. Of 63 recursively checked DLL/JSON files, only the owning
Transcoding DLL differs in either implementation. Every launch records actual
owner path/MVID. See [closure](closure-final.json), [hashes](assembly-hashes.json),
[loads](assembly-loads.json), [verified provenance](provenance.json) and
[pre-implementation criteria](pre-implementation-acceptance.md).

The first repository test preparation encountered missing test/runtime assets,
pinned MessagePack source, ReadyToRun package, WiX tool and source-built
Microsoft.AspNetCore.App12.0.0-dev. Their original failure logs are retained.
Only the pinned MessagePack submodule was initialized; no tracked pointer,
SDK/package/NuGet manifest or global installation changed.

Managed source framework preparation passed:

```powershell
dotnet restore src\Framework\App.Runtime\src\App.Runtime.sfxproj `
  -p:RuntimeIdentifier=win-x64 -p:UseIisNativeAssets=false -p:BuildNodeJS=false
dotnet build src\Framework\App.Runtime\src\App.Runtime.sfxproj -c Release `
  -p:RuntimeIdentifier=win-x64 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  -p:CrossgenOutput=false -p:GenerateInstallers=false --no-restore -m:2 -v quiet
```

The resulting 136 files were hash-verified and installed only into the
repository-local `.dotnet\shared\Microsoft.AspNetCore.App\12.0.0-dev`; both
final test variants use that same framework. See
[installation hashes/exclusions](dev-framework-installation.json).
Our build removed only UTF8 BOMs from two framework suppression XML files;
exact BOMs were surgically restored, no suppression entries changed or committed.
Native IIS, Node rebuilding, ReadyToRun and installer packaging were excluded,
not verified. No preparation failure is counted as a timed launch.

SDK `12.0.100-alpha.1.26557.102`, Core runtime
`12.0.0-alpha.1.26562.105`, in-process/server GC on a shared Windows machine.
Builds/measurements serialized, two build workers, no machine settings changed.
No binary/PDB/bin/obj/project assets or private session paths are published.

Unverified: hosted gRPC/HTTP and full startup, cold runtime, concurrency,
stack/heap pressure, other runtimes/architectures, production input distribution,
and exact threshold timing. **Large separator-only inputs allocate a heap array
even though the old method allocates zero; correctness is covered, that heap/time
regression is not timed.** The bounded stack allocation is additional stack cost.
Other optimization branches are not combined into these measurements.
