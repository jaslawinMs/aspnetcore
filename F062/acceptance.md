# F062 acceptance and faithful boundary

Current upstream main and independent branch baseline:
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Original `SpaProxyTests`: 11/11 after an exact-project restore prompted by
the actual NETSDK1004 missing-assets failure. Shipping source remains original.

## Disputed precondition and material effect

`UseProxyToSpaDevelopmentServer` resolves the actual host application-stopping
token and calls `SpaProxy.PerformProxyRequest` for every request. That owner
creates a linked source before awaiting the target URI. The same source covers
HTTP send and complete body copy, or both awaited WebSocket pumps. The original
code retains only its token and cannot dispose the source.

Observe the actual source-created linkage, not a copied CTS algorithm:
complete actual proxy operations with a long-lived application-stopping parent,
release/dispose each request's independently created abort source, retain only
weak references to those request sources, and collect at a separate boundary.
Compare real host `StopApplication` after completed public-proxy operations as a
resource/shutdown benchmark. Allocation per operation and request latency are
separate metrics; no decrease in allocations or normal request latency is
assumed from deterministic unregistration.

## Required acceptance

| Requirement | Evidence required before publication |
|---|---|
| Original reachable retention | Original actual owner retains request-abort source after completed work while stopping parent remains live; every resource-regression row reaches its assertion and fails original. |
| Narrow deterministic ownership | Keep the linked source in a synchronous using local from before the target-URI await through all awaited consumers; preserve the existing token local and surrounding control flow. Do not cancel/dispose caller parents or change API/defaults. |
| Successful and failed cleanup | Real source tests cover response success, skipped/proxied 404, URI-task failure, send cancellation/I/O/request exceptions and body-copy I/O failure. Each row preserves its expected result/body/exception and proves release. |
| Full operation lifetime | Observable body-copy gates prove the token remains linked while copying; separately exercise both request-abort and stopping-parent cancellation. No sleep-based timing assertions. |
| Actual public producer | Standalone harness uses public SPA proxy middleware, real hosting lifetime and actual shipping owner. Exercise real loopback HTTP and WebSocket transport before treating those boundaries as verified. Do not add IVT, UnsafeAccessor, a duplicated proxy or installed-framework fallback. |
| Resource and time distinction | Benchmark complete public proxy operations and actual stopping cancellation after prepared completed work, with zero-work and pre-owner failure controls. Supplement with bounded weak-reference/retained-memory observations outside timed work. Keep all non-wins and overhead. |
| Reproducible bounded comparison | Identical harness/runtime/recursive DLL+JSON closure, owner-only difference, at most three serialized alternating A/B pairs, all eight actual samples and complete raw reports retained. No fourth comparison. |
| Persistent honest handoff | Exact final tests/build/format, measured source/owner identity, immutable evidence and remote receipt; only a justified fork-only draft. Immediately request opening any new draft, without claiming its visual rendering. |

The component tests own real BCL token linkage and actual SPA response-copy/error
behavior, but a mocked upstream handler is not a TCP server or WebSocket proof.
The public-owner harness must establish those separate boundaries. Neither
boundary proves browser/Node development-server workflows, every runtime,
NativeAOT, production throughput or universal latency gains.

## Observed collector limitation after comparison 2

The first post-comparison proposed `Http200`/one-completed-request single-GC
observation retained one request source (zero after the later host stop/GC).
That raw result and strict-check failure are retained, not retried or overwritten.
It does not identify the root or prove immediate quiescence. A separate untimed
diagnostic invokes the same frozen real public workload and exact owners, then
records eight bounded GC/yield checkpoints **without ever stopping the parent
during observation**: all original reached rows retain exactly N; all proposed
rows settle to zero. This supplemental boundary and the deterministic
component-level disposal tests support cleanup, not a universal claim that
every cold TCP completion is immediately collectable after one GC.
The measured harness and three-comparison budget remain unchanged.
