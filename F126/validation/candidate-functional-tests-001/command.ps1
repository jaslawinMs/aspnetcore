$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$dotnetArguments = @('test', 'C:\src\aspnetcore\src\Security\test\AuthSamples.FunctionalTests\AuthSamples.FunctionalTests.csproj', '--no-build', '--no-restore', '-c', 'Release', '-f', 'net12.0', '--filter', 'FullyQualifiedName~AuthSamples.FunctionalTests.CustomPolicyProviderTests', '--logger', 'trx;LogFileName=results.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F126\validation\candidate-functional-tests-001\test-results', '-v', 'minimal', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
