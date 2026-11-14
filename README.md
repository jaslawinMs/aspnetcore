# ASP.NET Core AutoPerf evaluations

This branch contains the candidate inventory, reproducible benchmark projects,
and raw results for independently evaluated optimizations. Code proposals live
on separate branches and are submitted as draft PRs **inside this fork**, not
against dotnet/aspnetcore.

The [complete candidate inventory](findings.md) preserves all 358 remaining
findings and their original IDs. Eleven exact overlaps with existing work from
dotnet/aspnetcore#70219 were excluded. Pending findings are not confirmed defects
or measured regressions.

Each item receives at most three measured before/after comparisons. A clear
large win can stop early; non-improving items are marked `no-gain`, not published
as speculative optimization PRs. Incompatible replacements are marked
`rejected` even when individual benchmarks improve. Correctness, actual owning-component behavior,
small-workload controls, allocations, and measurement limitations matter as
well as the largest speedup.

## Evaluations

| Candidate | Disposition | Evaluation |
|---|---|---|
| F009 | Draft proposal | [Validation-summary metadata membership](F009/README.md) |
| F021 | Draft proposal | [Enum conversion during select rendering](F021/README.md) |
| F025 | Draft proposal; workload trade-offs and unstable case retained | [Pooled BSON TempData buffers](F025/README.md) |
| F027 | Draft proposal; unstable control disclosed | [Pooled JSON Patch conversion](F027/README.md) |
| F034 (also F119) | No-gain; duplicate consolidated | [Concrete Rewrite condition enumeration](F034/README.md) |
| F045 | Draft proposal; unstable control disclosed | [Single validation-message ModelState lookup](F045/README.md) |
| F068 | Draft proposal | [ModelState breadth-first enumeration](F068/README.md) |
| F077 | Rejected; three public conversion contracts change despite large-case gains | [Newtonsoft JSON Patch token bridge](F077/README.md) |
| F083 | Draft proposal | [Bounded invariant-lowercase rewrite-map lookup](F083/README.md) |
| F090 | Draft proposal | [Literal validation-message Boolean strings](F090/README.md) |
| F106 | Draft proposal; workload trade-offs retained | [Per-call enum-name reverse lookup](F106/README.md) |
| F127 | Draft proposal | [Rewrite equality-only string comparisons](F127/README.md) |
| F130 | No supported net win; experiment retained | [Fixed input-type membership trade-offs](F130/README.md) |

Measurements were collected serially on a shared Windows machine. They are
microbenchmark observations, not production throughput or universal performance
guarantees. Raw exports retain uncertainty and outliers.
