param(
    [Parameter(Mandatory)][string]$RunRoot,
    [switch]$Verify
)
$ErrorActionPreference = 'Stop'
$expected = @(
    'Microsoft.JSInterop.Tests.JSObjectReferenceTest.JSObjectReference_InvokeAsync_CallsUnderlyingJSRuntimeInvokeAsync',
    'Microsoft.JSInterop.Tests.JSObjectReferenceTest.JSInProcessObjectReference_Invoke_CallsUnderlyingJSRuntimeInvoke',
    'Microsoft.JSInterop.Tests.JSObjectReferenceTest.JSObjectReference_Dispose_DisallowsFurtherInteropCalls',
    'Microsoft.JSInterop.Tests.JSObjectReferenceTest.JSInProcessObjectReference_Dispose_DisallowsFurtherInteropCalls',
    'Microsoft.JSInterop.Tests.JSObjectReferenceTest.JSObjectReference_DisposeAsync_IgnoresJSDisconnectedException',
    'Microsoft.JSInterop.Tests.JSObjectReferenceTest.JSObjectReference_DisposeAsync_IgnoresJSDisconnectedException_OnMultipleCalls',
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
    'Microsoft.JSInterop.JSRuntimeTest.InvokeAsync_DoesNotStartWorkWhenCancellationHasBeenRequested'
)
$path = Join-Path $RunRoot 'tests\before\owning-before.trx'
[xml]$xml = Get-Content -LiteralPath $path -Raw
$ns = [System.Xml.XmlNamespaceManager]::new($xml.NameTable)
$ns.AddNamespace('t', 'http://microsoft.com/schemas/VisualStudio/TeamTest/2010')
$results = @($xml.SelectNodes('//t:UnitTestResult', $ns))
$definitions = @{}
foreach ($definition in $xml.SelectNodes('//t:TestDefinitions/t:UnitTest', $ns))
{
    $method = $definition.SelectSingleNode('t:TestMethod', $ns)
    $class = ($method.className -split ',')[0]
    $definitions[$definition.id] = "$class.$($method.name)"
}
$rows = foreach ($result in $results)
{
    $name = $definitions[$result.testId]
    if (-not $name -or $name -notin $expected -or $result.outcome -cne 'Passed' -or
        [TimeSpan]::Parse($result.duration).Ticks -le 0)
    {
        throw "Unexpected, skipped, failed or nonexecuted test: $name/$($result.outcome)/$($result.duration)"
    }
    [ordered]@{name=$name; testId=$result.testId; outcome=$result.outcome; duration=$result.duration}
}
if ($rows.Count -ne $expected.Count -or ($rows.name | Sort-Object -Unique).Count -ne $expected.Count)
{
    throw 'Exact expected eighteen test identities were not each executed once.'
}
$counters = $xml.SelectSingleNode('//t:ResultSummary/t:Counters', $ns)
if ($counters.total -ne '18' -or $counters.executed -ne '18' -or $counters.passed -ne '18' -or
    $counters.failed -ne '0' -or $counters.notExecuted -ne '0')
{
    throw 'TRX summary disagrees with the actual eighteen passing rows.'
}
if (-not $Verify)
{
    [ordered]@{source='tests/before/owning-before.trx'; expectedCount=18; actualCount=$rows.Count; skipped=0; rows=@($rows)} |
        ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $RunRoot 'actual-test-audit.json')
}
"F096: eighteen exact definitions/results, positive durations and zero skips verified."
