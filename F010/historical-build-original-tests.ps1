$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F010'
$destination=Join-Path $run 'tests\original'
if(Test-Path $destination){throw 'Preserve actual original multi-TFM builds/unit execution.'}
$investigation=Get-Content (Join-Path $run 'current-source-investigation.json') -Raw|ConvertFrom-Json
if((git rev-parse HEAD).Trim()-cne$investigation.baseline -or @(git diff --name-only).Count -or
    @(git diff --cached --name-only).Count){throw 'Unmodified independent baseline required.'}
foreach($source in $investigation.sources)
{
    if((Get-FileHash $source.file).Hash-cne$source.workingSha256){throw 'Actual selected baseline source changed.'}
}
New-Item $destination -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
$commands=[System.Collections.Generic.List[object]]::new()
function InvokeDotnet([string]$Label,[string[]]$Arguments)
{
    $start=[DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @Arguments *> (Join-Path $destination "$Label.log")
    $code=$LASTEXITCODE
    $commands.Add([pscustomobject]@{label=$Label;entryPoint='dotnet';arguments=$Arguments;actualExitCode=$code;
        startedUtc=$start;completedUtc=[DateTimeOffset]::UtcNow.ToString('o')})
    [ordered]@{candidate='F010';variant='original';activation='. .\activate.ps1';commands=$commands}|
        ConvertTo-Json -Depth 8|Set-Content (Join-Path $destination 'execution.json')
    Get-Content (Join-Path $destination "$Label.log") -Tail 10
    if($code){throw "Original$Label failed;inspect actual prerequisite before any candidate."}
}
$ownerProject='src\Security\Authorization\Core\src\Microsoft.AspNetCore.Authorization.csproj'
$testProject='src\Security\Authorization\test\Microsoft.AspNetCore.Authorization.Test.csproj'
$tfms=[System.Collections.Generic.List[object]]::new()
foreach($tfm in 'net462','netstandard2.0','net12.0')
{
    InvokeDotnet "fresh-owner-$tfm" @('build',$ownerProject,'--no-restore','--no-dependencies','-c','Release','-f',$tfm,'-t:Rebuild','-m:2','-v:q',
        '-p:UseIisNativeAssets=false',"-bl:$destination\fresh-owner-$tfm.binlog")
    $original=Join-Path 'artifacts\bin\Microsoft.AspNetCore.Authorization\Release' $tfm
    $saved=Join-Path $destination "owner-outputs\$tfm"
    New-Item $saved -ItemType Directory -Force|Out-Null
    foreach($name in 'Microsoft.AspNetCore.Authorization.dll','Microsoft.AspNetCore.Authorization.pdb')
    {Copy-Item (Join-Path $original $name) (Join-Path $saved $name)}
    $tfms.Add([pscustomobject]@{targetFramework=$tfm;dllSha256=(Get-FileHash (Join-Path $saved 'Microsoft.AspNetCore.Authorization.dll')).Hash;
        pdbSha256=(Get-FileHash (Join-Path $saved 'Microsoft.AspNetCore.Authorization.pdb')).Hash})
    $tfms|ConvertTo-Json -Depth 5|Set-Content (Join-Path $destination 'original-owner-targets.json')
}
InvokeDotnet 'owning-test-build' @('build',$testProject,'--no-restore','-c','Release','-m:2','-v:q',
    '-p:UseIisNativeAssets=false',"-bl:$destination\owning-test-build.binlog")
InvokeDotnet 'owning-tests' @('test',$testProject,'--no-build','--no-restore','-c','Release','-m:2','-v:q',
    '-p:UseIisNativeAssets=false','--logger','trx;LogFileName=owning-original.trx','--results-directory',$destination)
[xml]$trx=Get-Content (Join-Path $destination 'owning-original.trx') -Raw
$results=@($trx.TestRun.Results.UnitTestResult);$definitions=@($trx.TestRun.TestDefinitions.UnitTest);$entries=@($trx.TestRun.TestEntries.TestEntry)
if($results.Count-lt175 -or $definitions.Count-ne$results.Count -or $entries.Count-ne$results.Count -or
    @($results|Where-Object outcome -CNE 'Passed').Count -or @($results|Group-Object testId|Where-Object Count -NE 1).Count -or
    @($results|Group-Object executionId|Where-Object Count -NE 1).Count){throw 'Every actual original unit row must pass once with unique runtime identities.'}
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
$tests='artifacts\bin\Microsoft.AspNetCore.Authorization.Test\Release\net12.0'
$image=Join-Path $destination 'test-image';New-Item $image -ItemType Directory|Out-Null
$net12=@($tfms|Where-Object targetFramework -CEQ 'net12.0')[0]
foreach($name in 'Microsoft.AspNetCore.Authorization.dll','Microsoft.AspNetCore.Authorization.pdb')
{
    $expected=if($name.EndsWith('.dll')){$net12.dllSha256}else{$net12.pdbSha256}
    if((Get-FileHash (Join-Path $tests $name)).Hash-cne$expected -or
        (Get-FileHash (Join-Path 'artifacts\bin\Microsoft.AspNetCore.Authorization\Release\net12.0' $name)).Hash-cne$expected)
    {throw 'Actual tested owner must equal fresh explicit net12 build.'}
}
foreach($name in 'Microsoft.AspNetCore.Authorization.dll','Microsoft.AspNetCore.Authorization.pdb',
    'Microsoft.AspNetCore.Authorization.Test.dll','Microsoft.AspNetCore.Authorization.Test.pdb')
{Copy-Item (Join-Path $tests $name) (Join-Path $image $name)}
$sources=@()
foreach($source in Get-ChildItem 'src\Security\Authorization\test' -File -Filter '*.cs')
{
    Copy-Item $source.FullName (Join-Path $destination $source.Name)
    $sources+=@{name=$source.Name;sha256=(Get-FileHash $source.FullName).Hash}
}
[ordered]@{candidate='F010';variant='original';actualTests=$results.Count;passed=$results.Count;failed=0;skipped=0;rows=$rows;ownerTargets=$tfms;
    testSources=$sources;testAssemblySha256=(Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.Authorization.Test.dll')).Hash;
    testPdbSha256=(Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.Authorization.Test.pdb')).Hash;
    completeExistingNet12UnitProjectExecuted=$true;newPermanentTestsAdded=$false;notWholeCurrentDefaultSdkIntegration=$true}|
    ConvertTo-Json -Depth 10|Set-Content (Join-Path $destination 'actual-test-audit.json')
Write-Output "F010 original:$($results.Count) actual unit rows passed,0skip,every theory runtime ID/duration checked;three explicit owner TFMs freshly built."
