# Avoid duplicate TempData conditional-removal lookups

<!-- Thank you for submitting a pull request to our repo. -->

<!-- If this is your first PR in the ASP.NET Core repo, please run through the checklist
below to ensure a smooth review and merge process for your PR. -->

- [x] You've read the [Contributor Guide](https://github.com/dotnet/aspnetcore/blob/main/CONTRIBUTING.md) and [Code of Conduct](https://github.com/dotnet/aspnetcore/blob/main/CODE-OF-CONDUCT.md).
- [x] You've included unit or integration tests for your change, where applicable.
- [x] You've included inline docs for your change, where applicable.
- [x] There's an open issue for the PR that you are making. If you'd like to propose a new feature or change, please open an issue to discuss the change or find an existing issue.

<!-- Once all that is done, you're ready to go. Open the PR with the content below. -->

Avoid a duplicate non-consuming lookup before conditional TempData removal.

## Description

Replace only the initial condition's ContainsKey+Peek with private Data.TryGetValue and the same stored-value-first object.Equals. The public IDictionary.TryGetValue consumes values and is deliberately not used. Preserve the existing branch and final Remove(key), including its Boolean after reentrant equality. F039 Contains, public/protected surface and all other shipping statements stay unchanged. Add eight first-access preservation rows to TempDataTest.

**Measured scope:** prepared loaded actual-owner RemoveAndRestore round trip, **restoration inside timing**.
Not isolated Remove nanoseconds or DI/rendering/cookie/application performance.
Predeclared Match:12:8 uses **16.88/16.66/16.17% less time**, median **16.66%**, **0 B/op unchanged**.
All three comparisons are closed:240rows/1,920raw samples independently matched between stdout and JSON.
Both variants use identical measured harness DLL/PDB; only owner DLL/PDB differ.

**Non-wins retained:** Null:12:0: 0.18% slower; MissingNull:128:0: 1.00% slower; ControlRemoveKey:12:1: 2.27% slower; MissingNull:128:1: 0.05% slower; ControlRemoveKey:128:1: 0.18% slower; MissingNull:12:8: 4.04% slower; ControlRemoveKey:12:8: 0.47% slower; MissingNull:128:8: 0.18% slower; ControlRemoveKey:128:8: 0.10% slower; MissingNull:12:64: 4.18% slower; ControlRemoveKey:12:64: 1.78% slower; MissingNull:128:64: 0.09% slower. Worst individual rows: MissingNull:12:64 comparison 3: 5.67% more time; MissingNull:12:8 comparison 3: 5.63% more time; ControlRemoveKey:12:8 comparison 3: 5.60% more time.
No miss/control median regression reaches 5%; individual adverse observations are still retained. Maximum profile CV36.57%; shared VM, not isolated.
No uniform-speedup, allocation-saving or production-frequency claim.

**Preservation:** 73original+73candidate managed rows pass,0skipped, including every row of
CollectionRemove_UpdatesRetainedValues_WhenFirstAccessTriggersLazyLoad. Three17semantic/40lifecycle
collections match, including independent exact-project relocation/rebuild with no extra timing.
Each characterization checks640repeated selected calls plus80setup/cleanup validation calls.
Both canonical mapped static-SSR browser versions pass8real cookie-backed navigations/0errors.
Ten existing nonquarantined TempDataCookieTest facts pass after dependency-aware Debug build.
String-key Remove is adjacent coverage, not direct collection Remove proof; the selected permanent
surface owns the managed conditional-removal contract. TempDataPersistWithoutAccessing remains
pre-quarantined by dotnet/aspnetcore#70085 and is not counted. This is preservation, not semantic-bug red/green.

**Exact commands and results** (every fresh .NET shell activates `. .\activate.ps1`; complete
logger/results arguments and all selectors are retained in the linked command records):

- `dotnet test src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj --configuration Release --no-restore -m:2 -nr:false --verbosity quiet -p:UseIisNativeAssets=false -p:UseSharedCompilation=false --filter FullyQualifiedName~TempData`: **passed73/73original and73/73candidate,0skipped**.
- `dotnet build src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj --configuration Debug --no-restore -m:2 -nr:false --verbosity quiet -p:UseIisNativeAssets=false -p:UseSharedCompilation=false`: **passed,0warnings/0errors**.
- `dotnet test src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj --configuration Debug --no-build --no-restore -m:2 -nr:false --verbosity quiet -p:UseIisNativeAssets=false --filter FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.CanRemoveTheElementWithRemove`: **passed1/1**, then one combined exact nine-method selector **passed9/9**, every fresh TRX row inspected.
- Targeted `dotnet format whitespace`: **passed,no modifications**. Both canonical sample builds and independent exact-project restore/build: **passed,0warnings/0errors**. Untimed actual BDN discovery40cases and17semantic/40lifecycle records: **passed**, no extra timing.

**Retained failures and limit:** `eng\build.cmd -BuildManaged -NoRestore -NoBuildNative -NoBuildNodeJS -NoBuildJava -NoBuildInstallers -Configuration Release -verbosity:quiet /p:UseIisNativeAssets=false /p:UseSharedCompilation=false /maxcpucount:2 /nodeReuse:false`: **failed,exit1**, unchanged Framework.App.Runtime packaging MSB4057(CreateWixInstaller)/NETSDK1094(ReadyToRun). No repository-wide/packaging pass or successful-initialization sentinel is claimed. Documented focused fallback passed. An earlier untimed added-theory compilation failed CS8632 and was corrected only to the containing project's nullable-disabled style; exact failure/source and later73-row success are retained.

[Immutable evidence and runnable benchmark](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F040/README.md) /
[all40profiles](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F040/comparison-results.md) /
[every exact command and result](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F040/validation-commands.md).

All18selected current-default source files match baseline before edits; this is not a full-current-default
build/dependency-equivalence claim. Timed binaries are not relabeled as compiled from the later
publication commit. No new public API or consumer documentation surface.
Fork-only research draft, not merge-ready; no priority/affinity/power changes.

Fixes jaslawinMs/aspnetcore#@TRACKING_NUMBER@
