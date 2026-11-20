# Recorded validation commands

These are historical executions from accepted preparation007, not commands run while packaging. Original tests used runtime62; main tests and both middleware producer probes used runtime68. Console outcomes are retained as console output; no XML was generated.

| Recorded command | Result | Recorded boundary / runtime |
|---|---|---|
| [missing-import](runs/missing-import/command.json) · [stdout](runs/missing-import/stdout.txt) · [stderr](runs/missing-import/stderr.txt) | exit 1; terminal true | Setup / metadata / preserved failed prerequisite; not counted as test passes |
| [generate-original](runs/generate-original/command.json) · [stdout](runs/generate-original/stdout.txt) · [stderr](runs/generate-original/stderr.txt) | exit 0; terminal true | Setup / metadata / preserved failed prerequisite; not counted as test passes |
| [generate-main](runs/generate-main/command.json) · [stdout](runs/generate-main/stdout.txt) · [stderr](runs/generate-main/stderr.txt) | exit 0; terminal true | Setup / metadata / preserved failed prerequisite; not counted as test passes |
| [build-original](runs/build-original/command.json) · [stdout](runs/build-original/stdout.txt) · [stderr](runs/build-original/stderr.txt) | exit 0; terminal true | Setup / metadata / preserved failed prerequisite; not counted as test passes |
| [build-main](runs/build-main/command.json) · [stdout](runs/build-main/stdout.txt) · [stderr](runs/build-main/stderr.txt) | exit 0; terminal true | Setup / metadata / preserved failed prerequisite; not counted as test passes |
| [build-prototype](runs/build-prototype/command.json) · [stdout](runs/build-prototype/stdout.txt) · [stderr](runs/build-prototype/stderr.txt) | exit 0; terminal true | Setup / metadata / preserved failed prerequisite; not counted as test passes |
| [prototype-failure](runs/prototype-failure/command.json) · [stdout](runs/prototype-failure/stdout.txt) · [stderr](runs/prototype-failure/stderr.txt) | exit -532462766; terminal true | Setup / metadata / preserved failed prerequisite; not counted as test passes |
| [runner-help](runs/runner-help/command.json) · [stdout](runs/runner-help/stdout.txt) · [stderr](runs/runner-help/stderr.txt) | exit 0; terminal true | Setup / metadata / preserved failed prerequisite; not counted as test passes |
| [build-consumer](runs/build-consumer/command.json) · [stdout](runs/build-consumer/stdout.txt) · [stderr](runs/build-consumer/stderr.txt) | exit 0; terminal true | Setup / metadata / preserved failed prerequisite; not counted as test passes |
| [producer-original](runs/producer-original/command.json) · [stdout](runs/producer-original/stdout.txt) · [stderr](runs/producer-original/stderr.txt) | exit 0; terminal true | 27 real middleware rows; runtime68 |
| [tests-original](runs/tests-original/command.json) · [stdout](runs/tests-original/stdout.txt) · [stderr](runs/tests-original/stderr.txt) | exit 0; terminal true | 3 exact xUnit tests; runtime62 |
| [producer-main](runs/producer-main/command.json) · [stdout](runs/producer-main/stdout.txt) · [stderr](runs/producer-main/stderr.txt) | exit 0; terminal true | 27 real middleware rows; runtime68 |
| [main-missing-runtime](runs/main-missing-runtime/command.json) · [stdout](runs/main-missing-runtime/stdout.txt) · [stderr](runs/main-missing-runtime/stderr.txt) | exit 1; terminal true | Setup / metadata / preserved failed prerequisite; not counted as test passes |
| [tests-main](runs/tests-main/command.json) · [stdout](runs/tests-main/stdout.txt) · [stderr](runs/tests-main/stderr.txt) | exit 0; terminal true | 3 exact xUnit tests; runtime68 |
| [original-runtime-mismatch](runs/original-runtime-mismatch/command.json) · [stdout](runs/original-runtime-mismatch/stdout.txt) · [stderr](runs/original-runtime-mismatch/stderr.txt) | exit 1; terminal true | Setup / metadata / preserved failed prerequisite; not counted as test passes |
| [build-il-inspector](runs/build-il-inspector/command.json) · [stdout](runs/build-il-inspector/stdout.txt) · [stderr](runs/build-il-inspector/stderr.txt) | exit 0; terminal true | Setup / metadata / preserved failed prerequisite; not counted as test passes |
| [inspect-runtime-il](runs/inspect-runtime-il/command.json) · [stdout](runs/inspect-runtime-il/stdout.txt) · [stderr](runs/inspect-runtime-il/stderr.txt) | exit 0; terminal true | Setup / metadata / preserved failed prerequisite; not counted as test passes |
| [sdk-info](runs/sdk-info/command.json) · [stdout](runs/sdk-info/stdout.txt) · [stderr](runs/sdk-info/stderr.txt) | exit 0; terminal true | Setup / metadata / preserved failed prerequisite; not counted as test passes |

## missing-import

```text
Working directory: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original
Activation: . .\activate.ps1
"C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original\.dotnet\dotnet.exe" "build" "src\Middleware\OutputCaching\test\Microsoft.AspNetCore.OutputCaching.Tests.csproj" "-c" "Release" "--no-restore" "-p:UseIisNativeAssets=false" "-p:BuildNodeJS=false" "-p:StaticWebAssetsEnabled=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false" "-v:q" "-clp:NoSummary"
Result: exit 1; PID 30992; terminal true
DOTNET_GENERATE_ASPNET_CERTIFICATE=false; DOTNET_ADD_GLOBAL_TOOLS_TO_PATH=false; MSBUILDDISABLENODEREUSE=1; DOTNET_ROLL_FORWARD=(not recorded)
```

## generate-original

```text
Working directory: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original
Activation: . .\activate.ps1
"C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original\.dotnet\dotnet.exe" "msbuild" "eng\tools\GenerateFiles\GenerateFiles.csproj" "-restore" "-target:GenerateDirectoryBuildFiles" "-p:Configuration=Release" "-p:UseIisNativeAssets=false" "-p:BuildNodeJS=false" "-p:StaticWebAssetsEnabled=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false" "-v:q"
Result: exit 0; PID 6908; terminal true
DOTNET_GENERATE_ASPNET_CERTIFICATE=false; DOTNET_ADD_GLOBAL_TOOLS_TO_PATH=false; MSBUILDDISABLENODEREUSE=1; DOTNET_ROLL_FORWARD=(not recorded)
```

## generate-main

```text
Working directory: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\default
Activation: . .\activate.ps1
"C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\default\.dotnet\dotnet.exe" "msbuild" "eng\tools\GenerateFiles\GenerateFiles.csproj" "-restore" "-target:GenerateDirectoryBuildFiles" "-p:Configuration=Release" "-p:UseIisNativeAssets=false" "-p:BuildNodeJS=false" "-p:StaticWebAssetsEnabled=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false" "-v:q"
Result: exit 0; PID 38360; terminal true
DOTNET_GENERATE_ASPNET_CERTIFICATE=false; DOTNET_ADD_GLOBAL_TOOLS_TO_PATH=false; MSBUILDDISABLENODEREUSE=1; DOTNET_ROLL_FORWARD=(not recorded)
```

## build-original

```text
Working directory: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original
Activation: . .\activate.ps1
"C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original\.dotnet\dotnet.exe" "build" "src\Middleware\OutputCaching\test\Microsoft.AspNetCore.OutputCaching.Tests.csproj" "-c" "Release" "-p:UseIisNativeAssets=false" "-p:BuildNodeJS=false" "-p:StaticWebAssetsEnabled=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false" "-v:q" "-clp:NoSummary"
Result: exit 0; PID 26432; terminal true
DOTNET_GENERATE_ASPNET_CERTIFICATE=false; DOTNET_ADD_GLOBAL_TOOLS_TO_PATH=false; MSBUILDDISABLENODEREUSE=1; DOTNET_ROLL_FORWARD=(not recorded)
```

## build-main

```text
Working directory: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\default
Activation: . .\activate.ps1
"C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\default\.dotnet\dotnet.exe" "build" "src\Middleware\OutputCaching\test\Microsoft.AspNetCore.OutputCaching.Tests.csproj" "-c" "Release" "-p:UseIisNativeAssets=false" "-p:BuildNodeJS=false" "-p:StaticWebAssetsEnabled=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false" "-v:q" "-clp:NoSummary"
Result: exit 0; PID 31208; terminal true
DOTNET_GENERATE_ASPNET_CERTIFICATE=false; DOTNET_ADD_GLOBAL_TOOLS_TO_PATH=false; MSBUILDDISABLENODEREUSE=1; DOTNET_ROLL_FORWARD=(not recorded)
```

## build-prototype

```text
Working directory: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original
Activation: . .\activate.ps1
"C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original\.dotnet\dotnet.exe" "build" "C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\harness\F135.MiddlewareProbe.csproj" "-c" "Release" "-p:SourceAssemblies=C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original\artifacts\bin\Microsoft.AspNetCore.OutputCaching.Tests\Release\net12.0" "-p:ImportDirectoryBuildProps=false" "-p:ImportDirectoryBuildTargets=false" "-p:UseIisNativeAssets=false" "-p:BuildNodeJS=false" "-p:StaticWebAssetsEnabled=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false" "-v:q"
Result: exit 0; PID 40384; terminal true
DOTNET_GENERATE_ASPNET_CERTIFICATE=false; DOTNET_ADD_GLOBAL_TOOLS_TO_PATH=false; MSBUILDDISABLENODEREUSE=1; DOTNET_ROLL_FORWARD=(not recorded)
```

## prototype-failure

```text
Working directory: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original
Activation: . .\activate.ps1
"C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F145-005\runtime-default\dotnet.exe" "exec" "--fx-version" "12.0.0-alpha.1.26568.110" "C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\harness\bin\Release\net12.0\F135.MiddlewareProbe.dll" "Original" "C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original" "56201BD0D178F7002CEB0B635C83A6E664792B90E26A8178036469A53B44D6B9" "C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\results\original-http-producer.json"
Result: exit -532462766; PID 18840; terminal true
DOTNET_GENERATE_ASPNET_CERTIFICATE=false; DOTNET_ADD_GLOBAL_TOOLS_TO_PATH=false; MSBUILDDISABLENODEREUSE=1; DOTNET_ROLL_FORWARD=Disable
```

## runner-help

```text
Working directory: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original
Activation: . .\activate.ps1
"C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F145-005\runtime-default\dotnet.exe" "exec" "--fx-version" "12.0.0-alpha.1.26568.110" "C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original\artifacts\bin\Microsoft.AspNetCore.OutputCaching.Tests\Release\net12.0\Microsoft.AspNetCore.OutputCaching.Tests.dll" "--help"
Result: exit 0; PID 40504; terminal true
DOTNET_GENERATE_ASPNET_CERTIFICATE=false; DOTNET_ADD_GLOBAL_TOOLS_TO_PATH=false; MSBUILDDISABLENODEREUSE=1; DOTNET_ROLL_FORWARD=Disable
```

## build-consumer

```text
Working directory: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original
Activation: . .\activate.ps1
"C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original\.dotnet\dotnet.exe" "build" "C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\harness\F135.MiddlewareProbe.csproj" "-c" "Release" "--no-restore" "-p:SourceAssemblies=C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original\artifacts\bin\Microsoft.AspNetCore.OutputCaching.Tests\Release\net12.0" "-p:ImportDirectoryBuildProps=false" "-p:ImportDirectoryBuildTargets=false" "-p:UseIisNativeAssets=false" "-p:BuildNodeJS=false" "-p:StaticWebAssetsEnabled=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false" "-v:q"
Result: exit 0; PID 36892; terminal true
DOTNET_GENERATE_ASPNET_CERTIFICATE=false; DOTNET_ADD_GLOBAL_TOOLS_TO_PATH=false; MSBUILDDISABLENODEREUSE=1; DOTNET_ROLL_FORWARD=(not recorded)
```

## producer-original

```text
Working directory: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original
Activation: . .\activate.ps1
"C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F145-005\runtime-default\dotnet.exe" "exec" "--fx-version" "12.0.0-alpha.1.26568.110" "C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\harness\bin\Release\net12.0\F135.MiddlewareProbe.dll" "Original" "C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original" "56201BD0D178F7002CEB0B635C83A6E664792B90E26A8178036469A53B44D6B9" "C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\results\original-http-producer.json"
Result: exit 0; PID 27640; terminal true
DOTNET_GENERATE_ASPNET_CERTIFICATE=false; DOTNET_ADD_GLOBAL_TOOLS_TO_PATH=false; MSBUILDDISABLENODEREUSE=1; DOTNET_ROLL_FORWARD=Disable
```

## tests-original

```text
Working directory: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original
Activation: . .\activate.ps1
"C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original\.dotnet\dotnet.exe" "test" "src\Middleware\OutputCaching\test\Microsoft.AspNetCore.OutputCaching.Tests.csproj" "-c" "Release" "--no-build" "--no-restore" "--filter" "FullyQualifiedName=Microsoft.AspNetCore.OutputCaching.Tests.OutputCacheKeyProviderTests.OutputCachingKeyProvider_CreateStorageKey_ReturnsCachedVaryByGuid_IfVaryByRulesIsEmpty|FullyQualifiedName=Microsoft.AspNetCore.OutputCaching.Tests.OutputCacheKeyProviderTests.OutputCachingKeyProvider_CreateStorageKey_ValuesAreSorted|FullyQualifiedName=Microsoft.AspNetCore.OutputCaching.Tests.OutputCachePolicyBuilderTests.BuildPolicy_CreatesVaryByValuePolicy" "--logger" "console;verbosity=detailed" "-p:UseIisNativeAssets=false" "-p:BuildNodeJS=false" "-p:StaticWebAssetsEnabled=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false"
Result: exit 0; PID 32060; terminal true
DOTNET_GENERATE_ASPNET_CERTIFICATE=false; DOTNET_ADD_GLOBAL_TOOLS_TO_PATH=false; MSBUILDDISABLENODEREUSE=1; DOTNET_ROLL_FORWARD=Disable
```

## producer-main

```text
Working directory: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\default
Activation: . .\activate.ps1
"C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F145-005\runtime-default\dotnet.exe" "exec" "--fx-version" "12.0.0-alpha.1.26568.110" "C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\images\default\F135.MiddlewareProbe.dll" "CurrentDefault00560" "C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\default" "E560B5009A59B4CA192048895211DE8E96A698EA77544847E98B157CD955E950" "C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\results\default-http-producer.json"
Result: exit 0; PID 39524; terminal true
DOTNET_GENERATE_ASPNET_CERTIFICATE=false; DOTNET_ADD_GLOBAL_TOOLS_TO_PATH=false; MSBUILDDISABLENODEREUSE=1; DOTNET_ROLL_FORWARD=Disable
```

## main-missing-runtime

```text
Working directory: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\default
Activation: . .\activate.ps1
"C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\default\.dotnet\dotnet.exe" "test" "src\Middleware\OutputCaching\test\Microsoft.AspNetCore.OutputCaching.Tests.csproj" "-c" "Release" "--no-build" "--no-restore" "--filter" "FullyQualifiedName=Microsoft.AspNetCore.OutputCaching.Tests.OutputCacheKeyProviderTests.OutputCachingKeyProvider_CreateStorageKey_ReturnsCachedVaryByGuid_IfVaryByRulesIsEmpty|FullyQualifiedName=Microsoft.AspNetCore.OutputCaching.Tests.OutputCacheKeyProviderTests.OutputCachingKeyProvider_CreateStorageKey_ValuesAreSorted|FullyQualifiedName=Microsoft.AspNetCore.OutputCaching.Tests.OutputCachePolicyBuilderTests.BuildPolicy_CreatesVaryByValuePolicy" "--logger" "console;verbosity=detailed" "-p:UseIisNativeAssets=false" "-p:BuildNodeJS=false" "-p:StaticWebAssetsEnabled=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false"
Result: exit 1; PID 32352; terminal true
DOTNET_GENERATE_ASPNET_CERTIFICATE=false; DOTNET_ADD_GLOBAL_TOOLS_TO_PATH=false; MSBUILDDISABLENODEREUSE=1; DOTNET_ROLL_FORWARD=Disable
```

## tests-main

```text
Working directory: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\default
Activation: . .\activate.ps1
"C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F145-005\runtime-default\dotnet.exe" "exec" "--fx-version" "12.0.0-alpha.1.26568.110" "C:\src\aspnetcore\.dotnet\sdk\12.0.100-alpha.1.26557.102\vstest.console.dll" "C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\default\artifacts\bin\Microsoft.AspNetCore.OutputCaching.Tests\Release\net12.0\Microsoft.AspNetCore.OutputCaching.Tests.dll" "/TestCaseFilter:FullyQualifiedName=Microsoft.AspNetCore.OutputCaching.Tests.OutputCacheKeyProviderTests.OutputCachingKeyProvider_CreateStorageKey_ReturnsCachedVaryByGuid_IfVaryByRulesIsEmpty|FullyQualifiedName=Microsoft.AspNetCore.OutputCaching.Tests.OutputCacheKeyProviderTests.OutputCachingKeyProvider_CreateStorageKey_ValuesAreSorted|FullyQualifiedName=Microsoft.AspNetCore.OutputCaching.Tests.OutputCachePolicyBuilderTests.BuildPolicy_CreatesVaryByValuePolicy" "/Framework:.NETCoreApp,Version=v12.0" "/Logger:console;verbosity=detailed" "/Diag:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\logs\018-default-vstest-diagnostic.txt"
Result: exit 0; PID 37452; terminal true
DOTNET_GENERATE_ASPNET_CERTIFICATE=false; DOTNET_ADD_GLOBAL_TOOLS_TO_PATH=false; MSBUILDDISABLENODEREUSE=1; DOTNET_ROLL_FORWARD=Disable
```

## original-runtime-mismatch

```text
Working directory: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original
Activation: . .\activate.ps1
"C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F145-005\runtime-default\dotnet.exe" "exec" "--fx-version" "12.0.0-alpha.1.26568.110" "C:\src\aspnetcore\.dotnet\sdk\12.0.100-alpha.1.26557.102\vstest.console.dll" "C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original\artifacts\bin\Microsoft.AspNetCore.OutputCaching.Tests\Release\net12.0\Microsoft.AspNetCore.OutputCaching.Tests.dll" "/TestCaseFilter:FullyQualifiedName=Microsoft.AspNetCore.OutputCaching.Tests.OutputCacheKeyProviderTests.OutputCachingKeyProvider_CreateStorageKey_ReturnsCachedVaryByGuid_IfVaryByRulesIsEmpty|FullyQualifiedName=Microsoft.AspNetCore.OutputCaching.Tests.OutputCacheKeyProviderTests.OutputCachingKeyProvider_CreateStorageKey_ValuesAreSorted|FullyQualifiedName=Microsoft.AspNetCore.OutputCaching.Tests.OutputCachePolicyBuilderTests.BuildPolicy_CreatesVaryByValuePolicy" "/Framework:.NETCoreApp,Version=v12.0" "/Logger:console;verbosity=detailed" "/Diag:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\logs\018-original-vstest-diagnostic.txt"
Result: exit 1; PID 35500; terminal true
DOTNET_GENERATE_ASPNET_CERTIFICATE=false; DOTNET_ADD_GLOBAL_TOOLS_TO_PATH=false; MSBUILDDISABLENODEREUSE=1; DOTNET_ROLL_FORWARD=Disable
```

## build-il-inspector

```text
Working directory: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original
Activation: . .\activate.ps1
"C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original\.dotnet\dotnet.exe" "build" "C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\runtime-inspector\F135.RuntimeInspector.csproj" "-c" "Release" "-p:ImportDirectoryBuildProps=false" "-p:ImportDirectoryBuildTargets=false" "-p:UseIisNativeAssets=false" "-p:BuildNodeJS=false" "-p:StaticWebAssetsEnabled=false" "-p:UseSharedCompilation=false" "/m:2" "/nr:false" "-v:q"
Result: exit 0; PID 37764; terminal true
DOTNET_GENERATE_ASPNET_CERTIFICATE=false; DOTNET_ADD_GLOBAL_TOOLS_TO_PATH=false; MSBUILDDISABLENODEREUSE=1; DOTNET_ROLL_FORWARD=(not recorded)
```

## inspect-runtime-il

```text
Working directory: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original
Activation: . .\activate.ps1
"C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F145-005\runtime-default\dotnet.exe" "exec" "--fx-version" "12.0.0-alpha.1.26568.110" "C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\runtime-inspector\bin\Release\net12.0\F135.RuntimeInspector.dll" "C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\results\selected-runtime-Any-IL.json"
Result: exit 0; PID 2376; terminal true
DOTNET_GENERATE_ASPNET_CERTIFICATE=false; DOTNET_ADD_GLOBAL_TOOLS_TO_PATH=false; MSBUILDDISABLENODEREUSE=1; DOTNET_ROLL_FORWARD=Disable
```

## sdk-info

```text
Working directory: C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original
Activation: . .\activate.ps1
"C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F135-007\graphs\original\.dotnet\dotnet.exe" "--info"
Result: exit 0; PID 36132; terminal true
DOTNET_GENERATE_ASPNET_CERTIFICATE=false; DOTNET_ADD_GLOBAL_TOOLS_TO_PATH=false; MSBUILDDISABLENODEREUSE=1; DOTNET_ROLL_FORWARD=Disable
```
