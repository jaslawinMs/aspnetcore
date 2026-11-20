$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$arguments = @('test', 'src\Mvc\test\Mvc.IntegrationTests\Microsoft.AspNetCore.Mvc.IntegrationTests.csproj', '--no-restore', '--configuration', 'Release', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.IntegrationTests.UnionValidationIntegrationTest', '--logger', 'trx;LogFileName=F133-Default.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F133\validation\default-tests-002\test-results')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
exit $LASTEXITCODE
