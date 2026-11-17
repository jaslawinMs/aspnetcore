$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F001'
$directory=Join-Path $run 'tests\original'
if((Test-Path $directory) -or (git branch --show-current).Trim() -cne 'autoperf/F001-webtransport-session-disposal' -or
    (git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or @(git diff --name-only).Count){throw 'Exact clean independent baseline/new original attempt required.'}
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
$commands=[System.Collections.Generic.List[object]]::new()
function Invoke-Dotnet([string]$Label,[string[]]$Arguments)
{
    $start=[DateTimeOffset]::UtcNow.ToString('o')
    dotnet @Arguments *> (Join-Path $directory "$Label.log")
    $code=$LASTEXITCODE
    $commands.Add([pscustomobject]@{label=$Label;entryPoint='dotnet';arguments=$Arguments;actualExitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')})
    [ordered]@{candidate='F001';variant='original';commands=$commands}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8

    return $code
}
$code=Invoke-Dotnet 'dotnet-info' @('--info')
if($code){throw 'Pinned SDK/runtime identity capture failed.'}
$project='src\Servers\Kestrel\test\InMemory.FunctionalTests\InMemory.FunctionalTests.csproj'
$filter='FullyQualifiedName~Microsoft.AspNetCore.Server.Kestrel.Core.Tests.WebTransport'
$discoveryArguments=@('test',$project,'--no-restore','-c','Release','-m:2','-p:UseIisNativeAssets=false','--filter',$filter,'--list-tests','-v:quiet')
$code=Invoke-Dotnet 'discovery-initial' $discoveryArguments
$discoveryLog=Join-Path $directory 'discovery-initial.log'
if($code)
{
    $missing=Get-Content $discoveryLog -Raw
    if($missing -notmatch 'NETSDK1004|NETSDK1005|NETSDK1064'){Get-Content $discoveryLog -Tail 40;throw 'Initial scoped discovery/build failed for a non-missing-package reason;preserve this attempt.'}
    $code=Invoke-Dotnet 'restore-after-missing-assets' @('restore',$project,'--disable-parallel','-p:UseIisNativeAssets=false','-v:quiet')
    if($code){throw 'Missing-asset restoration failed.'}
    $code=Invoke-Dotnet 'discovery-after-restore' $discoveryArguments
    $discoveryLog=Join-Path $directory 'discovery-after-restore.log'
    if($code){Get-Content $discoveryLog -Tail 40;throw 'Scoped discovery still failed after missing-asset restoration.'}
}
$discovered=@(Get-Content $discoveryLog|ForEach-Object {if($_ -match '^\s+(Microsoft\.AspNetCore\..+)$'){$Matches[1]}})
$counts=[ordered]@{WebTransportSessionTests=9;WebTransportStreamTests=4;WebTransportHandshakeTests=4}
if($discovered.Count -ne 17 -or @($discovered|Sort-Object -Unique).Count -ne 17){throw 'Exact17 positive unique scoped rows required from the frozen source.'}
foreach($class in $counts.Keys)
{
    if(@($discovered|Where-Object {$_ -cmatch ("^Microsoft\.AspNetCore\.Server\.Kestrel\.Core\.Tests\."+$class+"\.")}).Count -ne $counts[$class]){throw "Exact frozen source class rows differ:$class"}
}
$trxName='webtransport-original.trx'
$code=Invoke-Dotnet 'owning-tests' @('test',$project,'--no-restore','--no-build','-c','Release','-m:2','-p:UseIisNativeAssets=false',
    '--filter',$filter,'--logger',"trx;LogFileName=$trxName",'--results-directory',$directory,'-v:minimal')
if($code){Get-Content (Join-Path $directory 'owning-tests.log') -Tail 45;throw 'Actual scoped owner tests failed;do not silently rerun.'}
[xml]$trx=Get-Content (Join-Path $directory $trxName) -Raw
$results=@($trx.TestRun.Results.UnitTestResult);$definitions=@($trx.TestRun.TestDefinitions.UnitTest);$entries=@($trx.TestRun.TestEntries.TestEntry)
if($definitions.Count -ne 17 -or $results.Count -ne 17 -or $entries.Count -ne 17 -or
    @(Compare-Object @($discovered|Sort-Object) @($definitions.name|Sort-Object)).Count -or
    @($results.executionId|Sort-Object -Unique).Count -ne 17){throw 'Exact source/discovery/definition/expanded execution sets differ.'}
foreach($definition in $definitions)
{
    $rows=@($results|Where-Object testId -CEQ $definition.id)
    if($rows.Count -ne 1 -or $definition.Execution.id -cne $rows[0].executionId -or $definition.name -cne $rows[0].testName){throw 'Each actual serializable scoped row must link exactly to its discovered definition.'}
}
$rows=@(foreach($row in $results)
{
    $entry=@($entries|Where-Object {$_.testId -ceq $row.testId -and $_.executionId -ceq $row.executionId})
    if($row.outcome -cne 'Passed' -or $entry.Count -ne 1 -or [TimeSpan]::Parse($row.duration).Ticks -le 0){throw 'Every actual scoped row must pass with positive duration/exact execution IDs,zero skips.'}
    [pscustomobject]@{testName=$row.testName;testId=$row.testId;executionId=$row.executionId;outcome=$row.outcome;duration=$row.duration}
})
$output='C:\src\aspnetcore\artifacts\bin\InMemory.FunctionalTests\Release\net12.0'
$image=Join-Path $directory 'image'
New-Item -ItemType Directory -Path $image -Force|Out-Null
$images=@(foreach($file in Get-ChildItem $output -File|Where-Object Extension -In '.dll','.pdb','.json')
{
    Copy-Item $file.FullName (Join-Path $image $file.Name)
    [pscustomobject]@{file=$file.Name;bytes=$file.Length;sha256=(Get-FileHash $file.FullName).Hash}
})
if(@($images|Where-Object file -CEQ 'Microsoft.AspNetCore.Server.Kestrel.Core.dll').Count -ne 1 -or
    @($images|Where-Object file -CEQ 'InMemory.FunctionalTests.dll').Count -ne 1){throw 'Exact actual test/owner images required.'}
[ordered]@{
    candidate='F001';variant='original';allPassed=$true;actualRows=17;failed=0;skipped=0;classRows=$counts;rows=$rows
    discoveryLog=[IO.Path]::GetFileName($discoveryLog);trx=$trxName;trxSha256=(Get-FileHash (Join-Path $directory $trxName)).Hash
    capturedFlatTestAndOwnerImage=$images;imageRelative='image';imageNotClaimedCompleteClosure=$true
    note='Exact source-derived17 discovery/definition/result/entry associations and positive durations. Actual test/owner/dependency DLL/PDB/JSON files captured;no certificate/private-key copying. These existing tests include synthetic CreateStream helpers;they do not independently establish a live QUIC blocking precondition.'
}|ConvertTo-Json -Depth 12|Set-Content (Join-Path $directory 'test-audit.json') -Encoding utf8
Get-Content (Join-Path $directory 'owning-tests.log') -Tail 6
Write-Output 'F001 original:17/17 actual existing WebTransport rows passed,zero skips;all row/definition/execution links and positive durations verified.'
