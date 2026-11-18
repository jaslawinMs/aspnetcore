# Avoid duplicate new-tree key lookups during rendering

<!-- Thank you for submitting a pull request to our repo. -->

<!-- If this is your first PR in the ASP.NET Core repo, please run through the checklist
below to ensure a smooth review and merge process for your PR. -->

- [x] You've read the [Contributor Guide](https://github.com/dotnet/aspnetcore/blob/main/CONTRIBUTING.md) and [Code of Conduct](https://github.com/dotnet/aspnetcore/blob/main/CODE-OF-CONDUCT.md).
- [x] You've included unit or integration tests for your change, where applicable.
- [x] You've included inline docs for your change, where applicable.
- [x] There's an open issue for the PR that you are making. If you'd like to propose a new feature or change, please open an issue to discuss the change or find an existing issue.

<!-- Once all that is done, you're ready to go. Open the PR with the content below. -->

Avoid duplicate dictionary probes when merging new keyed render-tree siblings.

## Description

Only the new-tree `BuildKeyToInfoLookup` probe/update seam changes. The value ref is consumed before another insertion; miss initialization, existing old index and exact duplicate guard are retained. Old-tree construction, key comparer, pool ownership and public/protected API are unchanged.

**Measured scope:** one complete prepared public-renderer element-list update on this shared Windows x64 .NET 12 VM. Declared `KeyedStable:Integer:256` uses **7.49%, 8.07%, 6.36% less time** (median 7.49%), **74 B/op unchanged**. Exactly three closed source pairs, 40 profiles/member, 240 rows/1,920 raw samples independently matched between stdout and JSON. One identical measured harness; only Components DLL/PDB differ across 106-file images (104 unchanged include harness DLL/PDB, leaving 102 other files).

**Non-wins retained:** empty stable-string median 5.10% slower; integer replacement 16 pair 2 takes 24.25% more time, mixed integer 256 pair 1 takes 8.44% more. Unkeyed 256 controls have medians 0.32%/0.62% slower. No uniform-speedup or structural allocation claim.

**Preservation:** all 83 original+83 candidate existing managed rows pass, 0 skips; after a dependency-aware Debug E2E build, all eight existing KeyTest Selenium facts pass, 0 skips. Both real InteractiveServer browser versions pass five click-driven identity/state/order transitions with 0 page/console errors. Three complete 44 semantic/40 benchmark-lifecycle collections match, including the independently relocated exact seven-file project. No new semantic behavior or new test cases are claimed.

**Commands and results** (every fresh .NET shell activates `. .\activate.ps1`; complete exact invocations are linked below):

- `dotnet test src\Components\Components\test\Microsoft.AspNetCore.Components.Tests.csproj --configuration Release --no-restore -m:2 -nr:false --verbosity quiet -p:UseIisNativeAssets=false -p:UseSharedCompilation=false --filter "FullyQualifiedName~Microsoft.AspNetCore.Components.Test.RenderTreeDiffBuilderTest"`: **passed 83/83 original and 83/83 candidate**, with recorded TRX logger/results arguments.
- `dotnet build src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj --configuration Debug --no-restore -m:2 -nr:false --verbosity quiet -p:UseIisNativeAssets=false -p:UseSharedCompilation=false`: **passed, 0 warnings/0 errors**.
- `dotnet test src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj --configuration Debug --no-build --no-restore -m:2 -nr:false --verbosity quiet -p:UseIisNativeAssets=false --filter "FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.KeyTest.CanReorder"`: **passed 1/1**, then one combined exact seven-method selector **passed 7/7**, all fresh TRX rows inspected.
- Focused `dotnet format whitespace` on the changed file: **passed, no modifications**. Exact standalone seven-file project restore/build and untimed characterization: **passed, 0 warnings/0 errors, 44 semantic+40 lifecycle records**.

[Immutable evidence and runnable benchmark project](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F038/README.md) / [all 40 profile results](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F038/comparison-results.md) / [every exact command and result](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F038/validation-commands.md).

**Historical credit and limitations:** dotnet/aspnetcore#70133 previously tried this new-tree strategy, removed at 95837ac848beda6c84dc17f44be2298dd7414df2; no novelty claim or imported performance numbers. 20/21 selected current-default files match baseline; Renderer event-error/disposed-exception and SDK/version drift remain excluded. Not full-current-main, application, DOM/browser or Mono/AOT performance. Existing Selenium coverage is Debug WebAssembly correctness, not the measured Release image. Shared VM, not isolated; no priority/affinity/power changes. Research draft for this fork, **not merge-ready**.

Fixes #@TRACKING_NUMBER@
