$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F008'
$destination=Join-Path $run 'tests\original'
if(Test-Path $destination){throw 'Preserve actual original test execution.'}
$investigation=Get-Content (Join-Path $run 'current-source-investigation.json') -Raw|ConvertFrom-Json
if((git rev-parse HEAD).Trim()-cne$investigation.baseline -or @(git diff --name-only).Count){throw 'Unmodified independent baseline required.'}
foreach($source in $investigation.sources)
{
    if((Get-FileHash $source.file).Hash-cne$source.workingSha256){throw 'Original selected source changed.'}
}
New-Item $destination -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
$commands=[System.Collections.Generic.List[object]]::new()
function Dotnet([string]$Label,[string[]]$Arguments)
{
    $start=[DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @Arguments *> (Join-Path $destination "$Label.log")
    $code=$LASTEXITCODE
    $commands.Add([pscustomobject]@{label=$Label;entryPoint='dotnet';arguments=$Arguments;actualExitCode=$code;
        startedUtc=$start;completedUtc=[DateTimeOffset]::UtcNow.ToString('o')})
    [ordered]@{candidate='F008';variant='original';activation='. .\activate.ps1';commands=$commands}|
        ConvertTo-Json -Depth 8|Set-Content (Join-Path $destination 'execution.json')
    Get-Content (Join-Path $destination "$Label.log") -Tail 10
    if($code){throw "Original$Label failed;inspect missing prerequisites before retrying."}
}
$ownerProject='src\Middleware\Localization\src\Microsoft.AspNetCore.Localization.csproj'
$testProject='src\Middleware\Localization\test\UnitTests\Microsoft.AspNetCore.Localization.Tests.csproj'
Dotnet 'fresh-owner-build' @('build',$ownerProject,'--no-restore','--no-dependencies','-c','Release','-t:Rebuild','-m:2','-v:q',
    '-p:UseIisNativeAssets=false',"-bl:$destination\fresh-owner-build.binlog")
Dotnet 'owning-test-build' @('build',$testProject,'--no-restore','-c','Release','-m:2','-v:q',
    '-p:UseIisNativeAssets=false',"-bl:$destination\owning-test-build.binlog")
Dotnet 'owning-tests' @('test',$testProject,'--no-build','--no-restore','-c','Release','-m:2','-v:q',
    '-p:UseIisNativeAssets=false','--logger','trx;LogFileName=owning-original.trx','--results-directory',$destination)
[xml]$trx=Get-Content (Join-Path $destination 'owning-original.trx') -Raw
$results=@($trx.TestRun.Results.UnitTestResult);$definitions=@($trx.TestRun.TestDefinitions.UnitTest);$entries=@($trx.TestRun.TestEntries.TestEntry)
if($results.Count-lt1 -or $definitions.Count-ne$results.Count -or $entries.Count-ne$results.Count -or
    @($results|Where-Object outcome -CNE 'Passed').Count -or
    @($results|Group-Object testId|Where-Object Count -NE 1).Count -or
    @($results|Group-Object executionId|Where-Object Count -NE 1).Count){throw 'Every actual unit row must pass once with unique runtime identities.'}
$rows=@()
foreach($result in $results)
{
    $definition=@($definitions|Where-Object id -CEQ $result.testId)
    if($definition.Count-ne1 -or $definition[0].Execution.id-cne$result.executionId -or
        @($entries|Where-Object {$_.testId-ceq$result.testId -and $_.executionId-ceq$result.executionId}).Count-ne1 -or
        [TimeSpan]::Parse($result.duration).Ticks-le0){throw 'Exact result/definition/execution binding and positive duration required.'}
    $rows+=@{method=$definition[0].TestMethod.name;class=$definition[0].TestMethod.className;displayName=$result.testName;
        testId=$result.testId;executionId=$result.executionId;duration=$result.duration;outcome=$result.outcome}
}
$owner='artifacts\bin\Microsoft.AspNetCore.Localization\Release\net12.0'
$tests='artifacts\bin\Microsoft.AspNetCore.Localization.Tests\Release\net12.0'
$binaryHashes=@()
foreach($name in 'Microsoft.AspNetCore.Localization.dll','Microsoft.AspNetCore.Localization.pdb')
{
    $one=(Get-FileHash (Join-Path $owner $name)).Hash;$two=(Get-FileHash (Join-Path $tests $name)).Hash
    if($one-cne$two){throw 'Actual tested owner differs from fresh built owner.'}
    $binaryHashes+=@{path=(Join-Path $owner $name);sha256=$one}
}
$image=Join-Path $destination 'test-image';New-Item $image -ItemType Directory|Out-Null
foreach($name in 'Microsoft.AspNetCore.Localization.dll','Microsoft.AspNetCore.Localization.pdb',
    'Microsoft.AspNetCore.Localization.Tests.dll','Microsoft.AspNetCore.Localization.Tests.pdb')
{
    Copy-Item (Join-Path $tests $name) (Join-Path $image $name)
}
$sources=@()
foreach($source in Get-ChildItem 'src\Middleware\Localization\test\UnitTests' -Filter '*.cs' -File)
{
    Copy-Item $source.FullName (Join-Path $destination $source.Name)
    $sources+=@{name=$source.Name;sha256=(Get-FileHash $source.FullName).Hash}
}
[ordered]@{candidate='F008';variant='original';actualTests=$results.Count;passed=$results.Count;failed=0;skipped=0;rows=$rows;binaryHashes=$binaryHashes;
    testSources=$sources;testAssemblySha256=(Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.Localization.Tests.dll')).Hash;
    testPdbSha256=(Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.Localization.Tests.pdb')).Hash;
    completeExistingUnitProjectExecuted=$true;newPermanentTestsAdded=$false;notWholeCurrentDefaultSdkIntegration=$true}|
    ConvertTo-Json -Depth 9|Set-Content (Join-Path $destination 'actual-test-audit.json')
Write-Output "F008 original:$($results.Count) actual unit rows passed,0skip,every theory runtime ID/duration checked;fresh tested owner DLL/PDB exact."
