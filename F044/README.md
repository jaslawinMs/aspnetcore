# F044: single-probe section registration for custom base pages

**Qualified, workload-dependent local result; fork research draft only, not merge-ready.**
The predeclared two-section registration primary uses **10.22% median paired less time** at
**704 B/op unchanged**. This changes `RazorPageBase.DefineSection`, not the ordinary
`RazorPage` override. It does **not** establish a normal MVC-page or application speedup.
One-section and full-view regressions are retained below.

| Artifact | Direct evidence |
|---|---|
| Independent implementation and preservation coverage | [Two-file source commit](https://github.com/jaslawinMs/aspnetcore/commit/099fcb681338358303dbdb1ce3910a52bd3c23f6), [verified source receipt](source-publication.json) |
| Draft, tracking issue and final campaign indexing | [Additive publication receipt](publication.json); added after this immutable evidence snapshot without rewriting its files |
| Complete measured BenchmarkDotNet/Razor SDK project | [Project](harness/AutoPerf.Benchmarks.csproj), [benchmarks](harness/SectionRegistrationBenchmarks.cs), [six real compiler fixtures](harness/Views), [all 13 input hashes](harness-source-hashes.json) |
| All comparisons, regressions, allocations and variability | [Full tables](comparison-results.md), [independently reconstructed arithmetic](audit-summary.json) |
| Actual tests, builds and failed preparation | [Exact commands with results](validation-commands.md), [individually XML-parsed test rows](actual-paired-test-row-validation.json) |
| Freshly restored and rebuilt project, both source variants | [Untimed reproduction receipt](reproduction-paired-001/verified-reproduction.json), [exact copied project](reproduction-paired-001/project) |
| Criteria declared before shipping edits and timing | [Plan](acceptance-plan.json), [closed 3/3 budget](diagnostic-budget.json), [permanent close receipt](permanent-budget-close.json) |
| Actual producer reachability and source integrity | [Generated C#](compiled-producer-sources), [compiler-input proof](compiler-generated-producer-proof.json), [portable verifier](F044-verify.mjs), [sealed hashes](capsule-file-hashes.json) |

## What changed

Use concrete `Dictionary<string, RenderAsyncDelegate>.TryAdd` instead of `ContainsKey` followed
by an indexer assignment. Keep both null guards, their order, the duplicate branch and its
attempted-name error text. Do not change collection allocation, the private field, signatures,
public API, layouts or `RazorPage.DefineSection`.

The cast follows a current internal invariant: this class's sole readonly store is initialized
to an ordinal-ignore-case `Dictionary`, and the nonvirtual get-only property returns that same
store. Callers can mutate entries but cannot replace it through the supported API.
This is not a new public promise that every `IDictionary` is concrete.

The `IDictionary.TryAdd` extension would retain the extra lookup here. An untimed owned-comparer
BCL diagnostic observes hash counts of 2/2/1 for original/interface-extension/concrete operations
on a populated dictionary, and 1/1/1 when fresh. This is not instrumentation of the production
Razor comparer or proof that every registration saves a hash.

## Which producer actually reaches this body?

Ordinary compiler-generated `RazorPage<T>` instances inherit the separate `RazorPage` override.
They do **not** exercise F044. The separate [F043 evaluation](../F043/README.md) remains unchanged;
none of its timings or conclusions are reused.

F044's six `.cshtml` fixtures explicitly use `@inherits Microsoft.AspNetCore.Mvc.Razor.RazorPageBase`.
The real SDK emits their `ExecuteAsync` methods and `@section` calls. Reflection requires each
compiled type's direct base and resolved `DefineSection` declaration to be `RazorPageBase`.
The harness does not copy or override that registration algorithm.

The direct-base class also requires `BeginContext`, `EndContext` and
`EnsureRenderedBodyOrSections`. Fixture-only `@functions` implementations provide the same empty
context hooks as real `RazorPage`, and **throw** if these content fixtures are used as layouts.
The actual `RazorView` validates the real `RazorPage` layout, which consumes every section.
Custom layout implementations and general custom-base feature compatibility are not evaluated.
The first attempt omitted these abstract implementations and failed CS0534; all 13 failed inputs
and the corrected-input revision are preserved under `preparation/direct-base-compiler-001`.

The [documented `@inherits` directive](https://learn.microsoft.com/en-us/aspnet/core/mvc/views/razor?view=aspnetcore-10.0#inherits)
permits choosing a base class. Actual compiler/runtime reachability is established by these executed
fixtures, not inferred from the documentation's different `RazorPage<T>` example.
No frequency or prevalence of direct-base custom views is asserted.

## Primary result, controls and adverse outcomes

Before any shipping edit or timing, the primary was fixed as `RegisterFreshPage/Two`: the smallest
fresh-page workload that reaches an already-populated section store. The numerical criterion is
at least 5% median paired less time with at least two faster comparisons, or a repeated actual
primary saving of at least 16 B/op. Control credibility is reviewed separately.

| Pair | Order | Original ns/op | Candidate ns/op | Primary less time | Unchanged NoSections control less time | Primary B/op |
|---|---|---:|---:|---:|---:|---|
| 1 | Original, Candidate | 138.16 | 124.04 | 10.22% | 4.79% | 704 / 704 |
| 2 | Candidate, Original | 124.80 | 121.80 | 2.40% | -10.38% | 704 / 704 |
| 3 | Original, Candidate | 168.64 | 144.79 | 14.14% | 5.18% | 704 / 704 |

The primary is faster in all three pairs and exceeds its corresponding unchanged-path effect
each time. The median is **10.217%**, versus control median **4.794%**.
The controls are not stable: their range is -10.38% to 5.18%; primary CV reaches 11.56%.
These are shared-machine local observations, not a precision estimate or production guarantee.
No extra control-adjusted primary, retuned candidate or fourth timing run was substituted.

| Other boundary/profile | Median paired less time | Qualification |
|---|---:|---|
| Registration, One | -3.17% | Includes a 40.06% individual regression; not a one-section win |
| Registration, Eight | 12.42% | All three faster; no allocation saving |
| Registration, SixtyFour | 23.88% | All three faster; no allocation saving |
| Registration, EightLong | 39.04% | Deliberately hash-heavy; not asserted representative |
| Full view, Two | 0.30% | No material full-view gain claimed |
| Full view, One | -0.35% | Includes a 6.15% individual regression |
| Full view, Eight | -6.74% | Two of three regress; worst is 8.25% more time |
| Full view, EightLong | 8.05% | All three faster; not application throughput |
| Full view, SixtyFour | 5.73% | All three faster; not application throughput |

All 12 cases, 72 report rows and 576 retained observations are in the full tables.
Only `NoSections` is the unchanged-path control; `One` still executes changed code.
All registration allocation deltas are zero. Mixed few-byte full-view differences are not
structural memory savings. Three source-comparison authorizations are permanently consumed.
The result qualifies only as a **workload-dependent custom-base registration proposal**.

## Preservation and validation scope

`RegisterFreshPage` includes a fresh actual compiled page, normal collections/delegates,
generated registration and section-count readback. Setup context is reused; compilation,
service setup, callbacks and layouts are excluded.

`RenderFullView` executes actual `RazorView.RenderAsync`, original dictionary transfer,
scoped `MemoryPoolViewBufferScope`, real layout section consumption, exact final HTML validation
and scope/writer disposal. A custom locator and empty activator exclude production view discovery
and unused helper injection. This is not HTTP, a browser or an application-throughput test.

**Why add tests?** The existing duplicate-registration fact constructs a `RazorPage` subclass,
whose override bypasses the changed base method. The new two-row test uses `Mock<RazorPageBase>`
with `CallBase` to cover that method's rejection and retained callback. Those unit rows do not
prove compiler reachability; the separate real SDK producer/rendering characterizations do.

| Requirement | Evidence |
|---|---|
| Case-insensitive rejection preserves key, writer, deferral and eventual original output | `DefineSection_BaseImplementationRejectsCaseInsensitiveDuplicateWithoutReplacingWriter(duplicateName: "scripts")` and `(duplicateName: "SCRIPTS")`; each row passes independently on original and candidate |
| Adjacent existing page/rendering behavior stays intact | Complete `RazorPageTest` class: 59 original and 59 candidate passed, zero failed/skipped; existing override coverage is not relabeled direct-base producer proof |
| Null argument order, empty name, null-valued slot, duplicate state/message and legacy adapter | [Ten actual contract cases](characterization-candidate-001/states/0011-public-contracts.json), including deferred legacy forwarding with the original null writer |
| Real generated base-body producer, transfer, pooled scope and exact output | [Default Two](characterization-current-default-001/states/0007-compiled-producer-and-rendering.json), [original Two](characterization-original-001/states/0007-compiled-producer-and-rendering.json), [candidate Two](characterization-candidate-001/states/0007-compiled-producer-and-rendering.json); all six profiles and 12 boundaries pass per variant |
| Project can be independently rebuilt | Fresh 13-file project restores/builds; both rebuilt consumers pass ten contracts and 12 real boundaries without timing |

This is green/green preservation coverage, not a semantic-bug red/green claim.
Exact executed commands, outcomes and every parameterized TRX row are retained.
The two-file whitespace check passes without modifying source.

## Source, provenance and reproduction

The independent branch starts at `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Observed current default was `31c15331c03714b7a602e1817e65881474c29e2e`.
Their complete MVC Razor-area Git tree matches. An actual current-default managed owner/dependency
build and its characterization passed before the shipping edit; tree identity alone was not called
whole-build or dependency equivalence.

The measured images each contain 264 files. Only the Razor owner DLL/PDB differ; the other 262,
including the common harness binaries, are byte-identical. Loaded hashes, matching owner PE/PDB
identity and three executable source documents are checked. Four selected metadata/test/project
files are not claimed as owner PDB documents. The candidate was built before publication; its
SourceLink baseline is not relabeled the later source commit. Physical snapshots and PDB checksums
identify the executed edit. Complete compiler provenance and every dependency's source are excluded.

SDK 12.0.100-alpha.1.26557.102; runtime 12.0.0-alpha.1.26562.105; BenchmarkDotNet 0.13.0; C# 13.
Three warmups, eight retained iterations, requested 100 ms, unroll 1, no outlier removal.
The settings-preserving in-process executor changes no priority, affinity or power setting.
All 144 benchmark-settings and 22 before/after runtime records are checked.
The environment is shared, not a dedicated performance machine.

Builds intentionally exclude JS/static-web-assets and native IIS using `BuildNodeJS=false`,
`StaticWebAssetsEnabled=false` and `UseIisNativeAssets=false`. No full-repository, native IIS,
packaging, browser or application build pass is claimed.
Related [dotnet/aspnetcore#70128](https://github.com/dotnet/aspnetcore/pull/70128) changes collection
laziness and layout bookkeeping, not either `DefineSection` body; all five actual patches were read.

The complete measured project is under `harness`. Its historical `AspNetCoreRoot` defaults to
`C:\src\aspnetcore`; override `-p:AspNetCoreRoot=<your checkout>` elsewhere. First build the existing
`src\Mvc\Mvc.Razor\test\Microsoft.AspNetCore.Mvc.Razor.Test.csproj` managed prerequisites in Release.
Follow the repository build documentation and activate `. .\activate.ps1` before every fresh
shell's `dotnet` commands. Do not change protected dependency manifests.
The command catalog includes exact historical arguments with results.

A separate directory was actually restored and rebuilt from all 13 byte-exact inputs.
Both rebuilt consumers passed against their preserved source owners, with no extra timing.
Historical paths are observations, not portable binary paths. Compiled/restored bytes are omitted
with hashes. Further campaign timing is forbidden; independent future replication requires its
own freshly built images, manifests and explicit authorization, not reuse of this closed budget.

The relocated source/results-only capsule can be checked with Node and PowerShell 7:

```powershell
node .\F044-verify.mjs . --require-seal
```

The verifier reconstructs all retained values from native actual/overhead lines, checks statistics
and BDN midpoint-to-even allocation arithmetic, parses both TRX inventories, and verifies source,
image and reconstruction metadata. BDN allocation source and its MIT license are included.
The classified positive report remains its separate fixed 118-finalized snapshot.
