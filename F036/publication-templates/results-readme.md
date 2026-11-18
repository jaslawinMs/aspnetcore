# F036: ViewDataDictionary enumeration - no gain

**No performance PR.** A compatible internal fast path did not remove the reported
56 B/op allocation and made the declared `ReadCopy:1` primary take
**1.93%, 7.54%, and 10.66% more time** across three alternating comparisons.
The experimental change was withdrawn; original shipping source and all three
selected MVC product/test-bin DLL/PDB pairs were restored byte-for-byte.

The independent source branch is
[`autoperf/F036-viewdata-enumeration`](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F036-viewdata-enumeration)
at `37e809ead5824bc753a1c3d56f11615bdb1296c5`, with no optimization commit.
The runnable benchmark projects, withdrawn patch, complete results and audits
are in this capsule. `publication.json` is added separately after immutable
remote blobs and the tracking issue are verified.

## What was evaluated

The scan identified explicit interface-returning enumeration in
`ViewDataDictionary`. A universal new public `Dictionary.Enumerator` API was
not justified: actual public copies retain a live source until first write,
nest through copy-on-write wrappers, and preserve derived interface iterators.
The existing empty generic cursor is a shared `GenericEmptyEnumerator` whose
`Current` behavior differs from an empty concrete dictionary cursor.

An initial, separately sealed **original-only** diagnostic measured 56 B/op
for nonempty generic enumeration. It is not a source optimization or a paired
comparison. That observation motivated a new pre-edit comparison plan:

```csharp
if (_data is Dictionary<string, object?> { Count: > 0 } dictionary)
{
    return dictionary.GetEnumerator();
}

return _data.GetEnumerator();
```

Only the explicit generic method changed. The empty and copy-on-write fallback,
nongeneric method, shared copy-on-write source, and public API remained unchanged.
The actual tested patch is
[`comparison-preparation-candidate/candidate.patch`](comparison-preparation-candidate/candidate.patch).
Native allocation elimination was a hypothesis, not a conclusion from IL.

## Complete measured results

Positive less-time percentages favor the candidate; negative values are
regressions. Every profile, including favorable scaled observations and adverse
controls, is retained. All 96 paired allocation observations match exactly.
Generic empty profiles regress in every pair; favorable scaled rows do not
outweigh the primary, empty/small-workload costs and unchanged-control movement.

@RESULTS_TABLE@

The original-only phase has 32 rows/256 retained samples. The later comparison
phase has three complete pairs, 192 rows/1,536 samples. **All 1,792 stdout/JSON
samples were matched**, and their mean, sample variance, SD and SE recomputed.
Maximum paired CV is 13.42%. Confidence intervals and MemoryDiagnoser allocations
are retained as reported, not independently derived distributions/counters.
There was no failed build/native attempt and no fourth source comparison.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| Actual base, typed and public-copy owners | `Scenario`, `Cursor:base-generic`, `Cursor:typed-generic`, `Cursor:copy-generic`, `Cursor:nested-generic`, `Cursor:materialized-generic`, and `Cursor:base-nongeneric` records at Counts 0/1/8/64; `CaseInsensitiveKeysAndNullValues` |
| Source visibility, first-write detachment, nested and stale cursors | `PublicCopiesRemainLiveThenDetach`, `NestedCopiesFollowTheirImmediateSource`, `UnsuccessfulRemoveStillDetaches` including empty/singleton subcases, and four independent-cursor records |
| Derived enumeration reaches the real materialization producer | `DerivedEnumerationIsForwardedAndMaterialized`: real entries reverse order, remain live before copy mutation, and are isolated after actual copy-on-write materialization |
| Every existing selected theory row executes | Original, candidate and restored-original `owning.trx` each pass all 19 rows, zero skips; all eight `CopyConstructor_CopiesModelMetadata` rows and both null/23 `CopyConstructor_DoesNotChangeMetadata_WhenValueCompatibleWithSourceMetadata` rows are parsed independently |
| Exact measured harness isolation | Each 289-file measured image has the same harness DLL/PDB; only the tested ViewFeatures DLL/PDB differ. 287 unchanged files include the two harness files, leaving 285 other unchanged files |
| Independent reproduction | Original-only six-file project copied byte-exactly, independently rebuilt at a relocated path, and both complete 33-semantic/32-lifecycle collections match byte-for-byte; no retiming or relocated PE/PDB identity claim |
| Complete preservation and execution evidence | All four successful characterizations have identical 33 semantic and 32 actual benchmark lifecycle records; 448 emitted-executor and 704 benchmark setup/cleanup settings observations match initial normal-priority settings |
| Exact original restoration | Fresh restored-original 19-row test run passes; all three product and test-bin owner DLL/PDB pairs match the original tested image |

These are 19 existing cases executed three times, plus repeated concrete owner
characterizations, not 57 distinct tests or 260 new E2E cases. This is performance
preservation work, not a semantic bug-fix red/green claim. The comparison harness
was not separately relocated; its timed bodies and four other source/project
files match the independently reproduced original-only version, while Program
variant/job/closure metadata differs.

## Reproducibility and boundaries

- Pinned SDK `12.0.100-alpha.1.26557.102`; runtime
  `12.0.0-alpha.1.26562.105`; Windows x64, C# 13, Release, Server GC.
- BDN 0.13.0, byte-exact settings-preserving emitter, 3 warmups/8 results,
  100 ms iterations, unroll 1, `DontRemove`, no power-plan changes.
- Shared Hyper-V VM, **not dedicated or isolated**. No priority, affinity,
  power, OS/network policy changes or unrelated process termination.
- Fresh current default `@FRESH_DEFAULT@` matches the 12 selected owner/copy/API/
  project/test/consumer files. **TemplateInfo does not match**: its lazy visited-set
  change is retained explicitly. All construction, copying, detachment and writes
  occur outside timing. This is not full-current-main construction or application
  performance, workload prevalence, Razor/HTTP/browser or native JIT-causation proof.
- Live audit rehashed 1,156 frozen consumer entries, 824 loaded-assembly bindings
  and 1,255 unique files, and checked all 11 captured native runtime PIDs.
  Selected source/PE/PDB witnesses cover 99 document associations, not complete
  build provenance or method coverage.
- Compiled/restore trees are omitted with exact hashes. The portable read-only
  audit verifies copied sources, plans, records and raw statistics, **not omitted
  native binaries**. See `authoritative-copy-manifest.json`,
  `omitted-file-manifest.json`, and `validation-commands.md`.

Run the portable text/statistics audit from this capsule, without .NET or retiming:

```powershell
node .\F036-audit.mjs . --verify
```

For a new experiment, `comparison-harness\AutoPerf.Benchmarks.csproj` uses
`AUTOPERF_ASPNETCORE_ROOT` and actual prebuilt Release MVC projects/test dependencies.
Activate the repository SDK first and follow captured `BuildFromSource` guidance.
Historical drivers/commands contain this machine's absolute paths and closed
budgets; they are evidence, not overwrite/replay instructions. A new measurement
needs its own source validation, tested images, source/closure manifests and fresh
artifact directory. Do not substitute installed MVC binaries.

The earlier API assessment/original-only closure and later internal hypothesis
remain separate immutable phases. Non-timing authoring corrections are retained;
they did not alter a native result or consume extra comparison slots. `No-gain`
applies to this compatible experiment, not every possible future implementation.
