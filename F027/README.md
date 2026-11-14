# F027: avoid temporary JSON DOMs in patch conversion

[Draft proposal: jaslawinMs/aspnetcore#12](https://github.com/jaslawinMs/aspnetcore/pull/12).

Source proposal: `26967f4651973322869fe8c6c202c31c8ab21e15`.
Independent baseline: dotnet/aspnetcore
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.

The final pooled variant observed **15.80-36.46% lower median paired time**
in all 13 affected public-patch cases, with approximately 72 fewer managed
heap bytes/op after pool warmup. **This is not a clean all-path win:** an
unchanged assignable-value control was unstable and has a +127.01% median
paired change. It is retained and unexplained, not silently discarded.

## What changed

`ConversionResultProvider` previously serialized non-`JsonElement` values to a
temporary `JsonDocument`, then immediately deserialized its root. The final
proposal reuses the repository's existing `PooledMemoryStream`, calls the BCL
stream serializer, and deserializes the written UTF8 span. It avoids the
intermediate DOM and the first prototype's new payload-sized byte array.

The BCL still owns serialization settings, converters and reference handling;
writer settings are not manually duplicated. The existing `JsonElement` and
assignable-value paths remain unchanged. The pooled stream is disposed on
success and failure. Its source is compiled into this assembly, not accessed
privately across an assembly boundary. No exported API or package is added.

The shared helper originally relied on its consumer's implicit imports and
nullable context. Explicit imports and `#nullable enable` were required by this
legacy nullable-disabled consumer; its stream implementation is unchanged.

## Actual producer and output boundary

The benchmark runs actual public `JsonPatchDocument.ApplyTo` calls:

- `ConvertObject`: programmatic replacement converts one DTO shape to another.
- `CopyObject` / `CopyArray`: public copy operations deep-copy actual source values.
- `ConvertScalar`: a programmatic integer value converts to a long property.
- `JsonElement`: a patch is genuinely serialized/deserialized before application.
- `Assignable`: the same-type programmatic value bypasses conversion.

The four size-dependent shapes use 1, 16, 256 and 4,096 array elements; object
payloads additionally contain a string of that length. Every setup checks the
entire result and, where required, independent object/array identity. This does
not inject conversion callbacks or time a copied serializer.

The changed path matters for typed programmatic values and copies. A normal
deserialized `JsonElement` value already uses the original direct path; this
proposal is not claimed to accelerate that common input shape.

Six compatibility rows exercise public numeric conversion, allowed/disallowed
numeric strings, failed-conversion non-mutation, and deep-copy alias handling
with/without `ReferenceHandler.Preserve`. Changing a cloned child's text must
not change the source. All six rows pass individually on original and final code.

## Measurements, regressions and tuning

[The complete final table](comparison.md) uses **rounds 2 and 3 only**:
changed/original, then original/changed. Each launch has 18 cases and at least
eight measurements per case, without outlier removal. The table reports the
median of paired percentage changes; with two pairs this is their midpoint.

| Case | Original ns/op by final round | Changed ns/op by final round | Median paired change | Original/changed B/op |
|---|---:|---:|---:|---:|
| ConvertObject_1 | 992.71 / 1064.90 | 811.53 / 794.64 | -21.82% | 1280 / 1208 |
| ConvertObject_4096 | 177868.50 / 181309.65 | 115218.07 / 114258.12 | -36.10% | 58827.5 / 58756 |
| CopyArray_4096 | 173171.18 / 178153.21 | 112843.14 / 112135.74 | -35.95% | 49938 / 49863 |
| CopyObject_4096 | 176824.60 / 181839.39 | 114138.24 / 113691.70 | -36.46% | 58954.5 / 58878.5 |
| ConvertScalar_1 | 343.14 / 333.54 | 264.96 / 265.14 | -21.65% | 352 / 280 |
| Assignable_1 | 303.13 / 106.54 | 202.93 / 412.41 | +127.01% | 188 / 168 |

All 13 affected cases improved in both final comparisons. The four unchanged
`JsonElement` controls have median paired changes from -2.24% to +0.08%, with
unchanged allocations. `Assignable_1` changes in opposite directions between
rounds (approximately -33% and +287%). Its per-launch medians also vary, so this
cannot be explained as one discarded outlier. The original allocation counts
were 208/168 B/op versus 168/168 changed; no allocation gain is claimed for this
control. Its behavior remains an unverified performance boundary, not a
diagnosed regression or a dismissed measurement artifact.

[The rejected first prototype](prototype-1/README.md) used
`SerializeToUtf8Bytes`. It lowered affected-case time but grew large-payload
allocations roughly 40%. Its raw reports are separate and **not averaged with
the final implementation**. All three allowed comparisons are consumed; no
fourth run was made to resolve the assignable control.

Managed B/op excludes retained pool storage, cold rents and pool-pressure
behavior. Small variations in the largest allocation counts are not additional
claimed savings. This shared-host microbenchmark is not an HTTP throughput,
concurrency, cross-runtime or universal-speedup claim.

## Validation commands and results

Every direct .NET command ran after `. .\activate.ps1` from the source checkout.
Original focused suite: **19 passed, zero skipped**, including all six rows:

```powershell
dotnet test .\src\Features\JsonPatch.SystemTextJson\test\Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests.csproj `
  -c Release --no-restore -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --filter 'FullyQualifiedName~NestedObjectIntegrationTest' `
  --logger 'console;verbosity=minimal' --logger trx `
  --results-directory "$RunRoot\tests-before" --nologo -v quiet
```

Final owning suite: **253 passed, zero skipped**, including existing custom
converter coverage and all six new rows individually:

```powershell
dotnet test .\src\Features\JsonPatch.SystemTextJson\test\Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests.csproj `
  -c Release --no-restore -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --logger 'console;verbosity=minimal' --logger trx `
  --results-directory "$RunRoot\tests-after-2" --nologo -v quiet
```

Existing shared pooled-stream coverage: **25 passed, zero skipped**:

```powershell
dotnet test .\src\Shared\test\Shared.Tests\Microsoft.AspNetCore.Shared.Tests.csproj `
  -c Release --no-restore -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --filter 'FullyQualifiedName~PooledMemoryStreamTests' `
  --logger 'console;verbosity=minimal' --logger trx `
  --results-directory "$RunRoot\tests-shared" --nologo -v quiet
```

Changed C# whitespace passed, with no baseline exceptions:

```powershell
dotnet format whitespace . --folder --verify-no-changes `
  --include .\src\Features\JsonPatch.SystemTextJson\src\Internal\ConversionResultProvider.cs `
            .\src\Features\JsonPatch.SystemTextJson\test\IntegrationTests\NestedObjectIntegrationTest.cs `
            .\src\Shared\PooledMemoryStream.cs `
  --report "$RunRoot\formatting-final" -v quiet
```

All standalone variants built with zero warnings/errors. The original build
restored the newly created external project; subsequent builds used
`--no-restore` and omitted `RestoreConfigFile`:

```powershell
dotnet build "$HarnessRoot\AutoPerf.Benchmarks.csproj" -c Release -m:2 `
  -p:AspNetCoreRoot=C:\src\aspnetcore -p:UseIisNativeAssets=false `
  -p:BuildNodeJS=false -p:RestoreConfigFile=C:\src\aspnetcore\NuGet.config `
  --nologo -v quiet
```

All 18 setup/result checks passed on original, byte-array and pooled snapshots:

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*PatchConversionBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" `
  --job Dry --warmupCount 0 --iterationCount 1
```

All six measured launches completed 18 cases with at least eight measurements:

```powershell
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*PatchConversionBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" `
  --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 `
  --outliers DontRemove
```

The new tests are compatibility evidence, not a functional red/green defect
claim. Initial test assets were restored only after `NETSDK1004`. An initial
custom-options fixture lacked type metadata; cloning configured default options
fixed that fixture before timing. A transitive ASP.NET shared-framework version
mismatch was removed from the standalone harness by using explicit source
references. These resolved setup failures are not conversion defects.

## Reproducibility and limits

[The complete standalone project](harness/AutoPerf.Benchmarks.csproj) references
actual source projects through `AspNetCoreRoot`; it also supports
`--verify-setups`. Build each variant separately, copy complete outputs, then run
the copied binaries serially. Harness, runtime/dependency configurations and
dependency DLLs are byte-identical; only the JsonPatch assembly differs.

Runtime .NET 12.0.0 alpha; SDK `12.0.100-alpha.1.26557.102`;
BenchmarkDotNet `0.13.0`, server GC on a shared Windows/Xeon host.
See [provenance](provenance.json), [correctness](correctness.json),
[shared tests](shared-correctness.json), [hashes](assembly-hashes.json),
[loads](assembly-loads.json), and all raw JSON/CSV/Markdown.
HTTP request parsing/throughput, browser/native IIS workflows, other runtimes,
trimmed/NativeAOT execution, concurrent pool pressure, retained-pool memory and
composition with the other independent branches remain unverified.
