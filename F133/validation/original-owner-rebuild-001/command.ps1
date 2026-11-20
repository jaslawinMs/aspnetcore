$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$arguments = @('build', 'src\Mvc\Mvc.Core\src\Microsoft.AspNetCore.Mvc.Core.csproj', '--no-restore', '--no-dependencies', '--configuration', 'Release', '-t:Rebuild', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
exit $LASTEXITCODE
