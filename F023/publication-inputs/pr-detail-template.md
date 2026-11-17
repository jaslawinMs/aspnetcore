**Qualified opt-in allocation proposal; not merge-ready.** Skip the disabled load timer only when the existing documented `IOTimeout` is exactly `Timeout.InfiniteTimeSpan`. Keep the fresh linked CTS,caller linkage/disposal,finite/default deadline,exception/log distinction and loaded-state behavior. F024 `CommitAsync` is unchanged.

Source:[@SOURCE_COMMIT@](https://github.com/jaslawinMs/aspnetcore/commit/@SOURCE_COMMIT@),independent baseline`37e809ead5824bc753a1c3d56f11615bdb1296c5`. Source diff:2files,product+4/-1,new focused test+145/-0. No public/protected declaration,default,TFM,dependency or visibility change.

**Reproducible evidence:** [immutable F023 capsule](https://github.com/jaslawinMs/aspnetcore/tree/@EVIDENCE_COMMIT@/F023),[runnable BenchmarkDotNet project](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F023/harness/AutoPerf.Benchmarks.csproj),[all comparisons/controls/cold observations](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F023/comparison.md),[exact recorded commands and outcomes](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F023/validation-commands.md). Tracking:@ISSUE_URL@.

| Actual public wrapper | Original B/op | Selected B/op | Observed paired time reduction %,1/2/3 |
|---|---:|---:|---:|
| Fresh infinite,miss,no caller |440|344|40.34 /28.30 /38.16|
| Fresh infinite,hit,no caller |856|760|22.60 /22.02 /21.12|
| Fresh infinite,miss,cancelable caller |456|360|34.08 /26.54 /31.85|
| Fresh infinite,hit,cancelable caller |872|776|18.86 /19.81 /15.57|

All4 target profiles save96 B/op in every pair. Default/finite and already-loaded allocation controls are unchanged. **No default-configuration/application-speedup claim:** the VM is shared,default/control timings also move materially,and finite paths traverse the new comparison guard. Adverse default/loaded timing pairs and slower first-observed calls are retained. The wrapper includes actual session creation/load,real distributed-memory cache and public value consumption;not HTTP,remote provider latency or production-frequency evidence.

**Actual validation (all commands/details linked above):**

@VALIDATION_COMMANDS@

`LoadAsync_InfiniteTimeoutAvoidsTimerAllocation` is red before/green after. Both individual `LoadAsync_InfiniteTimeoutPreservesCallerCancellation(canceledBeforeLoad: True/False)` rows and `LoadAsync_InfiniteTimeoutPreservesOwnedTokenLifetime` pass on original/selected. Existing hosted tests also ran. Each actual frozen owner additionally passes8 public wrappers/16 value contracts/10 real caller/deadline/token-lifetime/error producers. Zero timeout preserves its inherent entry-order race;no exact ordering claim.

**Measurement/provenance:** one common98-file harness closure,only Session DLL/PDB differ;3/3 comparisons permanently closed,18native profiles/48raw means independently recomputed/12cold observations. SDK12.0.100-alpha.1.26557.102,runtime12.0.0-alpha.1.26562.105,C#13,server GC,settings-preserving emitter and observed Normal/Normal/65535 point checks;no OS changes. Actual source/PE/PDB/closure witnesses,196live native bindings/100paths and60runtime bindings audited. Fresh physically relocated project also built/characterized without timing. Binary omissions have hashes;portable copied-text audit cannot rehash those omitted images or prove complete compiler provenance/coverage.

**Boundaries retained:** measured DLLs were baseline+patch before source commit,not built at the final commit;selected12file current-default parity is not newer-default SDK integration;unit/BDN absolute allocation totals are different callers/JIT/consumer boundaries;initial harness compile failure and runtime-only CA1416 warning retained. No full repository,pack,other-OS,release-readiness or upstream-acceptance claim. No API approval is implied.
