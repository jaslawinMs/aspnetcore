# F172: rejected OWIN version-default TryAdd rewrite

**Rejected; no shipping optimization, issue or PR.** Generic
`IDictionary.TryAdd` calls Add rather than the caller's Items indexer setter.
The actual public `OwinEnvironment(HttpContext)` constructor therefore succeeds
instead of propagating the original version setter exception. Original and
restored suites pass 39/39, including all 20 new rows; the discarded prototype
passes 38/39 and fails exactly that compatibility case.

One diagnostic twelve-case comparison was retained, with **unchanged allocation
in all twelve cases**. Seven observed times are lower and five higher. No tuning
or additional pairs were run because compatibility failed. The apparent
Fresh_Absent -17.25% is not a supported repeatable headline: original mean/SD
are 770.09/92.23 ns, versus prototype 637.26/10.13 ns, with only eight samples.
The untouched request-only control also changes by -4.93%. All observations,
including Fresh_Custom +6.38%, are retained without a causal noise/JIT claim.

## Source and faithful boundary

This is independent of F171 and every other proposal, based on freshly fetched
default main `37e809ead5824bc753a1c3d56f11615bdb1296c5`. F172 changes only the
version-default seam in the discarded experiment; CallCancelled is unchanged.
The string argument does not have F171's eager token-boxing cost.

The [final tests-only branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F172-owin-version-default),
commit [`325da6e666`](https://github.com/jaslawinMs/aspnetcore/commit/325da6e666),
contains 112 test additions and **no shipping source change**.
It is not the measured prototype. Exact [prototype source](prototype-source.cs),
[patch](prototype-source.patch), original source and separate SHA-256 identities
are preserved in [provenance.json](provenance.json). Shipping source was restored
byte-for-byte after the diagnostic run.

Eight fresh cases time actual `DefaultHttpContext`/Items creation and the complete
real OWIN constructor: six default-Items version states and two Dictionary cases.
Three reused-context cases retain bounded default/32/1,024-padding Items and
exact existing version/token identities. The twelfth is request-only and never
creates OWIN. Input objects and fixture assertions are outside timing.
The caller-dictionary fault test invokes the real public constructor; it is not
a timed mock or a claimed successful conventional benchmark fixture.

Actual default Items are produced by Http's lazy internal `ItemsDictionary`,
exposed as public IDictionary. Generic TryAdd still performs ContainsKey/Add;
no native private-dictionary insertion path or cross-assembly access was added.
Relevant already-shipped allocation history is dotnet/aspnetcore#58917,
commit `fd3fe12cec7cc0b8b820e414a39fd5cae10abcc2`; historical gains are not
substituted for current results.

## Evidence and requirement coverage

[All paired outcomes](comparison.md), [machine-readable comparison](comparison.json),
[24 raw statistics](raw-case-outcomes.json), [original JSON](round-1-before/results.json)
and [prototype JSON](round-1-after/results.json) retain every case and outlier.
Fresh cases allocate 1,880 B/op, reused cases 568 B/op, and the request-only
control 1,024 B/op in both variants.

| Requirement | Evidence |
|---|---|
| Actual default/Dictionary/SortedDictionary Items with absent/custom/empty/null/object/default version; exact identities, unrelated entry, cancellation token and context/count | `OwinEnvironmentVersionDefaultPreservesItemValues`: all 18 rows pass on original, prototype and restored source |
| Caller version setter exception propagated by actual public constructor | `OwinEnvironmentVersionDefaultPreservesItemsSetterException`: original/restored pass; prototype fails with `Assert.Throws() Failure: No exception was thrown` |
| Repeated real context does not replace version/token identities or grow Items | `OwinEnvironmentVersionDefaultPreservesRepeatedContext`: passes in all three suites |
| Complete conventional producer/constructor fixtures | [24 actual setup receipts](setup-correctness.json): twelve identical receipts per measured launch, each fixture verified twice |
| Immutable owner-only A/B provenance | [66 recursive DLL/JSON hashes](assembly-hashes.json); only Owin.dll differs; exact original harness DLL/PDB/runtime/deps reused; [actual locations/MVIDs](assembly-loads.json) |

All [117 test outcomes](all-test-outcomes.json) and three complete TRX files are
retained. The experimental failure is not suppressed; the final branch passes.

## Exact commands and results

From repository root, activate `. .\activate.ps1` first in every new command
session. `<RUN>` is the local evidence directory; the standalone project
supports `-p:AspNetCoreRoot=<CLONE>` for a different clone location.

```powershell
dotnet test src\Http\Owin\test\Microsoft.AspNetCore.Owin.Tests.csproj -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false --no-restore --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-before' --verbosity quiet
```

**Passed 39/39/all 20 rows.** Identical command with `tests-after` on the
prototype **failed only the setter-exception case: 38 passed/1 failed**.
With `tests-restored`, **passed 39/39/all 20 rows**.

```powershell
dotnet build '<RUN>\harness\AutoPerf.Benchmarks.csproj' -c Release -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false -v quiet
dotnet '<RUN>\binaries\before\AutoPerf.Benchmarks.dll' --verify-setups
dotnet '<RUN>\binaries\after\AutoPerf.Benchmarks.dll' --verify-setups
dotnet format whitespace '<RUN>\harness\AutoPerf.Benchmarks.csproj' --no-restore --include '<RUN>\harness\Program.cs' '<RUN>\harness\VersionDefaultBenchmark.cs' --verify-no-changes --verbosity quiet
dotnet format whitespace src\Http\Owin\test\Microsoft.AspNetCore.Owin.Tests.csproj --no-restore --include src\Http\Owin\test\OwinEnvironmentTests.cs --verify-no-changes --verbosity quiet
```

**Build passed, zero warnings/errors; both frozen fixture checks passed all
twelve cases; both formatters passed.** Prototype build added `--no-restore`
and passed. [Uncaptured preparation](binary-preparation.json) is distinguished
from [final owner-only closure](prototype-closure.json); the original harness
was reused before capture/timing, not regenerated per measured variant.

```powershell
dotnet '<RUN>\binaries\<before-or-after>\AutoPerf.Benchmarks.dll' --filter '*VersionDefaultBenchmark*' --inProcess --exporters json csv --artifacts '<RUN>\round-1-<before-or-after>' --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
```

**Both launches passed, twelve cases each, N=8 each**, no discarded launch.
Exact timestamps/arguments are in [execution.json](execution.json).
Reproduce against baseline plus the discarded patch, not the restored
tests-only final commit.

SDK 12.0.100-alpha.1.26557.102, runtime 12.0.0-alpha.1.26562.105,
BenchmarkDotNet 0.13.0, in-process/server GC, serial measurements on the shared
Windows machine. Other users' processes and machine settings were unchanged.
Hosted/network throughput, concurrency, cold runtime, other architectures/
runtimes, composition and exhaustion of every alternative remain unverified.
