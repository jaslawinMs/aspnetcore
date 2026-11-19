$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$dotnetArguments = @('build', 'src\Framework\AspNetCoreAnalyzers\test\Microsoft.AspNetCore.App.Analyzers.Test.csproj', '-c', 'Release', '--no-restore', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--nologo', '--verbosity', 'quiet', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
