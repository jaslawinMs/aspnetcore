param(
    [Parameter(Mandatory)]
    [ValidateRange(1,3)]
    [int]$Attempt
)

$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F028'
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
$capsule = Get-Content -Raw -LiteralPath (Join-Path $run 'prepared\capsule.json') | ConvertFrom-Json
$source = 'C:\src\aspnetcore\src\Identity\Core\src\SignInManager.cs'
if ((Get-FileHash -LiteralPath $source).Hash -cne $capsule.actualSelectedSourceSha256)
{
    throw 'The selected proposal changed after the recorded owning checks.'
}
$owning = Get-Content -Raw -LiteralPath (Join-Path $run 'validation\selected-owning\verified-result.json') | ConvertFrom-Json
$red = Get-Content -Raw -LiteralPath (Join-Path $run 'validation\original-resource-characterization-002\verified-result.json') | ConvertFrom-Json
$format = Get-Content -Raw -LiteralPath (Join-Path $run 'validation\whitespace\invocation.json') | ConvertFrom-Json
$build = Get-Content -Raw -LiteralPath (Join-Path $run "$($capsule.actualPreparationLabel)\owner-build-invocation.json") | ConvertFrom-Json
if ($owning.actualPassed -ne 138 -or $owning.actualExpectedRed -ne 0 -or $owning.actualSkipped -ne 0 -or
    $red.actualPassed -ne 137 -or $red.actualExpectedRed -ne 1 -or $red.actualSkipped -ne 0 -or
    $format.actualExitCode -ne 0 -or $build.actualExitCode -ne 0 -or !$capsule.actualOtherSignInManagerMethodsUnchanged)
{
    throw 'Require the corrected actual original resource red and selected owning/build/formatting/scope gates.'
}
foreach ($variant in @('original','selected'))
{
    $characterization = Join-Path $run "profiles\characterize-$variant-002"
    $exit = Get-Content -Raw -LiteralPath (Join-Path $characterization 'verified-native-exit.json') | ConvertFrom-Json
    $completion = @(Get-ChildItem -LiteralPath (Join-Path $characterization 'states') -Filter '*characterization-completed.json' -File)
    if ($exit.actualNativeExitCode -ne 0 -or $completion.Count -ne 1)
    {
        throw 'Both actual untimed consumer characterizations must complete.'
    }
    $record = Get-Content -Raw -LiteralPath $completion[0].FullName | ConvertFrom-Json
    if (!$record.allSuccessful -or $record.actualTimedWrapperPaths -ne 10 -or
        $record.actualRecordedProfileContracts -ne 20 -or $record.actualAdditionalProducerContracts -ne 18)
    {
        throw 'All actual public wrapper and additional scheme/override/async/metadata contracts must match.'
    }
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'F028-run-profile.ps1') -Destination (Join-Path $execution 'executed-profile-driver.ps1')
Copy-Item -LiteralPath (Join-Path $run 'measurement-plan.json') -Destination (Join-Path $execution 'executed-measurement-plan.json')
$order = if ($Attempt % 2 -eq 1) { @('original','selected') } else { @('selected','original') }
$account = [ordered]@{
    number = $Attempt; status = 'in_progress'; actualStartedBeforeAnyTiming = [DateTimeOffset]::UtcNow.ToString('o')
    warmVariantOrder = $order; profilesStarted = @(); profilesCompleted = @(); actualCompleted = $null; actualFailure = $null
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
    foreach ($shape in @('Default.Four.Tail','DerivedManager.Four.Tail'))
    {
        foreach ($variant in $order)
        {
            $profiles += @{ variant = $variant; mode = 'first-use'; firstCase = $shape; suffix = ('first-' + $shape.Replace('.','-').ToLowerInvariant()) }
        }
    }
    foreach ($profile in $profiles)
    {
        $label = 'comparison-' + $Attempt.ToString('D2') + '-' + $profile.variant + '-' + $profile.suffix
        & (Join-Path $PSScriptRoot 'F028-run-profile.ps1') -Variant $profile.variant -Mode $profile.mode `
            -Label $label -FirstCase $profile.firstCase -Attempt $Attempt
        $invocationPath = Join-Path $run "profiles\$label\invocation.json"
        $invocation = Get-Content -Raw -LiteralPath $invocationPath | ConvertFrom-Json
        if ($invocation.actualExitCode -ne 0)
        {
            throw 'The actual timing process did not complete successfully.'
        }
        $budget = Get-Content -Raw -LiteralPath $budgetFile | ConvertFrom-Json
        $actual = @($budget.attempts | Where-Object number -eq $Attempt)[0]
        $actual.profilesCompleted += [ordered]@{
            label = $label; actualInvocationSha256 = (Get-FileHash -LiteralPath $invocationPath).Hash
            actualNativeExitCode = $invocation.actualExitCode
        }
        $budget | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $budgetFile -Encoding utf8NoBOM
    }
    $budget = Get-Content -Raw -LiteralPath $budgetFile | ConvertFrom-Json
    $actual = @($budget.attempts | Where-Object number -eq $Attempt)[0]
    if ($actual.profilesStarted.Count -ne 6 -or $actual.profilesCompleted.Count -ne 6)
    {
        throw 'Require both warm profiles and all four separate first-observed processes.'
    }
    $actual.status = 'completed'
    $actual.actualCompleted = [DateTimeOffset]::UtcNow.ToString('o')
    $budget.actual_comparisons_completed++
    $budget | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $budgetFile -Encoding utf8NoBOM
    Copy-Item -LiteralPath $budgetFile -Destination (Join-Path $execution 'budget-after-actual-comparison.json')
    Write-Output "F028 actual comparison$Attempt completed:two10-row warm profiles and four separate first-observed processes."
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
