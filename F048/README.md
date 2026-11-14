# F048: avoid exceptions for common non-file multipart sections

**Measured, fork-only draft proposal; not a universal net-performance claim.**
The final raw-parameter guard reports **57.88% faster eight-form-section work**,
**60.23% faster 32-form-section work**, and **38.57% faster mixed-eight-section
work** by median of two paired mean ratios. These full cases include the actual
fresh `MultipartReader`, conversion and complete body/reader consumption.

**Tradeoffs:** two empty-present filename fallbacks are **26.32-30.69% slower
and allocate 104 additional B/op** in both final comparisons. All six valid-file
conversion helper medians are higher (1.10-6.61%), although allocations match.
Full `Read_Files_8` is +3.91% by median. The unchanged form-converter control
reaches **72.33% maximum within-launch CV**. No causal explanation or universal
production speedup is claimed.

All three permitted comparisons were consumed. Round1 is the rejected
full-`IsFileDisposition` prototype; **only rounds2/3 use the final `after-2`
source**, and only those two enter the headline medians. No fourth comparison
or hidden rejected result.

Originating issue: https://github.com/jaslawinMs/aspnetcore/issues/46. Source: [5376571090fc50c48eb5a8b6c7d138713eb3422f](https://github.com/jaslawinMs/aspnetcore/commit/5376571090fc50c48eb5a8b6c7d138713eb3422f), independent branch `autoperf/F048-file-section-without-exception`.
Baseline: upstream main `37e809ead5824bc753a1c3d56f11615bdb1296c5`.

## Actual owner, source change and preserved behavior

The original `MultipartSectionConverterExtensions.AsFileSection` constructs
`FileMultipartSection` for every section; its constructor throws
`ArgumentException` for ordinary non-file inputs, which the existing extension
catch maps to null. The [exact source diff](source.patch) changes only that
try-block and adds one focused real-reader test class. Public signatures,
constructors, outer null validation/catch and independent `AsFormDataSection`
(F049) remain unchanged.

The final guard parses the existing content-disposition header inside the
original try/catch and uses public `NameValueHeaderValue.Find` to rule out absent
filename parameters without decoding them. Disposition equality remains
case-sensitive. Existing `FileMultipartSection(section, header)` still owns
filename decoding and final validity. This is a necessary, not sufficient,
file classification gate. Empty/invalid present filename parameters still reach
the original constructor/catch path; their additional measured heap cost is
retained without inventing an explanation.

Quoted empty filename and empty filename-star alone remain non-files. A
nonempty ordinary filename plus empty filename-star remains a valid file whose
result filename is empty. Tests cover missing/unparseable headers, bare
`form-data`, uppercase disposition, attachment/inline, unrelated parameters,
quoted/spaced names, missing name, extended-name decoding and precedence.
The bare header can lazily materialize public `Parameters`; its correctness is
covered but this exact allocation/timing path is **not in the frozen corpus**.

[Owner history](owner-history.log) and the [bounded existing-PR query](existing-prs.json)
are retained. The query includes an unrelated `ReadAsStringAsync` optimization;
it is not exhaustive duplicate proof.

## Faithful producer and measured operation

The identical [pinned harness](harness) contains two benchmark classes: seventeen
direct conversion/header/control cases and fourteen full-reader cases. All 31
definitions were fixed before snapshots. The actual source-built
`MultipartReader` produces every disputed section from CRLF multipart wire
bytes; there is no cloned parser, fabricated callback or per-operation reflection.

Direct conversion cases retain their real reader/input lifetime from setup and
call the actual extension without consuming the body. Full-reader cases create
a fresh stream/reader each invocation, convert/count actual section metadata,
copy every body to `Stream.Null`, and read the final boundary. Fresh reader,
stream, async/copy, dispatch and checksum costs are included identically.
Multi-section bodies include distinct section indices, preserving order.
Default payload suffix is32 characters; the large mixed suffix is4096.
Wire construction/hashing is outside timing, not body production/consumption.

Each setup compares exact dispositions, file/form names, filename, nullable
section/body identity flags, stream offsets, body byte count/hash and complete
operation checksum against the original [31 real-reader receipts](contract-oracles.json).
All **186 measured producer receipts** match those originals. Full
[setup-correctness.json](setup-correctness.json) and complete console logs are retained.
The harness also checks the actually loaded WebUtilities path/MVID against its
PE metadata; the original owner MVID is `dfb4e2c0-8cea-4284-b3a5-958377141061`.

The original measured harness DLL/PDB/runtime/deps were reused for both
prototypes. Two recursively complete61-file DLL/JSON manifests differ **only**
in `Microsoft.AspNetCore.WebUtilities.dll`; see
[round1 closure](recursive-closure.json) and [final closure](recursive-closure-after-2.json).
Source/build/snapshot identities are retained separately. No binaries, PDBs,
`bin` or `obj` are published.

## Final source: all 31 outcomes, rounds2/3 only

Serial order was A/B, B/A, A/B. Each of186 outcomes has eight measured
observations, three warmups,100ms iteration time and `DontRemove` outliers.
Negative time change is faster; positive allocation delta is worse. Medians
are medians of paired **mean ratios**, not statistical significance or
production throughput estimates. Both per-pair allocation deltas are shown.

| Case | Pair2% | Pair3% | Median% | Before B/op median | After B/op median | Delta B/op pair2 / pair3 | Max CV% |
|---|---:|---:|---:|---:|---:|---|---:|
| Control_FormConverter | 11.19 | -0.23 | 5.48 | 288.00 | 288.00 | 0.00 / 0.00 | 72.33 |
| Control_FormReader_8 | -0.19 | 0.27 | 0.04 | 16553.00 | 16553.00 | 0.00 / 0.00 | 3.57 |
| Control_HeaderParser | 1.48 | -2.70 | -0.61 | 216.00 | 216.00 | 0.00 / 0.00 | 4.55 |
| Control_ReaderOnly_8 | -2.50 | -0.18 | -1.34 | 14560.00 | 14560.00 | 0.00 / 0.00 | 3.71 |
| Convert_Attachment | -88.72 | -88.78 | -88.75 | 464.00 | 216.00 | -248.00 / -248.00 | 1.32 |
| Convert_EmptyFilename | 30.79 | 30.59 | 30.69 | 520.00 | 624.00 | 104.00 / 104.00 | 1.04 |
| Convert_EmptyStar | 27.26 | 25.38 | 26.32 | 832.00 | 936.00 | 104.00 / 104.00 | 2.39 |
| Convert_FileEmptyStar | 10.41 | 2.77 | 6.59 | 1040.00 | 1040.00 | 0.00 / 0.00 | 6.86 |
| Convert_FileNoName | 5.24 | 3.39 | 4.31 | 304.00 | 304.00 | 0.00 / 0.00 | 2.77 |
| Convert_FilePlain | 2.91 | 5.93 | 4.42 | 400.00 | 400.00 | 0.00 / 0.00 | 3.92 |
| Convert_FileQuoted | 6.60 | 6.61 | 6.61 | 408.00 | 408.00 | 0.00 / 0.00 | 3.76 |
| Convert_FileStar | 3.33 | 0.05 | 1.69 | 1464.00 | 1464.00 | 0.00 / 0.00 | 1.75 |
| Convert_FileStarPreferred | 3.47 | -1.26 | 1.10 | 1136.00 | 1136.00 | 0.00 / 0.00 | 1.00 |
| Convert_Form | -88.08 | -87.71 | -87.90 | 464.00 | 216.00 | -248.00 / -248.00 | 4.64 |
| Convert_Inline | -88.74 | -88.90 | -88.82 | 464.00 | 216.00 | -248.00 / -248.00 | 1.39 |
| Convert_Malformed | -96.80 | -96.80 | -96.80 | 248.00 | 0.00 | -248.00 / -248.00 | 1.29 |
| Convert_Missing | -98.74 | -98.75 | -98.74 | 248.00 | 0.00 | -248.00 / -248.00 | 1.63 |
| Convert_OtherParameter | -85.46 | -85.38 | -85.42 | 520.00 | 272.00 | -248.00 / -248.00 | 3.75 |
| Convert_Uppercase | -86.66 | -86.67 | -86.66 | 520.00 | 272.00 | -248.00 / -248.00 | 1.15 |
| Read_FilePlain_1 | -0.88 | 0.39 | -0.25 | 6400.00 | 6400.00 | 0.00 / 0.00 | 3.26 |
| Read_Files_8 | 3.38 | 4.45 | 3.91 | 18217.00 | 18217.00 | 0.00 / 0.00 | 3.34 |
| Read_FileStar_1 | -3.26 | -9.80 | -6.53 | 7512.00 | 7512.00 | 0.00 / 0.00 | 9.01 |
| Read_Form_1 | -44.43 | -50.27 | -47.35 | 6296.00 | 6048.00 | -248.00 / -248.00 | 5.90 |
| Read_Form_32 | -60.72 | -59.74 | -60.23 | 57708.50 | 49770.00 | -7938.00 / -7939.00 | 7.64 |
| Read_Form_8 | -57.43 | -58.32 | -57.88 | 17889.00 | 15905.00 | -1984.00 / -1984.00 | 4.25 |
| Read_Malformed_1 | -47.04 | -49.26 | -48.15 | 6008.00 | 5760.00 | -248.00 / -248.00 | 4.38 |
| Read_Missing_1 | -46.80 | -47.98 | -47.39 | 5776.00 | 5528.00 | -248.00 / -248.00 | 7.39 |
| Read_Mixed_2 | -31.58 | -29.87 | -30.72 | 8056.00 | 7808.00 | -248.00 / -248.00 | 4.47 |
| Read_Mixed_8 | -39.67 | -37.48 | -38.57 | 18089.00 | 17097.00 | -992.00 / -992.00 | 6.75 |
| Read_MixedLarge_8 | -35.00 | -35.51 | -35.26 | 18089.00 | 17097.00 | -992.00 / -992.00 | 2.32 |
| Read_Uppercase_1 | -38.25 | -42.74 | -40.50 | 6440.00 | 6192.00 | -248.00 / -248.00 | 6.20 |

Seven guarded direct non-file cases save248 B/op. Full form8 saves1984 B/op;
form32 saves7938-7939 B/op; mixed8 and large mixed8 save992 B/op.
Those repeated large gains do not eliminate the low-CV empty filename/star
regressions or the file-path costs. `Control_FormConverter` pair2 changes
515.263ns ->572.927ns (+11.19%, CV72.33%); pair3 changes
203.071ns ->202.603ns (-0.23%). Its +5.48% median is not attributed to this seam.
Other unchanged parser/form-reader/reader-only controls are retained in the table.

## Rejected first prototype: all 31 outcomes

The full-predicate guard calls `IsFileDisposition` before the same validating
constructor and can decode `filename*` again. Round1 `Convert_FileStar` is
27.46% slower/+368 B/op; `Read_FileStar_1` likewise adds368 B/op.
That shape was rejected, not silently pooled with the final results.
[source-experiment.cs](source-experiment.cs) retains its exact measured source;
[source-after-2.cs](source-after-2.cs) is the final proposal.

| Case | Pair1 time% | Before B/op | After B/op | Delta B/op | Max CV% |
|---|---:|---:|---:|---:|---:|
| Control_FormConverter | -56.04 | 288.00 | 288.00 | 0.00 | 35.68 |
| Control_FormReader_8 | -3.72 | 16553.00 | 16553.00 | 0.00 | 8.08 |
| Control_HeaderParser | 0.37 | 216.00 | 216.00 | 0.00 | 2.81 |
| Control_ReaderOnly_8 | -8.30 | 14560.00 | 14560.00 | 0.00 | 8.11 |
| Convert_Attachment | -89.13 | 464.00 | 216.00 | -248.00 | 1.87 |
| Convert_EmptyFilename | -84.88 | 520.00 | 272.00 | -248.00 | 0.86 |
| Convert_EmptyStar | -77.98 | 832.00 | 584.00 | -248.00 | 1.09 |
| Convert_FileEmptyStar | 3.28 | 1040.00 | 1040.00 | 0.00 | 3.31 |
| Convert_FileNoName | 6.34 | 304.00 | 304.00 | 0.00 | 1.04 |
| Convert_FilePlain | 9.21 | 400.00 | 400.00 | 0.00 | 1.26 |
| Convert_FileQuoted | 8.36 | 408.00 | 408.00 | 0.00 | 1.30 |
| Convert_FileStar | 27.46 | 1464.00 | 1832.00 | 368.00 | 1.14 |
| Convert_FileStarPreferred | 4.32 | 1136.00 | 1136.00 | 0.00 | 2.01 |
| Convert_Form | -88.08 | 464.00 | 216.00 | -248.00 | 1.34 |
| Convert_Inline | -89.51 | 464.00 | 216.00 | -248.00 | 0.82 |
| Convert_Malformed | -96.93 | 248.00 | 0.00 | -248.00 | 0.80 |
| Convert_Missing | -98.93 | 248.00 | 0.00 | -248.00 | 2.19 |
| Convert_OtherParameter | -85.88 | 520.00 | 272.00 | -248.00 | 2.71 |
| Convert_Uppercase | -86.77 | 520.00 | 272.00 | -248.00 | 1.08 |
| Read_FilePlain_1 | 2.58 | 6400.00 | 6400.00 | 0.00 | 4.54 |
| Read_Files_8 | 3.17 | 18217.00 | 18217.00 | 0.00 | 2.91 |
| Read_FileStar_1 | 14.20 | 7512.00 | 7880.00 | 368.00 | 7.88 |
| Read_Form_1 | -45.76 | 6296.00 | 6048.00 | -248.00 | 4.63 |
| Read_Form_32 | -61.33 | 57709.00 | 49770.00 | -7939.00 | 3.22 |
| Read_Form_8 | -55.84 | 17889.00 | 15905.00 | -1984.00 | 7.52 |
| Read_Malformed_1 | -42.92 | 6008.00 | 5760.00 | -248.00 | 6.41 |
| Read_Missing_1 | -44.59 | 5776.00 | 5528.00 | -248.00 | 4.97 |
| Read_Mixed_2 | -30.15 | 8056.00 | 7808.00 | -248.00 | 3.43 |
| Read_Mixed_8 | -39.27 | 18089.00 | 17097.00 | -992.00 | 1.06 |
| Read_MixedLarge_8 | -33.75 | 18089.00 | 17097.00 | -992.00 | 4.25 |
| Read_Uppercase_1 | -38.44 | 6440.00 | 6192.00 | -248.00 | 3.60 |

[raw-case-outcomes.json](raw-case-outcomes.json) retains all absolute means,
standard deviations, allocation counts and iteration counts.
[all-paired-outcomes.json](all-paired-outcomes.json) retains all93 comparisons.
**Do not use [all-paired-summary.json](all-paired-summary.json)'s cross-prototype
history medians as final-source medians.**
[final-paired-summary.json](final-paired-summary.json) explicitly selects only
`after-2` rounds2/3.

## Correctness and exact commands/results

Final original and proposed each pass **558 tests with the same two existing
platform skips**, including all **17 individually inspected preservation rows**.
Earlier valid original/prototype runs each pass557 with sixteen rows/two skips.
The four successful suites retain **2230 passing outcomes/eight platform skips**,
complete [TRX files](tests-after-2/results.trx), [focused results](correctness.json)
and [all-test-outcomes.json](all-test-outcomes.json).

| Requirement | Evidence |
|---|---|
| Non-files return null without consuming/changing body; real reader completes | `MultipartSectionConverterExtensionsTests.AsFileSection_NonFileReaderSection_ReturnsNullWithoutConsumingBody` (ten final rows) |
| File metadata, filename decoding/precedence, section/stream identity and body bytes remain exact | `MultipartSectionConverterExtensionsTests.AsFileSection_FileReaderSection_PreservesMetadataAndBody` (six rows) |
| Null receiver retains `ArgumentNullException` and exact parameter | `MultipartSectionConverterExtensionsTests.AsFileSection_NullSection_ThrowsArgumentNullException` |
| Disputed sections are actually produced and fully consumed, including mixed order |31 original real-reader oracles;186 matching setup receipts and checksums |
| Only measured owner changes | Two complete61-file DLL/JSON closures; original harness/runtime/deps reused |

These tests preserve already-correct behavior; they are **not** a fabricated
functional red/green bug. Original owner timing/heap establishes the performance
cost; the proposed owner establishes only the measured gains and regressions.
An earlier original preparation test used an incorrect quoted-empty filename
expectation (554 pass/one failure/two skips). That expectation was corrected on
the original source before shipping edits; its [TRX](tests-before-preparation/results.trx)
and logs remain separate, not a product regression.
Initial `--no-restore` test attempt failed NETSDK1004 and was restored only after
that missing-assets failure. Existing skips are the read/write buffering
Unix-file-mode tests on Windows, not skipped proposal assertions.

Every direct .NET command session first activated `. .\activate.ps1` from
`C:\src\aspnetcore`. The following command **passed** for each of the four named
variants (`before`, `after`, `before-extended`, `after-2`):

```powershell
dotnet test .\src\Http\WebUtilities\test\Microsoft.AspNetCore.WebUtilities.Tests.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-<variant>'
```

Final original/prototype/final harness builds **passed**, zero warnings/errors:

```powershell
dotnet build '<RUN>\harness\AutoPerf.Benchmarks.csproj' -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
```

Original oracle capture and all three immutable snapshot verifications
**passed all31 cases**:

```powershell
dotnet '<RUN>\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' --capture-oracles '<RUN>\contract-oracles.json'
dotnet '<RUN>\binaries\<snapshot>\AutoPerf.Benchmarks.dll' --verify-setups
```

Scoped whitespace verification and `git diff --check` **passed**:

```powershell
dotnet format whitespace .\src\Http\WebUtilities --folder --include .\src\Http\WebUtilities\src\MultipartSectionConverterExtensions.cs .\src\Http\WebUtilities\test\MultipartSectionConverterExtensionsTests.cs --verify-no-changes --verbosity quiet
git diff --check
```

All six measured commands **passed** with identical arguments and serial
timestamps recorded in [execution.json](execution.json):

```powershell
dotnet '<VARIANT>\AutoPerf.Benchmarks.dll' --filter '*Multipart*Benchmark*' --inProcess --exporters json csv --artifacts '<ROUND>' --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
```

## Reproduction and limits

Use clean baseline/final source checkouts and the **same** published harness
and sibling oracle JSON. Activate the pinned SDK; set
`-p:AspNetCoreRoot='<CHECKOUT>'` for the project reference and build Release as
above, restoring missing assets when required. Freeze complete build outputs
before changing source and reuse baseline harness DLL/PDB/runtime/deps in the
proposed snapshot; require the owner-only recursive closure. Verify setups
before timing. Both benchmark classes must run; two JSON reports per launch
contain seventeen and fourteen cases, not31 each.

All six raw console/BDN logs and both complete JSON/CSV/Markdown/HTML reports per
launch are under `round-<N>-<variant>`. The published analyzer strictly verifies
all31 identities across both reports, eight observations each, serial order
and186 original-matching receipts. The following command **passed** and
reproduced all five derived JSON files **byte-identically**:

```powershell
.\summarize.ps1 -RunRoot .
```

SDK12.0.100-alpha.1.26557.102; runtime12.0.0-alpha.1.26562.105
(BDN banner .NET12.0.0/12.0.26.56305); BenchmarkDotNet0.13.0,
C#13, X64 RyuJIT, concurrent server GC. [Environment](environment.json)
records Windows11 Enterprise10.0.26300, Xeon Platinum8473C guest,
eight cores/sixteen logical/~64GiB. This is a **shared host**, not a dedicated
performance environment: this campaign serialized its builds/tests/measurements
with build `-m:2`, but other host activity is uncontrolled. No power/affinity or
unrelated process settings changed.

Bare-header allocation/timing, cold first-process/JIT, exceptional memory
pressure, HTTP/application/network throughput, concurrency, other runtimes or
platforms and native/JIT/control attribution are unverified. This proposal is
for review of a measured common-nonfile tradeoff, not an approved universal fix.
