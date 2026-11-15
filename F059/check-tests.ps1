param([string]$RunRoot)

$ErrorActionPreference = 'Stop'
$run = if ($RunRoot) { $RunRoot } else { Join-Path $PSScriptRoot 'autoperf-runs\F059' }
$phases = @('before', 'after', 'guarded-added', 'original-added', 'unguarded-mutation', 'final')
$all = [Collections.Generic.List[object]]::new()
$originalNames = $null
$expandedNames = $null
foreach ($phase in $phases)
{
    [xml]$trx = Get-Content (Join-Path $run "tests-$phase\results.trx") -Raw
    $rows = @($trx.TestRun.Results.UnitTestResult)
    $count = if ($phase -in 'before', 'after') { 362 } else { 371 }
    $failed = @($rows | Where-Object outcome -eq Failed)
    if ($rows.Count -ne $count -or @($rows.testName | Sort-Object -CaseSensitive -Unique).Count -ne $count -or
        @($rows | Where-Object outcome -NotIn Passed,Failed).Count -or
        $failed.Count -ne $(if ($phase -eq 'unguarded-mutation') { 4 } else { 0 }))
    {
        throw "Every individual expected test row/outcome required:$phase."
    }
    $names = @($rows.testName | Sort-Object -CaseSensitive)
    if ($phase -eq 'before')
    {
        $originalNames = $names
    }
    elseif ($phase -eq 'after' -and ($names -join '|') -cne ($originalNames -join '|'))
    {
        throw 'Original/prototype test identities differ.'
    }
    if ($phase -eq 'guarded-added')
    {
        $expandedNames = $names
        $new = @($names | Where-Object { $_ -cnotin $originalNames })
        if ($new.Count -ne 9 -or @($originalNames | Where-Object { $_ -cnotin $names }).Count)
        {
            throw 'Exactly nine additional preservation rows and all original362 required.'
        }
    }
    elseif ($phase -notin 'before', 'after', 'guarded-added' -and
        ($names -join '|') -cne ($expandedNames -join '|'))
    {
        throw 'Original/unsafe/final augmented test identities differ.'
    }
    if ($phase -eq 'unguarded-mutation')
    {
        $dictionary = @($failed | Where-Object testName -Like '*DuplicatePrecedesThrowingDictionaryLookup*')
        $comparer = @($failed | Where-Object testName -Like '*DuplicatePrecedesThrowingComparer*')
        $reentrant = @($failed | Where-Object testName -Like '*PreservesReentrantDictionaryLookup*')
        if ($dictionary.Count -ne 2 -or $comparer.Count -ne 1 -or $reentrant.Count -ne 1 -or
            @($dictionary | Where-Object { $_.Output.ErrorInfo.Message -notlike '*lookup-failure*' }).Count -or
            $comparer[0].Output.ErrorInfo.Message -notlike '*comparer-failure*' -or
            $reentrant[0].Output.ErrorInfo.Message -notlike '*already been rendered*')
        {
            throw 'Exactly four reached interface/subclass/comparer/reentrancy mutation failures required.'
        }
    }
    foreach ($row in $rows)
    {
        $all.Add([pscustomobject]@{
            phase = $phase; test_name = $row.testName; outcome = $row.outcome
            error_message = if ($row.outcome -eq 'Failed') { $row.Output.ErrorInfo.Message } else { $null }
        })
    }
}
$all.ToArray() | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'all-test-outcomes.json') -Encoding utf8
Write-Output "Verified$($all.Count) actual outcomes:2204 pass/four expected unsafe-mutation failures;each nine new original/safe/final preservation row passes."
