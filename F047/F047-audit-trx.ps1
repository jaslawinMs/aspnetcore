param(
    [Parameter(Mandatory)]
    [string]$TrxPath,
    [Parameter(Mandatory)]
    [ValidateSet('Existing', 'MultipleFragments', 'All', 'Browser')]
    [string]$Kind
)

$ErrorActionPreference = 'Stop'
[xml]$trx = Get-Content -Raw -LiteralPath $TrxPath
$definitions = @{}
foreach ($definition in $trx.TestRun.TestDefinitions.UnitTest)
{
    $definitions[$definition.id] = $definition.TestMethod
}
$rows = @($trx.TestRun.Results.UnitTestResult | ForEach-Object {
    $definition = $definitions[$_.testId]
    [ordered]@{
        name = $_.testName
        outcome = $_.outcome
        executionId = $_.executionId
        testId = $_.testId
        className = $definition.className
        methodName = $definition.name
        error = $_.Output.ErrorInfo.Message
    }
})
$expectedCount = switch ($Kind)
{
    'Existing' { 98 }
    'MultipleFragments' { 3 }
    'All' { 101 }
    'Browser' { 14 }
}
if ($rows.Count -ne $expectedCount -or
    @($rows | Where-Object { $_.outcome -cne 'Passed' }).Count -ne 0 -or
    @($rows.name | Sort-Object -Unique).Count -ne $expectedCount)
{
    throw "Require $expectedCount distinct passed rows, without skips or failed assertions."
}
if ($Kind -eq 'Browser')
{
    $className = 'Microsoft.AspNetCore.Components.E2ETests.ServerRenderingTests.RenderFragmentSerializationTest'
    $methods = @('SimpleText', 'NestedElements', 'MixedContent', 'WithAttributes',
        'NestedRenderFragment', 'ComponentWithTypedParameters', 'KeyedElements')
    $expectedNames = @($methods | ForEach-Object {
        $method = $_
        foreach ($mode in @('server', 'wasm'))
        {
            "$className.RenderFragmentCrossesBoundary_${method}(mode: `"$mode`")"
        }
    })
    if (@($rows | Where-Object { $_.className -cne $className }).Count -ne 0 -or
        (@($rows.name | Sort-Object -CaseSensitive) | ConvertTo-Json -Compress) -cne
        (@($expectedNames | Sort-Object -CaseSensitive) | ConvertTo-Json -Compress))
    {
        throw 'Every existing browser method must actually execute its Server and WebAssembly row.'
    }
}
else
{
    $allowed = @('Microsoft.AspNetCore.Components.Endpoints.SSRRenderModeBoundaryTest',
        'Microsoft.AspNetCore.Components.Endpoints.EndpointHtmlRendererTest',
        'Microsoft.AspNetCore.Components.Endpoints.RenderFragmentSerializerTest')
    if (@($rows | Where-Object { $_.className -cnotin $allowed }).Count -ne 0)
    {
        throw 'Unexpected owning test class.'
    }
    if ($Kind -in @('MultipleFragments', 'All'))
    {
        $method = 'Microsoft.AspNetCore.Components.Endpoints.EndpointHtmlRendererTest.CanPrerender_MultipleRenderFragmentParameters'
        $actual = @($rows | Where-Object { $_.name.StartsWith("$method(") })
        $expected = @('server', 'wasm', 'auto') | ForEach-Object { "${method}(mode: `"$_`")" }
        if ($actual.Count -ne 3 -or
            (@($actual.name | Sort-Object -CaseSensitive) | ConvertTo-Json -Compress) -cne
            (@($expected | Sort-Object -CaseSensitive) | ConvertTo-Json -Compress))
        {
            throw 'The multiple-fragment assertion must execute separately for Server, WebAssembly and Auto.'
        }
    }
}
[ordered]@{
    candidate = 'F047'
    kind = $Kind
    actualTrxPath = (Resolve-Path -LiteralPath $TrxPath).Path
    actualXmlParsed = $true
    actualAllIndividualParameterizedRowsChecked = $true
    actualPassed = $rows.Count
    actualSkippedOrFailed = 0
    actualRows = @($rows | Sort-Object -Property name -CaseSensitive)
} | ConvertTo-Json -Depth 9
