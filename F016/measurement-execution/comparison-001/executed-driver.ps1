param(
    [Parameter(Mandatory)]
    [ValidateRange(1,3)]
    [int] $Comparison
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F016'
$budgetPath = Join-Path $run 'measurement-budget.json'
$budget = Get-Content -LiteralPath $budgetPath -Raw | ConvertFrom-Json
$acceptance = Get-Content -LiteralPath (Join-Path $run 'acceptance.json') -Raw | ConvertFrom-Json
if ($budget.closed -or $budget.usedComparisons -ne $Comparison - 1 -or $Comparison -gt $budget.maximumComparisons -or
    $budget.originalOnlyDiagnosticProfiles -ne 0)
{
    throw 'The closed/used comparison budget does not permit this exact next attempt.'
}
foreach ($role in 'original','candidate')
{
    $context = Join-Path $run ('contexts\' + $role)
    $preflight = Get-Content -LiteralPath (Join-Path $context 'freeze-completed.json') -Raw | ConvertFrom-Json
    if (-not $preflight.allSuccessful -or $preflight.actualNativeHosts -ne 2 -or
        $preflight.actualWrapperPreflightsPerHost -ne $acceptance.proposed_benchmark_shapes.Count -or $preflight.actualOwningPassed -ne 64)
    {
        throw "Actual $role original/candidate native preflight and complete owning-test exports are required."
    }
    $manifest = Get-Content -LiteralPath (Join-Path $context 'context-manifest.json') -Raw | ConvertFrom-Json
    foreach ($entry in $manifest.files)
    {
        $file = Get-Item -LiteralPath (Join-Path $context $entry.path)
        if ($file.Length -ne $entry.bytes -or (Get-FileHash -LiteralPath $file.FullName).Hash -cne $entry.sha256)
        {
            throw "Immutable $role image/source changed before comparison:$($entry.path)"
        }
    }
}
$execution = Join-Path $run ('measurement-execution\comparison-{0:D3}' -f $Comparison)
$measurement = Join-Path $run ('measurements\comparison-{0:D3}' -f $Comparison)
if ((Test-Path -LiteralPath $execution) -or (Test-Path -LiteralPath $measurement))
{
    throw 'Do not overwrite a measured or partial comparison.'
}
New-Item -ItemType Directory -Path $execution,$measurement | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
Copy-Item -LiteralPath $budgetPath -Destination (Join-Path $execution 'budget-before.json')
Set-Location $root
. .\activate.ps1
$order = if ($Comparison % 2 -eq 1) { @('original','candidate') } else { @('candidate','original') }
$attempt = [pscustomobject]@{
    comparison = $Comparison; roleOrder = $order
    actualHost = 'Actual net472/x64 executable,installed Framework corelib4.8.10008,real net462 owner'
    sourceCandidateShape = 1; started = [DateTimeOffset]::UtcNow.ToString('o')
    state = 'reserved-before-any-timing'; profiles = @()
}
$budget.usedComparisons = $Comparison
$budget.sourceCandidateShapes = 1
$budget.attempts = @($budget.attempts) + $attempt
$budget | Add-Member -NotePropertyName reason -NotePropertyValue 'Actual next paired Framework attempt reserved before native launch;failures/partial timing are never reset.' -Force
function Save-Budget
{
    $budget | ConvertTo-Json -Depth 14 | Set-Content -LiteralPath $budgetPath -Encoding utf8NoBOM
}
Save-Budget
foreach ($role in $order)
{
    $context = Join-Path $run ('contexts\' + $role)
    $executable = Join-Path $context 'framework-image\AutoPerf.Benchmarks.exe'
    $artifacts = Join-Path $measurement $role
    $arguments = @('--sources', (Join-Path $context 'sources'), '--context', ('framework-' + $role + '-comparison-' + $Comparison),
        '--mode', 'measure', '--artifacts', $artifacts, '--filter', '*')
    $profile = [pscustomobject]@{
        role = $role; executable = $executable; arguments = $arguments
        started = [DateTimeOffset]::UtcNow.ToString('o'); state = 'reserved-before-native-process'
        actualExitCode = $null; completed = $null; successfulReports = 0
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
    $attempt.state = 'running'
    Save-Budget
    $profile | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $execution ($role + '-launch.json')) -Encoding utf8NoBOM
    & $executable @arguments *> (Join-Path $execution ($role + '.log'))
    $profile.actualExitCode = $LASTEXITCODE
    $profile.completed = [DateTimeOffset]::UtcNow.ToString('o')
    $profile.state = if ($profile.actualExitCode -eq 0) { 'native-exited-zero-awaiting-report-accounting' } else { 'failed-or-partial' }
    Save-Budget
    $profile | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $execution ($role + '-actual-command.json')) -Encoding utf8NoBOM
    Get-Content -LiteralPath (Join-Path $execution ($role + '.log')) -Tail 36
    if ($profile.actualExitCode -ne 0)
    {
        $attempt.state = 'failed-or-partial'
        Save-Budget
        throw "Measured $role comparison$Comparison failed;its reserved budget remains consumed."
    }
    $markers = @(Get-ChildItem -LiteralPath (Join-Path $artifacts 'states') -Filter '*-completed.json' -File)
    if ($markers.Count -ne 1)
    {
        throw 'Missing actual profile completion marker;budget remains consumed.'
    }
    $marker = Get-Content -LiteralPath $markers[0].FullName -Raw | ConvertFrom-Json
    if (-not $marker.allSuccessful -or $marker.actualReports -ne $acceptance.proposed_benchmark_shapes.Count)
    {
        throw 'Incomplete actual Framework reports;budget remains consumed.'
    }
    $profile.successfulReports = $marker.actualReports
    $profile.state = 'completed-actual21-reports'
    Save-Budget
}
$attempt.state = 'completed-actual42-reports'
if ($Comparison -eq $budget.maximumComparisons)
{
    $budget.closed = $true
    $budget.reason = 'All3 actual paired Framework comparisons completed;6 profiles/126 reports. No further timing is permitted for this finding.'
}
Save-Budget
Copy-Item -LiteralPath $budgetPath -Destination (Join-Path $execution 'budget-after.json')
Write-Output ("F016 comparison{0}:actual42 reports completed;budget {0}/3 consumed." -f $Comparison)
