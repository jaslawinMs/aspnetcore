# Exact F089 commands and results

Every dotnet shell activated `. .\activate.ps1` from C:\src\aspnetcore. CPU-heavy work was serialized; builds request -m:2. The combined native/desktop budget is closed at 3/3.

## browser-after-release-command.json: exit 0; precise validation boundary is stated in README and raw record

Exact raw record: [browser-after-release-command.json](browser-after-release-command.json).
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F089-browser-probe.mjs' 'http://127.0.0.1:50351' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F089\browser-after-release.json' 'after-release' '911ba917-1367-4143-9826-c4dbc57df134' 'A8DAEF15E6F8849610E369C92EA465EF61ECF3C1F15DEC46652242624B0E5C4D' 'reuse' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F089\native-before-release-attempt-2.json'
```

## browser-before-attempt-1-command.json: failed, exit 1; preserved prerequisite/collection failure, not credited as completed assertion or comparison

Exact raw record: [browser-before-attempt-1-command.json](browser-before-attempt-1-command.json).
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F089-browser-probe.mjs' 'http://127.0.0.1:50198' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F089\browser-before.json' 'before' '5828d68d-10ad-485a-8ac1-cb30c04a0fb9' '8FE532E5D744A1E00FE195B838008740C82B3F6125B951BCD3272F8482C501ED'
```

## browser-before-attempt-2-command.json: failed, exit 1; preserved prerequisite/collection failure, not credited as completed assertion or comparison

Exact raw record: [browser-before-attempt-2-command.json](browser-before-attempt-2-command.json).
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F089-browser-probe.mjs' 'http://127.0.0.1:64664' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F089\browser-before.json' 'before' '5828d68d-10ad-485a-8ac1-cb30c04a0fb9' '8FE532E5D744A1E00FE195B838008740C82B3F6125B951BCD3272F8482C501ED'
```

## browser-before-command.json: exit 0; precise validation boundary is stated in README and raw record

Exact raw record: [browser-before-command.json](browser-before-command.json).
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F089-browser-probe.mjs' 'http://127.0.0.1:64664' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F089\browser-before.json' 'before' '5828d68d-10ad-485a-8ac1-cb30c04a0fb9' '8FE532E5D744A1E00FE195B838008740C82B3F6125B951BCD3272F8482C501ED'
```

## browser-before-release-attempt-2-command.json: exit 0; precise validation boundary is stated in README and raw record

Exact raw record: [browser-before-release-attempt-2-command.json](browser-before-release-attempt-2-command.json).
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F089-browser-probe.mjs' 'http://127.0.0.1:60966' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F089\browser-before-release-attempt-2.json' 'before-release-attempt-2' '29e3096b-a83e-4b36-8f6f-85726d3c0c51' '938F6E34F2194933D421C12EDE6C56FFA5AD97D815FA1A430F237BEC52C7792B' 'calibrate'
```

## browser-before-release-command.json: failed, exit 1; preserved prerequisite/collection failure, not credited as completed assertion or comparison

Exact raw record: [browser-before-release-command.json](browser-before-release-command.json).
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F089-browser-probe.mjs' 'http://127.0.0.1:60966' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F089\browser-before-release.json' 'before-release' '29e3096b-a83e-4b36-8f6f-85726d3c0c51' '938F6E34F2194933D421C12EDE6C56FFA5AD97D815FA1A430F237BEC52C7792B' 'calibrate'
```

## e2e-build-after-command.json: exit 0; precise validation boundary is stated in README and raw record

Exact raw record: [e2e-build-after-command.json](e2e-build-after-command.json).
```powershell
dotnet 'build' 'src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj' '-c' 'Debug' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=true' '-p:BuildJava=false'
```

## e2e-build-before-command.json: exit 0; precise validation boundary is stated in README and raw record

Exact raw record: [e2e-build-before-command.json](e2e-build-before-command.json).
```powershell
dotnet 'build' 'src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj' '-c' 'Debug' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=true' '-p:BuildJava=false'
```

## e2e-test-after-command.json: exit 0; precise validation boundary is stated in README and raw record

Exact raw record: [e2e-test-after-command.json](e2e-test-after-command.json).
```powershell
dotnet 'test' 'src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj' '-c' 'Debug' '--no-build' '--no-restore' '-v:n' '-m:2' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.RoutingTest.ResetsScrollPositionWhenPerformingInternalNavigation_ProgrammaticNavigation|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.RoutingTest.AnchorWithHrefContainingHashAnotherPage_NavigatesToPageAndScrollsToElement|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.RoutingTest.NavigationManagerNavigateToAnotherUrlWithHash_NavigatesToPageAndScrollsToElement|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.RoutingTest.NavigationManagerNavigateToSameUrlWithHash_ScrollsToElementOnTheSamePage|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.RoutingTest.NavigationManagerNavigateToSameUrlWithQueryAndHash_ScrollsToElementOnTheSamePage' '--logger' 'trx;LogFileName=F089-routing-after.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F089\e2e-results-after' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=true' '-p:BuildJava=false'
```

## e2e-test-before-command.json: exit 0; precise validation boundary is stated in README and raw record

Exact raw record: [e2e-test-before-command.json](e2e-test-before-command.json).
```powershell
dotnet 'test' 'src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj' '-c' 'Debug' '--no-build' '--no-restore' '-v:n' '-m:2' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.RoutingTest.ResetsScrollPositionWhenPerformingInternalNavigation_ProgrammaticNavigation|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.RoutingTest.AnchorWithHrefContainingHashAnotherPage_NavigatesToPageAndScrollsToElement|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.RoutingTest.NavigationManagerNavigateToAnotherUrlWithHash_NavigatesToPageAndScrollsToElement|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.RoutingTest.NavigationManagerNavigateToSameUrlWithHash_ScrollsToElementOnTheSamePage|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.RoutingTest.NavigationManagerNavigateToSameUrlWithQueryAndHash_ScrollsToElementOnTheSamePage' '--logger' 'trx;LogFileName=F089-routing-before.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F089\e2e-results-before' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=true' '-p:BuildJava=false'
```

## format-whitespace-command.json: exit 0; precise validation boundary is stated in README and raw record

Exact raw record: [format-whitespace-command.json](format-whitespace-command.json).
```powershell
dotnet 'format' 'whitespace' 'src\Components\WebAssembly\WebAssembly\src\Microsoft.AspNetCore.Components.WebAssembly.csproj' '--include' 'C:\src\aspnetcore\src\Components\WebAssembly\WebAssembly\src\Services\WebAssemblyScrollToLocationHash.cs' '--verify-no-changes' '--no-restore' '--verbosity' 'diagnostic'
```

## harness-build-after-command.json: exit 0; precise validation boundary is stated in README and raw record

Exact raw record: [harness-build-after-command.json](harness-build-after-command.json).
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F089\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=true' '-p:BuildJava=false'
```

## harness-build-before-command.json: exit 0; precise validation boundary is stated in README and raw record

Exact raw record: [harness-build-before-command.json](harness-build-before-command.json).
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F089\harness\AutoPerf.Benchmarks.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=true' '-p:BuildJava=false'
```

## harness-restore-before-command.json: exit 0; precise validation boundary is stated in README and raw record

Exact raw record: [harness-restore-before-command.json](harness-restore-before-command.json).
```powershell
dotnet 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F089\harness\AutoPerf.Benchmarks.csproj' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=true' '-p:BuildJava=false'
```

## sample-build-before-attempt-1-command.json: exit 0; precise validation boundary is stated in README and raw record

Exact raw record: [sample-build-before-attempt-1-command.json](sample-build-before-attempt-1-command.json).
```powershell
dotnet 'build' 'src\Components\WebAssembly\Samples\BlazorWebAssemblyStandalone\BlazorWebAssemblyStandalone.csproj' '-c' 'Debug' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## sample-build-before-final-command.json: exit 0; precise validation boundary is stated in README and raw record

Exact raw record: [sample-build-before-final-command.json](sample-build-before-final-command.json).
```powershell
dotnet 'build' 'src\Components\WebAssembly\Samples\BlazorWebAssemblyStandalone\BlazorWebAssemblyStandalone.csproj' '-c' 'Debug' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:BuildJava=false'
```

## sample-build-before-with-js-command.json: exit 0; precise validation boundary is stated in README and raw record

Exact raw record: [sample-build-before-with-js-command.json](sample-build-before-with-js-command.json).
```powershell
dotnet 'build' 'src\Components\WebAssembly\Samples\BlazorWebAssemblyStandalone\BlazorWebAssemblyStandalone.csproj' '-c' 'Debug' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=true' '-p:BuildJava=false'
```

## sample-build-native-after-command.json: exit 0; precise validation boundary is stated in README and raw record

Exact raw record: [sample-build-native-after-command.json](sample-build-native-after-command.json).
```powershell
dotnet 'build' 'src\Components\WebAssembly\Samples\BlazorWebAssemblyStandalone\BlazorWebAssemblyStandalone.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=true' '-p:BuildJava=false'
```

## sample-build-native-before-attempt-2-command.json: exit 0; precise validation boundary is stated in README and raw record

Exact raw record: [sample-build-native-before-attempt-2-command.json](sample-build-native-before-attempt-2-command.json).
```powershell
dotnet 'build' 'src\Components\WebAssembly\Samples\BlazorWebAssemblyStandalone\BlazorWebAssemblyStandalone.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=true' '-p:BuildJava=false'
```

## sample-build-native-before-command.json: failed, exit 1; preserved prerequisite/collection failure, not credited as completed assertion or comparison

Exact raw record: [sample-build-native-before-command.json](sample-build-native-before-command.json).
```powershell
dotnet 'build' 'src\Components\WebAssembly\Samples\BlazorWebAssemblyStandalone\BlazorWebAssemblyStandalone.csproj' '-c' 'Release' '--no-restore' '-v:q' '-m:2' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=true' '-p:BuildJava=false'
```

## sample-server-before-2-command.json: read the raw startup/collection record and paired log; no success inferred

Exact raw record: [sample-server-before-2-command.json](sample-server-before-2-command.json).
```powershell
dotnet 'run' '--project' 'src\Components\WebAssembly\Samples\BlazorWebAssemblyStandalone\BlazorWebAssemblyStandalone.csproj' '--no-build' '--no-restore' '--configuration' 'Debug' '--no-launch-profile' '--' '--urls' 'http://127.0.0.1:64659'
```

## sample-server-before-command.json: read the raw startup/collection record and paired log; no success inferred

Exact raw record: [sample-server-before-command.json](sample-server-before-command.json).
```powershell
dotnet 'run' '--project' 'src\Components\WebAssembly\Samples\BlazorWebAssemblyStandalone\BlazorWebAssemblyStandalone.csproj' '--no-build' '--no-restore' '--configuration' 'Debug' '--no-launch-profile' '--' '--urls' 'http://127.0.0.1:50193'
```

## sample-server-native-after-2-command.json: read the raw startup/collection record and paired log; no success inferred

Exact raw record: [sample-server-native-after-2-command.json](sample-server-native-after-2-command.json).
```powershell
dotnet 'run' '--project' 'src\Components\WebAssembly\Samples\BlazorWebAssemblyStandalone\BlazorWebAssemblyStandalone.csproj' '--no-build' '--no-restore' '--configuration' 'Release' '--no-launch-profile' '--' '--urls' 'http://127.0.0.1:64659'
```

## sample-server-native-after-command.json: read the raw startup/collection record and paired log; no success inferred

Exact raw record: [sample-server-native-after-command.json](sample-server-native-after-command.json).
```powershell
dotnet 'run' '--project' 'src\Components\WebAssembly\Samples\BlazorWebAssemblyStandalone\BlazorWebAssemblyStandalone.csproj' '--no-build' '--no-restore' '--configuration' 'Release' '--no-launch-profile' '--' '--urls' 'http://127.0.0.1:64659'
```

## sample-server-native-before-command.json: read the raw startup/collection record and paired log; no success inferred

Exact raw record: [sample-server-native-before-command.json](sample-server-native-before-command.json).
```powershell
dotnet 'run' '--project' 'src\Components\WebAssembly\Samples\BlazorWebAssemblyStandalone\BlazorWebAssemblyStandalone.csproj' '--no-build' '--no-restore' '--configuration' 'Release' '--no-launch-profile' '--' '--urls' 'http://127.0.0.1:64659'
```

## round-1-before: passed, exit 0, all 18 measured cases/eight result iterations

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F089\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*HashDelimiterBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F089\round-1-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-1-after: passed, exit 0, all 18 measured cases/eight result iterations

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F089\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*HashDelimiterBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F089\round-1-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-2-after: passed, exit 0, all 18 measured cases/eight result iterations

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F089\binaries\after\AutoPerf.Benchmarks.dll' '--filter' '*HashDelimiterBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F089\round-2-after' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## round-2-before: passed, exit 0, all 18 measured cases/eight result iterations

```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F089\binaries\before\AutoPerf.Benchmarks.dll' '--filter' '*HashDelimiterBenchmark*' '--inProcess' '--exporters' 'json' 'csv' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F089\round-2-before' '--job' 'Short' '--warmupCount' '3' '--iterationCount' '8' '--iterationTime' '100' '--outliers' 'DontRemove'
```

## Exact existing Client routing commands: original 5/5 pass, selected 5/5 pass, no skips

**before: all five actual TRX assertions passed; exit 0.**
```powershell
dotnet 'test' 'src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj' '-c' 'Debug' '--no-build' '--no-restore' '-v:n' '-m:2' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.RoutingTest.ResetsScrollPositionWhenPerformingInternalNavigation_ProgrammaticNavigation|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.RoutingTest.AnchorWithHrefContainingHashAnotherPage_NavigatesToPageAndScrollsToElement|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.RoutingTest.NavigationManagerNavigateToAnotherUrlWithHash_NavigatesToPageAndScrollsToElement|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.RoutingTest.NavigationManagerNavigateToSameUrlWithHash_ScrollsToElementOnTheSamePage|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.RoutingTest.NavigationManagerNavigateToSameUrlWithQueryAndHash_ScrollsToElementOnTheSamePage' '--logger' 'trx;LogFileName=F089-routing-before.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F089\e2e-results-before' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=true' '-p:BuildJava=false'
```

**after: all five actual TRX assertions passed; exit 0.**
```powershell
dotnet 'test' 'src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj' '-c' 'Debug' '--no-build' '--no-restore' '-v:n' '-m:2' '--filter' 'FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.RoutingTest.ResetsScrollPositionWhenPerformingInternalNavigation_ProgrammaticNavigation|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.RoutingTest.AnchorWithHrefContainingHashAnotherPage_NavigatesToPageAndScrollsToElement|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.RoutingTest.NavigationManagerNavigateToAnotherUrlWithHash_NavigatesToPageAndScrollsToElement|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.RoutingTest.NavigationManagerNavigateToSameUrlWithHash_ScrollsToElementOnTheSamePage|FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.RoutingTest.NavigationManagerNavigateToSameUrlWithQueryAndHash_ScrollsToElementOnTheSamePage' '--logger' 'trx;LogFileName=F089-routing-after.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F089\e2e-results-after' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=true' '-p:BuildJava=false'
```

Original/selected dependency-aware Debug E2E builds pass with zero warnings/errors. Original corrected and selected Release sample/harness builds pass with zero warnings/errors. Initial native temporary CA1305 compilation failed before its invariant-culture correction; both logs are retained. Source/PDB/PE verification commands and raw records are retained; their omitted input binaries are not independently reverified by the public-record auditor.

Original Debug and original/selected successful Release canonical probes pass all ten actual changed-path owner cases plus same-page JS-only control, with zero real errors/failed requests. Initial bootstrap/event-property/native-Boolean-collection failures are not successes; see README and retained logs. Native custom calipers retain 80 results per phase, exact reused input/counts and unchanged allocation. This is one native pair, not BDN or whole-navigation evidence.

`node .\reproduce-analysis.mjs . --verify` passes: 72 desktop outcomes/setups, 216 actual console warmups, 576 desktop/160 native result samples, source hash/PDB-record agreement and documented closure/parity records. `F089-xml-audit.ps1 -RunRoot <package> -Verify` passes all 10 unskipped actual TRX rows. Scoped owner whitespace command and `git diff --check` pass, exit 0.
