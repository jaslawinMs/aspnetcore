$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$dotnetArguments = @('restore', 'src\Framework\AspNetCoreAnalyzers\test\Microsoft.AspNetCore.App.Analyzers.Test.csproj', '--configfile', 'C:\src\autoperf-F042-default\NuGet.config', '--disable-parallel', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--verbosity', 'quiet')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
