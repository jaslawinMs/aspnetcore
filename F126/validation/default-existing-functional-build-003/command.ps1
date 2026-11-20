$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$dotnetArguments = @('build', 'C:\src\autoperf-F042-default\src\Security\test\AuthSamples.FunctionalTests\AuthSamples.FunctionalTests.csproj', '--no-restore', '-c', 'Release', '-f', 'net12.0', '-v', 'minimal', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
