## Measured F040 proposal

Use private Data.TryGetValue in TempData's explicit conditional collection Remove, preserving the
same object.Equals direction, branch and final Remove(key) result/retention. Never use the consuming
public IDictionary.TryGetValue or remove before equality. F039 Contains and public API are unchanged.

Predeclared actual-owner Match:12:8: **16.88/16.66/16.17% less RemoveAndRestore time**, median **16.66%**,
**0 B/op unchanged**. Restoration is inside timing, not isolated Remove cost. All three comparisons
completed:40profiles/member,240rows,1,920stdout/JSON-matched samples. The budget is permanently closed.

**Non-wins:** Null:12:0: 0.18% slower; MissingNull:128:0: 1.00% slower; ControlRemoveKey:12:1: 2.27% slower; MissingNull:128:1: 0.05% slower; ControlRemoveKey:128:1: 0.18% slower; MissingNull:12:8: 4.04% slower; ControlRemoveKey:12:8: 0.47% slower; MissingNull:128:8: 0.18% slower; ControlRemoveKey:128:8: 0.10% slower; MissingNull:12:64: 4.18% slower; ControlRemoveKey:12:64: 1.78% slower; MissingNull:128:64: 0.09% slower. Worst individual observations: MissingNull:12:64 comparison 3: 5.67% more time; MissingNull:12:8 comparison 3: 5.63% more time; ControlRemoveKey:12:8 comparison 3: 5.60% more time.
No miss/control median regression reaches 5%; individual adverse observations are still retained. Maximum CV36.57%; shared VM, not isolated.

73original+73candidate managed rows pass, including all eight new lazy-load/Save preservation rows;
17semantic/40lifecycle records match across original/candidate/independent rebuilt project.
Both canonical mapped cookie browser versions pass8real navigations/0errors. Ten existing
nonquarantined TempDataCookieTest facts pass after a dependency-aware Debug build. The pre-quarantined
TempDataPersistWithoutAccessing (dotnet/aspnetcore#70085) is excluded, not counted.

The broad initial managed build failed only in unchanged Framework.App.Runtime packaging
(MSB4057/NETSDK1094); focused builds passed. Earlier untimed CS8632 test compilation and its
style correction are retained. No full repository/packaging pass is claimed.

[Immutable evidence, runnable project, exact commands and limitations](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F040/README.md).
Source branch `autoperf/F040-tempdata-remove-lookup` at `619ced41b0946739f6c5d851f335608a425b6d13`.
Not isolated Remove, application/cookie/DI/rendering/Mono/AOT performance or merge-ready.
