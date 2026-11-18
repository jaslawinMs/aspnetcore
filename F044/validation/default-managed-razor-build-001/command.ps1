$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$dotnetArguments = @('build', 'C:\src\autoperf-F042-default\src\Mvc\Mvc.Razor\src\Microsoft.AspNetCore.Mvc.Razor.csproj', '--no-restore', '-c', 'Release', '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '/m:2', '/nr:false')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
