# F029: synchronous Partial completion contract

**Rejected/design-blocked nonblocking replacement; no shipping edit or
performance PR.** The wait is real for a pending view producer, but simply
removing it would violate the synchronous completed-content/error contract.
This rejects that replacement, not every possible future compatible optimization.

The shipped entry point remains
`IHtmlContent HtmlHelperPartialExtensions.Partial(IHtmlHelper,string,object,ViewDataDictionary)`.
Already-compiled callers bind that exact signature. Changing its return to
`Task<IHtmlContent>` breaks that binding; returning incomplete content or moving
the rendering into fire-and-forget work changes output, exception and disposal
semantics. Existing `PartialAsync`/PartialTagHelper caller migrations are already
documented by MVC1000; they are not a new framework source optimization.

## Real owning boundary

The probe calls the actual public synchronous extension, actual
`HtmlHelper.PartialAsync`/`RenderPartialCoreAsync`, real `RazorView.RenderAsync`
and a C#-derived `RazorPage.ExecuteAsync`. The page writes a prefix, reaches its
own incomplete task and completes only after an explicit release. No mocked
`IHtmlHelper` task or injected renderer callback substitutes for that producer.

Before release, the synchronous public calling thread is observed in a sampled
wait, the real RazorView task is incomplete, no completed content has returned
and the disposable view decorator is not disposed. The existing async entry
point returns its incomplete task to the same caller instead. After release,
both preserve complete HTML, the exact unwrapped exception or native cancellation
token, cloned child ViewData/current model, unchanged parent state and one
actual view disposal. No fixed sleeps are used.

Four completed wrappers and six pending success/failure/cancellation producer
contracts pass in the measured image, a byte-exact physically relocated source
copy and the final whitespace-formatted runnable copy. The existing owning
`HtmlHelperPartialExtensionsTest` suite passes **34/34, 0 skipped**, with every
actual TRX execution/result identity retained.

This is a controlled layout-free literal page, not cshtml discovery/compilation
or HTTP. GetView supplies a fresh real RazorView; the literal-only activator is
a no-op after RazorView assigns ViewContext. Unused generator/TempData/layout
interfaces are strict Moq mocks. Public MVC registration resolves the actual
request-scoped `MemoryPoolViewBufferScope`; every operation disposes its scope,
so repeated rendering does not accumulate rented pages.

## Original-only measurements

| Existing API / payload characters | Mean us/op | StdDev us | CV% | Managed B/op | Retained N |
|---|---:|---:|---:|---:|---:|
| Async.Completed32 | 19.222 | 1.517 | 7.89 | 11955 | 8 |
| Async.Completed4096 | 23.066 | 7.668 | 33.24 | 44362 | 8 |
| Sync.Completed32 | 10.810 | 1.550 | 14.34 | 11850 | 8 |
| Sync.Completed4096 | 20.086 | 5.600 | 27.88 | 44362 | 8 |

The largest CV is over33%; all eight results per case remain under DontRemove.
Do not rank the existing APIs or attribute their row differences to an isolated
awaiter cost. No changed source, selected candidate, gain percentage, production
frequency, starvation, deadlock or application-throughput proof is claimed.
The benchmark includes DI scope/helper/page/model/writer/view lookup, strict
unused mocks and consumed output. The pending gates are **untimed**.

One original-only profile; **zero of three possible source comparisons**.
Both budgets are permanently closed. No more historical tuning or timing.

## Source, images and retained preparation failures

Independent source branch `autoperf/F029-sync-partial-source`, unchanged baseline
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Captured current default `c882d21133342f3e10ba346f4533a0189811207c` has identical
bytes for16 selected owner/API/test/Razor/buffer/analyzer files and no selected
intervening history.54 baseline/current/working raw snapshots remain. Bounded
owner history and existing-work searches are included; empty searches are not
proof that no other work exists. Exact runtime TaskAwaiter source ref returned404,
so no speculative completed-task guard or JIT mechanism is proposed.

The original measured and byte-exact relocated consumers each contain294
hashed files. Actual original/relocated live checking rehashes685 unique files,
588 consumer bindings and348 loaded assembly bindings. The final formatted
consumer's294 files and loaded bindings were separately rehashed. Each audited
image retains11 selected PE/PDB/source associations. These are associations,
not complete compiler provenance or method coverage.

Initial standalone sources/build logs retain a public-constructor compile error
and two nullable warnings. The first untimed consumer fails for missing
Hosting.Abstractions; its154-file image identities remain. The next broader
owning-test closure builds with an EventLog version conflict, resolved explicitly
before timing. A later untimed gate check fails after reading mutable ThreadState
twice; the exact failed conjunct was not captured. The recorded sampled-state
observation removes that resampling flaw before any timing. All failures remain.

The project-based whitespace check returns0 with workspace-loading warnings;
it is not treated as direct five-file proof. A direct-folder attempt first rejects
incompatible CLI flags, then identifies anonymous-object whitespace. Exact
historical measured sources/images remain untouched under
`preparation-005\prepared\sources\harness`. Only the runnable `harness` copy is
whitespace formatted after timing closes; non-whitespace character streams match.
That copy passes a direct five-file repository-config whitespace check, rebuild
and4/6 producer characterization without further timing. Its build retains
seven CA2007/CA1829 analyzer warnings activated by the copied repository config,
0 errors. Original measured and byte-exact relocated builds have0 warnings/errors.

## Reproduction and limits

Portable copied-evidence checks, with Node built-ins only:

```powershell
node .\F029-audit.mjs . --verify
node .\F029-audit-publication.mjs . --verify
```

These recheck exact copied source snapshots,34 TRX identities, four means/32
native result samples, sample variance/SD/SE, original/relocated producer gates,
settings and source/PDB receipts, plus the formatted runnable copy. Reported
allocation/CI values are retained, not independent allocation tracing,
CI-distribution or GC arithmetic. Omitted DLL/PDB/native bytes cannot be
physically rehashed by the portable audit.

The runnable C#13/net12 project is `harness\AutoPerf.Benchmarks.csproj`.
Set `AUTOPERF_ASPNETCORE_ROOT` to a matching checkout and first build the actual
MVC ViewFeatures owning tests Release; the project explicitly validates that
tested dependency directory. It does not substitute installed ASP.NET owners.
Every fresh dotnet shell activates `. .\activate.ps1` from the repository root.
Historical guarded drivers retain actual paths/commands and refuse overwrite
or further historical timing. Use the exact source/closure arguments in
`validation-commands.md` for the recorded observation, not an unrestricted replay.

SDK12.0.100-alpha.1.26557.102/runtime12.0.0-alpha.1.26562.105, Release/x64,
concurrent server GC, BDN0.13.0, requested100ms iterations,3 warmups/8 results,
unroll1, MemoryDiagnoser, DontRemove. This is a shared Windows Hyper-V VM,
not an isolated/dedicated host. Heavy work is serialized, max2 build workers;
priority, affinity, power and unrelated processes are not changed. Hardware,
raw logs, adverse variability and exact command outcomes remain.

No public API/baseline/default/visibility/IVT/UnsafeAccessor, root package,
global.json or NuGet.config changes.
