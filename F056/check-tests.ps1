param([string]$RunRoot)

$ErrorActionPreference = 'Stop'
$run = if ($RunRoot) { $RunRoot } else { Join-Path $PSScriptRoot 'autoperf-runs\F056' }
$all = [Collections.Generic.List[object]]::new()
$suites = [Collections.Generic.List[object]]::new()
foreach ($variant in @('before', 'after', 'before-final'))
{
    [xml]$trx = Get-Content (Join-Path $run "tests-$variant\results.trx") -Raw
    $rows = @($trx.TestRun.Results.UnitTestResult)
    $focus = @($rows | Where-Object testName -match 'Authorize_(InformationDisabled_DoesNotAllocateUnmetRequirementDiagnostics|ShouldPreserveUnmetRequirementResultAndLogFields|ShouldLogOnlyActualPendingRequirements|ShouldPreserveEagerExplicitFailureDiagnostics|ShouldPreserveSuccessWithUnmetDiagnosticGuard)')
    $expectedFailures = if ($variant -eq 'after') { 0 } else { 10 }
    if ($rows.Count -ne 236 -or $focus.Count -ne 22 -or
        @($rows | Where-Object outcome -eq 'Failed').Count -ne $expectedFailures -or
        @($rows | Where-Object outcome -eq 'Passed').Count -ne (236 - $expectedFailures) -or
        @($rows | Where-Object { $_.outcome -eq 'Failed' -and $_ -notin $focus }).Count)
    {
        throw "Incomplete or unexpected suite: $variant."
    }
    foreach ($count in @(0, 1, 4, 16))
    {
        $row = @($focus | Where-Object testName -match "DoesNotAllocateUnmetRequirementDiagnostics\(requirementCount: $count\)")
        if ($row.Count -ne 1)
        {
            throw 'Missing distinct resource producer row.'
        }
        $bytes = @{ 0 = 96; 1 = 152; 4 = 360; 16 = 984 }[$count]
        if ($variant -ne 'after' -and $row[0].Output.ErrorInfo.Message -notmatch "Expected: 0\s+Actual:\s+$bytes\b")
        {
            throw 'Original resource row failed for a different material effect.'
        }
    }
    foreach ($kind in @('Single', 'EmptyText', 'DuplicateText', 'MultilineText', 'NullText'))
    {
        foreach ($enabled in @('True', 'False'))
        {
            $row = @($focus | Where-Object testName -match "ShouldPreserveUnmetRequirementResultAndLogFields\(kind: `"$kind`", informationEnabled: $enabled\)")
            if ($row.Count -ne 1)
            {
                throw 'Missing safe-ID text/filter case.'
            }
            if ($variant -ne 'after' -and $enabled -eq 'False' -and
                $row[0].Output.ErrorInfo.Message -notmatch 'Expected: 0\s+Actual:\s+1\b')
            {
                throw 'Filtered original text row did not stringify a real pending requirement.'
            }
        }
    }
    $partial = @($focus | Where-Object testName -match 'ShouldLogOnlyActualPendingRequirements\(informationEnabled: False\)')
    if ($partial.Count -ne 1 -or ($variant -ne 'after' -and
        $partial[0].Output.ErrorInfo.Message -notmatch 'Expected: 0\s+Actual:\s+1\b'))
    {
        throw 'Missing actual Succeed/duplicate-input pending producer proof.'
    }
    $suites.Add([pscustomobject]@{
        variant = $variant; total = 236; passed = 236 - $expectedFailures
        expected_original_failures = $expectedFailures; unique_new_rows = 22
        focus = @($focus | Select-Object testName, outcome, duration)
    })
    foreach ($row in $rows)
    {
        $all.Add([pscustomobject]@{ variant = $variant; name = $row.testName; outcome = $row.outcome; duration = $row.duration })
    }
}
$suites.ToArray() | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $run 'test-correctness.json') -Encoding utf8
$all.ToArray() | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $run 'all-test-outcomes.json') -Encoding utf8
Write-Output '708 actual test outcomes688 pass/20 expected original failures/no skips;all22 focused rows accounted and each resource/text/partial original material effect verified.'
