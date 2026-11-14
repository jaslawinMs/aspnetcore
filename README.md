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
as speculative optimization PRs. Correctness, actual owning-component behavior,
small-workload controls, allocations, and measurement limitations matter as
well as the largest speedup.

## Evaluations

| Candidate | Disposition | Evaluation |
|---|---|---|
| F034 (also F119) | No-gain; duplicate consolidated | [Concrete Rewrite condition enumeration](F034/README.md) |
| F068 | Draft proposal | [ModelState breadth-first enumeration](F068/README.md) |
| F127 | Draft proposal | [Rewrite equality-only string comparisons](F127/README.md) |

Measurements were collected serially on a shared Windows machine. They are
microbenchmark observations, not production throughput or universal performance
guarantees. Raw exports retain uncertainty and outliers.
