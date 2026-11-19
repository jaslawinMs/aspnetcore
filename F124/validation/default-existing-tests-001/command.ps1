$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$dotnetArguments = @('test', 'src\Framework\AspNetCoreAnalyzers\test\Microsoft.AspNetCore.App.Analyzers.Test.csproj', '-c', 'Release', '--no-build', '--no-restore', '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Analyzers.PublicPartialProgramClassTest', '--logger', 'trx;LogFileName=results.trx', '--logger', 'console;verbosity=normal', '--results-directory', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F124\validation\default-existing-tests-001\test-results', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--nologo')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
