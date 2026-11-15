# F087 acceptance before implementation

Baseline is current default main37e809ead5824bc753a1c3d56f11615bdb1296c5.
Owner introduction c7a1c5c982ab0468714b7d9c67175c02f3c1a0cc,
dotnet/aspnetcore#69834; its actual descriptions/review corrections and
current strategy/visitor/default metadata/complex enumerator were read.
Bounded active name/IUnion-MVC searches are retained,not exhaustive absence.

## Correct the scan premise

IsUnionValueProperty returns before interface mapping for metadata that is
not a property named Value. It does not reflect for every child property.
Mapping nevertheless recurs for eligible values across validation calls,
from both GetChildren and ValidationVisitor.GetUnionCaseMetadata. Preserve
that guard,exact getter/base-definition identity and explicit/synthetic
Value handling. Do not advertise a per-arbitrary-property reflection cost.

## Candidate shape and preservation

Evaluate a private weak-key cache of the existing interface target getter
by exact runtime union Type,not a new public contract or serialized shape.
Keep GetInterfaceMap inside the existing member so its IL2075 suppression,
property reflection,locals andreturn branch are not gratuitously rewritten.
Array/default MVC metadata andother source behavior remain unchanged.

Successful original andproposed real MVC validation suites must preserve:

| Requirement | Evidence boundary |
|---|---|
| Implicit/explicit/namesake Value andproperty/type validators | Existing UnionValidationIntegrationTest exact ModelState keys/messages; additional repeated/mixed real IObjectModelValidator calls |
| Filter/getter count,ValidateNever andclass/child suppression | Existing original/current integration rows,including two filter-before-getter rows |
| Decorated metadata,top-level property andvalidation-state overrides | Every existing union integration row,not custom-cache callback injection |
| Nested collections,cycles,depth andmodel-state limits | Existing integration andhosted union regression cases |
| Concurrent exact runtime-type getter selection | Real singleton validator withdistinct ActionContexts andconcrete union models; no seeded private metadata/cache |
| New cache doesnot independently root a collectible runtime Type | Actual emitted RunAndCollect IUnion.GetInterfaceMap producer through IsUnionValueProperty andweak-reference GC at the owning-method boundary |
| Runtime metadata updates discard cached MethodInfos | Same-assembly metadata-update handler plus actual dotnet-watch delta without restart; observe real public validation andthe produced cache replacement |

The lifetime proof is deliberately not full-MVC unloadability: existing
Shared PropertyHelper static dictionaries retain metadata Types. Do not
clear unrelated caches,fix that separate behavior or claim full-MVC
collectibility. An unmeasured strong-cache prototype may establish the
specific newly introduced root; it consumes no timing comparison.

## Hot Reload and assembly boundaries

Cache stores member/interface implementation metadata. Unlike F086's
structural generic argument,provide metadata-update invalidation. MVC's
existing central handler is in Microsoft.AspNetCore.Mvc,the cache owner in
Microsoft.AspNetCore.Mvc.Core. Do not add cross-assembly nonpublic access,
IVT orUnsafeAccessor. Use the same-assembly runtime primitive already used
by Shared PropertyHelper,witha weak-table replacement andcaptured table
for miss insertion so an old in-flight miss cannot repopulate a new table.
No live-delta claim without actual no-restart watch evidence.

## Measurement and persistent publication

Benchmark real DI-created IObjectModelValidator/ObjectModelValidator/
ValidationVisitor/strategy/default metadata andactual ModelState effects,
not GetInterfaceMap alone. Cover small ordinary unions,scaled/typed nested
orcollection validation,explicit/namesake anderror/filter/no-union controls.
Original ModelState rejects error keys past its internal depth32. Retain
that failed Deep64 prerequisite; use explicitly named Depth64Valid with
configured MaxValidationDepth256 andreal case-validator invocation,not
an internal state-depth override orclaimed deep invalid-case coverage.
Retain startup/first-use/key-growth costs andproduction-type-distribution
limits. Distinct emitted keys are first-use evenif pre-existing MVC metadata
caches retain those Types; document that distinction.

Freeze identical harness/runtime/dependency closures andexact before/after
owners; verify actual source/PDB/tested/executing hashes andallcase outputs.
Use repository activation,Release,two MSBuild workers andserialized
CPU-heavy work. No power/affinity or unrelated-process changes.

At most three measured comparisons total. A clear >=50% target win may
stop after one; otherwise tune/repeat up to three andpublish honest no-gain,
qualified costs orrejection. No source proposal without passing applicable
preservation,real benchmark evidence andexplicit unverified boundaries.
Separate branch,evidence source/project/commands/raw XML/results/auditor,
fork-only draft/issue,immediate browser request andremotely verified
immutable payload/four-file receipt/index. Existing source lines unchanged
except the needed seam; no manifests,public APIs orvisibility changes.
