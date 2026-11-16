param(
    [ValidateSet('original','candidate-1','candidate-2','candidate-3')]
    [string]$Variant='original'
)
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot "autoperf-runs\F104\tests\$Variant"
$sourcePath = 'C:\src\aspnetcore\src\Framework\AspNetCoreAnalyzers\test\RouteHandlers\DetectAmbiguousMappedRoutesTest.cs'
$source = Get-Content $sourcePath -Raw
$trx = [xml](Get-Content (Join-Path $root "owning-$Variant.trx") -Raw)
$actual = @($trx.TestRun.Results.UnitTestResult)
$groups = [regex]::Matches($source,'(?s)\[Theory\]\s+(?<data>(?:\[InlineData\(.*?\)\]\s+)+)public async Task (?<method>\w+)\(string method\)')
$proof = [System.Collections.Generic.List[object]]::new()
foreach ($group in $groups)
{
    $method = $group.Groups['method'].Value
    $data = [regex]::Matches($group.Groups['data'].Value,'\[InlineData\(@"(?<value>(?:""|[^"])*)"\)\]')
    foreach ($row in $data)
    {
        $value = $row.Groups['value'].Value.Replace('""','"')
        $safeDisplay = $value.Replace('\','\\').Replace('"','\"')
        $name = "Microsoft.AspNetCore.Analyzers.RouteHandlers.DetectAmbiguousMappedRoutesTest.$method(method: `"$safeDisplay`")"
        $result = @($actual | Where-Object {$_.testName -ceq $name})
        if ($result.Count -ne 1 -or $result[0].outcome -cne 'Passed' -or
            [TimeSpan]::Parse($result[0].duration).Ticks -le 0)
        {
            throw "Actual source-defined InlineData row missing, skipped or failing: $name"
        }
        $proof.Add([pscustomobject][ordered]@{
            method=$method;inlineData=$value;actualTestName=$name;testId=$result[0].testId
            executionId=$result[0].executionId;outcome=$result[0].outcome;duration=$result[0].duration
        })
    }
}
if ($groups.Count -ne 2 -or $proof.Count -ne 12)
{
    throw 'Actual two source-defined theories and twelve distinct parameter rows are required.'
}
[ordered]@{
    candidate='F104';variant=$Variant;sourceSha256=(Get-FileHash $sourcePath).Hash
    actualSourceDefinedTheories=$groups.Count;actualVerifiedInlineDataRows=$proof.Count
    everyIndividualRowPassedForItsExactSourceParameter=$true;existingControlsNotRedGreenPerformanceTests=$true
    rows=$proof
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $root 'parameter-row-proof.json') -Encoding utf8
Write-Output "F104 $Variant controls: all12 exact individual source-defined parameter rows passed."
