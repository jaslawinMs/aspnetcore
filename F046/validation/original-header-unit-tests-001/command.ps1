$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$dotnetArguments = @('test', 'C:\src\aspnetcore\src\Servers\HttpSys\test\Tests\Microsoft.AspNetCore.Server.HttpSys.Tests.csproj', '--no-build', '--no-restore', '-c', 'Release', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Server.HttpSys.Tests.HeaderCollectionTests', '--logger', 'trx;LogFileName=F046-original-header-unit.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F046\validation\original-header-unit-tests-001\test-results')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
