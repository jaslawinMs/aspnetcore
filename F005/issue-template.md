F005 proposes a four-line private-state allocation/scaling trade-off in `ForLoopIteratorInClosureAnalyzer`.

Use a lazy symbol-comparer `HashSet<ILocalSymbol>` for potential iterators and directly dependent in-place removal, leaving Iterators, AllForVariables, promotion branches and diagnostic ordering untouched. No public API/default/dependency/TFM/visibility change.

The real producer uses extra unincremented `for` declarators and actual Roslyn mutation/callback operations. A canonical bottom-incremented `i` alone is not a potential-list-growth reproduction.

**Qualified, not merge-ready:** two identical-harness controlled comparisons (72 reports) observe0.56-9.77% lower process-wide allocation in four large-promotion outcomes. Single-potential heap reversals, Promoted16/fresh heap cost, all NonRender timing costs and high control variation remain. This is not a causal overall analyzer/compiler/build/UI speedup or a production-frequency claim.

All three comparison slots were spent. The first pair's28 reports are exploratory because independently built harness DLL/PDBs differ despite identical source. The later two pairs share exact harness bytes and differ only in original/candidate owner DLL/PDB. No fourth run.

Original/candidate each pass20 exact existing owning Facts; five images pass560 compiler checks/7040 exact BL0014 observations. The independent audit reconciles all100 reports/800 raw actual samples/765 retained/35 upper-filtered/300 warmups/1999 overheads. Raw binary/binlog bytes are omitted publicly and cannot be rehashed by the copied portable audit.

[Immutable complete report, runnable projects, raw results and exact validation commands](@EVIDENCE@/README.md).
