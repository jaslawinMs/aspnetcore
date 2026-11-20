$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F126'
function Require([bool] $Condition, [string] $Message)
{
    if (-not $Condition)
    {
        throw $Message
    }
}
function Median([double[]] $Values)
{
    Require ($Values.Count -eq 3) 'Require all three paired observations.'
    $ordered = @($Values | Sort-Object)
    return $ordered[1]
}
function Near([double] $Left, [double] $Right)
{
    return [Math]::Abs($Left - $Right) -le 0.00000001
}
$budgetFile = Join-Path $run 'diagnostic-budget.json'
$budgetHash = (Get-FileHash -LiteralPath $budgetFile -Algorithm SHA256).Hash
$budget = Get-Content -LiteralPath $budgetFile -Raw | ConvertFrom-Json
$analysisFile = Join-Path $run 'analysis.json'
$analysis = Get-Content -LiteralPath $analysisFile -Raw | ConvertFrom-Json
Require $budget.permanentlyClosed 'Timing must already be permanently closed.'
Require ($budget.authorizations.Count -eq 3 -and $budget.completed.Count -eq 3) 'Require exactly three completed authorizations.'
$all = @{}
$observations = 0
foreach ($pair in $budget.completed)
{
    $sources = @{}
    foreach ($role in $pair.completed)
    {
        $file = Join-Path $run $role.fullJson.Replace('/', '\')
        Require ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -eq $role.fullJsonSha256) 'Raw result hash changed.'
        $data = Get-Content -LiteralPath $file -Raw | ConvertFrom-Json
        $values = @{}
        foreach ($case in $data.Benchmarks)
        {
            $measurements = @($case.Measurements | Where-Object { $_.IterationMode -eq 'Workload' -and $_.IterationStage -eq 'Result' })
            Require ($measurements.Count -eq 8) 'Every case needs eight actual retained result measurements.'
            $sum = 0.0
            foreach ($measurement in $measurements)
            {
                $sum += [double]$measurement.Nanoseconds / [double]$measurement.Operations
                $observations++
            }
            $mean = $sum / $measurements.Count
            Require (Near $mean $case.Statistics.Mean) 'Independent raw-measurement mean differs from exporter.'
            $key = $case.Method + '/' + $case.Parameters.Substring('Profile='.Length)
            Require (-not $values.ContainsKey($key)) 'Duplicate method/profile result.'
            $values[$key] = [pscustomobject]@{ Mean = $mean; Bytes = [double]$case.Memory.BytesAllocatedPerOperation }
        }
        Require ($values.Count -eq 6) 'Require all three methods and both real endpoints.'
        $sources[$role.variant] = $values
    }
    foreach ($key in $sources.Original.Keys)
    {
        $original = $sources.Original[$key]
        $candidate = $sources.Candidate[$key]
        $less = 100.0 * ($original.Mean - $candidate.Mean) / $original.Mean
        $saved = $original.Bytes - $candidate.Bytes
        $published = @($analysis.pairs | Where-Object attempt -eq $pair.attempt)[0].cells | Where-Object key -eq $key
        Require (Near $less $published.lessTimePercent) 'Independent paired timing differs.'
        Require (Near $saved $published.reportedBytesSavedPerOperation) 'Independent reported allocation differs.'
        if (-not $all.ContainsKey($key))
        {
            $all[$key] = [System.Collections.Generic.List[object]]::new()
        }
        $all[$key].Add([pscustomobject]@{ Attempt = $pair.attempt; Less = $less; Saved = $saved })
    }
}
Require ($observations -eq 288) 'Require all 288 retained observations.'
$rows = @(
    foreach ($key in ($all.Keys | Sort-Object))
    {
        $values = @($all[$key] | Sort-Object Attempt)
        $less = @($values | ForEach-Object Less)
        $saved = @($values | ForEach-Object Saved)
        $medianLess = Median $less
        $medianSaved = Median $saved
        $published = $analysis.aggregates | Where-Object key -eq $key
        Require (Near $medianLess $published.medianLessTimePercent) 'Independent aggregate timing differs.'
        Require (Near $medianSaved $published.medianReportedBytesSaved) 'Independent aggregate allocation differs.'
        [pscustomobject]@{ Key = $key; PairedLessTimePercent = $less; MedianLessTimePercent = $medianLess; PairedBytesSaved = $saved; MedianBytesSaved = $medianSaved }
    }
)
$primary = @($all['WarmRequest/MinimumAge10'] | Sort-Object Attempt)
$control = @($all['CachingDisabledRequest/MinimumAge10'] | Sort-Object Attempt)
$guard = @($all['DirectGetPolicy/MinimumAge10'] | Sort-Object Attempt)
$faster = 0
$credible = 0
$allocation = 0
$slower = 0
$adverse = 0
for ($index = 0; $index -lt 3; $index++)
{
    if ($primary[$index].Less -gt 0) { $faster++ }
    if ($primary[$index].Less -gt [Math]::Abs($control[$index].Less)) { $credible++ }
    if ($primary[$index].Saved -ge 32 -and $primary[$index].Saved - $control[$index].Saved -ge 32) { $allocation++ }
    if ($guard[$index].Less -lt 0) { $slower++ }
    if (-$guard[$index].Less -gt [Math]::Abs($control[$index].Less)) { $adverse++ }
}
$timingQualified = (Median @($primary | ForEach-Object Less)) -ge 10 -and $faster -ge 2 -and $credible -ge 2
$allocationQualified = $allocation -ge 2
$guardRejects = (Median @($guard | ForEach-Object Less)) -le -10 -and $slower -ge 2 -and $adverse -ge 2
Require ($timingQualified -eq $analysis.actualGates.timingQualified) 'Timing decision differs.'
Require ($allocationQualified -eq $analysis.actualGates.allocationQualified) 'Allocation decision differs.'
Require ($guardRejects -eq $analysis.actualGates.guardRejects) 'Guard decision differs.'
Require ((Get-FileHash -LiteralPath $budgetFile -Algorithm SHA256).Hash -eq $budgetHash) 'Closed budget changed.'
$receipt = [ordered]@{
    candidate = 'F126'
    actualIndependentImplementation = 'PowerShell raw Workload/Result Nanoseconds divided by Operations, not the JavaScript OriginalValues reduction.'
    actualVerifiedAt = [DateTime]::UtcNow.ToString('o')
    actualRetainedObservations = $observations
    actualAllSixProfilesAgree = $true
    actualTimingQualified = $timingQualified
    actualAllocationQualified = $allocationQualified
    actualGuardRejects = $guardRejects
    actualAnalysisSha256 = (Get-FileHash -LiteralPath $analysisFile -Algorithm SHA256).Hash
    actualClosedBudgetSha256 = $budgetHash
    rows = $rows
}
$destination = Join-Path $run 'independent-numerical-audit.json'
Require (-not (Test-Path -LiteralPath $destination)) 'Preserve the existing independent audit.'
[System.IO.File]::WriteAllText($destination, ($receipt | ConvertTo-Json -Depth 20) + "`n")
$receipt | ConvertTo-Json -Depth 20
