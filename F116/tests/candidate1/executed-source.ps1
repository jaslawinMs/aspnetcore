param([ValidateSet('original','candidate1')][string]$Variant='original')
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F116'
$directory=Join-Path $run "tests\$Variant"
if ((Test-Path $directory) -or (git branch --show-current).Trim() -cne 'autoperf/F116-boxed-port-cache' -or
    (git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5') {throw 'Exact independent baseline branch/new test attempt required.'}
$changes=@(git diff --name-only)
if (($Variant -ceq 'original' -and $changes.Count) -or
    ($Variant -ceq 'candidate1' -and ($changes.Count -ne 1 -or $changes[0] -cne 'src/Shared/ConnectionEndpointTags.cs'))) {throw 'Only planned exact shared-source shape permitted.'}
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
$commands=[System.Collections.Generic.List[object]]::new()
$audits=[System.Collections.Generic.List[object]]::new()
function Invoke-Dotnet([string]$Label,[string[]]$Arguments)
{
    $start=[DateTimeOffset]::UtcNow.ToString('o')
    dotnet @Arguments *> (Join-Path $directory "$Label.log")
    $code=$LASTEXITCODE
    $commands.Add([pscustomobject]@{label=$Label;entryPoint='dotnet';arguments=$Arguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')})
    [ordered]@{candidate='F116';variant=$Variant;commands=$commands}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8

    return $code
}
$signalRMethods=@('HubMethodInvokesCreateActivities','HubMethodActivityUsesResolvedHubMethodName','HubMethodInvokesCreateActivities_ReadTraceHeaders',
    'StreamingHubMethodCreatesActivities','StreamingHubMethodCreatesActivities_ReadTraceHeaders','ExceptionInOnConnectedAsyncSetsActivityErrorState',
    'ExceptionInOnDisconnectedAsyncSetsActivityErrorState','ExceptionInStreamingMethodSetsActivityErrorState','ExceptionInHubMethodSetsActivityErrorState',
    'HubMethodActivityIncludesConnectionEndpointTags')
$scopes=@(
    [pscustomobject]@{label='kestrel';project='src\Servers\Kestrel\test\InMemory.FunctionalTests\InMemory.FunctionalTests.csproj'
        filter='FullyQualifiedName~Microsoft.AspNetCore.Server.Kestrel.InMemory.FunctionalTests.KestrelMetricsTests'
        assembly='InMemory.FunctionalTests';minimum=21;owners=@('Microsoft.AspNetCore.Server.Kestrel.Core')},
    [pscustomobject]@{label='signalr';project='src\SignalR\server\SignalR\test\Microsoft.AspNetCore.SignalR.Tests\Microsoft.AspNetCore.SignalR.Tests.csproj'
        filter=(($signalRMethods|ForEach-Object {"FullyQualifiedName=Microsoft.AspNetCore.SignalR.Tests.HubConnectionHandlerTests.$_"}) -join '|')
        assembly='Microsoft.AspNetCore.SignalR.Tests';minimum=10
        owners=@('Microsoft.AspNetCore.Server.Kestrel.Core','Microsoft.AspNetCore.SignalR.Core','Microsoft.AspNetCore.Http.Connections')}
)
foreach ($scope in $scopes)
{
    $discoveryArguments=@('test',$scope.project,'--no-restore','-c','Release','-m:2','-p:UseIisNativeAssets=false','--filter',$scope.filter,'--list-tests','-v:quiet')
    $code=Invoke-Dotnet "$($scope.label)-discovery-initial" $discoveryArguments
    $discoveryLog=Join-Path $directory "$($scope.label)-discovery-initial.log"
    if ($code)
    {
        $missing=Get-Content $discoveryLog -Raw
        if ($missing -notmatch 'NETSDK1004|NETSDK1005|NETSDK1064') {Get-Content $discoveryLog -Tail 35;throw 'Initial scoped discovery/build failed for a non-missing-package reason;preserve this attempt.'}
        $code=Invoke-Dotnet "$($scope.label)-restore-after-missing-assets" @('restore',$scope.project,'--disable-parallel','-p:UseIisNativeAssets=false','-v:quiet')
        if ($code) {throw 'Missing-asset restore failed.'}
        $code=Invoke-Dotnet "$($scope.label)-discovery-after-restore" $discoveryArguments
        $discoveryLog=Join-Path $directory "$($scope.label)-discovery-after-restore.log"
        if ($code) {Get-Content $discoveryLog -Tail 35;throw 'Scoped discovery still failed after missing-asset restoration.'}
    }
    $discovered=@(Get-Content $discoveryLog|ForEach-Object {if ($_ -match '^\s+(Microsoft\.AspNetCore\..+)$') {$Matches[1]}})
    if ($discovered.Count -lt $scope.minimum -or @($discovered|Sort-Object -Unique).Count -ne $discovered.Count) {throw 'Positive unique scoped discovery required.'}
    $trxName="$($scope.label)-$Variant.trx"
    $code=Invoke-Dotnet "$($scope.label)-owning-tests" @('test',$scope.project,'--no-restore','--no-build','-c','Release','-m:2',
        '-p:UseIisNativeAssets=false','--filter',$scope.filter,'--logger',"trx;LogFileName=$trxName",'--results-directory',$directory,'-v:minimal')
    if ($code) {Get-Content (Join-Path $directory "$($scope.label)-owning-tests.log") -Tail 40;throw 'Actual scoped owning tests failed;preserve every row,do not silently rerun.'}
    [xml]$trx=Get-Content (Join-Path $directory $trxName) -Raw
    $results=@($trx.TestRun.Results.UnitTestResult);$definitions=@($trx.TestRun.TestDefinitions.UnitTest);$entries=@($trx.TestRun.TestEntries.TestEntry)
    if ($definitions.Count -ne $discovered.Count -or $entries.Count -ne $results.Count -or
        @(Compare-Object @($discovered|Sort-Object) @($definitions.name|Sort-Object)).Count -or
        @($results.executionId|Sort-Object -Unique).Count -ne $results.Count) {throw 'Exact discovery/definition/expanded execution sets differ.'}
    foreach ($definition in $definitions)
    {
        $rows=@($results|Where-Object testId -CEQ $definition.id)
        if ($rows.Count -ne 1 -or $definition.Execution.id -cne $rows[0].executionId -or $definition.name -cne $rows[0].testName) {throw 'This scoped Fact/serializable-data set requires one exact result per discovered definition.'}
    }
    $rows=@(foreach ($row in $results)
    {
        $entry=@($entries|Where-Object {$_.testId -ceq $row.testId -and $_.executionId -ceq $row.executionId})
        if ($row.outcome -cne 'Passed' -or $entry.Count -ne 1 -or [TimeSpan]::Parse($row.duration).Ticks -le 0) {throw 'Every actual scoped row must pass with positive duration/exact execution IDs,zero skips.'}
        [pscustomobject]@{testName=$row.testName;testId=$row.testId;executionId=$row.executionId;outcome=$row.outcome;duration=$row.duration}
    })
    $output="C:\src\aspnetcore\artifacts\bin\$($scope.assembly)\Release\net12.0"
    $image=Join-Path $directory "image-$($scope.label)"
    New-Item -ItemType Directory -Path $image -Force|Out-Null
    $names=@("$($scope.assembly).dll","$($scope.assembly).pdb","$($scope.assembly).deps.json","$($scope.assembly).runtimeconfig.json")+
        @($scope.owners|ForEach-Object {"$_.dll";"$_.pdb"})
    $images=@(foreach ($name in $names)
    {
        $file=Join-Path $output $name
        Copy-Item $file (Join-Path $image $name)
        [pscustomobject]@{file=$name;bytes=(Get-Item $file).Length;sha256=(Get-FileHash $file).Hash}
    })
    $audits.Add([pscustomobject]@{scope=$scope.label;discovered=$discovered.Count;passed=$rows.Count;failed=0;skipped=0
        sourceChanged=($Variant -cne 'original');rows=$rows;capturedTestAndOwnerImage=$images;imageRelative="image-$($scope.label)"
        trx=$trxName;trxSha256=(Get-FileHash (Join-Path $directory $trxName)).Hash;discoveryLog=[IO.Path]::GetFileName($discoveryLog)})
    Get-Content (Join-Path $directory "$($scope.label)-owning-tests.log") -Tail 5
}
[ordered]@{candidate='F116';variant=$Variant;scopes=$audits;allPassed=$true;skipped=0;actualRows=($audits|Measure-Object -Property passed -Sum).Sum
    note='Exact scoped existing functional/unit-category projects,all discovery/result/entry links and positive durations. Actual test/owner images captured before later harness build;not full-test-closure/in-test loaded-hash proof. Baseline Kestrel metrics test predates one unrelated current-default measurement-wait insertion,explicitly preserved in source-scope amendment.'
}|ConvertTo-Json -Depth 11|Set-Content (Join-Path $directory 'test-audit.json') -Encoding utf8
Write-Output "F116:$Variant all actual scoped owning rows passed,zero skips;images captured for all three linked product owners."
