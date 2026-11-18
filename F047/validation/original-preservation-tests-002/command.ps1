$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$dotnetArguments = @('test', 'C:\src\aspnetcore\src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj', '--no-build', '--no-restore', '-c', 'Release', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Components.Endpoints.EndpointHtmlRendererTest.CanPrerender_MultipleRenderFragmentParameters', '--logger', 'trx;LogFileName=F047-original-multiple-fragments.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F047\validation\original-preservation-tests-002\test-results')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
