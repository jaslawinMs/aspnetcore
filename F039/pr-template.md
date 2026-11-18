# Avoid duplicate lookups in TempData collection containment

<!-- Thank you for submitting a pull request to our repo. -->

<!-- If this is your first PR in the ASP.NET Core repo, please run through the checklist
below to ensure a smooth review and merge process for your PR. -->

- [x] You've read the [Contributor Guide](https://github.com/dotnet/aspnetcore/blob/main/CONTRIBUTING.md) and [Code of Conduct](https://github.com/dotnet/aspnetcore/blob/main/CODE-OF-CONDUCT.md).
- [x] You've included unit or integration tests for your change, where applicable.
- [x] You've included inline docs for your change, where applicable.
- [x] There's an open issue for the PR that you are making. If you'd like to propose a new feature or change, please open an issue to discuss the change or find an existing issue.

<!-- Once all that is done, you're ready to go. Open the PR with the content below. -->

Avoid repeated dictionary probes without consuming TempData values.

## Description

Replace the hit path's ContainsKey+Peek with the private Data.TryGetValue and the same object.Equals. The public IDictionary.TryGetValue consumes values and is deliberately not used. Preserve lazy loading, null/missing/casing/equality and retention. Add eight lazy-load theory rows and one consumed-value preservation fact. F040 Remove and public/protected surface are unchanged.

**Measured scope:** prepared loaded actual-owner collection lookup, not DI/rendering/cookie/application timing.
Predeclared Match:12:8 uses **45.83/45.62% less time**, median **45.73%**, **0B/op unchanged**.
Three authorizations are closed: first failed before timing (sealed BDN fixture), two completed comparisons.
Both harness epochs/seals and the failed budget entry remain intact.160rows/1,280raw samples are independently
matched between stdout and JSON; original/candidate use the identical corrected harness, only owner DLL/PDB differ.

**Non-wins retained:** MissingNull:12:0: 2.56% slower; Match:128:0: 4.64% slower; Null:128:0: 2.32% slower; ControlContainsKey:12:1: 0.76% slower; ControlContainsKey:128:1: 0.06% slower; MissingNull:12:8: 3.61% slower; ControlContainsKey:12:8: 1.53% slower; MissingNull:128:8: 2.18% slower; ControlContainsKey:128:8: 0.15% slower; ControlContainsKey:12:64: 0.14% slower. Worst individual rows: Match:128:0 attempt 3: 10.19% more time; MissingNull:12:8 attempt 3: 6.44% more time; ControlContainsKey:12:1 attempt 3: 4.08% more time.
Maximum profile CV29.37%; shared VM, not isolated. No uniform-speedup or allocation-saving claim.

**Preservation:** 74original+74candidate managed rows pass,0skipped, including all eight
CollectionContains_PreservesValues_WhenFirstAccessTriggersLazyLoad rows and CollectionContains_DoesNotRetainConsumedValue.
Five15semantic/40lifecycle collections match, including independent exact-project relocation/rebuild.
Both canonical mapped static-SSR browser versions pass8real cookie-backed navigations/0errors.
Ten existing nonquarantined TempDataCookieTest facts pass after dependency-aware Debug build;
TempDataPersistWithoutAccessing remains pre-quarantined by dotnet/aspnetcore#70085 and is not counted.
This is preservation, not a semantic-bug red/green claim.

**Exact commands and results** (every fresh .NET shell activates `. .\activate.ps1`; complete
logger/results arguments and all selectors are retained in the linked command records):

- `dotnet test src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj --configuration Release --no-restore -m:2 -nr:false --verbosity quiet -p:UseIisNativeAssets=false -p:UseSharedCompilation=false --filter FullyQualifiedName~TempData`: **passed74/74original and74/74candidate,0skipped**.
- `dotnet build src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj --configuration Debug --no-restore -m:2 -nr:false --verbosity quiet -p:UseIisNativeAssets=false -p:UseSharedCompilation=false`: **passed,0warnings/0errors**.
- `dotnet test src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj --configuration Debug --no-build --no-restore -m:2 -nr:false --verbosity quiet -p:UseIisNativeAssets=false --filter FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.CanCheckIfTempDataContainsKey`: **passed1/1**, then one combined exact nine-method selector **passed9/9**, every fresh TRX row inspected.
- Targeted `dotnet format whitespace`: **passed,no modifications**. Both canonical sample builds and corrected exact-project independent restore/build: **passed,0warnings/0errors**. Untimed actual BDN discovery40cases and15semantic/40lifecycle records: **passed**, no extra timing.

[Immutable evidence and runnable benchmark](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F039/README.md) /
[all40profiles](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F039/comparison-results.md) /
[every exact command and result](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F039/validation-commands.md).

All18selected current-default source files match baseline before edits; this is not a full-current-default
build/dependency-equivalence claim. Runtime/source/PE/PDB limitations and relevant design/history are retained.
Not application/cookie/browser/Mono/AOT performance, production-frequency evidence, or merge-ready.
Fork-only research draft; no priority/affinity/power changes.

Fixes #@TRACKING_NUMBER@
