# F033 HTTP.sys synchronous Write completed-success guard comparisons

**Qualified no-callback-scoped fork proposal;declared callback primary mixed,not merge-ready.**
Three completed alternating six-profile pairs;36reported rows/all288samples retained. Positive less-time favors guard;negative is regression. Async rows are unchanged controls.

| Profile | Attempt | Original us/op | Guard us/op | Less time % | Original B/op | Guard B/op | Original CV% | Guard CV% |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Request.Sync.None.128 | 1 | 326.562741 | 299.697986 | 8.23 | 10654 | 10715 | 7.62 | 9.82 |
| Request.Sync.Ready.128 | 1 | 269.860852 | 259.733371 | 3.75 | 11582 | 11572 | 6.65 | 5.84 |
| Request.Sync.Ready.4096 | 1 | 328.359201 | 333.522872 | -1.57 | 19518 | 19504 | 5.80 | 6.44 |
| Request.Async.Ready.128 | 1 | 360.149583 | 360.254558 | -0.03 | 11430 | 11492 | 12.93 | 10.23 |
| Live.Sync.Started.Zero | 1 | 0.020105 | 0.019884 | 1.10 | 0 | 0 | 0.55 | 0.63 |
| Live.Async.Started.Zero | 1 | 0.026452 | 0.027733 | -4.84 | 0 | 0 | 0.92 | 7.42 |
| Request.Sync.None.128 | 2 | 327.877198 | 290.270248 | 11.47 | 10720 | 10730 | 6.90 | 6.59 |
| Request.Sync.Ready.128 | 2 | 269.501341 | 282.944470 | -4.99 | 11519 | 11561 | 6.62 | 5.40 |
| Request.Sync.Ready.4096 | 2 | 342.643713 | 330.230971 | 3.62 | 19505 | 19494 | 4.60 | 9.03 |
| Request.Async.Ready.128 | 2 | 356.516899 | 339.280317 | 4.83 | 11365 | 11429 | 6.65 | 7.88 |
| Live.Sync.Started.Zero | 2 | 0.020446 | 0.019866 | 2.84 | 0 | 0 | 3.86 | 0.83 |
| Live.Async.Started.Zero | 2 | 0.026863 | 0.026435 | 1.59 | 0 | 0 | 3.29 | 0.71 |
| Request.Sync.None.128 | 3 | 306.634748 | 248.053389 | 19.10 | 10687 | 10725 | 4.79 | 6.34 |
| Request.Sync.Ready.128 | 3 | 255.816726 | 254.446762 | 0.54 | 11512 | 11538 | 5.17 | 3.95 |
| Request.Sync.Ready.4096 | 3 | 332.885522 | 329.073838 | 1.15 | 19520 | 19507 | 5.50 | 5.55 |
| Request.Async.Ready.128 | 3 | 334.944654 | 338.325122 | -1.01 | 11401 | 11541 | 6.22 | 4.69 |
| Live.Sync.Started.Zero | 3 | 0.020187 | 0.019970 | 1.07 | 0 | 0 | 0.46 | 0.35 |
| Live.Async.Started.Zero | 3 | 0.026455 | 0.026363 | 0.35 | 0 | 0 | 0.67 | 0.72 |

Maximum within-profile CV:12.93%. Actual cumulative successful global time:90.44seconds.
No-callback128B supporting profile improves in all3pairs;declared callback primary reverses. Prepared zero-byte gain is tiny and does not establish a nonzero network/application speedup. No structural allocation reduction claim.

- Qualified fork-only proposal,not a general/default/primary-case improvement or merge-ready result. No-callback128B full requests measured8.23/11.47/19.10%less time across all3pairs;declared completed-callback primary measured3.75%less,4.99%more,0.54%less. Keep the primary regression and all favorable/adverse results equally visible.
- Prepared already-started zero-byte Sync Write measured only1.07-2.84%less time,about0.22-0.58ns/op. Initial128B/header send occurs before timing;one measured zero write returns before a new native send. Not nonzero network throughput or explanation/proof that this tiny local saving causes the entire full-request difference.
- The no-callback improvement is scenario-specific supporting evidence,not promotion of the mixed declared primary. Shared non-isolated Windows VM;all8samples/outliers retained per row. Unchanged async controls also move,and loopback/dispatch/scheduling/code-generation/fixture costs prevent attributing the full change to the eliminated GetResult call alone.
- All3predeclared alternating source-comparison pairs complete;6timed native launches,36rows/all288samples. Budget permanently closed. Initial failed characterization is untimed and consumes no source-comparison slot;no extra benchmark after the third pair.
- MemoryDiagnoser full-request allocation residuals are retained,including higher no-callback allocations in every candidate pair and mixed/control changes. Prepared profiles remain0B/op;no structural managed-allocation reduction or cross-thread allocation/GC tracing claim.
- Real public UseHttpSys generic hosts and accepted HTTP/1.1 loopback requests own start/callback/native-body production. Full requests include client,dispatch,plan/registration,ranged128B/4096B writes,complete bytes and bookkeeping/disposal. Offset3sentinels are not transmitted. Not external network or application throughput,production frequency or later runtime/platform evidence.
- Only synchronous ResponseStream.Write changes. Pending/faulted/canceled start tasks remain awaited;Flush/all async methods/native producer/API/baselines/default AllowSynchronousIO=false unchanged. Real pending contracts observe public HasStarted=true,mutable headers,actual waiting synchronous server caller,incomplete callback/public invocation and absent wire headers.
- All52concrete semantic observations match measured original/candidate and relocated original,including exact error types/parameter names,callback LIFO/reference/token,immediate header state and complete wire SHA256. Buffer validation remains after start and before synchronous-IO rejection. Callback-gate cancellation is not RequestAborted production,starvation or deadlock proof.
- Initial original characterization assumed exact base ArgumentException/no parameter for past-end array;the pinned native owner actually throws ArgumentOutOfRangeException(count). Retain initial image,raw negative exit and partial contracts. Corrected contract records actual errors before assertion;portable audit separately requires exact type/parameter equality across variants. Public reported CoreLib commit lookup returns404,not compiler provenance.
- Both actual owning native suites pass15/15rows with0skipped,including both Boolean theory values. Thirteen full-host rows and two lower Listener rows per variant;lower rows bypass ResponseStream. No semantic bug-fix red/green claim:correctness contracts intentionally pass original and compatible guard;performance comparison is actual native timing.
- Measured186-file consumers differ only in actual tested HTTP.sys DLL/PDB.184unchanged files total includes the2harness DLL/PDB,leaving182other unchanged files. Candidate copies original harness;relocated source is byte-exact and independently built/characterized without timing,not a claim that rebuilt path-dependent harness PE/PDB bytes are identical.
- All58owned native listeners,including the untimed failed process listener,have stopped/disposed receipts;all10recorded native process IDs were observed absent. An initial null Hashtable aggregate is preserved and corrected from the original per-profile integer counts;not a new native/CIM observation.
- Original and candidate owner-only forced --no-incremental rebuilds byte-match previously tested source/DLL/PDB for relocation/final candidate state. Historical snapshots/timing untouched. Product source was measured as an uncommitted guard on baseline37e809e;any later publication source commit is byte-bound,not relabeled as the historical build commit.
- Sixteen selected owner/API/test/producer files match current main90d90ff3;54raw snapshots include2changed toolchain context files. Pinned campaign SDK/runtime,not newer-default SDK integration or complete repository/history coverage. Remote code index unavailable for this GitHub checkout;LSP coverage bounded.
- All288Workload.Result samples match native stdout/JSON;mean,sample variance,SD,SE independently recomputed. Confidence intervals and MemoryDiagnoser allocations retained as reported,not independent CI-distribution derivation. Portable audit rehashes copied textual sources/receipts,not omitted binary bytes;separate live audit rehashes frozen consumers/runtime. Nine selected PE/PDB/source associations per native profile are not complete compiler provenance or method coverage.
