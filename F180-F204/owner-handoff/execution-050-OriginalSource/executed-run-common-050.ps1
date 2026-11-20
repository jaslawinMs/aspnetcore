param([Parameter(Mandatory)][ValidateSet('OriginalSource', 'Default')][string] $Role)

$ErrorActionPreference = 'Stop'
$parallel = Join-Path $PSScriptRoot 'autoperf-parallelism'
$root = Join-Path $parallel 'finding-F180-F204-046'
$plan = Get-Content -LiteralPath (Join-Path $root 'entry-plan.json') -Raw | ConvertFrom-Json -DateKind String
$common = Join-Path $root 'common-049'
$compiler = Get-Content -LiteralPath (Join-Path $common 'compiler.exit.json') -Raw | ConvertFrom-Json -DateKind String
if ($compiler.actualExitCode -ne 0) { throw 'No accepted common compilation.' }
if (Test-Path -LiteralPath (Join-Path $parallel 'benchmark-exclusive.lease.json')) { throw 'A benchmark lease exists.' }
$policy = Get-Content -LiteralPath (Join-Path $parallel 'policy.json') -Raw | ConvertFrom-Json -DateKind String
if (!$policy.workersMayBuildOrTest -or $policy.actualWorkerBuildHoldActive) { throw 'Native work is held.' }
$graph = if ($Role -eq 'OriginalSource') { 'C:\src\aspnetcore' } else { $plan.independentDefaultGraph }
$native = if ($Role -eq 'OriginalSource') { $plan.inheritedOriginalSourceNative } else { Join-Path $graph 'artifacts\bin\AzureAppServicesSample\Release\net12.0' }
$expectedRuntime = if ($Role -eq 'OriginalSource') { $plan.expectedRuntimeOriginalSource } else { $plan.expectedRuntimeDefault }
$out = Join-Path $root "execution-050-$Role"
if (Test-Path -LiteralPath $out) { throw 'Preserve an existing role execution, including failed attempts.' }
New-Item -ItemType Directory -Path $out | Out-Null
[IO.File]::Copy($PSCommandPath, (Join-Path $out 'executed-run-common-050.ps1'), $false)
$bin = Join-Path $out 'bin'
Copy-Item -LiteralPath $native -Destination $bin -Recurse
foreach ($file in 'AzureSample.CommonProbe.dll', 'AzureSample.CommonProbe.pdb')
{
    [IO.File]::Copy((Join-Path $common $file), (Join-Path $bin $file), $false)
}
$ownerHash = (Get-FileHash -LiteralPath (Join-Path $bin 'AzureAppServicesSample.dll') -Algorithm SHA256).Hash
$commonHash = (Get-FileHash -LiteralPath (Join-Path $common 'AzureSample.CommonProbe.dll') -Algorithm SHA256).Hash
$fixtures = [ordered]@{
    empty = [ordered]@{}
    singleton = [ordered]@{ SystemRoot = 'C:\Windows' }
    mixed = [ordered]@{ F180_z = 'last'; f180_A = 'first:one=1'; F180_m = ''; f180_B = 'second'; SystemRoot = 'C:\Windows' }
}
$summaries = [Collections.Generic.List[object]]::new()
foreach ($fixture in $fixtures.GetEnumerator())
{
    $case = Join-Path $out $fixture.Key
    New-Item -ItemType Directory -Path $case | Out-Null
    $expectedEnvironment = Join-Path $case 'expected-process-environment.json'
    $fixture.Value | ConvertTo-Json | Set-Content -LiteralPath $expectedEnvironment -Encoding utf8NoBOM
    $env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
    $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
    $env:MSBUILDDISABLENODEREUSE = '1'
    Set-Location -LiteralPath $graph
    . .\activate.ps1
    $info = [Diagnostics.ProcessStartInfo]::new((Get-Command dotnet).Source)
    $info.WorkingDirectory = $bin
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.Environment.Clear()
    foreach ($item in $fixture.Value.GetEnumerator()) { $info.Environment[$item.Key] = $item.Value }
    foreach ($argument in @('exec', '--depsfile', (Join-Path $bin 'AzureAppServicesSample.deps.json'),
        '--runtimeconfig', (Join-Path $bin 'AzureAppServicesSample.runtimeconfig.json'),
        (Join-Path $bin 'AzureSample.CommonProbe.dll'), $Role, $fixture.Key, $expectedEnvironment))
    {
        $info.ArgumentList.Add($argument)
    }
    $process = [Diagnostics.Process]::Start($info)
    $created = $process.StartTime.ToUniversalTime().ToString('o')
    $stdout = $process.StandardOutput.ReadToEndAsync()
    $stderr = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    [IO.File]::WriteAllText((Join-Path $case 'stdout.json'), $stdout.GetAwaiter().GetResult(), [Text.UTF8Encoding]::new($false))
    [IO.File]::WriteAllText((Join-Path $case 'stderr.txt'), $stderr.GetAwaiter().GetResult(), [Text.UTF8Encoding]::new($false))
    [pscustomobject]@{
        actualExecutable = $info.FileName; actualArguments = @($info.ArgumentList); actualWorkingDirectory = $bin
        actualRootPid = $process.Id; actualRootCreationUtc = $created; actualRootTerminal = $process.HasExited
        actualExitCode = $process.ExitCode; actualStdoutDrained = $stdout.IsCompletedSuccessfully; actualStderrDrained = $stderr.IsCompletedSuccessfully
        actualExplicitProcessLocalEnvironmentOnly = $true; actualExpectedEnvironmentFile = $expectedEnvironment
        actualNoHostEnvironmentCopiedOrMutated = $true
        actualChildProcessesNotInventoriedUniversalClosureNotClaimed = $true
        actualNoBenchmarkOrAllocationCounter = $true
    } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $case 'exit.json') -Encoding utf8NoBOM
    if ($process.ExitCode -ne 0)
    {
        Get-Content -LiteralPath (Join-Path $case 'stderr.txt') -Tail 14
        throw "The real $Role/$($fixture.Key) native consumer failed; preserve this execution."
    }
    $result = Get-Content -LiteralPath (Join-Path $case 'stdout.json') -Raw | ConvertFrom-Json -DateKind String
    if ($result.actualStatus -cne 'PASS' -or $result.actualPid -ne $process.Id -or
        $result.actualRuntime -cne ".NET $expectedRuntime" -or $result.actualOwner.sha256 -cne $ownerHash -or
        $result.actualConsumer.sha256 -cne $commonHash -or @($result.actualRows).Count -ne 2)
    {
        throw 'Role, runtime, native image, common consumer, or row identity mismatch.'
    }
    foreach ($row in $result.actualRows)
    {
        if ($row.actualStatus -cne 'PASS' -or
            @($row.actualChecks) -cnotcontains 'ActualOsEnvironmentSnapshotIsCompleteValuePairedAndOrdinalIgnoreCaseOrdered' -or
            @($row.actualChecks) -cnotcontains 'RealLoggerFactoryEnabledAndDisabledFilterProducesExactRecordCount')
        {
            throw 'An exact producer-contract row did not reach its assertions.'
        }
    }
    if ($result.actualRows[0].name -cne 'RequestPipeline_DebugDisabled' -or $result.actualRows[0].actualDebugEnabled -ne $false -or
        $result.actualRows[1].name -cne 'RequestPipeline_DebugEnabled' -or $result.actualRows[1].actualDebugEnabled -ne $true)
    {
        throw 'Missing or mislabeled Debug-filter row.'
    }
    $summaries.Add([pscustomobject]@{
        role = $Role; fixture = $fixture.Key; actualPid = $process.Id; actualRuntime = $result.actualRuntime
        actualOwnerMvid = $result.actualOwner.mvid; actualConsumerMvid = $result.actualConsumer.mvid
        actualEnvironmentCount = @($result.actualEnvironment.PSObject.Properties).Count
        actualRows = @($result.actualRows | ForEach-Object { [pscustomobject]@{ name = $_.name; checks = @($_.actualChecks).Count; status = $_.actualStatus } })
    })
}
$summaries.ToArray() | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $out 'verified-rows.json') -Encoding utf8NoBOM
$summaries.ToArray() | ConvertTo-Json -Depth 6
