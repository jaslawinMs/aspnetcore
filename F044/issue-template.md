# F044: custom-base Razor section registration

Qualified **workload-dependent custom-base local result**, not a normal RazorPage or application-speedup claim.
Use concrete `Dictionary.TryAdd` only in `RazorPageBase.DefineSection`, preserving all guards,
case-insensitive duplicate behavior and original callback identity.

The predeclared SDK-compiled two-section registration primary uses **10.22% median paired less time**,
with **704 B/op unchanged**. All three source comparisons are closed: 576 retained samples.
The unchanged control moves 4.79% median, ranging -10.38% to 5.18%; uncertainty is retained.

**Adverse outcomes:** one-section registration median 3.17% more time, including a 40.06% individual
regression; full-view Eight median 6.74% more time. Full-view Two improves only 0.30%, not a material
full-view win. Long-name/scaled gains do not replace the primary or establish production frequency.

Both source variants pass all 59 owning test rows, including each new direct-base duplicate row.
Actual current-default and original/candidate SDK producers pass ten contracts and twelve
registration/rendering boundaries. A fresh exact-project rebuild reproduces both without timing.
The direct-base fixtures supply their required abstract context hooks and reject use as layouts;
real RazorPage layouts consume every section through real scoped pooled buffering.

| Artifact | Direct link |
|---|---|
| Experimental implementation | [Two-file source commit](https://github.com/jaslawinMs/aspnetcore/commit/{{SOURCE_COMMIT}}) |
| Complete benchmark and scope guide | [Immutable evidence](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F044/README.md) |
| All results, including regressions and variability | [Comparison tables](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F044/comparison-results.md) |
| Exact commands, actual outcomes and preparation failure | [Validation catalog](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F044/validation-commands.md) |
| XML-parsed preservation cases | [Actual 59+59 rows](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F044/actual-paired-test-row-validation.json) |
| Independent reconstruction | [Fresh restore/build and both consumers](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F044/reproduction-paired-001/verified-reproduction.json) |

The candidate was measured before its later publication commit; physical source/PDB snapshots
identify the actual edit. No new public API, allocation-saving, broad throughput or merge-ready
claim. Fork-only research tracking; the draft and additive final receipt will be linked after creation.
