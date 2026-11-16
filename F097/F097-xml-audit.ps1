param(
    [Parameter(Mandatory)][string]$RunRoot,
    [Parameter(Mandatory)][string]$Phase,
    [switch]$IncludeProposedTests,
    [switch]$IncludeExplicitTokenTest,
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
    'Microsoft.JSInterop.JSRuntimeExtensionsTest.InvokeVoidAsync_WithInfiniteTimeout'
)
$runtimeMethods = @(
    'DispatchesAsyncCallsWithDistinctAsyncHandles',
    'InvokeAsync_CancelsAsyncTask_AfterDefaultTimeout',
    'InvokeAsync_CompletesSuccessfullyBeforeTimeout',
    'InvokeAsync_CancelsAsyncTasksWhenCancellationTokenFires',
    'PendingAsyncCall_CompletionAfterCancellationDoesNotThrow',
    'InvokeAsync_DoesNotStartWorkWhenCancellationHasBeenRequested',
    'CanCompleteAsyncCallsAsSuccess',
    'CanCompleteAsyncCallsWithComplexType',
    'CanCompleteAsyncCallsWithComplexTypeUsingPropertyCasing',
    'CanCompleteAsyncCallsAsFailure',
    'CanCompleteAsyncCallsWithErrorsDuringDeserialization',
    'CompletingSameAsyncCallMoreThanOnce_IgnoresSecondResultAsync',
    'SerializesDotNetObjectWrappersInKnownFormat',
    'CanSanitizeDotNetInteropExceptions',
    'ReceiveByteArray_AddsInitialByteArray',
    'ReceiveByteArray_AddsMultipleByteArrays',
    'ReceiveByteArray_ClearsByteArraysToBeRevivedWhenIdIsZero',
    'ReceiveByteArray_ThrowsExceptionIfUnexpectedId',
    'BeginTransmittingStream_MultipleStreams',
    'ReadJSDataAsStreamAsync_ThrowsNotSupportedException'
)
if ($IncludeProposedTests)
{
    $runtimeMethods += @(
        'InvokeAsync_ZeroDefaultTimeoutDoesNotDispatchAfterCompletedCall',
        'InvokeAsync_CanceledDefaultTokenIsNotReused',
        'InvokeAsync_ExplicitNoneOverridesDefaultAfterCompletedCall',
        'InvokeAsync_OverlappingDefaultCallsHaveIndependentCancellationTokens',
        'InvokeAsync_DisposeDoesNotCancelPendingDefaultCall',
        'InvokeAsync_InvalidDefaultTimeoutAfterCompletedCallPreservesValidation'
    )
}
if ($IncludeExplicitTokenTest)
{
    $runtimeMethods += 'InvokeAsync_CancellationExceptionPreservesExplicitCallerToken'
}
$expected += $runtimeMethods | ForEach-Object { "Microsoft.JSInterop.JSRuntimeTest.$_" }
$relative = "tests\$Phase\owning-$Phase.trx"
$path = Join-Path $RunRoot $relative
[xml]$xml = Get-Content -LiteralPath $path -Raw
$ns = [System.Xml.XmlNamespaceManager]::new($xml.NameTable)
$ns.AddNamespace('t','http://microsoft.com/schemas/VisualStudio/TeamTest/2010')
$definitions = @{}
foreach ($definition in $xml.SelectNodes('//t:TestDefinitions/t:UnitTest',$ns))
{
    $method = $definition.SelectSingleNode('t:TestMethod',$ns)
    $definitions[$definition.id] = (($method.className -split ',')[0]) + '.' + $method.name
}
$rows = @(
    foreach ($result in $xml.SelectNodes('//t:UnitTestResult',$ns))
    {
        $name = $definitions[$result.testId]
        if (-not $name -or $name -notin $expected -or $result.outcome -cne 'Passed' -or
            [TimeSpan]::Parse($result.duration).Ticks -le 0)
        {
            throw "Unexpected, skipped, failed or nonexecuted actual test:$name/$($result.outcome)/$($result.duration)"
        }
        [ordered]@{name=$name; testId=$result.testId; outcome=$result.outcome; duration=$result.duration}
    }
)
$count = $expected.Count
if ($rows.Count -ne $count -or @($rows.name | Sort-Object -Unique).Count -ne $count)
{
    throw "All$count independently expected actual test identities must each execute once."
}
$counters = $xml.SelectSingleNode('//t:ResultSummary/t:Counters',$ns)
if ($counters.total -ne "$count" -or $counters.executed -ne "$count" -or $counters.passed -ne "$count" -or
    $counters.failed -ne '0' -or $counters.notExecuted -ne '0')
{
    throw 'Actual passing rows and TRX summary disagree.'
}
$audit = [ordered]@{
    candidate='F097'; phase=$Phase; source=$relative
    trxSha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash
    expectedCount=$count; actualCount=$rows.Count; skipped=0; rows=$rows
} | ConvertTo-Json -Depth 7
$destination = Join-Path $RunRoot "actual-test-audit-$Phase.json"
if ($Verify)
{
    if ((Get-Content -LiteralPath $destination -Raw).Trim() -cne $audit.Trim())
    {
        throw 'Derived test audit differs from actual raw rows.'
    }
}
else
{
    $audit | Set-Content -LiteralPath $destination
}
"F097:$count exact $Phase definitions/results, positive durations and zero skips verified."
