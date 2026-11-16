# F095: the obsolete page-loader bridge has no supported material gain

**No-gain; no performance PR.** The original warmed `IPageLoader.Load`
bridge already allocates **0 bytes per call**. A successful-task `Result`
guard supplies no allocation saving and makes fresh descriptor loading
slightly slower in all three comparisons. Tiny cached-call improvements
are retained below, not denied or promoted into an application gain.
The required pending wait remains.

Shipping source and the actual RazorPages owner DLL/PDB are restored
**byte-for-byte**, including the DLL loaded by the restored tests.
The independent [baseline branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F095-sync-page-loader)
remains at `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
[The evaluated patch](prototype-source-diff.patch) and
[both](source-before/PageLoader.cs) [measured source snapshots](source-after/PageLoader.cs)
are retained as evidence only. No unsupported shipping optimization is kept.

## Measurements and qualifications

One nine-addition/one-deletion prototype obtains the actual modern loader's
Task once, reads `Result` only when `IsCompletedSuccessfully`, and retains
the original `GetAwaiter().GetResult()` path for pending, faulted and
canceled tasks. It does not change the modern overload, public shape,
defaults, cache fields, compiler, factory, endpoint metadata, DI identity,
dependencies or any other source seam.

**All18 warmed allocation pairs are0B on both sources.** Separately,
four real-DI/default-catalog batches of5000 primed public calls each
allocate0B on original and prototype. These are green/green preservation
checks, not a fabricated allocation bug-fix red/green.

Cached original descriptors are faster in every pair, **5.48% median**,
but the third comparison is only **0.25%**, approximately0.01ns.
Actual returned compiled-self inputs are also faster in every pair,
**0.92% median**; the largest11.21% observation is confined to pair3.
These bounded nanosecond observations do not establish material
application benefit or the frequency of obsolete-interface use.

Fresh descriptors using the actual precompiled catalog/default model
factory/endpoint producer are **0.65-1.59% slower in every pair**,
median0.66%. Their approximately40.6KB allocation belongs to real
descriptor/model/endpoint creation, not a removable awaiter wrapper.
This is a cold descriptor against a warmed catalog, not cold application
startup, Razor source compilation or runtime-compilation I/O.

Gated legacy callers move **22.80% faster to34.72% slower**, median21.46%
slower; scheduling dominates this owned-gate scenario. Modern callers
bypass the changed obsolete bridge but share its changed owning assembly.
Those **unchanged-source controls** move **41.89% faster to169.87% slower**.
The largest slowdown is ModernWait/CachedOriginal pair3, with only1.04%
maximum within-pair CV: low within-launch variance does not explain or
establish the cause of a cross-launch control movement. It is retained,
not discarded as noise. ModernAsync/CompiledSelf is slower in every pair,
median2.76%. Maximum CV is101.76%, from the untouched-source gated
ModernWait second pair. No shared-host, JIT-layout or scheduling explanation
is asserted as proven.

[All36 pairs: absolute means, heap and CV](comparison.md).
[All72 raw outcomes](raw-outcomes.json).
[576 actual console-linked results/216 warmups/GC totals](console-measurement-receipts.json).
[72 actual owner/harness/PID-linked setup receipts](setup-correctness.json).
**Budget3/3 is closed; one unchanged strategy, AB/BA/AB.**
No fourth run, hidden tuning, discarded pair or substitute runtime.

## Actual producers and the retained compatibility contract

The retained scan card is `blocking-async-result-or-wait`, reporting that
the synchronous `IPageLoader` bridge can block on `LoadAsync`. Its
medium/likely/moderate scanner classifications are provenance, not proof
of a defect or hot production path.

The actual `DefaultPageLoader` caches its task on the input descriptor;
already-compiled input lazily caches a completed Task returning itself.
The original awaiter/GetResult bridge has no `AsTask` wrapper.
Pending compiler work must complete before this retained synchronous
contract returns. Removing that wait or silently returning early would
change the contract, not remove an unnecessary allocation.

[2019 async-routing history](2019-async-routing-history.diff)
(`39e52578d354a6a7abb3f6169d5ac2174ffe4551`, dotnet/aspnetcore#7938)
introduced the async PageLoader and obsolete synchronous compatibility
interface. [2021 history](2021-deprecation-history.diff)
(`4eca86fa1bcc7a38a8e396bc120d8a322753742b`, dotnet/aspnetcore#28444)
introduced endpoint-metadata loading and routed the bridge through that
modern overload, retaining its wait.

The harness uses **normal AddRazorPages DI**. Public PageLoader and obsolete
IPageLoader resolve to the same real DefaultPageLoader singleton. A valid
hand-authored typed-page assembly attribute is loaded by the real
CompiledRazorAssemblyPart/RazorCompiledItemLoader and DefaultViewCompiler.
The actual default application model/compiled descriptor factory creates
the typed page, OnGet handler, route endpoint and metadata. No private
cache field is seeded, no mock compiler/default model provider is substituted,
and no visibility or non-public-access bridge is added.

Four profiles distinguish cached original descriptor, actual returned
compiled-self input, fresh descriptor and gated precompiled compiler.
Three callers exercise the obsolete bridge, direct modern waiting call
and modern async call. The timed paths consume the real handler count;
full snapshot/type/endpoint/cache validation and JSON writing happen in
setup, not inside timed completed calls. The async harness adds its own
Task<int> consumption adapter, identical across variants; these are
same-harness measurements, not raw API latency guarantees.

A public IViewCompilerProvider extension delegates to the real precompiled
compiler and owns the pending/fault/cancel gate. The real DefaultPageLoader
awaits it. An owned coordinator observes the sync caller in WaitSleepJoin
before release, or observes the actual modern task returned pending before
release. No synchronization sleep or injected framework callback substitutes
for that producer. Immediate cached-fault/cancel bridge calls are checked
after the real pending producer creates the cached failed/canceled task.

Inspected legacy PageActionInvokerProvider blocks on the **modern overload
directly**, not this obsolete bridge. Dynamic matching also uses the modern
async API. Those call sites are not changed or attributed to F095.
Bounded source inspection does not prove absence of external interface users
or their call frequency.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| Current-default source and provenance | Ten exact owner/interface/DI/caller/default compiler/model-provider/catalog/test blobs match baseline and scoped upstream default `b38e2847d9cda5fbba26177354ed11ede3f7dbfe`; actual 2019/2021 diffs are retained. This is not whole-newer-branch equivalence. |
| Real compiled catalog, DI, cold/warm/self/task/result/endpoint identity | `LoaderLifecycle.Validate` and `LoaderBenchmark.Verify` run all12 actual setup cases twice per launch, verifying typed compiled item, same real DI owner, handler/route/metadata, actual compiler invocation versus cache bypass, fresh-result identity and public cached task/result identity. All72 measured setups match their counterpart source. |
| Validation, metadata order and cache behavior | `LoaderProbe.VerifyFunctional` checks actual null parameter, two endpoint metadata identities/order, same cached endpoint/task/result, and intentionally ignored metadata from a later cached request. Original/prototype observations match. |
| Required pending waits, async return, faults/cancellation and cached failures | `LoaderProbe.VerifyFunctional` runs actual compiler-extension fault/cancel producers for both waiting obsolete and modern async callers. Four producer-reached/pre-release observations, exact unwrapped exception types/messages, canceled/faulted states and repeated cached task/bridge behavior match across sources. |
| Existing model and route preservation | `DefaultPageLoaderTest.LoadAsync_InvokesApplicationModelProviders`, `DefaultPageLoaderTest.LoadAsync_InvokesApplicationModelProviders_WithTheRightOrder`, and `DefaultPageLoaderTest.LoadAsync_CreatesEndpoint_WithRoute` pass on original, prototype and restored owners. |
| Existing cache and compiled-self preservation | `DefaultPageLoaderTest.LoadAsync_CachesResults`, `DefaultPageLoaderTest.LoadAsync_IsUniquePerPageDescriptor`, and `DefaultPageLoaderTest.LoadAsync_CompiledPageActionDescriptor_ReturnsSelf` pass on all three owners. All18 actual rows/definitions/positive durations are audited; zero skips. These mock-compiler/provider tests alone do not prove the separate real DI/catalog path. |
| Genuine allocation premise and removal of unsupported prototype | `LoaderProbe.MeasureResources` performs4x5000 primed actual public calls per source with0B allocation; all18 measured warm heap pairs are0B. [Restoration](restoration.json) records exact original source/DLL/PDB/test-loaded DLL identity and six actual restored tests. |
| Fair immutable execution and every observation | Complete276-file copied sets/104 declared runtime assets differ only in RazorPages DLL/PDB; same harness/runtime/deps. Twenty actual owner/producer/four-harness portable-PDB source proofs,72 outcomes/36 pairs/576 results/216 warmups/72 setups and actual GC/statistic arithmetic are audited. |

## Reproduction, exact commands and boundaries

[External BenchmarkDotNet project](harness/AutoPerf.Benchmarks.csproj):
BDN0.13.0, Moq4.20.72 matching the repository, C#13,
Release/net12.0/x64/in-process/concurrent-server-GC.
SDK `12.0.100-alpha.1.26557.102`; runtime pack
`12.0.0-alpha.1.26562.105`; banner `.NET12.0.0 (12.0.26.56305)`.
Actual corelib and DI informational versions identify revision
`dfd6ac738610ea05f42e704be82b386e71052e12`.

This is a **shared Windows box**, not a dedicated benchmark host.
CPU-heavy work is serial; builds use max2 nodes. No campaign power,
affinity or unrelated-process changes. Eight retained results/three
actual warmups per case, requested100ms, DontRemove.
BDN reports Unknown processor and missing core counts; separate
[read-only inventory](hardware-inventory.json) reports Intel Xeon
Platinum8473C,8 cores/16 logical processors, MaxClockSpeed2100.
Both observations are retained.

[Exact commands and outcomes](validation-commands.md). Every fresh dotnet
shell activates from C:\src\aspnetcore using `. .\activate.ps1`.
Only the new external manifest required restore; repository global.json,
package manifests and NuGet.config are unchanged. One preparation compile
error and an incomplete initial service-registration failure are retained.
They were corrected before freeze; final builds have0 warnings/errors.
Failed preparation does not count as a successful behavioral check or
an additional measured comparison.

`node .\reproduce-analysis.mjs . --verify` and
`.\F095-xml-audit.ps1 -RunRoot . -Variants before,after,restored -Verify`
revalidate all published raw/source/setup/test/resource/restoration records
without rewriting them. **Actual DLL/PDB bytes are omitted.** The public
audit rechecks their recorded hash/closure/PDB inspection receipts; it
cannot independently rehash omitted binaries or repeat original-host
portable-PDB inspection without rebuilding.

Raw measured source bytes are preserved, including CRLF. Their canonical
Git blob identity is checked using explicit CRLF-to-LF conversion, not
by pretending measured and Git bytes are identical.

The faithful boundary is managed DI/default precompiled catalog/default
page model/cache/route endpoint plus a public compiler-extension producer.
It is not Razor source compilation, runtime-compilation I/O, HTTP/browser
execution, application startup, production throughput/frequency, arbitrary
custom PageLoader behavior, synchronization-context testing, or another
OS/runtime. No performance proposal is retained in shipping code.
