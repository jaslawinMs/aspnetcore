# F182-F186: test-store reverse-name lookups, no qualified index proposal

**Rejected for material-workload-unestablished, not measured no benefit.** These five linear role-name searches are in one **nonshipping Identity test store**, not production stores. Actual public manager lifecycles and native Facts pass, but no material test-suite/application frequency or role cardinality was established. No candidate, benchmark, implementation PR or browser window. Each finding's own budget is permanently closed **zero of three**.

| Finding | Actual `InMemoryStore<TUser,TRole>` target | Classification |
|---|---|---|
| F182 | `AddToRoleAsync` | Test-support indexing redesign; benefit unestablished |
| F183 | `RemoveFromRoleAsync` | Test-support indexing redesign; benefit unestablished |
| F184 | `IsInRoleAsync` | Test-support indexing redesign; benefit unestablished |
| F185 | `GetUsersInRoleAsync` | Test-support indexing redesign; distinct null/comparer contract |
| F186 | Explicit `IRoleStore<TRole>.FindByNameAsync` | Test-support indexing redesign; distinct case-insensitive contract |

## Why a reverse dictionary is not a drop-in replacement

The role dictionary is **ID-keyed and holds live mutable role references**. Public `RoleManager.SetRoleNameAsync` changes the stored normalized name **before validating `UpdateAsync`**. The real producer can temporarily create duplicate, null or empty normalized names; normal validated Create's uniqueness checks do not exclude these states.

`SingleOrDefault` must enumerate to detect a second match; replacing it with a first-match lookup changes duplicate behavior. F182-F184 compare with case-sensitive, null-safe `==`; F185 calls instance `NormalizedName.Equals`, whereas F186 uses null-safe `OrdinalIgnoreCase`. F185 therefore still throws on a null stored normalized name **even when a prior normal role already matched**. These are observed existing contracts, not proposed fixes or broad correctness allegations.

Same-object/replacement-object updates, deletion leaving an association and same-ID re-creation expose reference/index lifetime rules. Any index would have to preserve these real mutations, comparer differences, duplicate detection and exception boundaries. No evidence justifies introducing that maintenance complexity here.

## Connected artifacts

| Artifact | Evidence |
|---|---|
| Full source/producer/lifetime analysis and exact command results | [Owner handoff](owner-handoff/HANDOFF.md), [results](owner-handoff/RESULTS.json), [ownership](owner-handoff/OWNERSHIP.json) |
| Frozen target source | [Original source](owner-handoff/source/original/src/Identity/test/InMemory.Test/InMemoryStore.cs), [Default source](owner-handoff/source/default/src/Identity/test/InMemory.Test/InMemoryStore.cs) |
| Real existing Fact selection, raw reports and structured result/definition/entry/execution reconciliation | [Selection](owner-handoff/native-selection.json), [XML reconciliation](owner-handoff/native-reconciliation.json), [raw evidence](owner-handoff/evidence/) |
| Coordinator's independent **real System.Xml** reconciliation | [Exact names, IDs and counters](coordinator-independent-system-xml.json) |
| Real public-manager/DI consumer, exact rows/assertions and observed identities | [Source](owner-handoff/consumer/Program.cs), [selection](owner-handoff/supplemental-selection.json), [results](owner-handoff/RESULTS.json) |
| Fresh selected PE/PDB/raw sources and pinned Git Merkle proofs | [Selected records](owner-handoff/selected-records.json), [source proofs](owner-handoff/git-source-proofs.json) |
| Failures, terminal roots/streams, HOLD/release, audit and finalizer history | [Terminal boundary](owner-handoff/TERMINAL.json), [seal/final audit receipts](owner-closing/), [final seal](owner-closing/SEALED.json) |
| Coordinator disposition, all immutable copied bytes and individual budgets | [Acceptance](coordinator-acceptance.json), [copy inventory](authoritative-copies.json), [closed budgets](closed-budgets.json) |
| Fork tracking, immutable evidence commit and verified final index | `publication.json`, added after evidence sealing; linked from root campaign index |

## Requirement coverage

These are **nine supplemental console rows per source role**, not nine extra VSTest Facts. Every row passed independently on Original62 and whole-Default69, with **185 concrete assertions per role**.

| Requirement | Exact row |
|---|---|
| Missing/ordinary/equal-string/case membership, exact references and user-insertion order, same singleton store across two scoped manager scopes | `RoleNames_ManagerMembershipMissingAndOrdering` (39 assertions) |
| Real setter-before-Update, same/replacement reference, delete/orphan, same-ID rebind; different-ID re-create only **after old-association cleanup** | `RoleNames_ManagerNormalizedNameUpdateDeleteReadd` (39) |
| Real upper-invariant/canonical normalization, validated uniqueness, invalid creation names and explicit caller-invalid arguments | `RoleNames_ManagerNormalizationUniquenessAndArgumentBoundaries` (18) |
| Actual public setter creates duplicate live names before validation; all five targets retain duplicate detection | `RoleNames_PublicSetterProducesDuplicateNames` (16) |
| Actual public nullable setter produces null normalized name, null role before normal match | `RoleNames_PublicSetterNullNormalizedName_NullFirst` (17) |
| Same real producer with normal match **before** null role; F185 still enumerates and throws | `RoleNames_PublicSetterNullNormalizedName_NullLast` (17) |
| Public setter creates empty stored name even though Update rejects it | `RoleNames_PublicSetterEmptyNormalizedName` (14) |
| Explicitly deliberate raw case-distinct direct-store values and missing-role/association boundaries | `RoleNames_DirectStoreComparerAndMissingDiagnostics` (18) |
| Explicitly deliberate direct-store duplicate association, membership/list versus removal behavior | `RoleNames_DirectStoreDuplicateAssociationDiagnostics` (7) |

The **nine distinct unchanged native Facts** below each passed once on both roles: **18 executions, zero failed/skipped**. All names have prefix `Microsoft.AspNetCore.Identity.InMemory.Test.InMemoryStoreTest.`:

```text
CanRoleFindByName
CanUpdateRoleName
CanDeleteRole
CreateRoleFailsIfExists
CanAddUsersToRole
CanRemoveUsersFromRole
RemoveUserNotInRoleFails
AddUserToRoleFailsIfAlreadyInRole
CanGetUsersInRole
```

```powershell
# Exact expanded native arguments, activation, roots and actual results are in RESULTS.json.
& .\owner-handoff\Invoke-Selected.ps1 -Role original # exit0, 9/9 actual Facts passed
& .\owner-handoff\Invoke-Selected.ps1 -Role default  # exit0, 9/9 actual Facts passed

dotnet exec <compiler>\csc.dll /noconfig @<consumer>\compile.rsp
# exit0, no compiler warnings/errors; ONE new C#13 common compilation
dotnet exec --depsfile <role-native>\Microsoft.AspNetCore.Identity.InMemory.Test.deps.json --runtimeconfig <role-native>\Microsoft.AspNetCore.Identity.InMemory.Test.runtimeconfig.json <role-native>\AutoPerf.Identity.RoleNames.dll <role> <output> <identity>
# exit0 separately per role, 9/9 supplemental rows and 185/185 assertions
```

Every actual repository dotnet invocation activated its exact checkout first and set the three required no-certificate/no-tools-path/no-node-reuse variables. The commands above document saved runs, **not an offline-audit rerun instruction**.

## Identity and scope

Original was `37e809ead5824bc753a1c3d56f11615bdb1296c5`; whole Default `adf2e9d22addd1461c6c25e8a8f411be28b81100` was independently built/tested, not substituted with the prior Default90 graph. The selected target blob is `e5522d97b7fe906dca749215c6f01019bd5fb55b` on both tested pins and separately checked main `83d976704fa0f9aa4361327d1f9d929c93bd9256`; newer whole main was **not** built/tested.

Actual native testhost CoreCLR/CoreLib **62/69** is backed by sampled module/file hashes and freshly parsed selected PE metadata. Actual managed owner/manager/common reflection MVID observations came from **separate supplemental processes**, not invented in-process native observations. **Hostfxr65 and SDK/VSTest57 are not assertion runtimes**.

`InMemoryStoreTest` does not instantiate the other test class's SQLite fixture. Carrying SQLite bytes, or retaining the attributed F173-F175 historical capsule, is **not new F182 SQLite execution**. The retained historical compilation/native rows are not counted as new F182 work.

All **2,177 owner-envelope files /215,578,869 bytes** are copied unchanged, including its **2,175-file /215,124,551-byte** manifest payload and two self files. Its own manifest SHA256 is `47595CC253AD1A5FBF42ED633EB77D8A8CA38AEEC0BF78729E9084908BDC8959`. New selected scope: **15 managed images, seven PE/PDB pairs, all 229 raw Documents for those seven pairs, 262 pinned source proofs**. The complete portable audit also reparses attributed historical bytes; those are not newly produced coverage.

All 12 new dotnet roots (ten successes/two retained prerequisite failures), 13 closing read-only CLI roots and redirected streams were reconciled. The first successful seal/audit and later optional null-StartTime finalizer/probe failures remain under history; final attempt002 uses conservative exact-PID creation-time fallback. No native test or common compilation was repeated to repair sealing.

```powershell
node .\verify.mjs
# PASS: copied bytes, permission-bounded owner audit, fresh selected metadata/raw sources,
# real saved native XML and actual supplemental results; no target execution.
```

The two role native images differ in **101 of 279 union paths**; runtimes in **199 of 200**. They are **not causal performance pairs**. Full image/runtime inventories do not mean every dependency/runtime byte was copied. Selected native file snapshots and bounded PID observations are not a complete historical execution/compiler/OS closure or proof of arbitrary shared-host inactivity.

Excluded: other/theory rows, custom normalizers/validators, arbitrary direct Poco mutation, retained-orphan/different-ID re-create, broad Unicode/culture/concurrency/cardinality, cancellation/disposal matrices, hosted/controller/UI/defaultUI asset/browser/nativeAOT workflows. No test-suite throughput, frequency, hotness, application speedup or red/green fix claim.
