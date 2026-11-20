$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$dotnetArguments = @('build', 'C:\src\aspnetcore\src\Security\samples\CustomPolicyProvider\CustomPolicyProvider.csproj', '--no-restore', '-c', 'Debug', '-f', 'net12.0', '-v', 'minimal', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
