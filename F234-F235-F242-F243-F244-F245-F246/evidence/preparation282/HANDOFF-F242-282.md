# F242 / 282 — independent SOURCE ONLY handoff

## Recommendation

**Source-only no-material-candidate for the retained producer.** This is not a test-location rejection and not measured no-gain. No candidate was implemented. Parent acceptance, retirement, canonical outcome and publication remain outstanding and parent-only.

The actual removal setup has **two controller rules**:

| Controller | Retained `Actions` | Membership work |
|---|---|---|
| `EndpointRoutingController` | `null` | Removes all matching descriptors; short-circuits before `Contains` and `ActionName`. |
| `PageRouteController` | `new[] { nameof(PageRouteController.AttributeRoute) }` | A **one-element** array, not a growing removal-name set. |

Thus every call to the disputed membership operation receives one name. A large outer descriptor collection would not make this inner collection large. No material set-conversion candidate is established; this does **not** claim a set would be slower.

## Immutable roles and evidence

- Original: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- Fresh observed upstream `dotnet/aspnetcore` default branch: `main`; pinned Default: `d3483989953ae3cccd773aea5ea04cb0c7198531`.
- Complete upstream repository/ref JSON: `roots\002-upstream-repository-metadata` and `roots\003-upstream-default-ref`. Both commit objects were captured and independently Git-hashed.
- **15 whole logical Git files per role**, including three conservatively charged repository guidance files; **137,709 raw body bytes per role**. All 15 selected bodies have identical raw bytes and modes across the two roles. This is not whole-framework, factory, binary or runtime equivalence.
- **18/32 direct Git/gh roots**, including both reserved-checkout identity reads; zero failed source roots. The body-budget record says 17 at body closure; root 18 is the final navigation-only identity check.
- Every source root has fresh actual-owner/exact-scope/maximum-four-owners/no-lease/no-HOLD/nonquiesced/pending-F242 control snapshots.
- `inputs\capture-*.json` and `SOURCE-VERIFICATION.json` bind exact `commit:path`, mode, object type, byte count, Git ID, SHA256, saved stdin/stdout/stderr and binary `cat-file` framing. Verification rechecked raw frames and independent Git object hashes against saved raw `ls-tree` output—not just a self-authored inventory. No archive or EOL normalization.

Key source hashes:

| Whole body | Git blob | SHA256 |
|---|---|---|
| `RemoveControllerActionDescriptorProvider.cs` | `52e122b9a55d6c43ba751299d34d0f4bb9f4c9b4` | `B2A281601D041B9C4C4F0B44D4518E34A3DAF94F1AF984B103130F9F3A10D3DC` |
| `StartupWithoutEndpointRouting.cs` | `8a6fcccc1101e5b045493f51319b33371977a7fb` | `15BD59FBF7512F1B1D17224CA6623D66A4A30408F727FD6DFC5516E8F2834DE6` |

All remaining role/input hashes and raw frame offsets are in `SOURCE-VERIFICATION.json`. `EVIDENCE-ANCHORS.json` supplies line and byte spans without rewriting source.

## Real setup, producer, cardinality and frequency

`Startup.ConfigureServices` calls `AddMvc(ConfigureMvcOptions)`, JSON and Razor Pages options, then virtual `ConfigureRoutingServices` (`Startup.cs:13–38`). The legacy override disables endpoint routing, uses `UseMvc`, constructs the two rules above and registers the constructed remover instance as a singleton (`StartupWithoutEndpointRouting.cs:64–88`).

The framework controller descriptor provider populates `ControllerFeature`, requests the application model and calls the descriptor builder (`ControllerActionDescriptorProvider.cs:75–89`). The selected default model provider enumerates reflected methods, filters actions and produces names/selectors. The builder delegates flattening to `ApplicationModelFactory.Flatten` and copies model action/type fields into descriptors (`ControllerActionDescriptorBuilder.cs:21–53`).

`PageRouteController.cs:8–27` declares `ConventionalRoute` and `AttributeRoute`; the latter has one HTTP GET template. `EndpointRoutingController.cs:8–35` declares three action methods, but its rule bypasses membership. These are **source declarations**, not executed descriptor counts. Full application parts, the factory/DI bridge and flattening were not all captured; exact active controller/descriptor totals remain unknown. No large set, synthetic descriptor workload or repeated startup was assumed.

The collection provider sorts providers by `Order`, initializes/caches its collection, subscribes to change notifications and calls providers in `UpdateCollection` (`DefaultActionDescriptorCollectionProvider.cs:28–67,94–139,156–176`). This does not establish a per-request rebuild. Actual initializations, notifications and framework DI lifetime were not observed or fully closed.

## Contract assessment

- **Equality/normalization:** controller selection compares `Type`, not controller-name text. `Contains` has no explicit comparer: normal default string equality is case-sensitive ordinal value equality. The remover does not normalize names. The model supports `[ActionName]` and optional ordinal `Async` suffix removal (`DefaultApplicationModelProvider.cs:274–285,388–402`); neither renames the selected PageRoute methods. Route matching rules are not a reason to switch to ignore-case membership.
- **Null/duplicates:** null means all actions; empty would mean none. The retained singleton has no duplicates; the two rules name distinct types. General duplicate controller rules make `SingleOrDefault` throw rather than merge.
- **Order:** `ToList` snapshots results; removals follow snapshot order and non-controller descriptors are ignored (`RemoveControllerActionDescriptorProvider.cs:24–42`). The remover's `int.MaxValue` follows the controller producer's `-1000` under the observed ascending sort; ties/all other providers were not audited.
- **Getters/lifetime:** rule properties are mutable auto-properties (`:43–47`). Non-null `Actions` is read for the null check and again as the receiver; the descriptor name is then read as an argument. Framework descriptor getter definitions were not captured. The constructor retains its supplied array without copying; readonly is not deep immutability. The actual startup shows no later rule mutation, but a derived cached set would need a mutation policy.
- **Exceptions:** unguarded invalid constructor/context inputs and `SingleOrDefault` duplicate failures must not be silently changed by a rewrite. These are contract observations, not failures demonstrated in this valid setup.
- Snapshotting, the two-rule `SingleOrDefault` scan and `Results.Remove` have separate costs; they are not relabeled as F242.

## Actual test declarations — all unrun

`RoutingTests` explicitly selects `RoutingWebSite.StartupWithoutEndpointRouting` (`RoutingTests.cs:11–30`). Its `HasEndpointMatch` asserts HTTP success and false endpoint matching.

The inherited `RoutingTestsBase<TStartup>.ConventionalRoutedAction_RouteContainsPage_RouteNotMatched` asserts HTTP success, the PageRoute conventional action and absence of a `page` route value (`RoutingTestsBase.cs:84–102`). Also inspected: `CanRunMiddlewareAfterRouting` and `CanUseLinkGeneration_To_ConventionalActionWithPageParameter` (`:1572–1597`).

The base initialization hook constructs a fixture/client and disposes the factory (`:17–36`); `MvcTestFixture` configures Production and delegates real host/server creation. This proves what is declared for an invocation of that hook—not runner invocation counts or actual host starts.

**No tests were run or reached assertions:** SOURCE ONLY explicitly prohibits SDK activation, dotnet, restore/build/test and hosted execution. No red/green, executed producer reachability, direct removal-regression coverage, selected-binary or measured-performance claim is made. The observed boundary is immutable real registration/producer/test source, not a fabricated `Contains` benchmark.

## History and bounded gaps

Roots 007 and 016 retain bounded commit/message/path history, without source snippets. The latest returned target-path commit is `c85baf8db0c72ae8e68643029d514b2e737c9fae` (author date 2022-01-02). No historical body/diff or follow-rename traversal was acquired; subjects are not behavioral proof.

The 15-file body budget is closed. `FINITE-SOURCE-GAPS.json` records exact unresolved boundaries and an **unexecuted, parent-GO-only** optional four-bodies-per-role / one-root continuation for the factory, descriptor getters, DI registration and `WebApplicationFactory`. Those bodies were not read; the latter's Original/Default blob IDs differ. No continuation is needed to establish the actual singleton membership input. None would by itself establish runtime counts or performance.

## Terminal, inventory and authority

All 18 explicitly spawned source roots have actual exit 0 and both redirected pipe endings, with no deadline expiration. Stage Node/PowerShell receipts are retained separately. Observers cover direct roots and streams, **not an exhaustive descendant census or unrelated-process absence**. Source helper deadline clocks are operational wait bounds, not benchmarks.

Only new `finding-F242-282` artifacts were written. Reserved `C:\src\aspnetcore` was navigation/Git-object storage only; its initial/final branch and HEAD match `autoperf/F145-hoist-large-response-utf8-encoding` / `24875ef5dabb55567870b39f6eb0002170435e2f`. No checkout files supplied Default evidence.

No SDK, dotnet, install, build, test, product-native, scenario, host/server/browser, candidate, measurement, allocation, profiler, subagent, remote helper, shared/policy/lease/ledger/publication, API, IVT, UnsafeAccessor or cleanup actions occurred. Early orchestration-only skill/control navigation is explicitly disclosed in `EARLY-TOOL-NAVIGATION.json`; its conversation output is not fabricated as a byte-captured source artifact.

`SEAL-282.json` inventories every produced file except its necessarily excluded self, including helpers, whole inputs, failures if any, guards and known terminal records. **Its own actual outer tool exit cannot be known in this report:** the coordinator must retain the actual final tool receipt reported after return. No prospective self-exit is asserted.
