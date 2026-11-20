# F173/F174/F175: bounded untimed preparation

**All three findings remain PENDING.** No candidate implementation, timing, performance decision, campaign/ledger/policy mutation, public write, or coordinator source change.

## Portable verification

From this capsule, run:

```powershell
node .\Audit.cjs
```

Only built-in Node modules and the retained local helpers are used. The auditor is read-only: no .NET/native execution, compiler/package download, Git invocation, or donor/private-graph access. Historical absolute paths inside evidence are labels, not audit input locations. `MANIFEST.json` lists every capsule file except itself and `MANIFEST.sha256`; the latter hashes the manifest. Its entry count/bytes exclude those two self files. The audit execution receipt is outside the capsule under the preparation root.

Original capsule: `C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F173-F175-013\capsule`.

## Source and ownership

| Role | Unchanged private graph | Commit |
|---|---|---|
| Original | `C:\src\ap-F173-o013` | `37e809ead5824bc753a1c3d56f11615bdb1296c5` |
| Default | `C:\src\ap-F173-d013` | `90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d` |

`entry.json` independently observes GitHub's main/default and `git ls-remote`; the exact Default commit was fetched into its new clone before checkout. `closing.json` independently observes the same Default again. Both private worktrees are clean. The dirty coordinator retains its entry branch, HEAD, and same four pre-existing untracked paths. No initial binary index-file hash exists, so byte-for-byte index equivalence is not claimed.

Target raw source is under `source\<role>\src\Identity\test\InMemory.Test`. The two target source files have identical Git blobs across pins. `source-records.json`, additional linked-source records, raw source/history/instructions, and 42 raw Git commit/tree objects support 262 immutable source membership/absence proofs. PDB compiler sources are checked against those pinned blobs, explicitly allowing checkout CRLF versus Git LF.

`OWNERSHIP.json` gives the precise construction/reuse and reachability boundaries:

* `InMemoryStore<TUser,TRole>` owns the F173 role dictionary and inherits the base user/login dictionaries.
* Native store-test factories construct a real store; their DI registration uses the exact supplied instance as a singleton. Real public managers perform creation, updates, lookups, and removals. The base native test fixture also really opens its unchanged SQLite in-memory connection.
* The supplemental consumer separately creates real store instances through the actual public Identity DI/manager path, verifies singleton reuse across two manager scopes, and never substitutes a dictionary implementation or invokes private callbacks.
* Hosted functional/controller consumers and the DefaultUI testasset's **linked/recompiled** base-store source are source-only here. Two passkey samples have different same-simple-name implementations and are not target consumers.

Source reachability is bounded pinned Identity source/text references plus local LSP navigation, not a complete resolved whole-repository consumer census.

## Requirement coverage

All rows below passed independently on Original62 and whole-Default69. They are **supplemental console rows**, not discovered VSTest tests. Full inputs, each assertion and its observed values are retained in `consumer\Program.cs`, `supplemental-selection.json`, and `evidence\<role>-supplemental-v1.json`.

| Requirement | Evidence |
|---|---|
| F173 role-ID miss/hit, newly allocated equal string, exact stored/replacement reference, repeated lookup, scope reuse, case-distinct control, update and deletion | `F173_RoleId_ManagerIdentityLifecycle` — 25 assertions |
| F174 real manager AddLogin prelookup/insertion, miss/hit, exact reference, repeated/equal-string lookup, provider/key case distinctions, normal update, duplicate rejection, removal/repeated null/re-add/second removal; base and inherited owners | `F174_Login_ManagerIdentityLifecycle_BaseStore`, `F174_Login_ManagerIdentityLifecycle_InheritedStore` — 36 assertions each; `inherited=false/true` recorded |
| F174 actual composed-string key behavior and both-empty tuple lifecycle | `F174_Login_ComposedKeyAndEmptyComponents` — 13 assertions; `("Pipe|Provider","Key")` and `("Pipe","Provider|Key")` alias; `("","")` tested |
| F175 user-ID miss/hit, newly allocated equal string, exact stored/replacement reference, repeated lookup, scope reuse, case-distinct control, update/deletion; base and inherited owners | `F175_UserId_ManagerIdentityLifecycle_BaseStore`, `F175_UserId_ManagerIdentityLifecycle_InheritedStore` — 23 assertions each; `inherited=false/true` recorded |

Each role: **6 rows, 156 passed assertions**. Login removal assigns null at the composed dictionary key in this test store; the real manager re-add exercises that existing-key/null-value path. This is a finite behavior characterization, not a frequency or material-benefit claim.

### Actual existing native tests

“Native” means the unchanged source-built project's real VSTest execution, **not NativeAOT**. Each role ran the same 11 existing Facts twice:

1. `Microsoft.AspNetCore.Identity.InMemory.Test.InMemoryStoreTest.CanRoleFindById`
2. `Microsoft.AspNetCore.Identity.InMemory.Test.InMemoryStoreTest.CanFindById`
3. `Microsoft.AspNetCore.Identity.InMemory.Test.InMemoryUserStoreTest.CanFindById`
4. `Microsoft.AspNetCore.Identity.InMemory.Test.InMemoryStoreTest.CanDeleteUser`
5. `Microsoft.AspNetCore.Identity.InMemory.Test.InMemoryUserStoreTest.CanDeleteUser`
6. `Microsoft.AspNetCore.Identity.InMemory.Test.InMemoryStoreTest.CanCreateUserAddRemoveLogin`
7. `Microsoft.AspNetCore.Identity.InMemory.Test.InMemoryUserStoreTest.CanCreateUserAddRemoveLogin`
8. `Microsoft.AspNetCore.Identity.InMemory.Test.InMemoryStoreTest.CanCreateUserAddLogin`
9. `Microsoft.AspNetCore.Identity.InMemory.Test.InMemoryUserStoreTest.CanCreateUserAddLogin`
10. `Microsoft.AspNetCore.Identity.InMemory.Test.InMemoryStoreTest.AddDupeLoginFails`
11. `Microsoft.AspNetCore.Identity.InMemory.Test.InMemoryUserStoreTest.AddDupeLoginFails`

`native-selection.json` maps every name to its actual public producer and finding. All selected methods are unconditional Facts; **no selected parameterized rows**. Broader suites and all unselected theory rows are unexecuted.

Four raw reports under `evidence\native-<role>-selected` and `evidence\native-<role>-modules` each contain **11 executed/passed, zero failed/skipped**. Thus 44 native row executions, not 44 unique tests. `Reconcile.cjs` freshly parses XML structure, reconciles each result/definition/entry ID, exact discovered name, owning role codeBase/storage, counters and zero errors. No zero-discovery support project is substituted.

## Commands, failures and common compilation

`RESULTS.json.commands` and every `evidence\<label>.receipt.json` retain exact executable, argument-array, checkout, activation, result and stream paths. Successful native graph builds also retain binlogs. The recorder activates **each exact checkout before every dotnet command** and sets the required environment, private scratch/CLI artifacts, no MSBuild node reuse and no shared compiler.

Representative actual passing command shapes, executed in each role (exact expanded filters/paths are in receipts):

```powershell
. .\activate.ps1
dotnet msbuild eng\tools\GenerateFiles\GenerateFiles.csproj -t:GenerateDirectoryBuildFiles -p:Configuration=Release -v:minimal -p:UseSharedCompilation=false /m:2 /nr:false
# exit 0 on both roles

. .\activate.ps1
dotnet build src\Identity\test\InMemory.Test\Microsoft.AspNetCore.Identity.InMemory.Test.csproj --no-restore -c Release -v:minimal -p:UseSharedCompilation=false /m:2 /nr:false -bl:<retained-role-binlog>
# exit 0 on both roles; normal dependency-aware build

. .\activate.ps1
dotnet test src\Identity\test\InMemory.Test\Microsoft.AspNetCore.Identity.InMemory.Test.csproj --no-build --no-restore -c Release -v:minimal -p:UseSharedCompilation=false /m:2 /nr:false --filter <exact-11-name-filter> --logger "trx;LogFileName=<role>-modules.trx" --results-directory <role-results> --diag <role-diagnostic>
# exit 0; 11/11 per role, unhooked actual testhost module-observation replay

. .\activate.ps1
dotnet exec <capsule>\consumer\inputs\compiler\csc.dll /noconfig @<capsule>\consumer\compile.rsp
# exit 0; sole C#13 consumer compilation, Original graph, no warnings

. .\activate.ps1
dotnet exec --depsfile <role-native-output>\Microsoft.AspNetCore.Identity.InMemory.Test.deps.json --runtimeconfig <role-native-output>\Microsoft.AspNetCore.Identity.InMemory.Test.runtimeconfig.json <role-native-output>\AutoPerf.Identity.Contracts.dll <role> <output-json> <identity-json>
# exit 0 on both roles; 6 rows / 156 assertions each
```

Do not rerun these historical native commands to audit the capsule; use `node .\Audit.cjs`.

Six prerequisite failures are retained, three per role: the initial test command could not import missing generated `Directory.Build.props`; GenerateFiles no-restore failed NETSDK1004; after imports, the native test graph no-restore failed NETSDK1004. The exact missing prerequisite was then restored/generated, unchanged, and the normal build/tests succeeded. These initial attempts reached **no test assertions/discovery** and have no TRX results. They are not hidden passing/failed test rows.

The first Node **input preparation** also failed before any C# compilation because it incorrectly assumed DI abstractions were copy-local. Its original script and partial inputs remain under `consumer\preparation-failure-v0`; `failure.json` retains the diagnostic. The original tool response's OS stdout/stderr were not separately redirected, so that one preparation-only failure has a diagnostic summary rather than a claimed original raw stream. Actual net12 framework references provide those abstractions; no package change was needed.

Exactly **one accepted C# compilation**, no failed C# compiler invocation, no failed supplemental execution. All explicit common inputs are retained: source/response, 176 framework references, three normal Original references, and five managed compiler/deps/runtimeconfig/CodeAnalysis files. SDK `12.0.100-alpha.1.26557.102`, `/langversion:13`, no config/default standard library/analyzers/additional files/resources. The accepted DLL/PDB/deps/runtimeconfig are byte-identical across roles. Each execution explicitly overrides the prepared Original common configuration with its own normal owner configs: **Default uses the whole Default owner, public manager producer, dependencies and runtime69, not a TARGET-ONLY owner under Original**.

## Actual identities and graph differences

| Actual observation | Original | Default |
|---|---|---|
| Source-built owner MVID, observed **inside supplemental process** | `d43bb5ed-1a42-49d8-bdb2-5185b29bcdda` | `fa45c1ab-7d49-43c5-8ce5-8fe7492f5c5f` |
| Public manager producer MVID, **supplemental process** | `d4bdeb7c-64b3-4924-af35-fda64ba194e6` | `bc39d8ef-c6ce-44b7-aada-d765b4b9189d` |
| CoreLib MVID, **supplemental** and hash matched to **actual native testhost module** | `818a7b40-a6a6-4d5f-b778-6d2c5d7acf01` | `7d1be881-a554-424e-b653-6b452406a125` |
| Actual native testhost assertion runtime | `12.0.0-alpha.1.26562.105` | `12.0.0-alpha.1.26569.107` |
| Complete normal native output inventory | 271 files / 78,763,200 bytes | 271 files / 78,788,448 bytes |
| Complete shared-runtime directory inventory | 197 files / 81,615,678 bytes | 198 files / 81,973,845 bytes |

The accepted common MVID is `7880271e-929a-45e2-9fb5-daa12b870449`. All normal native outputs remain byte-for-byte unchanged after adding its four companions (275 files per role). There are 97 differing normal native paths and 199 differing shared-runtime union paths. Inventories include **every file**, no prefix exclusion. Normal deps declare 27 source-built project libraries and 66 package libraries per role. These are different whole graphs, **not controlled causal performance pairs**.

The initial process-exit hook produced SDK/VSTest observations, not a native testhost identity receipt. That gap is preserved in `evidence\native-identity-gap-and-replay.json`. The subsequent unchanged, **unhooked** native replay actually sampled the owned testhost and every module exposed by its captured `Process.Modules` snapshot. It caught CoreCLR/CoreLib, `testhost.exe` and `testhost.dll`; the early snapshot did **not** capture the target managed owner/manager as loaded modules. Native owner provenance is the exact native command/TRX codeBase/output inventory/selected PE/PDB, **not a native in-process managed MVID claim**. Actual managed owner/manager MVID observations are from the separate supplemental process.

Both native testhosts load **hostfxr65**, while their actual CoreCLR/CoreLib are 62/69. SDK/VSTest runtime57 or hostfxr65 is not evidence of assertion CoreCLR69. Default's full shared-runtime inventory also includes an extra `hostfxr.dll`; this directory entry is not substituted for the actually loaded hostfxr65. Original SDK comes from the coordinator donor; Default uses existing stable donor `C:\src\ap-F155-d010\.dotnet` through its own junction. No explicit donor-file writes or cleanup were performed; donor-wide before/after equivalence is not attested.

## Attestation and execution limits

* 46 selected artifact records, 15 selected managed images, **seven PE/portable-PDB pairs and all 229 raw documents in those selected PDBs**. Every selected pair, MVID, CodeView association, document checksum and immutable-source bridge is freshly parsed/verified by the auditor. All retained PE files, including compiler/reference copies, are freshly parsed (identical hashes may share a parsed result).
* Selected PE-only framework/DI/testhost/CoreLib/compiler/reference dependencies and native modules have **no selected PDBs**. No document-completeness claim extends to their unselected PDBs. Full normal native/runtime inventories are filename/size/hash inventories, **not all dependency/runtime bytes**.
* All explicit common compile inputs are retained, not a complete SDK/OS/runtime/native compiler-toolchain closure. Actual supplemental native-module recording is explicitly filename-bounded to four names; native testhost snapshots have no filename/prefix exclusion but are sampled, not exhaustive historical module/managed-assembly censuses.
* Unexecuted: other native/theory tests, controller/hosted functional/UI/defaultUI asset/browser/nativeAOT workflows; null/empty IDs, null keys, one-empty-component variants, broader Unicode/culture/concurrency/cardinality matrices and operations outside the explicit rows. No frequency, timing, allocation or material-benefit conclusions.
* `TERMINAL.json`: **23 recorded dotnet roots, 17 successes and six prerequisite failures**, all direct roots, observed descendants and both redirected streams drained; closing PID/creation-time check reports none still owned. Nine closing read-only Git/GitHub children also exited/drained. Earlier synchronous source/proof/Node helper children completed, but no exhaustive historical PID census is claimed. No watchers/workloads remain or were started.

The bounded preparation is sealed for the parent's independent audit and outcome decision. **F173/F174/F175 remain PENDING.**
