param([string]$RunRoot)

$ErrorActionPreference = 'Stop'
$run = if ($RunRoot) { $RunRoot } else { Join-Path $PSScriptRoot 'autoperf-runs\F061' }
$prefix = 'Microsoft.AspNetCore.Internal.CookieChunkingTests.'
$addedMethods = [ordered]@{
    DeleteChunkedCookieWithNonCanonicalResponseName_RetainsCookie = 5
    DeleteChunkedCookieWithExtraRequestChunk_RemovesExtraResponseCookie = 1
    DeleteChunkedCookieWithMissingOrEmptyFirstChunk_RetainsResponseChunks = 2
    DeleteCookieWithUnusualName_MatchesCompletePrefix = 2
    DeleteCookieWithNullResponseHeader_DoesNotReplaceHeaders = 1
    DeleteCookieWithDomainAndDifferentPath_UsesDomainFirst = 1
    DeleteChunkedCookieWithDifferentResponseCase_RemovesCookies = 1
}
$expectedFailureNames = @(
    $prefix + 'DeleteChunkedCookieWithNonCanonicalResponseName_RetainsCookie(caseId: "LeadingZero")'
    $prefix + 'DeleteChunkedCookieWithNonCanonicalResponseName_RetainsCookie(caseId: "TrailingNul")'
    $prefix + 'DeleteChunkedCookieWithExtraRequestChunk_RemovesExtraResponseCookie'
    $prefix + 'DeleteCookieWithUnusualName_MatchesCompletePrefix(key: "Test=Cookie")'
)
$phases = @(
    @{ Name = 'before'; Count = 13; Failed = 0 }
    @{ Name = 'original-added'; Count = 26; Failed = 0 }
    @{ Name = 'prototype'; Count = 26; Failed = 0 }
    @{ Name = 'unsafe-mutation'; Count = 26; Failed = 4 }
    @{ Name = 'final'; Count = 26; Failed = 0 }
)
$all = [Collections.Generic.List[object]]::new()
$originalNames = @()
$fullNames = @()
foreach ($phase in $phases)
{
    $path = Join-Path $run "tests-$($phase.Name)\results.trx"
    [xml]$trx = Get-Content $path -Raw
    $results = @($trx.TestRun.Results.UnitTestResult)
    $names = @($results.testName | Sort-Object -CaseSensitive)
    if ($results.Count -ne $phase.Count -or
        @($names | Sort-Object -CaseSensitive -Unique).Count -ne $phase.Count -or
        @($results | Where-Object { $_.outcome -notin 'Passed','Failed' }).Count -or
        @($results | Where-Object outcome -eq Failed).Count -ne $phase.Failed)
    {
        throw "Actual per-row TRX discovery/outcomes differ from expected phase:$($phase.Name)."
    }
    if ($phase.Name -ceq 'before')
    {
        $originalNames = $names
    }
    else
    {
        if (@($originalNames | Where-Object { $_ -cnotin $names }).Count)
        {
            throw 'Existing exact original test identity disappeared.'
        }
        if ($fullNames.Count -eq 0)
        {
            $fullNames = $names
        }
        elseif (($names -join '|') -cne ($fullNames -join '|'))
        {
            throw 'Actual parameterized rows changed between original/prototype/mutation/final.'
        }
        foreach ($method in $addedMethods.Keys)
        {
            $methodPrefix = $prefix + $method
            if (@($names | Where-Object { $_ -ceq $methodPrefix -or $_.StartsWith($methodPrefix + '(') }).Count -ne
                $addedMethods[$method])
            {
                throw "Missing exact added preservation row:$method."
            }
        }
    }
    foreach ($result in $results)
    {
        if (-not $result.testName.StartsWith($prefix) -or $result.testName -match '[\x00-\x1f]')
        {
            throw 'Unexpected class or unsafe raw-input metadata in configured TRX names.'
        }
        $definitions = @($trx.TestRun.TestDefinitions.UnitTest | Where-Object id -ceq $result.testId)
        if ($definitions.Count -ne 1 -or -not $definitions[0].TestMethod.name)
        {
            throw 'Configured result has no exact discovered method definition.'
        }
        $message = [string]$result.Output.ErrorInfo.Message
        if ($result.outcome -ceq 'Failed' -and
            ($phase.Name -cne 'unsafe-mutation' -or $result.testName -cnotin $expectedFailureNames -or
            -not $message.Contains('Assert.Equal() Failure')))
        {
            throw 'Unanticipated failure or setup/prerequisite failure instead of reached header assertion.'
        }
        $all.Add([pscustomobject][ordered]@{
            phase = $phase.Name; test_name = $result.testName
            discovered_method = $definitions[0].TestMethod.name; outcome = $result.outcome
            expected_mutation_failure = $phase.Name -ceq 'unsafe-mutation' -and $result.outcome -ceq 'Failed'
            failure_message = $message
        })
    }
    if ($phase.Failed -gt 0)
    {
        $failed = @($results | Where-Object outcome -eq Failed | Select-Object -ExpandProperty testName |
            Sort-Object -CaseSensitive)
        if (($failed -join '|') -cne (($expectedFailureNames | Sort-Object -CaseSensitive) -join '|'))
        {
            throw 'Precisely the four reached unsafe simplification rows must fail.'
        }
    }
}
if ($all.Count -ne 117 -or @($all | Where-Object outcome -eq Passed).Count -ne 113)
{
    throw 'Expected all117 actual test outcomes:113 pass and four deliberate assertion failures.'
}
$all.ToArray() | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'all-test-outcomes.json') -Encoding utf8
Write-Output '117 actual TRX rows:113 pass/four reached expected unsafe-matcher header assertions;every new row original/prototype/final green.'
