# F187–F189 unchanged-source preparation

**All three findings remain PENDING for coordinator acceptance. No candidate, benchmark or disposition.**

Actual owner: `a46e395c-3977-48fa-b406-4126e927dd1e`. Entry native HOLD was honored and explicitly released by `GO F187-F189-038`; fresh exact-owner policy checks precede recorded starts. No later explicit HOLD was received.

## Frozen source and actual runtime boundaries

| Role | Source actually built/tested | Normal assertion runtime |
|---|---|---|
| Original | `37e809ead5824bc753a1c3d56f11615bdb1296c5` | Actual CoreCLR/CoreLib `12.0.0-alpha.1.26562.105` |
| Default | `83d976704fa0f9aa4361327d1f9d929c93bd9256` | Actual CoreCLR/CoreLib `12.0.0-alpha.1.26569.107` |

Closing independent main observation: `d3483989953ae3cccd773aea5ea04cb0c7198531`; only target commit/tree/blob freshness is proven there. **Newer whole-main binaries were not tested.** Raw checkout and immutable Git bytes are separate; no newline-normalized source checksum is used. There are 48 selected checkout documents per role, plus current contributor guidance.

SDK/compiler prerequisites use `12.0.100-alpha.1.26557.102` read-only. Actual normal testhost/supplemental hostfxr is65, not62/69. SDK/VSTest/compiler and normal assertion runtimes are never pooled. Selected loaded identities, paths, hashes and parsed MVIDs are in `research/metadata-records.json`; native observation gaps are explicit and never filled with supplemental reflection.

## Requirement coverage

| Requirement | Exact actual common case(s) and evidence |
|---|---|
| F187 real directory miss, registration/replacement, identity and actual Razor enumeration | `F187_MissingDirectoryIdentityAndRegisteredState`; `F187_PublicRazorEnumeration_UsesRealProvider` |
| F188 real missing-file path/name/state contract and actual cached consumers | `F188_MissingFileContractAndMutableLookup`; `F188_PublicRazorMissingItemAndCompilerCache`; `F188_PublicFileVersionProvider_CacheAndHelperInvalidation` |
| F189 actual hosted discovery/activation/result boundary, not a fabricated controller call | `F189_ExistingHostedFixture_ExcludesNestedAndExecutesDiscoveredControl` |

Accepted cohort002: six cases and128/128 assertions per role;12 cases and256/256 assertions total, all actually executed. Source and raw per-assertion observations are retained. The common DLL/PDB/deps/runtimeconfig are byte-identical across roles; actual commands explicitly override deps/runtimeconfig with each role's normal graph. Native tests independently passed19 expanded cases per role: nine existing Razor facts and ten existing hosted controller cases, including all four independently reconciled discovery-Theory rows. Native framework assertion counts are **not instrumented**.

### Observed contracts and bounded workload assessment

- **F187:** actual helper missing directories have `Exists=false` and empty generic/nongeneric enumeration. Repeated/different finite misses currently have distinct references; fresh identity is not asserted to be a required public contract. Actual public DI reaches the real recursive Razor file-system producer for a missing root and one missing child; registering that child changes the real returned item set.
- **F188:** the helper returns its **private nested** `TestFileProvider.NotFoundFileInfo`, not public path-bearing `NotFoundFileInfo`. Only `Exists` is usable; `Name`, `PhysicalPath`, `Length`, `IsDirectory`, `LastModified` and `CreateReadStream` throw `NotImplementedException`. Original ordinal keys are retained; only AddFile physical paths are normalized. Equal/case/slash keys, add/replace/delete and prior returned-object state are exercised. Real compiler negative caching reuses descriptors and avoids the repeated equal-path lookup; real file-version caching likewise bounds finite lookup cardinality. Mutating the helper's public `HasChanged` property proves the real consumer's response, **not an OS watcher producer**.
- **F189:** the owning class-library assembly really is an application part, but the nested type is not top-level public and is excluded by real feature/action/service discovery. Two actual nested-route requests return404 with no method/result diagnostics. Two discovered controls activate distinct real transient controllers, consume actual query/header services, and execute actual returned ContentResults to the expected HTTP bodies. The nested target's `Index` and `new EmptyResult` are never directly invoked or misrepresented as hosted execution.
- These are nonshipping test-support fixtures and finite correctness/cardinality observations, **not production frequency, allocation rate, material performance benefit, or singleton/candidate justification**. Other hosts/custom discovery, template compilation, physical filesystem notifications, browser/static assets and application-scale workloads are excluded.

## Native commands and real XML reconciliation

Documented focused project commands were used after each exact checkout activation. All selected final commands below exited0, drained both streams and passed their actual XML cases; they were not accepted from console summaries alone:

- **default-functional-pinned-prerequisite: passed, exit0.** Workdir `C:\src\ap-F187-d038`.
  ```text
  "C:\\src\\ap-F187-d038\\.dotnet\\dotnet.exe" "test" "src\\Mvc\\test\\Mvc.FunctionalTests\\Microsoft.AspNetCore.Mvc.FunctionalTests.csproj" "--no-restore" "-c" "Release" "-v:minimal" "-p:UseIisNativeAssets=false" "-p:UseSharedCompilation=false" "-p:BuildNodeJS=false" "-p:StaticWebAssetsEnabled=false" "/m:2" "/nr:false" "-bl:C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-parallelism\\finding-F187-F189-038\\commands\\raw\\default-functional-pinned.binlog" "--filter" "FullyQualifiedName~ControllerFromServicesTest" "--logger" "trx;LogFileName=default-functional.trx" "--results-directory" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-parallelism\\finding-F187-F189-038\\reports\\default-functional"
  ```

- **default-runtimecompilation-compiler-only: passed, exit0.** Workdir `C:\src\ap-F187-d038`.
  ```text
  "C:\\src\\ap-F187-d038\\.dotnet\\dotnet.exe" "test" "src\\Mvc\\Mvc.Razor.RuntimeCompilation\\test\\Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test.csproj" "--no-restore" "-c" "Release" "-v:minimal" "-p:UseIisNativeAssets=false" "-p:UseSharedCompilation=false" "-p:BuildNodeJS=false" "-p:StaticWebAssetsEnabled=false" "/m:2" "/nr:false" "-bl:C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-parallelism\\finding-F187-F189-038\\commands\\raw\\default-runtimecompilation-compiler-only.binlog" "--filter" "FullyQualifiedName~FileProviderRazorProjectFileSystemTest|FullyQualifiedName~CompileAsync_ReturnsResultWithNullAttribute_IfFileIsNotFoundInFileSystem|FullyQualifiedName~CompileAsync_ReturnsResultWithExpirationToken" "--logger" "trx;LogFileName=default-runtimecompilation.trx" "--results-directory" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-parallelism\\finding-F187-F189-038\\reports\\default-runtimecompilation"
  ```

- **original-functional-pinned-prerequisite: passed, exit0.** Workdir `C:\src\ap-F187-o038`.
  ```text
  "C:\\src\\ap-F187-o038\\.dotnet\\dotnet.exe" "test" "src\\Mvc\\test\\Mvc.FunctionalTests\\Microsoft.AspNetCore.Mvc.FunctionalTests.csproj" "--no-restore" "-c" "Release" "-v:minimal" "-p:UseIisNativeAssets=false" "-p:UseSharedCompilation=false" "-p:BuildNodeJS=false" "-p:StaticWebAssetsEnabled=false" "/m:2" "/nr:false" "-bl:C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-parallelism\\finding-F187-F189-038\\commands\\raw\\original-functional-pinned.binlog" "--filter" "FullyQualifiedName~ControllerFromServicesTest" "--logger" "trx;LogFileName=original-functional.trx" "--results-directory" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-parallelism\\finding-F187-F189-038\\reports\\original-functional"
  ```

- **original-runtimecompilation-compiler-only: passed, exit0.** Workdir `C:\src\ap-F187-o038`.
  ```text
  "C:\\src\\ap-F187-o038\\.dotnet\\dotnet.exe" "test" "src\\Mvc\\Mvc.Razor.RuntimeCompilation\\test\\Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test.csproj" "--no-restore" "-c" "Release" "-v:minimal" "-p:UseIisNativeAssets=false" "-p:UseSharedCompilation=false" "-p:BuildNodeJS=false" "-p:StaticWebAssetsEnabled=false" "/m:2" "/nr:false" "-bl:C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-parallelism\\finding-F187-F189-038\\commands\\raw\\original-runtimecompilation-compiler-only.binlog" "--filter" "FullyQualifiedName~FileProviderRazorProjectFileSystemTest|FullyQualifiedName~CompileAsync_ReturnsResultWithNullAttribute_IfFileIsNotFoundInFileSystem|FullyQualifiedName~CompileAsync_ReturnsResultWithExpirationToken" "--logger" "trx;LogFileName=original-runtimecompilation.trx" "--results-directory" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-parallelism\\finding-F187-F189-038\\reports\\original-runtimecompilation"
  ```

`research/xml-system-reconciliation.json` uses real System.Xml namespace-aware parsing; `research/xml-portable-reconciliation.json` independently reconciles actual XML structure. Every expanded case's name, result, definition, method/codeBase/class, entry, execution ID, run/summary attributes and counters agree. Original/default row sets and identities remain separate.

Native compile boundaries explicitly include `UseIisNativeAssets=false`, `BuildNodeJS=false`, `StaticWebAssetsEnabled=false`, disabled shared compilation/node reuse and exact private package/scratch/output graphs. Missing generated imports/task/assets, static-asset manifests and MessagePack prerequisite failures are preserved before repairs. Pinned MessagePack `be938cda59c823ee4a672d45d1d7d642a3f34396` was cloned into independent owned submodule repositories; no donor/coordinator source or output was initialized or changed.

## Every common compilation and rejected preparation cohort

There were **two successful common C#13 compilations, zero failed common compilations**, not one. Compile001 and002 exact inputs/arguments and all warnings are retained. Initial two input-preparation failures and one rejected image/dependency preparation happened before common execution and are preserved separately.

Cohort001 actually ran six rows per role: five passed and the hosted diagnostic row failed after118/119 successful assertions. It incorrectly equated After-event `Controller` with the activated instance. Unchanged real `ControllerActionInvoker` passes `controllerContext` into that field; source/PDB and corrected real producer observations are retained. Cohort002 uses Before-event activation identities, explicitly verifies actual After context identity, and follows returned ContentResult identity through real result execution. No shipping code was changed. Earlier sources, compiler responses, binaries/PDBs, image inventories, failures and command streams remain available under `preparation-history/common-cohort-001` and raw reports.

Two normal native graph cohorts have13 byte-different requested overlaps per role; no source/semantic equivalence or single cause is inferred from that fact. The rejected wholesale dependency merge exposed an Azure.Core metadata mismatch. Accepted common images use each **exact successful native Functional graph**, adding only absent `Microsoft.AspNetCore.Mvc.Views.TestCommon/12.0.0-dev`. They do not merge unrelated earlier dependency selections. Every image choice/inventory and actual managed load identity is explicit.

## Portable evidence and process boundary

Fresh selected capture: 58 PE records, 50 managed MVID records, 36 real PE/portable-PDB associations, 96 selected raw-source checks. PDB metadata has 3930 document rows across cohorts; **this is not all-document raw-source coverage**. 211 explicit compiler/reference input PEs are additionally retained and reparsed by the audit. Selected dependencies/tool/runtime bytes do **not** attest omitted compiler, SDK, runtime or OS closures.

All recorded pre-seal command roots have durable started/terminal identities, exact arguments/workdir/environment-selection, real exits and drained stdout/stderr. Scoped roots/wrappers/observed descendants use PID **plus creation identity**. Earlier progress-only PID reuse and automatic PowerShell DateTime conversion mistakes/corrections are retained; they are not terminal proof. The final snapshot checks prior recorded creations, while explicitly excluding its own in-flight helper/wrapper until its recorder finishes. Bounded sampling is not a full historical OS process tree. No broad process-name stopping or machine-wide configuration changes were performed.

The capsule contains selected accepted inputs plus full preserved rejected preparation cohorts. Normal accepted whole images, package/CLI/scratch graphs, native build binlogs and isolated source checkouts remain outside; their inventories/command provenance are not mislabeled as retained complete toolchain closure. All raw text failure/command reports are retained.

## Offline verification and seal

Only `MANIFEST.json` and `MANIFEST.sha256` are self exclusions. `SEALED.json` and finalizer/audit command receipts are outside the immutable capsule. Run the exact available Node tool with:

```powershell
node --permission --allow-fs-read="<absolute capsule path>" --no-addons "<absolute capsule path>\Audit.mjs"
```

The audit requires capsule-only filesystem reads, denied filesystem writes/children, no addons, no dependency install, and uses Node built-ins only. It reparses raw Git membership, all native XML/expanded identities/counters, selected actual PE/PDB/source checks, common input/row/assertion identities, native-vs-supplemental load boundaries, every recorded command closure and entire manifest membership/hash. Actual terminal audit commands/results and the post-audit whole-capsule rehash are bound by the outside `SEALED.json`. All F187/F188/F189 remain **PENDING**.
