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
| F003 | [Draft jaslawinMs/aspnetcore#39](https://github.com/jaslawinMs/aspnetcore/pull/39); modest gains, no structural heap saving, custom variance and all control/non-win outcomes retained | [Guarded protobuf ListValue construction](F003/README.md) |
| F009 | Draft proposal | [Validation-summary metadata membership](F009/README.md) |
| F021 | Draft proposal | [Enum conversion during select rendering](F021/README.md) |
| F025 | Draft proposal; workload trade-offs and unstable case retained | [Pooled BSON TempData buffers](F025/README.md) |
| F027 | Draft proposal; unstable control disclosed | [Pooled JSON Patch conversion](F027/README.md) |
| F034 (also F119) | No-gain; duplicate consolidated | [Concrete Rewrite condition enumeration](F034/README.md) |
| F045 | Draft proposal; unstable control disclosed | [Single validation-message ModelState lookup](F045/README.md) |
| F068 | Draft proposal | [ModelState breadth-first enumeration](F068/README.md) |
| F077 | Rejected; three public conversion contracts change despite large-case gains | [Newtonsoft JSON Patch token bridge](F077/README.md) |
| F079 | Draft proposal; unchanged SetCookie control regressions retained | [CookieHeaderValue span concatenation](F079/README.md), [draft](https://github.com/jaslawinMs/aspnetcore/pull/24) |
| F083 | Draft proposal | [Bounded invariant-lowercase rewrite-map lookup](F083/README.md) |
| F090 | Draft proposal | [Literal validation-message Boolean strings](F090/README.md) |
| F106 | Draft proposal; workload trade-offs retained | [Per-call enum-name reverse lookup](F106/README.md) |
| F110 | Draft proposal; heap trade-offs and non-steady indexer control disclosed | [Caller-provided select-value membership](F110/README.md) |
| F117 | Draft proposal; full-link non-wins, fallback trade-offs and unstable control retained | [Maximum route constraint fast paths](F117/README.md), [draft](https://github.com/jaslawinMs/aspnetcore/pull/26) |
| F107 | Draft proposal; empty concrete convention changes, nonempty/control regressions retained | [Empty form-file query results](F107/README.md), [draft](https://github.com/jaslawinMs/aspnetcore/pull/29), [convention proposal](https://github.com/jaslawinMs/aspnetcore/issues/28) |
| F127 | Draft proposal | [Rewrite equality-only string comparisons](F127/README.md) |
| F128 | No supported material win; small gains and control regressions retained | [OWIN alternate accept delegate capture](F128/README.md) |
| F130 | No supported net win; experiment retained | [Fixed input-type membership trade-offs](F130/README.md) |
| F131 | [Draft jaslawinMs/aspnetcore#31](https://github.com/jaslawinMs/aspnetcore/pull/31); small/mixed pipeline effects, extra app-lifetime index and unstable case disclosed | [Private OWIN feature-map lookup index](F131/README.md) |
| F171 | Rejected; caller Items setter exception changes and all existing-key cases add 24 B/op | [OWIN cancellation-default TryAdd experiment](F171/README.md) |
| F172 | Rejected; caller version setter exception changes, all allocations unchanged and single-pair variance retained | [OWIN version-default TryAdd experiment](F172/README.md) |
| F181 | [Draft jaslawinMs/aspnetcore#35](https://github.com/jaslawinMs/aspnetcore/pull/35); three repeatable complete-build targets, small-workload regressions and grouped variance retained | [DFA complex-literal pair enumeration](F181/README.md) |
| F228 | Rejected; removed current consumer, all affected diagnostic heap counts increase and invalid live template retained | [Dormant gRPC query-descriptor membership](F228/README.md) |
| F241 | [Draft jaslawinMs/aspnetcore#33](https://github.com/jaslawinMs/aspnetcore/pull/33); larger discovery gains, extra heap and small/fallback regressions retained | [Bounded view-component discovery membership](F241/README.md) |
| F272 | No supported net win; complete descriptor/word-start results mixed, direct lower-branch gain and control/heap variance retained | [Invariant gRPC character casing](F272/README.md) |
| F295 | [Draft jaslawinMs/aspnetcore#37](https://github.com/jaslawinMs/aspnetcore/pull/37); complete body-descriptor gains, tiny/no-output time regressions and large no-output heap boundary retained | [Bounded gRPC name formatting](F295/README.md) |

Measurements were collected serially on a shared Windows machine. They are
microbenchmark observations, not production throughput or universal performance
guarantees. Raw exports retain uncertainty and outliers.
