# F086 acceptance: JSON Patch list element metadata

Fresh default main: 37e809ead5824bc753a1c3d56f11615bdb1296c5.
Independent branch: autoperf/F086-jsonpatch-list-element-type-cache.
Shipping ListAdapter is original; no measured comparison exists when these
criteria are defined.

## Actual behavior and minimum faithful reproduction

Read actual ListAdapter, Shared ClosedGenericMatcher, AdapterFactory,
ObjectVisitor, GenericListOrJsonArrayUtilities and JsonPatchDocument.ApplyTo.
All six list methods call the real metadata extractor. AdapterFactory creates
new ListAdapter objects for IList/JsonArray targets and ObjectVisitor visits
each interior segment; a per-instance cache would not amortize this producer.

Preserve real conversion/result types, mutation order, Get/Traverse, Test,
array/non-generic-list rejection and exact existing errors. Verify current
owning ListAdapter/ObjectVisitor/AdapterFactory tests before shipping edits.
New focused tests must use actual list/runtime-interface producers, including
List<int>, List<string>, non-generic derived concrete lists, multiple closed
IList<T> implementations, JsonArray, repeated adapter instances and parallel
operations. ClosedGenericMatcher's ordinal FullName winner must be retained.

The collectible-type check must create actual RunAndCollect assembly/types
and reach real ListAdapter metadata discovery, then release both runtime list
and collectible element types. Do not populate or clear the private cache
directly. A naive process-wide strong dictionary must fail that check before
selecting weak type keys.

## Proposed bounded positive metadata cache

Cache only successfully resolved element Type by exact runtime list Type,
using ConditionalWeakTable<Type,Type>. Keep arrays before lookup and keep
unsupported/non-generic negative cases uncached with original messages.
Preserve the original matcher/local/error branch for misses. Thread-safe
TryGetValue/AddOrUpdate may duplicate immutable discovery on a concurrent
miss; do not promise exactly-once initialization. No new public/protected API,
IVT,UnsafeAccessor,dependency/config/default or shared-helper changes.

CWT must not introduce a process-lifetime root for collectible list types,
including when the stored element Type shares their collectible assembly.
Validate lifecycle through actual runtime-produced metadata and real list
operations; not a raw CWT language/library test.

## Hot Reload and trimming boundary

Only the selected closed IList<T> element Type identity is retained, not
member/property/attribute metadata or compiled accessors. Supported method/
property/field edits leave that structural identity unchanged; changing a
base type/implemented interface/generic construction is a rude edit according
to the repository Hot Reload edit-limit guide. New runtime types have new
weak keys. Do not add an unrelated invalidation handler for this immutable
datum or claim a live-delta/no-restart validation that was not performed.

Keep the original Shared ClosedGenericMatcher interface-reflection path and
annotations; no new reflected members/types or AOT guarantee. Compile/check
the existing package and state any unverified trimmed/live-edit boundary.

Official CWT docs confirm reference-identity keys,dependent value lifetime
and AddOrUpdate availability. No local existing CWT pattern was found in the
bounded JsonPatch.SystemTextJson subtree. GitHub semantic search returned404
and C# symbol/definition resolution had no match; known exact scan/source
paths and bounded project discovery were used instead.

## Measurement and publication

Freeze actual tested source/PDB/executing owners and identical complete
benchmark/runtime/dependency sets. Benchmark real public JsonPatchDocument
ApplyTo/default AdapterFactory/ObjectVisitor/list operations and persisted
list/JsonArray state, not reflection alone. Include ordinary/repeated/deep/
mixed-type/JsonArray targets, non-list/unsupported/error controls and genuine
first-use/cold type costs produced by actual new runtime types when feasible.
Keep assertions outside timing,uniform setup/reset and all control costs.

At most3 measured comparisons on the shared Windows machine; serialized
CPU-heavy work,two MSBuild workers,no power/affinity/unrelated-process changes.
No production path-depth/type-distribution, universal improvement or other
platform/runtime claim. Publish all strategies/raw results/commands and
honest draft/no-gain/rejection outcome with exact source/test scope.

## History and active-work boundary

Owner history has two commits: initial SystemTextJson implementation
dotnet/aspnetcore#61313 and JsonArray traversal correction
dotnet/aspnetcore#65470. Keep that real JsonArray producer/consumer behavior.
The bounded owner search found open dotnet/aspnetcore#70323. Its actual
17-file patch changes null/empty-value testing in other modern adapters and
the separate Newtonsoft ListAdapter; it does not change this modern
ListAdapter's discovery/cache seam. This is bounded source evidence,not an
exhaustive duplicate-absence or full-proposal-equivalence claim.
