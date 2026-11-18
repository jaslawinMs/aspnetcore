$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$dotnetArguments = @('build', 'C:\src\autoperf-F042-default\src\Servers\IIS\IIS\src\Microsoft.AspNetCore.Server.IIS.csproj', '--no-restore', '--no-incremental', '-c', 'Release', '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '/m:2', '/nr:false')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
