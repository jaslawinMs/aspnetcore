# F059: guarded Razor rendered-section membership

**Disposition: measured, guarded source proposal.** Three unchanged-source comparisons are closed.
Eight of nine normal, section-bearing real Razor-view cases are faster in all three pairs;
larger views have median changes of roughly -7% to -12%, not a universal or throughput claim.
All 26 cases, controls, heap counts and variance are retained below.
The untouched `View_NoSections` control also improves in every pair, so small-case
direction and the entire process-wide improvement cannot be attributed to the changed probe.

## Owner and preservation boundary

The retained source candidate is the separate `_renderedSections.Contains` followed by
`Add` in `RazorPage.RenderSectionAsyncCore`. Actual `RazorPage.DefineSection`
populates `RazorPageBase.SectionWriters`, an ordinal-ignore-case dictionary;
actual `RazorView.RenderLayoutAsync` transfers that dictionary to the layout page.
The private rendered-section set keeps its original ordinal-ignore-case comparer.

`PreviousSectionWriters` is caller-settable `IDictionary<string, RenderAsyncDelegate>`.
A blanket lookup-before-duplicate rewrite changes custom lookup/comparer exception
precedence and reentrant behavior. The measured proposal uses `HashSet.Add`'s Boolean
result only for an exact built-in dictionary with the original comparer identity.
Subclasses, other interfaces and custom comparers retain the original ordering and
the original ignored insertion result. Missing names remain unrecorded.
The original duplicate message/local and required/optional branches are preserved.
There is no new public API, cache, cross-assembly access mechanism or hot-reload state.

The full-view workload uses real RazorView/page execution, real section registration
and transfer, the production `MemoryPoolViewBufferScope`, and a fresh disposed service
and request scope per operation. It asserts exact final HTML, primary/recovery errors,
delegate counts, null/empty result tokens, dictionary identity/type, lookup counts,
section keys and actual buffer type. It does not substitute a copied hash-set algorithm.
Every benchmark setup verifies the full original contract twice.

Fourteen cases execute the full view owner; twelve page-only cases characterize
the helper/caller-dictionary boundary without RazorView transfer. Generated-style
page execution hooks are used, not `.cshtml` compilation. Delegates complete
synchronously. HTTP hosting, browsers, suspended callbacks, concurrent page reuse,
other runtimes, Native AOT and application throughput are not verified here.

## Immutable inputs and measurement method

- Original default branch: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- Source/test proposal: [9c7435c42aec11fa09b4252a979919a5bfe0bd35](https://github.com/jaslawinMs/aspnetcore/commit/9c7435c42aec11fa09b4252a979919a5bfe0bd35), branch `autoperf/F059-razor-section-membership`.
- Three serialized comparisons in A/B, B/A, A/B order; zero source tunes.
- Identical frozen harness, runtime, configuration, original contract oracle and recursive 139-file DLL/JSON closure. Only `Microsoft.AspNetCore.Mvc.Razor.dll` differs.
- 156 actual outcomes, 78 paired ratios, 156 complete original contracts and 312 repeated workloads.
- SDK `12.0.100-alpha.1.26557.102`, runtime `12.0.0-alpha.1.26562.105`, BenchmarkDotNet 0.13.0, C# 13, in-process Short job, 3 warmups, 8 measured iterations, 100-ms iteration time, no outlier removal, concurrent server GC.
- Shared Windows 11 Enterprise 10.0.26300 guest; Xeon Platinum 8473C, 8 guest cores/16 logical processors, 68,665,884,672 bytes of RAM. BDN reports an unknown processor; bounded hardware metadata was captured after measurements.
- Builds use `-m:2`. No affinity, power, unrelated processes or machine settings were changed.
- Name length is 27 characters for Short and 267 for Long; section counts and alternate-case input are explicit in case names.

Frozen manifests include source/owner hashes and MVIDs; `binary-closure.json` contains every recursive compared file.
Private DLL/PDB snapshots are retained locally, not distributed in this results branch.
The final tested shipping DLL hash exactly equals the measured proposed owner.

## All paired outcomes

Negative time change means the proposed owner was faster. Values are in round order,
not averaged across different implementations. The median is the numeric middle
of the three actual paired percentages. Heap columns retain all three pairs.
The complete BDN distributions and per-launch environment are in the raw JSON/CSV/Markdown/HTML/log exports.

| Case | Before ns/op (1 / 2 / 3) | After ns/op (1 / 2 / 3) | Time change % (1 / 2 / 3) | Median % | B/op before->after (1 / 2 / 3) | Max CV % |
|---|---:|---:|---:|---:|---:|---:|
| `Page_128_Long` | 208512.27 / 264477.72 / 206336.95 | 225863.84 / 204928.50 / 219078.38 | 8.32 / -22.52 / 6.18 | 6.18 | 132165->132174 / 132164->132166 / 132164->131977 | 30.19 |
| `Page_32_Short` | 12076.68 / 12751.08 / 13024.98 | 11396.33 / 12463.39 / 12032.43 | -5.63 / -2.26 / -7.62 | -5.63 | 19810->19810 / 19811->19811 / 19810->19811 | 4.95 |
| `Page_ComparerFailureAfterRender` | 10777.34 / 10999.37 / 10957.03 | 10706.67 / 11033.36 / 11322.20 | -0.66 / 0.31 / 3.33 | 0.31 | 10138->10138 / 10138->10138 / 10138->10138 | 4.72 |
| `Page_DuplicateRemoved` | 10769.06 / 10887.81 / 10964.34 | 10459.47 / 10861.85 / 11143.47 | -2.87 / -0.24 / 1.63 | -0.24 | 9898->9898 / 9898->9898 / 9898->9898 | 6.42 |
| `Page_LookupFailureAfterRender` | 10515.21 / 11048.19 / 10915.79 | 10540.01 / 10900.90 / 11023.34 | 0.24 / -1.33 / 0.99 | 0.24 | 10154->10153 / 10154->10154 / 10153->10154 | 1.49 |
| `Page_LookupFailureBeforeRender` | 11131.63 / 11552.68 / 11387.25 | 11050.25 / 11422.30 / 11312.07 | -0.73 / -1.13 / -0.66 | -0.73 | 9898->9898 / 9898->9897 / 9897->9898 | 1.20 |
| `Page_OptionalThenDefine` | 4771.90 / 5318.99 / 5271.59 | 4878.20 / 5265.64 / 5202.85 | 2.23 / -1.00 / -1.30 | -1.00 | 8425->8425 / 8425->8425 / 8425->8425 | 4.45 |
| `Page_Ordinal_32` | 12651.56 / 13541.64 / 13663.94 | 12874.58 / 13909.52 / 13818.70 | 1.76 / 2.72 / 1.13 | 1.76 | 20979->20979 / 20979->20979 / 20979->20979 | 4.51 |
| `Page_ReentrantLookup` | 5014.85 / 5543.97 / 5650.64 | 4963.71 / 5556.94 / 5714.86 | -1.02 / 0.23 / 1.14 | 0.23 | 8985->8985 / 8985->8985 / 8985->8985 | 10.93 |
| `Page_RequiredThenDefine` | 10953.89 / 11238.35 / 11259.73 | 10908.91 / 11117.94 / 11023.53 | -0.41 / -1.07 / -2.10 | -1.07 | 10202->10202 / 10202->10202 / 10202->10202 | 3.77 |
| `Page_Subclass_32` | 12560.20 / 13324.52 / 13744.20 | 12262.62 / 13569.89 / 13352.92 | -2.37 / 1.84 / -2.85 | -2.37 | 20979->20979 / 20979->20979 / 20979->20979 | 4.69 |
| `Page_Wrapper_32` | 12501.52 / 13371.23 / 13557.48 | 12514.19 / 13631.92 / 13544.55 | 0.10 / 1.95 / -0.10 | 0.10 | 21019->21019 / 21019->21019 / 21019->21019 | 1.88 |
| `View_1_Short` | 5429.81 / 6010.00 / 6066.77 | 5289.27 / 6011.05 / 5891.36 | -2.59 / 0.02 / -2.89 | -2.59 | 9537->9537 / 9537->9537 / 9537->9537 | 3.11 |
| `View_128_Long` | 173232.35 / 176537.00 / 179073.59 | 152982.73 / 156734.22 / 154228.68 | -11.69 / -11.22 / -13.87 | -11.69 | 133498->133499 / 133498->133497 / 133501->133499 | 4.69 |
| `View_128_Short` | 34829.71 / 38058.13 / 39495.37 | 32907.02 / 35354.29 / 34630.73 | -5.52 / -7.10 / -12.32 | -7.10 | 61848->61848 / 61846->61848 / 61848->61847 | 2.66 |
| `View_2_Short` | 5773.43 / 6247.64 / 6331.27 | 5687.69 / 6227.33 / 6129.54 | -1.49 / -0.33 / -3.19 | -1.49 | 9857->9857 / 9857->9857 / 9857->9857 | 3.67 |
| `View_32_Long` | 47836.52 / 48993.11 / 49119.60 | 42139.86 / 43596.72 / 42585.21 | -11.91 / -11.01 / -13.30 | -11.91 | 36696->36695 / 36696->36695 / 36696->36695 | 2.19 |
| `View_32_Short` | 13008.27 / 14151.53 / 14163.13 | 12010.60 / 13285.07 / 12843.73 | -7.67 / -6.12 / -9.32 | -7.67 | 21331->21331 / 21331->21331 / 21330->21330 | 4.01 |
| `View_8_AlternateCase` | 7734.44 / 8284.35 / 8289.52 | 7485.36 / 8256.49 / 7707.75 | -3.22 / -0.34 / -7.02 | -3.22 | 13098->13098 / 13098->13098 / 13098->13098 | 7.47 |
| `View_8_Long` | 15559.98 / 16229.86 / 16655.16 | 14351.98 / 15331.89 / 14896.14 | -7.76 / -5.53 / -10.56 | -7.76 | 16939->16939 / 16939->16939 / 16939->16939 | 4.04 |
| `View_8_Short` | 7450.85 / 8171.47 / 8189.38 | 7252.08 / 8160.26 / 7739.70 | -2.67 / -0.14 / -5.49 | -2.67 | 13098->13098 / 13098->13098 / 13098->13098 | 5.01 |
| `View_DelegateFailure` | 21113.44 / 22046.77 / 21436.20 | 21055.46 / 21347.83 / 21235.81 | -0.27 / -3.17 / -0.93 | -0.93 | 12875->12875 / 12875->12875 / 12875->12875 | 4.98 |
| `View_Duplicate` | 16835.00 / 17042.80 / 16601.39 | 16484.54 / 16837.81 / 16499.04 | -2.08 / -1.20 / -0.62 | -1.20 | 12050->12050 / 12050->12050 / 12050->12050 | 1.40 |
| `View_NoSections` | 5076.57 / 6966.61 / 5261.28 | 4837.16 / 5458.14 / 5094.86 | -4.72 / -21.65 / -3.16 | -4.72 | 8665->8665 / 8665->8665 / 8665->8665 | 7.70 |
| `View_OptionalMissing` | 5501.53 / 6042.85 / 5939.71 | 5440.38 / 6053.36 / 5718.04 | -1.11 / 0.17 / -3.73 | -1.11 | 9537->9537 / 9537->9537 / 9537->9537 | 6.17 |
| `View_RequiredMissing` | 16569.03 / 17150.44 / 16855.09 | 16455.54 / 16870.16 / 16475.63 | -0.68 / -1.63 / -2.25 | -1.63 | 11970->11970 / 11970->11970 / 11970->11970 | 4.18 |
### Interpretation and non-wins

`View_128_Long`, `View_32_Long`, `View_8_Long`, `View_128_Short`,
`View_32_Short`, `View_8_Short`, `View_8_AlternateCase` and `View_2_Short`
are faster in every pair. Their median improvements range from 1.49% to 11.91%.
`View_1_Short` has a -2.59% median but one +0.017% pair, not a repeated win.

`View_NoSections` never enters the changed method yet improves in every pair:
-4.72% median, with a -21.65% pair. This is direct evidence of shared-machine,
runtime/code-layout or process variability; its gains and all small-case improvements
must not be credited wholly to removal of the membership probe.

`Page_128_Long` is mixed (+8.32%, -22.52%, +6.18%) with 30.19% maximum CV;
no helper-large gain is supported. The ordinal-comparer fallback is slower in
every pair (+1.76% median). Other custom/error/control directions remain visible;
they are not silently discarded to make the proposal look universally faster.

62 of 78 heap pairs are exactly equal. Of the 16 nonzero differences, most are
1-9 bytes; the final `Page_128_Long` sample is -187 bytes against roughly 132 KB.
These observations do not establish a structural heap saving. No allocation
or broad performance benefit is claimed beyond the measured boundary.

## Requirement coverage and actual preservation tests

The existing owning Razor suite passes 362/362 on original and proposed source.
Nine focused rows were added to the existing `RazorPageTest` class. All 371/371
rows pass on both original source plus these tests and the guarded proposal.
These are preservation tests, not falsely claimed original functional red tests.
Performance is characterized by the actual A/B owner measurements above.

A deliberate unmeasured mutation removes only the side-effect-free dictionary
guard. It reaches exactly four expected failures: both custom dictionary rows,
the comparer row and the reentrant row. After restoring the exact measured guard,
all 371/371 pass and the final source/DLL hashes match the measured snapshot.

| Requirement | Evidence |
|---|---|
| Actual producer and output, case-insensitive names, original dictionary transfer | Fourteen `View_*` actual RazorView cases; exact original HTML/state/error/lookup/buffer contracts verified twice for every launch; `contract-oracles.json` and `setup-correctness.json`. |
| Duplicate still precedes missing required/optional lookup after removal | `RazorPageTest.RenderSectionAsync_DuplicatePrecedesMissingSection(required: false/true)`; both rows pass on original/guarded/final source. |
| Missing optional/required names remain renderable after definition | `RazorPageTest.RenderSectionAsync_MissingSectionCanBeDefinedLater(required: false/true)`; both rows pass. |
| Caller dictionary and reimplemented subclass exception precedence | `RazorPageTest.RenderSectionAsync_DuplicatePrecedesThrowingDictionaryLookup(subclass: false/true)`; both pass on original/guarded/final, both fail the unguarded mutation with actual lookup-failure evidence. |
| Custom comparer duplicate precedence | `RazorPageTest.RenderSectionAsync_DuplicatePrecedesThrowingComparer`; passes original/guarded/final, fails mutation with actual comparer-failure evidence. |
| Original reentrant lookup and duplicate state | `RazorPageTest.RenderSectionAsync_PreservesReentrantDictionaryLookup`; passes original/guarded/final, fails mutation with the actual already-rendered error; harness `Page_ReentrantLookup` preserves two callbacks. |
| Delegate failure keeps the section rendered | `RazorPageTest.RenderSectionAsync_KeepsFailedSectionRendered`; passes original/guarded/final; full-view delegate-failure contract also retained. |
| Isolated owners, unchanged source, complete comparison budget | All 139 recursive DLL/JSON hashes; owner-only change; all six process arguments/results in `execution.json`; three closed pairs/zero source tunes. |

| Actual phase | Result | Evidence |
|---|---|---|
| Initial original test attempt | NETSDK1004: assets genuinely missing; did not reach tests | `test-before.log`; subsequent restore was performed only after this failure. |
| Original after successful restore | 362 passed, none skipped/failed | `test-before-restored.log`, `tests-before/results.trx`. |
| Proposed owner, pre-addition suite | 362 passed, none skipped/failed | `test-after.log`, `tests-after/results.trx`. |
| Guarded owner plus preservation rows | 371 passed, none skipped/failed | `test-guarded-added.log`, `tests-guarded-added/results.trx`. |
| Exact original owner plus preservation rows | 371 passed, none skipped/failed | `test-original-added.log`, `tests-original-added/results.trx`. |
| Deliberately unsafe guard-removal mutation | 367 passed, four expected reached failures | `test-unguarded-mutation.log`, `tests-unguarded-mutation/results.trx`, `mutation-proof.json`. |
| Exact measured guard restored | 371 passed, none skipped/failed; formatting exit 0 | `test-final.log`, `tests-final/results.trx`, `format-final.log`, `final-proof.json`. |

The six TRXs contain 2,208 actual outcomes: 2,204 passed/four expected mutation
failures. Every exact case-sensitive identity/outcome is checked, not only the
runner summary. Every one of the nine new rows passes on original, guarded-added
and final source. The mutation's four exact failure reasons are independently
checked. No additional comparison was consumed by the mutation.

## Exact validation commands and results

From `C:\src\aspnetcore`, activate `. .\activate.ps1` before every direct .NET
shell. The following is the actual phase-specific test command, where `$phase`
is respectively `before`, `after`, `guarded-added`, `original-added`,
`unguarded-mutation` and `final` from the table above and `$run` is the local
evidence directory. Each resulting TRX was fully consumed. Original `before`
first failed with NETSDK1004, then passed 362/362 after the exact restore below;
all other results are the explicit table entries, not inferred passes.

```powershell
. .\activate.ps1
dotnet test .\src\Mvc\Mvc.Razor\test\Microsoft.AspNetCore.Mvc.Razor.Test.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory "$run\tests-$phase"
dotnet restore .\src\Mvc\Mvc.Razor\test\Microsoft.AspNetCore.Mvc.Razor.Test.csproj --disable-parallel -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false --verbosity quiet
dotnet format whitespace .\src\Mvc\Mvc.Razor\test\Microsoft.AspNetCore.Mvc.Razor.Test.csproj --include .\src\Mvc\Mvc.Razor\src\RazorPage.cs .\src\Mvc\Mvc.Razor\test\RazorPageTest.cs --no-restore --verify-no-changes
```

Restore and final exact source/test formatting both exited 0. The test invocation
must not be confused with the intentionally failing unsafe mutation.
Initial harness compile/dependency failures are also retained:
explicit current-repo compile references, correct Routing.Abstractions path,
the Logging package, and the tested shipping Razor dependency closure were
required. Final harness build was warning/error-free. No installed ASP.NET
framework fallback, custom loader or new IVT was used.

Every actual benchmark command is `dotnet` followed by the argument array in
`execution.json`; all six exit 0. It expands to the command below with the
recorded round/variant in exactly A/B, B/A, A/B order:

```powershell
. .\activate.ps1
dotnet "$run\binaries\$variant\AutoPerf.Benchmarks.dll" --filter '*RazorSectionBenchmark*' --inProcess --exporters json csv --artifacts "$run\round-$round-$variant" --job Short --warmupCount 3 --iterationCount 8 --iterationTime 100 --outliers DontRemove
```

Before each launch, the harness executes `--verify-setups`; every original
contract is required twice. The identical oracle is frozen in both owner
closures. Full argument arrays and all raw distribution/control rows survive.

### Reproduction and public derivation

Build/run the repository's `Microsoft.AspNetCore.Mvc.Razor.Test` in Release
first: its tested current-repo shipping DLL closure is a required harness
dependency. Activate the repository's pinned .NET environment. Build
`harness/AutoPerf.Benchmarks.csproj` with `-p:AspNetCoreRoot=C:\src\aspnetcore`,
the same source build flags and `-m:2`; the default root is that checkout.
Freeze the complete original output at the baseline revision, capture the
26 original contracts once, then copy that closure for the proposed owner.
Replace only the built proposed Razor DLL/PDB. Preserve the original harness,
oracle, runtime/dependency JSON and all non-owner files, and verify the recursive
DLL/JSON hashes before any comparison. Do not benchmark two separately compiled
harnesses or silently load the installed ASP.NET framework.

The included `benchmark-runner.ps1` records/refuses overwritten snapshots and
runs at most three pairs in a private `autoperf-runs\F059` workspace next to the
runner. Private binaries must be rebuilt, not downloaded from this branch.
The public raw assets can independently reproduce all five derived JSON files:

```powershell
# $assets is the downloaded F059 evidence directory.
& "$assets\summarize.ps1" -RunRoot $assets
& "$assets\check-tests.ps1" -RunRoot $assets
```

Both commands exited 0 against the exported public evidence; all five outputs
were byte-identical to the private verified derivations. Raw authoritative
C#/csproj bytes are unchanged; only private paths/run/computer identifiers in
text/JSON/TRX logs are redacted, with XML-safe path tokens in TRX.

## Retained analysis and preparation corrections

An initial derived three-value median used PowerShell's rounding cast and
selected the largest rather than middle element. It was corrected to
`Math.Floor(count / 2)`; every one of the 26 numeric medians was independently
checked. The initial aggregate/log remain explicitly labelled, not used for the
final claims. Raw inputs, snapshots and the comparison budget were unchanged.
The test collector's quoted-literal parsing and case-sensitive identity checks
were corrected before publication; six original name pairs differ only in
case, so default case-insensitive sorting incorrectly collapsed real rows.
No shipping source or raw test/measurement outcome was changed by these fixes.

The source acceptance criteria and bounded history/search evidence are included.
Membership/error behavior dates to commit
`931d18b85148e634e5caa1083805f5297cdfd027` (2014).
The zero-result bounded `renderedSections` issue/PR search is not exhaustive
proof that no related work exists. This is a fork-only draft, not an upstream
submission or approval for a release.
