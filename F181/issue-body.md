F181 is an informational build-time AutoPerf finding: the actual DFA producer
enumerates `parent.Literals.Keys`, performs complex-segment and policy matching,
then re-probes `parent.Literals[literal]` for accepted nodes.

Propose enumerating the existing dictionary's pairs and using the selected
value while retaining the explanatory literal local, comparer, sibling and
policy order, all branches and per-sibling `routeValues.Clear()`.
No public API, default, convention, new cache or assembly-boundary change.

[Measured independent implementation](https://github.com/jaslawinMs/aspnetcore/commit/609489170dffb859f50172977fcf20bb49cf6c51)
is based on upstream main `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
[Complete immutable evidence](https://github.com/jaslawinMs/aspnetcore/blob/e0e99058491d052315eff465f1c35ffaa09a31ee/F181/README.md)
contains the reproducible source-built BenchmarkDotNet project, all three
comparisons/144 outcomes, complete graph/actual selection receipts and all tests.

This is a narrowly qualified proposal. Only three of fifteen successful
membership cases improve every pair: optional fragments (-3.09% paired median),
long prefixes (-3.67%) and Unicode (-9.26%). Five of six untouched controls have
higher medians; other targets are mixed and an apparent grouped -27.55% median
is unstable and not a supported headline. All non-wins, small allocation
differences and raw variance are retained. No universal speedup, full startup,
live refresh or request-throughput gain is claimed.

Original and changed complete Routing suites both pass 3,511/3,511 with zero
skips and every one of six added compatibility rows. Actual complete matcher
construction is timed; real tree/state/endpoint/value assertions are untimed.
The 77-file recursive DLL/JSON closure differs only in Routing.dll, with the
same original harness/configuration throughout.

Fork-only draft parking issue; no upstream submission or request for review.

Implementation: [draft jaslawinMs/aspnetcore#35](https://github.com/jaslawinMs/aspnetcore/pull/35).
