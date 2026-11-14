# F107: empty form-file query results

**Measured, workload-specific proposal with an explicit empty-result convention change.**
Source: `1dad2006f241e932236425bd869293a2156e348a`.
Baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Branch: `autoperf/F107-form-file-empty-results`.

GetFiles retains the original enumeration and ordinal-ignore-case comparison,
but creates its existing List only at the first match. No matches return the
shared empty IFormFile array. Nonempty results remain fresh mutable Lists.
Three files, **215 additions/two removals**: three shipping additions/two
removals, 212 test additions. No GetFile/indexer, signature, input default,
metadata cache, cross-assembly access or unrelated source changes.

## Empty-result convention is not identical

The declared return is IReadOnlyList<IFormFile>, whose documentation describes
matching files, not a mutable List. Empty snapshot contents remain correct.
However, the actual no-match result changes **List -> array**, **fresh ->
shared object identities**, and **ICollection.IsReadOnly false -> true**.
Code depending on the former concrete type/mutable downcast is not covered by
the read-only equivalence claim. A separate convention proposal will make this
review question explicit; this is not an RTM-approved API/convention change.
See the [actual original/final convention probe](empty-result-convention.json).

## One measured comparison; no tune

All 23 cases have eight retained measured samples per launch. Four empty or
one-file-miss queries, including two using actual multipart-produced
collections, are **60.78-65.00% faster**. All **nine no-match results remove
32 B/op, from 32 to zero**. Stop after one comparison under the user's large-win
rule; no further pair was run to improve the less favorable cases.

| Scope | Actual single-pair observation |
|---|---|
| Nine no-match GetFiles cases | Eight faster, **1.47-65.00%**; Miss_1024 **+1.15%**. All save exactly **32 B/op**. Empty/one-file misses, constructed and parsed, improve **60.78-65.00%**. |
| 12 nonempty GetFiles cases | **11 are 0.29-3.18% slower**, heap unchanged. All_1024 is **-10.75%**, not evidence of an empty-result gain. |
| Two unchanged GetFile controls | First_16 **3.30 -> 4.05 ns (+22.89%)**, Miss_16 **20.08 -> 20.96 ns (+4.36%)**; zero heap both sides. Retained without a noise/source-cause explanation. |

These are percentage changes of the observed means in one paired run, not
cross-run stable ranges, statistical significance or workload prevalence.
The absolute saving is small: one 32-byte List per missing-name query.
The query still scans all files; a large no-match scan need not get faster.
No nonempty allocation reduction or general/default-path throughput win is
claimed. Every case, including controls, is in [comparison.md](comparison.md)
and [measurement-summary.json](measurement-summary.json), with the complete
[original](round-1-before) and [changed](round-1-after) raw artifacts.

## Faithful measured boundary

[The runnable project](harness/AutoPerf.Benchmarks.csproj) calls the real
IFormFileCollection.GetFiles/GetFile implementation on real FormFiles.
Seventeen setups construct the public collection/file types, and six obtain
files through actual Request.ReadFormAsync/FormFeature multipart parsing.
No parser result, callback or file-collection producer is injected.

Parsed setups verify the full form field, each file's body, name, filename,
length/content type, cached form identity and initial body rewind. Each query
checks exact file reference identity and order, full count and source names
outside timing. All **23 complete receipts** agree between snapshots:
[setup-correctness.json](setup-correctness.json). Timed Query returns a reference
without result-array creation, artificial boxing or Moq invocation history.
Parsing/setup/oracle/body checks are not timed.

Only Microsoft.AspNetCore.Http.dll differs across the recursively checked
executable/configuration closure. Exact original harness DLL/PDB is reused;
runtime/dependency files agree. Actual owner assembly loads/MVIDs, original
capture dirty state and separately verified final source hashes are retained:
[provenance.json](provenance.json), [assembly-hashes.json](assembly-hashes.json),
[assembly-loads.json](assembly-loads.json), [hardware.json](hardware.json).

This is a **shared Windows host**, with serial measurements and no host-setting
changes, not a dedicated performance lab. No hosted HTTP, multipart-parser,
MVC/minimal-API default-path, browser or production no-match-frequency claim.
The local reference index returned only the declaration; that is not repository
completeness or proof that a default consumer uses this method.

## Requirement coverage

Original and changed Http suites: **346 passed/five existing skipped each**,
zero failed. All **15 new focused rows pass individually on both sides**.
Compatibility tests passing on both sides are not functional bug-fix red/green.
The actual measured zero-allocation check fails the original nine empty outputs
(32 B/op) and passes their changed outputs (zero).

| Requirement | Evidence |
|---|---|
| Empty/one/many nonmatch snapshots remain empty after source growth | `FormFileCollectionTests.GetFiles_PreservesEmptySnapshots` (three rows) |
| Case-insensitive order/identity, independent fresh nonempty results, result/source mutation isolation | `FormFileCollectionTests.GetFiles_PreservesOrderIdentityAndIndependentResults` (two rows) |
| Empty field name and ordinal Turkish-I/sharp-S distinctions | `FormFileCollectionTests.GetFiles_PreservesOrdinalNameMatching` (three rows) |
| Every actual Name getter once/in order, before/after-match exception identity | `FormFileCollectionTests.GetFiles_VisitsEachNameOnceInOrder`, `GetFiles_PreservesNameGetterExceptions` (three rows) |
| Actual getter-produced collection mutation still triggers enumeration failure | `FormFileCollectionTests.GetFiles_PreservesMutationDetectionDuringNameLookup` (two rows) |
| Actual buffered/unbuffered multipart producer, complete file bodies/metadata/order/identity and subsequent snapshot isolation | `FormFeatureTests.ReadFormAsync_MultipartFileQueries_PreserveResultsAndSnapshots` (two rows) |
| Empty concrete type/identity/mutability difference explicitly observed | `empty-result-convention.json`, `--verify-empty-convention` actual public-query probe |
| Missing-name allocation benefit at the real query boundary | Nine cases in `comparison.json`, original 32 B/op/changed zero |

[All exact focused outcomes](all-focused-test-outcomes.json) and
[correctness/skipped outcomes](correctness.json) preserve every row.
The five existing `BindingAddressTests.UnixSocketUrlsAreParsedCorrectlyOnUnix`
rows cannot reach assertions on Windows because of
`OSSkipCondition(OperatingSystems.Windows)`. They are unchanged and are not
F107 coverage; their Unix socket URL behavior was not validated instead.
F107's faithful boundary is the actual file query and multipart producer.
No new F107 test is skipped or conditionally bypassed.

## Exact successful commands

From the repository root, activate with `. .\activate.ps1` before direct dotnet
commands. `$RunRoot` is this item's private artifact root; `$Variant` is
before/after, `$BuildOutput` its build output, `$Snapshot` the immutable binary
folder, and `$Artifacts` the corresponding raw run folder.

```powershell
# Both successful builds: zero warnings/errors.
dotnet build "$RunRoot\harness\AutoPerf.Benchmarks.csproj" -c Release `
  -o "$RunRoot\build\$Variant" -m:2 -p:AspNetCoreRoot=C:\src\aspnetcore `
  -p:UseIisNativeAssets=false -p:BuildNodeJS=false --verbosity quiet
# Original/changed: all 23 complete setups passed, receipts equal.
dotnet "$BuildOutput\AutoPerf.Benchmarks.dll" --verify-setups
# Original/changed: passed; explicit differing runtime convention recorded.
dotnet "$BuildOutput\AutoPerf.Benchmarks.dll" --verify-empty-convention
# Original: all 15 focused rows individually passed.
dotnet test src\Http\Http\test\Microsoft.AspNetCore.Http.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --filter 'FullyQualifiedName~FormFileCollectionTests|FullyQualifiedName~ReadFormAsync_MultipartFileQueries_PreserveResultsAndSnapshots' `
  --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-focused-before" --verbosity quiet
# Both full suites: 346 passed/five existing Windows-skipped Unix rows; all15new passed.
dotnet test src\Http\Http\test\Microsoft.AspNetCore.Http.Tests.csproj `
  -c Release -f net12.0 -m:2 -p:UseIisNativeAssets=false -p:BuildNodeJS=false `
  --no-restore --logger 'trx;LogFileName=results.trx' `
  --results-directory "$RunRoot\tests-$Variant" --verbosity quiet
# Both launches: all23cases, eight measured samples retained for every case.
dotnet "$Snapshot\AutoPerf.Benchmarks.dll" --filter '*FormFileCollectionBenchmark*' `
  --inProcess --exporters json csv --artifacts "$Artifacts" `
  --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 `
  --outliers DontRemove
# Passed with zero diagnostics/file changes on all three files.
dotnet format whitespace --folder . `
  --include src\Http\Http\src\FormFileCollection.cs `
  src\Http\Http\test\FormFileCollectionTests.cs `
  src\Http\Http\test\Features\FormFeatureTests.cs `
  --verify-no-changes --verbosity quiet
# Passed, including staged final diff.
git --no-pager diff --check
```

SDK 12.0.100-alpha.1.26557.102, runtime 12.0.0-alpha.1.26562.105,
BenchmarkDotNet 0.13.0, in-process server GC. Failed CA2208 test compile preflight
was corrected before any snapshot/measurement; it is preserved, not counted as
a measured comparison or successful test. [Validation logs/receipts](validation).
Source history showed no behavior change since the earlier public/nonnullable
annotations/migration; bounded related searches did not prove lack of other
prior art or default consumer usage.
