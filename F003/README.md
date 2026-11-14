# F003: guarded protobuf ListValue construction

**Disposition: modest measured draft proposal, not a large or universal win.**
Nine of fourteen standard-ListValue read cases improved in all three pairs.
Root-empty string deserialization has a median paired time change of **-4.80%**;
64/256 nested-empty-list cases have **-2.29%/-2.48%** medians.
There is **no structural allocation saving**. Mixed cases, moving controls,
custom-fallback variance and small allocation-reporting differences are retained.

Independent baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Source commit: [`531c65215740418197fa535fb852bf456a4ce8e3`](https://github.com/jaslawinMs/aspnetcore/commit/531c65215740418197fa535fb852bf456a4ce8e3).
Branch: `autoperf/F003-grpc-list-activation`.
This is a fork-only proposal, not an upstream submission or approval.
All three comparison pairs are consumed; no tuning or fourth pair.

## Actual owner and change

The retained card is `generic-new-constraint-activation-hot-path`.
The actual well-known converter factory selects a closed generic converter by
protobuf descriptor **full name**, not CLR identity. Therefore a replacement
cannot assume every `google.protobuf.ListValue` descriptor belongs to
`Google.Protobuf.WellKnownTypes.ListValue`.

Only the existing `ListValueConverter<TMessage>.Read` initializer changes:
the exact standard CLR type uses its direct constructor; every other CLR type
retains `new TMessage()`. The local, `PopulateList`, descriptor lookup, return,
write path and factory remain unchanged. No public API, new cache, dynamic
constructor compilation, private parser access or other converter optimization.
History is unchanged since introduction in dotnet/aspnetcore#40242.

Pinned Google.Protobuf 3.33.6's public source discusses constructor delegates,
but its `MessageParser.CreateTemplate` is internal. That remark is not measured
evidence on this runtime; no inaccessible parser factory is used.

## Measured results

Negative percentages mean faster. Each value is the median of the three **paired**
mean changes, not a pooled mean or selected best run.

| Actual complete operation | Pair 1 | Pair 2 | Pair 3 | Median |
|---|---:|---:|---:|---:|
| Root empty, string | -2.52% | -4.85% | -4.80% | -4.80% |
| Root empty, UTF8 | -2.07% | -2.80% | -3.86% | -2.80% |
| Root single value | -1.77% | -12.94% | -2.89% | -2.89% |
| Root nested-empty lists, 64 | -1.13% | -4.52% | -2.29% | -2.29% |
| Root nested-empty lists, 256 | -2.26% | -2.48% | -4.73% | -2.48% |
| Root numbers, 1024 | +0.28% | -1.09% | +0.01% | +0.01% |
| Unchanged null-root control | +2.16% | +6.65% | -3.63% | +2.16% |
| Unchanged ListValue write control | -2.38% | +1.31% | +7.40% | +1.31% |

Thirteen standard-read medians are lower and one is higher; five of fourteen
standard cases do **not** improve every pair. The large numeric-list cases are
near zero, not evidence for a broad parser-speed claim.
All four unchanged control medians are higher: null +2.16%, scalar Value
+0.45%, flat Struct +1.09%, write +1.31%. These are observations, not a causal
claim about unchanged paths.

All three custom-fallback cases have mixed paired signs. `Custom_Empty` is
especially unstable (maximum within-run coefficient of variation **67.81%**);
its apparent -8.30% median is not a repeatable fallback gain.
Some larger allocation reports differ by one to three bytes per operation;
these are published, not classified as structural heap savings.

See [all 21 cases](comparison.md), [paired data](comparison.json),
[all 126 measured outcomes](raw-case-outcomes.json), [variance](variance.json)
and every launch's full JSON/CSV/Markdown/console output below.
The closed managed Read IL grows **45 to 84 bytes** and contains both direct
construction and the generic fallback. This is not native/JIT code-size,
inlining or causal timing evidence.

## Faithful boundary and reproducibility

The timed operation is complete public `System.Text.Json` deserialization
(string and UTF8) or serialization, not a copied constructor loop.
Actual compiled `JsonContext`, `DescriptorRegistry` and `JsonConverterHelper`
create options and register real standard/custom protobuf descriptors before
timing. Each fixture checks exact complete protobuf values, order, CLR type,
fresh messages and, for root list messages, mutation isolation.
Expected values come independently from Google JsonParser; custom expected
messages use standard JSON parsing followed by custom protobuf wire parsing.

The fixed matrix contains six root-string sizes, three UTF8 cases, three
nested-empty-list sizes, nested Value/Struct, three custom-generated cases
and four null/scalar/flat/write controls. All **126 actual producer receipts**
match across both variants and all six launches.

Snapshots preserve the same original benchmark DLL/PDB/deps/runtime settings.
All **63 recursive DLL/JSON members** match except the compiled owner DLL.
Actual owner load paths/MVIDs are in [assembly-loads.json](assembly-loads.json).
The final source and rebuilt owner reproduced the measured guarded source/owner
hashes before the final source commit. Manifests record baseline HEAD plus dirty
candidate/test files at capture; [provenance.json](provenance.json) maps the final
source commit and hashes, rather than claiming the captured informational version
was built from a later commit.

Configuration: shared Windows 11 Enterprise 10.0.26300, guest-exposed Intel Xeon
Platinum 8473C, eight cores/16 logical processors; repository SDK
12.0.100-alpha.1.26557.102 and Core 12.0.0-alpha.1.26562.105; BenchmarkDotNet
0.13.0, Release/in-process/server GC, three warmups, eight retained measured
iterations, 100 ms iteration target, `DontRemove`. Pairs are A/B, B/A, A/B.
No power, affinity or unrelated process changes. See [hardware](hardware.json),
[environment](environment.json), [execution](execution.json),
[closure hashes](dependency-closure.json) and [acceptance](acceptance.json).

## Requirement coverage

Original, guarded and final suites each pass **313/313, zero skips**.
All ten ListValue rows, including every one of the eight new rows, are individually
accounted for in the TRX files. Compatibility is not a reproduced functional bug.

| Requirement | Evidence |
|---|---|
| Complete empty/single/mixed values, order, fresh message and root collection isolation | `JsonConverterReadTests.ListValue_Read_PreservesValuesAndFreshCollections`, all three rows pass on original/guarded/final |
| Real generated custom CLR contract through the actual factory | `JsonConverterReadTests.ListValue_CustomClrType_PreservesGeneratedContract`, both empty/mixed rows pass on original/guarded/final |
| Root-null preemption | `JsonConverterReadTests.ListValue_NullRoot_PreservesNullResult`, passes on original/guarded/final |
| Invalid object/scalar exception type | `JsonConverterReadTests.ListValue_InvalidRoot_PreservesJsonException`, both rows pass on original/guarded/final |
| Exact-type guard is necessary | The same two custom rows fail with `InvalidCastException` under the unguarded direct-constructor mutation; eight other focused rows pass; restoring the measured guard passes the complete final suite |
| Full serializer, UTF8, nested, custom and control measurements | `ListValueActivationBenchmark.Execute`, all 21 actual fixtures and 126 measured outcomes/producer receipts |
| Independent source, identical harness/dependencies, closed budget | Source commit and strict provenance, 63-member owner-only closure, six successful launches/three pairs |

### Retained preparation failures

The first custom test fixture used a noncanonical protobuf file name. Google's
JSON parser expected an object before the ASP.NET serializer ran, so both custom
comparison rows failed. Attempting canonical `google/protobuf/struct.proto`
metadata then failed in the pinned Grpc.Tools producer due to its standard
import shadowing. No global import configuration was changed.

The working generated fixture retains canonical full names/field schema with
a different CLR namespace and a noncanonical file name. Its independent oracle
uses standard JSON parsing plus custom wire parsing. The **actual ASP.NET**
factory/deserializer accepts it; no claim that Google's own JSON parser does.
Both earlier failures are retained, not presented as shipping defects or timing.

The expected negative guard mutation is also preserved, distinct from the
measured candidate. A final TRX consumer had a PowerShell whitespace syntax
error after the suite passed; correcting the reader parsed the same retained
passing report without a gratuitous test or benchmark rerun.
All **1,264 individual test outcomes** are published: the successful suites,
the two preparation failures and two expected mutation failures.

## Commands and reproduction

Run from the repository root after `. .\activate.ps1`. The existing local
source-built `Microsoft.AspNetCore.App\12.0.0-dev` is required by testhost;
[F295 prerequisites](../F295/README.md) document its source-build/setup boundary.
Native IIS, Node, ReadyToRun and installer generation are disabled for these
managed-only builds. No SDK/feed/global manifest changes were made.

The exact successful containing command, with `$r` denoting the local F003 run
directory, was run separately for `tests-before`, `tests-after`, `tests-final`:

```powershell
dotnet test src\Grpc\JsonTranscoding\test\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests\Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests.csproj -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false --no-restore --logger 'trx;LogFileName=results.trx' --results-directory "$r\tests-before" --verbosity quiet
```

Result for each variant: **313 passed, zero failed, zero skipped**.
The negative mutation adds `--filter 'FullyQualifiedName~JsonConverterReadTests.ListValue'`
and uses `"$r\tests-unguarded-mutation"`: expected **8 passed, 2 InvalidCastException
failures, 10 total**, both required custom rows accounted for.

The standalone build used the same managed flags:

```powershell
dotnet build "$r\harness\AutoPerf.Benchmarks.csproj" -c Release -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false --no-restore -v quiet
dotnet "$r\binaries\before\AutoPerf.Benchmarks.dll" --verify-setups
dotnet "$r\binaries\after\AutoPerf.Benchmarks.dll" --verify-setups
dotnet "$r\binaries\before\AutoPerf.Benchmarks.dll" --inspect-activation
dotnet "$r\binaries\after\AutoPerf.Benchmarks.dll" --inspect-activation
```

Results: build passed; **21/21 fixtures per snapshot passed**; both managed
activation inspections completed. Full first restore/build log is retained.
For each recorded variant/round, the exact timing command was:

```powershell
dotnet "$r\binaries\$variant\AutoPerf.Benchmarks.dll" --filter '*ListValueActivationBenchmark*' --inProcess --exporters json csv --artifacts "$r\round-$round-$variant" --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
```

Result: **all six launches passed, all 21 cases each measured eight times**.
All exact expanded arguments and order are in `execution.json`.
Final scoped `dotnet format whitespace ... --no-restore --include <changed-file>
--verify-no-changes --verbosity quiet` checks and `git diff --check` passed;
expanded formatter commands are in `formatting.json`, with retained logs.

For an independent replay, use a clean clone on the source branch above and a
separate checkout of `autoperf-results`. Keep the committed compatibility tests/
proto fixture present in both source variants. Copy the byte-identical published
`source-before.cs` over the owner file, build/test and copy the complete benchmark
output to a new baseline directory. Then copy `source-final.cs`, build/test and
copy the complete candidate output to a new directory. Set
`-p:AspNetCoreRoot=<your-repository-root>` when building the published
`harness\AutoPerf.Benchmarks.csproj`. The proto remains under the committed
testasset path; it is not supplied by the original baseline commit alone.

Before timing, verify all dependency JSON/DLL hashes match except the owner and
reuse the original harness DLL/PDB in the candidate, as in this evaluation.
Run the commands above in alternating order; do not overwrite this evidence.
Raw binaries/PDBs/build output are intentionally not published.

Cold converter construction, hosted gRPC/HTTP throughput, workload distribution,
concurrency/GC pressure, other runtimes/platforms, trimming/Native AOT, native
code and composition with other drafts are **unverified**. Small observed
microbenchmark gains do not resolve those boundaries.
