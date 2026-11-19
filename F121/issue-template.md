## Outcome

**F121 is measured no-gain, not a performance PR.** Three complete source comparisons retain 768 observations. The predeclared copied-five-factory CopyTo primary is 16.03%, 5.06% and 18.84% slower; BDN reports 0 B/op in both variants. All secondary and unchanged-control observations are retained. The three-slot budget is permanently closed.

## Connected artifacts

| Artifact | Link |
|---|---|
| Immutable evidence and limitations | {{EVIDENCE_URL}} |
| Exact source experiment, not recommended for merge | https://github.com/jaslawinMs/aspnetcore/commit/f60d71e24d104529abc4b72edd3c1e786c772959 |
| Twelve focused preservation rows | https://github.com/jaslawinMs/aspnetcore/blob/f60d71e24d104529abc4b72edd3c1e786c772959/src/Mvc/Mvc.Core/test/Infrastructure/CopyOnWriteListTest.cs |
| Runnable BenchmarkDotNet project | {{EVIDENCE_BASE}}/harness/AutoPerf.Benchmarks.csproj |
| Every measurement, control and variability table | {{EVIDENCE_BASE}}/comparison-results.md |
| Exact validation commands, results and requirement coverage | {{EVIDENCE_BASE}}/validation-commands.md |
| Independent exact-eight-input rebuild | {{EVIDENCE_BASE}}/reconstruction-paired-001/verified-reproduction.json |
| Independent audit: 117 XML rows, 22 runtime and 192 settings records | {{EVIDENCE_BASE}}/audit-summary.json |
| Closed timing budget | {{EVIDENCE_BASE}}/permanent-budget-close.json |

Current default f78194260f43c48ae2092675f55757f2a42dd63d and the original source pass the same faithful MVC producer/CopyTo boundary. New tests are green/green preservation checks, not a semantic-bug fix. The candidate preserves empty-input no-op behavior, exception types, partial writes and arbitrary source enumeration/disposal.

No primary retargeting, further timing, normal-request/application gain, specific JIT-cause, compiled-page/browser or merge-readiness claim. No performance pull request or browser launch. The fixed classified report excludes no-gain results and remains unchanged.
