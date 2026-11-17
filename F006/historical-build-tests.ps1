param([Parameter(Mandatory)][ValidateSet('original','candidate-1')][string]$Variant)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F006'
$destination=Join-Path $run "tests\$Variant"
if(Test-Path $destination){throw 'Refusing to overwrite an actual test attempt.'}
New-Item $destination -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
$owner='src\Components\Analyzers\src\Microsoft.AspNetCore.Components.Analyzers.csproj'
$tests='src\Components\Analyzers\test\Microsoft.AspNetCore.Components.Analyzers.Tests.csproj'
$commands=@()
$steps=@(
    @{name='fresh-owner-build';arguments=@('build',$owner,'--no-restore','--no-dependencies','-c','Release','-t:Rebuild','-m:2','-v:q','-p:UseIisNativeAssets=false',"-bl:$destination\fresh-owner-build.binlog")},
    @{name='owning-test-build';arguments=@('build',$tests,'--no-restore','-c','Release','-m:2','-v:q','-p:UseIisNativeAssets=false',"-bl:$destination\owning-test-build.binlog")},
    @{name='owning-test-run';arguments=@('test',$tests,'--no-build','--no-restore','-c','Release','-m:2','-v:q','-p:UseIisNativeAssets=false','--filter','FullyQualifiedName~ForLoopIteratorInClosureAnalyzerTest','--logger',"trx;LogFileName=owning-$Variant.trx",'--results-directory',$destination)}
)
foreach($step in $steps)
{
    $a=$step.arguments
    & dotnet @a *> (Join-Path $destination "$($step.name).log")
    $code=$LASTEXITCODE
    $commands+=[ordered]@{entryPoint='dotnet';arguments=$a;actualExitCode=$code;name=$step.name}
    [ordered]@{candidate='F006';variant=$Variant;activation='. .\activate.ps1';commands=$commands}|
        ConvertTo-Json -Depth 9|Set-Content (Join-Path $destination 'execution.json')
    if($code-ne0)
    {
        Get-Content (Join-Path $destination "$($step.name).log") -Tail 55
        throw "Actual $($step.name) failed with exit$code;no restore/fallback silently attempted."
    }
}
$testSource='src\Components\Analyzers\test\ForLoopIteratorInClosureAnalyzerTest.cs'
$expected=@([regex]::Matches([IO.File]::ReadAllText((Join-Path $PWD $testSource)),'\[Fact\]\s+public void (?<name>\w+)\(')|ForEach-Object {$_.Groups['name'].Value})
if($expected.Count-ne20){throw 'Expected20 actual source-defined Facts.'}
[xml]$trx=[IO.File]::ReadAllText((Join-Path $destination "owning-$Variant.trx"))
$ns=[Xml.XmlNamespaceManager]::new($trx.NameTable);$ns.AddNamespace('t','http://microsoft.com/schemas/VisualStudio/TeamTest/2010')
$results=@($trx.SelectNodes('//t:UnitTestResult',$ns));$definitions=@($trx.SelectNodes('//t:TestDefinitions/t:UnitTest',$ns));$entries=@($trx.SelectNodes('//t:TestEntries/t:TestEntry',$ns))
if($results.Count-ne20 -or $definitions.Count-ne20 -or $entries.Count-ne20){throw 'Expected20 actual TRX results/definitions/entries.'}
$rows=@(foreach($result in $results)
{
    if($result.outcome-cne'Passed' -or [TimeSpan]::Parse($result.duration).Ticks-le0){throw 'Control failed/skipped or had no positive duration.'}
    $definition=@($definitions|Where-Object id -CEQ $result.testId)
    $entry=@($entries|Where-Object {$_.testId-ceq$result.testId -and $_.executionId-ceq$result.executionId})
    if($definition.Count-ne1 -or $entry.Count-ne1 -or $definition[0].Execution.id-cne$result.executionId){throw 'Result/definition/execution identity differs.'}
    $method=$definition[0].TestMethod
    if(([string]$method.className).Split(',')[0]-cne'Microsoft.AspNetCore.Components.Analyzers.Test.ForLoopIteratorInClosureAnalyzerTest' -or $method.name-cnotin$expected){throw 'Unexpected source test identity.'}
    [ordered]@{method=[string]$method.name;testId=[string]$result.testId;executionId=[string]$result.executionId;duration=[string]$result.duration;outcome=[string]$result.outcome}
})
if(@($rows.method|Sort-Object -Unique).Count-ne20){throw 'Every source-defined control must occur exactly once.'}
$binary='artifacts\bin\Microsoft.AspNetCore.Components.Analyzers.Tests\Release\net12.0'
$ownerBinary='artifacts\bin\Microsoft.AspNetCore.Components.Analyzers\Release\netstandard2.0'
$hashes=@(foreach($directory in $binary,$ownerBinary)
{
    foreach($name in 'Microsoft.AspNetCore.Components.Analyzers.dll','Microsoft.AspNetCore.Components.Analyzers.pdb')
    {
        $p=Join-Path $directory $name
        [ordered]@{path=[IO.Path]::GetFullPath($p);sha256=(Get-FileHash $p).Hash}
    }
})
if($hashes[0].sha256-cne$hashes[2].sha256 -or $hashes[1].sha256-cne$hashes[3].sha256){throw 'Test output did not use freshly built owner.'}
Copy-Item $testSource (Join-Path $destination 'ForLoopIteratorInClosureAnalyzerTest.cs')
[ordered]@{candidate='F006';variant=$Variant;actualTests=20;passed=20;failed=0;skipped=0;rows=$rows;binaryHashes=$hashes;
    testSourceSha256=(Get-FileHash $testSource).Hash;testAssemblySha256=(Get-FileHash (Join-Path $binary 'Microsoft.AspNetCore.Components.Analyzers.Tests.dll')).Hash;
    testPdbSha256=(Get-FileHash (Join-Path $binary 'Microsoft.AspNetCore.Components.Analyzers.Tests.pdb')).Hash;
    note='Exact20 source Facts/positive durations/unique result-definition-execution IDs;existing stub-framework tests distinct from actual metadata compiler samples.'}|
    ConvertTo-Json -Depth 9|Set-Content (Join-Path $destination 'actual-test-audit.json')
Write-Output "F006 $Variant`:fresh owner/test build and20 source-defined controls passed,0 skipped."
