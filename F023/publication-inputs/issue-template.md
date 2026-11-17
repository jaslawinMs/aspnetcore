Independent retained AutoPerf finding **F023**: `DistributedSession.LoadAsync` creates an owned linked CTS and calls `CancelAfter(IOTimeout)` per uncached asynchronous load.

**Scoped proposal, not merge-ready:** keep finite/default deadlines and fresh token ownership. Skip `CancelAfter` only for the existing documented exact `Timeout.InfiniteTimeSpan` option. F024 `CommitAsync` is not changed.

Source: [@SOURCE_COMMIT@](https://github.com/jaslawinMs/aspnetcore/commit/@SOURCE_COMMIT@).
Immutable evidence and runnable BDN project: [F023](https://github.com/jaslawinMs/aspnetcore/tree/@EVIDENCE_COMMIT@/F023).

Three comparisons are permanently closed:18 native profiles,48 warm rows,12 separate first-observed observations. Every fresh infinite-timeout profile saves96 B/op;primary miss440->344,hit856->760. Default/finite and already-loaded allocation controls are unchanged. Observed timings/control drift are fully retained,not an application/default-configuration/remote-I/O gain claim.

Original:26 existing passes;expanded30 rows have29 passes and only the expected87552vs87552 allocation red. Selected:30/30 passes,0skips. Each actual frozen owner:8 public wrappers/16 value contracts/10 real caller/deadline/lifetime/error producers. Fresh relocated project built/characterized without additional timing. Shared VM,settings preserved at observed points;no dedicated-environment claim.

No public/protected declaration,default,TFM,dependency or assembly-boundary change. Full results,actual commands and source/PE/PDB/closure/omission limits are in the immutable evidence. This fork-only tracking issue does not assert upstream acceptance or release readiness.
