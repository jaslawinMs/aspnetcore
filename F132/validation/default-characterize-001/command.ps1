$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\src\autoperf-F042-default'
. .\activate.ps1
$arguments = @('C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F132\images-v2\Default\bin\AutoPerf.CascadingHashes.dll', 'characterize', 'Default', 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F132\validation\default-characterize-001\observations.json')
& 'C:\src\autoperf-F042-default\.dotnet\dotnet.exe' @arguments
exit $LASTEXITCODE
