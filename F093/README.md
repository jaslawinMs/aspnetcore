# F093: synchronous request-services disposal has no supported gain

**No-gain; no performance PR.** Three unchanged-strategy AB/BA/AB comparisons
show no material, attributable lifecycle/request improvement and no prepared
allocation reduction. Shipping source and the actual Http owner DLL are
restored **byte-for-byte**, including the owner PDB. The independent
[baseline branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F093-sync-request-dispose)
is published at `37e809ead5824bc753a1c3d56f11615bdb1296c5`; it deliberately
does not retain the unsupported optimization. The
[exact evaluated patch](candidate-source.diff) and both measured source
snapshots remain with the raw results.

The original completed non-generic `ValueTask.AsTask()` already returns
cached **Task.CompletedTask**. Four real disposal-only batches of5000 owners
each allocate **zero bytes on both sources**. This differs from F092's
generic Task<int> wrapper; there is no wrapper allocation here to remove.

## What was measured

The single nine-addition/one-deletion experiment consumes only a successfully
completed `DisposeAsync()` value directly and retains `AsTask/GetResult` for
pending and failed values. It does not change DisposeAsync, scope clearing,
validation, public API/defaults, visibility or dependencies.

All **42 prepared lifecycle heap pairs are unchanged**. The only target
profiles faster in every pair are PreparedSync/AsyncCompleted16 (**0.87%
faster median**) and PublicExplicitSync/Sync16 (**0.55% faster median**).
These tiny observations do not establish a meaningful causal gain.
PreparedSync/Sync16 is **slower in every pair**, median0.52%.

Prepared sync target timings range **8.76% faster to24.26% slower**; full
public explicit-sync targets range **7.72% faster to5.75% slower**.
Unchanged async controls move **31.34% faster to57.58% slower**.
PublicRegisteredAsync/AsyncCompleted1, which never uses the changed sync
method, has the largest movements in pairs3/1 and the maximum **18.75% CV**
in pair2. All controls, regressions and raw samples remain.

Public explicit-sync target reported heap differences range **48 B more to
29 B less**. The largest334B reduction is an **unchanged normal-async
control**, not a target saving. No full-request allocation reduction is
attributed to the source change. Shared-host or scheduling movement is not
used to erase unfavorable observations.

[All84 paired outcomes, absolute means/heap/CV](comparison.md).
[All168 raw outcomes](raw-outcomes.json).
[1344 console-linked result samples/504 warmups/GC totals](console-measurement-receipts.json).
[168 actual setup receipts](setup-correctness.json).

## Required wait and actual producers

The retained card reports that synchronous RequestServicesFeature.Dispose
can block on asynchronous scope cleanup. That observation is real, but the
public IDisposable compatibility contract requires completion before return.
CA2012 commit `d86be87daa42e73d665cc2b31cedd37ddf52aef5` explicitly replaced
direct ValueTask.GetResult with AsTask/GetResult. Removing the pending wait
would undo that correction, not fix an unnecessary operation.

Actual DefaultHttpContext.RequestServices creates the public owner through
its production feature factory and a real Microsoft.Extensions DI scope.
Prepared methods include real context/scope creation, scoped-service
resolution and disposal. They are not an isolated hidden caliper.
Seven profiles cover empty scope, synchronous1/16, completed async1/16,
dual-interface1 and completed IValueTaskSource-backed1 resources.
Async cleanup is selected for dual resources, and source GetResult is
consumed. There is no synthetic installed owner, mock scope, private
constructor access, cross-assembly visibility bridge or injected response
completion callback.

Public methods use actual TestServer/HttpClient and its real application.
The default RegisterForDisposeAsync callback prefers IAsyncDisposable.
The actual TestHost completed-response callback chain owns that cleanup.
Because response EOF can precede disposal, the harness separately awaits
a real OnCompleted callback registered **before request services**, which
runs after its real disposal. A genuinely pending scoped async resource
proves that this final callback cannot run before release.

PublicExplicitSync exercises an application explicitly calling the public
owner's synchronous Dispose; its later registered async cleanup remains
idempotent. PublicRegisteredAsync exercises ordinary registered asynchronous
cleanup and is **unchanged**. No claim is made that normal requests call
the modified method or that its frequency is high.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| Owned scope disposal, dual preference and source consumption | All28 real setup cases per launch verify actual public owner/DI provider, created/disposed counts, dual async preference, IValueTaskSource.GetResult, reference clearing, root-provider survival and full public response200/ok. Exact assembly/harness hashes and process identity are console-linked. |
| Required pending caller compatibility and ordering | `RequestServicesProbe.VerifyAsync` scenarios PendingSyncAsyncSuccess/Fault and PendingSyncDualSuccess/Fault observe four actual dedicated callers in WaitSleepJoin before the real scoped resource releases. Pending references remain; successful completion clears them, failures remain unwrapped and repeated disposal preserves the original clearing behavior. Original/selected observations match. |
| Nonblocking async and real registered response cleanup | PendingAsyncReturns observes an incomplete actual disposal value; ActualRegisteredResponseGate exercises the actual server callback chain and verifies that final response cleanup waits for the real resource, not an injected callback. |
| Failure and unowned-provider partitions | ImmediateSyncFault, ImmediateAsyncFault, MissingScopeFactory and AssignedProvider preserve actual exceptions/reference ordering and caller-owned provider survival. All10 functional observations match across owners. |
| Actual existing callback/assigned-provider tests | `Microsoft.AspNetCore.Http.DefaultHttpContextTests.RequestServicesAreNotOverwrittenIfAlreadySet`, `RequestServicesAreDisposedOnCompleted` and `RequestServicesAreDisposedAsynOnCompleted` each pass on original, candidate and restored owners. All9 actual unskipped rows/definitions/durations are checked; the existing callback tests alone are not claimed as real server-producer evidence. |
| Allocation premise and unsupported change removal | Each of4 actual completed-scope kinds returns the identical cached Task.CompletedTask and disposes5000 real owners with0 bytes on both sources. These are green/green checks, not a manufactured original red. [Restoration](restoration.json) verifies actual original source/DLL hashes and3 restored tests. |
| Fair execution and every outcome | Complete126-file copied sets/58 declared runtime assets differ only in Http DLL/PDB. Identical retained harness/runtime/deps. Original-host owner/four harness portable-PDB source proofs; all168 outcomes/84 pairs/1344 console results/504 warmups/168 setups and GC arithmetic/rounding audited. |

## Environment, exact commands and reproducibility

[External pinned BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj).
BDN0.13.0; Release/net12.0/x64/in-process/concurrent-server-GC; C#13.
SDK `12.0.100-alpha.1.26557.102`; runtime pack
`12.0.0-alpha.1.26562.105`; banner `.NET12.0.0 (12.0.26.56305)`.
Actual corelib and DI informational versions identify source revision
`dfd6ac738610ea05f42e704be82b386e71052e12`.
BDN retains its unknown-processor label; separate read-only inventory reports
Intel Xeon Platinum8473C,8 cores/16 logical processors, MaxClockSpeed2100.

This is a **shared Windows machine**, not a dedicated performance host.
CPU-heavy work was serial; build commands used max2 nodes. No power, affinity
or unrelated process changes. Eight retained results/three actual warmups per
case, requested100ms, DontRemove. **Budget3/3 closed, one unchanged strategy**;
no fourth comparison, hidden tuning or result deletion.

[Exact commands and outcomes](validation-commands.md). Every fresh dotnet
shell activates from C:\src\aspnetcore with `. .\activate.ps1`. The external
new/changed manifest restores using the unchanged repository NuGet.config;
repository dependency/SDK/package manifests are not changed. The legacy
fixture builds with recorded ASPDEPR004/ASPDEPR008 deprecation warnings.

`node .\reproduce-analysis.mjs . --verify` and
`.\F093-xml-audit.ps1 -RunRoot . -Verify` revalidate published raw/source/setup/
test/proof records without rewriting them. **DLL/PDB bytes are omitted**:
the public audit cannot independently rehash those bytes or recreate the
original-host portable-PDB inspection from a recorded proof.

Current upstream default owner and five inspected producer/test files match
the campaign baseline. This is scoped identity, not whole-newer-branch or
runtime equivalence. The CA2012 history, pinned ValueTask source and source
provenance remain. Preparation metadata-host incompatibility, a corrected
WebEncoders reference warning and sealed-class BDN discovery failure are
retained. The discovery command exited zero but selected no benchmark;
the corrected non-sealed class and all four exact methods were validated
before timing. Actual logical/resource checks previously passed. Per-case
assembly/console linkage was strengthened before the first comparison,
with prior source/proof receipts retained rather than overwritten.

This establishes the in-memory request-services scope/response boundary,
not network throughput, browser behavior, arbitrary applications, startup,
other runtimes/OS, synchronization-context behavior or a universal faster
disposal mechanism. The required wait remains and no performance proposal
is retained in shipping code.
