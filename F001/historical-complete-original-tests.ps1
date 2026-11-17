$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F001'
$directory=Join-Path $run 'tests\original'
$executionPath=Join-Path $directory 'execution.json'
$prior=Get-Content $executionPath -Raw|ConvertFrom-Json
if((Test-Path (Join-Path $directory 'test-audit.json')) -or
    @($prior.commands|Where-Object label -CEQ 'owning-tests').Count -or
    (git branch --show-current).Trim() -cne 'autoperf/F001-webtransport-session-disposal' -or
    (git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or @(git diff --name-only).Count){throw 'Only continue the unexecuted scoped tests on the same clean baseline.'}
Copy-Item $PSCommandPath (Join-Path $directory 'continued-source.ps1')
Copy-Item (Join-Path $PSScriptRoot 'F001-discovery-checker-failure.json') (Join-Path $directory 'discovery-checker-failure.json')
$discoveryLog=Join-Path $directory 'discovery-initial.log'
$discovered=@(Get-Content $discoveryLog|ForEach-Object {if($_ -match '^\s+(Microsoft\.AspNetCore\..+)$'){$Matches[1]}})
$counts=[ordered]@{WebTransportSessionTests=9;WebTransportStreamTests=4;WebTransportHandshakeTests=4}
if($discovered.Count -ne 17 -or @($discovered|Sort-Object -Unique).Count -ne 16 -or
    @($prior.commands|Where-Object {$_.label -ceq 'discovery-initial' -and $_.actualExitCode -eq 0}).Count -ne 1){throw 'Continue the same exact17-row successful discovery,including one duplicate display name.'}
$duplicates=@($discovered|Group-Object|Where-Object Count -GT 1|Select-Object Name,Count)
if($duplicates.Count -ne 1 -or $duplicates[0].Count -ne 2 -or $duplicates[0].Name -cnotmatch '\.WebTransportHandshake_IncorrectHeadersRejects\('){throw 'Only the known truncated header-data display collision is accepted.'}
foreach($class in $counts.Keys)
{
    if(@($discovered|Where-Object {$_ -cmatch ("^Microsoft\.AspNetCore\.Server\.Kestrel\.Core\.Tests\."+$class+"\.")}).Count -ne $counts[$class]){throw "Exact frozen source class rows differ:$class"}
}
$trxName='webtransport-original.trx'
$arguments=@('test','src\Servers\Kestrel\test\InMemory.FunctionalTests\InMemory.FunctionalTests.csproj','--no-restore','--no-build','-c','Release','-m:2',
    '-p:UseIisNativeAssets=false','--filter','FullyQualifiedName~Microsoft.AspNetCore.Server.Kestrel.Core.Tests.WebTransport',
    '--logger',"trx;LogFileName=$trxName",'--results-directory',$directory,'--diag',(Join-Path $directory 'vstest-diagnostic.log'),'-v:minimal')
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'owning-tests.log')
$code=$LASTEXITCODE
$prior.commands=@($prior.commands)+[pscustomobject]@{label='owning-tests';entryPoint='dotnet';arguments=$arguments;actualExitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')}
$prior|ConvertTo-Json -Depth 10|Set-Content $executionPath -Encoding utf8
if($code){Get-Content (Join-Path $directory 'owning-tests.log') -Tail 45;throw 'Actual scoped owner tests failed;preserve this actual execution without silent reruns.'}
[xml]$trx=Get-Content (Join-Path $directory $trxName) -Raw
$results=@($trx.TestRun.Results.UnitTestResult);$definitions=@($trx.TestRun.TestDefinitions.UnitTest);$entries=@($trx.TestRun.TestEntries.TestEntry)
if($definitions.Count -ne 17 -or $results.Count -ne 17 -or $entries.Count -ne 17 -or
    @(Compare-Object @($discovered|Sort-Object) @($definitions.name|Sort-Object)).Count -or
    @($results.testId|Sort-Object -Unique).Count -ne 17 -or @($results.executionId|Sort-Object -Unique).Count -ne 17){throw 'Exact discovery multiset/17 unique definition+execution identities required;display names alone are not identities.'}
$rows=@(foreach($row in $results)
{
    $definition=@($definitions|Where-Object id -CEQ $row.testId)
    $entry=@($entries|Where-Object {$_.testId -ceq $row.testId -and $_.executionId -ceq $row.executionId})
    if($row.outcome -cne 'Passed' -or $entry.Count -ne 1 -or $definition.Count -ne 1 -or
        $definition[0].Execution.id -cne $row.executionId -or $definition[0].name -cne $row.testName -or
        [TimeSpan]::Parse($row.duration).Ticks -le 0){throw 'Every actual scoped row must pass with positive duration/exact execution IDs,zero skips.'}
    [pscustomobject]@{testName=$row.testName;testId=$row.testId;executionId=$row.executionId;outcome=$row.outcome;duration=$row.duration
        className=$definition[0].TestMethod.className;methodName=$definition[0].TestMethod.name}
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
    discoveryDisplayNames=17;distinctDiscoveryDisplayNames=16;duplicateDisplayNames=$duplicates;runtimeUniqueTestAndExecutionIds=17
    discoveryCheckerFailurePreserved=$true;discoveryRepeated=$false;testsExecutedOnce=$true;testDataOrExistingTestNamesChanged=$false
    note='Exact source-derived17 discovery multiset/definition/result/entry associations and positive durations. Two source data rows have identical truncated display names;runtime GUIDs distinguish them. Captured raw diagnostics preserve any additional serialized-data evidence. These tests include synthetic helpers and do not establish live QUIC blocking reachability.'
}|ConvertTo-Json -Depth 12|Set-Content (Join-Path $directory 'test-audit.json') -Encoding utf8
Get-Content (Join-Path $directory 'owning-tests.log') -Tail 6
Write-Output 'F001 original:17/17 actual existing rows passed once,zero skips;17 unique test/execution IDs despite one truncated display-name collision.'
