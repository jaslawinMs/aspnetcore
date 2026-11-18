# F042: JSON Patch dictionary replacement - measured no-gain

**Tracking disposition, not a merge request.** Three completed source
comparisons retain all12profiles/576results. The declared parsed-object/1
primary takes3.65% more time at the median of paired effects; primary
managed-byte savings are2,-1,2 B/op. Neither the predeclared5% timing nor
repeated16B saving criterion is met. No performance PR is created.

| Artifact | Evidence |
|---|---|
| Full explanation and connected artifacts | [Immutable evaluation]({{EVIDENCE_URL}}) |
| Actual experimental source, not recommended | [Commit737aae8](https://github.com/jaslawinMs/aspnetcore/commit/737aae8c1a3de33f7474a2e19a26cb1b567f5290) |
| Exact runnable BenchmarkDotNet project | [Project](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F042/harness/AutoPerf.Benchmarks.csproj) |
| All comparisons, controls, allocations and variability | [Results](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F042/comparison-results.md) |
| Exact commands and original/candidate tests | [Validation map](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F042/validation-commands.md) |
| Independent arithmetic, runtime/source and relocation proof | [Auditor output](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F042/arithmetic-audit-003.stdout.txt), [independent rebuild](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F042/reproduction-paired-001/verified-reproduction.json) |

Actual JSON converters can resize or clear/repopulate the same dictionary.
A borrowed reference cannot span that conversion. The guarded non-null,
already-assignable exact-dictionary candidate preserves the original
conversion fallback and all34selected tests per source, including both real
converter-mutation theory rows. Current default, original, candidate and
independently rebuilt project characterizations pass all16public-producer
cases and12untimed profiles.

This is not a semantic-bug fix, a32B allocation-saving claim, an isolated
lookup or application-performance result, or complete compiler provenance.
Shared-VM adverse/control observations, actual preparation/audit failures,
SourceLink precommit boundary and one descriptive byte-count correction are
explicitly retained. Three of three authorizations are consumed; no retiming.
The positive-findings report intentionally excludes no-gain cases.
