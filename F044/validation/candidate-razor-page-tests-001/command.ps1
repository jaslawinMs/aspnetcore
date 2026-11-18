$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$dotnetArguments = @('test', 'C:\src\aspnetcore\src\Mvc\Mvc.Razor\test\Microsoft.AspNetCore.Mvc.Razor.Test.csproj', '--no-build', '--no-restore', '-c', 'Release', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.Razor.RazorPageTest', '--logger', 'trx;LogFileName=F044-candidate-razor.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F044\validation\candidate-razor-page-tests-001\test-results')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
