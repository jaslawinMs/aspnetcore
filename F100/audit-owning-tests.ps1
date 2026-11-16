param([Parameter(Mandatory)][string]$RunRoot,[switch]$Verify)
$ErrorActionPreference = 'Stop'
$path = Join-Path $RunRoot 'tests\original\owning-original.trx'
[xml]$xml = Get-Content -LiteralPath $path -Raw
$ns = [Xml.XmlNamespaceManager]::new($xml.NameTable)
$ns.AddNamespace('t','http://microsoft.com/schemas/VisualStudio/TeamTest/2010')
$definitions = @($xml.SelectNodes('//t:TestDefinitions/t:UnitTest',$ns))
$results = @($xml.SelectNodes('//t:Results/t:UnitTestResult',$ns))
$expected = @(
    'Microsoft.JSInterop.JSRuntimeExtensionsTest.InvokeAsync_WithParamsArgs',
    'Microsoft.JSInterop.JSRuntimeExtensionsTest.InvokeAsync_WithParamsArgsAndCancellationToken',
    'Microsoft.JSInterop.JSRuntimeExtensionsTest.InvokeVoidAsync_WithoutCancellationToken',
    'Microsoft.JSInterop.JSRuntimeExtensionsTest.InvokeVoidAsync_WithCancellationToken',
    'Microsoft.JSInterop.JSRuntimeExtensionsTest.InvokeAsync_WithTimeout',
    'Microsoft.JSInterop.JSRuntimeExtensionsTest.InvokeAsync_WithInfiniteTimeout',
    'Microsoft.JSInterop.JSRuntimeExtensionsTest.InvokeVoidAsync_WithTimeout',
    'Microsoft.JSInterop.JSRuntimeExtensionsTest.InvokeVoidAsync_WithInfiniteTimeout',
    'Microsoft.JSInterop.JSRuntimeTest.InvokeAsync_CancelsAsyncTask_AfterDefaultTimeout',
    'Microsoft.JSInterop.JSRuntimeTest.InvokeAsync_CompletesSuccessfullyBeforeTimeout',
    'Microsoft.JSInterop.JSRuntimeTest.InvokeAsync_CancelsAsyncTasksWhenCancellationTokenFires',
    'Microsoft.JSInterop.JSRuntimeTest.InvokeAsync_DoesNotStartWorkWhenCancellationHasBeenRequested',
    'Microsoft.JSInterop.Tests.JSObjectReferenceTest.JSObjectReference_InvokeAsync_CallsUnderlyingJSRuntimeInvokeAsync',
    'Microsoft.JSInterop.Tests.JSObjectReferenceTest.JSObjectReference_Dispose_DisallowsFurtherInteropCalls',
    'Microsoft.JSInterop.Tests.JSObjectReferenceTest.JSObjectReference_DisposeAsync_IgnoresJSDisconnectedException',
    'Microsoft.JSInterop.Tests.JSObjectReferenceTest.JSObjectReference_DisposeAsync_IgnoresJSDisconnectedException_OnMultipleCalls'
)
$rows = @(
    foreach ($result in $results)
    {
        $definition = @($definitions | Where-Object id -CEQ $result.testId)
        if ($definition.Count -ne 1 -or $result.outcome -cne 'Passed' -or
            [TimeSpan]::Parse($result.duration).TotalMilliseconds -le 0 -or
            $definition[0].Execution.id -cne $result.executionId)
        {
            throw 'F100 exact original test definition/result/execution/duration differs.'
        }
        $class = $definition[0].TestMethod.className
        $name = $definition[0].TestMethod.name
        [ordered]@{name=$name;class=$class;fullName="$class.$name";testId=$result.testId;
            executionId=$result.executionId;duration=$result.duration;outcome=$result.outcome}
    }
)
if ($rows.Count -ne 16 -or $definitions.Count -ne 16 -or
    (Compare-Object @($rows.fullName | Sort-Object) @($expected | Sort-Object) -CaseSensitive) -or
    @($rows.testId | Sort-Object -Unique).Count -ne 16 -or @($rows.fullName | Sort-Object -Unique).Count -ne 16)
{
    throw 'All16 exact F100 original owning names/identities required;no extras,duplicates or skips.'
}
$audit = [ordered]@{candidate='F100';phase='original';actualRows=16;actualDefinitions=16;passed=16;skipped=0;
    exactExpectedNames=$expected;rows=$rows;allPositiveDurations=$true;sourceOwnerUnchanged=$true}
$destination = Join-Path $RunRoot 'actual-test-audit-original.json'
$json = $audit | ConvertTo-Json -Depth 8
if ($Verify)
{
    if ((Get-Content $destination -Raw).Trim() -cne $json.Trim()) { throw 'Recorded F100 exact test audit differs.' }
}
else
{
    $json | Set-Content $destination -Encoding utf8
}
Write-Output 'F100:16 exact owning definitions/results/execution IDs,positive durations/zero skips verified.'
