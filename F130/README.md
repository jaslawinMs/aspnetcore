# F130 no-gain disposition: fixed input-type membership

Independent baseline: dotnet/aspnetcore
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Experiment source: `ad89497c38be65f0b893526060af2103c8b6e11a`.
This branch does not contain any other independent optimization.

**Disposition: no supported net win; no optimization PR.**
This does not mean every case was unchanged: some repeatable CPU improvements
were measured. The small, mixed timing gains do not justify publishing this
experiment with its persistent unexplained allocation regression.
All three allowed comparisons are consumed; there was no source tuning.

## Measured trade-offs

34 of 40 cases have lower median paired time; 6 regress. Median changes range
from **-10.82% to +7.90%**. Only 15 cases improve in every pair; the caller
text-attribute override case regresses in all three.
Plain mixed-case email, radio and file cases have repeatable improvements of
-10.82%, -9.90% and -9.89% respectively. These observations are retained,
not relabeled as zero benefit.

| Case | Median paired time change | Original B/op by pair | Changed B/op by pair |
|---|---:|---:|---:|
| Plain_MixedEmail | -10.82% | 568 / 568 / 568 | 568 / 568 / 568 |
| Plain_Radio | -9.90% | 568 / 568 / 568 | 568 / 568 / 568 |
| Attributed_MixedEmail | +7.90% | 568 / 568 / 568 | 568 / 568 / 568 |
| Attributed_Text_Override | +2.62% | 760 / 760 / 760 | 760 / 760 / 760 |
| Attributed_Checkbox | -6.18% | 568 / 568 / 568 | 835 / 835 / 841 |

The attributed checkbox allocation increase is present in **every pair**,
approximately **47%**, and remains unexplained. Other allocation measurements
also vary by launch, including apparent decreases; no allocation benefit is
claimed from those. No case, launch or measurement is discarded.
This is not diagnosed as harmless noise or proof of a particular compiler/JIT
mechanism. The three-comparison cap prevents further measurements here.

Each complete 40-case launch took approximately 23-25 minutes on this shared
host. The final [execution record](execution.json) contains exact times.
The complete evidence includes all six launches, 240 case reports, at least
eight retained measurements per case, and original/changed, changed/original,
original/changed order. Percentages are medians of paired changes, not ratios
of median times.

## What changed

Replace two private seven/six-type string-array `Contains` calls with constant
patterns. Exact ordinal, case-sensitive membership is retained, including the
extra `"number"` placeholder case and rejection of null/empty/case variants.
Remove only the directly unused arrays; retain their specification comments
at the changed predicates. Keep `suppliedTypeString`, branches and protected
hook invocations unchanged. No exported API, metadata/cache or dependency change.

The structural LINQ dispatch finding alone is not proof of a runtime gain.
The [complete paired results](comparison.md) and
[machine-readable data](comparison.json) preserve every input scenario.

## Actual producer and output boundary

`AddMvcCore().AddDataAnnotations()` configures the actual MVC metadata producer.
The attributed model has `Display.Prompt="<prompt>"`, `MaxLength(32)` and
`StringLength(16)`; the plain model lacks them. Every setup verifies actual
metadata, then asserts complete encoded HTML from the actual public
`DefaultHtmlGenerator.GenerateTextBox`.

The 40 cases cover all seven admitted types, default text type, hidden/date/
checkbox/radio/range/file/image nonmembers, uppercase/mixed-case strings, empty
and null supplied types, plus caller placeholder/maxlength overrides.
The maximum-length attribute must use the minimum declared limit (16) and
caller attributes must not be overwritten. File/image cases must omit values.

**Separate untimed preflight processes** additionally call the actual public
generator on an instrumented subclass and observe both protected hook counts.
This verifies dispatch even when plain metadata produces no attribute.
Callbacks are not manually injected. The timed process never runs that
subclass and uses the ordinary actual framework receiver only.

Original and candidate each pass all 40 direct preflights and all 40 Dry cases.
The initial valid HTML-only preflight was expanded to include hook checks
before timing; its snapshot/logs were archived, not silently overwritten.
All measured launches use the final byte-identical harness.

## Validation commands and results

Every direct .NET invocation ran from the checkout after `. .\activate.ps1`.
Original/candidate each passed **2,593 owning tests, zero skipped**:

```powershell
dotnet test .\src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj `
  -c Release --no-restore -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --logger 'console;verbosity=minimal' --logger trx `
  --results-directory "$RunRoot\tests-before" --nologo -v quiet

dotnet test .\src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj `
  -c Release --no-restore -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --logger 'console;verbosity=minimal' --logger trx `
  --results-directory "$RunRoot\tests-after" --nologo -v quiet
```

All **179 individual existing `DefaultHtmlGeneratorTest` cases** pass both,
including every maxlength theory row, minimum-limit and no-metadata case.
Existing tests were reused, not duplicated.

Changed-file whitespace and `git diff --check` passed, no baseline exceptions:

```powershell
dotnet format whitespace . --folder --verify-no-changes `
  --include .\src\Mvc\Mvc.ViewFeatures\src\DefaultHtmlGenerator.cs `
  --report "$RunRoot\formatting-final" -v quiet
```

Initial external restore/build and both final builds passed, zero warnings/errors:

```powershell
dotnet build "$HarnessRoot\AutoPerf.Benchmarks.csproj" -c Release -m:2 `
  -p:AspNetCoreRoot=C:\src\aspnetcore -p:UseIisNativeAssets=false `
  -p:BuildNodeJS=false -p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config `
  --nologo -v quiet

dotnet build "$HarnessRoot\AutoPerf.Benchmarks.csproj" -c Release --no-restore -m:2 `
  -p:AspNetCoreRoot=C:\src\aspnetcore -p:UseIisNativeAssets=false `
  -p:BuildNodeJS=false --nologo -v quiet
```

Each final variant passed all 40 metadata/full-HTML/virtual-hook checks:

```powershell
dotnet "$BuildOutput\AutoPerf.Benchmarks.dll" --verify-setups
```

Both immutable snapshots passed all 40 Dry cases:

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*InputTypeBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" `
  --job Dry --warmupCount 0 --iterationCount 1
```

Each measured launch completed all 40 cases with at least eight measurements:

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*InputTypeBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" `
  --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 `
  --outliers DontRemove
```

The above are compatibility checks and actual A/B observations, not a functional
red/green defect claim. Existing JavaScript assets were reused; native IIS assets
and Node rebuilding were disabled. No repository dependency manifest or NuGet
configuration changes.

## Reproducibility and boundaries

[The complete standalone project](harness/AutoPerf.Benchmarks.csproj) references
actual source projects through `AspNetCoreRoot`. Copy full original/changed
outputs separately and run serially. Only the ViewFeatures production assembly
differs; benchmark/runtime/dependency configurations and dependency DLLs match.
Raw manifests preserve dirty-source capture separately from the final source
revision. See [hashes](assembly-hashes.json), [actual loads](assembly-loads.json)
and [individual test outcomes](correctness.json).
The separate [setup outcomes](setup-correctness.json) retain all 40 actual
metadata/HTML/virtual-hook cases for each variant.

SDK `12.0.100-alpha.1.26557.102`, .NET 12 alpha, BenchmarkDotNet `0.13.0`,
server GC on a shared Windows/Xeon host. Client validation is disabled;
metadata creation, HTML assertions and hook instrumentation are outside timing.
This is warmed generator-only measurement, not HTTP throughput.
Cold metadata/static-array initialization, browser workflows, native IIS/ANCM,
other runtimes and composition with other branches remain unverified.
