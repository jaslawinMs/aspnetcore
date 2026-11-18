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

| Profile | Round1 original->candidate ns | Less time % | Round2 original->candidate ns | Less time % | Round3 original->candidate ns | Less time % | B/op original->candidate rounds1/2/3 |
|---|---:|---:|---:|---:|---:|---:|---|
| DictionaryConcreteControl:0 | 0.367->0.376 | -2.39 | 0.365->0.359 | 1.78 | 0.361->0.350 | 3.05 | 0->0 / 0->0 / 0->0 |
| DictionaryConcreteControl:1 | 3.720->3.401 | 8.56 | 3.042->3.623 | -19.09 | 2.883->3.765 | -30.61 | 0->0 / 0->0 / 0->0 |
| DictionaryConcreteControl:64 | 410.962->373.928 | 9.01 | 365.940->378.628 | -3.47 | 361.197->375.547 | -3.97 | 0->0 / 0->0 / 0->0 |
| DictionaryConcreteControl:8 | 48.893->46.205 | 5.50 | 41.058->45.589 | -11.04 | 40.932->47.176 | -15.25 | 0->0 / 0->0 / 0->0 |
| MaterializedCopy:0 | 7.367->11.703 | -58.86 | 7.349->11.439 | -55.66 | 7.115->11.683 | -64.21 | 0->0 / 0->0 / 0->0 |
| MaterializedCopy:1 | 50.747->53.688 | -5.80 | 48.315->50.856 | -5.26 | 47.636->52.528 | -10.27 | 56->56 / 56->56 / 56->56 |
| MaterializedCopy:64 | 1240.258->1188.509 | 4.17 | 1194.874->1197.466 | -0.22 | 1243.044->1221.557 | 1.73 | 56->56 / 56->56 / 56->56 |
| MaterializedCopy:8 | 189.141->189.063 | 0.04 | 181.259->188.908 | -4.22 | 186.868->191.984 | -2.74 | 56->56 / 56->56 / 56->56 |
| NestedCopy:0 | 13.548->26.621 | -96.50 | 13.997->26.594 | -90.00 | 14.464->28.811 | -99.19 | 0->0 / 0->0 / 0->0 |
| NestedCopy:1 | 59.290->66.805 | -12.68 | 53.303->65.724 | -23.30 | 55.459->70.365 | -26.88 | 56->56 / 56->56 / 56->56 |
| NestedCopy:64 | 1243.571->1214.600 | 2.33 | 1204.021->1204.721 | -0.06 | 1238.804->1255.483 | -1.35 | 56->56 / 56->56 / 56->56 |
| NestedCopy:8 | 198.980->204.895 | -2.97 | 191.240->202.181 | -5.72 | 197.914->213.518 | -7.88 | 56->56 / 56->56 / 56->56 |
| NonGeneric:0 | 1.101->1.319 | -19.81 | 1.272->1.101 | 13.41 | 1.114->1.104 | 0.91 | 0->0 / 0->0 / 0->0 |
| NonGeneric:1 | 60.042->58.285 | 2.93 | 53.905->56.150 | -4.17 | 56.234->57.689 | -2.59 | 88->88 / 88->88 / 88->88 |
| NonGeneric:64 | 2105.164->1955.501 | 7.11 | 1853.353->1979.403 | -6.80 | 1977.015->1946.407 | 1.55 | 2104->2104 / 2104->2104 / 2104->2104 |
| NonGeneric:8 | 284.343->273.826 | 3.70 | 270.919->286.035 | -5.58 | 284.642->279.783 | 1.71 | 312->312 / 312->312 / 312->312 |
| ReadCopy:0 | 5.800->8.782 | -51.41 | 6.322->8.655 | -36.90 | 6.145->9.648 | -57.01 | 0->0 / 0->0 / 0->0 |
| ReadCopy:1 | 49.896->50.856 | -1.93 | 46.115->49.590 | -7.54 | 45.893->50.786 | -10.66 | 56->56 / 56->56 / 56->56 |
| ReadCopy:64 | 1234.035->1207.249 | 2.17 | 1192.176->1187.085 | 0.43 | 1241.436->1231.378 | 0.81 | 56->56 / 56->56 / 56->56 |
| ReadCopy:8 | 192.354->187.107 | 2.73 | 180.876->186.320 | -3.01 | 186.100->191.384 | -2.84 | 56->56 / 56->56 / 56->56 |
| TopLevelConcrete:0 | 0.998->1.379 | -38.21 | 1.051->1.462 | -39.14 | 1.057->1.369 | -29.52 | 0->0 / 0->0 / 0->0 |
| TopLevelConcrete:1 | 47.137->46.369 | 1.63 | 46.395->44.196 | 4.74 | 42.569->45.050 | -5.83 | 56->56 / 56->56 / 56->56 |
| TopLevelConcrete:64 | 1220.929->1207.285 | 1.12 | 1173.691->1207.730 | -2.90 | 1226.033->1216.239 | 0.80 | 56->56 / 56->56 / 56->56 |
| TopLevelConcrete:8 | 182.760->178.673 | 2.24 | 176.832->183.651 | -3.86 | 180.172->181.250 | -0.60 | 56->56 / 56->56 / 56->56 |
| TopLevelInterface:0 | 1.030->1.373 | -33.36 | 0.989->1.364 | -37.94 | 1.047->1.550 | -47.94 | 0->0 / 0->0 / 0->0 |
| TopLevelInterface:1 | 45.480->46.731 | -2.75 | 43.557->43.593 | -0.08 | 42.337->43.772 | -3.39 | 56->56 / 56->56 / 56->56 |
| TopLevelInterface:64 | 1236.802->1191.334 | 3.68 | 1181.086->1193.751 | -1.07 | 1235.144->1211.043 | 1.95 | 56->56 / 56->56 / 56->56 |
| TopLevelInterface:8 | 192.032->179.821 | 6.36 | 176.865->177.833 | -0.55 | 180.480->180.421 | 0.03 | 56->56 / 56->56 / 56->56 |
| TypedConcrete:0 | 1.246->1.716 | -37.73 | 1.304->1.641 | -25.86 | 1.279->1.690 | -32.13 | 0->0 / 0->0 / 0->0 |
| TypedConcrete:1 | 46.086->46.952 | -1.88 | 43.142->44.741 | -3.71 | 42.883->43.227 | -0.80 | 56->56 / 56->56 / 56->56 |
| TypedConcrete:64 | 1236.295->1190.030 | 3.74 | 1211.635->1180.315 | 2.58 | 1238.247->1215.267 | 1.86 | 56->56 / 56->56 / 56->56 |
| TypedConcrete:8 | 184.270->180.033 | 2.30 | 177.481->177.739 | -0.15 | 181.409->177.948 | 1.91 | 56->56 / 56->56 / 56->56 |

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
- Fresh current default `f2484a6bf688bd1acb1af13802255c2c23a071dd` matches the 12 selected owner/copy/API/
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
