# F031 completed-success template guard comparisons

**No-gain: original source restored; no optimization commit or performance PR.**
One compatible guard,3closed source comparisons,6timed native profiles,36reported rows,all288result samples retained.
Positive less-time values favor the guard; negative values are regressions. Built-in Display.Default rows are unchanged controls.

| Profile | Round | Original us/op | Guard us/op | Less time % | Original B/op | Guard B/op | Original CV% | Guard CV% |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Display.Completed32 | 1 | 31.726 | 31.296 | 1.36 | 13682 | 13682 | 26.31 | 27.24 |
| Display.Default32 | 1 | 6.372 | 6.254 | 1.86 | 12034 | 12033 | 1.00 | 1.10 |
| Editor.Completed32 | 1 | 10.102 | 9.409 | 6.86 | 13497 | 13497 | 16.71 | 18.77 |
| Display.Completed4096 | 1 | 49.422 | 47.976 | 2.93 | 78451 | 78451 | 9.22 | 6.90 |
| Display.Default4096 | 1 | 33.858 | 30.834 | 8.93 | 60774 | 60774 | 6.77 | 1.64 |
| Editor.Completed4096 | 1 | 40.349 | 45.781 | -13.46 | 78509 | 78507 | 6.70 | 7.98 |
| Display.Completed32 | 2 | 31.436 | 32.182 | -2.37 | 13554 | 13682 | 32.92 | 27.99 |
| Display.Default32 | 2 | 6.550 | 6.353 | 3.02 | 12033 | 12033 | 1.05 | 1.21 |
| Editor.Completed32 | 2 | 9.693 | 9.663 | 0.31 | 13497 | 13497 | 21.32 | 18.10 |
| Display.Completed4096 | 2 | 48.780 | 41.348 | 15.24 | 78507 | 78452 | 11.45 | 8.34 |
| Display.Default4096 | 2 | 31.884 | 33.981 | -6.57 | 60774 | 60774 | 1.43 | 2.88 |
| Editor.Completed4096 | 2 | 49.325 | 40.952 | 16.98 | 78507 | 78507 | 12.41 | 4.25 |
| Display.Completed32 | 3 | 33.868 | 31.762 | 6.22 | 13682 | 13682 | 17.99 | 29.60 |
| Display.Default32 | 3 | 6.276 | 6.382 | -1.68 | 12033 | 12033 | 4.56 | 2.11 |
| Editor.Completed32 | 3 | 9.375 | 9.418 | -0.45 | 13497 | 13497 | 20.29 | 23.37 |
| Display.Completed4096 | 3 | 51.668 | 47.757 | 7.57 | 78452 | 78507 | 11.10 | 8.34 |
| Display.Default4096 | 3 | 31.458 | 31.697 | -0.76 | 60775 | 60774 | 1.87 | 5.87 |
| Editor.Completed4096 | 3 | 48.759 | 46.975 | 3.66 | 78508 | 78507 | 9.73 | 9.41 |

Maximum within-profile CV: 32.92%. Actual cumulative reported global timing: 477.55seconds.
Long Display is favorable in all3pairs; do not omit it. Its smallest mean change is2.93%, while target reversals,control movement and large within-profile variability prevent a convincing overall win. Allocations are not uniformly identical and no structural reduction is claimed.

- No-gain means no convincing overall compatible benefit from this one success guard, not zero original cost or proof that all future optimizations are impossible.
- Long Display custom-template means improve in all3pairs, but only2.93% in one pair; other targets reverse/regress, controls also move and within-profile CV reaches the reported maximum. Retain the favorable and adverse outcomes without interpreting small differences as reliable framework gains.
- Managed allocation observations are not all identical:128B first-case drift,55B long-Display reversals and1-2B residuals remain. No structural allocation reduction or resource gain is claimed.
- Whole prepared helper/template/request-scope/output wrapper, not isolated GetResult cost. Root service/metadata providers are prebuilt/warmed; lookup, literal CSharp activation and unused interfaces are controlled seams.
- Actual HtmlHelper/TemplateBuilder/TemplateRenderer, scoped MVC buffer, RazorView/page-owned pending producer and consumed IHtmlContent; not HTTP,cshtml discovery/compilation,production frequency/throughput,request-abort producer,starvation or deadlock proof.
- Identical measured harness DLL/PDB and consumer dependencies except actual tested ViewFeatures DLL/PDB. The separately rebuilt relocated harness may have path-dependent PE/PDB bytes; its source is byte-exact and untimed.
- All288 Workload.Result stdout/JSON samples retained and means,sample variance,SD,SE recomputed. Allocation and confidence-interval values are reported evidence, not independent allocation tracing,GC arithmetic or CI-distribution derivation.
- Portable audit rehashes copied text and receipts, not omitted native binary bytes. Selected source/PDB document associations are not complete compiler provenance or coverage.
- Original native owning tests pass525/525, but initial wrapper exits1 due a null ordered-dictionary Measure-Object Sum. Retain the failed wrapper and raw outputs; corrected value aggregation reverified that same native invocation without rerunning tests.
- BDN Parameters abbreviates Display.Completed4096. The audit uses unabridged FullName plus actual setup labels, not the truncated presentation value retained in the interim two-comparison snapshot.
- Three actual source comparisons are permanently closed; no tuning, fourth comparison or unfavorable-sample removal is authorized.
