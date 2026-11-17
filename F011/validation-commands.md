# F011 exact historical commands and observed outcomes

Every fresh .NET shell activates `. .\activate.ps1` from `C:\src\aspnetcore`. One actual original-only 12-case profile completed; zero paired comparisons/candidate profiles, no shipping fix or improvement percentage. These guarded historical commands preserve actual paths, not replay/overwrite instructions.

## analysis-attempts\extraction-001\execution.json: actual exit 0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F011-extract-analysis.mjs'
```

## analysis-attempts\independent-audit\attempt-001\execution.json: actual exit 0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F011-reproduce-analysis.mjs'
```

## current-producer-preparation-attempt-002\execution.json: actual exit 0
```powershell
dotnet 'msbuild' 'src\SignalR\common\Protocols.Json\src\Microsoft.AspNetCore.SignalR.Protocols.Json.csproj' '-nologo' '-p:TargetFramework=net12.0' '-getProperty:CustomAfterMicrosoftCommonTargets,CustomBeforeMicrosoftCommonTargets,TargetFramework,IsPackable,EnablePackageValidation'
```

## current-producer-preparation-attempt-002\execution.json: actual exit 0
```powershell
dotnet 'build' 'src\SignalR\common\Protocols.Json\src\Microsoft.AspNetCore.SignalR.Protocols.Json.csproj' '-f' 'net12.0' '--no-restore' '--no-dependencies' '-c' 'Release' '-t:Rebuild' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:CustomAfterMicrosoftCommonTargets=C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\investigation\CapturedDefaultJson.targets' '-p:F011CapturedDefaultJsonSource=C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\current-default-canonical\src\SignalR\common\Protocols.Json\src\Protocol\JsonHubProtocol.cs' '-p:F011OverlayEvidence=C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\current-producer-preparation-attempt-002\actual-compile-substitution.txt' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\current-producer-preparation-attempt-002\build-captured-default-json.binlog'
```

## current-producer-preparation-attempt-002\execution.json: actual exit 0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\images\captured-default-json\AutoPerf.Benchmarks.dll' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\sources\captured-default-json' '--context' 'captured-default-json' '--test-assembly' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\tests\original\test-image\Microsoft.AspNetCore.SignalR.Tests.dll' '--spec-assembly' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\tests\original\test-image\Microsoft.AspNetCore.SignalR.Specification.Tests.dll' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\characterization\captured-default-json'
```

## current-producer-preparation-attempt-002\execution.json: actual exit 0
```powershell
dotnet 'build' 'src\SignalR\common\Protocols.Json\src\Microsoft.AspNetCore.SignalR.Protocols.Json.csproj' '-f' 'net12.0' '--no-restore' '--no-dependencies' '-c' 'Release' '-t:Rebuild' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\current-producer-preparation-attempt-002\restore-original-json.binlog'
```

## current-producer-preparation\execution.json: actual exit 0
```powershell
dotnet 'msbuild' 'src\SignalR\common\Protocols.Json\src\Microsoft.AspNetCore.SignalR.Protocols.Json.csproj' '-nologo' '-p:TargetFramework=net12.0' '-getProperty:CustomAfterMicrosoftCommonTargets,CustomBeforeMicrosoftCommonTargets,TargetFramework,IsPackable,EnablePackageValidation'
```

## measurements\original-diagnostic-only\execution.json: actual exit 0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\images\original\AutoPerf.Benchmarks.dll' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\sources\original' '--context' 'original-diagnostic-only' '--filter' '*' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\measurements\original-diagnostic-only'
```

## preparation-attempts\attempt-001\execution.json: actual exit 0
```powershell
dotnet 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\harness\AutoPerf.Benchmarks.csproj' '--configfile' 'C:\src\aspnetcore\NuGet.config' '-m:2' '-v:q' '-p:UseIisNativeAssets=false'
```

## preparation-attempts\attempt-001\execution.json: actual exit 0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '--no-dependencies' '-c' 'Release' '-t:Rebuild' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\preparation-attempts\attempt-001\build-harness.binlog'
```

## preparation-attempts\attempt-001\execution.json: actual exit 0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\images\original\AutoPerf.Benchmarks.dll' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\sources\original' '--context' 'original' '--test-assembly' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\tests\original\test-image\Microsoft.AspNetCore.SignalR.Tests.dll' '--spec-assembly' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\tests\original\test-image\Microsoft.AspNetCore.SignalR.Specification.Tests.dll' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\characterization\original'
```

## tests\original\execution.json: actual exit 0
```powershell
dotnet 'build' 'src\SignalR\server\Core\src\Microsoft.AspNetCore.SignalR.Core.csproj' '--no-restore' '--no-dependencies' '-c' 'Release' '-t:Rebuild' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\tests\original\fresh-owner-build.binlog'
```

## tests\original\execution.json: actual exit 0
```powershell
dotnet 'build' 'src\SignalR\server\SignalR\test\Microsoft.AspNetCore.SignalR.Tests\Microsoft.AspNetCore.SignalR.Tests.csproj' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\tests\original\owning-test-build.binlog'
```

## tests\original\execution.json: actual exit 0
```powershell
dotnet 'test' 'src\SignalR\server\SignalR\test\Microsoft.AspNetCore.SignalR.Tests\Microsoft.AspNetCore.SignalR.Tests.csproj' '--no-build' '--no-restore' '-c' 'Release' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '--filter' 'FullyQualifiedName~DefaultHubLifetimeManagerTests' '--logger' 'trx;LogFileName=owning-original.trx' '--results-directory' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\tests\original'
```

## Preserved preparation outcomes
Source-triple reader exits1 on actual JSON source delta before .NET builds. First overlay reader exits1 after one successful native property query: nonempty SDK default after-hook path points to an absent file, no overlay/characterization/timing launched. Corrected reader preserves before-hooks and checks actual file existence. Five native builds, two property queries, one restore, one 27-row owning test command and two complete JSON producer characterizations all exit0. Original root JSON DLL/PDB restored byte-exact. No completed owning-suite or profile rerun.

## Actual unchanged independent source-branch publication: exit0, remote ref and owner bytes verified
```powershell
git '-c' 'credential.helper=' '-c' 'credential.helper=!gh auth git-credential' 'push' 'autoperf' '37e809ead5824bc753a1c3d56f11615bdb1296c5:refs/heads/autoperf/F011-signalr-group-exclusions'
```

## Actual copied portable audit: exit0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-published-results\F011\reproduce-analysis.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-published-results\F011' --verify
# Copied source/TRX/real JSON-getter/recipient/Pipe/raw timing/GC/settings/PDB-witness/statistics consistency passed; omitted binaries not rehashed.
```
