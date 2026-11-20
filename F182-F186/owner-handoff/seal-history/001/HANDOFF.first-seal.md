# F182–F186: one-class bounded untimed preparation

**F182/F183/F184/F185/F186 remain PENDING for coordinator acceptance.** No candidate, performance outcome, instrumentation, benchmark, source/permanent-test/config change, publication or campaign/policy write.

## Portable read-only audit

From this capsule:

```powershell
node --permission --allow-fs-read="$PWD" --no-addons .\Audit.cjs
```

Or, without the optional Node permission boundary: `node .\Audit.cjs`.

The actual sealed audit command, PID/UTC creation identity, drained streams, result and final manifest hash are recorded **outside** this capsule under the preparation root's `audit-attempt-*`. Only built-in Node and retained JavaScript helpers are required; the permission-bounded command permits reads of this capsule only, no filesystem writes, external addons or child-process permission. No checkout, donor, SDK, Git, package, native test execution or network input is needed. Absolute historical paths are labels, not audit input locations.

`MANIFEST.json` hashes **every** capsule file except itself and `MANIFEST.sha256`; its sidecar hashes the manifest. No helper, history or reused-prefix exemption. Counts/bytes in the manifest exclude those two self files. The unchanged historical F173–F175 capsule is included and independently audited as **attributed prior evidence**, not counted as new F182 work.

## Source, freshness and ownership

| Role | Actual graph | Pin |
|---|---|---|
| Original | Read-only donor `C:\src\ap-F173-o013`; full private native copy under this preparation root | `37e809ead5824bc753a1c3d56f11615bdb1296c5` |
| Whole Default observed at entry | New independent `C:\src\ap-F182-d022`; dependency-aware normal build; full private native copy | `adf2e9d22addd1461c6c25e8a8f411be28b81100` |
| Prior donor Default, **not relabeled current** | Read-only `C:\src\ap-F173-d013` | `90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d` |
| Separately observed closing main | **Not built or tested** | `0328b915263b84541e57b75f824e79a75f2d5ed3` |

Fresh `gh api` and `git ls-remote` observations detected the advance from the supplied last-current pin. A fail-closed entry mismatch is preserved. The new whole-Default graph was therefore built; no TARGET-ONLY Default is substituted. Main advanced again during preparation/HOLD. Evidence remains explicitly pinned to entry Default, not closing main.

All five targets are in **one nonshipping test-store class**, `src\Identity\test\InMemory.Test\InMemoryStore.cs`, Git blob `e5522d97b7fe906dca749215c6f01019bd5fb55b` on both tested pins. They are **not shipping production Identity stores**. Actual public production `UserManager`/`RoleManager` are exercised as producers.

`OWNERSHIP.json` provides exact construction, normalization, lifetime and comparer boundaries. The native `InMemoryStoreTest` factory constructs the real store and registers the identical object as singleton for user and role interfaces. Selected specification Facts use real public managers and shared supplied contexts. **This class does not inherit `InMemoryUserStoreTest` and does not instantiate that other class's SQLite `IClassFixture`.** Merely carrying SQLite dependency bytes is not fixture execution evidence.

The supplemental consumer separately uses the real store with public `AddIdentityCore<PocoUser>().AddRoles<PocoRole>()` and exact-instance singleton store registrations; two manager scopes prove actual scoped-manager/store reuse. No replacement dictionary, copied target implementation, private callback injection or startup hook is used.

Source reachability is bounded pinned Identity source/history/literal construction references plus local LSP, not a whole-repository resolved census. Hosted FunctionalTest/controller paths were not run. DefaultUI links/recompiles the **base user-store source**, not these five role-name methods; different passkey sample classes are not extra executed target consumers.

## Requirement coverage

These are **supplemental console rows**, not VSTest tests. Each row passed independently on Original62 and whole-Default69; every assertion and observed value is retained in `evidence\<role>-supplemental-v1.json`, accepted source and `supplemental-selection.json`.

| Requirement | Evidence |
|---|---|
| Ordinary/missing role, case/equal-string manager lookup, real association add/remove/repetition, exact user references and user-insertion versus association-add/name order, DI scope/store reuse | `RoleNames_ManagerMembershipMissingAndOrdering` — **39/39 assertions per role** |
| Public normalized-name mutation before Update, same-object/replacement-object update, old-name disappearance, delete/orphan effect, same-ID re-create/rebinding, new-ID case after cleanup, exact role reference and unaffected control | `RoleNames_ManagerNormalizedNameUpdateDeleteReadd` — **39/39** |
| Actual upper-invariant/canonical normalization, duplicate exact/case/composed/decomposed name rejection, invalid create names and explicitly caller-invalid null/empty arguments | `RoleNames_ManagerNormalizationUniquenessAndArgumentBoundaries` — **18/18** |
| Actual public `SetRoleNameAsync` produces duplicate live names before validating Update; all five leaf/manager lookup outcomes and subsequent restoration | `RoleNames_PublicSetterProducesDuplicateNames` — **16/16** |
| Nullable public setter mutates stored normalized property; direct real-store null matching; user-list instance-Equals failure; null role first | `RoleNames_PublicSetterNullNormalizedName_NullFirst` — **17/17** |
| Same real producer with normal match **before** the null role; lookup still enumerates and user list throws | `RoleNames_PublicSetterNullNormalizedName_NullLast` — **17/17** |
| Public setter produces empty name; validating Update fails but stored reference changed; membership add/remove/name lookup versus guarded user list | `RoleNames_PublicSetterEmptyNormalizedName` — **14/14** |
| Clearly deliberate raw direct-store case-distinct normalized names, exact versus ignore-case comparers; missing-role removal differs with nonempty versus empty association lists | `RoleNames_DirectStoreComparerAndMissingDiagnostics` — **18/18** |
| Clearly deliberate repeated direct-store add creates duplicate associations; Any membership/list semantics versus association SingleOrDefault removal exception | `RoleNames_DirectStoreDuplicateAssociationDiagnostics` — **7/7** |

**Per role: nine supplemental rows, 185 passed assertions.** No timing, cardinality/frequency or material-benefit inference.

### Actual unchanged existing native Facts

Each name below is prefixed by `Microsoft.AspNetCore.Identity.InMemory.Test.InMemoryStoreTest.`. **Every listed row passed on both Original and whole Default**, once each:

| Existing native Fact | Original62 | Whole Default69 |
|---|---|---|
| `CanRoleFindByName` | Passed | Passed |
| `CanUpdateRoleName` | Passed | Passed |
| `CanDeleteRole` | Passed | Passed |
| `CreateRoleFailsIfExists` | Passed | Passed |
| `CanAddUsersToRole` | Passed | Passed |
| `CanRemoveUsersFromRole` | Passed | Passed |
| `RemoveUserNotInRoleFails` | Passed | Passed |
| `AddUserToRoleFailsIfAlreadyInRole` | Passed | Passed |
| `CanGetUsersInRole` | Passed | Passed |

Two actual TRX reports: **9 executed/passed, zero failed/skipped per role; 18 row executions, nine unique Facts**. These selected bodies are unconditional; **no selected Theory rows**. Broader suites/theories remain unexecuted. The prior owner's unrelated eleven-Fact selection was not rerun.

`Reconcile.cjs` freshly parses structured XML, matching each Results/Definitions/Entries test/execution/list ID, exact discovered name, owning role codeBase/storage, counters and zero errors. It does not accept a zero-discovery support project or console totals as proof.

## Exact execution inputs and command results

`RESULTS.json.commands` contains **every exact native executable, argument array, checkout, PID/creation identity, result and raw-stream path**; individual `evidence\*.receipt.json` are the original receipts. Do not rerun native commands to audit.

Actual native selection wrappers, whose expanded VSTest argument arrays are in those receipts:

```powershell
& .\Invoke-Selected.ps1 -Role original # exit 0; all nine named Facts Passed
& .\Invoke-Selected.ps1 -Role default  # exit 0; all nine named Facts Passed
```

Each exact checkout was activated **before every dotnet invocation**, with:

```powershell
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
. .\activate.ps1
```

Private CLI/scratch/cache paths, `/nr:false`, and no shared compiler were used where applicable. Normal Default prerequisite commands retained a binlog and their exact arguments:

* GenerateFiles target: first **MSB4036 missing `GenerateFileFromTemplate`**; exact project restore then normal generation **exit 0**.
* Normal native `build --no-restore`: **NETSDK1004**, before any test assertions. Exact unchanged normal restore then dependency-aware Release build **exit 0**.
* Default normal project evaluation **exit 0**, `net12.0`, real unit-test project, nonshipping. Original evaluation is explicitly reused historical evidence, not a new invocation.

The **sole new explicit common C# compilation** was:

```powershell
dotnet exec <capsule>\consumer\inputs\compiler\csc.dll /noconfig @<capsule>\consumer\compile.rsp
# Original checkout activated; exit 0, no compiler warnings/errors
```

SDK/compiler `12.0.100-alpha.1.26557.102`, `/langversion:13`, `/nostdlib+`, no analyzers/additional files/resources. All **176 framework refs + three actual Original normal refs**, five managed compiler/deps/runtimeconfig/CodeAnalysis files, source and response are retained. The accepted common MVID is `415ed69a-6906-4ede-b90c-775217ed42c5`.

The exact common DLL/PDB/deps/runtimeconfig (**four files / 121,037 bytes**) are byte-identical across roles. Actual supplemental commands use:

```powershell
dotnet exec --depsfile <private-role-native>\Microsoft.AspNetCore.Identity.InMemory.Test.deps.json --runtimeconfig <private-role-native>\Microsoft.AspNetCore.Identity.InMemory.Test.runtimeconfig.json <private-role-native>\AutoPerf.Identity.RoleNames.dll <role> <output-json> <identity-json>
# Original: exit 0, nine rows /185 assertions
# Whole Default: exit 0, nine rows /185 assertions
```

Both use **their whole normal owner/manager/dependency/runtime graph**. Prepared Original common configs are retained but explicitly overridden by each role's normal configs.

### Preserved preparation history and deviations

* Initial current-main mismatch and complete failed script/streams preserved under `initialization-failure-v0`.
* Local `git clone --no-hardlinks` unexpectedly inherited donor alternates; the next entry failed closed **before dotnet**. Raw alternate and exact inputs/streams remain under `initialization-failure-v1`. Only the owned clone was repacked; its borrowed objects became independent, the owned alternate was removed, and `fsck` passed. No final alternates or hardlink clone option.
* Both native prerequisite failures above are preserved; their missing dependency was demonstrated before restore. The initial orchestration guard failure is retained, not counted as an assertion failure.
* One successful common **input preparation** preceded two precompiler boundary amendments. Its earlier source had not been separately copied before amendment; it was recovered by the exact reverse edits and **freshly matched the prior recorded SHA256/length**, retained under `consumer\preparation-v1`. It was never compiled. An LF/CRLF assumption in that recovery helper failed first; original script/streams remain under `consumer-input-finalization-failure-v0`.
* Exactly **one successful new common C# compilation, zero failed common C# compilations, no failed supplemental execution**. The unchanged included F173 capsule contains its **separate historical successful compilation** and preparation failure; these are not relabeled new work.
* Initial closing donor scope used two null `git -C` arguments because a path variable was accidentally function-local. Git exited 0 but read coordinator cwd; integrity verification correctly rejected the wrong HEAD. Entire prior closing/script/streams and raw wrong-scope arguments are retained under `closing-attempt-v0` and `evidence`. Only two explicit-path read-only Git commands corrected the donor proof; no tests/compiler were rerun. Closing CLI total includes all **13** actual roots.
* **HOLD F140-027:** all native/source-heavy work was quiesced, 106 known PID/creation-time observations showed zero owned work; acknowledgement and explicit RELEASE records are retained. Only offline verification/reporting/sealing resumed.

## Concrete contract and lifetime observations

The real default normalizer applies `Normalize().ToUpperInvariant()`. Default validated creation rejects duplicate/case/canonical-equivalent names and null/empty/whitespace names. These do **not** make every public operation preserve those invariants:

* Public `SetRoleNameAsync` mutates the **stored object reference**, including normalized name, before Update and without validation. Actual setter rows prove duplicate/null/empty transient states; they are not asserted to originate in successful validated Create.
* F182/F183/F184 use case-sensitive `==` on normalized names; null matches null. F185 uses instance `NormalizedName.Equals`, guards null/empty input, and throws on a null stored normalized property even after finding a prior valid match. F186 uses null-safe static `String.Equals(...OrdinalIgnoreCase)`; raw case-distinct normalized values therefore differ across methods.
* All five role-name selections use `SingleOrDefault`, so multiple matching role values throw rather than choose first/last. F183 also uses it on associations, while F184/F185 use `Any`.
* Missing ordinary manager add returns success but creates no association in this store. Missing manager removal is stopped by the membership precheck. Direct missing-role removal throws only when a nonempty association enumeration evaluates `roleObject.Id`; the tested empty-association path completes.
* Public manager duplicate-add precheck preserves a single association; deliberate direct-store repeated add does not. Duplicate associations still yield one listed user, but leaf removal throws.
* Same-object setter mutation, validated same/replacement-object updates, deletion retaining a user association, orphan `GetRolesAsync` failure, and same-ID re-creation/rebinding expose the actual reference/lifetime boundaries. These characterize consistency surfaces; no reverse-map design is prescribed.

The new-ID same-name case runs **after old-association cleanup**. Re-creating a different ID while retaining an orphan association is unverified.

## Identity, all-file inventories and attestation bounds

| Identity observed by supplemental reflection | Original62 | Whole Default69 |
|---|---|---|
| Owner MVID | `d43bb5ed-1a42-49d8-bdb2-5185b29bcdda` | `e0d1caa4-2d17-4233-836e-fd39114d3ce3` |
| Public manager producer MVID | `d4bdeb7c-64b3-4924-af35-fda64ba194e6` | `d1719cea-42c6-4444-866c-71bac619a28d` |
| CoreLib MVID | `818a7b40-a6a6-4d5f-b778-6d2c5d7acf01` | `7d1be881-a554-424e-b653-6b452406a125` |
| Actual native testhost CoreCLR/CoreLib version | `12.0.0-alpha.1.26562.105` | `12.0.0-alpha.1.26569.107` |
| Private native image after common augmentation | **279 files /78,961,070 bytes** | **275 files /78,909,465 bytes** |
| Complete shared-runtime inventory | **197 files /81,615,678 bytes** | **198 files /81,973,845 bytes** |

Original retains all 275 donor image files, including **four historical F173 companions**, then adds four new common companions. Fresh Default begins with 271 normal files and adds four new common files. No prefix or extension is excluded. Native keyed union: **279 paths /101 differences**. Runtime keyed union: **200 paths /199 differences**. Each normal deps declaration has **27 source-built projects /66 packages**. These are whole differing graphs, not controlled causal performance pairs.

Unhooked actual native runs supplied **seven snapshots per role**, containing 132/141 distinct module files. They captured actual owner/manager paths and file hashes, `testhost.exe`/`testhost.dll`, CoreCLR/CoreLib and loaded **hostfxr65**. Their selected file bytes/MVIDs are freshly parsed and matched to those hashes. That is sampled native module/file provenance, **not native in-process reflection**; actual managed reflection MVID observations are from the separate supplemental processes. SDK/VSTest runtime57 or hostfxr65 is not mistaken for assertion runtime62/69.

New selected evidence has **46 artifact records, 15 managed images, seven PE/PDB pairs, every one of their 229 raw Document sources, 262 pinned Git Merkle membership/absence proofs and 42 raw commit/tree objects**. Auditor freshly parses PE/MVID/CodeView and portable-PDB ID/Document/checksum data, not saved metadata summaries. Compiler-source CRLF versus pinned Git LF is explicitly checked. Both native XML reports are structurally reparsed.

Selected PE-only dependencies/compiler/references/runtime/native files have **no source-document completeness claim for unselected PDBs**. Full image/runtime inventories are filename/size/hash inventories, **not all copied dependency/runtime bytes**. All explicit common compile inputs are retained, not the complete SDK/native compiler/OS execution closure. Supplemental module recording is filename-bounded to four names; native snapshots have no filename/prefix exclusion but remain sampled. No arbitrary environment or whole-machine capture.

Closing integrity freshly checks all reused native/runtime/target bytes, selected SDK managed-compiler/actual host hashes, complete donor capsule equality, private image preservation and independent Default's absent alternates. Original and both Default checkouts remain pinned/clean. Coordinator's F145 branch, HEAD and same four pre-existing untracked paths remain unchanged; no original byte-hash attestation exists for its index/reports.

## Terminal and unverified boundaries

`TERMINAL.json`: **12 new dotnet roots, ten successes/two retained prerequisite failures**, all roots/observed descendants/redirected streams terminal; 106 known PID/UTC-creation observations show **zero still owned**. Thirteen closing read-only CLI roots also exited/drained, including the two preserved wrong-scope observations. Synchronous source/proof/Node helpers completed; no exhaustive historical PID census or watcher is claimed.

Unexecuted: closing main `0328…`, other native/theory rows, custom normalizers/validators, arbitrary direct Poco mutation, retained-orphan/different-ID re-create, broad Unicode/culture/concurrency/cardinality, cancellation/disposal matrices, hosted/controller/UI/defaultUI asset/browser/nativeAOT workflows. This is finite nonshipping-helper characterization, not native/material/suite-speedup, frequency, hotness or universal multi-application evidence. No fix or red/green claim applies.

The sealed capsule is handed off for the coordinator's independent evidence audit and decision. **All five IDs remain PENDING.**
