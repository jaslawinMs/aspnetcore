## Measured proposal, not an upstream bug report

Deduplicated AutoPerf finding F131 concerns complete `OwinEnvironment` stable
feature-map reads. This fork-only proposal retains the original immutable map
for ordering/copying and adds a private ordinal dictionary lookup index behind
`IReadOnlyDictionary`. Only three stable-map probes change; per-context/deleted
keys, mutable FeatureMaps customization and native response-body ownership stay
unchanged.

Independent source baseline:
`37e809ead5824bc753a1c3d56f11615bdb1296c5`.
History: dotnet/aspnetcore#58917 already removed per-request map rebuilding;
this proposal does not undo that optimization or change enumeration order.
[Exact proposed source](https://github.com/jaslawinMs/aspnetcore/commit/fb2946a78adb33150ae345b5154d5557cb11275c).

[Full public evidence and reproducible projects](https://github.com/jaslawinMs/aspnetcore/blob/622224aad173834095fb664026a97d09f52399a8/F131/README.md)
retain all three comparisons/all 174 individual case reports, including the
initial frozen-index non-wins and the one source-only dictionary tune.
Final summaries use pairs 2-3 only.

Ordinary method get/try/set-read medians are 5.38-5.61% lower; several other
complete reads are 7.10-18.87% lower. Allocations are unchanged in all 29 cases.
Five actual default UseOwin pipeline medians are 1.82-3.06% lower, but two
second-pair results reverse sign and two are near zero: no stable broad or
production/network throughput gain is claimed.

Six unchanged-path control medians are higher (0.07-4.07%). AddRemove's apparent
large gain is not supporting evidence: original pair-3 mean/SD is
184.16/126.72 ns versus pair-2 71.18/0.43 ns. Its complete data is retained without
causal or harmless-noise explanation. One additional application-lifetime
25-entry index remains; cold construction/retained size are unmeasured.

Original/frozen/final Owin suites all pass 31/31, zero skipped, including all 12
new individual compatibility rows. All 29 actual producer/default-pipeline
setup receipts agree. Untimed exact-final-owner storage/order/reference/body
checks pass. No public signature/default/convention or dependency changes.
No upstream submission, API approval or team design agreement is implied.
