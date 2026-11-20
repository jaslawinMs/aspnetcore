param([Parameter(Mandatory)][string]$CapsuleRoot)

$ErrorActionPreference = 'Stop'
$roles = @('Original-001', 'Candidate-before-snapshots-001', 'Candidate-after-snapshots-001')
$names = @{}
$observations = @()
foreach ($role in $roles)
{
    $files = @(Get-ChildItem -LiteralPath (Join-Path $CapsuleRoot "existing-tests\$role\results") -Filter '*.trx' -File)
    if ($files.Count -ne 1) { throw 'Exactly one recorded XML result is required per role.' }
    [xml]$xml = Get-Content -LiteralPath $files[0].FullName -Raw
    $rows = @($xml.TestRun.Results.UnitTestResult)
    if ($rows.Count -ne 25) { throw "Missing or extra test executions: $role" }
    $names[$role] = @($rows | ForEach-Object testName | Sort-Object)
    if ($role -eq 'Candidate-before-snapshots-001')
    {
        $failures = @($rows | Where-Object outcome -eq 'Failed')
        if ($failures.Count -ne 17 -or @($rows | Where-Object outcome -eq 'NotExecuted').Count -ne 0)
        {
            throw 'Unexpected first candidate outcomes.'
        }
        foreach ($failure in $failures)
        {
            if ([string]$failure.Output.ErrorInfo.Message -notlike 'VerifyException :*')
            {
                throw 'A recorded candidate failure is not the expected old-snapshot difference.'
            }
        }
    }
    elseif (@($rows | Where-Object outcome -ne 'Passed').Count -ne 0)
    {
        throw "A required exact test execution did not pass: $role"
    }
    $observations += [ordered]@{ role = $role; actualRows = $rows.Count; actualPassed = @($rows | Where-Object outcome -eq 'Passed').Count }
}
foreach ($role in $roles[1..2])
{
    if (Compare-Object $names[$roles[0]] $names[$role])
    {
        throw 'Exact test-name inventories changed between source roles.'
    }
}
[ordered]@{ actualSame25ExactTestNames = $true; actualNoSkippedRequiredRows = $true; actualExpectedSnapshotFailureHistoryPreserved = $true; observations = $observations } |
    ConvertTo-Json -Depth 8
