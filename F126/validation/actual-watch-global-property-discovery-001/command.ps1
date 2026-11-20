$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$dotnetArguments = @('watch', '--list', '--project', 'C:\src\aspnetcore\src\Security\samples\CustomPolicyProvider\CustomPolicyProvider.csproj', '--verbose', '--property:UseIisNativeAssets=false', '--property:BuildNodeJS=false', '--property:StaticWebAssetsEnabled=false', '--property:UseSharedCompilation=false', '--property:BuildInParallel=false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
