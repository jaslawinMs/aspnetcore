$ErrorActionPreference='Stop'
$directory=Join-Path $PSScriptRoot 'autoperf-runs\F115\tests\original'
if (Test-Path (Join-Path $directory 'test-audit.json')) {throw 'Never overwrite the actual F115 test audit.'}
Copy-Item $PSCommandPath (Join-Path $directory 'executed-audit-source.ps1')
$discovered=@(Get-Content (Join-Path $directory 'discovery.log')|ForEach-Object {if ($_ -match '^\s+(Microsoft\.AspNetCore\.JsonPatch\.SystemTextJson\..+)$') {$Matches[1]}})
[xml]$trx=Get-Content (Join-Path $directory 'owning-original.trx') -Raw
$results=@($trx.TestRun.Results.UnitTestResult);$definitions=@($trx.TestRun.TestDefinitions.UnitTest);$entries=@($trx.TestRun.TestEntries.TestEntry)
$expansions=@{
    'Microsoft.AspNetCore.JsonPatch.SystemTextJson.Internal.ListAdapterTest.Add_Appends_AtTheEnd'=2
    'Microsoft.AspNetCore.JsonPatch.SystemTextJson.Internal.ListAdapterTest.Add_DifferentComplexTypeWorks'=4
    'Microsoft.AspNetCore.JsonPatch.SystemTextJson.Internal.ListAdapterTest.Add_KeepsObjectReference'=4
    'Microsoft.AspNetCore.JsonPatch.SystemTextJson.Internal.ListAdapterTest.Replace_ReplacesValue_AtGivenPosition'=2
    'Microsoft.AspNetCore.JsonPatch.SystemTextJson.Internal.ObjectVisitorTest.Visit_ValidPathToArray_ReturnsListAdapter'=6
    'Microsoft.AspNetCore.JsonPatch.SystemTextJson.Internal.ObjectVisitorTest.Visit_ValidPathToDictionary_ReturnsDictionaryAdapter'=5
    'Microsoft.AspNetCore.JsonPatch.SystemTextJson.Internal.ObjectVisitorTest.Visit_ValidPath_ReturnsExpandoAdapter'=4
}
if ($discovered.Count -ne 61 -or $definitions.Count -ne 61 -or $results.Count -ne 81 -or $entries.Count -ne 81 -or
    @($results.executionId|Sort-Object -Unique).Count -ne 81 -or
    @(Compare-Object @($discovered|Sort-Object) @($definitions.name|Sort-Object)).Count) {throw 'Exact discovered definition/expanded result sets differ.'}
foreach ($definition in $definitions)
{
    $actual=@($results|Where-Object testId -CEQ $definition.id)
    $expected=if ($expansions.ContainsKey($definition.name)) {$expansions[$definition.name]} else {1}
    if ($actual.Count -ne $expected -or $definition.Execution.id -cnotin $actual.executionId) {throw "Exact source MemberData expansion/definition linkage differs:$($definition.name)"}
    foreach ($row in $actual)
    {
        if ($expected -eq 1 -and $row.testName -cne $definition.name) {throw 'Exact noncollapsed display row differs.'}
        if ($expected -gt 1 -and -not $row.testName.StartsWith($definition.name+'(',[StringComparison]::Ordinal)) {throw 'Expanded row must belong to its exact discovered method.'}
    }
}
$rows=@(foreach ($result in $results)
{
    $definition=@($definitions|Where-Object id -CEQ $result.testId)
    $entry=@($entries|Where-Object {$_.testId -ceq $result.testId -and $_.executionId -ceq $result.executionId})
    if ($result.outcome -cne 'Passed' -or $definition.Count -ne 1 -or $entry.Count -ne 1 -or
        [TimeSpan]::Parse($result.duration).Ticks -le 0) {throw 'Every exact expanded row must pass with positive duration/exact execution and test IDs.'}
    [pscustomobject]@{testName=$result.testName;definitionName=$definition[0].name;testId=$result.testId;executionId=$result.executionId;outcome=$result.outcome;duration=$result.duration}
})
foreach ($required in 'ListAdapterTest.Get(','ListAdapterTest.TryTraverse_JsonArray_ValidNumericIndex_ReturnsElement',
    'ListAdapterTest.Test_DoesNotThrowException_IfTestIsSuccessful','ObjectVisitorTest.Visit_ValidPathToArray_ReturnsListAdapter(',
    'AnonymousObjectIntegrationTest.DeeplyNestedArrayTraversal_ReplaceSucceeds')
{
    if (-not @($rows|Where-Object {$_.testName.Contains($required)}).Count) {throw "Required real reader/traversal row missing:$required"}
}
$execution=Get-Content (Join-Path $directory 'execution.json') -Raw|ConvertFrom-Json
if ($execution.commands.Count -ne 3 -or @($execution.commands|Where-Object exitCode -NE 0).Count) {throw 'All actual original rebuild/discovery/test commands must pass.'}
$output='C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests\Release\net12.0'
if (Test-Path (Join-Path $directory 'image')) {throw 'Never replace actual captured image.'}
New-Item -ItemType Directory -Path (Join-Path $directory 'image') -Force|Out-Null
$images=@(foreach ($name in 'Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests.dll','Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests.pdb',
    'Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests.deps.json','Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests.runtimeconfig.json',
    'Microsoft.AspNetCore.JsonPatch.SystemTextJson.dll','Microsoft.AspNetCore.JsonPatch.SystemTextJson.pdb')
{
    $file=Join-Path $output $name
    Copy-Item $file (Join-Path $directory "image\$name")
    [pscustomobject]@{file=$name;bytes=(Get-Item $file).Length;sha256=(Get-FileHash $file).Hash}
})
[ordered]@{
    candidate='F115';discoveredDefinitions=61;actualExpandedResults=81;sourceMemberDataExpansions=$expansions
    passed=81;failed=0;skipped=0;everyDiscoveredDefinitionAndExpandedRowMatched=$true
    everyRowPositiveDurationAndExactIds=$true;sourceChanged=$false;rows=$rows;capturedTestAndOwnerImage=$images
    trxSha256=(Get-FileHash (Join-Path $directory 'owning-original.trx')).Hash
    firstHelperAuditFailedNotTests=$true;testsRerunToFixAuditor=$false
    note='The first helper incorrectly required one definition/ID per expanded MemberData row. Existing xUnit discovery61 definitions legitimately expands to81 results with unique execution IDs and repeated test IDs/display names. All seven source MemberData cardinalities independently checked;no tests rerun or weakened. Images captured before any later build;not in-test loaded-hash or full-test-closure proof.'
}|ConvertTo-Json -Depth 10|Set-Content (Join-Path $directory 'test-audit.json') -Encoding utf8
[ordered]@{
    candidate='F115';firstHelperExitCode=1;actualChildRebuildDiscoveryTestExitCodes=@(0,0,0)
    expectedByIncorrectHelper=61;actualDefinitions=61;actualExpandedResults=81
    failure='Every discovered exact row must have exactly one actual result/definition/entry.'
    correction='Validate source-defined collapsed MemberData cardinalities and every execution-ID-linked actual result;preserve first executed source and all original logs/TRX. No new test execution.'
}|ConvertTo-Json -Depth 5|Set-Content (Join-Path $directory 'first-helper-audit-failure.json') -Encoding utf8
Write-Output 'F115:81 exact expanded owning rows/61 discovered definitions/7 explicit MemberData cardinalities all passed,0skips;initial auditor failure retained,no test rerun.'
