# F047: reduce temporary SSR parameter-key allocations

**Allocation-only research proposal; not a speedup or merge-ready recommendation.**
Enumerate the private SSRRenderModeBoundary parameter snapshot directly instead
of materializing Keys.ToArray and reindexing every value. Snapshot/validation,
fragment captures and serialization stay intact. Modern Dictionary existing-value
overwrites are supported and exercised on the pinned runtime.

Three permanently closed AB/BA/AB comparisons save 56 B/op in the one-scalar
fresh-boundary primary (1616 -> 1560). Its median paired less-time effect is
-1.43%; the candidate is slower in pairs 2 and 3 (2.48%, 1.43%). The unstable
first original baseline does not justify a 51.20% speedup headline.
Both unchanged nonprerender controls save zero bytes; all adverse results remain.

| Connected artifact | Link |
|---|---|
| Exact source proposal and preservation theory | [Two-file commit](https://github.com/jaslawinMs/aspnetcore/commit/{{SOURCE_COMMIT}}) |
| Immutable case guide and runnable BenchmarkDotNet project | [Guide](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F047/README.md) |
| Every measurement, CV, control and raw-report link | [Results](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F047/comparison-results.md) |
| Exact commands/results, 314 individual passing XML rows and browser boundaries | [Validation](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F047/validation-commands.md) |
| Raw arithmetic audit and independent untimed rebuild | [Audit](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F047/audit-summary.json) |

The source contains only the loop change, unused-using removal and three new
Server/WebAssembly/Auto preservation rows. The new theory is green on both
shipping versions; it closes coverage, not a claimed functional bug. The initial
unsupported root-Auto fixture failure, restore prerequisite and parser correction
are retained. Canonical browser checks pass six modes/clicks per source and the
owning existing Selenium suite passes all 14 rows. No application throughput,
cached Auto selection, AOT/trimming, global Router or packaging result is claimed.
The fork draft and additive publication receipt will be connected after creation.
