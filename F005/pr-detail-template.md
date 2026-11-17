**Fork-only qualified allocation/scaling draft; not merge-ready.** This changes exactly four private-state lines in one analyzer source file. Potential iterators use a lazy symbol-comparer `HashSet<ILocalSymbol>`, membership and directly dependent in-place removal. Existing guarded promotion and diagnostic occurrence order remain. F004's Iterators and F006's AllForVariables are untouched; no API/default/dependency/TFM/visibility change.

**Measured boundary:** actual in-tree analyzer through `CompilationWithAnalyzers`, real Components metadata and actual loop/local/mutation/callback binding, not a copied collection microbenchmark or seeded private state. Extra unincremented loop declarators produce actual potential-list growth; canonical `i++` does not. Warm/fresh compilation boundaries are distinct from parsing/reference creation.

**Budget and comparability:**3/3 comparison slots are closed. Comparison1's28 reports are exploratory: identical harness source but different harness DLL/PDBs. Comparisons2/3's72 reports use identical harness DLL/PDBs and differ only in the actual original/candidate owner DLL/PDB. Single-potential timing was added only for2/3; there is no invented third18-case run.

**Qualified result:** four controlled64-potential promotion observations allocate0.56-9.77% fewer process-wide bytes. Final-pair saving is only about4.6KB, not a stable38/63KB claim. All four single-potential cases reverse from lower heap in2 to higher heap in3; Promoted16/fresh3 allocates0.22% more. NonRender BDN timing is slower in all recorded pairs, including24.8% in controlled2/fresh. OneIterator control moves20% faster in3; maximumCV19.8874%. No causal general speedup, whole-build improvement, production distribution or UI/browser benefit is established.

### All recorded outcomes

E1 is exploratory; C2/C3 are identical-harness controlled. Candidate/original timing below1 is faster; negative allocation means fewer bytes. A dash means not timed. BDN means keep default upper-outlier filtering; all-eight actual ratios retain all raw WorkloadActual samples without overhead subtraction.

@RESULT_TABLE@

### Evidence and validation limits

[Immutable report and runnable projects](@EVIDENCE@/README.md), [raw analysis](@EVIDENCE@/analysis.json), [exact commands/results](@EVIDENCE@/validation-commands.md), [independent audit](@EVIDENCE@/measurement-audit.json).

Source commit `@SOURCE_COMMIT@` retains the exact measured patch, based independently on37e809e. Frozen binaries were built before that commit from baseline plus patch, not relabeled afterward. The capsule has@FILE_COUNT@ byte-preserved immutable files; DLL/PDB/native images/binlogs are omitted. Portable verification checks evidence/self-consistency, not omitted binaries.

Original/candidate each pass20 exact existing Facts (40 fresh rows,zero skips); five frozen images pass112 compiler checks each (560/7040 BL0014 observations). Small-control images reuse already-tested owner bytes, not invented test executions. Captured current-main class replay checks ten prerequisites and its adjacent null fix; it is not whole-current-default integration. No new shipping tests: permanent coverage remains the existing analyzer test class; additional real-compiler checks accompany the standalone projects.

Settings-preserving emitted executor/Guid.Empty power plan;200 captured before/after Normal process/thread priority and affinity65535 observations. Shared Windows VM, not isolation/continuous OS tracing. Memory is process-wide precise allocated bytes, not isolated set allocation. Host Roslyn5.11/net12 is not measured VS2019/Roslyn3.3.1 host performance.

### Exact executed validation commands and results

Each fresh .NET shell starts at repository root with `. .\activate.ps1`. The exhaustive command/result list, build records and preserved read-only/audit failures are linked above. No successful measurement was rerun for an audit repair.

@COMMANDS@
