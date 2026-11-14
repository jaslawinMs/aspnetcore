## Scope

Fork-only evaluation of AutoPerf finding F241. This is a proposal for
`ViewComponentFeatureProvider.PopulateFeature` metadata discovery, not a
confirmed request-processing regression or an upstream issue submission.

The provider uses the accumulated ordered component list for repeated duplicate
membership checks. Complete discovery over actual runtime `AssemblyPart`
metadata provides a faithful boundary for measuring a bounded local index.
Default source and relevant history were inspected before implementation.

## Measured proposal

Keep the exposed ordered list, existing duplicates and original filtering.
Lazily index membership after 256 existing entries, only for exact manager-style
parts lists with ordinary exact `AssemblyPart`/runtime-assembly producers.
Custom/derived type providers, custom assemblies and arbitrary parts enumeration
retain live list membership because their producers can mutate the feature.
No public signature, default or convention change is intended.

All three allowed comparisons are consumed. The final implementation uses
pairs 2-3 only; the initial 32-entry prototype is retained separately.
Three 1,024-component complete-discovery cases improve 30.03-33.71% in final
paired medians; two indexed 256-component cases improve 5.53-7.97%.
Those cases add 5,976-44,613 median reported B/op.

Eighteen of twenty non-index cases have higher medians, including empty
discovery +10.49% and an unstable array fallback +21.32%.
The latter's pair-3 change is +42.82%, with large retained variance.
No universal improvement, full application startup gain, production throughput,
concurrency result or explanation of control variance is claimed.

Original/final full suites pass 2,607/2,607, zero skips, including every one of
the 16 focused compatibility rows. All 25 complete producer/result receipts
match. Every measured launch completed 25 cases with eight retained iterations;
only the owning DLL differs under the unchanged original harness/configuration.

## Immutable evidence

- [Independent source commit](https://github.com/jaslawinMs/aspnetcore/commit/de11a4d95cf493f907520ca7a29865456ff93305)
- [Complete measured report and standalone project](https://github.com/jaslawinMs/aspnetcore/tree/b0026a1912ea7167d0a8bab08f1985c3c21075af/F241)
- [All final paired cases](https://github.com/jaslawinMs/aspnetcore/blob/b0026a1912ea7167d0a8bab08f1985c3c21075af/F241/comparison.md)
- [All original/prototype/final observations](https://github.com/jaslawinMs/aspnetcore/blob/b0026a1912ea7167d0a8bab08f1985c3c21075af/F241/raw-case-outcomes.json)

This issue records the measured tradeoff for discussion; it does not establish
production applicability or approval to merge.

Implementation draft: [jaslawinMs/aspnetcore#33](https://github.com/jaslawinMs/aspnetcore/pull/33).
