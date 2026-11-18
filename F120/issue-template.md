## Disposition

**Measured no-gain; no performance PR.** Specializing the private copied store
in MVC `CopyOnWriteList<T>.Contains` makes the declared copied-five-factory miss
54.37% and 36.46% slower in the two complete source comparisons.
BDN reports 0 B/op for both variants of that primary. Favorable empty and
ordinary-path observations are retained, not substituted for the primary.

## Connected artifacts

| Artifact | Link |
|---|---|
| Immutable evidence and artifact map | [F120 guide]({{EVIDENCE_URL}}) |
| Every profile and raw result | [Full comparison table]({{EVIDENCE_BASE}}/comparison-results.md) |
| Runnable eight-input benchmark | [Project]({{EVIDENCE_BASE}}/harness/AutoPerf.Benchmarks.csproj) |
| Independent arithmetic, settings, owners and XML audit | [Final audit]({{EVIDENCE_BASE}}/audit-summary.json) |
| Exact commands and all outcomes | [Validation]({{EVIDENCE_BASE}}/validation-commands.md) |
| Experimental source, not a merge recommendation | [Fork commit](https://github.com/jaslawinMs/aspnetcore/commit/6cbee2d052c988b07d936ea8de489456beb22317) |
| Exact-input independent rebuild, no timing | [Reconstruction]({{EVIDENCE_BASE}}/reconstruction-paired-001/verified-reproduction.json) |

## Scope and preservation

Real MVC HTTP routing/controller activation produces the public collection.
Public add/remove creates the private copy; a second request checks source and
wrapper isolation. Timing is one Contains call on that already-produced store,
not host/request/first-write cost. The ordinary source-backed path is retained.
The explicit object-equality loop is necessary: typed equality can disagree,
and enumeration/version/short-circuit behavior must stay intact.

Original/candidate each pass 35 selected XML rows, including seven green/green
preservation rows. Actual current default passes 28 existing rows; candidate
Razor Pages managed producer tests pass nine. Original/default/candidate and both
independently rebuilt variants agree on 48 real HTTP requests, 16 public
contracts, six extra equality/enumeration contracts and eight benchmark
lifecycles per successful full characterization.

## Budget and limitations

All three authorizations remain consumed and permanently closed.
Authorization 1 failed before workload samples because the pinned emitter did
not await async fixture setup. Its exact old fixture and output remain.
Only common untimed preparation was repaired; no source/profile/settings/gate
retuning or replay followed. Authorizations 2/3 completed in opposite orders
with 512 retained observations, all independently recomputed.

This is a non-isolated shared Windows box and a .NET 12 preview runtime.
All adverse/control outcomes remain. No allocation-saving, specific JIT-cause,
whole-MVC, real compiled-page, browser, production-frequency or merge-readiness
claim is made. The fixed positive-findings report excludes this outcome.

Immutable evidence commit: `{{EVIDENCE_COMMIT}}`.
