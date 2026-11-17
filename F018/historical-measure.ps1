param(
    [Parameter(Mandatory)]
    [ValidateRange(1,3)]
    [int] $Comparison
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F018'
$budgetPath = Join-Path $run 'measurement-budget.json'
$budget = Get-Content $budgetPath -Raw | ConvertFrom-Json
$execution = Join-Path $run ('measurement-execution\comparison-{0:D3}' -f $Comparison)
$output = Join-Path $run ('measurements\comparison-{0:D3}' -f $Comparison)
if ($budget.closed -or $budget.usedComparisons -ne $Comparison - 1 -or $budget.maximumComparisons -ne 3 -or
    $budget.sourceCandidateShapes -ne 1 -or (Test-Path $execution) -or (Test-Path $output))
{
    throw 'At most3 actual paired attempts;never replay/overwrite a consumed slot or closed budget.'
}
$package = Get-Content (Join-Path $run 'package-payload-recheck.json') -Raw | ConvertFrom-Json
if (-not $package.packedOwnerMatchesFrozenCandidate -or -not $package.actualEnabledApiCompatPassed)
{
    throw 'Actual enabled pack/payload gate must pass before timing.'
}
$checked = [System.Collections.Generic.List[object]]::new()
foreach ($role in 'original','candidate')
{
    $context = Join-Path $run ('contexts\' + $role)
    $manifest = Get-Content (Join-Path $context 'manifest.json') -Raw | ConvertFrom-Json
    $preflight = Get-Content (Join-Path $run ('characterization-execution\' + $role + '\attempt-001\completed.json')) -Raw | ConvertFrom-Json
    if (-not $preflight.allActualContractAssertionsPassed -or $preflight.actualTimedWrappers -ne 24 -or
        $preflight.actualRecordedProfileContracts -ne 48 -or $preflight.actualProducerCancellationContracts -ne 12)
    {
        throw 'Every actual original/candidate wrapper and producer precondition must pass before timing.'
    }
    foreach ($entry in $manifest.files)
    {
        if ((Get-FileHash (Join-Path $context $entry.path)).Hash -cne $entry.sha256)
        {
            throw "Actual frozen source/runtime/test bytes changed:$role/$($entry.path)"
        }
    }
    $checked.Add([ordered]@{ role = $role; rehashedFiles = $manifest.files.Count; manifestSha256 = (Get-FileHash (Join-Path $context 'manifest.json')).Hash })
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item $PSCommandPath (Join-Path $execution 'executed-driver.ps1')
$checked | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $execution 'frozen-recheck.json') -Encoding utf8NoBOM
$order = if ($Comparison -eq 2) { @('candidate','original') } else { @('original','candidate') }
$attempt = [pscustomobject]@{
    comparison = $Comparison; roleOrder = $order; status = 'reserved-before-native-launch'; started = [DateTimeOffset]::UtcNow.ToString('o')
    completed = $null; profiles = @(); sourceCandidateShapes = 1
}
$budget.usedComparisons = $Comparison
$budget.attempts = @($budget.attempts) + $attempt
function SaveBudget
{
    $budget | ConvertTo-Json -Depth 18 | Set-Content $budgetPath -Encoding utf8NoBOM
}
SaveBudget
Set-Location $root
. .\activate.ps1
foreach ($role in $order)
{
    $context = Join-Path $run ('contexts\' + $role)
    $artifact = Join-Path $output $role
    $arguments = @((Join-Path $context 'image\AutoPerf.Benchmarks.dll'),'--sources',(Join-Path $context 'sources'),
        '--context',$role,'--mode','measure','--filter','*','--artifacts',$artifact)
    $profile = [pscustomobject]@{
        role = $role; status = 'started-before-native-launch'; started = [DateTimeOffset]::UtcNow.ToString('o')
        completed = $null; actualExitCode = $null; actualReports = 0
    }
    $attempt.profiles = @($attempt.profiles) + $profile
    if ($role -eq 'original')
    {
        $budget.originalProfiles++
    }
    else
    {
        $budget.candidateProfiles++
    }
    SaveBudget
    $stem = Join-Path $execution $role
    Write-Output "F018 comparison$Comparison/${role}:starting actual24-case profile;slot reserved,never replay."
    & dotnet @arguments *> ($stem + '.log')
    $code = $LASTEXITCODE
    $profile.actualExitCode = $code
    $profile.completed = [DateTimeOffset]::UtcNow.ToString('o')
    [ordered]@{
        executable = (Get-Command dotnet).Source; arguments = $arguments; workingDirectory = $root; started = $profile.started
        completed = $profile.completed; actualExitCode = $code; output = [IO.Path]::GetFileName($stem + '.log')
        outputSha256 = (Get-FileHash ($stem + '.log')).Hash; comparison = $Comparison; role = $role; actualTimingAttempt = $true
    } | ConvertTo-Json -Depth 9 | Set-Content ($stem + '.json') -Encoding utf8NoBOM
    if ($code)
    {
        $profile.status = 'failed-or-partial-actual-timing'
        $attempt.status = 'failed-or-partial-comparison-slot-consumed'
        SaveBudget
        Get-Content ($stem + '.log') -Tail 55
        throw 'Actual timing failed;the reserved slot remains consumed and every artifact is retained.'
    }
    $reports = @(Get-ChildItem (Join-Path $artifact 'results') -Filter '*-report-full.json' -File)
    if ($reports.Count -ne 1)
    {
        $profile.status = 'actual-exit0-but-incomplete-export'
        SaveBudget
        throw 'Actual timing consumed but complete unique raw export is missing.'
    }
    $export = Get-Content $reports[0].FullName -Raw | ConvertFrom-Json
    if (@($export.Benchmarks).Count -ne 24 -or @($export.Benchmarks | Where-Object { $null -eq $_.Statistics -or -not $_.Measurements }).Count)
    {
        $profile.status = 'actual-exit0-but-incomplete-reports'
        SaveBudget
        throw 'Every actual Google report/raw measurement must exist;slot remains consumed.'
    }
    $profile.actualReports = 24
    $profile.status = 'completed-actual24-reports'
    SaveBudget
    Get-Content ($stem + '.log') -Tail 16
}
$attempt.status = 'completed-actual48-reports'
$attempt.completed = [DateTimeOffset]::UtcNow.ToString('o')
if ($Comparison -eq 3)
{
    $budget.closed = $true
}
SaveBudget
Write-Output "F018:actual comparison$Comparison completed48reports;$($budget.usedComparisons)/3slotsconsumed,closed=$($budget.closed)."
