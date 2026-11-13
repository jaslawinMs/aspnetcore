# F127: equality-only Rewrite string comparisons

Replace `string.Compare(input, _value, _stringComparison) == 0` with the matching
`string.Equals` overload **only in the Equal branch** of the real internal
`StringMatch` evaluator. The four genuine ordering branches are untouched.
The existing constructor already selects Ordinal or OrdinalIgnoreCase; this
is not a culture-correctness fix or a public API change.

Baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Proposal: `585f715c0b954f47262b31f29f8c49511dbb24ab`, branch
`autoperf/F127-rewrite-string-equality`.
The source change is one line, plus nine rows of compatibility coverage.

## Result, including regressions

[All 24 cases](comparison.md) and complete [before](round-1-before/results.json)
and [after](round-1-after/results.json) exports are retained. The raw JSON
includes iteration measurements, standard deviation and error.

At 256 characters with case-insensitive comparison:

| Scenario | Before ns/op | After ns/op | Time change |
|---|---:|---:|---:|
| Different length, shared prefix | 266.55 | 5.36 | -97.99% |
| Equal, distinct string instances | 267.74 | 20.97 | -92.17% |
| Last-character mismatch | 266.87 | 20.56 | -92.30% |

**Eight controls regress.** Ordinal first-character mismatches take about
50-59% longer (roughly 2-3 ns more). The 8-character ordinal equal case rises
from 5.43 to 7.52 ns (+38.65%). Short ordinal last mismatches and case-insensitive
first mismatches also regress. This is not a claim that every string comparison
is faster. All measured cases report **0 B/op before and after**.

Only **one measured before/after comparison** was run. The clear large gains
satisfied the requested early-stop rule; the allowance was at most three,
not a requirement to spend three. Results are one pair on a shared machine,
not independently replicated or production-throughput estimates.

## Actual producer and measurement boundary

The [benchmark project](harness/AutoPerf.Benchmarks.csproj) directly references
the production Rewrite project. Setup constructs the **actual internal
StringMatch** using its real constructor and operation enum. It binds a typed
closed delegate to the real `Evaluate(string, RewriteContext)` method and checks
the real returned match result's Success property for every parameter case.
Reflection and construction occur only in setup.

The timed method invokes that cached delegate and returns the actual production
result. No copy of the comparison implementation, reflection invocation per
operation, new friend assembly or UnsafeAccessor is used. Delegate overhead is
included in both versions; this is a matcher-level benchmark, not an isolated
BCL benchmark or an end-to-end Rewrite request.

The pattern is `/api/` plus ASCII characters. Equal inputs are separate string
instances; ignore-case inputs use uppercase characters to exercise folding.
Lengths are 8, 64 and 256, each with Equal, FirstMismatch, LastMismatch and
DifferentLength cases under both modes. DifferentLength shares the full prefix
and adds one character. No claim is made about the frequency of these shapes
in applications. HTTP parsing, Apache configuration parsing, whole-middleware
latency, other platforms and other runtimes remain outside this measurement.

The open negation proposal dotnet/aspnetcore#70556 touches the same class but
still uses Compare for equality. It is not this optimization; no negation
behavior is changed here.

## Protocol and provenance

- Windows 10.0.26300, x64, Xeon Platinum 8473C, 8 exposed cores / 16 logical
  processors; [CIM hardware](hardware.json).
- SDK `12.0.100-alpha.1.26557.102`; runtime
  `12.0.0-alpha.1.26562.105`, reported as `.NET 12.0.0 (12.0.26.56305)`.
- BenchmarkDotNet 0.13.0, Release, RyuJIT, concurrent server GC,
  `InProcessEmitToolchain`, memory diagnostics, no debugger.
- One before launch followed by one after launch; 24 cases per launch,
  3 warmups, 8 measured iterations, 100 ms iteration target, `DontRemove`
  outliers.

[Execution records](execution.json), [assembly loads](assembly-loads.json),
[source provenance](provenance.json), and [before](before-manifest.json) /
[after](after-manifest.json) manifests bind the reports to the real production
DLLs. The harness is byte-identical across versions, as are runtime and
dependency configs. Production DLL hashes differ. Source snapshots were
captured before the proposal commit from baseline HEAD plus the recorded dirty
changes; the committed production source hash matches the measured after file.
Binaries and Dry/setup-only measurements are not published as performance data.

## Commands and outcomes

From the repository root, activate first with `. .\activate.ps1`.
Managed validation uses `UseIisNativeAssets=false`; no native/IIS coverage is
claimed. Required repository build prerequisites were already prepared.

```powershell
dotnet test .\src\Middleware\Rewrite\test\Microsoft.AspNetCore.Rewrite.Tests.csproj `
  -c Release -p:UseIisNativeAssets=false --no-restore `
  --filter 'FullyQualifiedName~StringMatchTests' `
  --logger 'console;verbosity=normal' --logger trx `
  --results-directory "$RunRoot\tests-before" -v:quiet
```

Original implementation: **16 passed**, with every theory row reported.
The nine new rows cover case modes, unequal lengths, embedded nulls, Unicode
case folding versus normalization, and one-null operands.

```powershell
dotnet test .\src\Middleware\Rewrite\test\Microsoft.AspNetCore.Rewrite.Tests.csproj `
  -c Release -p:UseIisNativeAssets=false --no-restore `
  --logger 'console;verbosity=minimal' --logger trx `
  --results-directory "$RunRoot\tests-after" -v:quiet
```

Changed implementation: **486 passed, 0 failed, 0 skipped**, including all
16 matcher cases. [Counters and focused outcomes](correctness.json).
These compatibility tests intentionally pass on both versions. Performance is
supported by actual A/B measurement, not a claimed functional red/green failure.

```powershell
dotnet format whitespace .\src\Middleware\Rewrite\src\Microsoft.AspNetCore.Rewrite.csproj `
  --no-restore --verify-no-changes `
  --include .\src\Middleware\Rewrite\src\UrlMatches\StringMatch.cs -v quiet
```

**Passed**. `git diff --check` also **passed**.

```powershell
dotnet format whitespace .\src\Middleware\Rewrite\test\Microsoft.AspNetCore.Rewrite.Tests.csproj `
  --no-restore --verify-no-changes `
  --include .\src\Middleware\Rewrite\test\UrlMatches\StringMatchTests.cs -v quiet
```

**Exit 2:** the sole CHARSET diagnostic at (1,1) reproduces identically on the
unchanged baseline file. Its existing encoding was deliberately preserved.
The baseline archive check was
`dotnet format whitespace $BaselineArchive --folder --verify-no-changes --include $BaselineTestFile -v quiet`.
No new or changed-line formatting diagnostics; [evidence](formatting.json).

## Reproduce

Use the [complete harness sources](harness) with baseline and proposal checkouts.
No benchmark source needs copying into production. Build each variant into
separate immutable snapshots:

```powershell
. .\activate.ps1
dotnet build "$HarnessRoot\AutoPerf.Benchmarks.csproj" -c Release `
  -p:AspNetCoreRoot="$CheckoutRoot" -p:UseIisNativeAssets=false `
  -p:RestorePackagesPath=C:\.tools\.nuget\packages -v:quiet
```

Both original and changed harness builds **passed**, zero warnings/errors.
Copy each full `$HarnessRoot\bin\Release\net12.0` output to its own snapshot.
Verify different production DLLs and identical runtime/dependency configs,
then reuse before's benchmark DLL/PDB with after's production DLL.
The actual benchmark invocation for each snapshot was:

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" `
  --filter '*StringMatchBenchmark*' --inProcess `
  --exporters json csv --artifacts "$RoundOutput" `
  --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 `
  --outliers DontRemove
```

Both measured launches **passed**, all 24 cases measured with eight retained
iterations per case. Run serially, never alongside another build or benchmark.
