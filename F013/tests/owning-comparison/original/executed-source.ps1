param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('original', 'native-specialization-001')]
    [string]$Variant
)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F013'
$directory = Join-Path $run "tests\owning-comparison\$Variant"
if (Test-Path $directory)
{
    throw 'Preserve actual owning-test execution, source and binary images.'
}
$investigation = Get-Content (Join-Path $run 'current-source-investigation.json') -Raw | ConvertFrom-Json
$selection = Get-Content (Join-Path $run 'candidate-selection.json') -Raw | ConvertFrom-Json
if ((git branch --show-current).Trim() -cne $investigation.branch -or
    (git rev-parse HEAD).Trim() -cne $investigation.baseline -or
    -not $selection.implementationSelectedForEvaluation)
{
    throw 'Independent baseline branch and native candidate-selection evidence required.'
}
$owner = 'src\SignalR\server\Core\src\DefaultHubLifetimeManager.cs'
$test = 'src\SignalR\server\SignalR\test\Microsoft.AspNetCore.SignalR.Tests\DefaultHubLifetimeManagerTests.cs'
$baselineOwner = [IO.File]::ReadAllText((Join-Path $run "baseline-canonical\$owner")).Replace("`r`n", "`n")
$actualOwner = [IO.File]::ReadAllText((Join-Path (Get-Location).Path $owner)).Replace("`r`n", "`n")
if (($Variant -ceq 'original') -ne ($baselineOwner -ceq $actualOwner) -or
    @((git diff --name-only) | Where-Object { $_ -notin $owner.Replace('\', '/'), $test.Replace('\', '/') }).Count -or
    @(git diff --cached --name-only).Count)
{
    throw 'Only declared owner/test changes and expected original/candidate role permitted.'
}
New-Item $directory -ItemType Directory -Force | Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
Copy-Item $test (Join-Path $directory 'DefaultHubLifetimeManagerTests.cs')
Copy-Item $owner (Join-Path $directory 'DefaultHubLifetimeManager.cs')
$commands = [System.Collections.Generic.List[object]]::new()
function InvokeRecorded([string]$Label, [string[]]$Arguments)
{
    $start = [DateTimeOffset]::UtcNow
    & dotnet @Arguments *> (Join-Path $directory "$Label.log")
    $code = $LASTEXITCODE
    $commands.Add([pscustomobject]@{
        label = $Label; entryPoint = 'dotnet'; arguments = $Arguments; actualExitCode = $code
        startedUtc = $start.ToString('o'); completedUtc = [DateTimeOffset]::UtcNow.ToString('o')
    })
    [ordered]@{
        candidate = 'F013'; variant = $Variant; activation = '. .\activate.ps1'
        actualNewOwningTestRun = $true; commands = $commands
    } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $directory 'execution.json')
    Get-Content (Join-Path $directory "$Label.log") -Tail 10
    if ($code)
    {
        throw "Actual $Variant/$Label failed; retain source, commands and output."
    }
}
if ($Variant -cne 'original')
{
    InvokeRecorded 'owner-build' @('build', 'src\SignalR\server\Core\src\Microsoft.AspNetCore.SignalR.Core.csproj',
        '--no-restore', '--no-dependencies', '-c', 'Release', '-t:Rebuild', '-m:2', '-v:q',
        '-p:UseIisNativeAssets=false', "-bl:$directory\owner-build.binlog")
}
$project = 'src\SignalR\server\SignalR\test\Microsoft.AspNetCore.SignalR.Tests\Microsoft.AspNetCore.SignalR.Tests.csproj'
InvokeRecorded 'owning-test-build' @('build', $project, '--no-restore', '--no-dependencies',
    '-c', 'Release', '-m:2', '-v:q', '-p:UseIisNativeAssets=false', "-bl:$directory\owning-test-build.binlog")
InvokeRecorded 'owning-tests' @('test', $project, '--no-build', '--no-restore', '-c', 'Release', '-m:2', '-v:q',
    '-p:UseIisNativeAssets=false', '--filter', 'FullyQualifiedName~DefaultHubLifetimeManagerTests',
    '--logger', "trx;LogFileName=owning-$Variant.trx", '--results-directory', $directory)
$trxPath = Join-Path $directory "owning-$Variant.trx"
[xml]$trx = Get-Content $trxPath -Raw
$results = @($trx.SelectNodes("//*[local-name()='UnitTestResult']"))
$definitions = @($trx.SelectNodes("//*[local-name()='TestDefinitions']/*[local-name()='UnitTest']"))
$entries = @($trx.SelectNodes("//*[local-name()='TestEntry']"))
$counters = $trx.SelectSingleNode("//*[local-name()='Counters']")
if ($results.Count -ne 28 -or $definitions.Count -ne 28 -or $entries.Count -ne 28 -or
    $counters.total -ne '28' -or $counters.passed -ne '28' -or $counters.failed -ne '0' -or
    @($results | Where-Object outcome -CNE 'Passed').Count -or
    @($results.executionId | Select-Object -Unique).Count -ne 28 -or @($results.testId | Select-Object -Unique).Count -ne 28)
{
    throw 'Expected28 non-skipped owning results, definitions, entries and unique IDs.'
}
$rows = @(
    foreach ($result in $results)
    {
        $definition = @($definitions | Where-Object id -CEQ $result.testId)
        $entry = @($entries | Where-Object testId -CEQ $result.testId)
        $duration = [TimeSpan]::Parse($result.duration, [Globalization.CultureInfo]::InvariantCulture)
        if ($definition.Count -ne 1 -or $entry.Count -ne 1 -or
            $definition[0].Execution.id -cne $result.executionId -or $entry[0].executionId -cne $result.executionId -or
            $duration.Ticks -le 0)
        {
            throw 'Actual owning result/definition/entry identity or positive duration differs.'
        }
        [pscustomobject]@{
            method = $definition[0].TestMethod.name; displayName = $result.testName; outcome = $result.outcome
            testId = $result.testId; executionId = $result.executionId; actualDuration = $result.duration
        }
    }
)
$theory = @($rows | Where-Object method -CEQ 'SendConnectionsAsyncWritesOnceToSpecifiedConnections')
foreach ($count in 16, 17)
{
    foreach ($list in 'False', 'True')
    {
        if (@($theory | Where-Object { $_.displayName -cmatch "targetCount: $count, useList: $list\)" }).Count -ne 1)
        {
            throw "Actual $count/$list Theory row missing or ambiguous."
        }
    }
}
if ($theory.Count -ne 4 -or @($rows | Where-Object method -CEQ 'SendConnectionsAsyncPreservesDerivedListContainsDispatch').Count -ne 1)
{
    throw 'New derived-list preservation test and four actual16/17 array/List rows required.'
}
$image = Join-Path $directory 'test-image'
New-Item $image -ItemType Directory | Out-Null
$binaries = @(
    foreach ($assembly in 'Microsoft.AspNetCore.SignalR.Core', 'Microsoft.AspNetCore.SignalR.Tests', 'Microsoft.AspNetCore.SignalR.Specification.Tests')
    {
        foreach ($extension in '.dll', '.pdb')
        {
            $file = Join-Path (Get-Location).Path "artifacts\bin\$assembly\Release\net12.0\$assembly$extension"
            Copy-Item $file $image
            [pscustomobject]@{ name = "$assembly$extension"; bytes = (Get-Item $file).Length; sha256 = (Get-FileHash $file).Hash }
        }
    }
)
if ($Variant -ceq 'original')
{
    $manifest = Get-Content (Join-Path $run 'manifest-original.json') -Raw | ConvertFrom-Json
    if (@($binaries | Where-Object name -CEQ 'Microsoft.AspNetCore.SignalR.Core.dll')[0].sha256 -cne $manifest.ownerDllSha256)
    {
        throw 'Fresh original preservation tests must use the exact characterized original owner.'
    }
}
[ordered]@{
    candidate = 'F013'; variant = $Variant; actualFreshOwningTestRun = $true
    actualTests = 28; passed = 28; failed = 0; skipped = 0; actualTheoryRows = 4
    actualNewDerivedListFact = 'SendConnectionsAsyncPreservesDerivedListContainsDispatch'
    trxSha256 = (Get-FileHash $trxPath).Hash
    actualOwnerSourceSha256 = (Get-FileHash (Join-Path $directory 'DefaultHubLifetimeManager.cs')).Hash
    actualTestSourceSha256 = (Get-FileHash (Join-Path $directory 'DefaultHubLifetimeManagerTests.cs')).Hash
    rows = $rows; binaryHashes = $binaries
    notWholeSignalRProject = $true; behavioralPreservationNotBugFixRedGreen = $true
} | ConvertTo-Json -Depth 9 | Set-Content (Join-Path $directory 'actual-test-audit.json')
Write-Output "F013/$Variant:28 actual owning rows passed, including new derived-list dispatch Fact and all four16/17 array/List payloads; actual tested bytes/source frozen."
