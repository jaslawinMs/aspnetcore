# F020: duplicate of F086 JSON Patch list metadata

**Disposition: duplicate of F086, not a second optimization or new speedup.**
Both findings identify `ListAdapter.TryGetListTypeArgument` repeatedly
discovering a closed `IList<T>` through `ClosedGenericMatcher` and obtaining
its element type. F086 already owns the actual public-operation benchmark,
weak-key proposal, lifetime validation and retained unfavorable results.

| Identity | F020 | Canonical F086 |
|---|---|---|
| Card | `uncached-reflection-in-hot-path` | Same |
| Source | `src/Features/JsonPatch.SystemTextJson/src/Internal/ListAdapter.cs` | Same |
| Original scan range | 198-216 | 206 |
| Method | `TryGetListTypeArgument` | Same |
| Named lookup | `ClosedGenericMatcher.ExtractGenericInterface(listType, typeof(IList<>))` | Same |

Fresh actual default `49147673007a4b1d676694e2c5f85b83ad76c36f` and independent
baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5` have identical owning Git
blob `cc1e672069cb37edfd3b55b0d15b17164c2af0a1`. The frozen F086 original matches
that content after checkout line-ending normalization only. Different scan
range, severity or explanation does not create an independently fixable
mechanism. The same six ListAdapter operations reach the helper.

The independent branch `autoperf/F020-jsonpatch-list-type-duplicate` stays at
the unchanged baseline. No second source change, test suite, benchmark
project, timing, source tune or redundant draft is manufactured.
**F020 has zero new comparisons. F086's one-of-three early-stop budget stays
closed; its unused two slots are not reopened.**

## Canonical runnable proposal and evidence

The actual open fork draft
[jaslawinMs/aspnetcore#91](https://github.com/jaslawinMs/aspnetcore/pull/91) was
re-read at source `4c2d4c04460429a9e49e5c78c2091d82ae53e324`.
The owning source independently matches both native Git and the actual
pinned API Git blob. Its successful element-type cache is
`ConditionalWeakTable<Type, Type>`, with the array guard first and the
original miss/matcher/error paths retained. Non-generic failures remain
uncached. Do not substitute the previously rejected strong-key prototype:
its real collectible-list-type lifetime test failed.

All **171** canonical immutable files at
`31f6b082e934a17b7c1136628245c75ae55100e8` were checked against actual remote
tree blobs, native local Git and raw working bytes. The existing read-only
raw-result/XML/state/source audit was actually replayed successfully; those
files were hashed again afterward and remained unchanged. This launches no
new benchmark, .NET test or build.

- [Complete canonical evaluation](https://github.com/jaslawinMs/aspnetcore/blob/31f6b082e934a17b7c1136628245c75ae55100e8/F086/README.md)
- [Runnable BenchmarkDotNet project](https://github.com/jaslawinMs/aspnetcore/blob/31f6b082e934a17b7c1136628245c75ae55100e8/F086/harness/AutoPerf.Benchmarks.csproj)
- [All canonical source, tests, raw results and reproduction tools](https://github.com/jaslawinMs/aspnetcore/tree/31f6b082e934a17b7c1136628245c75ae55100e8/F086)
- [Fresh source and canonical identity receipt](provenance.json)
- [Actual 171-file verification](canonical-evidence-verification.json)
- [Closed canonical measurement decision](canonical-closed-budget.json)

## Inherited results and limits, not new F020 measurements

F086's sole historical pair contains 28 paired cases and 448 actual result
samples. Fifteen warm profiles improve 50.76-60.18%; this was its authorized
early-stop criterion, not new corroboration from F020. The canonical
evaluation remains **not merge-ready**.

Preserve the adverse non-generic/Poco/array timings (+8.75%/+6.70%/+2.11%),
both genuine first-use type profiles' **+81 B per patch**, uncertain cold
timings, excluded process-first construction, unmeasured native/cache
footprint and production distributions, and single-pair uncertainty.
The three unchanged pre-existing full-file formatter diagnostics were not
silently fixed; zero added-line violations is not full-file formatter success.
The original and weak-key tests passed; the strong prototype had one expected
list-type lifetime failure, and its following element-type assertion was not
reached.

**Historical execution-policy qualification:** F086 predates the
settings-preserving executor. The stock BDN executor attempts to raise
process/thread priorities, but success and actual historical priority state
were not captured. Replaying its result files cannot turn them into verified
normal-priority measurements. The campaign's
[historical clarification](../F113/README.md#shared-machine-execution-policy-and-historical-clarification)
applies to every reused observation. No old capsule or timing was rewritten.

No whole-application, universal, production-throughput, trimmed/NativeAOT,
network/browser or other-runtime result is added here. The duplicate signal
adds no independent measurement, statistical confidence or API approval.

## Offline alias/source replay

```powershell
node .\reproduce-alias.mjs . --verify
```

Passed, exit 0. This verifies the five copied source identities, exact alias
range/mechanism, actual captured fork/API/native-tree identities, closed
budgets and captured read-only canonical replay. It does not independently
rehash the uncopied 171-file capsule or repeat its raw audit. To replay that
audit, obtain the canonical linked capsule and follow its reproduction
command. [Alias audit](alias-audit.json), [acceptance](acceptance.json).

No new PR exists to open: the existing canonical draft was opened when
F086 was originally completed.
