param(
    [Parameter(Mandatory)]
    [ValidateSet('before', 'after', 'after-2', 'after-final', 'before-final', 'before-final-2')]
    [string]$Variant
)

$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$s = '<SESSION_FILES>'
$run = "$s\autoperf-runs\F051"
$project = '.\src\Components\AI\test\Microsoft.AspNetCore.Components.AI.Tests.csproj'
if ($Variant.StartsWith('before-final'))
{
    $folder = if ($Variant -eq 'before-final') { 'tests-original-final-binaries' } else { 'tests-original-final-2-binaries' }
    $project = "$run\$folder\Microsoft.AspNetCore.Components.AI.Tests.dll"
    dotnet test $project --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory "$run\tests-$Variant" *> "$run\test-$Variant.log"
}
else
{
    dotnet test $project -c Release --no-restore -p:UseIisNativeAssets=false -p:BuildNodeJS=false -p:CrossgenOutput=false -p:GenerateInstallers=false -m:2 --verbosity quiet --logger 'trx;LogFileName=results.trx' --results-directory "$run\tests-$Variant" *> "$run\test-$Variant.log"
}
$code = $LASTEXITCODE
Get-Content "$run\test-$Variant.log" -Tail 35
if (-not (Test-Path "$run\tests-$Variant\results.trx"))
{
    throw "No actual test report; command exit $code."
}
[xml]$t = Get-Content "$run\tests-$Variant\results.trx" -Raw
$all = @($t.TestRun.Results.UnitTestResult)
$red = @($all | Where-Object testName -match 'SendMessageAsync_DebugDisabled_DoesNotReadContentsBeforeFiltering')
$new = @($all | Where-Object testName -match 'UIAgentTests.SendMessageAsync_Debug')
if ($red.Count -ne 3 -or $new.Count -lt 5 -or @($new.testName | Sort-Object -Unique).Count -ne $new.Count)
{
    throw 'Missing/ambiguous newly added actual-stream test rows.'
}
if ($Variant.StartsWith('after'))
{
    if ($code -ne 0 -or @($all | Where-Object outcome -ne 'Passed').Count)
    {
        throw 'Proposed full AI suite must be entirely green.'
    }
}
else
{
    if ($code -eq 0 -or @($red | Where-Object outcome -ne 'Failed').Count -or @($all | Where-Object outcome -ne 'Passed').Count -ne 3)
    {
        throw 'Original must fail exactly three actual producer eager-read rows.'
    }
    foreach ($r in $red)
    {
        if ($r.testName -notmatch 'contentCount: (1|4|16)\)')
        {
            throw "Unexpected row identity $($r.testName)."
        }
        $count = [int]$Matches[1]
        $message = $r.Output.ErrorInfo.Message
        if ($message -notmatch 'Expected: 0' -or $message -notmatch ("Actual:\s+" + $count + "(?:\r|\n|$)"))
        {
            throw "Unexpected original read count for $($r.testName): $message"
        }
    }
}
$new | Select-Object testName, outcome, duration | ConvertTo-Json -Depth 5 | Set-Content "$run\new-test-outcomes-$Variant.json" -Encoding utf8
Write-Output ('Counters: ' + ($t.TestRun.ResultSummary.Counters | Select-Object total, passed, failed, notExecuted | ConvertTo-Json -Compress))
Write-Output "$($new.Count) distinct new test rows individually validated."
