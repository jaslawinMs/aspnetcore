param(
    [Parameter(Mandatory)][string]$Phase,
    [Parameter(Mandatory)][string]$BinaryDirectory,
    [Parameter(Mandatory)][ValidateSet(0,1)][int]$ExpectedExitCode
)
$ErrorActionPreference = 'Stop'
. 'C:\src\aspnetcore\activate.ps1'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F097'
$artifacts = Join-Path $run "verification\$Phase"
if (Test-Path -LiteralPath $artifacts)
{
    throw 'Actual probe artifacts must never be overwritten.'
}
$arguments = @((Join-Path $BinaryDirectory 'AutoPerf.Benchmarks.dll'),'--require-reuse','--artifacts',$artifacts)
$started = [DateTimeOffset]::UtcNow
dotnet @arguments *> (Join-Path $run "$Phase.log")
$exit = $LASTEXITCODE
$command = [ordered]@{
    arguments=$arguments; startedAt=$started.ToString('o'); completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    expectedExitCode=$ExpectedExitCode; actualExitCode=$exit
    unchangedHarnessRequired='AD21DF0F89338DAED964539510C4B4ABC1F0E1A0747DE54AFB0294E332D42AD1'
    reuseAllocationAcceptanceUnchanged='Every finite-control warm excess<100B; shutdown difference>=200B.'
}
$command | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $run "$Phase-command.json")
if ($exit -ne $ExpectedExitCode)
{
    Get-Content -LiteralPath (Join-Path $run "$Phase.log") -Tail 8
    throw "Actual faithful probe exited$exit rather than expected$ExpectedExitCode."
}
$report = Get-Content -LiteralPath (Join-Path $artifacts 'states\default-timeout-contract-resources.json') -Raw | ConvertFrom-Json
if ($report.Summary.semanticObservations -ne 53 -or $report.Resources.Count -ne 15 -or $report.ColdResources.Count -ne 15 -or
    $report.Summary.harnessSha256 -cne $command.unchangedHarnessRequired -or
    [bool]$report.ReuseObjectivePassed -ne ($ExpectedExitCode -eq 0))
{
    throw 'Actual original/candidate unchanged-harness semantic/resource rows did not all reach the expected outcome.'
}
$report.Summary | ConvertTo-Json -Compress
$report.Resources | Select-Object Operation,Policy,BytesPerCall,Checksum | Format-Table
