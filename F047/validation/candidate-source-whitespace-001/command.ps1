$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$dotnetArguments = @('format', 'whitespace', 'C:\src\aspnetcore\src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj', '--no-restore', '--verify-no-changes', '--include', 'C:\src\aspnetcore\src\Components\Endpoints\src\Rendering\SSRRenderModeBoundary.cs', 'C:\src\aspnetcore\src\Components\Endpoints\test\EndpointHtmlRendererTest.cs', '--verbosity', 'quiet')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
