# F029 unchanged original Partial diagnostics

**Rejected nonblocking replacement of a shipped synchronous contract. No source optimization or measured gain.**
One original-only profile;zero source comparisons. Completed render wrappers,not pending-I/O timings or isolated awaiter costs.

| Existing API / payload characters | Mean us/op | StdDev us | CV% | Managed B/op | Retained N |
|---|---:|---:|---:|---:|---:|
| Async.Completed32 | 19.222 | 1.517 | 7.89 | 11955 | 8 |
| Async.Completed4096 | 23.066 | 7.668 | 33.24 | 44362 | 8 |
| Sync.Completed32 | 10.810 | 1.550 | 14.34 | 11850 | 8 |
| Sync.Completed4096 | 20.086 | 5.600 | 27.88 | 44362 | 8 |

Do not interpret the existing-API row differences as a framework improvement,an async API ranking or isolated blocking overhead. All request/helper/page/DI-scope/output construction is included. High variability is retained without rerunning.

Two successful authoritative images each pass four completed wrappers and six real pending Razor success/failure/cancellation producer contracts. The original owner suite passes34/34,0skipped.

- Original current APIs only;not a before/after optimization or an isolated waiter-overhead/API-ranking experiment.
- Full controlled render wrapper includes per-call DI scope/helper/page/model/writer/view lookup,strict unused mocks and output consumption.
- Pending gates characterize reachable producer and completion/error semantics,not application frequency,HTTP,cshtml discovery/compilation,starvation or deadlock.
- All eight results are retained. Shared machine/high variability and all original costs are preserved.
- Means,sample variance,standard deviation and standard error recomputed from native result samples. Reported allocation/CI values retained,not allocation-type tracing or independent CI-distribution/GC arithmetic.
- Portable audit rehashes copied textual sources/receipts,not omitted DLL/PDB/native bytes. Source/PDB receipts are associations,not complete build provenance or coverage.
- Initial compile error/warnings,missing dependency failure,EventLog warning and later unsampled thread-state assertion failure remain. The exact failed conjunction was not captured;the mutable-state resampling flaw was removed before timing.
- Exact runtime TaskAwaiter source ref returned404;no new completed-task-guard or JIT mechanism claim.
