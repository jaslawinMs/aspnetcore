$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$repo=(Get-Location).Path
$run=Join-Path $PSScriptRoot 'autoperf-runs\F010'
$build=Join-Path $run 'builds\candidate'
$test=Join-Path $run 'tests\candidate'
$sources=Join-Path $run 'sources\candidate'
$original=Get-Content (Join-Path $run 'manifest-original.json') -Raw|ConvertFrom-Json
$gate=Get-Content (Join-Path $run 'compatibility-gates\original\gates.json') -Raw|ConvertFrom-Json
$expectedChanges=@('src/Security/Authorization/Core/src/ClaimsAuthorizationRequirement.cs','src/Security/Authorization/test/DefaultAuthorizationServiceTests.cs')
if((git rev-parse HEAD).Trim()-cne$original.baseline -or @(git diff --cached --name-only).Count -or
    ((@(git diff --name-only)|Sort-Object)-join'|') -cne(($expectedChanges|Sort-Object)-join'|'))
{throw 'Only predeclared private owner seam and3 regression methods may change.'}
foreach($path in $build,$test,$sources,(Join-Path $run 'manifest-candidate.json'))
{if(Test-Path $path){throw "Preserve actual candidate preparation:$path"}}
New-Item $build,$test -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $build 'executed-source.ps1')
git --no-pager diff --check *> (Join-Path $build 'diff-check.log')
if($LASTEXITCODE){throw 'Candidate diff whitespace check failed.'}
git --no-pager diff --stat | Set-Content (Join-Path $build 'diff-stat.txt')
git --no-pager diff --binary | Set-Content (Join-Path $build 'actual-source.patch')
$commands=[System.Collections.Generic.List[object]]::new()
function InvokeDotnet([string]$Label,[string[]]$Arguments)
{
    $start=[DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @Arguments *> (Join-Path $build "$Label.log")
    $code=$LASTEXITCODE
    $commands.Add([pscustomobject]@{label=$Label;entryPoint='dotnet';arguments=$Arguments;actualExitCode=$code;
        startedUtc=$start;completedUtc=[DateTimeOffset]::UtcNow.ToString('o')})
    [ordered]@{candidate='F010';variant='candidate';activation='. .\activate.ps1';commands=$commands}|
        ConvertTo-Json -Depth 9|Set-Content (Join-Path $build 'execution.json')
    Get-Content (Join-Path $build "$Label.log") -Tail 10
    if($code){throw "Candidate$Label failed;preserve this actual attempt before repairing."}
}
$ownerProject='src\Security\Authorization\Core\src\Microsoft.AspNetCore.Authorization.csproj'
$testProject='src\Security\Authorization\test\Microsoft.AspNetCore.Authorization.Test.csproj'
$tfms=[System.Collections.Generic.List[object]]::new()
$retired=Join-Path $run 'preparation-attempts\candidate-1'
$priorOwner=Join-Path $retired 'ClaimsAuthorizationRequirement.cs'
$reuseOwner=(Test-Path $priorOwner) -and (Get-FileHash $priorOwner).Hash-ceq(Get-FileHash 'src\Security\Authorization\Core\src\ClaimsAuthorizationRequirement.cs').Hash
$priorTargets=if($reuseOwner){@(Get-Content (Join-Path $retired 'tests\candidate\candidate-owner-targets.json') -Raw|ConvertFrom-Json)}else{@()}
foreach($tfm in 'net462','netstandard2.0','net12.0')
{
    if(-not$reuseOwner)
    {
        InvokeDotnet "fresh-owner-$tfm" @('build',$ownerProject,'--no-restore','--no-dependencies','-c','Release','-f',$tfm,'-t:Rebuild','-m:2','-v:q',
            '-p:UseIisNativeAssets=false',"-bl:$build\fresh-owner-$tfm.binlog")
    }
    $product=Join-Path 'artifacts\bin\Microsoft.AspNetCore.Authorization\Release' $tfm
    if($reuseOwner)
    {
        $prior=@($priorTargets|Where-Object targetFramework -CEQ $tfm)
        if($prior.Count-ne1 -or (Get-FileHash (Join-Path $product 'Microsoft.AspNetCore.Authorization.dll')).Hash-cne$prior[0].dllSha256 -or
            (Get-FileHash (Join-Path $product 'Microsoft.AspNetCore.Authorization.pdb')).Hash-cne$prior[0].pdbSha256)
        {throw 'Exact unchanged source/fresh compiled owner bytes required before reusing prior successful3-target build.'}
    }
    $saved=Join-Path $test "owner-outputs\$tfm";New-Item $saved -ItemType Directory -Force|Out-Null
    foreach($name in 'Microsoft.AspNetCore.Authorization.dll','Microsoft.AspNetCore.Authorization.pdb')
    {Copy-Item (Join-Path $product $name) (Join-Path $saved $name)}
    $tfms.Add([pscustomobject]@{targetFramework=$tfm;dllSha256=(Get-FileHash (Join-Path $saved 'Microsoft.AspNetCore.Authorization.dll')).Hash;
        pdbSha256=(Get-FileHash (Join-Path $saved 'Microsoft.AspNetCore.Authorization.pdb')).Hash})
    $tfms|ConvertTo-Json -Depth 5|Set-Content (Join-Path $test 'candidate-owner-targets.json')
}
if($reuseOwner)
{
    [ordered]@{candidate='F010';actualOwnerBuildRepeated=$false;sourceSha256=(Get-FileHash $priorOwner).Hash;ownerTargets=$tfms;
        executedOriginalBuilds='preparation-attempts\candidate-1\builds\candidate\execution.json';
        sourceSnapshot='preparation-attempts\candidate-1\ClaimsAuthorizationRequirement.cs';reason='Only2 new test precondition expressions changed;all3 original successful compiled owner DLL/PDB/source bytes remain exact.'}|
        ConvertTo-Json -Depth 7|Set-Content (Join-Path $build 'reused-three-target-owner-builds.json')
}
InvokeDotnet 'owning-test-build' @('build',$testProject,'--no-restore','-c','Release','-m:2','-v:q',
    '-p:UseIisNativeAssets=false',"-bl:$build\owning-test-build.binlog")
InvokeDotnet 'owning-tests' @('test',$testProject,'--no-build','--no-restore','-c','Release','-m:2','-v:q',
    '-p:UseIisNativeAssets=false','--logger','trx;LogFileName=owning-candidate.trx','--results-directory',$test)
[xml]$trx=Get-Content (Join-Path $test 'owning-candidate.trx') -Raw
$results=@($trx.TestRun.Results.UnitTestResult);$definitions=@($trx.TestRun.TestDefinitions.UnitTest);$entries=@($trx.TestRun.TestEntries.TestEntry)
if($results.Count-ne219 -or $definitions.Count-ne$results.Count -or $entries.Count-ne$results.Count -or
    @($results|Where-Object outcome -CNE 'Passed').Count -or @($results|Group-Object testId|Where-Object Count -NE 1).Count -or
    @($results|Group-Object executionId|Where-Object Count -NE 1).Count){throw 'Expected214 existing+5 new actual rows all passed exactly once.'}
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
$newMethods=@(@{name='Authorize_RequireClaim_UsesOrdinalHashSetValueComparison';rows=2},
    @{name='Authorize_RequireClaim_UsesLiveAllowedSet';rows=2},
    @{name='Authorize_RequireClaim_UsesOverriddenAllowedValuesEnumeration';rows=1})
foreach($method in $newMethods)
{if(@($rows|Where-Object method -CEQ $method.name).Count-ne$method.rows){throw 'Each actual new theory row must run and pass.'}}
$testImage=Join-Path $test 'test-image';New-Item $testImage -ItemType Directory|Out-Null
$testOutput='artifacts\bin\Microsoft.AspNetCore.Authorization.Test\Release\net12.0'
$net12=@($tfms|Where-Object targetFramework -CEQ 'net12.0')[0]
foreach($name in 'Microsoft.AspNetCore.Authorization.dll','Microsoft.AspNetCore.Authorization.pdb')
{
    $expected=if($name.EndsWith('.dll')){$net12.dllSha256}else{$net12.pdbSha256}
    if((Get-FileHash (Join-Path $testOutput $name)).Hash-cne$expected -or
        (Get-FileHash (Join-Path 'artifacts\bin\Microsoft.AspNetCore.Authorization\Release\net12.0' $name)).Hash-cne$expected)
    {throw 'Exact freshly built candidate owner must be actual tested net12 owner.'}
}
foreach($name in 'Microsoft.AspNetCore.Authorization.dll','Microsoft.AspNetCore.Authorization.pdb',
    'Microsoft.AspNetCore.Authorization.Test.dll','Microsoft.AspNetCore.Authorization.Test.pdb')
{Copy-Item (Join-Path $testOutput $name) (Join-Path $testImage $name)}
[ordered]@{candidate='F010';variant='candidate';actualTests=219;passed=219;failed=0;skipped=0;existingRows=214;newRows=5;
    areaRows=217;repositorySentinelRows=2;newMethods=$newMethods;ownerTargets=$tfms;rows=$rows;
    testAssemblySha256=(Get-FileHash (Join-Path $testImage 'Microsoft.AspNetCore.Authorization.Test.dll')).Hash;
    testPdbSha256=(Get-FileHash (Join-Path $testImage 'Microsoft.AspNetCore.Authorization.Test.pdb')).Hash}|
    ConvertTo-Json -Depth 10|Set-Content (Join-Path $test 'actual-test-audit.json')
foreach($api in $gate.apiFiles)
{
    $live=Join-Path 'src\Security\Authorization\Core\src' $api.path
    if((Get-FileHash $live).Hash-cne$api.sha256){throw 'All per-TFM public API baselines must remain byte-identical.'}
}
$ref=@($gate.ownerTargets|Where-Object targetFramework -CEQ 'net12.0')[0]
if((Get-FileHash $ref.evaluated.TargetRefPath).Hash-cne$ref.referenceAssemblySha256)
{throw 'Review unexpected public reference-assembly byte delta before any timing.'}
InvokeDotnet 'pack-with-existing-package-validation' @('pack',$ownerProject,'--no-restore','--no-build','-c','Release','-m:2','-v:q',
    '-p:UseIisNativeAssets=false','--output',(Join-Path $run 'packages\candidate'),"-bl:$build\pack-with-existing-package-validation.binlog")
InvokeDotnet 'changed-source-whitespace-format-check' @('format','whitespace',$testProject,'--no-restore','--verify-no-changes',
    '--include',$expectedChanges[0].Replace('/','\'),$expectedChanges[1].Replace('/','\'),'--verbosity','quiet')
Copy-Item (Join-Path $run 'sources\original') $sources -Recurse
Copy-Item 'src\Security\Authorization\Core\src\ClaimsAuthorizationRequirement.cs' (Join-Path $sources 'owner\ClaimsAuthorizationRequirement.cs')
Copy-Item 'src\Security\Authorization\test\DefaultAuthorizationServiceTests.cs' (Join-Path $sources 'test\DefaultAuthorizationServiceTests.cs')
$images=@()
foreach($item in @(@{role='primary';to=(Join-Path $run 'images\candidate');tfm='net12.0'},
    @{role='legacy';to=(Join-Path $run 'images\legacy-candidate');tfm='net462'},
    @{role='standard';to=(Join-Path $run 'images\standard-candidate');tfm='netstandard2.0'}))
{
    $old=@($original.images|Where-Object role -CEQ $item.role)[0]
    if(Test-Path $item.to){throw 'Preserve actual candidate role image.'}
    Copy-Item $old.path $item.to -Recurse
    foreach($name in 'Microsoft.AspNetCore.Authorization.dll','Microsoft.AspNetCore.Authorization.pdb')
    {Copy-Item (Join-Path $test "owner-outputs\$($item.tfm)\$name") (Join-Path $item.to $name) -Force}
    $changed=@();$files=@()
    foreach($file in $old.files)
    {
        $actual=Get-Item (Join-Path $item.to $file.path);$sha=(Get-FileHash $actual.FullName).Hash
        if($sha-cne$file.sha256){$changed+=$file.path}
        $files+=@{path=$file.path;bytes=$actual.Length;sha256=$sha}
    }
    if((($changed|Sort-Object)-join'|') -cne 'Microsoft.AspNetCore.Authorization.dll|Microsoft.AspNetCore.Authorization.pdb' -or
        @(Get-ChildItem $item.to -Recurse -File).Count-ne$old.files.Count)
    {throw 'Only freshly tested owner DLL/PDB may differ in each compiled-once consumer role.'}
    $images+=@{role=$item.role;path=$item.to;files=$files;changedFiles=$changed;allNonownerBytesIdentical=$true}
}
$legacy=@($images|Where-Object role -CEQ 'legacy')[0].path
$standard=@($images|Where-Object role -CEQ 'standard')[0].path
$image=@($images|Where-Object role -CEQ 'primary')[0].path
$net462=@($tfms|Where-Object targetFramework -CEQ 'net462')[0]
$std=@($tfms|Where-Object targetFramework -CEQ 'netstandard2.0')[0]
$legacyStart=[DateTimeOffset]::UtcNow.ToString('o')
& (Join-Path $legacy 'AutoPerf.Compatibility.exe') (Join-Path $run 'characterization\legacy-candidate') `
    'candidate-net462-on-actual-framework48' '.NETFramework,Version=v4.6.2' $net462.dllSha256 *> (Join-Path $build 'legacy-characterization.log')
$legacyCode=$LASTEXITCODE
$commands.Add([pscustomobject]@{label='legacy-characterization';entryPoint=(Join-Path $legacy 'AutoPerf.Compatibility.exe');
    arguments=@((Join-Path $run 'characterization\legacy-candidate'),'candidate-net462-on-actual-framework48','.NETFramework,Version=v4.6.2',$net462.dllSha256);
    actualExitCode=$legacyCode;startedUtc=$legacyStart;completedUtc=[DateTimeOffset]::UtcNow.ToString('o')})
[ordered]@{candidate='F010';variant='candidate';activation='. .\activate.ps1';commands=$commands}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $build 'execution.json')
Get-Content (Join-Path $build 'legacy-characterization.log') -Tail 8
if($legacyCode){throw 'Actual candidate legacy consumer failed.'}
InvokeDotnet 'standard-characterization' @((Join-Path $standard 'AutoPerf.Compatibility.dll'),(Join-Path $run 'characterization\standard-candidate'),
    'candidate-netstandard2-on-net12','.NETStandard,Version=v2.0',$std.dllSha256)
InvokeDotnet 'primary-characterization-and-all-pdb-bindings' @((Join-Path $image 'AutoPerf.Benchmarks.dll'),'--sources',$sources,
    '--context','candidate','--test-assembly',(Join-Path $testImage 'Microsoft.AspNetCore.Authorization.Test.dll'),
    '--legacy-image',$legacy,'--standard-image',$standard,'--characterize','--artifacts',(Join-Path $run 'characterization\candidate'))
$sourceFiles=@(Get-ChildItem $sources -Recurse -File|Sort-Object FullName|ForEach-Object{
    @{path=[IO.Path]::GetRelativePath($sources,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}})
[ordered]@{candidate='F010';variant='candidate';baseline=$original.baseline;images=$images;sources=$sourceFiles;ownerTargets=$tfms;
    harnessDllSha256=(Get-FileHash (Join-Path $image 'AutoPerf.Benchmarks.dll')).Hash;
    harnessPdbSha256=(Get-FileHash (Join-Path $image 'AutoPerf.Benchmarks.pdb')).Hash;
    benchmarkDotNetSha256=(Get-FileHash (Join-Path $image 'BenchmarkDotNet.dll')).Hash;allNonownerBytesIdentical=$true;
    allPublicApiBaselinesByteIdentical=$true;nativeNet12PublicReferenceAssemblyByteIdentical=$true;
    existingEnabledPackageValidationInvokedWithoutDisabling=$true;timingLaunches=0;boundedPdbSourceWitnessNotWholeSdkProvenance=$true}|
    ConvertTo-Json -Depth 10|Set-Content (Join-Path $run 'manifest-candidate.json')
Write-Output 'F010 private candidate:3 fresh owner TFMs,219 actual rows,unchanged API/ref,existing package validation,scoped formatting and native legacy/std/net12 contracts passed;compiled-once nonowner bytes identical in all3 roles,no timing yet.'
