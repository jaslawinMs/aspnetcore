# F087: weak-cache MVC union interface targets

**Qualified performance proposal, not merge-ready.** Three serialized original/proposal comparisons on the shared Windows host support warm MVC validation gains. Median paired improvements are 36.93% for an implicit integer, 26.90%/24.38% for valid/invalid implicit cases, 30.15% for a valid 64-union array, and 36.71%/37.90%/40.15% for depth 4/16/64-valid. Simple implicit cases save 128 B per validation. The 3/3 measurement budget is closed; no fourth run or universal/production-throughput claim.

## Corrected finding and proposed seam

The scan's "every validated child property" premise was overstated. `IsUnionValueProperty` exits before reflection unless metadata describes a property named `Value`. Actual `GetChildren` and `ValidationVisitor.GetUnionCaseMetadata` still repeat eligible interface-map lookups across public validation calls.

Cache the original target `MethodInfo` by exact runtime union `Type` in a private `ConditionalWeakTable`. Preserve the property-kind/name guard, property getter lookup, original `GetInterfaceMap` miss location and getter/base-definition comparison. A same-`Microsoft.AspNetCore.Mvc.Core`-assembly metadata-update handler replaces the table. A miss inserts into its captured old table, so an in-flight lookup cannot repopulate the replacement.

Owner introduction: dotnet/aspnetcore#69834, commit `c7a1c5c982ab0468714b7d9c67175c02f3c1a0cc`. Actual motivation, review corrections and current owner/visitor/default metadata were inspected. Bounded active-PR searches are retained, not an exhaustive absence claim.

Three source files, **202 additions/one deletion**: owner 21/1, new focused unit class 92/0, existing integration class 89/0. One existing statement changes; no unrelated existing statement rewrite, public API/default change, dependency manifest change, new `InternalsVisibleTo`, cross-framework nonpublic bridge or `UnsafeAccessor`.

## Actual measured producer and complete evidence

The external four-file BenchmarkDotNet project uses the actual DI-created public `IObjectModelValidator`, default metadata, `ObjectModelValidator`/`ValidationVisitor`, union strategy and real ModelState/getter/filter/case-validator effects. It is not a `GetInterfaceMap`-only proxy and does not measure hosted HTTP throughput.

Repository SDK `12.0.100-alpha.1.26557.102`, pinned runtime framework `12.0.0-alpha.1.26562.105`, BenchmarkDotNet 0.13.0, C# 13, Release, in-process X64/server GC. Three warmups, eight result iterations, 100 ms target, `DontRemove` outliers. Launch order AB/BA/AB; one unchanged weak-cache strategy. CPU-heavy work serialized, MSBuild at most two workers; no power/affinity changes or interference with unrelated processes.

[All 32 profiles and every per-round value](comparison.md), [raw arithmetic/source/state/XML audit](measurement-audit.json), [exact commands and results](validation-commands.md), [actual environment](environment.json), [harness](harness/AutoPerf.Benchmarks.csproj).

The audit verifies **192 outcomes, 1,536 JSON result samples and 1,536 actual console workload rows**, 198 executing-owner markers, 282 distinct XML executions, 64 byte-identical authoritative state captures, 13 source/PDB checks and a **292-file/121-runtime-asset** execution closure. Only MVC.Core DLL/PDB differ. Twelve unchanged-source MVC dependencies rebuilt after the owner reference changed; their unmeasured initial snapshot was retained, and baseline binaries were reused for the controlled `after-2` snapshot.

BenchmarkDotNet 0.13.0 full JSON has result-stage samples; actual workloads are cross-checked in console logs. Two decorated profiles have colliding truncated display text. The auditor resolves each by full JSON case identity and all eight console/result operation-and-time values, not a truncated label.

## All 32 cases and retained costs

Every warm, cold, suppression, decoration and non-union control is in the linked complete table; negative time change means faster. Medians are paired time changes, not a ratio of aggregate means. B/op columns are separate per-owner medians; inspect per-round values before inferring paired cold heap changes.

Explicit valid/invalid paths improve only 5.33%/3.92% median. `DecoratedNamesakeInvalid` is 22.10% slower in round 2 despite a 4.83% faster median. `SuppressedUnion` has no grounded timing gain. Unchanged `CustomStrategy`, `PlainObject`, and `PlainCheckedCase` move 3.02%, 0.47%, and 1.91% slower by median with unchanged heap. No cause was established for these control movements; they are not dismissed as harmless noise.

Genuine first-use `FreshDerived64` and `FreshDeclared64` median timing changes are -6.34% and -0.03%; short batches and broad variability do **not** establish a cold-time benefit. Derived paired heap changes are **+84/+351/+310 B** per validation; declared changes are **+501/-780/+295 B**. Do not advertise a universal first-use heap reduction or a single stable cache-entry cost from these values.

Cold `IterationSetup` emits 64 distinct runtime union Types and prepares metadata/getters outside timing. Each actual timed iteration validates each Type once with invocation/unroll 1, observing real invalid-case effects. Emission, model/case construction, metadata setup and process-first cache construction are excluded. Both cold contract producers observe 64 actual getter and case-validator calls; an initial unmeasured bookkeeping-only getter count was corrected and retained separately.

Depth 64 is explicitly **valid** with configured `MaxValidationDepth=256`. The original invalid-depth-64 probe reached MVC but could not add an error key past internal ModelState depth 32. That prerequisite and failed trace are retained; no internal state-depth override or deep-invalid coverage claim.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| Repeated implicit, explicit and namesake getter/property/case semantics | `UnionValidationIntegrationTest.Validate_RepeatedRuntimeUnionTypes_PreservesPropertyAndCaseValidation`: all three rows pass before/after, each executing 24 real public validations and asserting exact keys/messages. |
| Mixed runtime getter identities and valid siblings | `UnionValidationIntegrationTest.Validate_MixedUnionTypes_PreservesEachGetterIdentity`: real envelope traversal and exact three-key/message effects pass before/after. |
| Concurrent exact-Type selection | `UnionValidationIntegrationTest.Validate_ConcurrentUnionTypes_PreservesPropertyAndCaseValidation`: 64 parallel real validations with distinct ActionContexts and actual implicit/explicit error messages pass before/after. |
| Filter-before-getter, suppression, decoration, top-level properties, validation-state overrides, cycles and limits | All 39 `UnionValidationIntegrationTest` rows pass against both owners, including the original cases unchanged. |
| Hosted input/validation regressions | All 26 `SystemTextJsonInputFormatterTest.UnionValidation_...` HTTP functional rows pass before/after. |
| New cache does not independently root a collectible union Type | `DefaultUnionValidationStrategyTest.IsUnionValueProperty_DoesNotRetainCollectibleUnionType`: actual emitted RunAndCollect Type/interface-map producer passes original/weak cache; unmeasured strong dictionary fails the expected `Assert.False()` lifetime assertion. |
| Cache replacement and repopulation after metadata notification | Both false/true rows of `DefaultUnionValidationStrategyTest.ClearCache_ReplacesPopulatedInterfaceMapCache` fail at `Assert.NotSame()` without replacement and pass selected. Cache is populated by its real owning producer, not seeded. |
| Real runtime notification and observable no-restart behavior | Actual `dotnet watch` getter-body edit changes public MVC validation from valid `"abcd"` to invalid `"abcdef"` at `model.Value`; same PID/owner, one startup, three logged actual owner callbacks and four observed table generations. |
| Every benchmark executes its intended scenario | All 32 original/controlled-proposal contract checks, 64 exact state files, actual getter/filter/case counts and eight distinct first-use batches per cold profile/launch are audited. |
| Reproducible source/runtime boundary | 13 source/PDB proofs; tested/executing owner hashes; complete owner-only 292/121 closure; exact source commit and native patch; original/current whole-file whitespace checks both exit 0. |

Original required suites pass **54 unit/39 integration/26 functional =119** executions; selected passes **56/39/26 =121**, including all eight introduced rows. One pre-existing `DefaultObjectValidatorTests.Validate_IndexedCollectionTypes_Valid` display name/testId appears twice; both raw execution IDs are distinct and pass before/after. No unrelated test rename or data change.

An initial new Namesake test expected both Required and case errors at the same key. Actual original MVC suppresses the case validator once the public key is invalid. Preserve the failed expectation/trace; corrected setup uses valid public `"public"` plus invalid case, so all three repeated-shape rows reach their intended original/proposal effects. The 282 XML outcomes include 278 passes and four expected/corrected failures: this initial expectation, strong-cache lifetime, and two no-invalidation rows. Build-only failed analyzer/nullable/selection attempts are retained but not counted as executed tests or benchmark comparisons.

## Hot Reload, lifetime and intentionally unverified boundaries

The real-watch proof establishes the runtime handler registration, actual table replacement and getter/property-validation material effect **without restart on Windows CoreCLR 12**. The temporary app uses real public DI validation; private cache inspection occurs only after its actual producer. No direct callback or seeded-cache imitation.

The **attribute-only probe** applied its delta and replaced the owner cache, but its already-cached MVC validator output remained valid in this diagnostic configuration. The **explicit-interface-addition probe** applied but the observed runtime `GetInterfaceMap` target and case dispatch stayed on the original public getter. Neither is described as successful attribute refresh/interface remapping. Their actual responses/logs are published; the faithful successful boundary is the later existing-getter body edit and observed invalid ModelState. Normal web-host metadata refresh and other runtimes remain unverified.

The collectible-Type proof is at the actual owning interface-map method, **not full-MVC unloadability**. Existing Shared PropertyHelper static dictionaries already retain metadata Types; no unrelated cache clearing or lifetime fix is included.

Type distribution/reuse, cache capacity growth, native handles, whole-process footprint, first-process startup, production workload frequency and universal stability remain unmeasured. No trimmed, NativeAOT, browser or other-OS/runtime claim. These cold/control/runtime limits and small-path tradeoffs must be reviewed before advancing this draft.
