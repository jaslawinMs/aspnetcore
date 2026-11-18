$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$dotnetArguments = @('build', 'C:\src\aspnetcore\src\Servers\HttpSys\test\FunctionalTests\Microsoft.AspNetCore.Server.HttpSys.FunctionalTests.csproj', '--no-restore', '--no-incremental', '-c', 'Release', '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
