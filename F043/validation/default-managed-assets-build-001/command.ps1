$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$dotnetArguments = @('build', 'src\Assets\Microsoft.AspNetCore.App.Internal.Assets.csproj', '--no-restore', '-c', 'Release', '-p:UseSharedCompilation=false', '-p:BuildNodeJS=false', '/m:2', '/nr:false', '--nologo')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
