# F145: exact commands and observed results

These are historical executions, not permission to replay the permanently closed benchmark budget. Each repository dotnet invocation was preceded by the relevant checkout activation. Raw receipts retain exact cwd/environment/executable/arguments/PID/exit and separate stdout/stderr.

## candidate-original-build-001: FAILED (preserved); exit 1

[Actual command receipt](logs/candidate-original-build-001.command.json); [stdout](logs/candidate-original-build-001.stdout.txt); [stderr](logs/candidate-original-build-001.stderr.txt).

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-finding-F145-original'
$env:TMP = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F145\scratch\original'
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:DOTNET_CLI_HOME = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F145\cli\original'
$env:TEMP = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F145\scratch\original'
$env:MSBUILDDISABLENODEREUSE = '1'
. .\activate.ps1
& 'C:\src\autoperf-finding-F145-original\.dotnet\dotnet.exe' 'msbuild' 'src\Servers\IIS\IIS\test\testassets\InProcessWebSite\InProcessWebSite.csproj' '-t:Rebuild' '-p:Configuration=Release' '-p:BuildProjectReferences=false' '-p:CustomAfterMicrosoftCommonTargets=C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F145-source-input-008.targets' '-p:AutoPerfPriorAfterCommonTargets=C:\src\autoperf-finding-F145-original\.dotnet\sdk\12.0.100-alpha.1.26557.102\vCurrent\Custom.After.Microsoft.Common.targets' '-p:AutoPerfStartupSource=C:\src\aspnetcore\src\Servers\IIS\IIS\test\testassets\InProcessWebSite\Startup.cs' '-p:AutoPerfCompileItemsRecord=C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F145\inputs\compile-items-original' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:StaticWebAssetsEnabled=false' '-p:UseSharedCompilation=false' '/m:2' '/nr:false' '-v:minimal' '-nologo' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F145\logs\candidate-original.binlog'
```

## candidate-original-build-002: PASS; exit 0

[Actual command receipt](logs/candidate-original-build-002.command.json); [stdout](logs/candidate-original-build-002.stdout.txt); [stderr](logs/candidate-original-build-002.stderr.txt).

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-finding-F145-original'
$env:DOTNET_CLI_HOME = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F145\cli\original'
$env:TMP = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F145\scratch\original'
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:TEMP = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F145\scratch\original'
. .\activate.ps1
& 'C:\src\autoperf-finding-F145-original\.dotnet\dotnet.exe' 'msbuild' 'src\Servers\IIS\IIS\test\testassets\InProcessWebSite\InProcessWebSite.csproj' '-t:Rebuild' '-p:Configuration=Release' '-p:BuildProjectReferences=false' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:StaticWebAssetsEnabled=false' '-p:UseSharedCompilation=false' '/m:2' '/nr:false' '-v:minimal' '-nologo' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F145\logs\candidate-original-002.binlog'
```

## candidate-default-build-001: FAILED (preserved); exit 1

[Actual command receipt](logs/candidate-default-build-001.command.json); [stdout](logs/candidate-default-build-001.stdout.txt); [stderr](logs/candidate-default-build-001.stderr.txt).

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-finding-F145-default'
$env:DOTNET_CLI_HOME = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F145\cli\default'
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:TEMP = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F145\scratch\default'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:TMP = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F145\scratch\default'
. .\activate.ps1
& 'C:\src\autoperf-finding-F145-default\.dotnet\dotnet.exe' 'msbuild' 'src\Servers\IIS\IIS\test\testassets\InProcessWebSite\InProcessWebSite.csproj' '-t:Rebuild' '-p:Configuration=Release' '-p:BuildProjectReferences=false' '-p:CustomAfterMicrosoftCommonTargets=C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F145-source-input-008.targets' '-p:AutoPerfPriorAfterCommonTargets=C:\src\autoperf-finding-F145-default\.dotnet\sdk\12.0.100-alpha.1.26557.102\vCurrent\Custom.After.Microsoft.Common.targets' '-p:AutoPerfStartupSource=C:\src\aspnetcore\src\Servers\IIS\IIS\test\testassets\InProcessWebSite\Startup.cs' '-p:AutoPerfCompileItemsRecord=C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F145\inputs\compile-items-default' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:StaticWebAssetsEnabled=false' '-p:UseSharedCompilation=false' '/m:2' '/nr:false' '-v:minimal' '-nologo' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F145\logs\candidate-default.binlog'
```

## candidate-default-build-002: PASS; exit 0

[Actual command receipt](logs/candidate-default-build-002.command.json); [stdout](logs/candidate-default-build-002.stdout.txt); [stderr](logs/candidate-default-build-002.stderr.txt).

```powershell
Set-Location -LiteralPath 'C:\src\autoperf-finding-F145-default'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:TMP = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F145\scratch\default'
$env:TEMP = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F145\scratch\default'
$env:DOTNET_CLI_HOME = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F145\cli\default'
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
. .\activate.ps1
& 'C:\src\autoperf-finding-F145-default\.dotnet\dotnet.exe' 'msbuild' 'src\Servers\IIS\IIS\test\testassets\InProcessWebSite\InProcessWebSite.csproj' '-t:Rebuild' '-p:Configuration=Release' '-p:BuildProjectReferences=false' '-p:UseIisNativeAssets=false' '-p:BuildNodeJS=false' '-p:StaticWebAssetsEnabled=false' '-p:UseSharedCompilation=false' '/m:2' '/nr:false' '-v:minimal' '-nologo' '-bl:C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F145\logs\candidate-default-002.binlog'
```

## Four real functional preflights: PASS

Each exact wrapper command completed with raw200MB SHA/all200M decoded characters/control/file cleanup and all three owned children terminal. No Stopwatch or allocation counter executed.

```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F145-run-variant-008.ps1' -Role original -Variant baseline -Mode Verify -Label verify-original-baseline-001
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F145-run-variant-008.ps1' -Role original -Variant candidate -Mode Verify -Label verify-original-candidate-001
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F145-run-variant-008.ps1' -Role default -Variant baseline -Mode Verify -Label verify-default-baseline-001
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\F145-run-variant-008.ps1' -Role default -Variant candidate -Mode Verify -Label verify-default-candidate-001
```

[All native commands/results](execution-index.json). The wrapper activates its relevant checkout before every native dotnet host/client start. A separate [unleased measurement guard](native-measurement-negative-guard.json) rejected the call before native launch or budget consumption.

## Two exclusive comparisons: PASS; budget permanently closed

```powershell
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\Invoke-AutoPerfBenchmark.ps1' -RequestPath 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F145\comparison-original-request-001.json'
& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\Invoke-AutoPerfBenchmark.ps1' -RequestPath 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F145\comparison-default-request-001.json'
```

Original14.876389% and observedDefault15.710799% less primary time,7/7 favorable each; controls0.983557609/0.975761731 pass. Each authorization preceded its warmup.32 serialized variant launchers and96 native host/client children completed; both leases released without overlap. These exact commands MUST NOT be rerun. [Frozen driver](inputs/F145-compare-008.mjs), [all outputs](execution-index.json), [lease/terminal receipt](post-comparison-quiescence-001.json).

## Portable historical audit

```powershell
node .\verify.mjs . --require-seal
```

Result is recorded in [historical-audit.json](historical-audit.json). This reads metadata/raw outputs and independently recomputes arithmetic using existing Node/PowerShell; no dotnet, native producer or timing.

## Native IIS test: NOT RUN

`RequestResponseTests.LargeResponseBodyFromFile_CheckAllResponseBodyBytesWritten` requires a matched published nativeANCM/IIS-or-IISExpress fixture and quarantine-aware execution (dotnet/aspnetcore#68271). Installed binaries exist but no matched fixture was built here; its assertions remain unverified. Actual managed Startup/file/Kestrel/full real client consumption was the faithful lower validation boundary instead. No fabricated TRX or skipped-native-test success is claimed.
