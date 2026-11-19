$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$dotnetArguments = @('format', 'whitespace', 'C:\src\aspnetcore\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj', '--no-restore', '--verify-no-changes', '--include', 'C:\src\aspnetcore\src\Mvc\Mvc.Core\src\Infrastructure\CopyOnWriteList.cs', 'C:\src\aspnetcore\src\Mvc\Mvc.Core\test\Infrastructure\CopyOnWriteListTest.cs', '--verbosity', 'quiet')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
