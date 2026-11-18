$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$dotnetArguments = @('test', 'C:\src\aspnetcore\src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj', '--no-build', '--no-restore', '-c', 'Release', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Components.Endpoints.SSRRenderModeBoundaryTest|FullyQualifiedName~Microsoft.AspNetCore.Components.Endpoints.EndpointHtmlRendererTest|FullyQualifiedName~Microsoft.AspNetCore.Components.Endpoints.RenderFragmentSerializerTest', '--logger', 'trx;LogFileName=F047-candidate-preservation.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F047\validation\candidate-preservation-tests-001\test-results')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
