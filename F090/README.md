# F090: avoid allocating validation-message Boolean strings

Source proposal: `72b916d1df6a9ddaa3348dbf2d81b541fe4e5553`.
Independent baseline: dotnet/aspnetcore
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Draft: [jaslawinMs/aspnetcore#14](https://github.com/jaslawinMs/aspnetcore/pull/14).
Issue: [jaslawinMs/aspnetcore#13](https://github.com/jaslawinMs/aspnetcore/issues/13).

All eight affected cases allocated **32 fewer bytes per generated message**
and had **4.52-10.21% lower median paired generator time** across three
comparisons. All six client-disabled controls, including regressions, remain in
[the complete table](comparison.md). This is not a throughput or all-path claim.

## What changed

One existing statement selects `"true"` / `"false"` instead of calling
`ToString().ToLowerInvariant()` on a known Boolean. The explanatory local,
predicate, branch structure and attribute-merge behavior are unchanged.
No exported API, default, cache, dependency or test file is changed.

Existing eight HTML-helper tests already assert complete rendered output,
including both Boolean attribute values, explicit messages, HTML attributes
and custom tags. They were reused rather than duplicated with constant-only
tests. All eight pass individually on original and changed source.

## Actual producer and output boundary

Each benchmark setup uses `SimpleTypeModelBinder` and a `FormValueProvider`.
The valid integer genuinely binds; the invalid integer genuinely produces an
error in the shared ModelState. The timed method is the actual public
`DefaultHtmlGenerator.GenerateValidationMessage`.

Every setup checks the complete generated HTML using the actual encoder,
including error text, CSS class and attribute values. The 14 cases cover
valid/invalid binding, null/empty/custom messages, client validation on/off and
two caller-provided `data-valmsg-replace` overrides. Client-disabled valid cases
must produce no tag. The caller override must remain `"preserved"`, not be
overwritten by either Boolean value.

The override cases still save the allocation that the original implementation
performed before attempting the non-replacing merge. No errors are directly
injected and no Boolean-conversion implementation is copied into timing.

## Measurements and regressions

Three comparisons used original/changed, changed/original, original/changed
launch order. No source tuning occurred. Every case has eight retained
measurements per launch without outlier removal. The table reports the median
of paired percentage changes, not a ratio of median times.

| Case | Median paired time change | Original/changed B/op |
|---|---:|---:|
| ClientOn_Valid_Empty | -10.21% | 224 / 192 |
| ClientOn_Valid_Null | -9.81% | 224 / 192 |
| ClientOn_Invalid_Null | -7.03% | 376 / 344 |
| ClientOn_Valid_Custom | -6.48% | 336 / 304 |
| Override_Invalid_Custom | -4.52% | 432 / 400 |
| ClientOff_Valid_Custom | +9.56% | 0 / 0 |
| ClientOff_Valid_Empty | +7.08% | 0 / 0 |

All eight affected cases improved in all three pairs. Five client-disabled
controls have positive median changes: invalid/custom +1.44%, invalid/null
+0.38%, valid/custom +9.56%, valid/empty +7.08% and valid/null +3.48%.
The largest percentage control change is roughly 1.7 ns/op. These are retained,
not dismissed as insignificant or evidence of a universal speedup.
Client-disabled invalid/empty was -2.61%; all disabled allocations were unchanged.
All three allowed comparisons are consumed.

BenchmarkDotNet abbreviated long parameter display strings. The summary uses
the raw report's full benchmark identity where necessary; original exports are
unchanged and keep those full identities as well.

## Validation commands and results

Every direct .NET invocation ran from the checkout after `. .\activate.ps1`.
Original exact-output coverage: **8 passed, zero skipped**:

```powershell
dotnet test .\src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj `
  -c Release --no-restore -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --filter 'FullyQualifiedName~HtmlHelperValidationMessageExtensionsTest' `
  --logger 'console;verbosity=minimal' --logger trx `
  --results-directory "$RunRoot\tests-before" --nologo -v quiet
```

Final owning suite: **2,593 passed, zero skipped**, including all eight
exact-output cases individually:

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
  --report "$RunRoot\formatting-final" -v quiet
```

Both standalone variants built with zero warnings/errors. The original build
restored the new external project; the candidate used `--no-restore` and omitted
`RestoreConfigFile`:

```powershell
dotnet build "$HarnessRoot\AutoPerf.Benchmarks.csproj" -c Release -m:2 `
  -p:AspNetCoreRoot=C:\src\aspnetcore -p:UseIisNativeAssets=false `
  -p:BuildNodeJS=false -p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config `
  --nologo -v quiet
```

Both snapshots passed all 14 Dry setup/result checks:

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*ValidationMessageBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" `
  --job Dry --warmupCount 0 --iterationCount 1
```

Each of six measured launches completed all 14 cases with at least eight
measurements per case:

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*ValidationMessageBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" `
  --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 `
  --outliers DontRemove
```

These are compatibility checks and actual A/B performance evidence, not a
functional red/green defect claim. The first external setup lacked the HTML
contract assembly; the explicit source reference was corrected before freezing
the baseline or running timing. Repository dependency manifests and NuGet
configuration were not changed. Existing JavaScript assets were reused;
native IIS assets and Node rebuilding were disabled.

## Reproducibility and limits

[The complete standalone project](harness/AutoPerf.Benchmarks.csproj) references
actual source projects through `AspNetCoreRoot` and supports `--verify-setups`.
Build and copy each complete output separately, then run serially.
Harness/runtime/dependency configurations and dependency DLLs are byte-identical;
only the ViewFeatures production assembly differs.

Runtime .NET 12.0.0 alpha; SDK `12.0.100-alpha.1.26557.102`;
BenchmarkDotNet `0.13.0`, server GC on a shared Windows/Xeon host.
See [provenance](provenance.json), [correctness](correctness.json),
[hashes](assembly-hashes.json), [loads](assembly-loads.json) and raw reports.
HTTP request parsing/throughput, browser workflows, native IIS/ANCM, other
runtimes and composition with the other independent branches remain unverified.
