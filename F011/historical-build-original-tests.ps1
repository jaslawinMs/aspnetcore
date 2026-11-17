$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F011'
$destination = Join-Path $run 'tests\original'
if (Test-Path $destination)
{
    throw 'Preserve the actual original test execution.'
}
$investigation = Get-Content (Join-Path $run 'current-source-investigation.json') -Raw | ConvertFrom-Json
if ((git rev-parse HEAD).Trim() -cne $investigation.baseline -or
    (git branch --show-current).Trim() -cne $investigation.branch -or
    @(git diff --name-only).Count -or @(git diff --cached --name-only).Count)
{
    throw 'An independent, unmodified baseline is required.'
}
foreach ($source in $investigation.sources)
{
    if ((Get-FileHash $source.file).Hash -cne $source.workingSha256)
    {
        throw "Selected source changed: $($source.file)"
    }
}
New-Item $destination -ItemType Directory -Force | Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
$commands = [System.Collections.Generic.List[object]]::new()
function InvokeRecordedDotnet([string]$Label, [string[]]$Arguments)
{
    $start = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @Arguments *> (Join-Path $destination "$Label.log")
    $code = $LASTEXITCODE
    $commands.Add([pscustomobject]@{
        label = $Label; entryPoint = 'dotnet'; arguments = $Arguments; actualExitCode = $code
        startedUtc = $start; completedUtc = [DateTimeOffset]::UtcNow.ToString('o')
    })
    [ordered]@{
        candidate = 'F011'; variant = 'original'; activation = '. .\activate.ps1'; commands = $commands
    } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $destination 'execution.json')
    Get-Content (Join-Path $destination "$Label.log") -Tail 12
    if ($code)
    {
        throw "Original $Label failed; retain the attempt and inspect its exact prerequisite."
    }
}
$ownerProject = 'src\SignalR\server\Core\src\Microsoft.AspNetCore.SignalR.Core.csproj'
$testProject = 'src\SignalR\server\SignalR\test\Microsoft.AspNetCore.SignalR.Tests\Microsoft.AspNetCore.SignalR.Tests.csproj'
InvokeRecordedDotnet 'fresh-owner-build' @(
    'build', $ownerProject, '--no-restore', '--no-dependencies', '-c', 'Release', '-t:Rebuild', '-m:2', '-v:q',
    '-p:UseIisNativeAssets=false', "-bl:$destination\fresh-owner-build.binlog")
InvokeRecordedDotnet 'owning-test-build' @(
    'build', $testProject, '--no-restore', '-c', 'Release', '-m:2', '-v:q',
    '-p:UseIisNativeAssets=false', "-bl:$destination\owning-test-build.binlog")
InvokeRecordedDotnet 'owning-tests' @(
    'test', $testProject, '--no-build', '--no-restore', '-c', 'Release', '-m:2', '-v:q',
    '-p:UseIisNativeAssets=false', '--filter', 'FullyQualifiedName~DefaultHubLifetimeManagerTests',
    '--logger', 'trx;LogFileName=owning-original.trx', '--results-directory', $destination)
[xml]$trx = Get-Content (Join-Path $destination 'owning-original.trx') -Raw
$results = @($trx.TestRun.Results.UnitTestResult)
$definitions = @($trx.TestRun.TestDefinitions.UnitTest)
$entries = @($trx.TestRun.TestEntries.TestEntry)
if ($results.Count -lt 1 -or $definitions.Count -ne $results.Count -or $entries.Count -ne $results.Count -or
    @($results | Where-Object outcome -CNE 'Passed').Count -or
    @($results | Group-Object testId | Where-Object Count -NE 1).Count -or
    @($results | Group-Object executionId | Where-Object Count -NE 1).Count)
{
    throw 'Every discovered row must pass once with unique actual runtime identities.'
}
$rows = @()
foreach ($result in $results)
{
    $definition = @($definitions | Where-Object id -CEQ $result.testId)
    if ($definition.Count -ne 1 -or $definition[0].Execution.id -cne $result.executionId -or
        @($entries | Where-Object {
            $_.testId -ceq $result.testId -and $_.executionId -ceq $result.executionId
        }).Count -ne 1 -or [TimeSpan]::Parse($result.duration).Ticks -le 0)
    {
        throw 'Exact result/definition/entry binding and positive duration are required.'
    }
    $rows += @{
        method = $definition[0].TestMethod.name; class = $definition[0].TestMethod.className
        displayName = $result.testName; testId = $result.testId; executionId = $result.executionId
        duration = $result.duration; outcome = $result.outcome
    }
}
foreach ($name in 'SendGroupExceptAsyncWillCancelWithToken', 'SendGroupExceptAsyncDoesNotWriteToExcludedConnections')
{
    if (@($rows | Where-Object { $_.method.Contains($name, [StringComparison]::Ordinal) }).Count -ne 1)
    {
        throw "The actual group-send correctness row is missing: $name"
    }
}
$owner = 'artifacts\bin\Microsoft.AspNetCore.SignalR.Core\Release\net12.0'
$tests = 'artifacts\bin\Microsoft.AspNetCore.SignalR.Tests\Release\net12.0'
$binaryHashes = @()
foreach ($name in 'Microsoft.AspNetCore.SignalR.Core.dll', 'Microsoft.AspNetCore.SignalR.Core.pdb')
{
    $one = (Get-FileHash (Join-Path $owner $name)).Hash
    $two = (Get-FileHash (Join-Path $tests $name)).Hash
    if ($one -cne $two)
    {
        throw 'The tested owner differs from the built owner.'
    }
    $binaryHashes += @{ path = (Join-Path $owner $name); sha256 = $one }
}
$image = Join-Path $destination 'test-image'
New-Item $image -ItemType Directory | Out-Null
foreach ($name in 'Microsoft.AspNetCore.SignalR.Core.dll', 'Microsoft.AspNetCore.SignalR.Core.pdb',
    'Microsoft.AspNetCore.SignalR.Tests.dll', 'Microsoft.AspNetCore.SignalR.Tests.pdb')
{
    Copy-Item (Join-Path $tests $name) (Join-Path $image $name)
}
$areaRows = @($rows | Where-Object { $_.class -like '*DefaultHubLifetimeManagerTests*' })
$sentinelRows = @($rows | Where-Object { $_.class -like 'AlwaysTestTests.*' })
if ($areaRows.Count -lt 2 -or $areaRows.Count + $sentinelRows.Count -ne $rows.Count)
{
    throw 'Account for every concrete area and repository-sentinel test row.'
}
[ordered]@{
    candidate = 'F011'; variant = 'original'; actualTests = $results.Count; passed = $results.Count; failed = 0; skipped = 0
    areaRows = $areaRows.Count; sentinelRows = $sentinelRows.Count; rows = $rows; binaryHashes = $binaryHashes
    testAssemblySha256 = (Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.SignalR.Tests.dll')).Hash
    testPdbSha256 = (Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.SignalR.Tests.pdb')).Hash
    completeDiscoveredDefaultHubLifetimeManagerClassExecuted = $true
    completeExistingSignalRTestProjectExecuted = $false
    newPermanentTestsAdded = $false; notWholeCurrentDefaultSdkIntegration = $true
} | ConvertTo-Json -Depth 9 | Set-Content (Join-Path $destination 'actual-test-audit.json')
Write-Output "F011 original: $($areaRows.Count) area + $($sentinelRows.Count) sentinel rows passed; every TRX identity, outcome and duration checked."
