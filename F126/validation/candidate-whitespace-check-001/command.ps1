$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$dotnetArguments = @('format', 'whitespace', 'C:\src\aspnetcore\src\Security', '--folder', '--include', 'C:\src\aspnetcore\src\Security\samples\CustomPolicyProvider\Authorization\MinimumAgePolicyProvider.cs', 'C:\src\aspnetcore\src\Security\test\AuthSamples.FunctionalTests\CustomPolicyProviderTests.cs', '--verify-no-changes', '--verbosity', 'minimal')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
