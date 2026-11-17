# F007: root-operation duplicate-ID membership

**Qualified scaling draft, not a default-app speedup.** Replacing large-batch prefix scans with a per-call integer set reduces actual JSON-parser CPU in both completed, order-reversed comparisons for the 4,096/16,384-operation stress cases, while increasing process-wide allocation. The default simultaneous-root limit is **100**, not a proved parser-batch bound. Production batch sizes/frequency and application-wide benefit were not measured.

Source branch: [autoperf/F007-root-operation-id-membership](https://github.com/jaslawinMs/aspnetcore/tree/99dfa0b0ee8f39ecfc2ffc624142c4c35c77b439). Exact independent source commit: `99dfa0b0ee8f39ecfc2ffc624142c4c35c77b439`, parent/campaign build baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`. One private owner file, **+9/-12**. The measured DLLs were built from that baseline plus the preserved patch **before** the source commit; they are not relabeled as built from the later commit. Tracking issue/draft URL is recorded after creation in the additive publication receipt.

## Outcome and limits

The 4,096-operation Remove parser means decreased 28.8-32.4%; 16,384 Remove decreased 61.2-64.4%. Marker-disabled Resume decreased 15.8-20.8% at 4,096 and 45.0-48.1% at 16,384. These are deterministic **parser-only scaling inputs**, not observed normal application traffic or rendering throughput. Corresponding process-wide bytes/op increased about 6.7-12.5%. The complete table below retains every measured case.

The 129/256 cases do not establish a repeatable small-large crossover win: several means reverse to slower in C3, with more allocation. Both early-duplicate shapes have higher BDN means and allocation in both pairs. Eager set capacity is paid even when the second operation is invalid. All <=128 cases keep the original stack-backed prefix algorithm, but the additional selection/loop branches mean identical generated code or unchanged CPU cost is **not** claimed. Small controls reverse between the two pairs. The empty control has roughly 52-65% within-profile CV; it supports no latency conclusion. This is a shared-host experiment, not statistical proof of a universal speedup.

**Three authorized comparison slots are closed.** Slot 1 attempted only the original profile and failed in harness GlobalSetup (`ServerAdapter.Logger` assumed a reflected null-logger property), before any `WorkloadActual` samples. It remains spent and is retained verbatim. The helper was compiler-bound, and all 22 actual timed Setup/wrapper paths were then exercised untimed per owner. C2 runs candidate/original; C3 runs original/candidate. No tuning or extra timing followed. Totals: **5 attempted profiles, 4 completed profiles, 88 successful reports, 704 raw actual samples, 665 retained results, 39 upper-filtered samples, 264 warmups, 1,700 actual overhead iterations**. The failed slot has one unsuccessful report and zero workload samples, not a third successful comparison.

## Complete before/after results

Ratios are candidate/original; below 1 is lower time. C2/C3 are separate pairs, not pooled measurements. BDN retained means use its default upper-outlier filtering; all-eight ratios include every recorded `WorkloadActual` sample before overhead subtraction. Allocation is BDN process-wide bytes/op, including parser/process workers, **not isolated HashSet/owner allocation**. Raw logs/exported samples and CV values remain in `measurements/` and `analysis.json`.

| Shape | BDN time ratio C2 / C3 | All-eight raw time ratio C2 / C3 | Allocated bytes before -> after C2 / C3 | Allocation change % C2 / C3 |
|---|---:|---:|---|---:|
| RemoveEmpty | 0.954 / 1.001 | 0.954 / 1.001 | 656 -> 656 / 656 -> 656 | 0.00 / 0.00 |
| Remove1 | 0.960 / 1.017 | 0.968 / 1.029 | 872 -> 872 / 872 -> 872 | 0.00 / 0.00 |
| Remove16 | 0.975 / 1.037 | 0.975 / 1.042 | 3152 -> 3152 / 3152 -> 3152 | 0.00 / 0.00 |
| Remove100 | 1.000 / 1.034 | 1.000 / 1.034 | 16441 -> 16441 / 16441 -> 16441 | 0.00 / 0.00 |
| Remove128 | 0.993 / 1.031 | 0.988 / 1.031 | 20249 -> 20248 / 20249 -> 20248 | -0.00 / -0.00 |
| Remove129 | 0.940 / 1.044 | 0.934 / 1.044 | 22457 -> 24673 / 22457 -> 24673 | 9.87 / 9.87 |
| Remove256 | 0.936 / 1.015 | 0.929 / 1.015 | 39731 -> 44538 / 39731 -> 44538 | 12.10 / 12.10 |
| Remove1024 | 0.890 / 0.937 | 0.892 / 0.933 | 156523 -> 174291 / 156524 -> 174290 | 11.35 / 11.35 |
| Remove4096 | 0.676 / 0.712 | 0.678 / 0.714 | 623568 -> 701441 / 623566 -> 701441 | 12.49 / 12.49 |
| Remove16384 | 0.356 / 0.388 | 0.357 / 0.388 | 2491843 -> 2771936 / 2491843 -> 2771942 | 11.24 / 11.24 |
| Resume1 | 1.009 / 1.015 | 1.006 / 1.015 | 976 -> 976 / 976 -> 976 | 0.00 / 0.00 |
| Resume100 | 0.980 / 1.027 | 1.000 / 1.027 | 26842 -> 26842 / 26842 -> 26842 | 0.00 / 0.00 |
| Resume128 | 0.968 / 1.027 | 0.976 / 1.038 | 33563 -> 33562 / 33562 -> 33562 | -0.00 / 0.00 |
| Resume129 | 0.949 / 1.019 | 0.953 / 1.023 | 35875 -> 38090 / 35874 -> 38090 | 6.17 / 6.18 |
| Resume1024 | 0.924 / 0.990 | 0.924 / 0.990 | 263029 -> 280794 / 263025 -> 280787 | 6.75 / 6.75 |
| Resume4096 | 0.792 / 0.842 | 0.799 / 0.853 | 1049587 -> 1127461 / 1049586 -> 1127460 | 7.42 / 7.42 |
| Resume16384 | 0.519 / 0.550 | 0.521 / 0.549 | 4195893 -> 4476001 / 4195893 -> 4476045 | 6.68 / 6.68 |
| DuplicateEarly129 | 1.014 / 1.029 | 1.014 / 1.021 | 22457 -> 24673 / 22457 -> 24673 | 9.87 / 9.87 |
| DuplicateLast129 | 0.987 / 1.008 | 0.987 / 1.014 | 22457 -> 24673 / 22457 -> 24673 | 9.87 / 9.87 |
| DuplicateMiddle4096 | 0.919 / 0.921 | 0.923 / 0.932 | 623551 -> 701442 / 623547 -> 701440 | 12.49 / 12.49 |
| DuplicateEarly4096 | 1.010 / 1.021 | 1.021 / 1.020 | 623547 -> 701441 / 623545 -> 701438 | 12.49 / 12.49 |
| DuplicateLast4096 | 0.690 / 0.716 | 0.690 / 0.716 | 623567 -> 701442 / 623568 -> 701441 | 12.49 / 12.49 |

## Owning boundary and correctness

`ServerComponentDeserializer.TryDeserializeRootComponentOperations` is invoked as the actual Server-assembly method through one cached expression adapter; actual JSON-created Server DTOs are used, not a copied membership loop, linked Endpoints DTO copies, shipping visibility bridge, or test-identity spoof. Reflection, JSON input production, owner construction, validation and file writes are outside timing. Timed bodies return the actual Boolean result. Remove inputs do not exercise subsequent circuit removal; Resume uses the real `deserializeMarkers:false` branch, not persisted-descriptor restoration. All repeated timed batches avoid descriptor-state consumption.

Both original and candidate passed all **33 actual source-defined owning Facts**, including the Unions partial (66 actual rows, zero skips), with source/TRX/execution identity and tested owner DLL/PDB checked. The final harness passed **151 full-owner observations and 129 producer proofs per role**, including 22 actual timed Setup/wrapper preflights. It covers small and >128 counts, negative/zero/extreme/sparse IDs, duplicate positions, first-error log/order/null-result behavior, malformed JSON, and actual serializer/parameter conversion. Real mixed Add/Update/Remove uses 129 operations; real marker consumption before duplicate failure uses 130. Retained state checks include sequence replay, next sequence with reused per-batch SSR ID, next/expired invocation, and consumed markers after a failed batch.

No new permanent tests or public API/default/dependency/TFM/visibility changes were added. Existing focused tests and runnable characterization establish observed parser contracts, not merge readiness, browser/queue-producer execution, downstream circuit dispatch, marker-conversion throughput, or coverage of every method in an assembly. No E2E or whole-current-default build/test was run.

## Frozen identity and preparation history

Every completed pair uses the same final **146-file** inventory and **26 source snapshots** per role. All **144 nonowner files**, including harness DLL/PDB, are byte-identical; only the freshly tested Server owner DLL/PDB differ. Final live audit rehashed 292 physical image files plus 294 preserved failed-era image files. Source/PDB witnesses check 14 final PE/PDB bindings and 64 selected documents; the failed slot separately retains its earlier witnesses/snapshots. These are bounded source/identity observations, not complete SDK/native provenance or method coverage.

Earlier unmeasured harness revisions, the failed-slot 147-file images/sources, and preparation failures are preserved. Copying an older original source timestamp initially let incremental build output retain the exact candidate DLL/PDB; the identity guard caught it before timing. A forced original owner Rebuild reproduced the tested-original bytes, followed by forced harness Rebuild. The clean image legitimately omitted `Microsoft.Extensions.Validation.ValidationsGenerator.dll`; inventory became 146 rather than 147. The obsolete hardcoded inventory guard was corrected against authoritative manifests, not by inserting a stale DLL. No comparison budget was reset. The first read-only audit assumed lowercase enum wire text; actual typed serialization uses PascalCase. Its exit1/source/log and corrected passing audit are retained; no experiment was rerun for that analysis repair.

The first packaging attempt rejected the actual supplemental TypeScript producer source because the explicit text allowlist lacked `.ts`. Its 2,508 partial-copy files were verified against original run bytes and preserved outside the run/results directories; `.ts` was classified and a fresh complete capsule created. `package-classification-recovery.json` records that publishing-preparation failure. No experiment or raw source changed.

Original owner DLL: `C997B7D333814BCCABD5614453CE0D1BDE075FC5DDC7CEBB6D2FF1688C098136`.

Candidate owner DLL: `4A4D21ED9F7D017093275E640A56C71AD5A6BC466C24BF0EAD7B1BE6CA710CA6`.

## Current source, SDK and host

Captured upstream default: `49147673007a4b1d676694e2c5f85b83ad76c36f`. Fifteen selected source/project/test files, including the whole owner class, are canonically baseline-equal; five supplemental owner/default-limit/producer records were checked. Relevant history and the actual diffs of related upstream PRs dotnet/aspnetcore#68295 and dotnet/aspnetcore#68299 were inspected; their metadata/type-resolution work does not replace this selected membership. This is **selected-source equivalence**, not whole-Server-assembly/repository equivalence. Current Arcade/Helix/shared-framework SDK inputs differ (`26565.104` versus baseline `26562.105`). Baseline SDK/dependency context is retained; no global.json/manifests were changed and no current-default SDK integration is claimed.

Repository SDK `12.0.100-alpha.1.26557.102`; pinned runtime framework `12.0.0-alpha.1.26562.105`; measured runtime .NET 12.0.0 X64 RyuJIT with concurrent Server GC. C#13 standalone harness; BenchmarkDotNet0.13.0; throughput, requested 100ms iterations, 3 warmups/8 actual iterations, unroll1, `Guid.Empty` power policy and attributed settings-preserving in-process emitted executor. The executor pattern is explicitly reused from F002; no finalized F002 measurement was rerun or reused.

Premeasurement CIM snapshot: Windows11 Enterprise10.0.26300, Intel Xeon Platinum8473C, 8 cores/16 logical processors exposed, hypervisor present, 68,665,884,672 bytes physical memory. It is not a continuous host-load or isolation trace. Captured process/thread priorities are Normal, affinity65535; 176 final before/after settings records are unchanged. No OS power/priority/affinity changes or unrelated-process termination were performed.

## Reproduce / inspect

The runnable `harness/AutoPerf.Benchmarks.csproj` uses the real Server ProjectReference. Set `-p:AspNetCoreRoot=C:\path\to\aspnetcore` when not using the historical checkout. First follow the repository `docs\BuildFromSource.md` and Components instructions to install the pinned SDK/runtime and build prerequisites. From the repository root, activate `. .\activate.ps1` before **every fresh dotnet shell**. Historical fresh-owner/test builds and all commands/results are recorded in `tests/*/execution.json`, build logs and `validation-commands.md`. These existing local experiments need no rerun.

For a new independent reproduction, use a separate output directory and explicit original/candidate source checkout; force the selected owner Rebuild rather than relying on copied source timestamps, then build the harness in Release. Do not mix owner or harness DLL/PDB bytes between roles. Its command line requires `--sources <matching26-file-source-snapshot> --context <role> --artifacts <new-absolute-directory>`; `--characterize` runs untimed checks, otherwise use `--filter * --join` for all22 timed shapes. Source/PDB witnesses deliberately reject stale source snapshots. Archived `historical-*` drivers capture this machine/session and enforce the already-closed budget; they are provenance, not portable turnkey entry points or authorization for a fourth run here.

Portable verification (Node built-ins only; no new timing):

```powershell
node .\reproduce-analysis.mjs C:\path\to\F007 --verify
```

This independently reconstructs input/observable contracts, TRX identities, every raw/retained/warmup/overhead record, GC allocation rounding, sample statistics/R7 quantiles, confidence-bound arithmetic and all ratios, and checks copied source/PDB-witness records/manifests. Confidence critical values themselves are not independently recomputed. It also distinguishes failed slot1 from completed slots2/3 and checks historical failure/version records. DLL/PDB/native images/binlogs are deliberately **not published**; portable verification cannot rehash omitted binaries or reproduce a complete SDK/native inventory. Live checks of those files are recorded, not silently repeated offline. BDN process-wide allocation-source observation is explicitly attributed to F006/F002 with identical actual BDN DLL hash, not newly instrumented delegate evidence.

All favorable and adverse inputs/results, failed setup, historical preparation/audit failures, exact source patch, runtime/dependency metadata, source snapshots, build/test/profile commands and limitations are retained. The immutable evidence commit is published before the fork-only draft; the later receipt/root index records actual remote source/evidence/body/browser verification. No upstream PR is created.
