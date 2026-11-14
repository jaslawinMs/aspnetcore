# F025: pool BSON TempData serialization buffers

**Measured, fork-only text/allocation proposal with retained CPU trade-offs.**
[Draft jaslawinMs/aspnetcore#20](https://github.com/jaslawinMs/aspnetcore/pull/20).
Source: `bb78b3d6b097895c85dcd006bc2fad50908ac43d`.
Independent baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.

Replace the growable `MemoryStream` with the existing shared `PooledMemoryStream`
and copy `WrittenMemory` to the independently owned result. **The final
byte-array copy remains.** No serializer setting, type validation, empty/null
fast path, nested writer lifetime, exported API or application payload limit changes.
The shared helper's new `WriteByte` override reuses its existing span `Write`
path, avoiding the inherited one-byte array used by BSON's `BinaryWriter`.

## Measured outcome

Three comparisons consumed; **final statistics use only rounds 2-3** and the
unchanged final source. [Prototype 1](prototype-1/README.md) retains the complete
first comparison and its array allocation increases.

All **19 nonempty cases allocate less in both final pairs**, by **10.71-59.99%**.
Nine cases have lower median paired time changes and twelve have higher ones.
Eight improve time in both pairs; six regress in both. Seven larger text/Unicode
cases improve in both pairs, with **18.43-39.76% lower median paired times**.
`Text_64_1024` improves 5.04% in median but regresses 5.03% in one pair.
This is **not an all-path or weighted application-throughput improvement**.

| Case | Median paired time change | Original B/op median | Changed B/op median |
|---|---:|---:|---:|
| Text_1_1024 | -22.52% | 6,736 | 3,280 |
| Text_1_16384 | -35.34% | 83,537 | 34,000 |
| Text_8_16384 | -39.76% | 510,998.5 | 264,623 |
| Text_64_16384 | -38.65% | 4,193,028.5 | 2,109,938 |
| Unicode_1_131072 | -33.54% | 7,866,408.5 | 3,147,313.5 |
| Array_1_8 | +15.79% | 2,688 | 2,400 |
| Array_1_4096 | +8.86% | 720,100 | 589,061.5 |
| Array_1_256 | +177.38% (unstable; see below) | 38,524 | 30,463 |
| Empty | +24.59% | 0 | 0 |
| Null | +37.85% | 0 | 0 |

All 21 cases, every raw pair and allocation:
[comparison.md](comparison.md), [comparison.json](comparison.json),
[measurement-summary.json](measurement-summary.json). Negative means lower time.
The statistic is the median of **paired percentage changes**, not a ratio of
median means. No unfavorable case or sample is discarded.

**Retained CPU costs:** `Array_1_8` regresses 15.31/16.28%, about 185/196 ns;
`Array_1_4096` regresses 6.65/11.07%, about 22/36 us; `Text_8_16` regresses
8.51/6.26%; `Mixed` regresses 4.39/2.52%. Both empty/null controls regress in
both final pairs despite retaining 0 B/op. Their means remain about 1-2 ns.

**Unresolved `Array_1_256` instability:** original means are 70.637/20.483 us;
changed means 34.443/103.645 us. The pairs are **-51.24/+406.00%**. Original
round 2 and changed round 3 have standard deviations 75.433/105.814 us, with
eight samples each. All samples and the +177.38% paired median are retained.
No harmless-noise, GC, JIT or host explanation is claimed.

## Faithful contracts

The ordinary DI-resolved `BsonTempDataSerializer.Serialize` is timed, not a
reimplementation or counting wrapper. `AddMvcCore().AddNewtonsoftJson()` selects
the actual codec. Application dictionaries supply text, Unicode, integer arrays,
mixed supported values, empty and null inputs.

All 21 setups verify complete payload framing, SHA-256, returned-array ownership
and full deserialized dictionaries. Text/Unicode bytes also match an independent
BSON document/string framing oracle. The mixed setup calls the real
`CookieTempDataProvider.SaveTempData`, consumes its emitted cookies with
`LoadTempData`, and checks every restored value. Its observing codec delegates
to the actual serializer and is used **only in untimed preflight**.
See [setup-correctness.json](setup-correctness.json).

Both owning suites: **253 passed, one existing skipped**. All **50 individual
BSON outcomes**, including each `Serialize_ReturnsIndependentBsonPayloads`
row (128/4096/131072), pass original/final. Original/final **25 shared-stream
cases pass**, including actual `WriteByte` growth, sparse gaps, limits, overflow
and disposal. Compatibility stays green before/after; this is not a functional
bug-fix red/green claim.

`NewtonsoftJsonInputFormatterTest.JsonFormatter_EscapedKeys_SingleQuote` does
not reach its assertion because of its existing `Fact(Skip)` for
[dotnet/aspnetcore#39069](https://github.com/dotnet/aspnetcore/issues/39069).
The changed faithful boundary is actual BSON serialization/cookie TempData,
not this unrelated input formatter. See [correctness.json](correctness.json)
and [shared-correctness.json](shared-correctness.json).

## Protocol and binary control

BenchmarkDotNet 0.13.0; repository SDK `12.0.100-alpha.1.26557.102`;
runtime `12.0.0-alpha.1.26562.105`; server GC. In-process Short jobs with three
warmups, eight measured iterations, 100 ms target iteration time and
`DontRemove` outliers. Pair order: original/changed, changed/original,
original/changed. Runs are serial on this shared Windows host; no machine
settings change.

Final immutable snapshot `after-3` has the exact `before` harness/configuration.
Only **NewtonsoftJson and WebUtilities DLLs differ** because both compile the
changed shared helper. Eight source-unchanged dependent DLL/PDBs are frozen to
their original versions, with identical public assembly identities, before
capture. `after-2` is an unmeasured full rebuild of the same source; a closure
check rejected its extra differing dependency binaries before round 2 started.
All 21 preflight/Dry cases pass the controlled final closure. Full source-built
owning tests pass separately. See [dependency-freeze.json](dependency-freeze.json),
[assembly-hashes.json](assembly-hashes.json), [assembly-loads.json](assembly-loads.json)
and [provenance.json](provenance.json).

The installed runtime's actual `Stream.WriteByte` IL contains `newarr System.Byte`;
the runtime revision was unavailable through the public source API, so the
actual method/MVID was inspected instead. This is structural evidence, not
another timing/allocation comparison. See
[writer-source-evidence.json](writer-source-evidence.json) and
[writer-il](writer-il).

## Reproduction and exact validation

The standalone [harness](harness/AutoPerf.Benchmarks.csproj) references the checkout
through `AspNetCoreRoot`. Use independent original/final worktrees and apply the
final test-only diff to the original for the same compatibility rows. Follow
[BuildFromSource](https://github.com/dotnet/aspnetcore/blob/main/docs/BuildFromSource.md)
for SDK/static-asset prerequisites. From each repository root, activate first:

```powershell
. .\activate.ps1
dotnet build <harness>\AutoPerf.Benchmarks.csproj -c Release -m:2 -p:AspNetCoreRoot=<checkout> -p:UseIisNativeAssets=false -p:BuildNodeJS=false --nologo -v:quiet
dotnet <snapshot>\AutoPerf.Benchmarks.dll --verify-setups
dotnet test src\Mvc\Mvc.NewtonsoftJson\test\Microsoft.AspNetCore.Mvc.NewtonsoftJson.Test.csproj -c Release -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false --nologo -v:quiet --logger "trx;LogFileName=results.trx" --results-directory <test-results>
dotnet test src\Shared\test\Shared.Tests\Microsoft.AspNetCore.Shared.Tests.csproj -c Release -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false --nologo -v:quiet --filter "FullyQualifiedName~PooledMemoryStreamTests" --logger "trx;LogFileName=results.trx" --results-directory <shared-test-results>
dotnet format whitespace --folder . --include src\Mvc\Mvc.NewtonsoftJson\src\BsonTempDataSerializer.cs src\Shared\PooledMemoryStream.cs --verify-no-changes --verbosity quiet
dotnet <snapshot>\AutoPerf.Benchmarks.dll --filter "*BsonTempDataBenchmark*" --inProcess --exporters json csv --artifacts <artifacts> --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
```

Builds and 21 setup checks pass original/final. Owning tests pass 253 with the
same one skip; shared tests pass 25. Shipping-source whitespace passes.
Original/current `BsonTempDataSerializerTest.cs` whitespace checks return 2
with only **CHARSET** for its untouched UTF-8 BOM; preserve the original encoding
rather than add unrelated cleanup. No new whitespace diagnostic; `git diff
--check` passes. See [formatting.json](formatting.json).
All six steady launches contain 21 successful cases and eight measurements
per case. Full raw JSON/CSV/Markdown reports remain under `round-*`.

Cold pool rents, pressure/concurrency, typical cookie payload distribution,
HTTP throughput, other shared-helper consumer performance, native IIS/ANCM,
other runtimes and composition with other proposals are unverified. Large
payloads are stress cases, not claims about typical cookie sizes.
