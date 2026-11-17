# F014 exact historical commands and observed outcomes

Borrowed F011 commands under tests/original and borrowed-producer-build-execution retain their actual original timestamps/outcomes; they did not run again under F014. Every fresh .NET shell activates `. .\activate.ps1` from `C:\src\aspnetcore`. One actual original-only 14-case user-send profile completed; zero paired comparisons/candidate profiles, no shipping fix or improvement percentage. These guarded historical commands preserve actual paths, not replay/overwrite instructions.

## analysis-attempts\attempt-001\execution.json: actual exit 0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F014-adapt-extraction.mjs'
```

## analysis-attempts\attempt-001\execution.json: actual exit 0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F014-extract-analysis.mjs'
```

## analysis-attempts\attempt-001\execution.json: actual exit 0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F014-adapt-auditor.mjs'
```

## analysis-attempts\attempt-001\execution.json: actual exit 0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F014-reproduce-analysis.mjs'
```

## investigation-execution\attempt-001\execution.json: actual exit 0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F014-adapt-investigation.mjs'
```

## investigation-execution\attempt-001\execution.json: actual exit 0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F014-investigate.mjs'
```

## measurement-execution\attempt-001\execution.json: actual exit 0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F014-adapt-measurement-tools.mjs'
```

## measurement-execution\attempt-001\execution.json: actual exit 0
```powershell
C:\Program Files\PowerShell\7\pwsh.exe '-NoLogo' '-NoProfile' '-File' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F014-measure-original.ps1'
```

## measurements\original-diagnostic-only\execution.json: actual exit 0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F014\images\original\AutoPerf.Benchmarks.dll' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F014\sources\original' '--context' 'original-diagnostic-only' '--test-assembly' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F014\tests\original\test-image\Microsoft.AspNetCore.SignalR.Tests.dll' '--spec-assembly' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F014\tests\original\test-image\Microsoft.AspNetCore.SignalR.Specification.Tests.dll' '--filter' '*' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F014\measurements\original-diagnostic-only'
```

## preparation-attempts\attempt-001\borrowed-producer-build-execution.json: actual exit 0
```powershell
dotnet 'msbuild' 'src\SignalR\common\Protocols.Json\src\Microsoft.AspNetCore.SignalR.Protocols.Json.csproj' '-nologo' '-p:TargetFramework=net12.0' '-getProperty:CustomAfterMicrosoftCommonTargets,CustomBeforeMicrosoftCommonTargets,TargetFramework,IsPackable,EnablePackageValidation'
```

## preparation-attempts\attempt-001\borrowed-producer-build-execution.json: actual exit 0
```powershell
dotnet 'build' 'src\SignalR\common\Protocols.Json\src\Microsoft.AspNetCore.SignalR.Protocols.Json.csproj' '-f' 'net12.0' '--no-restore' '--no-dependencies' '-c' 'Release' '-t:Rebuild' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-p:CustomAfterMicrosoftCommonTargets=C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\investigation\CapturedDefaultJson.targets' '-p:F011CapturedDefaultJsonSource=C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\current-default-canonical\src\SignalR\common\Protocols.Json\src\Protocol\JsonHubProtocol.cs' '-p:F011OverlayEvidence=C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\current-producer-preparation-attempt-002\actual-compile-substitution.txt' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\current-producer-preparation-attempt-002\build-captured-default-json.binlog'
```

## preparation-attempts\attempt-001\borrowed-producer-build-execution.json: actual exit 0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\images\captured-default-json\AutoPerf.Benchmarks.dll' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\sources\captured-default-json' '--context' 'captured-default-json' '--test-assembly' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\tests\original\test-image\Microsoft.AspNetCore.SignalR.Tests.dll' '--spec-assembly' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\tests\original\test-image\Microsoft.AspNetCore.SignalR.Specification.Tests.dll' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\characterization\captured-default-json'
```

## preparation-attempts\attempt-001\borrowed-producer-build-execution.json: actual exit 0
```powershell
dotnet 'build' 'src\SignalR\common\Protocols.Json\src\Microsoft.AspNetCore.SignalR.Protocols.Json.csproj' '-f' 'net12.0' '--no-restore' '--no-dependencies' '-c' 'Release' '-t:Rebuild' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F011\current-producer-preparation-attempt-002\restore-original-json.binlog'
```

## preparation-attempts\attempt-001\execution.json: actual exit 0
```powershell
dotnet 'restore' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F014\harness\AutoPerf.Benchmarks.csproj' '--configfile' 'C:\src\aspnetcore\NuGet.config' '-m:2' '-v:q' '-p:UseIisNativeAssets=false'
```

## preparation-attempts\attempt-001\execution.json: actual exit 0
```powershell
dotnet 'build' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F014\harness\AutoPerf.Benchmarks.csproj' '--no-restore' '--no-dependencies' '-c' 'Release' '-t:Rebuild' '-m:2' '-v:q' '-p:UseIisNativeAssets=false' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F014\preparation-attempts\attempt-001\build-harness.binlog'
```

## preparation-attempts\attempt-001\execution.json: actual exit 0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F014\images\original\AutoPerf.Benchmarks.dll' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F014\sources\original' '--context' 'original' '--test-assembly' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F014\tests\original\test-image\Microsoft.AspNetCore.SignalR.Tests.dll' '--spec-assembly' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F014\tests\original\test-image\Microsoft.AspNetCore.SignalR.Specification.Tests.dll' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F014\characterization\original'
```

## preparation-attempts\attempt-001\execution.json: actual exit 0
```powershell
dotnet 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F014\images\captured-default-json\AutoPerf.Benchmarks.dll' '--sources' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F014\sources\captured-default-json' '--context' 'captured-default-json' '--test-assembly' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F014\tests\original\test-image\Microsoft.AspNetCore.SignalR.Tests.dll' '--spec-assembly' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F014\tests\original\test-image\Microsoft.AspNetCore.SignalR.Specification.Tests.dll' '--characterize' '--artifacts' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F014\characterization\captured-default-json'
```

## preparation-execution\attempt-001\execution.json: actual exit 0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F014-adapt-preparation.mjs'
```

## preparation-execution\attempt-001\execution.json: actual exit 0
```powershell
C:\Program Files\PowerShell\7\pwsh.exe '-NoLogo' '-NoProfile' '-File' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F014-prepare-original.ps1'
```

## publication-preparation\attempt-001\execution.json: actual exit 0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F014-adapt-publication-tools.mjs'
```

## scaffold-execution\attempt-001\execution.json: actual exit 0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F014-scaffold-harness.mjs'
```

## source-publication-execution\attempt-001\execution.json: actual exit 0
```powershell
C:\Program Files\PowerShell\7\pwsh.exe '-NoLogo' '-NoProfile' '-File' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F014-publish-source.ps1'
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
No fresh reader/native/timing failure or rerun. Four new F014 native preparation commands exit0: one restore, one build, two independent19-check/14-wrapper user-send characterizations with actual default user-ID provider/principal setup. F01127-row owning-suite/current JSON bytes explicitly reused/rehashed, not rerun/rebuilt. Repository outputs unchanged. One14-shape original-only profile passes; zero paired comparisons/candidate profiles, no prior group/broadcast/connection timing reused. The guarded profiler also executes dotnet --info successfully before timing; its exact output is measurements/original-diagnostic-only/dotnet-info.log.

## Actual unchanged independent source-branch publication: exit0, remote ref and owner bytes verified
```powershell
git '-c' 'credential.helper=' '-c' 'credential.helper=!gh auth git-credential' 'push' 'autoperf' '37e809ead5824bc753a1c3d56f11615bdb1296c5:refs/heads/autoperf/F014-signalr-user-membership'
```

## Actual copied portable audit: exit0
```powershell
node 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-published-results\F014\reproduce-analysis.mjs' 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-published-results\F014' --verify
# Copied source/TRX/real JSON-getter/recipient/Pipe/raw timing/GC/settings/PDB-witness/statistics consistency passed; omitted binaries not rehashed.
```
