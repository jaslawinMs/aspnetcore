$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$arguments = @('restore', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F120\reconstruction-paired-001\project\AutoPerf.Benchmarks.csproj', '--configfile', 'C:\src\aspnetcore\NuGet.config', '-p:NuGetAudit=false', '-p:AspNetCoreRoot=C:\src\aspnetcore', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '-p:BuildProjectReferences=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
exit $LASTEXITCODE
