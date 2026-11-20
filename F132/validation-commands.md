# Actual managed commands and results

These 22 attempts include every missing-assets failure and the stale-restoration test attempt; inspect the README before interpreting a zero exit as owner restoration. The six successful comparison commands/results are linked separately in the README. No browser, packaging or full-repository command was run.

## candidate-characterize-001

Activation: `. .\activate.ps1` in `C:\src\aspnetcore`.

```text
"C:\src\aspnetcore\.dotnet\dotnet.exe" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\images-v2\\Candidate\\bin\\AutoPerf.CascadingHashes.dll" "characterize" "Candidate" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\validation\\candidate-characterize-001\\observations.json"
```

Actual exit: **0**. [stdout](validation/candidate-characterize-001/stdout.txt), [stderr](validation/candidate-characterize-001/stderr.txt), [receipt](validation/candidate-characterize-001/result.json).

## candidate-tests-001

Activation: `. .\activate.ps1` in `C:\src\aspnetcore`.

```text
"C:\src\aspnetcore\.dotnet\dotnet.exe" "test" "src\\Components\\Components\\test\\Microsoft.AspNetCore.Components.Tests.csproj" "--no-restore" "--configuration" "Release" "-p:UseIisNativeAssets=false" "-p:BuildNodeJS=false" "-p:StaticWebAssetsEnabled=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false" "--filter" "FullyQualifiedName~Microsoft.AspNetCore.Components.CascadingParameterTest|FullyQualifiedName~Microsoft.AspNetCore.Components.CascadingParameterStateTest|FullyQualifiedName~Microsoft.AspNetCore.Components.PersistentStateValueProviderTests|FullyQualifiedName~Microsoft.AspNetCore.Components.PersistentValueProviderComponentSubscriptionTests|FullyQualifiedName~Microsoft.AspNetCore.Components.PersistentStateValueProviderKeyResolverTests" "--logger" "trx;LogFileName=F132-Candidate.trx" "--results-directory" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\validation\\candidate-tests-001\\test-results"
```

Actual exit: **0**. [stdout](validation/candidate-tests-001/stdout.txt), [stderr](validation/candidate-tests-001/stderr.txt), [receipt](validation/candidate-tests-001/result.json).

## default-characterize-001

Activation: `. .\activate.ps1` in `C:\src\autoperf-F042-default`.

```text
"C:\src\autoperf-F042-default\.dotnet\dotnet.exe" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\images-v2\\Default\\bin\\AutoPerf.CascadingHashes.dll" "characterize" "Default" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\validation\\default-characterize-001\\observations.json"
```

Actual exit: **0**. [stdout](validation/default-characterize-001/stdout.txt), [stderr](validation/default-characterize-001/stderr.txt), [receipt](validation/default-characterize-001/result.json).

## default-restore-001

Activation: `. .\activate.ps1` in `C:\src\autoperf-F042-default`.

```text
"C:\src\autoperf-F042-default\.dotnet\dotnet.exe" "restore" "src\\Components\\Components\\test\\Microsoft.AspNetCore.Components.Tests.csproj" "-p:UseIisNativeAssets=false" "-p:BuildNodeJS=false" "-p:StaticWebAssetsEnabled=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false"
```

Actual exit: **0**. [stdout](validation/default-restore-001/stdout.txt), [stderr](validation/default-restore-001/stderr.txt), [receipt](validation/default-restore-001/result.json).

## default-tests-001

Activation: `. .\activate.ps1` in `C:\src\autoperf-F042-default`.

```text
"C:\src\autoperf-F042-default\.dotnet\dotnet.exe" "test" "src\\Components\\Components\\test\\Microsoft.AspNetCore.Components.Tests.csproj" "--no-restore" "--configuration" "Release" "-p:UseIisNativeAssets=false" "-p:BuildNodeJS=false" "-p:StaticWebAssetsEnabled=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false" "--filter" "FullyQualifiedName~Microsoft.AspNetCore.Components.CascadingParameterTest|FullyQualifiedName~Microsoft.AspNetCore.Components.CascadingParameterStateTest|FullyQualifiedName~Microsoft.AspNetCore.Components.PersistentStateValueProviderTests|FullyQualifiedName~Microsoft.AspNetCore.Components.PersistentValueProviderComponentSubscriptionTests|FullyQualifiedName~Microsoft.AspNetCore.Components.PersistentStateValueProviderKeyResolverTests" "--logger" "trx;LogFileName=F132-Default.trx" "--results-directory" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\validation\\default-tests-001\\test-results"
```

Actual exit: **1**. [stdout](validation/default-tests-001/stdout.txt), [stderr](validation/default-tests-001/stderr.txt), [receipt](validation/default-tests-001/result.json).

## default-tests-002

Activation: `. .\activate.ps1` in `C:\src\autoperf-F042-default`.

```text
"C:\src\autoperf-F042-default\.dotnet\dotnet.exe" "test" "src\\Components\\Components\\test\\Microsoft.AspNetCore.Components.Tests.csproj" "--no-restore" "--configuration" "Release" "-p:UseIisNativeAssets=false" "-p:BuildNodeJS=false" "-p:StaticWebAssetsEnabled=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false" "--filter" "FullyQualifiedName~Microsoft.AspNetCore.Components.CascadingParameterTest|FullyQualifiedName~Microsoft.AspNetCore.Components.CascadingParameterStateTest|FullyQualifiedName~Microsoft.AspNetCore.Components.PersistentStateValueProviderTests|FullyQualifiedName~Microsoft.AspNetCore.Components.PersistentValueProviderComponentSubscriptionTests|FullyQualifiedName~Microsoft.AspNetCore.Components.PersistentStateValueProviderKeyResolverTests" "--logger" "trx;LogFileName=F132-Default.trx" "--results-directory" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\validation\\default-tests-002\\test-results"
```

Actual exit: **0**. [stdout](validation/default-tests-002/stdout.txt), [stderr](validation/default-tests-002/stderr.txt), [receipt](validation/default-tests-002/result.json).

## harness-build-001

Activation: `. .\activate.ps1` in `C:\src\aspnetcore`.

```text
"C:\src\aspnetcore\.dotnet\dotnet.exe" "build" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132-common\\AutoPerf.CascadingHashes.csproj" "--no-restore" "--configuration" "Release" "-p:UseIisNativeAssets=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false"
```

Actual exit: **1**. [stdout](validation/harness-build-001/stdout.txt), [stderr](validation/harness-build-001/stderr.txt), [receipt](validation/harness-build-001/result.json).

## harness-build-002

Activation: `. .\activate.ps1` in `C:\src\aspnetcore`.

```text
"C:\src\aspnetcore\.dotnet\dotnet.exe" "build" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132-common\\AutoPerf.CascadingHashes.csproj" "--no-restore" "--configuration" "Release" "-p:UseIisNativeAssets=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false"
```

Actual exit: **0**. [stdout](validation/harness-build-002/stdout.txt), [stderr](validation/harness-build-002/stderr.txt), [receipt](validation/harness-build-002/result.json).

## harness-build-003

Activation: `. .\activate.ps1` in `C:\src\aspnetcore`.

```text
"C:\src\aspnetcore\.dotnet\dotnet.exe" "build" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132-common\\AutoPerf.CascadingHashes.csproj" "--no-restore" "--configuration" "Release" "-p:UseIisNativeAssets=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false"
```

Actual exit: **0**. [stdout](validation/harness-build-003/stdout.txt), [stderr](validation/harness-build-003/stderr.txt), [receipt](validation/harness-build-003/result.json).

## harness-restore-001

Activation: `. .\activate.ps1` in `C:\src\aspnetcore`.

```text
"C:\src\aspnetcore\.dotnet\dotnet.exe" "restore" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132-common\\AutoPerf.CascadingHashes.csproj" "-p:UseIisNativeAssets=false" "/m:2" "/nr:false"
```

Actual exit: **0**. [stdout](validation/harness-restore-001/stdout.txt), [stderr](validation/harness-restore-001/stderr.txt), [receipt](validation/harness-restore-001/result.json).

## original-characterize-001

Activation: `. .\activate.ps1` in `C:\src\aspnetcore`.

```text
"C:\src\aspnetcore\.dotnet\dotnet.exe" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\images\\Original\\bin\\AutoPerf.CascadingHashes.dll" "characterize" "Original" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\validation\\original-characterize-001\\observations.json"
```

Actual exit: **2**. [stdout](validation/original-characterize-001/stdout.txt), [stderr](validation/original-characterize-001/stderr.txt), [receipt](validation/original-characterize-001/result.json).

## original-characterize-002

Activation: `. .\activate.ps1` in `C:\src\aspnetcore`.

```text
"C:\src\aspnetcore\.dotnet\dotnet.exe" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\images-v2\\Original\\bin\\AutoPerf.CascadingHashes.dll" "characterize" "Original" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\validation\\original-characterize-002\\observations.json"
```

Actual exit: **0**. [stdout](validation/original-characterize-002/stdout.txt), [stderr](validation/original-characterize-002/stderr.txt), [receipt](validation/original-characterize-002/result.json).

## original-tests-001

Activation: `. .\activate.ps1` in `C:\src\aspnetcore`.

```text
"C:\src\aspnetcore\.dotnet\dotnet.exe" "test" "src\\Components\\Components\\test\\Microsoft.AspNetCore.Components.Tests.csproj" "--no-restore" "--configuration" "Release" "-p:UseIisNativeAssets=false" "-p:BuildNodeJS=false" "-p:StaticWebAssetsEnabled=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false" "--filter" "FullyQualifiedName~Microsoft.AspNetCore.Components.CascadingParameterTest|FullyQualifiedName~Microsoft.AspNetCore.Components.CascadingParameterStateTest|FullyQualifiedName~Microsoft.AspNetCore.Components.PersistentStateValueProviderTests|FullyQualifiedName~Microsoft.AspNetCore.Components.PersistentValueProviderComponentSubscriptionTests|FullyQualifiedName~Microsoft.AspNetCore.Components.PersistentStateValueProviderKeyResolverTests" "--logger" "trx;LogFileName=F132-Original.trx" "--results-directory" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\validation\\original-tests-001\\test-results"
```

Actual exit: **0**. [stdout](validation/original-tests-001/stdout.txt), [stderr](validation/original-tests-001/stderr.txt), [receipt](validation/original-tests-001/result.json).

## reconstruction-build-001

Activation: `. .\activate.ps1` in `C:\src\aspnetcore`.

```text
"C:\src\aspnetcore\.dotnet\dotnet.exe" "build" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\reconstruction-001\\project\\AutoPerf.CascadingHashes.csproj" "--no-restore" "--configuration" "Release" "-p:UseIisNativeAssets=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false" "-p:ReferencePathRoot=C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\images-v2\\Original\\bin" "-p:ComponentsOwnerRoot=C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\images-v2\\Original\\bin"
```

Actual exit: **1**. [stdout](validation/reconstruction-build-001/stdout.txt), [stderr](validation/reconstruction-build-001/stderr.txt), [receipt](validation/reconstruction-build-001/result.json).

## reconstruction-build-002

Activation: `. .\activate.ps1` in `C:\src\aspnetcore`.

```text
"C:\src\aspnetcore\.dotnet\dotnet.exe" "build" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\reconstruction-001\\project\\AutoPerf.CascadingHashes.csproj" "--no-restore" "--configuration" "Release" "-p:UseIisNativeAssets=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false" "-p:ReferencePathRoot=C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\images-v2\\Original\\bin" "-p:ComponentsOwnerRoot=C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\images-v2\\Original\\bin"
```

Actual exit: **0**. [stdout](validation/reconstruction-build-002/stdout.txt), [stderr](validation/reconstruction-build-002/stderr.txt), [receipt](validation/reconstruction-build-002/result.json).

## reconstruction-candidate-characterize-001

Activation: `. .\activate.ps1` in `C:\src\aspnetcore`.

```text
"C:\src\aspnetcore\.dotnet\dotnet.exe" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\reconstruction-001\\Candidate\\bin\\AutoPerf.CascadingHashes.dll" "characterize" "CandidateRebuilt" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\validation\\reconstruction-candidate-characterize-001\\observations.json"
```

Actual exit: **0**. [stdout](validation/reconstruction-candidate-characterize-001/stdout.txt), [stderr](validation/reconstruction-candidate-characterize-001/stderr.txt), [receipt](validation/reconstruction-candidate-characterize-001/result.json).

## reconstruction-original-characterize-001

Activation: `. .\activate.ps1` in `C:\src\aspnetcore`.

```text
"C:\src\aspnetcore\.dotnet\dotnet.exe" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\reconstruction-001\\Original\\bin\\AutoPerf.CascadingHashes.dll" "characterize" "OriginalRebuilt" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\validation\\reconstruction-original-characterize-001\\observations.json"
```

Actual exit: **0**. [stdout](validation/reconstruction-original-characterize-001/stdout.txt), [stderr](validation/reconstruction-original-characterize-001/stderr.txt), [receipt](validation/reconstruction-original-characterize-001/result.json).

## reconstruction-restore-001

Activation: `. .\activate.ps1` in `C:\src\aspnetcore`.

```text
"C:\src\aspnetcore\.dotnet\dotnet.exe" "restore" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\reconstruction-001\\project\\AutoPerf.CascadingHashes.csproj" "-p:UseIisNativeAssets=false" "/m:2" "/nr:false" "-p:ReferencePathRoot=C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\images-v2\\Original\\bin" "-p:ComponentsOwnerRoot=C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\images-v2\\Original\\bin"
```

Actual exit: **0**. [stdout](validation/reconstruction-restore-001/stdout.txt), [stderr](validation/reconstruction-restore-001/stderr.txt), [receipt](validation/reconstruction-restore-001/result.json).

## restored-characterize-001

Activation: `. .\activate.ps1` in `C:\src\aspnetcore`.

```text
"C:\src\aspnetcore\.dotnet\dotnet.exe" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\images-v2\\RestoredOriginal\\bin\\AutoPerf.CascadingHashes.dll" "characterize" "RestoredOriginal" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\validation\\restored-characterize-001\\observations.json"
```

Actual exit: **0**. [stdout](validation/restored-characterize-001/stdout.txt), [stderr](validation/restored-characterize-001/stderr.txt), [receipt](validation/restored-characterize-001/result.json).

## restored-owner-rebuild-001

Activation: `. .\activate.ps1` in `C:\src\aspnetcore`.

```text
"C:\src\aspnetcore\.dotnet\dotnet.exe" "build" "src\\Components\\Components\\src\\Microsoft.AspNetCore.Components.csproj" "--no-restore" "--no-dependencies" "--configuration" "Release" "-t:Rebuild" "-p:UseIisNativeAssets=false" "-p:BuildNodeJS=false" "-p:StaticWebAssetsEnabled=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false"
```

Actual exit: **0**. [stdout](validation/restored-owner-rebuild-001/stdout.txt), [stderr](validation/restored-owner-rebuild-001/stderr.txt), [receipt](validation/restored-owner-rebuild-001/result.json).

## restored-tests-001

Activation: `. .\activate.ps1` in `C:\src\aspnetcore`.

```text
"C:\src\aspnetcore\.dotnet\dotnet.exe" "test" "src\\Components\\Components\\test\\Microsoft.AspNetCore.Components.Tests.csproj" "--no-restore" "--configuration" "Release" "-p:UseIisNativeAssets=false" "-p:BuildNodeJS=false" "-p:StaticWebAssetsEnabled=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false" "--filter" "FullyQualifiedName~Microsoft.AspNetCore.Components.CascadingParameterTest|FullyQualifiedName~Microsoft.AspNetCore.Components.CascadingParameterStateTest|FullyQualifiedName~Microsoft.AspNetCore.Components.PersistentStateValueProviderTests|FullyQualifiedName~Microsoft.AspNetCore.Components.PersistentValueProviderComponentSubscriptionTests|FullyQualifiedName~Microsoft.AspNetCore.Components.PersistentStateValueProviderKeyResolverTests" "--logger" "trx;LogFileName=F132-Restored.trx" "--results-directory" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\validation\\restored-tests-001\\test-results"
```

Actual exit: **0**. [stdout](validation/restored-tests-001/stdout.txt), [stderr](validation/restored-tests-001/stderr.txt), [receipt](validation/restored-tests-001/result.json).

## restored-tests-002

Activation: `. .\activate.ps1` in `C:\src\aspnetcore`.

```text
"C:\src\aspnetcore\.dotnet\dotnet.exe" "test" "src\\Components\\Components\\test\\Microsoft.AspNetCore.Components.Tests.csproj" "--no-restore" "--configuration" "Release" "-p:UseIisNativeAssets=false" "-p:BuildNodeJS=false" "-p:StaticWebAssetsEnabled=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false" "--filter" "FullyQualifiedName~Microsoft.AspNetCore.Components.CascadingParameterTest|FullyQualifiedName~Microsoft.AspNetCore.Components.CascadingParameterStateTest|FullyQualifiedName~Microsoft.AspNetCore.Components.PersistentStateValueProviderTests|FullyQualifiedName~Microsoft.AspNetCore.Components.PersistentValueProviderComponentSubscriptionTests|FullyQualifiedName~Microsoft.AspNetCore.Components.PersistentStateValueProviderKeyResolverTests" "--logger" "trx;LogFileName=F132-Restored.trx" "--results-directory" "C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-runs\\F132\\validation\\restored-tests-002\\test-results"
```

Actual exit: **0**. [stdout](validation/restored-tests-002/stdout.txt), [stderr](validation/restored-tests-002/stderr.txt), [receipt](validation/restored-tests-002/result.json).
