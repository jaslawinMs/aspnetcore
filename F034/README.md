# F034: concrete Rewrite condition enumeration

**Disposition: no-gain on this machine and runtime. No optimization PR created.**

The [experiment branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F034-rewrite-condition-enumeration)
preserves the candidate and compatibility tests at
`e1551d3fcde0c030e1addccd8c8309810b2f307a`. It is not proposed for merge.
Baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.

F119 is the same card and same `ConditionCollection.GetEnumerator` finding,
with a different recorded end line. It is consolidated into this evaluation;
there is no duplicate experiment, comparison allowance, or PR.

## Result

Three interleaved comparisons were completed: **before/after, after/before,
before/after**, with 27 cases per launch and eight retained measurements per
case. No tuning change or fourth comparison was made.

The 24 actual evaluator scenarios show **no allocation reduction**. Median
paired time changes range from **-8.14% to +7.95%**, including regressions and
variation between equivalent early-exit cases. The three unchanged interface
controls also retain their 40 B/op allocation; their median paired time changes
range from -0.29% to +0.19%. These observations do not establish a sufficiently
consistent benefit to justify promoting this candidate.

[Every case and round](comparison.md) is retained, not only favorable results.
The six round folders contain complete JSON, CSV and Markdown exports, including
iteration measurements and uncertainty. Source-level boxing does not by itself
prove that a heap allocation remains in the measured consumer. No JIT
disassembly was collected, so no particular JIT optimization is asserted.

This is a no-gain disposition for this bounded workload and pinned runtime,
not proof that concrete enumerators never help other consumers or runtimes.

## Candidate and actual measurement boundary

The candidate returns `List<Condition>.Enumerator` from the concrete pattern
method and adds an explicit generic interface adapter. The existing nongeneric
adapter is untouched. Both the collection and its element type are internal;
there is no exported framework API change.

The [complete benchmark project](harness/AutoPerf.Benchmarks.csproj) references
the production Rewrite project. Setup uses public `AddIISUrlRewrite` to parse
real XML into the actual internal collection. It checks the resulting count
and binds a typed expression to the actual `ConditionEvaluator.Evaluate`
method. No collection traversal or matching algorithm is copied into the
evaluator benchmark. Reflection, XML parsing and expression compilation are
outside the timed operation.

`Eval_All_*` and `Eval_Any_*` select real MatchAll and MatchAny grouping.
Counts are 1, 4 and 16. `Pass` means every literal input matches; `Fail` means
none match; `First` and `Last` place one failure at the respective position.
Inputs are `ok` or `miss`, matched against the real regex `^ok$`, case
sensitively, with `trackAllCaptures=false`.

The production evaluator retains its actual early-exit/skip behavior: MatchAll
stops on the first failure; MatchAny skips later matching after success while
continuing traversal. Several count-one and early-failure cases are equivalent
paths, not independent workload populations. `Iface_*` controls enumerate the
same parser-produced collection through its unchanged nongeneric interface.

The timed evaluator operation returns its actual Success result as 0/1. It
uses the real `RewriteContext` constructor and its initialized builder; literal
patterns and regex matching do not need an HTTP context or prior rule captures.
This measures that component boundary, including pattern/matcher allocations
and delegate overhead on both versions. It does not measure HTTP requests,
rule actions, capture consumption, native IIS, alternate capture settings,
other operating systems, AOT, or other runtimes.

## Correctness and formatting

From the repository root, first activate with `. .\activate.ps1`.

```powershell
dotnet test .\src\Middleware\Rewrite\test\Microsoft.AspNetCore.Rewrite.Tests.csproj `
  -c Release -p:UseIisNativeAssets=false --no-restore `
  --filter 'FullyQualifiedName~ConditionCollectionTests' `
  --logger 'console;verbosity=normal' --logger trx `
  --results-directory "$RunRoot\tests-before" -v:quiet
```

Original implementation: **4 passed**, including all three count rows.
Traversal order and object identity are checked through the concrete, generic
interface and nongeneric interface paths. Mutation invalidation is preserved.

```powershell
dotnet test .\src\Middleware\Rewrite\test\Microsoft.AspNetCore.Rewrite.Tests.csproj `
  -c Release -p:UseIisNativeAssets=false --no-restore `
  --logger 'console;verbosity=minimal' --logger trx `
  --results-directory "$RunRoot\tests-after" -v:quiet
```

Candidate: **481 passed, 0 failed, 0 skipped**, including all four compatibility
cases. [Exact outcomes](correctness.json). These tests intentionally pass on
both versions; they are not a claimed functional red/green reproduction.
Both versions also passed all 27 Dry setup/result checks before measurement.

```powershell
dotnet format whitespace .\src\Middleware\Rewrite\test\Microsoft.AspNetCore.Rewrite.Tests.csproj `
  --no-restore --verify-no-changes `
  --include .\src\Middleware\Rewrite\test\IISUrlRewrite\ConditionCollectionTests.cs -v quiet
```

**Passed**, as did `git diff --check`.

```powershell
dotnet format whitespace .\src\Middleware\Rewrite\src\Microsoft.AspNetCore.Rewrite.csproj `
  --no-restore --verify-no-changes `
  --include .\src\Middleware\Rewrite\src\IISUrlRewrite\ConditionCollection.cs -v quiet
```

**Exit 2**, solely CHARSET at (1,1). The identical diagnostic was reproduced
against the unchanged file and `.editorconfig` archived from the baseline,
using `dotnet format whitespace $BaselineArchive --folder --verify-no-changes --include $BaselineSource -v quiet`.
The original UTF-8 BOM was preserved; [exact diagnostic comparison](formatting.json).
Managed validation does not cover native IIS assets.

## Reproduce and provenance

Use the complete harness with separate baseline and experiment checkouts.

```powershell
. .\activate.ps1
dotnet build "$HarnessRoot\AutoPerf.Benchmarks.csproj" -c Release `
  -p:AspNetCoreRoot="$CheckoutRoot" -p:UseIisNativeAssets=false `
  -p:RestorePackagesPath=C:\.tools\.nuget\packages -v:quiet
```

Both final harness builds **passed**, zero warnings/errors. Copy each complete
`$HarnessRoot\bin\Release\net12.0` output into an immutable snapshot. Verify the
runtime/dependency configurations match, then reuse before's benchmark DLL/PDB
with after's production DLL.

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" `
  --filter '*ConditionEnumerationBenchmark*' --inProcess `
  --exporters json csv --artifacts "$RoundOutput" `
  --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 `
  --outliers DontRemove
```

**All six launches passed**, with all 162 case results measured. Dry smoke uses
`--job Dry --warmupCount 0 --iterationCount 1` instead and is not timing evidence.
An initial harness setup requiring unnecessary HTTP implementation dependencies
failed before measurement; the final literal-pattern boundary above passed
every setup assertion on both versions.

SDK `12.0.100-alpha.1.26557.102`, runtime
`12.0.0-alpha.1.26562.105` (reported as `.NET 12.0.0 (12.0.26.56305)`),
BenchmarkDotNet 0.13.0, Release, RyuJIT, concurrent server GC,
InProcessEmitToolchain and memory diagnostics. See [runtime](environment.json),
[hardware](hardware.json), [execution](execution.json),
[actual assembly loads](assembly-loads.json), [source provenance](provenance.json),
and [before](before-manifest.json)/[after](after-manifest.json) manifests.
The production DLLs differ; the harness and runtime/dependency configurations
are byte-identical across versions. Snapshots precede the experiment commit;
the committed source matches the measured after hash.

Measurements ran serially on a shared Windows machine. Other machine activity
was not controlled. No production throughput or universal performance claim
is made, and raw binaries are not published.
