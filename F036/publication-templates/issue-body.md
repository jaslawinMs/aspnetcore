## Outcome

**No-gain; no performance PR.** The same-signature internal ViewData enumeration
fast path takes **1.93%, 7.54%, and 10.66% more time** on the predeclared
`ReadCopy:1` primary. Both variants report **56 B/op**. Generic empty profiles
regress in all three pairs, and all 96 paired allocation observations are
unchanged. Favorable scaled rows and unchanged-control movement are retained.

The experimental change was withdrawn. Original shipping source and all three
selected MVC product/test-bin DLL/PDB pairs are restored byte-exactly; a fresh
restored-original 19-row test run passes.

## Experiment and evidence

- [Immutable complete evidence and all results](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F036/README.md)
- [All 32 profiles across all three pairs](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F036/comparison-results.md)
- [Audited paired samples/statistics](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F036/comparison-statistics-audit.json)
- [Separate original-only diagnostic](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F036/statistics-audit.json)
- [Withdrawn actual patch](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F036/comparison-preparation-candidate/candidate.patch)
- [Exact recorded commands and outcomes](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F036/validation-commands.md)
- [Runnable comparison project](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F036/comparison-harness/AutoPerf.Benchmarks.csproj)
- [Independent unchanged source branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F036-viewdata-enumeration)

The candidate only adds a nonempty concrete-dictionary fast path inside the
existing explicit generic method. Empty singleton, copy-on-write/derived fallback,
nongeneric method, and public API are unchanged. Public copies remain live until
first write and honor derived interface enumeration; a new universal concrete
cursor API was not justified. No API addition or approval is claimed.

One original-only 32-row/256-sample diagnostic motivated this hypothesis; it was
not reused as a paired member. Three later alternating pairs provide
192 rows/1,536 samples. **All 1,792 raw stdout/JSON samples matched** and mean,
sample variance, SD and SE were independently recomputed. Maximum paired CV is
13.42%; confidence intervals/MemoryDiagnoser counters remain reported values.
No failed build/native attempt, no fourth source comparison.

Original, candidate and restored-original each pass all 19 selected owning rows,
including every metadata/null/23 theory case. Four successful characterizations
have identical 33 semantic plus 32 actual benchmark lifecycle records. Real
public producers exercise source/copy detachment, nested/stale cursors,
unsuccessful Remove and derived-order materialization. The original-only project
was independently relocated/rebuilt without retiming; the comparison harness was
not separately relocated. Measured original/candidate harness DLL/PDB bytes are
identical; only the tested ViewFeatures DLL/PDB differ among 289 consumer files
(287 unchanged includes the two harness files, leaving 285 other files).

## Boundaries

Shared, non-isolated Windows Hyper-V VM; pinned net12/C#13, Release/Server GC,
3 warmups/8 results/100 ms, `DontRemove`, settings-preserving executor. No priority,
affinity, power or OS/network changes. All 448 executor and 704 setup/cleanup
settings observations match initial normal-priority settings.

Independent source parent `37e809e`, not full current-main integration. Twelve
selected files match the freshly checked default; **TemplateInfo has known
constructor dependency drift**. All construction, detachment and writes stay
outside timing. No Razor/HTTP/application-throughput, workload-frequency or native
JIT-causation claim. Live audit rehashed 1,156 frozen entries, 824 loaded bindings
and 1,255 unique files; all 11 captured native PIDs checked. The portable audit
checks copied text/statistics, not omitted native binary bytes.

This tracking issue parks the measured non-improvement; it is not an upstream
optimization proposal or a claim that every possible implementation is equivalent.
