$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$arguments = @('test', 'src\Components\Media\test\Microsoft.AspNetCore.Components.Media.Tests.csproj', '--no-restore', '--configuration', 'Release', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Components.Media.Tests.FileDownloadTest', '--logger', 'trx;LogFileName=F129-Prototype.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F129\validation\prototype-tests-002\test-results')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
exit $LASTEXITCODE
