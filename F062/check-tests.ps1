param([string]$RunRoot)
$ErrorActionPreference = 'Stop'
$run = if ($RunRoot) { $RunRoot } else { Join-Path $PSScriptRoot 'autoperf-runs\F062' }
$all = [Collections.Generic.List[object]]::new()
$phases = @(
    @{name='original-restored';passed=11;failed=0}
    @{name='original-added';passed=11;failed=12}
    @{name='original-added-corrected';passed=13;failed=10}
    @{name='prototype';passed=23;failed=0}
    @{name='final';passed=23;failed=0}
)
foreach ($phase in $phases)
{
    [xml]$trx = Get-Content (Join-Path $run "tests-$($phase.name)\results.trx") -Raw
    $results = @($trx.SelectNodes('//*[local-name()="UnitTestResult"]'))
    if (@($results | Where-Object outcome -eq Passed).Count -ne $phase.passed -or
        @($results | Where-Object outcome -eq Failed).Count -ne $phase.failed -or
        $results.Count -ne $phase.passed+$phase.failed)
    {
        throw "Exact outcomes for$($phase.name) are missing, skipped or unexpected."
    }
    foreach ($result in $results)
    {
        $message = $result.SelectSingleNode('.//*[local-name()="ErrorInfo"]/*[local-name()="Message"]')
        $all.Add([pscustomobject][ordered]@{
            phase=$phase.name;name=$result.testName;outcome=$result.outcome
            error_message=$(if ($message) { $message.InnerText } else { $null })
            initial_bad_fixture_not_counted_as_faithful_red=($phase.name -ceq 'original-added')
        })
    }
}
$original = @($all | Where-Object { $_.phase -ceq 'original-added-corrected' -and $_.outcome -ceq 'Failed' })
if ($original.Count -ne 10 -or @($original | Where-Object {
    $_.name -like '*DoesNotRetainRequestCancellationSource*' -and $_.error_message -notlike '*Assert.False*'
}).Count -or @($original | Where-Object {
    $_.name -like '*KeepsCancellationLinkedUntilResponseCopyCompletes*' -and $_.error_message -notlike '*Assert.Equal*'
}).Count -or @($original | Where-Object name -like '*DoesNotRetainRequestCancellationSource*').Count -ne 8 -or
    @($original | Where-Object name -like '*KeepsCancellationLinkedUntilResponseCopyCompletes*').Count -ne 2)
{
    throw 'All eight weak-source rows and both post-copy registration rows must reach their expected original assertion.'
}
foreach ($row in $original)
{
    foreach ($phase in @('prototype','final'))
    {
        if (@($all | Where-Object { $_.phase -ceq $phase -and $_.name -ceq $row.name -and $_.outcome -ceq 'Passed' }).Count -ne 1)
        {
            throw 'Every genuinely original-red row must independently pass proposed and final source.'
        }
    }
}
if ($all.Count -ne 103 -or @($all | Where-Object outcome -ceq 'Passed').Count -ne 81)
{
    throw 'All103 actual test outcomes, including both distinct failed attempts, must be accounted.'
}
$all.ToArray() | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $run 'all-test-outcomes.json') -Encoding utf8
Write-Output '103 actual outcomes:81 passed/22 failed;12 bad-fixture failures separated from10 genuine reached original-red rows;each genuine row green in both23-row proposed/final suites.'
