**Qualified opt-in allocation proposal; not merge-ready.** Skip the disabled
commit timer only when the existing documented `IOTimeout` is exactly
`Timeout.InfiniteTimeSpan`. Keep the fresh linked CTS,caller linkage/disposal,
finite/default deadlines,exception/log distinction and modified/unmodified state.
`LoadAsync` is unchanged; F023 is not carried.

Source:[@SOURCE_COMMIT@](https://github.com/jaslawinMs/aspnetcore/commit/@SOURCE_COMMIT@),
independent baseline`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Only2sourcefiles:product+4/-1 and3focused theory methods/8rows.
No shipping public/protected declaration,default,TFM,dependency or visibility change.

**Reproducible evidence:**
[immutable F024 capsule](https://github.com/jaslawinMs/aspnetcore/tree/@EVIDENCE_COMMIT@/F024),
[runnable BenchmarkDotNet project](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F024/harness/AutoPerf.Benchmarks.csproj),
[all comparisons/controls/first observations](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F024/comparison.md),
[exact recorded commands and outcomes](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F024/validation-commands.md).
Tracking:@ISSUE_URL@.

| Actual public wrapper | Median original/selected B/op | B/op reduction,1/2/3 | Observed time reduction %,1/2/3 |
|---|---:|---:|---:|
| Infinite Set.None |1712/1616|160/96/32|10.41/4.52/5.91|
| Infinite Set.Caller |1728/1632|160/96/32|12.80/4.05/6.68|
| Infinite Refresh.None |856/760|160/96/32|18.10/13.66/13.00|
| Infinite Refresh.Caller |872/776|160/96/32|18.02/13.41/10.19|
| Default Set.None |1712/1712|64/0/-64|-0.41/-5.03/-0.61|
| Default Refresh.Caller |872/872|64/0/-64|1.53/-2.97/-8.89|
| Unchanged Load.Infinite.Hit.None |856/856|0/0/0|4.51/0.07/-0.02|
| Unchanged Load.Default.Hit.None |856/856|0/0/0|-0.44/2.37/-0.62|

All4 infinite profiles allocate less in all3pairs. For Set.None and
Refresh.Caller,the timeout-matched difference in savings is96B/op in every
comparison. **This is not uniformly96B/op absolute savings** and does not
explain the additional positive/negative64-byte CommitAsync movement.
Default Set is slower in all3pairs;default Refresh/Caller is up to8.89%slower
and64B/op worse in comparison3. All adverse observations are retained.
The inherited fixed96/0 audit expectation was corrected to report actual data;
the frozen harness and proposal were not changed between comparisons.

**No default-configuration or clean causal application-speedup claim.**
The VM is shared and finite paths traverse the added guard. Timed work includes
actual session creation,modified store or unloaded refresh,real distributed-memory
cache and public value consumption. Not HTTP,remote-provider latency or
production-frequency evidence.

**Actual validation (exact commands/results):**

@VALIDATION_COMMANDS@

Both `CommitAsync_InfiniteTimeoutAvoidsTimerAllocation(modified: True/False)`
rows independently fail before/pass after:original142336=142336 and87552=87552.
All4 `CommitAsync_InfiniteTimeoutPreservesCallerCancellation(modified, canceledBeforeCommit)`
and2 `CommitAsync_InfiniteTimeoutPreservesOwnedTokenLifetime(modified: True/False)`
rows pass on both owners. Real pending-cache gates,cancellation,retry,persistence
and success-to-refresh state are exercised. Each frozen owner additionally passes8
wrappers/16values/24 real caller/deadline/invalid-value/error/state/lifetime/
information-read producer contracts. Existing hosted tests ran.

**Measurement/provenance:** one common98-file consumer closure,only Session
DLL/PDB differ;3/3 comparisons permanently closed,18native profiles/48raw means
independently recomputed/12first observations. SDK12.0.100-alpha.1.26557.102,
runtime12.0.0-alpha.1.26562.105,C#13,server GC,settings-preserving emitter,
observed Normal/Normal/65535 point checks;no OS changes. Source/PE/PDB witnesses,
196live native bindings/100paths and60runtime bindings audited. Fresh physically
relocated project built/characterized with0warnings/errors and no extra timing.
Binary omissions retain hashes;portable copied-text audit cannot rehash those
images or prove complete compiler provenance/coverage.

Measured owners were built at baseline+patch before source commit;selected12file
latest-default parity is not newer-default SDK integration. Unit/BDN absolute
allocations use different caller/JIT/consumer boundaries. No cold-start,
full-repository,pack,other-OS,release-readiness or upstream-acceptance claim.
