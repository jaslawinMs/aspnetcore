param(
    [Parameter(Mandatory)][ValidateSet('Build', 'Restore', 'Bootstrap')][string] $Mode,
    [Parameter(Mandatory)][string] $Attempt
)

$ErrorActionPreference = 'Stop'
if ($Attempt -cnotmatch '^[a-z0-9-]+$') { throw 'Use an explicit unique attempt identifier.' }
$root = Join-Path $PSScriptRoot 'autoperf-parallelism\finding-F180-F204-046'
$plan = Get-Content -LiteralPath (Join-Path $root 'entry-plan.json') -Raw | ConvertFrom-Json -DateKind String
$parallel = Join-Path $PSScriptRoot 'autoperf-parallelism'
if (Test-Path -LiteralPath (Join-Path $parallel 'benchmark-exclusive.lease.json')) { throw 'A benchmark lease exists; do not build.' }
$policy = Get-Content -LiteralPath (Join-Path $parallel 'policy.json') -Raw | ConvertFrom-Json -DateKind String
if (!$policy.workersMayBuildOrTest -or $policy.actualWorkerBuildHoldActive) { throw 'Build/test work is held.' }
$out = Join-Path $root "native-$Attempt"
if (Test-Path -LiteralPath $out) { throw 'Preserve an existing attempt.' }
New-Item -ItemType Directory -Path $out | Out-Null
[IO.File]::Copy($PSCommandPath, (Join-Path $out 'executed-native-command-046.ps1'), $false)
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
$graph = $plan.independentDefaultGraph
Set-Location -LiteralPath $graph
. .\activate.ps1 1> (Join-Path $out 'activation.stdout.txt') 2> (Join-Path $out 'activation.stderr.txt')
$project = Join-Path $graph 'src\Azure\samples\AzureAppServicesSample\AzureAppServicesSample.csproj'
$arguments = switch ($Mode)
{
    'Build' { @('build', $project, '--no-restore', '-c', 'Release', '-m:2', '-nr:false', '-p:UseSharedCompilation=false', '-p:UseIISNativeAssets=false', '-v:minimal') }
    'Restore' { @('restore', $project, '-p:Configuration=Release', '-p:UseSharedCompilation=false', '-p:UseIISNativeAssets=false', '-v:minimal') }
    'Bootstrap' { @('/d', '/c', 'eng\build.cmd -noBuildNative -noBuildManaged -noBuildNodeJS') }
}
$executable = if ($Mode -eq 'Bootstrap') { $env:ComSpec } else { (Get-Command dotnet).Source }
$info = [Diagnostics.ProcessStartInfo]::new($executable)
$info.WorkingDirectory = $graph
$info.UseShellExecute = $false
$info.CreateNoWindow = $true
$info.RedirectStandardOutput = $true
$info.RedirectStandardError = $true
foreach ($argument in $arguments) { $info.ArgumentList.Add($argument) }
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
    $rootRow = $rows | Where-Object ProcessId -EQ $process.Id
    if ($null -ne $rootRow -and
        [Math]::Abs(($rootRow.CreationDate.ToUniversalTime() - [DateTimeOffset]::Parse($creation).UtcDateTime).TotalMilliseconds) -lt 1)
    {
        [void]$ownedPids.Add($process.Id)
    }
    do
    {
        $added = $false
        foreach ($row in $rows)
        {
            if ($ownedPids.Contains([int]$row.ParentProcessId) -and $ownedPids.Add([int]$row.ProcessId)) { $added = $true }
        }
    } while ($added)
    foreach ($row in $rows)
    {
        if (!$ownedPids.Contains([int]$row.ProcessId)) { continue }
        $key = "$($row.ProcessId)|$($row.CreationDate.ToUniversalTime().ToString('o'))"
        if (!$identities.ContainsKey($key))
        {
            $identities[$key] = $true
            $observed.Add([pscustomobject]@{
                pid = $row.ProcessId; parentPid = $row.ParentProcessId
                creationUtc = $row.CreationDate.ToUniversalTime().ToString('o')
                executable = $row.ExecutablePath; commandLine = $row.CommandLine
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
    mode = $Mode; attempt = $Attempt; actualGraph = $graph; actualExecutable = $executable; actualArguments = $arguments
    actualRootPid = $process.Id; actualRootCreationUtc = $creation; actualRootTerminal = $process.HasExited
    actualExitCode = $process.ExitCode; actualStdoutDrained = $stdout.IsCompletedSuccessfully; actualStderrDrained = $stderr.IsCompletedSuccessfully
    actualObservedDescendants = @($observed.ToArray()); actualShortUnobservedDescendantsNotClaimed = $true
    actualFinalObservedOwnedIdentitiesStillAlive = $stillOwned
    actualNoBenchmarkOrCandidateOrAuthorization = $true
}
$receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $out 'exit.json') -Encoding utf8NoBOM
Get-Content -LiteralPath (Join-Path $out 'stdout.txt') -Tail 18
Get-Content -LiteralPath (Join-Path $out 'stderr.txt') -Tail 8
[pscustomobject]@{ mode = $Mode; attempt = $Attempt; exit = $process.ExitCode; actualRootPid = $process.Id; observedIdentities = $observed.Count; out = $out } | ConvertTo-Json
if ($stillOwned.Count -ne 0) { throw 'A previously observed owned identity remains alive; inspect it explicitly.' }
if ($process.ExitCode -ne 0) { throw "Native $Mode failed; preserve this attempt and inspect its explicit prerequisite." }
