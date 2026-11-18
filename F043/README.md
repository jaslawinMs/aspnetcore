# F043: single-probe Razor section registration

**Disposition: no-gain for the predeclared primary/control decision; no performance PR.**
This does not mean every measured workload was unchanged. Scaled registration improved consistently,
but the small primary did not establish a credible attributable gain against the unchanged control.
The [decision](decision.json) explicitly records that the primary **passes the raw numerical timing gate**.

| Artifact | Direct evidence |
|---|---|
| Experimental implementation and preservation test | [Two-file source commit](https://github.com/jaslawinMs/aspnetcore/commit/c486eef54e98f8e982509480019cd55490287193), [verified source receipt](source-publication.json) |
| Tracking and final campaign receipt | [Additive publication receipt](publication.json); added after the immutable evidence snapshot, without rewriting it |
| Real runnable BenchmarkDotNet/Razor SDK project | [Project](harness/AutoPerf.Benchmarks.csproj), [benchmarks](harness/SectionRegistrationBenchmarks.cs), [six actual compiler fixtures](harness/Views), [exact 13-file manifest](harness-source-hashes.json) |
| Every paired result, including regressions and variability | [Comparison tables](comparison-results.md), [independent arithmetic](audit-summary.json) |
| Actual tests, builds, characterization and preparation failures | [Exact commands and outcomes](validation-commands.md), [individually XML-parsed test results](actual-paired-test-row-validation.json) |
| Freshly restored and rebuilt project, both source variants | [Untimed reproduction receipt](reproduction-paired-001/verified-reproduction.json), [exact copied project](reproduction-paired-001/project) |
| Preimplementation criteria and exhausted budget | [Original plan](acceptance-plan.json), [closed 3/3 budget](diagnostic-budget.json), [permanent close receipt](permanent-budget-close.json) |
| Portable integrity/arithmetic audit | [Verifier](F043-verify.mjs), [immutable file hashes](capsule-file-hashes.json) |

## What changed, and why the spelling matters

`RazorPage.DefineSection` checks `SectionWriters.ContainsKey(name)` before assigning its indexer.
The experiment uses concrete `Dictionary<string, RenderAsyncDelegate>.TryAdd`, preserving both null
guards and the existing duplicate exception branch/message. It does not change `RazorPageBase`,
collection allocation, layout behavior, signatures, public API or the separate finding F044.

The cast follows a specific current same-assembly invariant, not a stronger public API promise:
`RazorPageBase` initializes its sole readonly store to an ordinal-ignore-case `Dictionary`;
the nonvirtual get-only property returns that same store. Supported callers can mutate entries,
but cannot replace the dictionary. The small seam comment documents that coupling.

Simply calling the `IDictionary.TryAdd` extension would not achieve the same lookup reduction here.
The [untimed adjacent BCL diagnostic](characterization-original-001/states/0012-adjacent-bcl-diagnostics.json)
observes 2 hash calls for both the original and interface extension on an already-populated dictionary,
versus 1 for concrete `Dictionary.TryAdd`. All three observe 1 on a fresh unallocated dictionary.
These are owned-comparer BCL observations, **not instrumentation of Razor's production comparer**
and not proof of a performance saving by themselves.

## Result and control-qualified decision

The primary was fixed before shipping edits and timing: `RegisterFreshPage`, profile `Two`.
The numerical rule is at least 5% median paired less time with the primary faster in at least 2/3 comparisons,
or a repeated actual primary saving of at least 16 B/op. A separate predeclared rule rejects small effects
that are not credible against the unchanged controls and variability.

| Comparison | Order | Primary original ns/op | Primary candidate ns/op | Primary less time | Unchanged registration control less time | Primary B/op |
|---|---|---:|---:|---:|---:|---|
| 1 | Original, Candidate | 148.50 | 140.76 | 5.21% | 5.84% | 800 / 800 |
| 2 | Candidate, Original | 139.22 | 134.69 | 3.26% | 4.34% | 800 / 800 |
| 3 | Original, Candidate | 144.90 | 135.29 | 6.63% | 1.03% | 800 / 800 |

The primary median is **5.213% less time**, with no allocation saving. The untouched no-section
registration control moves **4.343%**. In two comparisons the primary's apparent gain is no larger
than that control. Only the third has a larger primary effect than the control.
This passes the numerical gate but not the control/variability credibility review on this shared machine.
No new control-adjusted primary or extra timing attempt was substituted.

Secondary median paired results remain visible, rather than being described as no improvement:

| Secondary case | Median less time | Qualification |
|---|---:|---|
| Registration, 8 ordinary names | 13.69% | All three faster; no allocation saving |
| Registration, 64 ordinary names | 23.78% | All three faster; no allocation saving |
| Registration, 8 names with 256 extra characters | 39.88% | All three faster; deliberately hash-heavy, not asserted representative |
| Full managed view rendering, 8 long names | 8.79% | All three faster; scoped rendering boundary, not application throughput |
| Full managed view rendering, 2 names | 0.61% | Includes a regression; no material full-view gain claimed |

All 12 cases, 72 report rows and 576 retained observations are in the [full tables](comparison-results.md).
`NoSections` is the unchanged-path control at both boundaries. `One`, scales, long names,
negative outcomes and all measured allocations are retained. The 64-name full-render byte deltas
and noisy 8-name full-render byte movement are not relabeled as an allocation optimization.
Three authorizations are permanently consumed; the budget is not reopened.

## Faithful validation boundaries

The six fixtures contain actual `@section` directives compiled by the Razor SDK.
The harness discovers actual `RazorCompiledItem` types and executes their real `ExecuteAsync`,
not a copied registration algorithm or a handwritten registration loop.
[Observed generated C#](compiled-producer-sources) is retained separately from the input fixtures.
Actual callbacks originate in those compiled types, registration writes no section body,
and the original dictionary/delegates are transferred to the layout.

`RegisterFreshPage` includes a fresh real compiled page, normal page collections and compiler-created
delegates, actual registration and section-count observation. Setup-created context is reused;
compilation, DI setup, callbacks and layout rendering are excluded.

`RenderFullView` executes real `RazorView.RenderAsync`, actual dictionary transfer,
scoped `MemoryPoolViewBufferScope`, section consumption by a layout, exact HTML validation,
and scope/writer disposal. A custom locator and empty activator exclude real view discovery and unused
helper injection. It is not hosted HTTP, a browser, production traffic or whole-application throughput.

| Requirement | Evidence |
|---|---|
| Case-insensitive rejection preserves key, writer, deferral and eventual original output | `DefineSection_RejectsCaseInsensitiveDuplicateWithoutReplacingWriter(duplicateName: "scripts")` and `(duplicateName: "SCRIPTS")`; each row passes independently on both versions |
| Existing same-case rejection | Existing `DefineSection_ThrowsIfSectionIsAlreadyDefined`; complete 59-row `RazorPageTest` class passes on both versions |
| Null validation order, empty name, externally null-valued slot, duplicate state/message | [Nine actual public contract cases](characterization-candidate-001/states/0011-public-contracts.json) |
| Real producer, callback origin, transfer, pooled scope and exact output | [Default Two](characterization-current-default-001/states/0007-compiled-producer-and-rendering.json), [original Two](characterization-original-001/states/0007-compiled-producer-and-rendering.json), [candidate Two](characterization-candidate-001/states/0007-compiled-producer-and-rendering.json); all six profiles and 12 boundaries pass for each |
| Exact common project independently runnable | Fresh 13-file copy restores/builds successfully; both rebuilt consumer characterizations pass 9 contracts and 12 boundaries, without timing |

This is green/green behavior-preservation coverage, not a claimed bug-fix red/green.
The actual source and full TRX inventories are retained, including each parameter row.

## Source, build and provenance limits

The independent source branch starts at `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Current default at intake was `c5baf473f31fa3bbe9f8201e3411361c632f3a91`.
The entire `src/Mvc/Mvc.Razor` Git tree is canonically identical at those commits.
An actual current-default managed Razor owner/dependency build and its public/compiled producer
characterization passed before the shipping edit. Tree identity alone was not called build equivalence.

The managed build intentionally excludes JS/static-web-assets and native IIS prerequisites:
`BuildNodeJS=false`, `StaticWebAssetsEnabled=false`, and, for the owning test graph,
`UseIisNativeAssets=false`. No full assets, native IIS or full-repository build is claimed.
All initial missing-assets/ANCM failures and the invalid one-line Razor fixture preparation are retained,
including the failed fixture/generator sources. The corrected compiler inputs and builds pass.

The measured images each contain 264 files. Only the actual source-built Razor DLL/PDB differ;
the other 262 files, including both common harness binaries, are byte-identical.
The audit checks actual loaded owner/image hashes, matching PE/portable-PDB identity,
and three executable PDB documents: `RazorPage.cs`, `RazorPageBase.cs` and `RazorView.cs`.
The other four selected files are metadata/test/project context, not invented executable PDB documents.

The candidate was built before its publication commit. Its embedded SourceLink still names the baseline;
the tested physical snapshots and selected PDB checksums, not that SourceLink URL, identify the edited code.
This is not complete compiler provenance or proof for every unselected dependency source.
The fresh reconstruction changes only harness DLL/PDB relative to each measured image and preserves
all actual owner/dependency bytes and selected source proofs.

SDK: 12.0.100-alpha.1.26557.102; runtime: 12.0.0-alpha.1.26562.105; BenchmarkDotNet: 0.13.0;
C# 13; 3 warmups, 8 retained iterations, requested 100 ms, unroll 1, no outlier removal.
The settings-preserving in-process executor leaves process/thread priority, affinity and power settings
alone. All 144 per-benchmark settings records and 22 before/after runtime records are checked.
The environment is shared, not a dedicated performance machine.

[Related David Fowler work](https://github.com/dotnet/aspnetcore/pull/70128) changes collection laziness
and layout bookkeeping, not `DefineSection`. Its five actual file patches were inspected;
none of its independent allocation savings are attributed here.

## Use the project and audit the evidence

The complete measured project is under `harness`. Its historical default `AspNetCoreRoot` is
`C:\src\aspnetcore`; override `-p:AspNetCoreRoot=<your checkout>` elsewhere. First build the existing
`src\Mvc\Mvc.Razor\test\Microsoft.AspNetCore.Mvc.Razor.Test.csproj` managed prerequisites in Release.
Follow the repository build documentation and activate `. .\activate.ps1` from that checkout before
every fresh shell's `dotnet` commands. Do not edit the repository's pinned dependency manifests.
The [command catalog](validation-commands.md) contains exact executed commands and their outcomes.

The independent reconstruction restored and rebuilt all 13 byte-exact inputs in a different project
directory, then passed characterization against both real source owners.
Historical absolute paths are observations, not a claim that frozen binaries or old private paths
are shipped in this capsule. Compiled/restored bytes are omitted with [hashes](omitted-file-hashes.json).
The closed campaign budget authorizes no additional timing.

With Node and PowerShell7, the relocated source/results-only capsule can be checked without building
or timing anything:

```powershell
node .\F043-verify.mjs . --require-seal
```

The verifier independently reconstructs all retained values from native actual/overhead lines,
checks sample statistics and BDN's midpoint-to-even allocation arithmetic, parses both TRX files,
and verifies the frozen metadata and reproduction receipts.
Original [BDN allocation code](BenchmarkDotNet-0.13.0-GcStats.cs) and its
[MIT license](BenchmarkDotNet-0.13.0-LICENSE.md) are included for that arithmetic reference.
The classified positive report remains its separate fixed 118-finalized snapshot.
