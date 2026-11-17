# F022: weak successful MVC indexer metadata cache

**Qualified allocation-focused draft, not merge-ready.** One independently
measured implementation;all three allowed comparisons consumed and closed.
The benchmark project is in `harness`. The isolated product/test proposal is
`c6679258a6fa3c8c72496db5d4806881890f564b` on `autoperf/F022-indexer-metadata-cache`.

## What is actually changed

`ExpressionHelper.IsSingleArgumentIndexer` repeatedly reads the inherited
`DefaultMemberAttribute` and runtime properties while actual
`ModelExpressionProvider.GetExpressionText` and `CreateModelExpression` process
indexed expressions. Index-dependent expression strings must not be cached.

Cache only a successful getter classification in a
`ConditionalWeakTable<MethodInfo,MethodInfo>`. The ephemeron value is the key
itself,so collectible metadata is not rooted. Both lookup and publication are
disabled when `MetadataUpdater.IsSupported`. Custom reflection types retain
on-demand discovery;only a genuine runtime declaring Type is published.
No negative classification,index value or expression string is cached.

The source proposal is insertion-only:15 product lines and141 test lines,
including four facts/private lifetime helpers and six imports. Existing
statements,branches,API surface,TFMs,dependencies,friend grants and the test
file's original BOM remain unchanged. No cross-assembly private access or new
metadata-update handler is added. The existing owner is `IsPackable=false`;
there is no applicable owner package-validation invocation to claim.

## Actual measured result

The two primary public indexed-name profiles save561-569 B/op in these three
comparisons,approximately9-10%. Their median paired time improvements are6.42%
and8.37%,but untouched controls also move. **Allocation reduction is the
stronger result;not a causal application-level speedup claim.**

The helper-only99% improvement and568 B/op removal are explanatory,not public
application performance. Real public expression work still evaluates indices
and can compile delegates. No HTTP,view rendering,production input frequency,
request throughput or end-to-end application gain is established.

# F022 measured comparison

Three actual comparisons;84 native warm rows and18 first-observed observations. Positive percentage means less time.
The two primary indexed-name profiles are unchanged. Shared VM noise and controls limit timing attribution;allocation savings are the stronger result.

| Actual public/helper profile | Before ns/op, comparisons1/2/3 | After ns/op, comparisons1/2/3 | Paired improvement %,1/2/3 | Median before/after B/op |
|---|---:|---:|---:|---:|
| Name.List.Constant | 35272.80 / 32052.32 / 32195.27 | 31693.62 / 29620.00 / 29523.12 | 10.15 / 7.59 / 8.30 | 5082 / 4514 |
| Name.List.Captured (primary) | 94728.15 / 91923.88 / 93043.17 | 89507.73 / 83116.48 / 87066.22 | 5.51 / 9.58 / 6.42 | 5654 / 5093 |
| Name.Dictionary.Captured | 72747.14 / 68051.84 / 68184.59 | 64903.87 / 62740.12 / 62469.54 | 10.78 / 7.81 / 8.38 | 5700 / 5059 |
| Name.Nested.TwoIndexers | 149347.02 / 142403.20 / 143957.28 | 137094.45 / 129808.72 / 134487.04 | 8.20 / 8.84 / 6.58 | 10656 / 9519 |
| Name.List.NewExpression (primary) | 102679.05 / 95759.32 / 103308.15 | 94086.43 / 90058.42 / 91649.99 | 8.37 / 5.95 / 11.28 | 6566 / 5997 |
| Name.Member.Control | 35.78 / 36.91 / 34.00 | 33.80 / 34.02 / 32.87 | 5.52 / 7.82 / 3.33 | 0 / 0 |
| Name.Array.Control | 84070.59 / 80493.31 / 81472.39 | 84833.18 / 81149.66 / 82622.37 | -0.91 / -0.82 / -1.41 | 5084 / 5084 |
| Name.Method.Control | 611.60 / 621.12 / 585.81 | 605.60 / 594.49 / 573.81 | 0.98 / 4.29 / 2.05 | 232 / 232 |
| Model.Indexer.RuntimeType | 348266.34 / 327959.36 / 339916.37 | 309000.61 / 315789.67 / 303639.90 | 11.27 / 3.71 / 10.67 | 11380 / 10243 |
| Model.Indexer.Value | 340870.69 / 342697.03 / 335925.46 | 321768.47 / 329795.74 / 313167.11 | 5.60 / 3.76 / 6.77 | 11381 / 10240 |
| Model.Member.Control | 192.27 / 193.10 / 184.96 | 193.87 / 188.97 / 179.31 | -0.83 / 2.14 / 3.05 | 176 / 176 |
| Model.Array.Control | 262672.61 / 264682.88 / 248975.68 | 263065.81 / 248432.54 / 264786.14 | -0.15 / 6.14 / -6.35 | 10072 / 10071 |
| Classifier.Indexer.Helper | 1624.53 / 1526.33 / 1524.04 | 11.00 / 11.00 / 10.98 | 99.32 / 99.28 / 99.28 | 568 / 0 |
| Classifier.Method.Control | 471.14 / 470.20 / 463.32 | 478.33 / 479.08 / 466.16 | -1.53 / -1.89 / -0.61 | 120 / 120 |

The original raw `Model.Indexer.Metadata` row is the runtime-type operation,not metadata-only. Reading `ModelExplorer.ModelType` evaluates its lazy model accessor for this reference model. Comparisons2/3 correct the label/flags without changing the timed operations.

## First observed calls:fixture,JIT and metadata included

| Public profile | Original ms,1/2/3 | Selected ms,1/2/3 | Original bytes,1/2/3 | Selected bytes,1/2/3 |
|---|---:|---:|---:|---:|
| Name.List.Constant | 40.59 / 38.68 / 38.49 | 40.08 / 39.21 / 38.43 | 103888 / 103888 / 97744 | 104216 / 104216 / 91880 |
| Name.Member.Control | 30.35 / 28.88 / 28.15 | 29.57 / 29.49 / 29.08 | 75824 / 75824 / 75824 | 75824 / 75824 / 75824 |
| Model.Indexer.Value | 47.76 / 45.59 / 45.32 | 47.48 / 47.92 / 45.10 | 141992 / 139760 / 133616 | 139488 / 139560 / 139488 |

These are single observations,not a cold-start performance conclusion. Keep unfavorable/control observations.

All14 rows per variant are retained:84 native warm reports plus18 separate
first-observed calls across24 native profiles. Warm order is
original/selected,selected/original,original/selected. The native job uses
three warmups,eight configured iterations and the native retained N after
outlier treatment,100ms iteration time,unroll1 and MemoryDiagnoser.

**Adverse/control observations:** ordinary-method classifier time is higher
in every pair with unchanged120 B/op;array-name time is higher in every pair
with unchanged5084 B/op. Full array-model timing swings from6.14% lower to
6.35% higher. First-observed indexed-name allocation is328 bytes higher in
comparisons1/2,and indexed-value time is5.12% higher in comparison2. In
comparison3 the indexed-value first observation allocates5872 more bytes.
Do not delete these costs or use the cold observations to infer cache-entry
cost,startup gains or repeatable latency differences.

## Validation and precise limits

Before the selected product change,the83-case owner characterization passes82
and fails only the new repeated-classification resource assertion:
19,200 bytes instead of0 across32 warmed calls. The79 original outcomes,
including duplicate displayed Theory-name multiplicities,remain passed.
Selected helper tests pass83/83;the expanded actual helper/metadata-producer
scope passes96/96,with0 skipped. The other new cases preserve current captured
indices,custom reflection changes,and collectible type/method lifetime.
A deliberate compiling strong-key prototype fails only the lifetime case.

Actual `dotnet watch` observations cover original,selected and diagnostic
cache-active-under-updates owners. A supported indexer getter-body delta is
actually applied with one startup marker and the same app PID;the retained
getter sees `before` become `after`. Selected execution has metadata updates
enabled and continues live metadata discovery. The unsafe diagnostic fails
the specific `LIVE_METADATA_PATH_REQUIRED` policy assertion. **This is
bypass-policy sensitivity,not an observed stale classification.** The
attempted C# IndexerName and VB DefaultMember declaration edits are unsupported
by this toolchain,so classification-changing invalidation is not claimed.
All owned watchers were explicitly stopped and their app PIDs checked absent.

The initial `ExpressionHelperTest` run could not reach assertions because
the IIS dependency required a missing ANCM native asset. Successful
`UseIisNativeAssets=false` validation exercises the actual managed owner and
real expression producers,not native IIS integration.

The actual product formatter passes. The root test file still reports its
pre-existing `CHARSET` diagnostic:the unchanged original Git source reproduces
the same BOM-related result. A separate encoding-only selected mirror passes
with0 changes. The root BOM is preserved;this is **not** a fully green
root-file formatter claim.

The SDK is12.0.100-alpha.1.26557.102;runtime
12.0.0-alpha.1.26562.105,C#13,net12,x64,server GC,BDN0.13.0. This shared Windows
Hyper-V VM is not isolated. A direct emitted executor never requests
priority,affinity or power changes. Every actual warm before/setup/after
observation remains Normal/Normal/65535.

The179-file closure varies only the actual MVC DLL and matching PDB within
each pair. A live post-check rehashed716 closure bindings over186 distinct
native paths across both harness versions. Native PE/PDB content identities
and selected source documents match;this is not complete compiler provenance,
whole-method coverage or test-PDB source binding. The read-only portable audit
recomputes all84 retained raw measurement means and paired summaries,checks
source/native witness consistency and exact saved output,but does not reopen
omitted binary images or independently derive Student-t quantiles.

## Source freshness and reproducibility

Measured as baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`
plus the retained exact source patch,then committed as `c6679258a6fa3c8c72496db5d4806881890f564b`.
Initial default `49147673007a4b1d676694e2c5f85b83ad76c36f` was captured before
implementation. Publication stopped when default advanced to
`fa10021db581bdb7dc44e84953842ac9ccb34009`;a new38-snapshot check established
identical Git blobs for14 owner/caller/test/lifecycle/project files and no
intervening history for those paths. `global.json` and `eng/Versions.props`
differ;no SDK switch or full newer-default integration test is claimed.
The first failed publication preflight is retained;no source was staged
or committed until that recheck passed.

Exact historical command arrays,raw stdout/stderr,TRX,source snapshots,
all failed preparations,watch evidence,initial mislabeled native profiles,
corrected profiles and budget snapshots are retained. Historical publication
and comparison drivers are evidence,not instructions to replay the campaign.
Compiled files,binlogs,package/build/restore images are omitted with exact
hashes;`omitted-file-manifest.json` names every omission.

From a standalone copy of this directory,the following read-only check was
actually run and passed:

```powershell
node .\F022-audit-measurements.mjs . --verify
```

`validation-commands.md` lists exact recorded native commands and their actual
exit codes. A relocated standalone project was actually built and its actual
selected owner passed14 wrappers/42 changing-index contracts without a fourth
comparison. That characterization is not an original relocation check or a
new performance observation.

For **new independent work**,first build the desired real source checkout's
Release MVC project graph using the repository build guidance. The standalone
project uses those actual project references,not a shipped framework owner:

```powershell
.\F022-run-fresh.ps1 -AspNetCoreRoot C:\src\aspnetcore -OutputRoot C:\temp\F022-new -Mode Characterize
```

`Prepare` builds/freezes without native execution;`Characterize` checks all
14 wrappers/42 contracts without comparative timing. `Measure` is available
only as new independent work in a new directory,not as a replay,extension or
replacement of this permanently closed historical three-comparison budget.
Other runtimes/OSes,NativeAOT,native IIS,classification-changing live edits
and deployment-wide benefits remain unverified.
