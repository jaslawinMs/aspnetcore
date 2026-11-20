$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$arguments = @('test', 'src\Components\Components\test\Microsoft.AspNetCore.Components.Tests.csproj', '--no-restore', '--configuration', 'Release', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Components.CascadingParameterTest|FullyQualifiedName~Microsoft.AspNetCore.Components.CascadingParameterStateTest|FullyQualifiedName~Microsoft.AspNetCore.Components.PersistentStateValueProviderTests|FullyQualifiedName~Microsoft.AspNetCore.Components.PersistentValueProviderComponentSubscriptionTests|FullyQualifiedName~Microsoft.AspNetCore.Components.PersistentStateValueProviderKeyResolverTests', '--logger', 'trx;LogFileName=F132-Restored.trx', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F132\validation\restored-tests-002\test-results')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
exit $LASTEXITCODE
