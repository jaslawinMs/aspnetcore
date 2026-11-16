param(
    [ValidatePattern('^[a-z0-9-]+$')][string]$Label='original',
    [switch]$NoBuild,
    [switch]$IncludeNewControls
)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F112'
$directory=Join-Path $run "tests\$Label"
if (Test-Path $directory) { throw 'Preserve every actual F112 test attempt.' }
if ((git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
    (git branch --show-current).Trim() -cne 'autoperf/F112-stored-value-buffer') { throw 'Independent F112 baseline branch required.' }
$serializerClass='Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest'
$sessionClass='Microsoft.AspNetCore.Components.Endpoints.SessionCascadingValueSupplierTest'
$facts=@(
    "$serializerClass.SerializeValue_RoundTrips_ToDeclaredType",
    "$serializerClass.SerializeValue_RoundTripsEnumToItsOwnType",
    "$serializerClass.SerializeValue_Throws_ForUnsupportedType",
    "$serializerClass.SerializeValue_RoundTripsCollection_ToSourceType",
    "$serializerClass.SerializeValue_RoundTripsEnumList_ToSourceType",
    "$serializerClass.SerializeValue_RoundTripsEnumDictionary_ToSourceType",
    "$serializerClass.SerializeValue_RoundTripsNullableEnumArray_ToSourceType",
    "$serializerClass.SerializeValue_RoundTripsObjectArrayRecursively",
    "$sessionClass.PersistAllValues_SetsValueInSession",
    "$sessionClass.PersistAllValues_RemovesKey_WhenCallbackReturnsNull",
    "$sessionClass.PersistAllValues_Throws_ForUnsupportedType",
    "$sessionClass.PersistAllValues_ContinuesOnCallbackException"
)
$filter=($facts|ForEach-Object {"FullyQualifiedName=$_"}) -join '|'
if ($IncludeNewControls) { $filter+="|FullyQualifiedName~$serializerClass.SerializeValue_Preserves" }
New-Item -ItemType Directory -Path (Join-Path $directory 'source') -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
foreach ($file in 'TempData\JsonStoredDataSerializerTest.cs','Session\SessionCascadingValueSupplierTest.cs')
{
    Copy-Item "src\Components\Endpoints\test\$file" (Join-Path $directory "source\$(Split-Path $file -Leaf)")
}
Copy-Item 'src\Components\Endpoints\src\Serialization\JsonStoredDataSerializer.cs' (Join-Path $directory 'source\owner.cs')
$arguments=@('test','src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj',
    '--no-restore','-c','Release','-m:2','-p:UseIisNativeAssets=false','--filter',$filter,
    '--logger',"trx;LogFileName=owning-$Label.trx",'--results-directory',$directory,'-v:minimal')
if ($NoBuild) { $arguments+='--no-build' }
$sdk=dotnet --version
if ($LASTEXITCODE) { throw 'Activated SDK identity failed.' }
$started=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'console.log')
$code=$LASTEXITCODE
[ordered]@{
    candidate='F112';label=$Label;arguments=$arguments;exitCode=$code;sdk=$sdk;existingSelectedFacts=$facts
    includeNewPreservationControls=$IncludeNewControls.IsPresent
    startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 25
if ($code) { throw "Actual focused F112 tests failed:$code;preserve this attempt." }
$trxFile=Join-Path $directory "owning-$Label.trx"
[xml]$trx=Get-Content $trxFile -Raw
$results=@($trx.TestRun.Results.UnitTestResult)
$definitions=@($trx.TestRun.TestDefinitions.UnitTest)
$entries=@($trx.TestRun.TestEntries.TestEntry)
$expectedCount=if ($IncludeNewControls) {18} else {12}
if ($results.Count -ne $expectedCount -or $definitions.Count -ne $expectedCount -or $entries.Count -ne $expectedCount -or
    @($results.testId|Sort-Object -Unique).Count -ne $expectedCount) { throw 'Exact nonzero discovery/definition/entry/result sets required.' }
$rows=@(foreach ($result in $results)
{
    $definition=@($definitions|Where-Object id -CEQ $result.testId)
    $entry=@($entries|Where-Object {$_.testId -ceq $result.testId -and $_.executionId -ceq $result.executionId})
    if ($result.outcome -cne 'Passed' -or $definition.Count -ne 1 -or $entry.Count -ne 1 -or
        $definition[0].Execution.id -cne $result.executionId -or $definition[0].name -cne $result.testName -or
        [TimeSpan]::Parse($result.duration).Ticks -le 0) { throw 'Every exact row must pass with positive duration and matching IDs.' }
    if ($result.testName -cnotin $facts -and
        -not ($IncludeNewControls -and $result.testName.StartsWith("$serializerClass.SerializeValue_Preserves"))) { throw 'Unexpected F112 test.' }
    [pscustomobject]@{testName=$result.testName;testId=$result.testId;executionId=$result.executionId;outcome=$result.outcome;duration=$result.duration}
})
foreach ($fact in $facts)
{
    if (@($rows|Where-Object testName -CEQ $fact).Count -ne 1) { throw "Every selected existing Fact must execute once:$fact" }
}
if ($IncludeNewControls)
{
    if (@($rows|Where-Object testName -CEQ "$serializerClass.SerializeValue_PreservesOwnedBytesAcrossSubsequentCalls").Count -ne 1) { throw 'Ownership Fact must execute once.' }
    $largePrefix=[regex]::Escape("$serializerClass.SerializeValue_PreservesLargeEscapedOutputAndDeclaredType")
    $failurePrefix=[regex]::Escape("$serializerClass.SerializeValue_PreservesFailureBeforeSessionReplacementAndRecovers")
    $lengths=@();$failures=@()
    foreach ($row in $rows)
    {
        if ($row.testName -match "^$largePrefix\(length: (16|4096|131072)\)$") { $lengths += [int]$Matches[1] }
        if ($row.testName -match "^$failurePrefix\(unsupportedType: (true|false)\)$") { $failures += $Matches[1].ToLowerInvariant() }
    }
    if ((($lengths|Sort-Object) -join ',') -cne '16,4096,131072' -or (($failures|Sort-Object) -join ',') -cne 'false,true') { throw 'Every parameter row must execute exactly once.' }
}
$testOutput='C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.Components.Endpoints.Tests\Release\net12.0'
New-Item -ItemType Directory -Path (Join-Path $directory 'image') -Force|Out-Null
$image=@(foreach ($name in 'Microsoft.AspNetCore.Components.Endpoints.Tests.dll','Microsoft.AspNetCore.Components.Endpoints.Tests.pdb',
    'Microsoft.AspNetCore.Components.Endpoints.Tests.deps.json','Microsoft.AspNetCore.Components.Endpoints.Tests.runtimeconfig.json',
    'Microsoft.AspNetCore.Components.Endpoints.dll','Microsoft.AspNetCore.Components.Endpoints.pdb')
{
    $file=Join-Path $testOutput $name
    Copy-Item -LiteralPath $file -Destination (Join-Path $directory "image\$name")
    [pscustomobject]@{file=$name;sha256=(Get-FileHash $file).Hash;bytes=(Get-Item $file).Length}
})
[ordered]@{
    candidate='F112';label=$Label;actualControlRows=$results.Count;passed=$results.Count;failed=0;skipped=0
    positiveDurationsAndExactIds=$true;actualOutput=$testOutput;capturedTestAndOwnerImage=$image;trxSha256=(Get-FileHash $trxFile).Hash;rows=$rows
    note='Exact compiled source-defined rows. Original callback-based existing tests do not alone prove public renderer/endpoint reachability;separate canonical browser and real-renderer harness establish those exercised boundaries.'
}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $directory 'test-audit.json') -Encoding utf8
Write-Output "F112:${Label}:$($rows.Count) exact positive-duration owning rows passed,0skips."
