$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$dotnetArguments = @('build', 'src\Mvc\Mvc.Razor\src\Microsoft.AspNetCore.Mvc.Razor.csproj', '--no-restore', '-c', 'Release', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--nologo')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @dotnetArguments
exit $LASTEXITCODE
