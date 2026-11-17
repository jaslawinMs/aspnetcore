param(
    [Parameter(Mandatory)]
    [ValidateRange(1,3)]
    [int]$Attempt
)

$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F022'
$budgetFile = Join-Path $run 'measurement-budget.json'
$execution = Join-Path $run ('comparison-' + $Attempt.ToString('D2'))
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite or reopen an actual comparison.'
}
$budget = Get-Content -Raw -LiteralPath $budgetFile | ConvertFrom-Json
if ($budget.comparison_budget_closed -or $budget.actual_comparisons_started -ne $Attempt - 1 -or
    @($budget.attempts | Where-Object status -eq in_progress).Count)
{
    throw 'The exact next comparison slot is not open.'
}
$source = 'C:\src\aspnetcore\src\Mvc\Mvc.ViewFeatures\src\ExpressionHelper.cs'
if ((Get-FileHash -LiteralPath $source).Hash -ne '04A769BED0B513DFE135FB75E40168CF8BBA8B65BDA82642192BC234EF7DB8AC')
{
    throw 'The selected proposal changed after the recorded owning/lifecycle checks.'
}
$owning = Get-Content -Raw -LiteralPath (Join-Path $run 'validation\selected-callers\verified-result.json') | ConvertFrom-Json
if ($owning.actualPassed -ne 96 -or $owning.actualExpectedRed -ne 0 -or $owning.actualSkipped -ne 0)
{
    throw 'The actual96 owning helper/metadata cases are not green.'
}
foreach ($variant in @('original','selected'))
{
    $characterization = Join-Path $run "profiles\characterize-$variant-initial"
    $exit = Get-Content -Raw -LiteralPath (Join-Path $characterization 'verified-native-exit.json') | ConvertFrom-Json
    $completion = @(Get-ChildItem -LiteralPath (Join-Path $characterization 'states') -Filter '*characterization-completed.json' -File)
    if ($exit.actualNativeExitCode -ne 0 -or $completion.Count -ne 1)
    {
        throw 'Both actual untimed consumer characterizations must complete.'
    }
    $record = Get-Content -Raw -LiteralPath $completion[0].FullName | ConvertFrom-Json
    if (!$record.allSuccessful -or $record.actualTimedWrapperPaths -ne 14 -or $record.actualRecordedProfileContracts -ne 42)
    {
        throw 'All actual public/helper wrapper and changing-index contracts must match.'
    }
}
$lifetimeRed = Get-Content -Raw -LiteralPath (Join-Path $run 'validation\strong-key-control-compile\verified-result.json') | ConvertFrom-Json
$liveRed = Get-Content -Raw -LiteralPath (Join-Path $run 'validation\watch-unsafe-cache-body\actual-expected-live-path-red.json') | ConvertFrom-Json
$liveGreen = Get-Content -Raw -LiteralPath (Join-Path $run 'validation\watch-selected-body\actual-live-path-audit.json') | ConvertFrom-Json
$format = Get-Content -Raw -LiteralPath (Join-Path $run 'validation\whitespace-encoding-boundary\verified-boundary.json') | ConvertFrom-Json
if ($lifetimeRed.actualExpectedRed -ne 1 -or !$liveRed.actualSpecificNegativeControlFailed -or
    $liveGreen.actualAuditorExitCode -ne 0 -or !$liveGreen.actualAppPidAbsentAfterExplicitToolStop -or
    !$format.actualProductWhitespacePassed -or !$format.actualOriginalSameCharsetDiagnosticReproduced -or
    !$format.actualEncodingOnlyMirrorWhitespacePassed -or !$format.actualOriginalBomPreserved)
{
    throw 'A required actual lifetime/lifecycle/formatting-boundary gate is not established.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'F022-run-profile.ps1') -Destination (Join-Path $execution 'executed-profile-driver.ps1')
Copy-Item -LiteralPath (Join-Path $run 'measurement-plan.json') -Destination (Join-Path $execution 'executed-measurement-plan.json')
$order = if ($Attempt % 2 -eq 1) { @('original','selected') } else { @('selected','original') }
$account = [ordered]@{
    number = $Attempt
    status = 'in_progress'
    actualStartedBeforeAnyTiming = [DateTimeOffset]::UtcNow.ToString('o')
    capsule = 'initial'
    warmVariantOrder = $order
    profilesStarted = @()
    profilesCompleted = @()
    actualCompleted = $null
    actualFailure = $null
}
$budget.actual_comparisons_started++
$budget.attempts = @($budget.attempts) + $account
$budget | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $budgetFile -Encoding utf8NoBOM
Copy-Item -LiteralPath $budgetFile -Destination (Join-Path $execution 'budget-before-any-timing.json')
try
{
    $profiles = @()
    foreach ($variant in $order)
    {
        $profiles += @{ variant = $variant; mode = 'measure'; firstCase = ''; suffix = 'warm' }
    }
    foreach ($shape in @('Name.List.Constant','Name.Member.Control','Model.Indexer.Value'))
    {
        foreach ($variant in $order)
        {
            $profiles += @{ variant = $variant; mode = 'first-use'; firstCase = $shape; suffix = ('first-' + $shape.Replace('.','-').ToLowerInvariant()) }
        }
    }
    foreach ($profile in $profiles)
    {
        $label = 'comparison-' + $Attempt.ToString('D2') + '-' + $profile.variant + '-' + $profile.suffix
        & (Join-Path $PSScriptRoot 'F022-run-profile.ps1') -Variant $profile.variant -Mode $profile.mode `
            -Label $label -Capsule initial -FirstCase $profile.firstCase -Attempt $Attempt
        $invocationPath = Join-Path $run "profiles\$label\invocation.json"
        $invocation = Get-Content -Raw -LiteralPath $invocationPath | ConvertFrom-Json
        if ($invocation.actualExitCode -ne 0)
        {
            throw 'The actual timing process did not complete successfully.'
        }
        $budget = Get-Content -Raw -LiteralPath $budgetFile | ConvertFrom-Json
        $actual = @($budget.attempts | Where-Object number -eq $Attempt)[0]
        $actual.profilesCompleted += [ordered]@{
            label = $label
            actualInvocationSha256 = (Get-FileHash -LiteralPath $invocationPath).Hash
            actualNativeExitCode = $invocation.actualExitCode
        }
        $budget | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $budgetFile -Encoding utf8NoBOM
    }
    $budget = Get-Content -Raw -LiteralPath $budgetFile | ConvertFrom-Json
    $actual = @($budget.attempts | Where-Object number -eq $Attempt)[0]
    if ($actual.profilesStarted.Count -ne 8 -or $actual.profilesCompleted.Count -ne 8)
    {
        throw 'The actual comparison did not complete both warm profiles and all six first-observed processes.'
    }
    $actual.status = 'completed'
    $actual.actualCompleted = [DateTimeOffset]::UtcNow.ToString('o')
    $budget.actual_comparisons_completed++
    $budget | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $budgetFile -Encoding utf8NoBOM
    Copy-Item -LiteralPath $budgetFile -Destination (Join-Path $execution 'budget-after-actual-comparison.json')
    Write-Output "F022 actual comparison$Attempt completed:two14-row warm profiles and six separate first-observed processes."
}
catch
{
    $failure = $_
    $budget = Get-Content -Raw -LiteralPath $budgetFile | ConvertFrom-Json
    $actual = @($budget.attempts | Where-Object number -eq $Attempt)[0]
    $actual.status = 'failed_or_partial'
    $actual.actualFailure = $failure.Exception.Message
    $actual.actualCompleted = [DateTimeOffset]::UtcNow.ToString('o')
    $budget | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $budgetFile -Encoding utf8NoBOM
    Copy-Item -LiteralPath $budgetFile -Destination (Join-Path $execution 'budget-after-actual-failure.json')
    throw $failure
}
