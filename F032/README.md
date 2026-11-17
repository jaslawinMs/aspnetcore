# F032: HTTP.sys synchronous Flush response-start task

**No-gain. Original source and product restored; no optimization commit or performance PR.**
The compatible completed-success guard does not show a convincing benefit. A nonblocking
replacement would break synchronous completion, callback ordering and wire-header delivery.

The independent [source branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F032-httpsys-flush-start)
remains at `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Sixteen selected owner/API/test/producer files match current main
`90d90ff3574fb9b0b59838e9cebca908e6af93c5`; 54 raw snapshots also retain the
different default toolchain context. This is pinned campaign SDK/runtime validation,
not integration against the newer default SDK.

## Measured result

Three attempt slots are consumed permanently: the first original-only attempt fails
during benchmark setup before statistical sampling, then two complete opposite-order
pairs succeed. **Not three successful pairs.** All 24 reported rows and 192 result samples
remain; the failed attempt retains its null-statistics report and native error.
Positive less-time values favor the guard; negative values are regressions.
Async rows are unchanged controls.

| Profile | Attempt | Original us/op | Guard us/op | Less time % | Original B/op | Guard B/op | Original CV% | Guard CV% |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Request.Sync.None.1 | 2 | 307.472518 | 290.628591 | 5.48 | 10429 | 10502 | 7.10 | 9.42 |
| Request.Sync.Ready.1 | 2 | 267.076393 | 255.068800 | 4.50 | 11330 | 11325 | 9.13 | 6.32 |
| Request.Sync.Ready.64 | 2 | 257.346286 | 257.210633 | 0.05 | 11356 | 11327 | 6.78 | 5.69 |
| Request.Async.Ready.1 | 2 | 339.719868 | 341.351460 | -0.48 | 11111 | 11026 | 7.01 | 7.87 |
| Live.Sync.Started | 2 | 0.020147 | 0.020365 | -1.09 | 0 | 0 | 0.49 | 1.51 |
| Live.Async.Started | 2 | 0.024121 | 0.024094 | 0.11 | 0 | 0 | 0.53 | 0.91 |
| Request.Sync.None.1 | 3 | 269.665856 | 311.031641 | -15.34 | 10568 | 10509 | 13.31 | 9.50 |
| Request.Sync.Ready.1 | 3 | 249.645499 | 276.060868 | -10.58 | 11311 | 11359 | 6.40 | 5.89 |
| Request.Sync.Ready.64 | 3 | 255.611280 | 279.755949 | -9.45 | 11302 | 11334 | 4.78 | 8.28 |
| Request.Async.Ready.1 | 3 | 386.460662 | 370.745539 | 4.07 | 11022 | 11032 | 6.31 | 11.17 |
| Live.Sync.Started | 3 | 0.020277 | 0.020515 | -1.17 | 0 | 0 | 0.32 | 1.19 |
| Live.Async.Started | 3 | 0.024232 | 0.024572 | -1.40 | 0 | 0 | 0.44 | 2.13 |

The prepared synchronous call stays near 20 ns and regresses about 1% in both pairs.
Ordinary full-request apparent gains reverse; unchanged controls move too.
Allocations are observations, not a structural saving or independent cross-thread trace.
No application-throughput, production-frequency, starvation or deadlock claim.

## Actual producer and boundary

The fixture starts public `UseHttpSys` on a unique ephemeral localhost port, with
`MaxAccepts=1`, and sends actual HTTP/1.1 requests with the proxy disabled.
The real request owns `ResponseStream`, `RequestContext.OnResponseStart`,
`NotifiyOnStartingAsync`, public `OnStarting` callbacks and native `ResponseBody`.
There is no fabricated native request context, substituted response stream or
hand-injected framework start delegate.

The real synchronous server call waits for pending callbacks. Before release, the
callback is pending, the calling server thread is observed waiting and client headers
have not arrived. Public `HasStarted` is already true while headers remain mutable:
that flag is not wire-header completion. Release verifies actual payload, status,
protocol, callback LIFO and exact error reference/cancellation token.
Cancellation is a callback-gate producer, not `RequestAborted`.

Full-request profiles include real loopback/client/dispatch/plan/registration/flush/
wire-consumption/bookkeeping costs. `Ready.64` means 64 flushes in one request,
not 64 callbacks. Prepared-live profiles hold one actually started accepted request
alive through measurement, perform one flush per operation with no new network I/O,
then consume the body during cleanup. Explicit synchronous-I/O opt-in is required;
the unchanged default `AllowSynchronousIO=false` is separately checked.

| Requirement | Evidence |
|---|---|
| Completed request/live paths | `Request.Sync.None.1`, `Request.Sync.Ready.1`, `Request.Sync.Ready.64`, `Request.Async.Ready.1`, `Live.Sync.Started`, `Live.Async.Started` |
| Real pending completion/error/token and async controls | `Sync.PendingSuccess.Enabled`, `Sync.PendingFailure.Enabled`, `Sync.PendingCancellation.Enabled`, and the corresponding three `Async.*.Enabled` cases |
| Already failed/canceled callbacks | `Already.AlreadyFaulted`, `Already.AlreadyCanceled` |
| Default synchronous-I/O rejection after real callback production | `Sync.PendingSuccess.DefaultDisabled`, `Default.Sync.Disabled` |
| Additional completed async controls | `Async.Completed`, `Async.NoCallback` |
| Actual benchmark lifecycle | Six `benchmark-lifecycle-characterized` receipts per corrected original/candidate/relocated image; setup returns before workload and cleanup returns after wire consumption/host disposal |
| Existing owning native scenarios | Both variants pass the exact same 15 TRX rows, including distinct `ResponseBody_ZeroLengthTrailingWrite_Success(setContentLength: true/false)`; all identities in `validation/*/actual-outcomes.json` |

The focused owning selection includes 13 full-host rows and two lower Listener rows;
the latter bypass `ResponseStream` and are not passed off as its pending-start evidence.
Exact commands and exit codes are in [validation-commands.md](validation-commands.md).

## Preserved failures and provenance

The pinned BDN 0.13.0 in-process emitter does not wait for the initial asynchronous
global lifecycle methods. The first workload reaches an unentered request and the guard
stops it before any statistical sample. Its attempt remains consumed. Only harness
setup/cleanup gain synchronous void adapters around private async lifecycle methods,
outside timed operations. All six actual lifecycles are then characterized before timing.
The emitter/package, six profiles, optimization and measured operation boundaries do not change.

The first source restoration preserves old file timestamps; an incremental owner build
exits 0 but leaves the candidate image. The source/owner postcondition rejects it.
Forced owner-only `--no-incremental` rebuilds subsequently byte-match both previously
tested variants, with no functional-test rerun or timing-budget reset.

The initial uncharacterized standalone image has 11 warnings/0 errors. Generic `IHost`
and configured async disposal fix them before native characterization or timing.
The authoritative and relocated standalone builds have 0 warnings/0 errors.
Historical inputs, failed outputs and frozen images are not rewritten.

Each measured image has 186 frozen files. Harness DLL/PDB and the other 184 files
are identical between measured variants; only actually tested HTTP.sys DLL/PDB differ.
The relocated source is byte-exact and independently built/characterized without timing.
Selected source/PE/PDB witnesses cover nine documents per native invocation, not
complete compiler provenance or method coverage.

The live audit rehashes 1,259 unique physical files/5,795 bindings, including 1,116
consumer and 4,589 runtime-loaded assembly bindings. All 47 successful native listeners
have explicit stopped/disposed receipts. The failed native process lacks graceful
listener-disposal evidence; its exit and absence are recorded. Do not claim graceful
managed cleanup for that failure.

This is a shared, non-isolated Windows VM. Heavy work is serialized, builds use at most
two workers, and the settings-preserving emitter records 48 successful and two failed-attempt
before/after settings observations. No priority, affinity, power, URL ACL, firewall or OS
settings are changed, and no unrelated process is terminated.

## Sources and read-only reproduction

[harness/AutoPerf.Benchmarks.csproj](harness/AutoPerf.Benchmarks.csproj) contains the
five C# source files, six-profile BDN configuration, pinned runtime and exact emitter.
Build the real HTTP.sys functional-test dependencies with the repository's Windows
build instructions first; set `AUTOPERF_ASPNETCORE_ROOT` to that clone and activate
its local .NET environment before building the project. Original/candidate source,
build inputs, source/closure manifests, exact machine paths and every native command
are retained. Historical drivers require path adaptation for another checkout;
prepared JSON must bind a fresh actual image rather than pretending omitted binaries exist.

The recorded campaign timing budget is permanently closed. The standalone relocated
build and producer verification are untimed. To audit the copied textual evidence:

```powershell
node .\F032-audit.mjs . --verify
```

The copied audit verifies preserved text/statistics/receipts, not omitted native bytes.
See [omitted-file-manifest.json](omitted-file-manifest.json) and the separate live audit.
The immutable evidence is published first; `publication.json` then records the verified
tracking issue, immutable commit and remote-blob verification.
