# F272: invariant gRPC character casing - no supported net win

**No-gain; no speculative optimization issue or draft PR.**
Three allowed 27-case comparisons are consumed. The complete body-descriptor
cases and repeated-word-start cases are mixed, with no structural allocation
reduction. Original shipping source is restored byte-for-byte.

Independent baseline: dotnet/aspnetcore
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
[Tests-only retained branch commit](https://github.com/jaslawinMs/aspnetcore/commit/8619ce0f97b63155997b3a0e4ff434ca89478fa6):
`8619ce0f97b63155997b3a0e4ff434ca89478fa6`.
**That commit is not the measured experimental production source.**
The exact [discarded experiment](source-experiment.cs),
[two-statement diff](experiment-source.patch), [original source](source-before.cs)
and immutable original/experimental manifests are retained separately.
This experiment does not include F295's character-buffer change.

## Actual scope and interpretation

The informational card calls out character casing in identifier formatting,
but the helper does not convert every character. `ToUpper` runs only for
lowercase characters following capitalization triggers; `ToLower` only for
an initial uppercase character when Pascal=false. The experiment replaces
those two explicit invariant-culture calls with `ToUpperInvariant` and
`ToLowerInvariant`, leaving the growing result string and all branches intact.

Microsoft Learn documents both API equivalences:
[upper](https://learn.microsoft.com/en-us/dotnet/api/system.char.toupperinvariant#remarks)
and [lower](https://learn.microsoft.com/en-us/dotnet/api/system.char.tolowerinvariant#remarks).
Compatibility passes; performance justification does not follow automatically.

Bounded resolved-symbol evidence returned the definition and production
`ResolveBodyDescriptor` caller, which passes Pascal=true. The direct
Pascal=false cases prove lower-branch helper behavior, **not production
reachability of that branch**. No whole-code-graph completeness claim.

## All three comparisons

Negative changes mean lower time; medians are of paired percentage changes.

| Case | Pair 1 / 2 / 3 time change | Median paired change |
|---|---:|---:|
| Complete Body_AdditionalBindings | -3.21 / +0.34 / -1.12% | -1.12% |
| Complete Body_Custom | -2.03 / +2.33 / +5.27% | +2.33% |
| Ordinary_RepeatedStrings | +4.60 / -3.49 / +0.75% | +0.75% |
| Ordinary_SubData | +3.34 / -3.01 / -3.71% | -3.01% |
| WordStarts_ASCII_32 | -0.95 / -9.17 / +0.88% | -0.95% |
| WordStarts_Greek_32 | -2.32 / +1.07 / +1.70% | +1.07% |
| Direct Camel_SingleUpper | -12.92 / -4.47 / -2.36% | -4.47% |
| Direct Camel_HTTP | -1.88 / -4.16 / -0.36% | -1.88% |
| SingleLower | -3.14 / -5.74 / -0.63% | -3.14% |
| Unicode | -3.77 / -2.40 / -0.08% | -2.40% |
| Stress_1024 | -6.02 / -0.94 / -9.29% | -6.02% |
| Unchanged Empty | -10.49 / -1.52 / -9.60% | -9.60% |
| Unchanged Separators_32 | -1.81 / -1.22 / -0.13% | -1.22% |
| Unchanged SingleUpper | -4.39 / -0.26 / +0.01% | -0.26% |
| Unchanged BodyStar_Control | -0.78 / -0.78 / +4.89% | -0.78% |
| Unchanged BodyMissing_Control | -0.98 / +0.27 / -0.15% | -0.15% |
| Unchanged Echo_Control | +51.39 / -42.32 / +100.39% | +51.39% |

Nineteen of 27 paired medians are lower, eight higher. Eight cases are lower in
all pairs; two of those, empty and separator-only, never reach either changed
call. Small direct lower-branch wins are not established in the production
caller. Complete additional-bindings is mixed; custom is worse in two pairs.
Repeated ASCII/Greek word starts were explicitly included to amplify actual
uppercase-casing calls; neither has a repeatable win.

The repeated lower-branch single-character mean changes
18.46 / 18.53 / 18.11 to 16.08 / 17.70 / 17.68 ns.
SingleLower's -3.14% median is about 0.1-0.9 ns across pairs, while unchanged
Empty also improves. These observations are retained, not relabeled zero gain.
They do not support a material net startup/descriptor benefit.

Stress_1024's apparent repeatable -6.02% median is not a supported common-name
effect size: original means/SD are 101,982.73/4,975.49,
192,822.27/7,801.65 and 193,287.99/10,747.23 ns; changed are
95,839.72/838.42, 191,013.00/9,218.90 and 175,334.02/6,302.03 ns.
Same frozen binaries are used in all pairs. Cause of between-pair drift,
control changes or JIT effects is unverified; no harmless-noise explanation.
Echo is sub-nanosecond and its large percentages are not a material effect.

Twenty-five cases report exactly equal original/experimental heap in every
pair. The two stress cases have tiny reported differences, retained exactly:
1,024 original 1,075,205 / 1,075,210 / 1,075,212 B/op, experimental
1,075,205 / 1,075,211 / 1,075,210; 4,096 original
16,883,783 / 16,883,830 / 16,883,830, experimental
16,883,783 / 16,883,824 / 16,883,830. No structural allocation reduction claim.

[All 27 paired means/allocations](comparison.md),
[exact paired changes](comparison.json), [all 162 outcomes](raw-case-outcomes.json),
[complete variance](variance.json) and all six full JSON/CSV/Markdown/console
reports preserve every result. Three pairs closed; no fourth run or tuning.

## Faithful producer and compatibility

The timed operation calls the actual compiled formatter via a cached delegate,
or actual complete `ResolveBodyDescriptor` through a cached expression bridge.
Real Google.Protobuf descriptors and generated `Google.Api.HttpRule` properties
are used; complete Custom/AdditionalBindings lookup, property selection and
result creation are timed. Fixture setup, descriptor construction, bridge
compilation and assertions are outside timing.

Twenty-seven exact fixtures include three explicit initial-uppercase
Pascal=false cases and 32-word-start ASCII/Greek cases, not copied casing loops.
All snapshots and launches agree on exact output and actual field/property/
nonempty-value identity. Missing-body control preserves the actual exception;
star resolves an actual parameter. No timed Moq or growing retained state.

Original/experimental/restored complete suites each pass **333/333, zero skips**.
All 28 new rows individually pass on all three sources. Whole class has
29 rows, including one original fact. These are compatibility checks, not
functional bug-fix red/green evidence.

| Requirement | Evidence |
|---|---|
| Exact casing/acronyms/digits/separators/period flags/trailing marker/Unicode/surrogates; every row exercises all four flag combinations | `FormatUnderscoreName_PreservesInvariantCharacterTransitions`, all 22 rows |
| Actual Turkish culture producer and invariant uppercase/lowercase output | `FormatUnderscoreName_PreservesInvariantCasingUnderTurkishCulture`, proves `tr-TR` before exact output assertions |
| Real generated field/repetition/CLR property and nonempty distinct value identity | `ResolveBodyDescriptor_PreservesGeneratedPropertySelection`, all five rows |
| Actual formatter and complete descriptor producer, both casing paths and unchanged controls | `NameFormattingBenchmark.Setup`, all 27 matching receipts in each launch |

[All 999 test outcomes](all-test-outcomes.json), [all focused outcomes](all-correctness.json),
three complete TRX files and [actual producer receipts](setup-correctness.json)
are retained. Only 74 test lines are committed; original shipping source is exact.

## Exact successful commands

From repository root after `. .\activate.ps1`; `RunRoot` is the local F272
artifact directory. Original and experimental containing commands each passed
333/333/all 28 new rows; the restored command also passed that full matrix:

```powershell
dotnet test src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  -p:CrossgenOutput=false -p:GenerateInstallers=false --no-restore `
  --logger 'trx;LogFileName=results.trx' --results-directory "$RunRoot\tests-before" --verbosity quiet
dotnet test src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  -p:CrossgenOutput=false -p:GenerateInstallers=false --no-restore `
  --logger 'trx;LogFileName=results.trx' --results-directory "$RunRoot\tests-after" --verbosity quiet
dotnet test src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  -p:CrossgenOutput=false -p:GenerateInstallers=false --no-restore `
  --logger 'trx;LogFileName=results.trx' --results-directory "$RunRoot\tests-restored" --verbosity quiet
```

Original standalone build (new project restore) and candidate no-restore build
passed with zero warnings/errors; both frozen 27-case fixture commands passed:

```powershell
dotnet build "$RunRoot\harness\AutoPerf.Benchmarks.csproj" -c Release -m:2 `
  -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false `
  -p:GenerateInstallers=false -v quiet
dotnet build "$RunRoot\harness\AutoPerf.Benchmarks.csproj" -c Release -m:2 `
  -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false `
  -p:GenerateInstallers=false --no-restore -v quiet
dotnet "$RunRoot\binaries\before\AutoPerf.Benchmarks.dll" --verify-setups
dotnet "$RunRoot\binaries\after\AutoPerf.Benchmarks.dll" --verify-setups
```

Changed source/test, restored tests, harness whitespace and staged test checks passed:

```powershell
dotnet format whitespace src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.csproj `
  --no-restore --include src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\ServiceDescriptorHelpersTests.cs `
    src\Grpc\JsonTranscoding\src\Shared\ServiceDescriptorHelpers.cs --verify-no-changes --verbosity quiet
dotnet format whitespace src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.csproj `
  --no-restore --include src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\ServiceDescriptorHelpersTests.cs `
  --verify-no-changes --verbosity quiet
dotnet format whitespace "$RunRoot\harness\AutoPerf.Benchmarks.csproj" --no-restore `
  --include "$RunRoot\harness\Program.cs" "$RunRoot\harness\NameFormattingBenchmark.cs" `
  --verify-no-changes --verbosity quiet
git diff --cached --check
```

All six launches passed 27 cases/N=8 with memory diagnostics, original/changed,
changed/original, original/changed order:

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*NameFormattingBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" --job Short `
  --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
```

## Provenance and limits

[Standalone C#13/BDN project](harness/AutoPerf.Benchmarks.csproj) pins the runtime
and disables transitive ASP.NET shared-framework fallback. Original harness/
PDB/runtime/deps are reused exactly; 63 recursive DLL/JSON files, only owner
Transcoding DLL differs. Every measured owner path/MVID equals that snapshot's
untimed load receipt. See [hashes](assembly-hashes.json),
[loads](assembly-loads.json), [restored-source provenance](provenance.json) and
[pre-implementation criteria](pre-implementation-acceptance.md).

Source-built repository-local Microsoft.AspNetCore.App12.0.0-dev, established
during F295, is unchanged between these test variants. Native IIS/Node/R2R/
installers remain excluded. Our packaging prerequisite rewrites only the
App.Ref suppression XML BOM; exact original BOM restored, no content committed.
No repository SDK/package/NuGet manifest, global installation or machine setting
changed. No binary/PDB/bin/obj/project assets/private session paths are published.

Shared Windows, SDK12.0.100-alpha.1.26557.102/Core12.0.0-alpha.1.26562.105,
in-process/server GC; serialized measurements/two build workers.
No hosted gRPC/HTTP or production throughput, complete startup, cold runtime,
concurrency, other architectures/runtimes or F295-composition evidence.
