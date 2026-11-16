param([ValidatePattern('^[a-z0-9-]+$')][string]$Label='original',[switch]$NoBuild,[switch]$IncludeNewControls)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F113'
$directory=Join-Path $run "tests\$Label"
if (Test-Path $directory) {throw 'Preserve every actual F113 test attempt.'}
if ((git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
    (git branch --show-current).Trim() -cne 'autoperf/F113-distributed-cache-encode') {throw 'Independent F113 baseline branch required.'}
$class='Microsoft.AspNetCore.Mvc.TagHelpers.DistributedCacheTagHelperTest'
$facts=@(
    'ProcessAsync_DoesNotCache_IfDisabled','ProcessAsync_ReturnsCachedValue_IfEnabled',
    'ProcessAsync_ReturnsCachedValue_IfVaryByParamIsUnchanged','ProcessAsync_RecalculatesValueIfCacheKeyChanges',
    'UpdateCacheEntryOptions_SetsAbsoluteExpiration_IfExpiresOnIsSet','UpdateCacheEntryOptions_DefaultsTo30SecondsSliding_IfNoEvictionCriteriaIsProvided',
    'UpdateCacheEntryOptions_SetsAbsoluteExpiration_IfExpiresAfterIsSet','UpdateCacheEntryOptions_SetsSlidingExpiration_IfExpiresSlidingIsSet',
    'ProcessAsync_UsesExpiresAfter_ToExpireCacheEntry','ProcessAsync_UsesExpiresOn_ToExpireCacheEntry',
    'ProcessAsync_UsesExpiresSliding_ToExpireCacheEntryWithSlidingExpiration','ProcessAsync_ComputesValueOnce_WithConcurrentRequests',
    'ProcessAsync_ExceptionInProcessing_DoesntBlockConcurrentRequests','Deserialize_DoesntAlterValue_WhenSerialized'
)|ForEach-Object {"$class.$_"}
$filter=($facts|ForEach-Object {"FullyQualifiedName=$_"}) -join '|'
if ($IncludeNewControls) {$filter+="|FullyQualifiedName=$class.ProcessAsync_PreservesEncodedCacheBytesAndReadsCachedContent|FullyQualifiedName=$class.ProcessAsync_PreservesStoredBytesAcrossFormatterMutationAndSubsequentCalls"}
New-Item -ItemType Directory -Path (Join-Path $directory 'source') -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
Copy-Item 'src\Mvc\Mvc.TagHelpers\test\DistributedCacheTagHelperTest.cs' (Join-Path $directory 'source\DistributedCacheTagHelperTest.cs')
Copy-Item 'src\Mvc\Mvc.TagHelpers\src\Cache\DistributedCacheTagHelperService.cs' (Join-Path $directory 'source\owner.cs')
$arguments=@('test','src\Mvc\Mvc.TagHelpers\test\Microsoft.AspNetCore.Mvc.TagHelpers.Test.csproj','--no-restore','-c','Release','-m:2',
    '-p:UseIisNativeAssets=false','--filter',$filter,'--logger',"trx;LogFileName=owning-$Label.trx",'--results-directory',$directory,'-v:minimal')
if ($NoBuild) {$arguments+='--no-build'}
$sdk=dotnet --version
if ($LASTEXITCODE) {throw 'Activated SDK identity failed.'}
$started=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'console.log')
$code=$LASTEXITCODE
[ordered]@{candidate='F113';label=$Label;arguments=$arguments;exitCode=$code;sdk=$sdk;existingSelectedFacts=$facts
    includeNewPreservationControls=$IncludeNewControls.IsPresent;startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 25
if ($code) {throw "Actual F113 owning tests failed:$code;preserve this attempt."}
$trxFile=Join-Path $directory "owning-$Label.trx"
[xml]$trx=Get-Content $trxFile -Raw
$results=@($trx.TestRun.Results.UnitTestResult);$definitions=@($trx.TestRun.TestDefinitions.UnitTest);$entries=@($trx.TestRun.TestEntries.TestEntry)
$expected=if ($IncludeNewControls) {19} else {14}
if ($results.Count -ne $expected -or $definitions.Count -ne $expected -or $entries.Count -ne $expected -or
    @($results.testId|Sort-Object -Unique).Count -ne $expected) {throw 'Exact positive discovery/definition/entry/result sets required.'}
$rows=@(foreach ($result in $results)
{
    $definition=@($definitions|Where-Object id -CEQ $result.testId)
    $entry=@($entries|Where-Object {$_.testId -ceq $result.testId -and $_.executionId -ceq $result.executionId})
    if ($result.outcome -cne 'Passed' -or $definition.Count -ne 1 -or $entry.Count -ne 1 -or
        $definition[0].Execution.id -cne $result.executionId -or $definition[0].name -cne $result.testName -or
        [TimeSpan]::Parse($result.duration).Ticks -le 0) {throw 'Every exact row must pass with positive duration and matching IDs.'}
    [pscustomobject]@{testName=$result.testName;testId=$result.testId;executionId=$result.executionId;outcome=$result.outcome;duration=$result.duration}
})
foreach ($fact in $facts) {if (@($rows|Where-Object testName -CEQ $fact).Count -ne 1) {throw "Every original selected Fact must run once:$fact"}}
if ($IncludeNewControls)
{
    $prefix=[regex]::Escape("$class.ProcessAsync_PreservesEncodedCacheBytesAndReadsCachedContent")
    $lengths=@(foreach ($row in $rows) {if ($row.testName -match "^$prefix\(contentLength: (0|32|16384|131072)\)$") {[int]$Matches[1]}})
    if ((($lengths|Sort-Object) -join ',') -cne '0,32,16384,131072' -or
        @($rows|Where-Object testName -CEQ "$class.ProcessAsync_PreservesStoredBytesAcrossFormatterMutationAndSubsequentCalls").Count -ne 1) {throw 'Every new parameter row/ownership Fact required.'}
}
$testOutput='C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.Mvc.TagHelpers.Test\Release\net12.0'
New-Item -ItemType Directory -Path (Join-Path $directory 'image') -Force|Out-Null
$image=@(foreach ($name in 'Microsoft.AspNetCore.Mvc.TagHelpers.Test.dll','Microsoft.AspNetCore.Mvc.TagHelpers.Test.pdb',
    'Microsoft.AspNetCore.Mvc.TagHelpers.Test.deps.json','Microsoft.AspNetCore.Mvc.TagHelpers.Test.runtimeconfig.json',
    'Microsoft.AspNetCore.Mvc.TagHelpers.dll','Microsoft.AspNetCore.Mvc.TagHelpers.pdb')
{
    $file=Join-Path $testOutput $name;Copy-Item $file (Join-Path $directory "image\$name")
    [pscustomobject]@{file=$name;sha256=(Get-FileHash $file).Hash;bytes=(Get-Item $file).Length}
})
[ordered]@{candidate='F113';label=$Label;actualControlRows=$results.Count;passed=$results.Count;failed=0;skipped=0
    positiveDurationsAndExactIds=$true;actualOutput=$testOutput;capturedTestAndOwnerImage=$image;trxSha256=(Get-FileHash $trxFile).Hash;rows=$rows
    note='Exact compiled source-defined owning rows;full-test-closure/in-test loaded-hash proof not claimed. Separate real-DI/public-tag-helper harness establishes exercised producer/store/encoded-byte/next-hit boundary.'
}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $directory 'test-audit.json') -Encoding utf8
Write-Output "F113:${Label}:$($rows.Count) exact positive-duration owning rows passed,0skips."
