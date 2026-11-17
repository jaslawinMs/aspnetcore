# F031: completed-success template task guard

**No-gain: original shipping code restored; no optimization commit or
performance PR.** One compatible success guard was measured in three paired
comparisons. The results do not establish a convincing overall benefit.
They do not prove zero original cost or rule out future optimizations.

**Compatibility:** Kept
`IHtmlContent HtmlHelper.Display(string expression, string templateName, string htmlFieldName, object additionalViewData)`
and
`IHtmlContent HtmlHelper.Editor(string expression, string templateName, string htmlFieldName, object additionalViewData)`
unchanged because compiled views bind those synchronous content-returning
entry points. A Task-returning replacement breaks that binding; returning
unfinished content changes output, exception/cancellation timing and disposal.
Instead, the measured internal guard skips `GetAwaiter().GetResult()` only when
`renderTask.IsCompletedSuccessfully`; every pending, faulted or canceled task
still takes the original wait/error path. That guard is retained as a proposal
patch and measured source snapshot, but is not kept in shipping code.

## Results

Positive less-time values favor the guard; negative values are regressions.
`Display.Default` rows are unchanged built-in String-template controls.
All eight samples per row remain under DontRemove.

| Profile | Round | Original us/op | Guard us/op | Less time % | Original B/op | Guard B/op | Original CV% | Guard CV% |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Display.Completed32 | 1 | 31.726 | 31.296 | 1.36 | 13682 | 13682 | 26.31 | 27.24 |
| Display.Default32 | 1 | 6.372 | 6.254 | 1.86 | 12034 | 12033 | 1.00 | 1.10 |
| Editor.Completed32 | 1 | 10.102 | 9.409 | 6.86 | 13497 | 13497 | 16.71 | 18.77 |
| Display.Completed4096 | 1 | 49.422 | 47.976 | 2.93 | 78451 | 78451 | 9.22 | 6.90 |
| Display.Default4096 | 1 | 33.858 | 30.834 | 8.93 | 60774 | 60774 | 6.77 | 1.64 |
| Editor.Completed4096 | 1 | 40.349 | 45.781 | -13.46 | 78509 | 78507 | 6.70 | 7.98 |
| Display.Completed32 | 2 | 31.436 | 32.182 | -2.37 | 13554 | 13682 | 32.92 | 27.99 |
| Display.Default32 | 2 | 6.550 | 6.353 | 3.02 | 12033 | 12033 | 1.05 | 1.21 |
| Editor.Completed32 | 2 | 9.693 | 9.663 | 0.31 | 13497 | 13497 | 21.32 | 18.10 |
| Display.Completed4096 | 2 | 48.780 | 41.348 | 15.24 | 78507 | 78452 | 11.45 | 8.34 |
| Display.Default4096 | 2 | 31.884 | 33.981 | -6.57 | 60774 | 60774 | 1.43 | 2.88 |
| Editor.Completed4096 | 2 | 49.325 | 40.952 | 16.98 | 78507 | 78507 | 12.41 | 4.25 |
| Display.Completed32 | 3 | 33.868 | 31.762 | 6.22 | 13682 | 13682 | 17.99 | 29.60 |
| Display.Default32 | 3 | 6.276 | 6.382 | -1.68 | 12033 | 12033 | 4.56 | 2.11 |
| Editor.Completed32 | 3 | 9.375 | 9.418 | -0.45 | 13497 | 13497 | 20.29 | 23.37 |
| Display.Completed4096 | 3 | 51.668 | 47.757 | 7.57 | 78452 | 78507 | 11.10 | 8.34 |
| Display.Default4096 | 3 | 31.458 | 31.697 | -0.76 | 60775 | 60774 | 1.87 | 5.87 |
| Editor.Completed4096 | 3 | 48.759 | 46.975 | 3.66 | 78508 | 78507 | 9.73 | 9.41 |

The long custom Display template is favorable in all three pairs:
**2.93%, 15.24% and 7.57%** less mean time. This favorable result is not omitted.
Other targets reverse or regress: long Editor changes from 13.46% slower to
16.98% faster and 3.66% faster; short Display and short Editor also reverse.
Unchanged controls move too. Maximum within-profile CV is **32.92%**.

Allocations are not uniformly identical: the short first case has a 128 B/op
adverse difference, long Display has opposing 55 B/op observations, and 1-2
B/op residuals remain. The guard adds no proposed allocation-removal mechanism;
no structural allocation or overall resource saving is claimed. These are
whole prepared helper/request/template/output wrapper measurements, not
isolated awaiter costs or API rankings.

Exactly **three source comparisons**, six timed native profiles, 36 reported
rows and **288 native stdout/JSON result samples** are retained. The alternating
order is original/candidate, candidate/original, original/candidate. Reported
cumulative global time is 477.55 seconds. The timing budget is permanently
closed: no fourth comparison, tuning or unfavorable-sample removal.

## Actual producer and output contracts

The actual public synchronous helper resolves property metadata, invokes
`TemplateBuilder` and `TemplateRenderer`, then a real `RazorView` executes a C#
template page. The page writes `<p>`, awaits its own controlled producer, writes
the actual child ViewData model with real HTML encoding, then writes `</p>`.
Actual scoped MVC registration supplies `MemoryPoolViewBufferScope`; internal
buffer classes are not constructed or accessed by the harness.

The calling worker invokes Display/Editor directly: there is **no harness task
wait** to confuse with the disputed wait. Before pending producer release,
both APIs observe an incomplete real RazorView task, sampled waiting calling
thread, no returned content, unfinished public invocation, root `before|`
only and no view disposal. Pending success, failure and cancellation each
exercise the actual template producer.

After success, returned IHtmlContent is consumed before request-scope disposal:
`before|returned|<p>{HTML-encoded model}</p>|after`. Failures/cancellation retain
the exact exception identity or original token at public and outer boundaries,
leave root `before|` only and still dispose the selected view exactly once.
Checks cover cloned child ViewData, real selected model, formatted model value,
`Parent.Field` prefix, merged additional view data, isolated template mutation,
mode-specific GetView/FindView selection and the restored/open caller writer.

Each of the original, candidate and independently rebuilt relocated images
passes **six completed profiles and 12 additional contracts**: two FindView
fallbacks, four already-faulted/canceled producers and six pending producer
outcomes. The two built-in display controls bypass custom view rendering.
There are no fixed sleeps or mocked HtmlHelper tasks.

Prepared lookup, a no-op activator for the literal C# page and strict unused
Moq generator/TempData/layout interfaces are explicit seams. The root provider
and metadata provider are prebuilt/warmed; per-request scope, helper, lookup,
page/view, encoding, writer, output consumption and disposal costs are included.
This is not HTTP or cshtml discovery/compilation.

## Source, tests and image identity

The independent branch `autoperf/F031-template-completed-task` is restored to
baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Captured current main `25c0a37129f0b855634604704b4989638d59021d` matches 21 selected
owner/API/test/producer files, with no selected intervening history. All 69
baseline/current/working raw snapshots remain. Bounded work searches found a
historical merged disposal PR, not an active matching success-guard proposal;
they are not universal absence proof. Captured Display/Editor documentation
is in display-templates.md; a separate editor-templates.md fetch returned 404
and is retained explicitly.

Both fresh owning scopes pass **525/525, 0 skipped**, with every TRX identity
and outcome independently parsed. TemplateRendererTest's 16 rows cover type
names, not asynchronous template completion; the helper/default-template
suites and independent real-page contracts supply the other boundaries.
The first original wrapper exits 1 after the native tests pass because
Measure-Object returns a null Sum for the ordered-dictionary property.
The old wrapper and unchanged native logs/TRX/outcome bytes remain. Corrected
numeric-value aggregation reverified that same native invocation, without
rerunning it or mislabeling a test failure.

**The measured original/candidate harness DLL and PDB are byte-identical.**
Both consumers have 294 files and differ only in the actually tested
ViewFeatures DLL/PDB. Every frozen file is guarded before/after native runs.
All nine audited native profiles record 12 selected source/PE/PDB associations.
These are associations, not complete compiler provenance or method coverage.
Physical relocation can change separately rebuilt harness PE/PDB bytes; its
source is byte-exact and its reproduction is untimed.

The live audit physically rehashes **1,000 unique files / 5,200 bindings**,
including 882 consumer and 4,242 loaded-assembly bindings. Historical product
paths are not assumed to hold both variant hashes simultaneously: the matching
frozen consumers retain each tested variant. Restored product DLL/PDB bytes
match the original tested owner.

Direct repository-config five-file whitespace checks precede measured-source
freezing. Measured and relocated standalone Release builds, plus the restored
owner build, have **0 warnings and 0 errors**. Native measured sources/images
remain byte-exact. No public API/baseline/default/visibility, new IVT,
UnsafeAccessor, root package, global.json or NuGet.config changes remain.

## Reproduction and limits

Copied read-only audit using Node built-ins:

```powershell
node .\F031-audit.mjs . --verify
```

The audit checks all 1,050 actual TRX rows, all nine native profile receipts,
three characterizations, selected source/PDB and runtime/settings evidence and
all 288 samples against both native stdout and report JSON. Means, sample
variance, SD and SE are recomputed. Allocation and confidence-interval values
are retained reported evidence, not independent allocation tracing, GC
arithmetic or CI-distribution derivation. The abbreviated BDN Parameters field
is not used for identity: the audit uses full FullName and actual setup labels.

The runnable C# 13/net12 project is `harness\AutoPerf.Benchmarks.csproj`.
Set `AUTOPERF_ASPNETCORE_ROOT` to a matching checkout and first build the actual
MVC ViewFeatures owning tests Release. Each dotnet shell activates
`. .\activate.ps1` from that checkout's root. The verified byte-exact relocated
source build and native characterization prove this project is not merely a
source listing. `validation-commands.md` records exact commands and outcomes.
Historical guarded drivers retain this machine's recorded paths, refuse
overwrite and forbid extra historical timing; relocation requires a fresh
consumer/source closure rather than reusing a byte-different build with the
old closure. Omitted DLL/PDB/native bytes are hashed but not published and
cannot be physically rehashed by the copied portable audit.

SDK 12.0.100-alpha.1.26557.102; runtime 12.0.0-alpha.1.26562.105; Release/x64;
concurrent server GC; BDN 0.13.0; requested 100 ms iterations, 3 warmups,
8 results, unroll 1, MemoryDiagnoser, DontRemove. The byte-exact
settings-preserving emitted executor records **72 matching before/after
settings observations**. This shared Windows Hyper-V VM is not dedicated or
isolated. Heavy work is serialized, max 2 build workers; priority, affinity,
power and unrelated processes are not changed.

No production frequency, HTTP throughput, request-abort producer, starvation,
deadlock, JIT-mechanism, allocation-type or application-speedup claim.
