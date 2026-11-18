$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$dotnetArguments = @('format', 'whitespace', 'C:\src\aspnetcore\src\Mvc\Mvc.Razor', '--folder', '--verify-no-changes', '--verbosity', 'normal', '--include', 'C:\src\aspnetcore\src\Mvc\Mvc.Razor\src\RazorPage.cs', 'C:\src\aspnetcore\src\Mvc\Mvc.Razor\test\RazorPageTest.cs', '--report', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F043\validation\candidate-format-whitespace-001\format-report.json')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
