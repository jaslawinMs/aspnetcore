$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$dotnetArguments = @('test', 'C:\src\autoperf-F042-default\src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj', '--no-build', '--no-restore', '-c', 'Release', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.Controllers.ControllerBinderDelegateProviderTest|FullyQualifiedName~AddingValueProviderFactory_AtResourceFilter_IsAvailableInControllerContext|FullyQualifiedName~DeletingValueProviderFactory_AtResourceFilter_IsNotAvailableInControllerContext', '--logger', 'trx;LogFileName=F122-default-existing.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F122\validation\default-existing-tests-001\test-results')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
