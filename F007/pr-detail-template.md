**Qualified large-batch parser CPU/allocation trade-off; not a default-app or rendering speedup, and not merge-ready.**

Use a per-call `HashSet<int>` above128 operations instead of a pooled span with repeated prefix scans. Keep the original <=128 stack-prefix algorithm and the existing sequential validation/error/log/null-result/descriptor-state order. Only one private owner file changes (+9/-12); removed buffer lifetime/import are directly obsolete. No public API/default/dependency/TFM/visibility or permanent-test change.

**What repeated:** at4096 operations, Remove means decreased28.8-32.4% and marker-disabled Resume15.8-20.8%; at16384, Remove61.2-64.4% and Resume45.0-48.1%. Those scaling inputs allocate about6.7-12.5% more process-wide bytes/op. The simultaneous-root default is100, not a proved parser-batch bound; production batch-size frequency and typical-app benefit were not measured.

**What did not:**129/256 and small controls reverse; both early-duplicate shapes have higher means/allocation in both pairs, and the empty control has roughly52-65% CV. Additional branches exist even on the retained small algorithm. All results, not just large favorable cases, appear below.

**Budget:**3/3 attempted comparison slots, not3 successful pairs. Slot1 original GlobalSetup failed in harness null-logger member reflection before any `WorkloadActual` samples; no candidate profile launched. Its unsuccessful report/raw sources/images are retained. After fixing the helper and untimed-preflighting all22 actual timed Setup/wrapper paths, C2(candidate/original) and C3(original/candidate) completed with identical harness DLL/PDB and all144 nonowner files.5 attempted profiles,4 completed,88 reports,704 raw actual/665 retained/39 upper-filtered/264 warmup/1700 actual overhead samples. No tuning or extra timing followed.

The timed method is the full actual Server JSON parser through one cached expression adapter, not a copied membership loop. Actual Server-assembly DTOs are used. Reflection/input generation/setup/validation/writes are excluded. Remove does not exercise downstream circuit removal; Resume uses actual `deserializeMarkers:false`, not persisted-descriptor restoration. Full real marker/parameter/state processing is characterized untimed, not benchmarked as rendering throughput.

Original/candidate each passed33 actual owning Facts (including Unions partial), zero skips, and151 final owner checks/129 producer proofs including22 real timed Setup preflights. The actual serializer/parameter producer, mixed129-operation batch and130-operation marker-consumed-before-failure case exercise the changed large path. Portable/live audits check input/observed contract/TRX/raw-sample/GC/statistics/identity evidence. No new permanent tests, browser/E2E or whole-current-default build/test are claimed.

Captured current default49147673 has15 selected canonical source/project/test matches including the whole owner class, plus5 supplemental context records; global SDK inputs differ. This is selected-source equivalence in the campaign's pinned build context, not whole-current-default integration. Exact source commit: `@SOURCE_COMMIT@`; measured binaries precede that commit and are tied to the baseline plus preserved patch.

[Immutable complete evidence and all limitations](@EVIDENCE@/README.md), [runnable real-owner BenchmarkDotNet project](@EVIDENCE@/harness/AutoPerf.Benchmarks.csproj), [independent audit](@EVIDENCE@/measurement-audit.json), [exact historical commands and observed results](@EVIDENCE@/validation-commands.md), [failed slot1](@EVIDENCE@/measurements/comparison-1). All@FILE_COUNT@ immutable evidence files were verified as actual remote blobs before this fork-only draft. DLL/PDB/native images/binlogs are omitted; portable audit cannot rehash missing binaries.

### All22 cases

Candidate/original ratios; below1 is lower time. C2/C3 remain separate; no pooled significance claim. BDN retains its default upper-outlier filtering; raw ratios keep all8 actual samples before overhead subtraction. Allocation is process-wide, not isolated set allocation.

@RESULT_TABLE@

### Exact executed validation and outcomes

Shared Windows host; pinned repository SDK/runtime, Server GC, BDN0.13.0, requested100ms throughput iterations/3warmups/8actual/unroll1, `Guid.Empty` power policy, settings-preserving in-process emitted executor.176 captured settings records remain Normal/Normal/affinity65535; no host tuning/isolation/unrelated-process modification. Earlier unmeasured builds, caught stale candidate DLL under restored original source, legitimate147->146 clean-inventory change, failed setup and the repaired read-only enum-case audit assumption remain in the capsule. No measurement was rerun for preparation/audit repairs.

<details>
<summary>Exact commands/results (activate the repository environment in every fresh dotnet shell)</summary>

@COMMANDS@

</details>
