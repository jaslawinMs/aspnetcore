$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$dotnetArguments = @('build', 'C:\src\aspnetcore\src\Mvc\Mvc.Razor\test\Microsoft.AspNetCore.Mvc.Razor.Test.csproj', '--no-restore', '-c', 'Release', '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
