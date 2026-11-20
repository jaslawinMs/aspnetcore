# F176-F179: startup dictionary probes, without an established material workload

**Four rejected workload-gate findings, not measured no benefit.** The repeated probes exist, but the route-key insertions are configuration operations and the view dictionary is built during compiler initialization, not for each request or view lookup. No material application registration/cache-build frequency or cardinality was established. No candidate, performance comparison, performance PR, or new browser window was authorized. Each original finding's budget is permanently closed **0 of 3**.

| Finding | Target and accepted behavior |
|---|---|
| F176 | `MapControllers`: retain the same native data source/default builder, its concrete case-sensitive dictionary, the first actual endpoint builder, and the real downstream static-resource resolver. |
| F177 | `MapDefaultControllerRoute`: retain the default builder's stored owner while creating distinct conventional routes and returned builders with their **own** empty `Items` dictionaries. |
| F178 | `MapControllerRoute`: retain that same ownership while named routes and global/per-route conventions materialize real endpoints and downstream resource metadata. |
| F179 | `DefaultViewCompiler.EnsureCompiledViews`: use an `OrdinalIgnoreCase` cache and retain the first native descriptor/task for duplicate paths, through page creation and actual view execution. |

| Artifact | Evidence |
|---|---|
| Decisions, limitations, individual budgets | [Coordinator acceptance](coordinator-acceptance.json), [four closed budgets](closed-budgets.json) |
| Complete unchanged preparation handoff | [Owner handoff](owner-handoff/HANDOFF.md), [results](owner-handoff/RESULTS.json), [commands](owner-handoff/COMMANDS.json) |
| Exact native names and every theory row | [Selection](owner-handoff/native-selection.json), [independent System.Xml reconciliation](coordinator-independent-system-xml.json) |
| Real common public-producer consumer | [Accepted source](owner-handoff/consumer/Program.cs), [accepted/common copy inventory](owner-handoff/common-images.json), [actual compiler history](owner-handoff/compile-history) |
| Original and default raw native/supplemental evidence | [Saved evidence directory](owner-handoff/evidence), [native reconciliation with hook](owner-handoff/native-reconciled-hooked.json), [unhooked reconciliation](owner-handoff/native-reconciled-modules.json) |
| Fresh managed metadata, source and Git bindings | [Selected records](owner-handoff/selected-records.json), [Git membership proofs](owner-handoff/git-source-proofs.json), [auditor](owner-handoff/Audit.cjs) |
| Source/image/runtime attribution | [Final native-image inventory](owner-handoff/native-images-final.json), [runtime inventories](owner-handoff/runtime-images.json), [helper attribution](owner-handoff/HELPER-ATTRIBUTION.json) |
| All failed audits and superseded preparation | [Audit history](owner-handoff/audit-history), [all outer closing/audit files](owner-closing), [sealed handoff](owner-closing/SEALED-HANDOFF.json) |
| Exact owned-process closure and original HOLD history | [Final observations](owner-closing/FINAL-TERMINAL.json), [unchanged HOLD ack](owner-closing/F140-HOLD-027-ack.json), [explicit UTC correction](owner-closing/F140-HOLD-027-ack-correction.json) |
| Portable audit and unchanged-copy inventory | [Verifier](verify.mjs), [recorded reference audit](coordinator-portable-audit.json), [copied byte inventory](authoritative-copies.json), [actual preparer](executed-drivers/F176-F179-prepare-publication-044.mjs) |

The fork tracking issue and immutable evidence commit are recorded in `publication.json` after publication. The nested owner's `PENDING` labels record its preparation handoff, not this coordinator's final outcome. The fixed campaign `REPORT.md` snapshot is unchanged.

## Why these are not request-path savings

The three route methods check the **same data source's `DefaultBuilder.Items`**. Only the missing-key branch writes the endpoint-builder key. Later mappings retain it and take the existing-key branch; mapping more routes does not repeat this double-probe insertion for every request. Publicly sharing one real data source across two real route builders demonstrated why preserving the first value matters.

The returned conventional-route builders are different objects from `DefaultBuilder`. Their empty `Items` are not interchangeable with its retained dictionary. In unchanged code a `WithStaticAssets` call on the fresh returned default-route builder does not find the default owner's item and supplies no endpoint resource metadata; the positive controls use the real default builder and do materialize that metadata. This is a characterized existing boundary, **not a proposed bug fix**.

F179 runs while building the compiled-view dictionary. Successful later lookups reuse the cached task/descriptor. The existing duplicate guard also avoids **evaluating `Task.FromResult(compiledView)` for rejected duplicates**. Simply deleting it is not assumed to be a free, work-equivalent change. The existing hot-reload clear/rebuild path is source-visible but was not exercised; initialization is not claimed to happen only once for every possible application lifecycle.

## Faithful behavior evidence

Both source roles passed these nine common-consumer scenarios, **94 checks per role**. Reflection only reads native internal state; real public registration, discovery, part loaders, compiler/provider, page factory, and `ExecuteAsync` produce the disputed state and downstream effects.

| Requirement | Evidence |
|---|---|
| Attribute registration, builder/dictionary identity and actual resolver/endpoint metadata | `MapControllers_RealRegistration_ReusesDefaultBuilderAndItems` |
| Repeated conventional mappings, distinct route builders, default/global and per-route conventions | `MapDefaultControllerRoute_RepeatedRoutes_ReturnFreshRouteBuilders` |
| Named route patterns, conventions and real downstream metadata | `MapControllerRoute_NamedRoutes_KeepGlobalAndRouteConventions` |
| First actual builder/resolver retained when two real builders share the native data source | `MapControllers_SharedDataSource_PreservesFirstRealBuilder`, `MapDefaultControllerRoute_SharedDataSource_PreservesFirstRealBuilder`, `MapControllerRoute_SharedDataSource_PreservesFirstRealBuilder` |
| Real precompiled descriptors/tasks, case/normalization/miss and page-factory/view output | `NativePrecompiledViews_CompilerCache_Case_Normalization_Miss_AndPageFactory` |
| Real duplicate identifiers across two native assembly parts; both orders preserve the first type/task through view output | `NativePrecompiledParts_DuplicatePaths_FirstPartWins_Forward`, `NativePrecompiledParts_DuplicatePaths_FirstPartWins_Reversed` |

The unchanged `RazorBuildWebSite.Views` assembly supplies three actual view/page identifiers. The view output is exactly `Hello from buildtime-compiled rzc view!`. Loading that same native PE in two collectible assembly contexts creates distinct actual type identities and real cross-part duplicates. This is a **constructed bounded topology**, not evidence of its application prevalence or assembly-context reclamation.

Eight actual native TRXs passed **44 executions: 11 selected cases per role/mode**, with two source roles and unhooked/hooked modes. There are nine selected native methods; the case-lookup theory has **three distinct parameter rows**, each checked independently in both roles/modes:

```text
/views/home/index.cshtml
/VIEWS/HOME/INDEX.CSHTML
/viEws/HoME/inDex.cshtml
```

The exact native methods include the three `ControllerActionEndpointDataSourceTest` convention/multiple-route methods and `DefaultViewCompilerTest` lookup/normalization/descriptor/miss plus `RazorCompiledItemFeatureProviderTest` same-/cross-part duplicate methods, all listed individually with commands/results in the unchanged handoff and selection. Native unit tests use injected/mocked descriptors or parts; those alone are **not** the real public-producer evidence supplied by the common scenarios. In particular, same-part case-only duplicate rejection is a native provider unit contract, not a demonstrated normal precompiled-asset topology.

## Compilation, identity, and honest limits

Original is `37e809ead5824bc753a1c3d56f11615bdb1296c5`; the whole independently observed entry default actually built/tested is `adf2e9d22addd1461c6c25e8a8f411be28b81100`. The two target blobs also match closing observation `83d976704fa0f9aa4361327d1f9d929c93bd9256`; **no whole-closing-default build/test is claimed**. Actual normal assertion runtimes are Original **62.105** and Default **69.107**, distinct from SDK/VSTest **57.102** and observed hostfxr 65. These are characterizations, not causal performance pairs.

There were **four actual C# compiler invocations: two failures and two successes**, plus one pre-native wrapper failure. Successful compile04 was superseded after its producer exposed a missing normal StaticAssets prerequisite. Accepted compile05 supplies the exact same four DLL/PDB/deps/runtimeconfig files to both roles. The normal role-own StaticAssets assembly is explicitly loaded because the test deps exclude that transitive private asset; no framework source, native dependency file, or runtimeconfig was substituted. All failed input copies, source cohorts, responses and producer failure remain preserved.

The fresh offline audit reparses **24 PE/portable-PDB associations; 3,946 document records; 3,940 raw-document associations; 162 embedded-source checks; and 2,762 source membership proofs through 154 raw commit/tree objects**. The embedded checks are not added as extra unique documents. **Six historical logical Razor documents lack their original raw bytes.** Their PDB checksum declarations and checked-in generated-C# checksum witnesses are retained, but those missing raw files were not fabricated or attested.

**Four historical native managed-exit snapshots are missing.** Actual TRXs, SDK command exits, hook initialization/owner-load events, and bounded module observations remain available, but none substitutes for the missing managed-exit snapshots. No complete native managed-assembly exit/identity closure is claimed. Observed managed MVIDs and sampled native module files/fresh metadata are kept distinct.

The final owner closure records **55 native commands, 40 successful and 15 failed/retained**, and **646 known PID/creation identities**, with no matching recorded owner remaining and persisted/drained streams. This is not exhaustive short-lived descendant history or unrelated-user inactivity. Original HOLD acknowledgments remain unchanged; the explicit correction independently reconciles all **591** historical exact UTC identities rather than inventing a new historical observation. Three failed auditor/closing assumptions and their old seals/streams are preserved.

The owner's manifest covers **4,768 payload files / 211,453,517 bytes**; the physical envelope including its two manifest files is **4,770 files / 212,441,232 bytes**. The public case additionally retains all outer seal/audit/failure files and coordinator evidence. It is portable offline evidence, not a complete compiler, SDK/runtime distribution, operating-system, or executable replay closure.

No hosted HTTP request, browser, concurrent mapping, ALC collection, hot-reload delta, application hotness/cardinality, candidate equivalence, or performance benefit is claimed.

## Offline validation

The unchanged handoff and command inventory contain every exact native command and result. The coordinator independently passed the permission-bounded owner auditor and real `System.Xml.XmlDocument` reconciliation of all eight saved TRXs without native reruns.

```powershell
node .\verify.mjs --require-seal
```

The wrapper rehashes the complete copied owner envelope, verifies closure/budgets, binds the independent XML result, and runs its child auditor with **read permission limited to the copied `owner-handoff` directory, no write or child-process permission, and no native build/test execution**. The outer wrapper needs child-process capability; do not constrain it with filesystem-only Node permission. The coordinator ran this copied-capsule verifier successfully before publication; publication also requires it.
