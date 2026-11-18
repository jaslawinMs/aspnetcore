$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$dotnetArguments = @('format', 'whitespace', 'C:\src\aspnetcore\src\Servers\HttpSys\test\Tests\Microsoft.AspNetCore.Server.HttpSys.Tests.csproj', '--no-restore', '--verify-no-changes', '--include', 'C:\src\aspnetcore\src\Shared\HttpSys\RequestProcessing\HeaderCollection.cs', 'C:\src\aspnetcore\src\Servers\HttpSys\test\Tests\HeaderCollectionTests.cs', '--verbosity', 'quiet')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
