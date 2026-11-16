# F092 acceptance, recorded before implementation

Baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Current default head: `b38e2847d9cda5fbba26177354ed11ede3f7dbfe`.
The owner and six inspected producer/test files are byte-identical between
those revisions; this is not whole-revision or runtime equivalence.

The reported wait is required by synchronous `Stream.Read` when bytes are not
available. Returning early, removing synchronous reads or directly consuming
an incomplete `ValueTask` is not an acceptable fix. The only candidate is
avoiding the `ValueTask<int>.AsTask()` wrapper when the real memory read has
already completed successfully. Pending and failed reads must retain the
original task-conversion/wait path. The scanner's blocking premise is not
classified as an unnecessary wait.

Acceptance:

1. Exercise the actual `TestServer`/`ClientHandler` response stream and public
   application `HttpResponse.BodyWriter`, not a reimplementation, subclass,
   private-constructor bridge, injected pipe result or fake HTTP content.
   Record actual owner type, assembly/source identities and setup bytes.
2. Preserve immediate cached results 1/8, uncached results 9/16/256/4096,
   short reads, offsets and untouched buffer sentinels; preserve first and
   repeated EOF, trailer delivery and reader consumption.
3. Produce a genuinely pending synchronous read through the real live
   response. Observe its dedicated worker in the owner wait before releasing
   actual response data, completion or public abort. Preserve zero-length
   pending-read/non-consumption behavior as well as ordinary pending reads.
   Use bounded observable gates, no sleeps or injected completion callbacks.
4. Preserve invalid-array argument exception type/parameter, including the
   previously intentional memory-overload behavior of null/empty inputs;
   preserve pending/previous abort, async cancellation and disposal failures.
   Do not change the async overload, pipe lifecycle or public API.
5. Before editing shipping code, reproduce the original resource cost using
   the real producer. The completed sync read must show an extra task wrapper
   relative to its completed memory-read control for results outside the
   runtime cache. A strict zero-wrapper check must fail on the original and
   pass on the candidate; functional preservation checks are green/green,
   not a manufactured functional red/green claim.
6. Run the focused owning response/lifetime/reset/features tests against
   both sources and inspect actual test outcomes, rows and skip counts.
   Add only focused coverage for the changed synchronous-read seam.
7. Freeze identical harness/runtime/dependency bytes and an owner-only
   binary difference. Use Release/x64, C#13, pinned .NET12 and BDN0.13.0;
   serial shared-host execution, at most two build nodes, no machine tuning.
   At most three measured comparisons across all strategies. Keep every
   target/control result, regression, preparation failure and uncertainty.
8. Publish only a measured justified draft in the fork, or an honest
   no-gain/rejected evaluation. The wait itself remains required. No public
   API, repository package manifest, global.json or NuGet.config changes.

History inspected: the 2022 CA1844 change introduced the memory `ValueTask`
overload and array `AsTask()` shim; the 2022 standard-validation change
intentionally removed the restrictive buffer validator. The latter explicitly
motivates preservation of zero-byte and memory-overload validation behavior.
Official `Stream.Read` documentation permits blocking until data or EOF and
permits a zero-byte read to wait without consuming bytes.

Preparation observation, before any shipping edit or measurement: HttpClient's
real StreamContent exposes a read-only wrapper. Prepared-owner cases therefore
use the public TestServer.SendAsync returned HttpContext.Body, which is the
actual owner created by HttpContextBuilder. PublicSync retains HttpClient's
wrapper and verifies complete response/EOF and ClientHandler trailer copying.
The prepared path does not register ClientHandler's trailer-copy callback and
does not claim to verify that callback. No private unwrap or alternate stream
implementation is used.
