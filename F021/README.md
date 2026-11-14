# F021: avoid reflective enum conversion during select rendering

[Draft proposal: jaslawinMs/aspnetcore#10](https://github.com/jaslawinMs/aspnetcore/pull/10).

Source proposal: `84991004fbc1662da291f3d0f1bdff6c85f3dbfc`.
Independent baseline: dotnet/aspnetcore
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.

The single comparison observed **56-67% less helper time** for enum names,
numbers, aliases and comma combinations, and **71-91% less** for unsuccessful
case-sensitive parses. Affected cases allocated approximately **232 fewer bytes
per supplied value**. All 23 cases, including unchanged-path regressions, are in
[the complete comparison](comparison.md). These are helper measurements, not
HTTP throughput.

## What changed

`DefaultHtmlGenerator.GetCurrentValues` previously closed a generic helper and
called `MethodInfo.Invoke` for every nonempty string enum value. The proposal
uses the BCL `Enum.TryParse(Type, string, out object)` overload in the existing
private helper. The now-unused reflection field and import are removed.

Case-sensitive parsing, null on failed parsing, numeric values, aliases,
comma-separated names, current-value contents and option selection are
preserved. The actual model binder intentionally has different validation and
casing rules: lowercase names bind successfully but do not become selected
numeric options through this case-sensitive rendering path. Undefined numbers
can remain in ModelState despite failed binding. Those behaviors are retained,
not presented as bugs. No exported API or persistent cache is added.

## Actual producer and observation boundary

The standalone project uses public `AddMvcCore().AddDataAnnotations()` to create
real MVC enum metadata. Its actual `EnumTypeModelBinder` and
`CollectionModelBinder<TEnum>` consume a `FormValueProvider` and produce the
ModelState read by the actual public `GetCurrentValues` implementation.

Every setup checks the metadata, complete bound collection count, error count,
attempted values and expected current-value set. In particular, all 64 invalid
inputs must reach the collection binder, produce 64 errors and remain available
to rendering. Setup does not inject synthetic ModelState or copy the parser.
Mocked constructor/view dependencies are unused by the timed operation.

Names, numeric strings, lowercase names, invalid strings, comma combinations and
aliases each have 1/8/64-value cases. Typed enum and non-enum string controls
have 1/64 values; nullable empty input is a separate control. Actual selected
options are asserted by the nine producer-to-rendering test rows, outside timing.

## Measurement and stopping rule

One original/changed comparison was run, serially, with eight measurements per
case and no outlier removal. No source tuning or second/third comparison was
needed because the affected cases met the user's large-win stopping rule.
The single-pair median is simply that comparison's percentage change.

| Case | Original ns/op | Changed ns/op | Change | Original/changed B/op |
|---|---:|---:|---:|---:|
| Names_1 | 775.49 | 336.11 | -56.66% | 760 / 528 |
| Names_64 | 39890.47 | 13427.69 | -66.34% | 33682 / 18833 |
| Numbers_64 | 40764.44 | 13424.52 | -67.07% | 33682 / 18833 |
| Combined_64 | 39767.75 | 13377.82 | -66.36% | 33489 / 18640 |
| Invalid_64 | 28474.30 | 2555.30 | -91.03% | 15058 / 208 |
| Lowercase_64 | 30048.40 | 2729.76 | -90.92% | 15058 / 208 |
| Typed_64 | 12537.08 | 13167.19 | +5.03% | 18841 / 18841 |

All 18 affected cases improved in this comparison. Four unchanged-path controls
had positive time changes: `Empty_1` +1.91%, `String_1` +3.62%, `Typed_1` +1.30%
and `Typed_64` +5.03%. `String_64` was -0.36%. Their allocations were unchanged.
These controls are retained rather than discarded. This short run on a shared
Windows host does not establish significance or a universal win. The largest
allocation counts have approximately 1-2 bytes/op of measurement variation.

## Validation commands and results

Each direct .NET invocation ran from the source checkout after
`. .\activate.ps1`. Existing JavaScript assets had already been built; native
IIS assets and Node rebuilding were disabled.

Original source: **188 focused generator tests passed, zero skipped**.
Changed source: **2,602 owning tests passed, zero skipped**. All nine new
producer/current-values/rendered-options rows passed individually on both.
They are compatibility evidence, not a functional red/green defect claim.
[Per-row outcomes and counts](correctness.json) are retained.

The final owning-suite command passed:

```powershell
dotnet test .\src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj `
  -c Release --no-restore -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --logger 'console;verbosity=minimal' --logger trx `
  --results-directory "$RunRoot\tests-after" --nologo -v quiet
```

Changed-file whitespace passed with no baseline exceptions:

```powershell
dotnet format whitespace . --folder --verify-no-changes `
  --include .\src\Mvc\Mvc.ViewFeatures\src\DefaultHtmlGenerator.cs `
            .\src\Mvc\Mvc.ViewFeatures\test\DefaultHtmlGeneratorTest.cs `
  --report "$RunRoot\formatting-final" -v quiet
```

Both standalone variants built with zero warnings/errors. The original build
restored dependencies after the external project's dependency manifest changed;
the candidate used `--no-restore` and omitted `RestoreConfigFile`.

```powershell
dotnet build "$HarnessRoot\AutoPerf.Benchmarks.csproj" -c Release -m:2 `
  -p:AspNetCoreRoot=C:\src\aspnetcore -p:UseIisNativeAssets=false `
  -p:BuildNodeJS=false -p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config `
  --nologo -v quiet
```

Both frozen variants passed all 23 Dry setup/result checks:

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*EnumSelectionBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" `
  --job Dry --warmupCount 0 --iterationCount 1
```

Each measured launch completed all 23 cases with at least eight measurements:

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*EnumSelectionBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" `
  --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 `
  --outliers DontRemove
```

## Reproducibility and limits

[The complete BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj)
references actual source projects through `AspNetCoreRoot`. Build separately
against the baseline and proposal and copy each complete output before
rebuilding the other variant. The harness also supports `--verify-setups` for a
fast, untimed fixture check. Byte-identical harness/dependency/runtime
configuration and unchanged dependency DLLs isolate the ViewFeatures assembly.
See [hashes](assembly-hashes.json), [actual loads](assembly-loads.json),
[environment](environment.json), [provenance](provenance.json) and raw reports.

The first external harness lacked a logging extension reference; an explicit
null logger registration resolved it. An initial Dry setup then found an
incomplete hosting/framework dependency closure. That failed snapshot and setup
logs were archived before recapture. All final setups passed before optimization
timing; neither failure consumed a measured comparison.

Runtime: .NET 12.0.0 alpha; SDK `12.0.100-alpha.1.26557.102`;
BenchmarkDotNet `0.13.0`, server GC on a shared Windows/Xeon host.
HTTP form parsing/throughput, browser workflows, native IIS/ANCM, other runtimes,
trimmed/NativeAOT execution and composition with other branches were not tested.
