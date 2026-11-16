$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
$root = Join-Path $PSScriptRoot 'autoperf-runs\F096'
. (Join-Path $repo 'activate.ps1')
$output = Join-Path $root 'measurements\original-profiles'
$budgetPath = Join-Path $root 'measurement-budget.json'
if ((Test-Path -LiteralPath $output) -or (Test-Path -LiteralPath $budgetPath))
{
    throw 'Refusing to restart or overwrite the original profile sweep.'
}
node (Join-Path $PSScriptRoot 'F096-closure.mjs') $root --verify
if ($LASTEXITCODE -ne 0)
{
    throw 'Actual frozen original closure changed before measurement.'
}
$budget = [ordered]@{
    maximumComparisons=3; startedComparisons=0; completedComparisons=0
    maximumOriginalProfileSweeps=1; startedOriginalProfileSweeps=1; completedOriginalProfileSweeps=0
    closed=$false; sourceCandidate=$null
    note='No safe generic performance candidate passed the contract gate. One original-only finite/infinite profile sweep quantifies existing different contracts, not an A/B speedup. Repeating an incompatible proposal would not establish a justified optimization.'
}
$budget | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $budgetPath
New-Item -ItemType Directory -Path $output | Out-Null
$arguments = @(
    (Join-Path $root 'binaries\before\AutoPerf.Benchmarks.dll'),
    '--filter','*TimeoutBenchmark*','--inProcess','--exporters','json','csv','--artifacts',$output,
    '--job','Short','--warmupCount','3','--iterationCount','8','--iterationTime','100','--outliers','DontRemove'
)
$started = [DateTimeOffset]::UtcNow
$sdk = dotnet --version
& dotnet @arguments *> (Join-Path $output 'console.log')
$code = $LASTEXITCODE
@{
    candidate='F096'; type='original-only-different-deadline-contract-controls'; sourceComparisons=0
    sdk=$sdk; arguments=$arguments; exitCode=$code
    startedUtc=$started.ToString('o'); completedUtc=[DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $root 'execution-original-profiles.json')
if ($code -ne 0)
{
    throw "Actual original profile sweep failed:$code"
}
$reports = @(Get-ChildItem -LiteralPath (Join-Path $output 'results') -Filter '*full*.json' -File)
if ($reports.Count -ne 1)
{
    throw 'Expected one actual full benchmark report.'
}
$report = Get-Content -LiteralPath $reports[0].FullName -Raw | ConvertFrom-Json
if ($report.Benchmarks.Count -ne 20)
{
    throw 'Actual profile sweep did not contain all twenty operation/deadline/reply cases.'
}
foreach ($case in $report.Benchmarks)
{
    if (-not $case.Statistics -or $case.Statistics.N -ne 8 -or $case.Statistics.Mean -le 0)
    {
        throw "Unmeasured or incomplete actual case:$($case.FullName)"
    }
}
node (Join-Path $PSScriptRoot 'F096-closure.mjs') $root --verify
if ($LASTEXITCODE -ne 0)
{
    throw 'Actual frozen original closure changed during measurement.'
}
$budget.completedOriginalProfileSweeps = 1
$budget.closed = $true
$budget | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $budgetPath
'F096: original-only20-case profile sweep completed, eight retained samples per case; zero source A/B comparisons.'
