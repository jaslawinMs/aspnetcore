$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\aspnetcore'
. .\activate.ps1
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F133\reconstruction-001\Default\bin\AutoPerf.UnionMetadata.dll', 'characterize', 'DefaultRebuilt', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F133\validation\reconstruction-default-characterize-001\observations.json')
& 'C:\src\aspnetcore\.dotnet\dotnet.exe' @arguments
exit $LASTEXITCODE
