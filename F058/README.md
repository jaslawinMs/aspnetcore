# F058: default header collection null check - rejected boxing premise

**Rejected, source restored.** All six observed public StringSegment collections select the custom token validator, not CheckNotNull. Actual default-validator users have reference-type elements. The isolated original Tier0 int/StringSegment validators already allocate zero. All 22 of 22 measured heap pairs are unchanged; large public/control timing differences are retained without attribution.

## Actual source, producer and native evidence

Fresh upstream main37e809ead5824bc753a1c3d56f11615bdb1296c5; independent
autoperf/F058-header-collection-null-boxing. [Original](source-original.cs),
[one-line throwaway guard](source-prototype.cs), [patch](prototype.patch),
[before-edit acceptance](acceptance.md), [baseline](baseline-proof.json)
and [exact source/restored owner proof](restoration-proof.json).

The candidate's "confirmed/high confidence" explanation confuses a value-type
closure with the selected validator. All three construction sites for
ObjectCollection<StringSegment> in CacheControlHeaderValue use
CheckIsValidTokenAction. NoCacheHeaders/PrivateHeaders getters and the actual
quoted-name parser produce those collections. HeaderUtilities.CheckValidToken
validates string/token content:default/empty ->ArgumentException(item),
invalid token ->FormatException. DefaultCheckNotNull would accept a default
non-nullable StringSegment,so it is not equivalent to this selected validator.

The default collection cases use NameValueHeaderValue or RangeItemHeaderValue
reference types:CacheControl extensions,ContentDisposition parameters,MediaType
parameters/deep copies and Range ranges.
[Six actual value-type collection observations](producer-proof.json) from
real public creation,parsing and invalid insertion all select
CacheControlHeaderValue.CheckIsValidToken. Reflection only reads actual
delegate identity outside timing;never injects/replaces a validator.

LSP returned seven same-file references only,not whole-repository completeness.
Bounded Headers source inspection found15 ObjectCollection occurrences across
five files and read the actual constructors/class declarations/shared imports.
No completeness claim for a resolved repository graph.
[Current owner history](owner-history.log), [validator history](validator-history.log)
and [followed history](validator-follow-history.log) preserve the2015 strongly
typed headers introduction4fb21644fc3b2387e07e3622f2361652d4598c1f.
[Bounded GitHub ObjectCollection search](existing-work.json) returns0;
not an exhaustive absence-of-prior-work claim.

[Original actual native listing](jit-before.asm) is explicitly **Tier0 minopt**:
CheckNotNull<int> is a9-byte return,CheckNotNull<StringSegment> a10-byte
return;no boxing/null comparison. Nullable<int> tests HasValue directly.
[Prototype listing](jit-after.asm) grows these to40/41 bytes and calls
Nullable.GetUnderlyingType despite the original operation already being absent.
Reference/null checks and nullable throw semantics retained.

[Eight original/prototype resource cases](resource-correctness.json) contain
all48 individual100,000-call samples after100,000 warm calls/case. Seven
nonthrowing isolated/default/set diagnostics are0 B/op on both sides;
the real custom-validator NoCache Add_2 control is272 B/op on both.
No diagnostic/timed allocation improvement is established.

## Faithful corpus and measured boundary

[Pinned standalone harness](harness/AutoPerf.Benchmarks.csproj) invokes actual
public headers and the actual owning internal collection/default delegates,
not copied source expressions. Twelve real public cases cover creation/add,
parser-selected value-type validators,reference defaults,deep-copy element
identity,read-only collections and precise invalid-token contracts.
Seven explicitly helper-only delegate cases and three explicitly constructed
internal value-type diagnostics are **not shipped producer evidence**.
Read-only rejection occurs through actual Collection<T> before mutation.

Inputs/reflective binding/oracle formatting outside timing. Ordinary live
creation/add/parse/copy inside timing;no growing collections/log/exception
history. Diagnostic Set overwrites one precreated slot. Expected failures
return the actual caught exception only when its exact type matches that
case;unexpected errors escape. Capture verifies exact type/parameter/message,
full public protocol,collection values/order,original element reference
relations,read-only flags and actual validator identity twice.

Some setup initialization explicitly invokes diagnostic value-type default
validators;it is outside timed public production and is not attributed to the
public header cases. No source-level new IVT,UnsafeAccessor,API,cache or handler.

[22 original contracts](contract-oracles.json), [44 actual setup contracts](setup-correctness.json)
and88 complete repeated workloads retain every original material observable.
[60-file recursive DLL/JSON closure](binary-closure.json) changes only the
actual Headers DLL,plus its PDB privately;original runtime/dependencies/harness/
oracles reused. Original tested owner exactly matched the original harness.
Local loaded owner PE MVID/actual int-method IL emitted. No DLL/PDB/bin/obj
published.

## One diagnostic comparison;budget closed for rejected premise

A/B,22 cases/44 outcomes/22 ratios,three warmups/eight100ms measured observations,
Short/in-process/DontRemove. The source premise is rejected independently
of helper speed or unrelated control directions. Two more comparisons cannot
make a custom-selected validator reach the changed default null test.
No fourth pair,source tune or fabricated shipping PR.

Public controls include sizeable lower means although value-type custom
validators do not execute the modified method. These are retained
**without a causal optimization or throughput/significance claim**.
Default value-type/set diagnostics and nullable value control are slower;
heap is unchanged everywhere. Single-pair max CV is not a confidence bound.

| Case | Boundary | Time% | Before ns | After ns | Before B/op | After B/op | Max CV% |
|---|---|---:|---:|---:|---:|---:|---:|
| Diagnostic_Collection_Int_Set | Constructed internal diagnostic | 8.00 | 4.50 | 4.86 | 0.00 | 0.00 | 0.51 |
| Diagnostic_Collection_StringSegment_Set | Constructed internal diagnostic | 6.85 | 9.29 | 9.92 | 0.00 | 0.00 | 3.12 |
| Diagnostic_ReadOnly_StringSegment_Add | Constructed internal diagnostic | -1.23 | 2178.47 | 2151.64 | 464.00 | 464.00 | 0.97 |
| Helper_Default_Int | Helper-only | 12.71 | 5.10 | 5.75 | 0.00 | 0.00 | 0.45 |
| Helper_Default_NullableInt_Null | Helper-only | 0.86 | 2125.45 | 2143.66 | 472.00 | 472.00 | 0.69 |
| Helper_Default_NullableInt_Value | Helper-only | 49.61 | 5.75 | 8.61 | 0.00 | 0.00 | 0.63 |
| Helper_Default_Reference_Null | Helper-only | -1.61 | 2144.87 | 2110.38 | 472.00 | 472.00 | 0.92 |
| Helper_Default_Reference_Value | Helper-only | -0.11 | 6.36 | 6.35 | 0.00 | 0.00 | 0.25 |
| Helper_Default_StringSegment | Helper-only | 5.71 | 5.41 | 5.72 | 0.00 | 0.00 | 0.56 |
| Helper_Default_StringSegment_Empty | Helper-only | 5.96 | 5.19 | 5.50 | 0.00 | 0.00 | 1.07 |
| Live_Cache_Extensions_Add_2 | Real public/control | -22.84 | 73.77 | 56.92 | 240.00 | 240.00 | 6.14 |
| Live_Cache_NoCache_Add_2 | Real public/control | -17.12 | 88.98 | 73.75 | 272.00 | 272.00 | 5.86 |
| Live_Cache_NoCache_InvalidDefault | Real public/control | -1.45 | 2189.10 | 2157.26 | 656.00 | 656.00 | 1.66 |
| Live_Cache_Parse_NoCache_Private | Real public/control | -4.99 | 371.87 | 353.32 | 624.00 | 624.00 | 7.28 |
| Live_Cache_Private_Add_2 | Real public/control | -16.46 | 86.89 | 72.59 | 272.00 | 272.00 | 3.65 |
| Live_Cache_Private_InvalidSpace | Real public/control | -1.59 | 2292.94 | 2256.42 | 744.00 | 744.00 | 1.30 |
| Live_ContentDisposition_Parameters_Add_2 | Real public/control | -19.96 | 69.34 | 55.50 | 160.00 | 160.00 | 7.61 |
| Live_MediaType_Copy_2 | Real public/control | -4.18 | 128.82 | 123.43 | 416.00 | 416.00 | 2.34 |
| Live_MediaType_CopyReadOnly_2 | Real public/control | -5.25 | 125.89 | 119.28 | 440.00 | 440.00 | 2.60 |
| Live_MediaType_Parameters_Add_2 | Real public/control | 3.90 | 81.43 | 84.60 | 168.00 | 168.00 | 6.66 |
| Live_MediaType_ReadOnlyParameters_Add | Real public/control | -0.18 | 2184.64 | 2180.71 | 464.00 | 464.00 | 1.74 |
| Live_Range_Add_2 | Real public/control | 7.45 | 63.20 | 67.91 | 160.00 | 160.00 | 8.06 |

[All44 actual outcomes](raw-case-outcomes.json), [all22 ratios](all-paired-outcomes.json)
and complete two round directories with JSON/CSV/Markdown/HTML/logs.
[Summarizer](summarize.ps1) reproduces all three derived files byte-identically
after path redaction. [Preparation correction](preparation-corrections.json)
records corrected helper scope wording before snapshots/source edits/measurement;
initial contracts/logs retained,final frozen harness/oracles used for both sides.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| Actual shipped value-type producer/selected validator | Live_Cache_NoCache_Add_2,Live_Cache_Private_Add_2,Live_Cache_Parse_NoCache_Private,Live_Cache_NoCache_InvalidDefault and Live_Cache_Private_InvalidSpace;all six original/custom delegate observations checked unchanged. |
| Preserve default null errors | Existing MediaTypeHeaderValueTest.Parameters_AddNull_Throw and ContentDispositionHeaderValueTest.Parameters_AddNull_Throw;actual helper nullable/reference null exceptions unchanged. |
| Preserve deep copy/read-only semantics | Existing MediaTypeHeaderValueTest.Copy_WithParameters_Copied and MediaTypeHeaderValueTest.CopyAsReadOnly_WithParameters_CopiedAndReadOnly;actual copy/read-only corpus verifies full protocol/elements/reference relations and NotSupportedException. |
| Preserve all owning contracts/restore unsupported experiment | Original/prototype/restored1848/1848 each,5544 parsed outcomes;exact original source and tested owner hashes match original manifest. No new permanent tests or verified functional bug claim. |
| Verify resource premise and bounded evidence | Actual original Tier0 no-op int/segment/HasValue code,all48 resource samples unchanged,44 BDN outcomes/88 repeated complete workloads,60-file owner-only isolation. |

[All5544 actual test outcomes](all-test-outcomes.json),three complete TRXs/logs,
[test parser](check-tests.ps1), [resource parser](check-resources.ps1).
No skipped/suppressed rows;no newly added permanent tests for the rejected
throwaway experiment. No source proposal,issue or PR.

From C:\src\aspnetcore,`. .\activate.ps1` before each .NET shell:

```powershell
dotnet test .\src\Http\Headers\test\Microsoft.Net.Http.Headers.Tests.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory '<RUN>\tests-<before|after|restored>'
# All three commands exit0/pass1848/1848,no skips;5544 complete outcomes parsed.
dotnet restore '<RUN>\harness\AutoPerf.Benchmarks.csproj' --configfile .\NuGet.config --disable-parallel -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
dotnet build '<RUN>\harness\AutoPerf.Benchmarks.csproj' -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet
# Restore exit0;initial and corrected-scope pre-snapshot builds exit0,0 warnings/errors.
dotnet '<RUN>\harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll' --capture-oracles '<RUN>\contract-oracles.json'
# Initial/final captures exit0;22 contracts/44 actual repeated workloads each;final scope labels frozen before source edits.
dotnet '<RUN>\binaries\<before|after>\AutoPerf.Benchmarks.dll' --verify-setups
# Both exit0;22 complete original contracts/44 actual workload invocations per side.
$env:DOTNET_JitDisasm='*CheckNotNull*'
$env:DOTNET_JitStdOutFile='<RUN>\jit-<before|after>.asm'
dotnet '<RUN>\binaries\<before|after>\AutoPerf.Benchmarks.dll' --probe-resources
# Both exit0;all48 original-prototype resource samples unchanged;native Tier0 minopt captured.
Remove-Item Env:\DOTNET_JitDisasm,Env:\DOTNET_JitStdOutFile
dotnet format whitespace .\src\Http\Headers\src\Microsoft.Net.Http.Headers.csproj --include .\src\Http\Headers\src\ObjectCollection.cs --no-restore --verify-no-changes --verbosity quiet
# Exit0;exact changed source seam.
dotnet '<RUN>\binaries\<snapshot>\AutoPerf.Benchmarks.dll' --filter '*ObjectCollectionBenchmark*' --inProcess --exporters json csv --artifacts '<RUN>\round-1-<variant>' --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
# Both exact measured launches exit0;22 outcomes/original contracts each,44 complete repeated workloads each.
```

BDN0.13.0/C#13/concurrent server GC,SDK12.0.100-alpha.1.26557.102/
runtime12.0.0-alpha.1.26562.105. [SDK](dotnet-info.txt),
[same-machine earlier bounded CIM snapshot](hardware.json) reused:shared
Windows11 Enterprise/Xeon Platinum8473C guest8 cores/16 logical/~64GiB.
Builds/tests/measurement serialized/-m:2;no power/affinity changes,unrelated
process termination,subagents,schedules or detached services.

No claim for other runtimes/platforms,Native AOT/trimming,cold/pressure,
application throughput or exact JIT tier inside timed BDN. Header-owned
managed validation/representation boundary is established;no browser or
external HTTP server workflow is required for this rejected source premise.
