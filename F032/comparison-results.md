# F032 HTTP.sys Flush completed-success guard comparisons

**No-gain:original source/product restored;no optimization commit or performance PR.**
Three consumed attempt slots:one setup-only failure with no statistical sample,two successful six-profile pairs;24reported rows/all192samples retained.
Positive less-time favors the guard;negative is regression. Async rows are unchanged controls. Attempt1has no fabricated comparison row.

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

Maximum within-profile CV:13.31%. Actual cumulative successful global time:58.85seconds;failed setup profile:0.57seconds.
Prepared Sync Flush stays near20ns and regresses in both pairs. Full-request apparent gains reverse. No structural allocation reduction or overall application-speedup claim.

- No-gain means no convincing compatible benefit from this one completed-success guard,not zero original cost or proof that all future improvements are impossible. Original source/product restored;no optimization commit or performance PR.
- Three attempt slots are permanently consumed:round1original fails during async benchmark setup before any statistical sample;round2candidate/original and round3original/candidate are the only two completed pairs. Never describe these as three successful comparisons.
- Pinned BDN0.13.0in-process lifecycle initially does not await async GlobalSetup/GlobalCleanup. Retain the failed original image/logs/null-statistics report. Only harness lifecycle gains synchronous void adapters,outside measured operations;each corrected original/candidate/relocated image additionally completes all6actual setup/workload/cleanup lifecycles.
- Prepared Sync Flush regresses about1%in both valid pairs;ordinary full-request apparent gains reverse into regressions. Unchanged async controls also move. Shared non-isolated Windows VM;retain all192samples/outliers and reported allocation differences without causal small-difference or application-speedup claims.
- Full-request profiles include actual loopback client,server dispatch,plan/callback registration,flush,body/wire consumption and fixture bookkeeping. Ready64 means64synchronous flushes in one request,not64callbacks. Prepared live profiles use one already-started accepted request and one flush per operation,with no new network I/O;not isolated GetResult cost or production throughput.
- Default AllowSynchronousIO=false is preserved and independently exercised. Real OnStarting sets public HasStarted before awaiting callback;pending contracts observe true HasStarted,mutable headers and no received wire headers. Callback-gate cancellation is not RequestAborted production,starvation or deadlock proof.
- The first source restoration preserves old snapshot timestamps;an incremental owner build exits0but leaves the candidate image. Source/owner postcondition rejects it. Retain that wrapper failure;forced owner-only --no-incremental rebuilds byte-match the original/candidate tested DLL/PDB without test reruns.
- Initial uncharacterized preparation builds with11warnings/0errors. Generic IHost and configured async disposal fix them before any characterization/timing;corrected authoritative and relocated standalone builds have0warnings/0errors. All historical inputs/images/logs remain unchanged.
- All47successful native listeners have explicit stopped/disposed receipts. The setup-failed native process has no graceful listener-disposal receipt;its process exit and absence are recorded. Do not claim graceful managed cleanup for that failure.
- All192Workload.Result samples match native stdout and JSON;mean,sample variance,SD,SE are recomputed. MemoryDiagnoser allocations and confidence intervals are reported evidence,not independent cross-thread allocation/GC tracing or CI-distribution derivation.
- Measured original/candidate harness DLL/PDB and184other consumer files are identical;only actually tested HTTP.sys DLL/PDB differ. Relocated harness source is byte-exact and untimed;path-dependent rebuilt harness PE/PDB bytes need not equal the measured ones.
- Sixteen selected owner/API/test/producer files match current main90d90ff3;54raw snapshots include two changed toolchain context files. Pinned campaign SDK/runtime,not newer-default SDK integration or complete repository/history coverage. Remote code index unavailable for this GitHub checkout;LSP coverage is bounded.
- Portable audit rehashes copied textual sources/receipts,not omitted binary bytes. Live audit separately rehashes actual frozen files. Nine selected PE/PDB/source associations per native profile are not complete compiler provenance or method coverage.
