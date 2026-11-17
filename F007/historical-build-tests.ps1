param([Parameter(Mandatory)][ValidateSet('original','candidate-1')][string]$Variant)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F007'
$destination=Join-Path $run "tests\$Variant"
if(Test-Path $destination){throw 'Do not overwrite an actual owning-test attempt.'}
New-Item $destination -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
if((git rev-parse HEAD).Trim()-cne'37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
    (git branch --show-current).Trim()-cne'autoperf/F007-root-operation-id-membership'){throw 'Independent F007 baseline branch required.'}
$owner='src\Components\Server\src\Microsoft.AspNetCore.Components.Server.csproj'
$tests='src\Components\Server\test\Microsoft.AspNetCore.Components.Server.Tests.csproj'
$steps=@(
    @{name='fresh-owner-build';arguments=@('build',$owner,'--no-restore','--no-dependencies','-c','Release','-t:Rebuild','-m:2','-v:q','-p:UseIisNativeAssets=false',"-bl:$destination\fresh-owner-build.binlog")},
    @{name='owning-test-build';arguments=@('build',$tests,'--no-restore','-c','Release','-m:2','-v:q','-p:UseIisNativeAssets=false',"-bl:$destination\owning-test-build.binlog")},
    @{name='owning-test-run';arguments=@('test',$tests,'--no-build','--no-restore','-c','Release','-m:2','-v:q','-p:UseIisNativeAssets=false','--filter','FullyQualifiedName~ServerComponentDeserializerTest','--logger',"trx;LogFileName=owning-$Variant.trx",'--results-directory',$destination)}
)
$commands=@()
foreach($step in $steps)
{
    $a=$step.arguments
    & dotnet @a *> (Join-Path $destination "$($step.name).log")
    $code=$LASTEXITCODE
    $commands+=[ordered]@{entryPoint='dotnet';arguments=$a;actualExitCode=$code;name=$step.name}
    [ordered]@{candidate='F007';variant=$Variant;activation='. .\activate.ps1';commands=$commands}|
        ConvertTo-Json -Depth 9|Set-Content (Join-Path $destination 'execution.json')
    if($code){Get-Content (Join-Path $destination "$($step.name).log") -Tail 45;throw "Actual $($step.name) failed;no silent restore/fallback."}
}
$sources=@('src\Components\Server\test\Circuits\ServerComponentDeserializerTest.cs','src\Components\Server\test\Circuits\ServerComponentDeserializerTest.Unions.cs')
$expected=@(foreach($source in $sources){[regex]::Matches([IO.File]::ReadAllText((Join-Path $PWD $source)),'\[Fact\]\s+public void (?<name>\w+)\(')|ForEach-Object {$_.Groups['name'].Value}})
if($expected.Count-ne33){throw 'Exactly33 source-defined owning Facts across both partials required.'}
[xml]$trx=[IO.File]::ReadAllText((Join-Path $destination "owning-$Variant.trx"))
$ns=[Xml.XmlNamespaceManager]::new($trx.NameTable);$ns.AddNamespace('t','http://microsoft.com/schemas/VisualStudio/TeamTest/2010')
$results=@($trx.SelectNodes('//t:UnitTestResult',$ns));$definitions=@($trx.SelectNodes('//t:TestDefinitions/t:UnitTest',$ns));$entries=@($trx.SelectNodes('//t:TestEntries/t:TestEntry',$ns))
if($results.Count-ne33 -or $definitions.Count-ne33 -or $entries.Count-ne33){throw 'Exactly33 actual TRX results/definitions/entries required.'}
$rows=@(foreach($result in $results)
{
    if($result.outcome-cne'Passed' -or [TimeSpan]::Parse($result.duration).Ticks-le0){throw 'Owning control failed/skipped or had no positive duration.'}
    $definition=@($definitions|Where-Object id -CEQ $result.testId)
    $entry=@($entries|Where-Object {$_.testId-ceq$result.testId -and $_.executionId-ceq$result.executionId})
    if($definition.Count-ne1 -or $entry.Count-ne1 -or $definition[0].Execution.id-cne$result.executionId){throw 'Actual result/definition/execution identity differs.'}
    $method=$definition[0].TestMethod
    if(([string]$method.className).Split(',')[0]-cne'Microsoft.AspNetCore.Components.Server.Circuits.ServerComponentDeserializerTest' -or $method.name-cnotin$expected){throw 'Unexpected owning test identity.'}
    [ordered]@{method=[string]$method.name;testId=[string]$result.testId;executionId=[string]$result.executionId;duration=[string]$result.duration;outcome=[string]$result.outcome}
})
if(@($rows.method|Sort-Object -Unique).Count-ne33){throw 'Every source-defined owning Fact must execute exactly once.'}
$binary='artifacts\bin\Microsoft.AspNetCore.Components.Server.Tests\Release\net12.0'
$ownerBinary='artifacts\bin\Microsoft.AspNetCore.Components.Server\Release\net12.0'
$hashes=@(foreach($directory in $binary,$ownerBinary){foreach($name in 'Microsoft.AspNetCore.Components.Server.dll','Microsoft.AspNetCore.Components.Server.pdb')
{
    $path=Join-Path $PWD "$directory\$name"
    [ordered]@{path=$path;sha256=(Get-FileHash $path).Hash}
}})
if($hashes[0].sha256-cne$hashes[2].sha256 -or $hashes[1].sha256-cne$hashes[3].sha256){throw 'Tests must use exact freshly built owner DLL/PDB.'}
foreach($source in $sources){Copy-Item $source (Join-Path $destination ([IO.Path]::GetFileName($source)))}
[ordered]@{candidate='F007';variant=$Variant;actualTests=33;passed=33;failed=0;skipped=0;rows=$rows;binaryHashes=$hashes;
    testSources=@(foreach($source in $sources){[ordered]@{file=$source;sha256=(Get-FileHash $source).Hash}});
    testAssemblySha256=(Get-FileHash (Join-Path $binary 'Microsoft.AspNetCore.Components.Server.Tests.dll')).Hash;
    testPdbSha256=(Get-FileHash (Join-Path $binary 'Microsoft.AspNetCore.Components.Server.Tests.pdb')).Hash;
    note='Exact33 original and Unions-partial Facts,positive durations and unique identities. Existing full marker/parameter/duplicate behavior,not a Contains-only substitute.'}|
    ConvertTo-Json -Depth 10|Set-Content (Join-Path $destination 'actual-test-audit.json')
Write-Output "F007 $Variant`:fresh owner/dependency-aware test build,33 exact owning Facts passed,0skip."
