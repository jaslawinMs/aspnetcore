param([string]$RunRoot = (Join-Path $PSScriptRoot 'autoperf-runs\F088'))

$ErrorActionPreference = 'Stop'
$checks = @(
    @{directory='tests-before-existing';total=23;passed=23;failed=0},
    @{directory='tests-before';total=29;passed=26;failed=3},
    @{directory='tests-after';total=29;passed=29;failed=0},
    @{directory='tests-e2e-after-debug';total=1;passed=1;failed=0}
)
$all = @()
foreach ($check in $checks)
{
    $file = Join-Path $RunRoot "$($check.directory)\results.trx"
    [xml]$trx = Get-Content -LiteralPath $file -Raw
    $rows = @($trx.TestRun.Results.UnitTestResult)
    if ($rows.Count -ne $check.total -or
        @($rows | Where-Object outcome -eq 'Passed').Count -ne $check.passed -or
        @($rows | Where-Object outcome -eq 'Failed').Count -ne $check.failed -or
        @($rows.executionId | Sort-Object -Unique).Count -ne $rows.Count)
    {
        throw "Actual XML counts/outcomes/execution identities differ:$($check.directory)"
    }
    foreach ($row in $rows)
    {
        $definition = @($trx.TestRun.TestDefinitions.UnitTest | Where-Object id -eq $row.testId)
        if ($definition.Count -ne 1)
        {
            throw 'Actual XML test definition is missing or ambiguous.'
        }
        $message = [string]$row.Output.ErrorInfo.Message
        $all += [ordered]@{
            run=$check.directory;test_name=$row.testName;method=$definition[0].TestMethod.name;
            class=$definition[0].TestMethod.className;outcome=$row.outcome;
            execution_id=$row.executionId;error_message=$message
        }
        if ($check.directory -eq 'tests-before' -and $row.outcome -eq 'Failed' -and
            ($definition[0].TestMethod.name -cne 'RichTextTable_ReusesDefinedAlignmentClasses' -or
             $message -notmatch '^Assert\.Same\(\) Failure: Values are not the same instance'))
        {
            throw 'An original failure is not the expected material resource assertion.'
        }
    }
    if ($check.directory -in @('tests-before','tests-after'))
    {
        $runRows = @($all | Where-Object run -eq $check.directory)
        $resourceRows = @($runRows | Where-Object method -eq 'RichTextTable_ReusesDefinedAlignmentClasses')
        $secondReadRows = @($runRows | Where-Object method -eq 'RichTextTable_FormatsTheSecondAlignmentRead')
        $preservationRows = @($runRows | Where-Object method -eq 'RichTextTable_PreservesNoneMissingAndUndefinedAlignments')
        if ($resourceRows.Count -ne 3 -or $secondReadRows.Count -ne 2 -or $preservationRows.Count -ne 1)
        {
            throw 'Not every named new theory/resource/preservation row actually executed.'
        }
        foreach ($alignment in 'Left','Center','Right')
        {
            if (@($resourceRows | Where-Object test_name -Match "alignment: $alignment,").Count -ne 1)
            {
                throw "Missing or duplicated resource theory execution:$alignment"
            }
        }
        foreach ($alignment in 'None','42')
        {
            if (@($secondReadRows | Where-Object test_name -Match "secondAlignment: $alignment,").Count -ne 1)
            {
                throw "Missing or duplicated second-read execution:$alignment"
            }
        }
        if (@($secondReadRows + $preservationRows | Where-Object outcome -ne 'Passed').Count)
        {
            throw 'A required original/selected preservation assertion did not pass.'
        }
    }
}
if (@($all.execution_id | Sort-Object -Unique).Count -ne $all.Count)
{
    throw 'Actual XML executions are not globally distinct.'
}
$beforeNames = @($all | Where-Object run -eq 'tests-before' | ForEach-Object test_name | Sort-Object)
$afterNames = @($all | Where-Object run -eq 'tests-after' | ForEach-Object test_name | Sort-Object)
if (Compare-Object $beforeNames $afterNames -CaseSensitive)
{
    throw 'Original/selected actual test rows are not identical.'
}
$result = [ordered]@{
    verified=$true;actual_xml_executions=$all.Count;
    passing=@($all | Where-Object outcome -eq 'Passed').Count;
    expected_resource_failures=3;skipped=0;
    original_and_selected_actual_rows_identical=$true;
    checks=$checks;outcomes=$all
}
$result | ConvertTo-Json -Depth 10 |
    Set-Content (Join-Path $RunRoot 'actual-xml-audit.json') -Encoding utf8
Write-Output "F088: verified $($all.Count) actual XML executions, each resource-red/preservation-green row, and the executed real-browser matrix."
