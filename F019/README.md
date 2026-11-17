# F019: Repeated parent-layout attribute reflection

**Duplicate of active work in [dotnet/aspnetcore#68299](https://github.com/dotnet/aspnetcore/pull/68299).**
At the captured immutable head
`103b0800790e744fc017872386221e40f3e38534`, that proposal replaces this exact
`LayoutView.GetParentLayoutType` reflection lookup with cached component
metadata. The proposal is **open, not merged**. This finding is not being
reported as a shipped fix or a measured performance improvement.

No separate shipping change, benchmark project, .NET test, sample change or
redundant draft was manufactured. **Zero measured comparisons; budget closed.**
The independent tracking branch `autoperf/F019-layoutview-parent-cache` remains
at the unchanged campaign baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`.

## Exact original seam

The actual current default was captured at
`49147673007a4b1d676694e2c5f85b83ad76c36f`. Its entire `LayoutView.cs` Git blob
equals the independent baseline's blob. `SetParametersAsync` calls `Render`;
the render loop follows each layout's parent using:

```csharp
private static Type? GetParentLayoutType(Type type)
    => type.GetCustomAttribute<LayoutAttribute>()?.LayoutType;
```

This is a repeated lookup when **LayoutView itself receives parameters and
renders**, not evidence that every descendant update or HTTP request repeats
the lookup. Actual application frequency and layout-depth distribution were
not established. The scan's assertion that layout metadata is immutable also
needs qualification: custom attributes can change under Hot Reload.

See the actual [retained finding](inventory.json),
[current-default owner](sources/current-default/src/Components/Components/src/LayoutView.cs),
[baseline owner](sources/baseline/src/Components/Components/src/LayoutView.cs),
and [source/history investigation](investigation.json). The renderer differs
elsewhere between the two revisions, but the captured
`RenderRootComponentsOnHotReload` method is unchanged. This is not a claim
that a complete current-default SDK integration was built or executed.

## Existing proposal: owning path, not an isolated cache helper

The pinned upstream [LayoutView](investigation/upstream-68299/src/Components/Components/src/LayoutView.cs)
replaces the same method with:

```csharp
private Type? GetParentLayoutType(Type type)
    => _renderHandle.ComponentTypeInfoResolver!
        .GetRequiredTypeInfo(type)
        .Metadata
        .OfType<LayoutAttribute>()
        .FirstOrDefault()
        ?.LayoutType;
```

The individually captured source establishes the default owning path:

1. [RenderHandle](investigation/upstream-68299/src/Components/Components/src/RenderHandle.cs)
   exposes its renderer's resolver.
2. [Renderer](investigation/upstream-68299/src/Components/Components/src/RenderTree/Renderer.cs)
   uses a registered resolver, or constructs the default through
   [ComponentTypeInfoResolverFactory](investigation/upstream-68299/src/Components/Components/src/ComponentTypeInfoResolverFactory.cs).
3. [GetRequiredTypeInfo](investigation/upstream-68299/src/Components/Components/src/IComponentTypeInfoResolver.cs)
   forwards the type lookup; the default
   [composite resolver](investigation/upstream-68299/src/Components/Components/src/CompositeComponentTypeInfoResolver.cs)
   caches resolved `ComponentTypeInfo` by `Type`.
4. Its [reflection fallback](investigation/upstream-68299/src/Components/Components/src/ReflectionComponentTypeInfoResolver.cs)
   also caches type info. Reflected attributes, including inherited
   attributes, are materialized during type-info construction.
   [ComponentTypeInfo](investigation/upstream-68299/src/Components/Components/src/ComponentTypeInfo.cs)
   retains that materialized metadata in a read-only collection.

Consequently the exact named opportunity--repeated custom-attribute reflection
in the parent-layout loop--already has an active proposed replacement,
including on the normal reflection fallback. This does **not** establish that
the broader resolver design is behaviorally equivalent to a small per-Type
layout cache, allocation-free, faster, appropriate or approved.

The source contains Hot Reload invalidation hooks. Their presence is **not**
live-update validation: no metadata delta, cache invalidation ordering,
retained-component refresh or no-restart browser behavior was tested here.
Those are implementation gates, not results of this source-only disposition.

## Evidence and executable source audit

The actual PR metadata reports **183 changed files**. The first GraphQL file
list returned only 100; it is not represented as a complete diff. Only the
eight explicitly pinned source files above were assessed for this overlap.
All eight decoded sources independently reproduce the API's Git blob SHA
and their SHA256. The actual API responses, command arguments, exits and
full captured PR description remain in `investigation-execution`.
Upstream-author test counts in that description are not our test results.

The audit additionally rehashes 57 baseline/current-default/working source
snapshots, checks the actual native Git canonical-source witnesses, follows
the named source path, and verifies that the independent source checkout
remained unchanged with its four unrelated reports preserved.

```powershell
node .\reproduce-overlap.mjs . --verify
```

Passed, exit 0. [Source audit](source-audit.json),
[acceptance and exclusions](acceptance.json),
[closed zero-use budget](measurement-budget.json),
[six-file source provenance](investigation/upstream-68299/source-provenance.json),
and [two additional owning-link identities](investigation/upstream-68299/source-link-provenance.json).
This relocated Windows audit requires Node.js and the published capsule, not the original
checkout, binaries, private caches, network access or the old session path.

## Disposition limits

There is no new source proposal and therefore no artificial PR diff or new
draft to open in the browser. The Components sample/browser, permanent-test,
formatter, package and API-compatibility implementation workflow was not
entered because no product behavior was changed.

No performance result is borrowed from other findings, and no whole-PR
correctness, API approval or merge readiness is asserted. Reassess F019 if
the active upstream proposal is closed without merge or drops this exact
parent-layout reflection replacement.
