param(
    [Parameter(Mandatory)][ValidateSet('Original', 'Default')][string] $Role,
    [Parameter(Mandatory)][ValidateSet('Test', 'Restore', 'Generate')][string] $Mode,
    [Parameter(Mandatory)][string] $Attempt
)

$ErrorActionPreference = 'Stop'
if ($Attempt -cnotmatch '^[a-z0-9-]+$')
{
    throw 'Use an explicit unique attempt identifier.'
}
$parallel = Join-Path $PSScriptRoot 'autoperf-parallelism'
$root = Join-Path $parallel 'finding-F237-F238-059'
$plan = Get-Content -LiteralPath (Join-Path $root 'entry-plan.json') -Raw | ConvertFrom-Json -DateKind String
$policy = Get-Content -LiteralPath (Join-Path $parallel 'policy.json') -Raw | ConvertFrom-Json -DateKind String
if ((Test-Path -LiteralPath (Join-Path $parallel 'benchmark-exclusive.lease.json')) -or
    !$policy.workersMayBuildOrTest -or $policy.actualWorkerBuildHoldActive)
{
    throw 'Build/test work is held or a benchmark lease exists.'
}
$out = Join-Path $root "native-$Role-$Attempt"
if (Test-Path -LiteralPath $out)
{
    throw 'Preserve an existing attempt.'
}
New-Item -ItemType Directory -Path $out | Out-Null
[IO.File]::Copy($PSCommandPath, (Join-Path $out 'executed-native-command-060.ps1'), $false)
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
$env:NUGET_PACKAGES = Join-Path $root "packages-$Role"
$env:DOTNET_CLI_HOME = Join-Path $root "cli-home-$Role"
$env:NUGET_SCRATCH = Join-Path $root "nuget-scratch-$Role"
$env:NUGET_HTTP_CACHE_PATH = Join-Path $root "nuget-http-$Role"
$env:NUGET_PLUGINS_CACHE_PATH = Join-Path $root "nuget-plugins-$Role"
$env:TEMP = Join-Path $root "temp-$Role"
$env:TMP = $env:TEMP
[IO.Directory]::CreateDirectory($env:TEMP) | Out-Null
$graph = $plan.actualIndependentGraphs.$Role
Set-Location -LiteralPath $graph
. .\activate.ps1 1> (Join-Path $out 'activation.stdout.txt') 2> (Join-Path $out 'activation.stderr.txt')
$project = Join-Path $graph $plan.nativeProject
$arguments = switch ($Mode)
{
    'Test' {
        @('test', $project, '--no-restore', '-c', 'Release', '-m:2', '-nr:false',
            '-p:UseSharedCompilation=false', '-p:UseIISNativeAssets=false', '-p:BuildNodeJS=false',
            '-p:StaticWebAssetsEnabled=false', '-v:minimal', '--filter', $plan.nativeFilter,
            '--logger', 'trx;LogFileName=selected.trx', '--results-directory', (Join-Path $out 'results'))
    }
    'Restore' {
        @('restore', $project, '-p:Configuration=Release', '-p:UseSharedCompilation=false',
            '-p:UseIISNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-v:minimal')
    }
    'Generate' {
        @('msbuild', (Join-Path $graph 'eng\tools\GenerateFiles\GenerateFiles.csproj'), '-restore',
            '-t:GenerateDirectoryBuildFiles', '-p:Configuration=Release', '-p:UseSharedCompilation=false',
            '-v:minimal', '-m:1', '-nr:false')
    }
}
$executable = (Get-Command dotnet).Source
$info = [Diagnostics.ProcessStartInfo]::new($executable)
$info.WorkingDirectory = $graph
$info.UseShellExecute = $false
$info.CreateNoWindow = $true
$info.RedirectStandardOutput = $true
$info.RedirectStandardError = $true
foreach ($argument in $arguments)
{
    $info.ArgumentList.Add($argument)
}
$process = [Diagnostics.Process]::Start($info)
$creation = $process.StartTime.ToUniversalTime().ToString('o')
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
$identities = @{}
$observed = [Collections.Generic.List[object]]::new()
while (!$process.HasExited)
{
    $rows = @(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine)
    $ownedPids = [Collections.Generic.HashSet[int]]::new()
    $ownedCreationTimes = [Collections.Generic.Dictionary[int, DateTime]]::new()
    $rootRow = $rows | Where-Object ProcessId -EQ $process.Id
    if ($null -ne $rootRow -and
        [Math]::Abs(($rootRow.CreationDate.ToUniversalTime() - [DateTimeOffset]::Parse($creation).UtcDateTime).TotalMilliseconds) -lt 1)
    {
        [void]$ownedPids.Add($process.Id)
        $ownedCreationTimes[$process.Id] = $rootRow.CreationDate.ToUniversalTime()
    }
    do
    {
        $added = $false
        foreach ($row in $rows)
        {
            if ($ownedPids.Contains([int]$row.ParentProcessId) -and
                $row.CreationDate.ToUniversalTime() -ge $ownedCreationTimes[[int]$row.ParentProcessId] -and
                $ownedPids.Add([int]$row.ProcessId))
            {
                $ownedCreationTimes[[int]$row.ProcessId] = $row.CreationDate.ToUniversalTime()
                $added = $true
            }
        }
    } while ($added)
    foreach ($row in $rows)
    {
        if (!$ownedPids.Contains([int]$row.ProcessId))
        {
            continue
        }
        $key = "$($row.ProcessId)|$($row.CreationDate.ToUniversalTime().ToString('o'))"
        if (!$identities.ContainsKey($key))
        {
            $identities[$key] = $true
            $observed.Add([pscustomobject]@{
                pid = $row.ProcessId; parentPid = $row.ParentProcessId
                creationUtc = $row.CreationDate.ToUniversalTime().ToString('o')
                executable = $row.ExecutablePath; commandLine = $row.CommandLine
                actualChronologicalParentCreationUtc = if ($row.ProcessId -eq $process.Id) { $null } else { $ownedCreationTimes[[int]$row.ParentProcessId].ToString('o') }
                actualChronologicalSnapshotOwnership = $true
                firstObservedUtc = [DateTime]::UtcNow.ToString('o')
            })
        }
    }
    Start-Sleep -Milliseconds 400
}
$process.WaitForExit()
[IO.File]::WriteAllText((Join-Path $out 'stdout.txt'), $stdout.GetAwaiter().GetResult(), [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $out 'stderr.txt'), $stderr.GetAwaiter().GetResult(), [Text.UTF8Encoding]::new($false))
$finalRows = @(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine)
$stillOwned = @($observed.ToArray() | Where-Object {
    $item = $_
    @($finalRows | Where-Object {
        $_.ProcessId -eq $item.pid -and
        [Math]::Abs(($_.CreationDate.ToUniversalTime() - [DateTimeOffset]::Parse($item.creationUtc).UtcDateTime).TotalMilliseconds) -lt 1
    }).Count -ne 0
})
$receipt = [ordered]@{
    role = $Role; mode = $Mode; attempt = $Attempt; actualGraph = $graph
    actualExecutable = $executable; actualArguments = $arguments
    actualSelectedProcessEnvironment = @{
        NUGET_PACKAGES = $env:NUGET_PACKAGES; NUGET_SCRATCH = $env:NUGET_SCRATCH
        NUGET_HTTP_CACHE_PATH = $env:NUGET_HTTP_CACHE_PATH; NUGET_PLUGINS_CACHE_PATH = $env:NUGET_PLUGINS_CACHE_PATH
        DOTNET_CLI_HOME = $env:DOTNET_CLI_HOME; MSBUILDDISABLENODEREUSE = $env:MSBUILDDISABLENODEREUSE
        TEMP = $env:TEMP; TMP = $env:TMP
    }
    actualRootPid = $process.Id; actualRootCreationUtc = $creation; actualRootTerminal = $process.HasExited
    actualExitCode = $process.ExitCode; actualStdoutDrained = $stdout.IsCompletedSuccessfully; actualStderrDrained = $stderr.IsCompletedSuccessfully
    actualObservedDescendants = @($observed.ToArray()); actualShortUnobservedDescendantsNotClaimed = $true
    actualEveryNewAdoptionRequiresChildCreationAtOrAfterMatchedParentCreation = $true
    actualFinalObservedOwnedIdentitiesStillAlive = $stillOwned
    actualNoBenchmarkOrCandidateOrAuthorization = $true
}
$receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $out 'exit.json') -Encoding utf8NoBOM
Get-Content -LiteralPath (Join-Path $out 'stdout.txt') -Tail 16
Get-Content -LiteralPath (Join-Path $out 'stderr.txt') -Tail 8
[pscustomobject]@{ role = $Role; mode = $Mode; attempt = $Attempt; exit = $process.ExitCode; actualRootPid = $process.Id; observedIdentities = $observed.Count; out = $out } | ConvertTo-Json
if ($stillOwned.Count -ne 0)
{
    throw 'A previously observed owned identity remains alive; inspect it explicitly.'
}
if ($process.ExitCode -ne 0)
{
    throw "Native $Role $Mode failed; preserve this attempt and inspect its explicit prerequisite."
}
