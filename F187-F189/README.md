# F187-F189: test-helper scope and unreachable nested action

**Disposition: rejected, not measured no benefit.** F187/F188 concern nonshipping missing-result test helpers with no established material fixture workload. F189's alleged per-request allocation does not execute in its actual owning hosted fixture: discovery excludes that nested controller, and its route returns HTTP404. Each comparison budget is permanently closed **0 of 3**. No candidate, allocation/timing measurement, performance PR or new browser window.

| Finding | Classification and concern | Faithful exact accepted common cases | Artifacts |
|---|---|---|---|
| F187 | **Test-support workload unestablished:** new directory-miss result objects. | `F187_MissingDirectoryIdentityAndRegisteredState`; `F187_PublicRazorEnumeration_UsesRealProvider` | [Frozen producer handoff](owner-handoff/HANDOFF.md), [actual case results](owner-handoff/RESULTS.json) |
| F188 | **Test-support workload unestablished:** new file-miss result objects; the real private result has a throwing contract. | `F188_MissingFileContractAndMutableLookup`; `F188_PublicRazorMissingItemAndCompilerCache`; `F188_PublicFileVersionProvider_CacheAndHelperInvalidation` | [Producer/source evidence](owner-handoff/HANDOFF.md), [fresh portable audit](coordinator-portable-audit.json) |
| F189 | **Producer applicability disproved in owning fixture:** nested `Index` / `new EmptyResult` is not discovered or invoked there. | `F189_ExistingHostedFixture_ExcludesNestedAndExecutesDiscoveredControl` | [All individual native discovery rows](coordinator-independent-system-xml.json), [publication / tracking](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F187-F189/publication.json) |

F187's real missing directories report `Exists=false` and have empty generic/nongeneric enumeration. Repeated/different finite misses currently have distinct references; fresh identity is not assumed to be a required public contract. Actual public DI reaches the recursive Razor enumeration producer for a missing root/child; registering that child changes the real returned item set.

F188 is **not** the public path-bearing `NotFoundFileInfo` assumed from its name. It is the helper's private nested type: `Exists` returns false, while `Name`, `PhysicalPath`, `Length`, `IsDirectory`, `LastModified` and `CreateReadStream` throw `NotImplementedException`. Replacing it with an unrelated public result is not silently called equivalent. Actual ordinal key/case/slash distinctions, add/replace/delete and prior returned-object state are exercised. Real compiler negative caching reuses descriptors and avoids repeated equal-path lookup; real file-version caching likewise bounds finite lookup cardinality. The helper's public `HasChanged` mutation proves the downstream cache response, **not an OS filesystem-notification producer**.

F189's class-library assembly really is an application part. Real feature/action/service discovery nevertheless excludes the nested type. Two actual nested-route requests return404 with no target method/result diagnostics. Discovered controls activate distinct real transient controllers, consume query/header services, and execute their actual returned `ContentResult`s into HTTP bodies. The target `Index` / `EmptyResult` is never directly called or represented as a successful hosted execution. Other/custom discovery hosts remain outside this result.

## What actually ran

Fresh independent graphs built unchanged Original37 `37e809ead5824bc753a1c3d56f11615bdb1296c5` and independently observed pinned Default `83d976704fa0f9aa4361327d1f9d929c93bd9256`. Closing d348 is **target source-only freshness**, not a whole-later-main test. Normal assertion runtimes were actually62.105 /69.107; sampled hostfxr65 and SDK/compiler57 are distinct observations.

Four actual native TRXs passed **38 executions**: nine selected Razor cases and ten hosted controller cases per role. Independent real System.Xml reconciliation checks 19 case-sensitive case identities, 16 methods, and **all four discovery-Theory cases in each role (eight theory executions)**, including the negative nested route. Results, definitions, entries, methods, owner images, execution IDs and counters agree. Native framework assertion counts are uninstrumented.

Accepted common cohort002 has six exact cases /128 passed assertions per role: **12 cases /256 passed assertions**, with the same accepted DLL across role-native graphs. There were **two successful common C#13 compilations**, not one. Historical cohort001 remains intact: 12 executed rows, two failed rows and236/238 passed assertions, due to an incorrect diagnostic-observation expectation. The real After-event `Controller` field carries an action context; accepted checks use Before-event controller activation identities, explicitly verify the actual After-context identity, and follow returned-result identity through execution. No shipping code was fixed. Two input-preparation failures and a rejected dependency-merge cohort are also retained, not relabeled compiler failures.

The immutable owner capsule has **2,280 payload files /272,976,572 bytes**, plus two manifest self files. Offline parsing verifies 36 selected PE/PDB associations and96 selected raw PDB document checks, not all3,930 PDB document rows. There are211 additional retained compiler/reference input PE records. Native selected file/PE MVIDs are not promoted to in-process native managed-reflection observations; supplemental managed loads remain separately labeled.

The outside seal and command envelope cover81 recorded command roots (77 pre-seal, four closing/audit/snapshot), real exits/drained streams and a bounded1,702 recorded-creation check with no previously recorded owner still alive. This is not a universal OS process-tree, runtime/compiler/managed-module closure or shared-host isolation claim. Native MessagePack/import/assets/static-asset failures and their bounded prerequisite work remain available. Native commands explicitly disabled IIS native assets, NodeJS/static-web-asset builds and shared compilation; no browser/static-asset/physical-watcher/application-scale workload is claimed.

## Connected evidence and check

[Owner capsule](owner-handoff/HANDOFF.md), [owner closing seal](owner-closing/SEALED.json), [closing command receipts](owner-audit-commands/), [parent filesystem-only audit](coordinator-audit-055/exit.json), [independent System.Xml rows](coordinator-independent-system-xml.json), [coordinator acceptance](coordinator-acceptance.json), [closed budgets](closed-budgets.json), and [copy provenance](authoritative-copies.json) are connected here. Later [publication.json](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F187-F189/publication.json) links the immutable evidence and closed fork tracking issue.

```powershell
node .\verify.mjs --require-seal
```

The publication check actually passed against copied evidence and starts only a capsule-read-only JavaScript audit, with writes/children/native execution denied. It does not rerun native tests. Finite correctness/cardinality observations do not establish production frequency, allocation rate, candidate equivalence or material performance benefit. The fixed classified report remains unchanged.
