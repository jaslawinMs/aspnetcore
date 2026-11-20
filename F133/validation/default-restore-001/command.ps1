$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$arguments = @('restore', 'src\Mvc\test\Mvc.IntegrationTests\Microsoft.AspNetCore.Mvc.IntegrationTests.csproj', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
exit $LASTEXITCODE
