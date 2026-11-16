param(
    [ValidatePattern('^[a-z0-9-]+$')][string]$Label='original',
    [switch]$NoBuild,
    [switch]$IncludeNewControls
)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F111'
$directory=Join-Path $run "tests\$Label"
if (Test-Path $directory) { throw 'Retain previous test attempts;choose a new exact label.' }
if ((git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
    (git branch --show-current).Trim() -cne 'autoperf/F111-stored-data-buffer') { throw 'Independent F111 baseline branch required.' }
$serializerClass='Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest'
$sessionClass='Microsoft.AspNetCore.Components.Endpoints.SessionStorageTempDataProviderTest'
$facts=@(
    "$serializerClass.ReserializingDeserializedData_IsByteIdentical",
    "$serializerClass.SerializeValue_RoundTripsObjectArrayRecursively",
    "$serializerClass.CanSerialize_ReturnsFalse_ForNonInt32BackedEnum",
    "$sessionClass.RoundTrip_SaveAndLoad_WorksCorrectly",
    "$sessionClass.Save_ThrowsForUnsupportedType",
    "$sessionClass.Save_RemovesSessionEntry_WhenNoDataToSave"
)
$filter=($facts|ForEach-Object {"FullyQualifiedName=$_"}) -join '|'
if ($IncludeNewControls) { $filter+="|FullyQualifiedName~$serializerClass.SerializeData_Preserves" }
New-Item -ItemType Directory -Path $directory -Force|Out-Null
New-Item -ItemType Directory -Path (Join-Path $directory 'source') -Force|Out-Null
foreach ($name in 'JsonStoredDataSerializerTest.cs','SessionStorageTempDataProviderTest.cs')
{
    Copy-Item "src\Components\Endpoints\test\TempData\$name" (Join-Path $directory "source\$name")
}
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
    candidate='F111';label=$Label;arguments=$arguments;exitCode=$code;sdk=$sdk;existingSelectedFacts=$facts
    includeNewPreservationControls=$IncludeNewControls.IsPresent
    startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 30
if ($code) { throw "Actual focused F111 test command failed:$code;retain exact log." }
$trxFile=Join-Path $directory "owning-$Label.trx"
[xml]$trx=Get-Content $trxFile -Raw
$results=@($trx.TestRun.Results.UnitTestResult)
$definitions=@($trx.TestRun.TestDefinitions.UnitTest)
$entries=@($trx.TestRun.TestEntries.TestEntry)
if ($results.Count -ne $(if ($IncludeNewControls) {12} else {6}) -or $definitions.Count -ne $results.Count -or $entries.Count -ne $results.Count -or
    @($results.testId|Sort-Object -Unique).Count -ne $results.Count -or
    (-not $IncludeNewControls -and $results.Count -ne 6))
{
    throw 'Exact nonzero complete F111 discovery/result/definition/entry set required.'
}
$rows=@(foreach ($result in $results)
{
    $definition=@($definitions|Where-Object id -CEQ $result.testId)
    $entry=@($entries|Where-Object {$_.testId -ceq $result.testId -and $_.executionId -ceq $result.executionId})
    if ($result.outcome -cne 'Passed' -or $definition.Count -ne 1 -or $entry.Count -ne 1 -or
        $definition[0].Execution.id -cne $result.executionId -or $definition[0].name -cne $result.testName -or
        [TimeSpan]::Parse($result.duration).Ticks -le 0)
    {
        throw 'Every selected F111 row must pass with exact source/execution identity and positive duration.'
    }
    if ($result.testName -cnotin $facts -and
        -not ($IncludeNewControls -and $result.testName.StartsWith("$serializerClass.SerializeData_Preserves")))
    {
        throw "Unexpected source-defined F111 row:$($result.testName)"
    }
    [pscustomobject]@{testName=$result.testName;testId=$result.testId;executionId=$result.executionId;
        outcome=$result.outcome;duration=$result.duration}
})
foreach ($fact in $facts)
{
    if (@($rows|Where-Object testName -CEQ $fact).Count -ne 1) { throw "Every selected existing F111 Fact must execute once:$fact" }
}
if ($IncludeNewControls)
{
    $ownership="$serializerClass.SerializeData_PreservesOwnedBytesAcrossSubsequentCalls"
    if (@($rows|Where-Object testName -CEQ $ownership).Count -ne 1) { throw 'The exact ownership Fact must execute once.' }
    $largePrefix=[regex]::Escape("$serializerClass.SerializeData_PreservesLargeEscapedOutputAndPropertyOrder")
    $failurePrefix=[regex]::Escape("$serializerClass.SerializeData_PreservesFailureBeforeStorageAndRecovers")
    $lengths=@()
    $failures=@()
    foreach ($row in $rows)
    {
        if ($row.testName -match "^$largePrefix\(length: (16|4096|131072)\)$") { $lengths += [int]$Matches[1] }
        if ($row.testName -match "^$failurePrefix\(throwingEnumeration: (true|false)\)$") { $failures += $Matches[1].ToLowerInvariant() }
    }
    if ((($lengths|Sort-Object) -join ',') -cne '16,4096,131072' -or
        (($failures|Sort-Object) -join ',') -cne 'false,true')
    {
        throw 'Every exact large-output length and both enumeration/depth failure rows must execute and pass.'
    }
}
$testOutput='C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.Components.Endpoints.Tests\Release\net12.0'
New-Item -ItemType Directory -Path (Join-Path $directory 'image') -Force|Out-Null
$image=@(foreach ($name in 'Microsoft.AspNetCore.Components.Endpoints.Tests.dll',
    'Microsoft.AspNetCore.Components.Endpoints.Tests.pdb','Microsoft.AspNetCore.Components.Endpoints.Tests.deps.json',
    'Microsoft.AspNetCore.Components.Endpoints.Tests.runtimeconfig.json','Microsoft.AspNetCore.Components.Endpoints.dll',
    'Microsoft.AspNetCore.Components.Endpoints.pdb')
{
    $file=Join-Path $testOutput $name
    Copy-Item -LiteralPath $file -Destination (Join-Path $directory "image\$name")
    [pscustomobject]@{file=$name;sha256=(Get-FileHash $file).Hash;bytes=(Get-Item $file).Length}
})
New-Item -ItemType Directory -Path (Join-Path $directory 'source') -Force|Out-Null
foreach ($name in 'JsonStoredDataSerializerTest.cs','SessionStorageTempDataProviderTest.cs')
{
    Copy-Item "src\Components\Endpoints\test\TempData\$name" (Join-Path $directory "source\$name")
}
[ordered]@{
    candidate='F111';label=$Label;actualControlRows=$results.Count;passed=$results.Count;failed=0;skipped=0
    positiveDurationsAndExactIds=$true;actualOutput=$testOutput;capturedTestAndOwnerImage=$image
    trxSha256=(Get-FileHash $trxFile).Hash;rows=$rows
    note='Preservation controls on actual compiled serializer/provider with an explicit test session. Public DI and DistributedSession are separate harness boundaries;not a red allocation test or in-test loaded-hash marker.'
}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $directory 'test-audit.json') -Encoding utf8
Write-Output "F111 actual${Label}:$($results.Count) exact positive-duration owning rows passed0skips."
