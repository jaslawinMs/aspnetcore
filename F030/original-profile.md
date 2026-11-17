# F030 unchanged original RenderPartial diagnostics

**Rejected nonblocking replacement of a shipped synchronous writer-completion contract. No source optimization or measured gain.**
One original-only profile;zero source comparisons. Completed real-parent/partial wrappers,not pending-I/O timings or isolated awaiter costs.

| Existing API / payload characters | Mean us/op | StdDev us | CV% | Managed B/op | Retained N |
|---|---:|---:|---:|---:|---:|
| Async.Completed32 | 23.639 | 2.464 | 10.42 | 13240 | 8 |
| Async.Completed4096 | 34.364 | 0.630 | 1.83 | 45674 | 8 |
| Sync.Completed32 | 12.144 | 1.329 | 10.94 | 13162 | 8 |
| Sync.Completed4096 | 28.843 | 3.298 | 11.44 | 45674 | 8 |

Do not interpret existing-API row differences as a framework improvement,an async API ranking or isolated blocking overhead. Whole parent/partial/request/DI-scope/writer construction is included. All variability is retained without retiming.

Two independently built images each pass four completed wrappers and six real pending parent/partial producer contracts. Fresh existing owning tests pass34/34,0skipped.

- Original current APIs only;not a before/after optimization,API ranking or isolated blocking/awaiter-overhead experiment.
- Whole controlled wrapper includes real parent/partial RazorViews,CSharp pages,request-scoped DI buffers,model/helper/writer construction,prepared successful partial lookup,strict unused interfaces and output consumption.
- Before pending synchronous release,the outer renderer has not returned a task to the harness. The observed wait is inside the public method,not a harness-side GetResult. Parent writer is produced by real RazorView,not internal access.
- Controlled literal parent/partial producer,not HTTP,cshtml discovery/compilation,production frequency,throughput,starvation or deadlock proof.
- All eight results are retained on a shared Windows machine. No extra timing is authorized;all source comparison slots remain unused.
- Means,sample variance,SD and SE recomputed from32native stdout/JSON result samples. Reported allocation/CI values retained,not allocation-type tracing or independent CI-distribution/GC arithmetic.
- Portable audit rehashes copied textual sources/receipts,not omitted DLL/PDB/native bytes. Source/PDB receipts are associations,not complete compiler provenance or coverage.
- The first standalone build fails with two CS0136 pattern-variable scope collisions. Exact formatted failed sources and original logs remain;names corrected before any native run or timing.
- Existing four synchronous exception rows use immediate mocked failures. Both three-row expected-argument methods use async MemberData;neither is claimed as a real pending producer or synchronous-success test.
