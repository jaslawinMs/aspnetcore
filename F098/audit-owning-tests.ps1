param([Parameter(Mandatory)][string]$RunRoot,[switch]$Verify)
$ErrorActionPreference = 'Stop'
$path = Join-Path $RunRoot 'tests\original\owning-original.trx'
[xml]$xml = Get-Content -LiteralPath $path -Raw
$ns = [Xml.XmlNamespaceManager]::new($xml.NameTable)
$ns.AddNamespace('t','http://microsoft.com/schemas/VisualStudio/TeamTest/2010')
$definitions = @($xml.SelectNodes('//t:TestDefinitions/t:UnitTest',$ns))
$results = @($xml.SelectNodes('//t:Results/t:UnitTestResult',$ns))
$expected = @('InvokeAsync_WithParamsArgs','InvokeAsync_WithParamsArgsAndCancellationToken',
    'InvokeVoidAsync_WithoutCancellationToken','InvokeVoidAsync_WithCancellationToken',
    'InvokeAsync_WithTimeout','InvokeAsync_WithInfiniteTimeout','InvokeVoidAsync_WithTimeout','InvokeVoidAsync_WithInfiniteTimeout')
$rows = @(
    foreach ($result in $results)
    {
        $definition = @($definitions | Where-Object id -CEQ $result.testId)
        if ($definition.Count -ne 1 -or $definition[0].TestMethod.className -cne 'Microsoft.JSInterop.JSRuntimeExtensionsTest' -or
            $result.outcome -cne 'Passed' -or [TimeSpan]::Parse($result.duration).TotalMilliseconds -le 0 -or
            $definition[0].Execution.id -cne $result.executionId)
        {
            throw 'Actual exact original test definition/result/execution/duration differs.'
        }
        [ordered]@{name=$definition[0].TestMethod.name;class=$definition[0].TestMethod.className;
            testId=$result.testId;executionId=$result.executionId;duration=$result.duration;outcome=$result.outcome}
    }
)
if ($rows.Count -ne 8 -or $definitions.Count -ne 8 -or
    (Compare-Object @($rows.name | Sort-Object) @($expected | Sort-Object) -CaseSensitive) -or
    @($rows.testId | Sort-Object -Unique).Count -ne 8)
{
    throw 'All eight exact original owning names/identities required; no extras, duplicates or skips.'
}
$audit = [ordered]@{candidate='F098';phase='original';actualRows=8;actualDefinitions=8;passed=8;skipped=0;
    exactExpectedNames=$expected;rows=$rows;allPositiveDurations=$true;sourceOwnerUnchanged=$true}
$destination = Join-Path $RunRoot 'actual-test-audit-original.json'
$json = $audit | ConvertTo-Json -Depth 8
if ($Verify)
{
    if ((Get-Content $destination -Raw).Trim() -cne $json.Trim()) { throw 'Recorded exact test audit differs.' }
}
else
{
    $json | Set-Content $destination -Encoding utf8
}
Write-Output 'F098:8 exact owning definitions/results/execution IDs, positive durations/zero skips verified.'
