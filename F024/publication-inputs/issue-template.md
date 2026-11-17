Independent retained AutoPerf finding **F024**: `DistributedSession.CommitAsync`
calls `CancelAfter(IOTimeout)` on a fresh owned linked CTS for both modified
`SetAsync` and unmodified `RefreshAsync`.

**Qualified opt-in allocation proposal, not merge-ready:** skip `CancelAfter`
only for the existing documented exact `Timeout.InfiniteTimeSpan` option.
Retain finite/default deadlines, fresh token ownership/disposal, caller
cancellation, logging/error distinctions and modified-state retry.
F023's `LoadAsync` change is not included.

Source: [@SOURCE_COMMIT@](https://github.com/jaslawinMs/aspnetcore/commit/@SOURCE_COMMIT@).
Immutable evidence and runnable BDN project:
[F024](https://github.com/jaslawinMs/aspnetcore/tree/@EVIDENCE_COMMIT@/F024).

Three comparisons are permanently closed: 18 native profiles, 48 warm rows and
12 separate first-observed observations. All four infinite-timeout profiles
allocate 160/96/32 B/op less across the three comparisons. Finite/default
controls allocate 64/0/-64 B/op less; unchanged-source load controls do not move.
The two timeout-matched differences in savings are 96 B/op in all three pairs.
The additional positive/negative64-byte movement has no established mechanism.
Default controls include adverse time and allocation results; no
default-configuration/application-speedup or remote-I/O claim.

Original: 26 existing passes; expanded34 rows have32 passes and both expected
allocation reds. Selected:34/34 passes,0skips. Each actual frozen owner passes8
public wrappers/16 values/24 real caller/deadline/error/state/lifetime/information-read
producer contracts. A physically relocated fresh project built and characterized
without additional timing.

Shared VM, not isolated. No public/protected declaration,default,TFM,dependency
or assembly-boundary change. Full actual commands,adverse observations and
source/PE/PDB/closure/omission limits are in the evidence. This fork-only
tracking issue does not assert upstream acceptance or release readiness.
