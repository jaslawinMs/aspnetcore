# F049: avoid exceptions for ordinary-file multipart form conversion

**Draft [jaslawinMs/aspnetcore#49](https://github.com/jaslawinMs/aspnetcore/pull/49)**;
originating issue [jaslawinMs/aspnetcore#48](https://github.com/jaslawinMs/aspnetcore/issues/48).
Immutable complete raw evidence:
[4e112ddabeca1f0e440fd2c135877d6ca76e62af](https://github.com/jaslawinMs/aspnetcore/tree/4e112ddabeca1f0e440fd2c135877d6ca76e62af/F049).

**Measured fork-only draft proposal, not a universal net-performance win.**
Actual fresh-reader form conversion and complete body/reader consumption is
**58.91% faster for eight ordinary-file sections**, **60.31% faster for32**
and **38.79% faster for mixed-eight input**, by median of two paired mean ratios.
File8 saves1920 B/op; mixed8 saves960 B/op.

**Retained regressions:** star-only files keep the constructor/exception
fallback and report **104 additional B/op**, **25.75% slower direct conversion**
and **6.65% slower full-reader work** in the final medians. Both final pairs
have the same allocation penalty. All eight measured valid-form helper
allocations match, but six time medians are higher; bare form-data is faster
and quoted-form signs are mixed. Valid-form full-reader medians are also
slightly higher. Untouched controls and variance remain visible.

All three permitted comparisons are consumed. Round1's full-predicate shape
was rejected for additional valid-form filename-star decoding/allocation;
only final `after-2` rounds2/3 enter headline medians. No fourth comparison.

Originating issue: https://github.com/jaslawinMs/aspnetcore/issues/48. Source [1a1d5ef6064236e36b80beb9cfec6da9b183a7b3](https://github.com/jaslawinMs/aspnetcore/commit/1a1d5ef6064236e36b80beb9cfec6da9b183a7b3), independent branch `autoperf/F049-form-section-without-exception`.
Baseline: fresh upstream main `37e809ead5824bc753a1c3d56f11615bdb1296c5`.

## Actual owner and preserved contracts

Original `MultipartSectionConverterExtensions.AsFormDataSection` constructs
`FormMultipartSection` and catches its `ArgumentException` for expected
file/non-form/unparseable inputs. The [exact source diff](source.patch) changes
only that try-block and adds one focused real-reader test class.
`AsFileSection`/F048, constructors, public signatures and the outer null
validation/catch remain unchanged.

The final guard parses the existing disposition inside the original try/catch,
then rules out absent/unparseable/non-form-data disposition or a decoded
nonempty ordinary filename (`FileName.Length > 0`). Disposition matching stays
case-sensitive. Existing `FormMultipartSection(section, header)` still owns
filename-star decoding and final validity.

This deliberately narrower gate does **not** avoid the star-only file exception
path. It also does not promise unchanged timing/heap for every MIME-encoded
empty ordinary filename or arbitrary malformed/custom header partition.
Empty/invalid filename-star forms, quoted empty ordinary filename, both-empty
parameters, bare/empty-name forms and filename precedence remain correct.
The first prototype used the full existing `IsFormDisposition` predicate before
the same constructor; its extra valid-form decode cost motivated the tune.

[Owner history](owner-history.log) and the [bounded existing-PR query](existing-prs.json)
are retained. The narrow query returned no AsFormDataSection result; this is
not exhaustive repository-wide duplicate proof.

## Faithful producer, consumption and immutable closure

The identical [pinned harness](harness) fixes31 cases in two classes:
seventeen direct conversion/parser/control cases and fourteen full-reader cases.
The actual source-built `MultipartReader` creates every section from real CRLF
multipart wire bytes. No cloned parser, injected callback or per-call reflection.

Direct conversion retains the real setup-produced reader/input lifetime and
does not consume body bytes during timing. Full reader work creates a fresh
stream/reader every invocation, converts/counts actual form/file metadata,
copies every body to `Stream.Null`, and reads the final boundary. Fresh stream,
reader, async/copy, dispatch and checksum costs are included identically.
Body/wire construction and correctness hashes are outside timing.
Default payload suffix is32 characters; large mixed suffix is4096; distinct
section-index prefixes preserve multi-section ordering.

[Original oracles](contract-oracles.json) retain complete dispositions,
file/form names, filename, file/form section/body identity flags, stream offset,
body length/hash and operation checksum. Every one of **186 measured producer
receipts** matches those31 original real-reader captures. Setups additionally
execute the measured operation and check its checksum. Full
[setup-correctness.json](setup-correctness.json) and six console logs retain
that evidence, not just a setup-count summary.

The actual loaded WebUtilities path/MVID is checked against its PE module.
Original owner MVID: `dfb4e2c0-8cea-4284-b3a5-958377141061`.
The original measured harness DLL/PDB/runtime/deps are reused in both
prototypes. Both recursively complete61-file DLL/JSON inventories differ
**only** in `Microsoft.AspNetCore.WebUtilities.dll`: see
[round1 closure](recursive-closure.json) and
[final closure](recursive-closure-after-2.json).
Final report-safe revalidation also rebuilt a byte-identical final owner and
restored the exact measured source. No binaries/PDBs/`bin`/`obj` are published.

## Final source: all31 outcomes, rounds2/3 only

Serial order A/B, B/A, A/B. Each of186 outcomes has eight observations,
three warmups,100ms iteration time and `DontRemove` outliers.
Negative time percentage means faster; positive allocation delta means worse.
Medians are medians of paired **mean ratios**, not significance or
production-throughput estimates. Both allocation deltas are retained.

| Case | Pair2% | Pair3% | Median% | Before B/op median | After B/op median | Delta B/op pair2 / pair3 | Max CV% |
|---|---:|---:|---:|---:|---:|---|---:|
| Control_FileConverter | -0.12 | 6.86 | 3.37 | 400.00 | 400.00 | 0.00 / 0.00 | 6.57 |
| Control_FileReader_8 | -0.73 | -1.56 | -1.15 | 18217.00 | 18217.00 | 0.00 / 0.00 | 3.29 |
| Control_HeaderParser | 0.16 | 7.15 | 3.65 | 216.00 | 216.00 | 0.00 / 0.00 | 5.73 |
| Control_ReaderOnly_8 | -5.45 | -3.08 | -4.26 | 14560.00 | 14560.00 | 0.00 / 0.00 | 8.34 |
| Convert_Attachment | -88.61 | -88.41 | -88.51 | 456.00 | 216.00 | -240.00 / -240.00 | 6.79 |
| Convert_EmptyFilename | 6.21 | 10.89 | 8.55 | 352.00 | 352.00 | 0.00 / 0.00 | 6.52 |
| Convert_EmptyStar | 6.56 | 1.51 | 4.04 | 664.00 | 664.00 | 0.00 / 0.00 | 6.95 |
| Convert_FileEmptyStar | -81.17 | -81.93 | -81.55 | 568.00 | 328.00 | -240.00 / -240.00 | 4.27 |
| Convert_FilePlain | -84.97 | -85.44 | -85.20 | 512.00 | 272.00 | -240.00 / -240.00 | 4.60 |
| Convert_FileStar | 26.27 | 25.24 | 25.75 | 880.00 | 984.00 | 104.00 / 104.00 | 2.78 |
| Convert_FormBothEmpty | 3.27 | 7.35 | 5.31 | 720.00 | 720.00 | 0.00 / 0.00 | 6.08 |
| Convert_FormEmptyName | 6.42 | 0.64 | 3.53 | 256.00 | 256.00 | 0.00 / 0.00 | 4.89 |
| Convert_FormNoName | -12.34 | -6.37 | -9.35 | 80.00 | 80.00 | 0.00 / 0.00 | 4.15 |
| Convert_FormPlain | -3.01 | 8.42 | 2.71 | 288.00 | 288.00 | 0.00 / 0.00 | 4.60 |
| Convert_FormQuoted | -5.63 | 5.53 | -0.05 | 296.00 | 296.00 | 0.00 / 0.00 | 3.86 |
| Convert_InvalidStar | 3.35 | 11.01 | 7.18 | 496.00 | 496.00 | 0.00 / 0.00 | 3.53 |
| Convert_Malformed | -96.73 | -96.97 | -96.85 | 240.00 | 0.00 | -240.00 / -240.00 | 1.08 |
| Convert_Missing | -98.82 | -98.92 | -98.87 | 240.00 | 0.00 | -240.00 / -240.00 | 1.44 |
| Convert_Uppercase | -86.26 | -85.90 | -86.08 | 512.00 | 272.00 | -240.00 / -240.00 | 5.50 |
| Read_EmptyStar_1 | -1.20 | 6.59 | 2.70 | 6584.00 | 6584.00 | 0.00 / 0.00 | 7.90 |
| Read_FilePlain_1 | -42.55 | -47.36 | -44.96 | 6440.00 | 6200.00 | -240.00 / -240.00 | 6.57 |
| Read_Files_32 | -61.28 | -59.34 | -60.31 | 62605.50 | 54922.00 | -7683.00 / -7684.00 | 9.13 |
| Read_Files_8 | -58.38 | -59.43 | -58.91 | 19041.00 | 17121.00 | -1920.00 / -1920.00 | 4.92 |
| Read_FileStar_1 | 7.85 | 5.45 | 6.65 | 6856.00 | 6960.00 | 104.00 / 104.00 | 3.83 |
| Read_Form_1 | 5.58 | -1.62 | 1.98 | 6120.00 | 6120.00 | 0.00 / 0.00 | 9.12 |
| Read_Forms_8 | 1.70 | 2.87 | 2.28 | 16553.00 | 16553.00 | 0.00 / 0.00 | 8.55 |
| Read_Malformed_1 | -45.19 | -52.41 | -48.80 | 6000.00 | 5760.00 | -240.00 / -240.00 | 4.79 |
| Read_Missing_1 | -48.18 | -58.29 | -53.23 | 5768.00 | 5528.00 | -240.00 / -240.00 | 6.23 |
| Read_Mixed_8 | -40.19 | -37.38 | -38.79 | 17833.00 | 16873.00 | -960.00 / -960.00 | 4.35 |
| Read_MixedLarge_8 | -35.94 | -34.20 | -35.07 | 17833.00 | 16873.00 | -960.00 / -960.00 | 3.54 |
| Read_Uppercase_1 | -38.38 | -41.97 | -40.17 | 6432.00 | 6192.00 | -240.00 / -240.00 | 6.90 |

Six guarded direct rejection cases save240 B/op. Full file8 saves1920 B/op;
file32 saves7683-7684 B/op; mixed8 and large mixed8 save960 B/op.
Those common-case gains do not erase the low-CV star-only fallback regression:
helper pairs +26.27/+25.24%, full reader +7.85/+5.45%, each +104 B/op.
No allocation-cause/JIT explanation is asserted.

Final valid-form helper heap matches in all eight cases. Six helper time
medians are higher (+2.71 to +8.55%); bare form-data is -9.35%, quoted form is
mixed (-0.05% median). Full form1/form8/empty-star1 medians are
+1.98/+2.28/+2.70%. The untouched file-converter is -0.12/+6.86%
(+3.37% median); header parser +0.16/+7.15% (+3.65% median).
Their shifts are not attributed to this seam. All controls/CVs remain in the
table, including final file32 maximum CV9.13%.

## Rejected full-predicate round1: all31 outcomes

The first `IsFormDisposition` guard repeats the constructor's validation for
valid forms. Empty filename-star/both-empty forms add312 B/op with
+44.42/+37.98% helper time; invalid-star forms add144 B/op/+37.32%.
The tuned source removes those measured valid-form heap penalties.
The untouched file-converter's round1 +98.64% time/CV42.70% is unstable and
not attributed to the change. [Exact first source](source-experiment.cs) and
[final measured source](source-after-2.cs) are retained separately.

| Case | Pair1 time% | Before B/op | After B/op | Delta B/op | Max CV% |
|---|---:|---:|---:|---:|---:|
| Control_FileConverter | 98.64 | 400.00 | 400.00 | 0.00 | 42.70 |
| Control_FileReader_8 | 4.83 | 18217.00 | 18217.00 | 0.00 | 3.20 |
| Control_HeaderParser | 3.02 | 216.00 | 216.00 | 0.00 | 1.06 |
| Control_ReaderOnly_8 | 10.02 | 14560.00 | 14560.00 | 0.00 | 2.52 |
| Convert_Attachment | -89.14 | 456.00 | 216.00 | -240.00 | 1.45 |
| Convert_EmptyFilename | 4.43 | 352.00 | 352.00 | 0.00 | 3.74 |
| Convert_EmptyStar | 44.42 | 664.00 | 976.00 | 312.00 | 1.22 |
| Convert_FileEmptyStar | -82.45 | 568.00 | 328.00 | -240.00 | 2.93 |
| Convert_FilePlain | -84.67 | 512.00 | 272.00 | -240.00 | 1.67 |
| Convert_FileStar | -74.27 | 880.00 | 640.00 | -240.00 | 2.20 |
| Convert_FormBothEmpty | 37.98 | 720.00 | 1032.00 | 312.00 | 5.31 |
| Convert_FormEmptyName | 9.79 | 256.00 | 256.00 | 0.00 | 1.69 |
| Convert_FormNoName | 6.33 | 80.00 | 80.00 | 0.00 | 1.00 |
| Convert_FormPlain | 12.63 | 288.00 | 288.00 | 0.00 | 2.00 |
| Convert_FormQuoted | 8.38 | 296.00 | 296.00 | 0.00 | 1.43 |
| Convert_InvalidStar | 37.32 | 496.00 | 640.00 | 144.00 | 1.49 |
| Convert_Malformed | -96.76 | 240.00 | 0.00 | -240.00 | 1.55 |
| Convert_Missing | -98.89 | 240.00 | 0.00 | -240.00 | 1.72 |
| Convert_Uppercase | -86.09 | 512.00 | 272.00 | -240.00 | 1.38 |
| Read_EmptyStar_1 | 17.32 | 6584.00 | 6896.00 | 312.00 | 3.58 |
| Read_FilePlain_1 | -41.82 | 6440.00 | 6200.00 | -240.00 | 1.47 |
| Read_Files_32 | -59.83 | 62605.00 | 54922.00 | -7683.00 | 1.57 |
| Read_Files_8 | -55.86 | 19041.00 | 17121.00 | -1920.00 | 2.14 |
| Read_FileStar_1 | -35.45 | 6856.00 | 6616.00 | -240.00 | 2.06 |
| Read_Form_1 | 19.77 | 6120.00 | 6120.00 | 0.00 | 2.92 |
| Read_Forms_8 | 7.93 | 16553.00 | 16553.00 | 0.00 | 6.97 |
| Read_Malformed_1 | -45.87 | 6000.00 | 5760.00 | -240.00 | 2.64 |
| Read_Missing_1 | -47.31 | 5768.00 | 5528.00 | -240.00 | 7.44 |
| Read_Mixed_8 | -39.44 | 17833.00 | 16873.00 | -960.00 | 1.39 |
| Read_MixedLarge_8 | -34.21 | 17833.00 | 16873.00 | -960.00 | 2.64 |
| Read_Uppercase_1 | -40.87 | 6432.00 | 6192.00 | -240.00 | 4.36 |

[raw-case-outcomes.json](raw-case-outcomes.json) retains all means, standard
deviations, heap and iteration counts; [all-paired-outcomes.json](all-paired-outcomes.json)
retains93 paired rows. **Do not use [all-paired-summary.json](all-paired-summary.json)'s
cross-prototype history medians as final results.**
[final-paired-summary.json](final-paired-summary.json) selects only `after-2`
rounds2/3.

## Correctness and report-safe identities

Original/full-predicate/final and two report-safe revalidations each pass
**562 tests with the same two existing Windows platform skips**, all21
focused rows. That is **2810 passing outcomes/ten existing platform skips**.
Full [TRX files](tests-after-report-safe/results.trx),
[focused results](correctness.json) and [all-test-outcomes.json](all-test-outcomes.json)
are retained.

Two long rejection headers originally had indistinguishable truncated xUnit
display prefixes. Their filename-star parameters were moved first without
changing values to preserve the distinction in reports.
[Initial test source](tests-initial.cs) and all three earlier passing suites
remain available. Final [test source](tests-final.cs) and both final original/
proposed suites have **21 unique display identities**, all individually checked.
This reporting-only adjustment changes neither shipping source nor the
frozen harness and consumes no additional benchmark comparison.

| Requirement | Evidence |
|---|---|
| Actual-reader files/non-forms return null without consuming/changing body; reader completes | `FormMultipartSectionConversionTests.AsFormDataSection_NonFormReaderSection_ReturnsNullWithoutConsumingBody` (eleven rows) |
| Exact form name, section/body identity and real GetValueAsync value/body completion | `FormMultipartSectionConversionTests.AsFormDataSection_FormReaderSection_PreservesNameIdentityAndValue` (nine rows) |
| Null receiver retains ArgumentNullException and exact parameter | `FormMultipartSectionConversionTests.AsFormDataSection_NullSection_ThrowsArgumentNullException` |
| Disputed section production, metadata and complete ordered body consumption |31 original real-reader oracles;186 matching setup receipts |
| Exact measured source/owner and owner-only executable experiment | Both61-file closures; final source and rebuilt owner byte-equal after report-safe revalidation |

These preserve already-correct behavior; no fabricated functional red/green
bug is claimed. Original owner timing/heap establishes only the measured cost.
Existing skips are the read/write buffering Unix-file-mode tests on Windows,
not skipped proposal assertions. No test failure or additional measured run
was hidden.

## Exact successful commands and reproduction

Every direct .NET command session first activated `. .\activate.ps1` from
`C:\src\aspnetcore`. This exact command **passed** for `before`, `after`,
`after-2`, `before-report-safe` and `after-report-safe`:

```powershell
dotnet test .\src\Http\WebUtilities\test\Microsoft.AspNetCore.WebUtilities.Tests.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-<variant>'
```

The new harness's first build (same command without `--no-restore`) **passed**;
final original/prototype/proposal builds **passed with zero warnings/errors**:

```powershell
dotnet build '<RUN>\harness\AutoPerf.Benchmarks.csproj' -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
```

Oracle capture and all three immutable setup checks **passed all31 cases**:

```powershell
dotnet '<RUN>\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' --capture-oracles '<RUN>\contract-oracles.json'
dotnet '<RUN>\binaries\<snapshot>\AutoPerf.Benchmarks.dll' --verify-setups
```

Scoped formatting and source `git diff --check` **passed**:

```powershell
dotnet format whitespace .\src\Http\WebUtilities --folder --include .\src\Http\WebUtilities\src\MultipartSectionConverterExtensions.cs .\src\Http\WebUtilities\test\FormMultipartSectionConversionTests.cs --verify-no-changes --verbosity quiet
git diff --check
```

All six measured commands **passed** with identical arguments and serial
timestamps in [execution.json](execution.json):

```powershell
dotnet '<VARIANT>\AutoPerf.Benchmarks.dll' --filter '*Multipart*Benchmark*' --inProcess --exporters json csv --artifacts '<ROUND>' --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
```

Use clean baseline/final checkouts, the same published harness/sibling oracle
JSON, activated pinned SDK and `-p:AspNetCoreRoot='<CHECKOUT>'` as needed.
Freeze complete build outputs before changing source; reuse original harness
DLL/PDB/runtime/deps and require owner-only closure. Verify setups before timing.
Both classes must run: seventeen/fourteen cases in two JSON reports per launch.
No fresh stream is exhausted and reused for full-reader timing.

All six raw console/BDN logs and both complete JSON/CSV/Markdown/HTML reports per
launch are published under `round-<N>-<variant>`. The analyzer strictly checks
all31 identities/eight observations across both reports, serial order and all
186 original-matching receipts. This command **passed** and reproduced all
five derived JSON files **byte-identically**:

```powershell
.\summarize.ps1 -RunRoot .
```

SDK12.0.100-alpha.1.26557.102; runtime12.0.0-alpha.1.26562.105
(BDN .NET12.0.0/12.0.26.56305); BDN0.13.0, C#13,
X64 RyuJIT, concurrent server GC. [Environment](environment.json) records the
shared Windows11 Enterprise10.0.26300/Xeon Platinum8473C guest,
eight cores/sixteen logical/~64GiB. Builds/tests/measurements were serialized
with build `-m:2`; other host activity is uncontrolled. No power/affinity or
unrelated process settings changed.

Other malformed/custom/MIME-encoded empty ordinary filename allocations,
cold/JIT/exceptional memory-pressure behavior, HTTP/application/network
throughput, concurrency, other runtimes/platforms and native/control attribution
are unverified. This is a reviewable common-case tradeoff, not an approved
universal fix.
