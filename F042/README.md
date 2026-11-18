# F042: JSON Patch dictionary replacement is measured no-gain

**No performance PR and no merge recommendation.** The same conversion-safe
candidate was measured in all three authorized source comparisons. The
predeclared `ParsedObjectExisting:Count=1` primary takes **3.65% more time**
at the median of the paired effects, with managed-byte differences of
**2,-1,2 B/op saved**. Neither the 5% timing nor repeated16B allocation
criterion is met. Historical timing is permanently closed.

| Comparison | Actual source order | Original ns/op | Candidate ns/op | Less time % | Original/candidate B/op |
|---|---|---:|---:|---:|---:|
| 1 | Original then Candidate | 709.974 | 735.862 | -3.65 | 590/588 |
| 2 | Candidate then Original | 775.066 | 765.471 | 1.24 | 589/590 |
| 3 | Original then Candidate | 697.723 | 763.148 | -9.38 | 591/589 |

Percentages are computed **within each comparison, then median-combined**;
they are not the ratio of separately selected median means. Positive "Less
time" means candidate faster. All **12 profiles, 72 report rows and 576
retained samples** remain in [the complete results](comparison-results.md)
and [independently recomputed JSON](audit-summary.json).

| Artifact | Location |
|---|---|
| Experimental source, not recommended | [Independent fork branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F042-jsonpatch-dictionary-replace), commit `737aae8c1a3de33f7474a2e19a26cb1b567f5290` |
| Original detector record and conclusion | [Finding](finding.json), [decision](decision.json), [preimplementation acceptance plan](acceptance-plan.json) |
| Exact runnable BenchmarkDotNet project | [Project](harness/AutoPerf.Benchmarks.csproj) and its six adjacent C# files |
| Original and candidate test reports | [Original TRX](validation/original-dictionary-tests-001/results/results.trx), [candidate TRX](validation/candidate-dictionary-tests-001/results/results.trx), [independently parsed rows](actual-test-row-validation.json) |
| Producer and relocation observations | [Original](original-characterization-001/evidence/0005-characterization.json), [candidate](candidate-characterization-001/evidence/0005-characterization.json), [independent rebuilt project](reproduction-paired-001/verified-reproduction.json) |
| Actual command/result map | [Validation commands](validation-commands.md) |
| Final tracking issue and remote receipt | [Publication receipt](publication.json), added separately after immutable evidence verification |

The positive-findings `REPORT.md` intentionally excludes this no-gain item.

## What was attempted, and why the guard is necessary

The original `DictionaryAdapter<TKey,TValue>.TryReplace` converts the key,
checks `ContainsKey`, converts the value, then assigns through the indexer.
The successful path can therefore look up the key twice.

**Value conversion is not necessarily inert.** Actual public patch
deserialization and `ApplyTo` reach a registered `JsonConverter<Payload>.Read`
that can resize or clear/repopulate that very dictionary. The executed
characterizations observe capacity3 growing to197 with130entries, and a
separate clear/insert case finishing with2entries. Borrowing a dictionary
value reference across such conversion is not a faithful mechanical rewrite.
No directly invoked private adapter or injected private callback stands in
for this producer.

The candidate therefore borrows a slot only for an **exact concrete
Dictionary, a non-null value, and the same already-assignable type predicate
used by the actual conversion helper**. It casts before borrowing, uses
`Unsafe.IsNullRef` to distinguish a missing slot from a present-null value,
and preserves the complete original fallback for conversions and null.
The existing fallback branches and explanatory locals are unchanged.
Only20shipping lines are inserted, plus the focused preservation-test file.
No public/protected shipping declaration, API baseline, friend grant,
UnsafeAccessor, extra cache or package/SDK manifest changes.

This passes the listed preservation boundaries; it is not an exhaustive
custom-comparer/reentrancy proof or a reason to merge an unhelpful fast path.
Default `AdapterFactory` selects this dictionary adapter for exact
`Dictionary<,>`, not arbitrary `IDictionary`. A derived-dictionary public
producer characterization retains its actual default POCO-path behavior.

## Faithful behavior and exact permanent tests

Both original and candidate run the same **34 discovered tests, all passed,
zero failed/skipped**. The portable XML audit checks every execution identity
and both theory rows, not just console totals.

| Requirement | Exact new preservation test, passed on both sources |
|---|---|
| Already-typed reference identity, unrelated entry and converter bypass | `DictionaryReplaceTest.Replace_AlreadyTypedReference_PreservesIdentityWithoutConversion` |
| Present-null entry receives the replacement without losing its key | `DictionaryReplaceTest.Replace_ExistingNullValue_PreservesDictionaryEntry` |
| Missing target errors before value conversion and preserves data | `DictionaryReplaceTest.Replace_MissingKey_ReportsErrorBeforeValueConversion` |
| Actual converter resize writes current storage and preserves entries | `DictionaryReplaceTest.Replace_ConverterChangesDictionary_WritesCurrentStorage(clear: False)` |
| Actual converter clear/insert re-adds the target and preserves inserted identity | `DictionaryReplaceTest.Replace_ConverterChangesDictionary_WritesCurrentStorage(clear: True)` |

This is **performance-preservation coverage, not a semantic-bug red/green
claim**: those tests pass on the original too. The full16public-producer
characterizations also cover actual parsed JsonElement representation,
parsed/programmatic int, invalid conversion, null/nonnullable/null-compatible
boxing, case-insensitive keys, empty target, invalid key before conversion
and default derived-dictionary dispatch.

An unmodified, separately built current-default owner at
`c5baf473f31fa3bbe9f8201e3411361c632f3a91` passes the same16characterizations
and12untimed benchmark lifecycles. The entire JSON Patch area tree
`2312e7c7c651f2d559d3be8afbb8c6e548f95110` and all13selected files match
baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Its newer build-SDK pins are retained, not copied into the primary comparison.
No full-current-default or repository-wide suite is claimed.

## What the measurements do and do not establish

Timing covers **prepared public ApplyTo plus consumed result/error readback**.
Patch deserialization, options, dictionaries, keys and error callback are
prepared outside timing. The target/patch are reused in steady state; no
artificial reset is hidden between measured calls. Missing-key and unchanged
`test`-operation controls are included, at dictionary sizes1and64.
This is not isolated dictionary-probe, JSON-deserialization, HTTP, endpoint
or application latency.

The larger parsed-object case uses2.12% less time at its paired median, below
the declared threshold. The **unchanged test/1 control** appears6.04% faster;
it cannot be credited to a replacement-only change. Converted-int/1 takes
8.30% more time at its median, and its worst comparison takes21.56% more.
All favorable, adverse and control rows remain; maximum report CV is33.42%.
These are shared-VM observations, not causal regression or production-volume
claims.

**Do not infer a32B saving from removing a source-level ConversionResult
class allocation.** The measured primary does not show it. Even the unchanged
test/1 control differs by19B in one comparison. No unmeasured JIT or allocation
explanation is asserted.

Original/candidate measured consumers contain **77files each**; only the real
JSON Patch owner DLL/PDB differ. The75identical files **include the identical
measured harness DLL/PDB**, leaving73other identical files. All six source-built
owner/dependency DLLs match their captured project outputs; presence does not
mean every DLL necessarily loaded. The auditor uses actual loaded relative
paths, including RID-specific `System.Management`, not simple-name guesses.

The exact seven-file project was independently copied, restored and rebuilt.
Both rebuilt consumers pass16identical characterizations and12lifecycles.
Only the newly built harness DLL/PDB differ from each respective historical
image; owner/other dependency bytes match. No further timing is performed.

SDK12.0.100-alpha.1.26557.102; pinned runtime12.0.0-alpha.1.26562.105;
BDN0.13.0; C#13; Release/ServerGC/x64. The settings-preserving in-process emit
executor uses3warmups,8results,100msrequested iterations, unroll1,DontRemove,
and `Guid.Empty` power-plan mode. All144per-benchmark before/after settings
records retain Normal process/thread priority and affinity65535.
[Read-only hardware observation](environment-observation.json) reports a
Hyper-V VM, Xeon Platinum8473C,8cores/16logical processors and Windows11
Enterprise build26300; BDN itself reports CPU Unknown. No dedicated-machine
or fixed-frequency claim. The executed drivers do not change priority,
affinity, power, OS or network settings, or terminate unrelated processes.

## Provenance, retained failures and verification

Runtime checks hash the selected physical sources and match eight executable
source documents to the actual owning PE/portable PDB;13selected physical
inputs are checked. The metadata-only interface and project/test files are
not invented PDB documents. This is **not complete compiler provenance**.
The candidate was built before the source-publication commit: its historical
SourceLink may still name the baseline. Physical snapshots/PDB hashes are
the measured authority; committed source is independently verified
LF-canonically, not relabeled as the original compilation commit.

[Metadata correction](metadata-corrections.json): the frozen candidate input
manifest retained baseline descriptive length7339 although the actual
candidate snapshot is8213bytes. Its SHA256 and executed PDB-document checks
match the actual8213bytes. Historical manifests/authorizations remain
unchanged; no source or timing is changed to conceal this metadata-only error.

All actual preparation failures remain: protected-main-pin guard, long-path
checkout, executable-array launch, missing generated props, invalid bootstrap
switch, duplicate nested analyzer configuration, initially omitted transitive
DLLs and unsupported formatter flag combination. The successful default build
moved its detached worktree outside the primary repository rather than
weakening analyzers. The supported two-file whitespace check passes.
Two failed arithmetic-auditor versions are retained: one assumed every
simple-name DLL used the root image copy, and one assumed20overhead samples.
The corrected audit binds actual RID-relative paths and all actual adaptive
overhead samples, independently matching all576result samples and GC
midpoint-to-even allocation arithmetic. Neither failure reran a benchmark.

Portable copied-evidence audit, requiring Node and PowerShell7 but no .NET
build or timing:

```powershell
node .\F042-verify.mjs . --require-seal
```

Compiled/restore bytes are omitted with exact hashes. Portable verification
cannot rehash those omitted bytes, independently decode absent PDBs or recreate
historical execution. For a **new** experiment, copy the exact project outside
the source checkout, activate its pinned SDK, set AUTOPERF_ASPNETCORE_ROOT,
build the actual owner/dependencies in Release, then use the successful
relocation restore/build commands and explicit Program.cs/Evidence.cs usage.
Use fresh images, manifests and directories. Executed historical drivers and
their absolute paths are evidence, not permission to overwrite or reopen
this permanently closed budget.
