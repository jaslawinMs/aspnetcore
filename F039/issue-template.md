## Measured F039 proposal

Use the private Data dictionary TryGetValue in TempData's explicit collection Contains.
Do not use the consuming public IDictionary.TryGetValue. F040 Remove and public API are unchanged.

Predeclared prepared actual-owner primary Match:12:8: **45.83/45.62% less time**, median45.73%,
**0B/op unchanged**. Three consumed authorizations include a sealed-fixture failure before timing;
two comparisons completed:40profiles/member,160rows,1,280stdout/JSON-matched samples. Both harness
epochs/seals and all adverse controls remain published. Maximum CV29.37%.

**Non-wins:** MissingNull:12:0: 2.56% slower; Match:128:0: 4.64% slower; Null:128:0: 2.32% slower; ControlContainsKey:12:1: 0.76% slower; ControlContainsKey:128:1: 0.06% slower; MissingNull:12:8: 3.61% slower; ControlContainsKey:12:8: 1.53% slower; MissingNull:128:8: 2.18% slower; ControlContainsKey:128:8: 0.15% slower; ControlContainsKey:12:64: 0.14% slower. Worst individual observations: Match:128:0 attempt 3: 10.19% more time; MissingNull:12:8 attempt 3: 6.44% more time; ControlContainsKey:12:1 attempt 3: 4.08% more time.
74original+74candidate managed rows pass, including all9new preservation rows; ten existing
nonquarantined TempDataCookieTest facts pass after a dependency-aware Debug build. The pre-quarantined
TempDataPersistWithoutAccessing (dotnet/aspnetcore#70085) is excluded, not counted. Both actual canonical
cookie-backed browser variants pass8navigations/0errors. Exact seven-file project independently rebuilds
and characterizes, without extra timing.

[Immutable evidence, runnable project, exact commands and limitations](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F039/README.md).
Source branch `autoperf/F039-tempdata-contains-lookup` at `ae7b2c751c2d4ff18302779ecd6f4fa76beb0260`.
Shared Windows VM, not isolated. Not application/cookie/DI/rendering/Mono/AOT performance or merge-ready.
