# HTTP.sys connection-close append: focused lookup reduction

Fork-only research tracking for retained finding **F046**.

The shared internal `HeaderCollection.Append` does a dictionary read and write.
Use one `CollectionsMarshal.GetValueRefOrAddDefault` slot only for the exact
Dictionary runtime type; keep original interface operations for wrappers and
subclasses, existing guards, comparer, key spelling, order, and null semantics.

The actual inspected shipping caller is HTTP.sys `Response.ComputeHeaders`
appending `Connection: close`, not general application/request-header append.
IIS compiles the class and passes managed contracts but has no references to
this method in the inspected managed owner IL; native IIS is not validated.

**Qualified focused local result, not merge-ready:** primary median **13.41%
less time**, all three pairs faster, **384 B/op unchanged**. This small suffix
includes the real collection's construction/setup, one compiled delegate call,
one close append, and count readback. Native HTTP.sys/IIS/application throughput
and production frequency are not measured.

The unchanged same-profile control median is -0.96%, with primary exceeding it
in all three pairs. Keep adverse/shared-machine evidence prominent: the
unchanged KeepAlive secondary control swings 27.44% in pair 2, the WrappedStore
fallback regresses 2.31% in pair 3, and the largest case CV is 13.46%.
No fallback improvement or allocation saving is claimed.

| Artifact | Location |
|---|---|
| Source and ten new preservation rows | [Exact two-file commit](https://github.com/jaslawinMs/aspnetcore/commit/{{SOURCE_COMMIT}}) |
| Scope, classification, test map, and limitations | [Immutable case guide](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F046/README.md) |
| Runnable nine-file benchmark project | [Project](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F046/harness/AutoPerf.Benchmarks.csproj) |
| Every comparison and raw report | [Results](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F046/comparison-results.md) |
| Exact executed validation and preserved failures | [Commands/results](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F046/validation-commands.md) |
| Independently recomputed samples/settings/XML | [Full audit](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F046/audit-summary.json) |
| Later draft/issue/browser connection receipt | [Live additive receipt](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F046/publication.json) |

Three permanently closed AB/BA/AB source comparisons retain 576 observations.
Original and candidate each pass ten owning unit rows and five existing native
functional rows with zero skips. Actual current-default/original/candidate
characterizations establish twenty owner contracts, twelve fresh boundaries,
and six real native producer profiles each. A byte-exact independent project
restore/rebuild repeats both variants without further timing.

The first original-only fixture run's three incorrect assumptions were corrected
before shipping edits or timing, not hidden or claimed as a semantic bug fix.
All command failures, preparation sources, unchanged controls, and adverse
results remain in the capsule. The fixed classified report is unchanged.
