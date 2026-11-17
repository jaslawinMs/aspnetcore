## AutoPerf F010: existing claim-value sets

Track a fork-only, performance/contract-equivalence experiment at the existing
private allowed-value membership seam. An exact caller-owned HashSet with a
reference-known Ordinal/default string comparer can use its own membership
operation; all other enumerables/comparers must preserve explicit Ordinal LINQ
behavior, retained input identity, constructor empty flag and live mutation.

**Qualified tradeoff, not merge-ready:** large 64-value late matches take
77.5-81.7% less time across 3 comparisons, while small/default/no-value/early
controls regress by up to 13.69%; allocations are unchanged in all 11 shapes.
The noneligible ignore-case fallback also speeds up without direct-set causal
attribution. Existing set construction/traffic frequency/typical application
benefit is not established.

Measured the actual registered public service/builder/dispatch, not a copied
matcher. Original/candidate suites pass 214/219 rows; all 3 owner TFMs and real
native/legacy/standard producer checks pass. No API/default/dependency/TFM change.

Full immutable source, runnable projects, all outcomes/raw samples, failed
preparations, successful live/portable audit and limitations:
@EVIDENCE@/README.md

Separate from David Fowler's merged dotnet/aspnetcore#70221, which leaves this
membership predicate unchanged. No upstream issue/PR or production impact
claim is requested here.
