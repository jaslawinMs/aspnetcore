# F241 pre-implementation acceptance

Baseline: freshly fetched default `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Scope: `ViewComponentFeatureProvider.PopulateFeature` duplicate membership
during metadata discovery. This is startup/later explicit discovery, **not a
request-throughput finding**. No shipping code changed before these criteria.

## Original evidence and prior art

The default provider filters each part's real TypeInfo with
ViewComponentConventions.IsComponent, then probes the ordered exposed List.
The Feature XML documentation explicitly permits startup or later discovery.
Existing class tests use the actual ApplicationPartManager/custom part producer.
Latest provider change is null-argument ThrowIfNull modernization,
`c096dbbbe652f03be926502d790eb499682eea13` (dotnet/aspnetcore#45954).
The neighboring controller provider retains ordered list scans.
ApplicationPartManager's default-assembly closure already uses a local HashSet
beside ordered output rather than reordering input with Distinct.

## Intended bounded implementation

Keep the existing ordered public list, preexisting duplicates, convention
predicate, argument validation and original input enumeration. Lazily build a
per-call default-TypeInfo-equality HashSet only after a genuine component and
at least32 existing entries, then append first unseen components to the same
list and update the local index. No static/reflection-result cache or Hot Reload
refresh mechanism is introduced.

An arbitrary part/assembly/parts enumerator can modify the exposed feature list
while producing types. A snapshot index is not equivalent in those paths.
Only the exact manager-style List<ApplicationPart> containing ordinary exact
AssemblyPart/runtime-Assembly type providers may use the index; non-type parts
still skip normally. Custom/derived parts, custom Assembly implementations,
arbitrary or reimplemented parts enumeration retain current live list behavior.
Do not pretend a readonly index is safe merely because yielded TypeInfo is real.

## Compatibility coverage before and after

All original class tests and every new individual row must pass on original and
final source; full owning MVC.ViewFeatures suite must pass before publication.
New focused coverage must concretely establish:

1. Real runtime Assembly.DefinedTypes/AssemblyPart/manager producer reaches
   duplicate discovery. Before/at/after32 prepopulation preserves every existing
   duplicate and exact first-new type order across repeated assembly parts.
2. Custom TypeProvider enumeration can add/remove/replace feature entries before
   yielding: actual live list membership/order is preserved in every scenario.
3. A derived AssemblyPart reimplementing Types is not assumed immutable.
4. An ordinary AssemblyPart around a custom mocked Assembly.DefinedTypes producer
   retains the same live mutation behavior.
5. Arbitrary parts enumeration remains single-pass; its producer side effects
   are observed before the corresponding component.
6. Null parts/feature errors preserve ArgumentNullException parameter identity.

Use actual persisted/loaded CLR assemblies for runtime producer coverage.
Reflection.Emit/assembly construction and assertions are outside measurements.
Mock only the custom Assembly producer, using existing Moq.
No unsafe access, IVT, public/protected signature/default/convention changes,
dependency-manifest changes or unrelated cleanup.

## Measurement and stop policy

Standalone BenchmarkDotNet0.13.0/net12 harness over actual
ApplicationPartManager/AssemblyPart/ViewComponentFeatureProvider discovery.
Generate real persisted/loaded public valid view-component metadata outside
timing; consume/check complete ordered discovery results. Include empty, small,
threshold, large, repeated-part, prepopulated and custom/derived producer paths.
Every launch must discover nonzero expected cases and retain eight positive
actual measurements. Same exact original harness/PDB/runtime/configuration;
recursively only MVC.ViewFeatures owning DLL may differ.

At most three measured comparisons; alternate A/B/B/A/A/B, keep every result.
Large clear gains may stop after one pair; otherwise up to two source-only tunes/
additional pairs. Report time and allocation trade-offs and all controls.
No cold-runtime/static metadata, full application startup/HTTP, production,
concurrency or universal gain claim. If gains do not justify cost or contracts
cannot be preserved, publish honest no-gain/rejected rather than a speculative PR.
