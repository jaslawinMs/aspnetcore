# F068: ModelState breadth-first enumeration

**Proposal:** use `Queue<ModelStateNode>` instead of removing element zero from
a `List<ModelStateNode>` while traversing pending ModelState nodes. Repeated
front removal shifts the remaining references in wide nested trees. Traversal
order, container skipping, entry identity and reset behavior are preserved.

Baseline production source: dotnet/aspnetcore commit
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
The final proposal commit is recorded in [provenance.json](provenance.json).
The permanent benchmark is added to the existing MVC microbenchmark project.
No shipping public API signature changes.

## Measured result and tradeoffs

[All eight cases and all three comparison rounds](comparison.md) are reported,
not just the fastest case. Negative time changes mean faster enumeration.

| Nested items | Median paired time change |
|---:|---:|
| 1 | -15.38% |
| 10 | -16.92% |
| 100 | -38.36% |
| 1,000 | -85.52% |

For 1,000 nested items, the three before means were 112.71 / 110.33 / 111.35 us;
after means were 20.74 / 15.98 / 16.03 us. Each item contributes two entries,
so this case enumerates 2,000 leaves.

**This is not a universal win.** Flat controls with 1, 10 and 100 items have
median paired slowdowns of 6.32%, 4.44% and 3.84%, respectively. The 1,000-item
flat case includes a retained first-round slowdown from 4,032.53 to 9,007.68 ns;
the other two rounds are +2.63% and -6.04%. No round or measured outlier was
discarded. This shared-machine, in-process measurement does not establish
neutral performance for that case.

Allocation increases by 8 B per enumeration in seven cases. For the largest
nested case, BenchmarkDotNet reports median allocations of 16,605 B before and
16,609 B after. This is a CPU/scaling proposal, not an allocation reduction.
These tradeoffs require maintainer judgment before any upstream submission.

## Workload and faithful boundary

The benchmark uses the real production `ModelStateDictionary.SetModelValue` to
build either flat keys (`Item0000_Id`) or collection-shaped keys
(`Items[0000].Id`), with `Id` and `Name` per item. It then uses the real public
enumerator and returns its entry count. Setup verifies that every entry is
visited. No substitute tree, copied enumeration algorithm or injected private
node is measured.

Setup, model binding and HTTP are outside the timed operation. This proves an
owning-component enumeration cost, not end-to-end request throughput or how
often an application creates these shapes. The 2,000-entry case is not claimed
to fit the default form value-count limit. Different platforms, runtimes,
workload distributions and dedicated-machine runs are unverified boundaries.

## Environment and protocol

- Windows 10.0.26300, x64; Intel Xeon Platinum 8473C, 8 exposed cores / 16
  logical processors. [Hardware](hardware.json) was read with Windows CIM;
  this older BenchmarkDotNet reports the processor as unknown.
- Repository SDK `12.0.100-alpha.1.26557.102`; repository runtime
  `12.0.0-alpha.1.26562.105`, reported as `.NET 12.0.0 (12.0.26.56305)`.
- BenchmarkDotNet 0.13.0, matching the repository; Release, RyuJIT, concurrent
  server GC, memory diagnostics, `InProcessEmitToolchain`, no attached debugger.
- Eight parameter cases per launch, 3 warmups, 8 measured iterations,
  100 ms iteration target, `DontRemove` outliers.
- Three serial comparisons: before/after, after/before, before/after.
  Exactly six successful measured launches; no further measured tuning runs.

The [harness project](harness/AutoPerf.Benchmarks.csproj) source-links the
permanent benchmark and directly project-references the production assembly.
Its runtime is pinned with roll-forward disabled. The same before-built
benchmark DLL/PDB is used with both independently built production DLLs.
This avoids a benchmark-consumer recompilation confound and also exercises the
old consumer against the changed enumerator.

[Before](before-manifest.json) and [after](after-manifest.json) manifests record
different production DLL hashes, identical harness and runtime configuration
hashes, the production source hashes and dirty state at capture. Snapshots were
built before the final source commit; their `source_revision` is the baseline
plus the explicitly recorded changes, not a claim that baseline HEAD contained
the optimization. Binaries and aborted/setup-only runs are not published.

[Execution records](execution.json) preserve exact argument arrays and run order.
`<SESSION_FILES>` replaces only the local artifact-root path.
Each round directory contains the complete JSON, CSV and Markdown exports;
JSON contains per-iteration measurements, error and standard deviation.

## Commands and outcomes

All commands ran from the repository root after `. .\activate.ps1`.
Managed-only validation used `-p:UseIisNativeAssets=false`; this is not native
or IIS validation. Required existing JavaScript build assets were generated
before these commands.

```powershell
dotnet test .\src\Mvc\Mvc.Abstractions\test\Microsoft.AspNetCore.Mvc.Abstractions.Test.csproj `
  -c Release -p:UseIisNativeAssets=false --no-restore `
  --filter 'FullyQualifiedName~GetEnumerable_' `
  --logger 'console;verbosity=normal' --logger trx `
  --results-directory "$RunRoot\tests-before" -v:quiet
```

Original implementation: **6 passed**, including both rows of the new Reset
theory and the new wide-tree traversal test.

```powershell
dotnet test .\src\Mvc\Mvc.Abstractions\test\Microsoft.AspNetCore.Mvc.Abstractions.Test.csproj `
  -c Release -p:UseIisNativeAssets=false --no-restore `
  --logger 'console;verbosity=minimal' --logger trx `
  --results-directory "$RunRoot\tests-after" -v:quiet
```

Changed implementation: **253 passed, 0 failed, 0 skipped**.
[Extracted test counters and traversal outcomes](correctness.json).
Compatibility tests intentionally pass on both implementations; the
performance claim is supported by measured A/B enumeration, not a claimed
functional red/green failure.

```powershell
dotnet build .\src\Mvc\perf\Microbenchmarks\Microsoft.AspNetCore.Mvc\Microsoft.AspNetCore.Mvc.Microbenchmarks.csproj `
  -c Release -p:UseIisNativeAssets=false --no-restore -v:quiet
```

**Passed**, zero warnings/errors.

```powershell
dotnet format whitespace .\src\Mvc\Mvc.Abstractions\src\Microsoft.AspNetCore.Mvc.Abstractions.csproj `
  --no-restore --verify-no-changes `
  --include .\src\Mvc\Mvc.Abstractions\src\ModelBinding\ModelStateDictionary.cs -v quiet
dotnet format whitespace .\src\Mvc\perf\Microbenchmarks\Microsoft.AspNetCore.Mvc\Microsoft.AspNetCore.Mvc.Microbenchmarks.csproj `
  --no-restore --verify-no-changes `
  --include .\src\Mvc\perf\Microbenchmarks\Microsoft.AspNetCore.Mvc\ModelStateDictionaryBenchmark.cs -v quiet
```

Both **passed**.

```powershell
dotnet format whitespace .\src\Mvc\Mvc.Abstractions\test\Microsoft.AspNetCore.Mvc.Abstractions.Test.csproj `
  --no-restore --verify-no-changes `
  --include .\src\Mvc\Mvc.Abstractions\test\ModelBinding\ModelStateDictionaryTest.cs -v quiet
```

**Exit 2:** ten pre-existing whitespace diagnostics on untouched lines 1001,
1116, 1143 and 1172. The same ten diagnostic positions and descriptions were
reproduced from an archive of the baseline file using
`dotnet format whitespace $BaselineArchive --folder --verify-no-changes --include $BaselineTestFile -v quiet`.
No new-line diagnostics; unrelated formatting was deliberately left unchanged.
`git diff --check` **passed**.

## Reproducing the benchmark

Prepare baseline and changed checkouts with the repository's documented
[build prerequisites](https://github.com/dotnet/aspnetcore/blob/main/docs/BuildFromSource.md).
Copy the newly added benchmark file to the same relative path in the baseline
checkout, without changing its production source. Use the same external
harness project for both:

```powershell
. .\activate.ps1
dotnet build "$HarnessRoot\AutoPerf.Benchmarks.csproj" -c Release `
  -p:AspNetCoreRoot="$CheckoutRoot" -p:UseIisNativeAssets=false `
  -p:RestorePackagesPath=C:\.tools\.nuget\packages -v:quiet
```

Run this once for each checkout and copy the complete
`$HarnessRoot\bin\Release\net12.0` output into separate immutable `before` and
`after` directories. Verify different production DLLs and identical runtime
and dependency configs. Copy only `AutoPerf.Benchmarks.dll` and its PDB from
before to after, keeping after's production DLL.

For each snapshot, the measured invocation is:

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" `
  --filter '*ModelStateDictionaryBenchmark*' --inProcess `
  --exporters json csv --artifacts "$RoundOutput" `
  --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 `
  --outliers DontRemove
```

Run the before/after pairs serially, never alongside another build or
benchmark. The published results used all three allowed comparisons.
