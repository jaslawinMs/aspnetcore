param(
    [Parameter(Mandatory)]
    [ValidateSet('before', 'after', 'before-final')]
    [string]$Variant
)

$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F054'
if ($Variant -eq 'before-final')
{
    dotnet test "$run\tests-original-final-binaries\Microsoft.AspNetCore.Components.AI.Tests.dll" --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory "$run\tests-$Variant" *> "$run\test-$Variant.log"
}
else
{
    dotnet test .\src\Components\AI\test\Microsoft.AspNetCore.Components.AI.Tests.csproj -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory "$run\tests-$Variant" *> "$run\test-$Variant.log"
}
$code = $LASTEXITCODE
Get-Content "$run\test-$Variant.log" -Tail 24
if (-not (Test-Path "$run\tests-$Variant\results.trx"))
{
    throw "No actual F054 test report; command exit $code."
}
[xml]$trx = Get-Content "$run\tests-$Variant\results.trx" -Raw
$rows = @($trx.TestRun.Results.UnitTestResult)
$red = @($rows | Where-Object testName -match 'Process_DebugDisabled_CatchUpDoesNotAllocateDiagnostics')
$new = @($rows | Where-Object testName -match 'BlockMappingPipelineTests.Process_Debug')
if ($rows.Count -ne 150 -or $red.Count -ne 6 -or $new.Count -ne 11 -or
    @($new.testName | Sort-Object -Unique).Count -ne 11)
{
    throw 'Missing/ambiguous actual catch-up coverage.'
}
if ($Variant -eq 'after')
{
    if ($code -ne 0 -or @($rows | Where-Object outcome -ne 'Passed').Count)
    {
        throw 'Proposed full AI suite must be entirely green.'
    }
}
else
{
    if ($code -eq 0 -or @($red | Where-Object outcome -ne 'Failed').Count -or
        @($rows | Where-Object outcome -ne 'Passed').Count -ne 6)
    {
        throw 'Original must fail exactly six actual diagnostic-allocation rows.'
    }
    foreach ($row in $red)
    {
        if ($row.testName -notmatch 'callCount: (1|4|16), completed: (True|False)\)')
        {
            throw 'Unresolved individual original row.'
        }
        $expectedBytes = 24 * [int]$Matches[1]
        if ($row.Output.ErrorInfo.Message -notmatch 'Expected: 0' -or
            $row.Output.ErrorInfo.Message -notmatch ("Actual:\s+" + $expectedBytes + "(?:\r|\n|$)"))
        {
            throw "Original row failed for an unexpected reason, not$expectedBytes real diagnostic bytes."
        }
    }
}
$new | Select-Object testName, outcome, duration | ConvertTo-Json -Depth 5 |
    Set-Content "$run\new-test-outcomes-$Variant.json" -Encoding utf8
Write-Output ('Counters: ' + ($trx.TestRun.ResultSummary.Counters | Select-Object total, passed, failed, notExecuted | ConvertTo-Json -Compress))
Write-Output 'All eleven distinct catch-up requirement rows checked individually.'
