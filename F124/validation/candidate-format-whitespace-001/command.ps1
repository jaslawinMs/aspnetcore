$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$dotnetArguments = @('format', 'whitespace', '--folder', '--include', 'src\Framework\AspNetCoreAnalyzers\src\Analyzers\WebApplicationBuilder\PublicPartialProgramClassAnalyzer.cs', 'src\Framework\AspNetCoreAnalyzers\test\WebApplicationBuilder\PublicPartialProgramClassTest.cs', '--verify-no-changes', '--no-restore', '--verbosity', 'normal')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
