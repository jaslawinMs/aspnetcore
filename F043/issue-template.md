## Disposition

**F043: no-gain for the predeclared small-primary/control decision; no performance PR.**

The two-section registration primary is 5.213% faster by the median of three paired effects, with 800 B/op
on both versions. This passes the raw 5% numerical threshold. However, the unchanged no-section
registration control moves 4.343%, and in two of three comparisons its apparent gain is larger than
the primary's. The predeclared control/variability gate therefore does not justify a small-primary
performance recommendation on this shared machine.

This is not a claim of no improvement anywhere: 8 ordinary sections improve 13.69%, 64 improve 23.78%,
and 8 deliberately long names improve 39.88% in the local registration boundary. Those secondary
results are retained, not substituted for the primary. Two-section full managed rendering has
only 0.61% median less time and includes a regression.

## Connected artifacts

| Artifact | Link |
|---|---|
| Complete guide and limitations | [Immutable evidence]({{EVIDENCE_URL}}) |
| Experimental source, not a merge recommendation | [Two-file commit](https://github.com/jaslawinMs/aspnetcore/commit/c486eef54e98f8e982509480019cd55490287193) |
| Actual Razor SDK/BenchmarkDotNet project and six compiler fixtures | [Project](https://github.com/jaslawinMs/aspnetcore/tree/{{EVIDENCE_COMMIT}}/F043/harness) |
| Every result, control, regression and allocation | [All three pairs](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F043/comparison-results.md) |
| Actual tests/builds and retained preparation failures | [Exact commands and outcomes](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F043/validation-commands.md) |
| Independent fresh-project rebuild, no timing | [Reproduction](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F043/reproduction-paired-001/verified-reproduction.json) |
| Preimplementation criteria and permanently consumed budget | [Plan](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F043/acceptance-plan.json), [closed 3/3 budget](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F043/diagnostic-budget.json) |

Both versions pass all 59 `RazorPageTest` cases, including each new case-insensitive preservation theory
row. Actual current-default/original/candidate owners pass 9 public contracts and six real SDK-compiled
producers at 12 registration/full-render boundaries. Both independently rebuilt consumers repeat
those observations without timing. This is green/green preservation coverage, not a bug fix.

All 576 retained samples are independently recomputed. Only owner DLL/PDB differ between the 264-file
measured images. Three selected executable PDB documents are checked, not complete compiler provenance.
Managed validation excludes JS/static-web-assets, native IIS and full-repository builds.
The budget stays closed; no performance PR, browser launch or upstream publication is warranted.
