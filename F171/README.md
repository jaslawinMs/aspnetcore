# F171: rejected OWIN cancellation-default TryAdd rewrite

**Rejected, with no shipping change or optimization PR.** Replacing the
`owin.CallCancelled` ContainsKey/indexer-set branch with generic
`IDictionary.TryAdd` changes the actual public constructor's behavior for
caller-supplied Items: Add succeeds where the original indexer setter throws.
The original and restored containing suites pass 37/37; the prototype passes
36/37 and fails exactly that newly added compatibility case.

All eight existing-key benchmark cases also allocate **24 additional B/op**.
Missing-key cases and the untouched request-only control have unchanged
allocation. One diagnostic comparison, twelve cases per launch, was retained;
there is no tuning or second/third comparison because compatibility failed.
Six cases have lower observed times and six higher, from -2.91% to +5.47%.
These small one-pair differences do not establish repeatable speed gains.

The [tests-only source branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F171-owin-cancellation-default)
contains 109 additions in the existing test file at
[`5148d6571c`](https://github.com/jaslawinMs/aspnetcore/commit/5148d6571c).
**That final commit is not the measured prototype.** The original source,
exact discarded [prototype](prototype-source.cs), [patch](prototype-source.patch),
and their immutable-capture SHA-256 hashes remain in [provenance](provenance.json).
Shipping source was restored byte-for-byte to default main
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.

## Complete-producer boundary

Eleven cases construct the real `OwinEnvironment`; one creates only a real
`DefaultHttpContext` as an untouched control. Fresh cases include actual context
and Items creation plus the complete OWIN constructor. Existing input values
are created outside timing. Three reused-context cases retain stable Items
counts and exact existing object identity; there is no growing result or timed
Moq history. The faulting dictionary is a separate unit-test compatibility
boundary, not a successful benchmark fixture.

The actual default Items producer is Http's lazy internal `ItemsDictionary`,
exposed publicly as `IDictionary<object, object?>`. Generic TryAdd still uses
ContainsKey/Add; it does not provide access to the owning private Dictionary's
native insertion path. Passing `CancellationToken.None` also eagerly boxes on
present-key paths. No shared boxed token, cross-assembly private access, other
constructor/default change, or manifest change was retained.

Real request-lifetime feature precedence is established by setting the actual
public `RequestAborted` property. This does not validate network abort delivery.
Relevant already-shipped feature-map allocation work is
dotnet/aspnetcore#58917, commit
`fd3fe12cec7cc0b8b820e414a39fd5cae10abcc2`; its historical gains are not reused
as this experiment's results. F172 is the separate version-default finding.

## Every measured outcome

[Complete comparison](comparison.md), [machine-readable paired results](comparison.json),
[all 24 raw case statistics](raw-case-outcomes.json),
[original raw JSON](round-1-before/results.json), and
[prototype raw JSON](round-1-after/results.json) retain all cases and outliers.
Eight actual measurement samples were required per case. In particular,
Fresh_Object prototype SD is 75.35 ns against a 695.54 ns mean; do not interpret
that case's +5.21% as a precise universal regression.

| Case group | Before -> prototype B/op | Observation |
|---|---:|---|
| Five fresh/passed-in existing-key values | 1,856 -> 1,880 | +24 B/op for every case; time mixed |
| Three reused existing-key contexts | 568 -> 592 | +24 B/op each; time +1.83%, +4.59%, +5.47% |
| Fresh/default and Dictionary absent key | 1,880 -> 1,880 | time -0.60%, -2.91% |
| Lifetime feature with absent fallback | 1,904 -> 1,904 | time +1.29% |
| Request-only untouched control | 1,024 -> 1,024 | time -0.09% |

Measurements ran serially on the shared Windows box using SDK
12.0.100-alpha.1.26557.102, runtime 12.0.0-alpha.1.26562.105,
BenchmarkDotNet 0.13.0, in-process/server GC. Machine configuration and other
users' processes were not changed. Cold runtime, concurrent contexts, hosted
HTTP throughput, other runtimes/architectures, and composition with other
proposals are unverified.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| Actual default/Dictionary/SortedDictionary absent, boxed None, cancelled, null and arbitrary values; identity, unrelated entries, version and context storage | `OwinEnvironmentCancellationDefaultPreservesItemValues`: all 15 rows pass in original, prototype and restored suites |
| Real lifetime-feature precedence for cancellable and cancelled tokens, independent of fallback None | `OwinEnvironmentCancellationDefaultPreservesLifetimeFeature`: both rows pass in all three suites |
| Original caller Items setter exception propagated by real public constructor | `OwinEnvironmentCancellationDefaultPreservesItemsSetterException`: original/restored pass; prototype fails with `Assert.Throws() Failure: No exception was thrown` |
| Complete conventional-input producer/constructor and stable reused contexts | [24 actual setup receipts](setup-correctness.json), twelve identical receipts per measured launch |
| Exact immutable owner-only A/B closure | [66 recursive DLL/JSON hashes](assembly-hashes.json), [actual locations/MVIDs](assembly-loads.json), identical original harness DLL/PDB/runtime/deps |

All [111 containing-test outcomes](all-test-outcomes.json) and the original,
prototype and restored TRX files are retained. The experimental failure is
intentional evidence, not a suppressed test. The final branch is fully passing.

## Exact commands and results

Run from the source repository root and activate `. .\activate.ps1` first in
each new command session. `<RUN>` is a local artifact directory; the standalone
project accepts `-p:AspNetCoreRoot=<CLONE>` for a different clone location.

```powershell
dotnet test src\Http\Owin\test\Microsoft.AspNetCore.Owin.Tests.csproj -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false --no-restore --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-before' --verbosity quiet
```

**Passed 37/37, including all 18 new rows.** The identical command with
`tests-after` against the prototype **failed exactly the setter-exception test:
36 passed/1 failed**. With `tests-restored`, **passed 37/37/all 18 rows**.

```powershell
dotnet build '<RUN>\harness\AutoPerf.Benchmarks.csproj' -c Release -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false -v quiet
dotnet '<RUN>\binaries\before\AutoPerf.Benchmarks.dll' --verify-setups
dotnet '<RUN>\binaries\after\AutoPerf.Benchmarks.dll' --verify-setups
dotnet format whitespace src\Http\Owin\test\Microsoft.AspNetCore.Owin.Tests.csproj --no-restore --include src\Http\Owin\test\OwinEnvironmentTests.cs --verify-no-changes --verbosity quiet
dotnet format whitespace '<RUN>\harness\AutoPerf.Benchmarks.csproj' --no-restore --include '<RUN>\harness\Program.cs' '<RUN>\harness\CancellationDefaultBenchmark.cs' --verify-no-changes --verbosity quiet
```

**Build passed without warnings/errors; both frozen setup checks passed all
twelve cases; both formatting checks passed.** Prototype build used the same
command plus `--no-restore` and passed. The rebuilt harness DLL differed during
uncaptured preparation; standard snapshot reuse replaced it with the exact
original DLL/PDB before timing. [Preparation receipt](binary-preparation.json)
and [final closure](prototype-closure.json) distinguish those states.

```powershell
dotnet '<RUN>\binaries\<before-or-after>\AutoPerf.Benchmarks.dll' --filter '*CancellationDefaultBenchmark*' --inProcess --exporters json csv --artifacts '<RUN>\round-1-<before-or-after>' --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
```

**Both launches passed, twelve cases each, N=8 each.** Exact launch arguments
and timestamps are in [execution.json](execution.json); no discarded launch.
Reproduce on the baseline and then apply only the discarded prototype patch
for the diagnostic A/B comparison. The final tests-only branch intentionally
does not ship that experiment.
