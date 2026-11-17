# F030: synchronous RenderPartial writer completion

**Rejected/contract-blocked nonblocking replacement; no shipping edit,
optimization commit or performance PR.** This is an independent evaluation
of `RenderPartial`, not reused F029 timing or a duplicate classification.
It does not rule out every future compatible optimization.

**Compatibility:** Kept
`void HtmlHelperPartialExtensions.RenderPartial(IHtmlHelper htmlHelper, string partialViewName, object model, ViewDataDictionary viewData)`
unchanged because already-compiled callers bind that exact void signature.
A Task-returning replacement breaks that binding. Returning early changes
ordered writer output, original failure/cancellation timing and view disposal.
Existing `RenderPartialAsync` or PartialTagHelper caller migration is already
documented by MVC1000; it is not a new framework source optimization.

## Real parent, partial and writer boundary

A real parent `RazorView` executes a C# `RazorPage` that writes `before|`,
invokes the actual public synchronous or existing async helper, then writes
`|after` only on success. Actual `HtmlHelper.RenderPartialCoreAsync` invokes
a second real `RazorView` and C# page that writes `<p>`, awaits its own
controlled pending producer, then writes the literal payload and `</p>`.

The real parent renderer supplies its actual buffered `TextWriter`. No access
to internal buffer members, private reflection, new IVT or UnsafeAccessor is
used. Public MVC registration resolves the actual request-scoped
`MemoryPoolViewBufferScope`; every operation disposes its own request scope.

Before producer release, all three synchronous success/failure/cancellation
cases observe a sampled waiting calling thread, incomplete real partial task,
no finished public invocation, no parent-after marker and no partial disposal.
Crucially, the outer renderer **has not returned a task to the harness**.
The harness's completed-task-only `GetResult` has therefore not executed and
cannot be the observed wait. The async controls return incomplete actual
public and outer tasks without completing the parent.

After success, the root writer contains exactly
`before|<p>{payload}</p>|after`. After failure, the exact exception reference
appears at both the parent public-call and external boundaries. Cancellation
retains the original token at both boundaries. Failures do not reach the
parent-after marker. Child ViewData is genuinely cloned with the selected
model while parent state remains unchanged; actual partial lookup/render/view
disposal occur once. The caller-owned root writer is restored and left open.
There are no fixed sleeps or mocked HtmlHelper tasks.

Both independently built images pass **four completed wrappers and six pending
producer contracts**. Fresh owning tests pass **34/34, 0 skipped**, with every
actual theory identity/outcome parsed. The four synchronous exception rows use
immediate mocked failures; both three-row expected-argument methods use async
MemberData despite one method's name. They are not misrepresented as real
pending or synchronous-success evidence.

This is a controlled layout-free literal parent/partial render, not cshtml
discovery/compilation or HTTP. GetView supplies the fresh real partial view,
activation is a no-op for the literal pages, and unused generator/TempData/layout
interfaces are strict Moq mocks.

## Original-only completed-render measurements

| Existing API / payload characters | Mean us/op | StdDev us | CV% | Managed B/op | Retained N |
|---|---:|---:|---:|---:|---:|
| Async.Completed32 | 23.639 | 2.464 | 10.42 | 13240 | 8 |
| Async.Completed4096 | 34.364 | 0.630 | 1.83 | 45674 | 8 |
| Sync.Completed32 | 12.144 | 1.329 | 10.94 | 13162 | 8 |
| Sync.Completed4096 | 28.843 | 3.298 | 11.44 | 45674 | 8 |

All eight results per case remain under DontRemove, including the reported
outlier. Maximum CV is 11.44%. The full wrapper includes request scope,
helper/model/parent/partial construction, prepared lookup, unused strict mocks,
buffering, root writer and consumed output. The pending gates are **untimed**.

Do not rank existing APIs or interpret their differences as an isolated
awaiter cost or framework gain. One original-only four-case profile completed
in 169.14 seconds; **zero source comparisons**. Both historical budgets are
permanently closed, with no further tuning or timing authorized.

## Source and image identity

Independent source branch `autoperf/F030-sync-render-partial-source` remains at
unchanged baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Captured current default `25c0a37129f0b855634604704b4989638d59021d` has identical
bytes for 16 selected owner/API/test/producer/analyzer files and no selected
intervening history. All 54 baseline/current/working raw snapshots remain.
Bounded existing-work searches were empty, not proof of universal absence.

Measured and relocated consumers each have 294 hashed files. The live audit
physically rehashes 685 unique files and 984 bindings, including 588 consumer
and 348 loaded assembly bindings. All three native profiles retain 11 selected
PE/PDB/source associations. These are associations, not complete compiler
provenance or coverage. Source relocation can change harness PE/PDB bytes;
there is no before/after isolation claim.

Direct repository-config five-file whitespace checks pass **before** freezing
the measured source and in the relocated build. Both successful Release builds
have **0 warnings and 0 errors**. Measured sources/images remain byte-exact.
The first standalone preparation failed with two CS0136 diagnostic-local
pattern-variable scope collisions. Exact formatted failed sources, inputs,
commands and logs remain; only those names were corrected before any native run.

## Reproduction and limits

Copied-evidence audit using Node built-ins:

```powershell
node .\F030-audit.mjs . --verify
```

The audit checks copied source/closure receipts, all 34 actual TRX identities,
both real-parent characterizations, native runtime/settings/source-PDB receipts
and all 32 result samples against **both native stdout and report JSON**.
Means, sample variance, SD and SE are recomputed. Reported allocation and CI
values are retained, not independent allocation tracing, GC arithmetic or
CI-distribution derivation. Omitted DLL/PDB/native bytes cannot be physically
rehashed by the portable audit.

The runnable C# 13/net12 project is `harness\AutoPerf.Benchmarks.csproj`.
Set `AUTOPERF_ASPNETCORE_ROOT` to a matching checkout and first build the actual
MVC ViewFeatures owning tests Release. The project validates that tested owner
directory rather than substituting installed ASP.NET assemblies. Fresh dotnet
shells activate `. .\activate.ps1` from the repository root.
`validation-commands.md` preserves exact commands, paths and actual results.
Historical guarded drivers refuse overwrite or extra timing.

SDK 12.0.100-alpha.1.26557.102; runtime 12.0.0-alpha.1.26562.105; Release/x64;
concurrent server GC; BDN 0.13.0; requested 100 ms iterations, 3 warmups,
8 results, unroll 1, MemoryDiagnoser, DontRemove. The settings-preserving emitter
records eight matching before/after settings observations. This is a shared
Windows Hyper-V VM, not an isolated/dedicated host. Heavy work is serialized,
max 2 build workers; priority, affinity, power and unrelated processes are not
changed.

No application frequency, throughput, starvation, deadlock, allocation-type,
JIT-mechanism or end-to-end speedup claim. No API/baseline/default/visibility,
root package, global.json or NuGet.config changes.
