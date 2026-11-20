$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$arguments = @('build', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F133\reconstruction-001\project\AutoPerf.UnionMetadata.csproj', '--no-restore', '--configuration', 'Release', '-p:ReferencePathRoot=C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F133\images\Original\bin', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
exit $LASTEXITCODE
