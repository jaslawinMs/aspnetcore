param(
    [Parameter(Mandatory)]
    [ValidateSet('publish-no-restore', 'restore', 'publish-after-restore', 'native')]
    [string] $Mode
)

$ErrorActionPreference = 'Stop'
$session = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files'
$parallel = Join-Path $session 'autoperf-parallelism'
$root = Join-Path $parallel 'finding-F141-nativeaot-035'
$plan = Get-Content -LiteralPath (Join-Path $root 'acceptance-before-nativeaot-035.json') -Raw | ConvertFrom-Json
$policy = Get-Content -LiteralPath (Join-Path $parallel 'policy.json') -Raw | ConvertFrom-Json
if ($policy.actualWorkerBuildHoldActive -or !$policy.workersMayBuildOrTest)
{
    throw 'An explicit actual-owner native-work hold blocks this untimed F141 command.'
}
foreach ($inputFile in $plan.actualCopiedInputs)
{
    if ((Get-FileHash -LiteralPath (Join-Path $root $inputFile.file) -Algorithm SHA256).Hash -ne $inputFile.sha256)
    {
        throw "Frozen input changed: $($inputFile.file)"
    }
}
foreach ($file in 'Program.cs', 'NativeUploadProbe.csproj')
{
    $current = Join-Path $root "testassets\NativeUploadProbe\$file"
    $frozen = Join-Path $root "frozen-before-first-publish\$file"
    if ((Get-FileHash -LiteralPath $current -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $frozen -Algorithm SHA256).Hash)
    {
        throw 'NativeAOT consumer source differs from its before-first-publish cohort.'
    }
}
$work = Join-Path $root "invocations\$Mode-036"
if (Test-Path -LiteralPath $work)
{
    throw 'This exact native invocation already has retained state; do not replay it.'
}
New-Item -ItemType Directory -Path $work | Out-Null
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
Set-Location -LiteralPath $plan.actualActivationGraph
. .\activate.ps1
if ((Get-FileHash -LiteralPath $plan.actualDotnetHost -Algorithm SHA256).Hash -ne $plan.actualDotnetHostSha256)
{
    throw 'The activated exact SDK host changed.'
}
$arguments = switch ($Mode)
{
    'restore' { @('restore', $plan.actualProject, '--configfile', $plan.actualNugetConfigReadOnly, '-r', 'win-x64', '-v:minimal', '-p:UseSharedCompilation=false') }
    'native' { @('Original37', (Join-Path $work 'native-result.json')) }
    default { @('publish', $plan.actualProject, '--no-restore', '-c', 'Release', '-r', 'win-x64', '-o', $plan.actualPublishDirectory, '-v:minimal', '-m:1', '-nr:false', '-p:UseSharedCompilation=false') }
}
$executable = if ($Mode -eq 'native') { Join-Path $plan.actualPublishDirectory 'AutoPerf.SignalR.NativeUploadProbe.exe' } else { $plan.actualDotnetHost }
$info = [Diagnostics.ProcessStartInfo]::new($executable)
$info.WorkingDirectory = $plan.actualActivationGraph
$info.UseShellExecute = $false
$info.CreateNoWindow = $true
$info.RedirectStandardOutput = $true
$info.RedirectStandardError = $true
$info.StandardOutputEncoding = [Text.UTF8Encoding]::new($false)
$info.StandardErrorEncoding = [Text.UTF8Encoding]::new($false)
foreach ($argument in $arguments) { $info.ArgumentList.Add($argument) }
$process = [Diagnostics.Process]::new()
$process.StartInfo = $info
if (!$process.Start()) { throw 'The exact native process did not start.' }
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
$started = [ordered]@{
    recordedAt = [DateTime]::UtcNow.ToString('o')
    mode = $Mode
    processId = $process.Id
    actualProcessStartTimeUtc = $process.StartTime.ToUniversalTime().ToString('o')
    actualParentLauncherProcessId = $PID
    executable = $executable
    executableSha256 = (Get-FileHash -LiteralPath $executable -Algorithm SHA256).Hash
    arguments = $arguments
    actualNoBenchmark = $true
}
$started | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $work 'started.json') -Encoding utf8NoBOM
$known = @{}
$observations = [Collections.Generic.List[object]]::new()
while (!$process.WaitForExit(1000))
{
    $parents = @($process.Id) + @($known.Values | ForEach-Object { $_.processId })
    foreach ($parentId in ($parents | Select-Object -Unique))
    {
        foreach ($child in @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$parentId"))
        {
            $creation = $child.CreationDate.ToUniversalTime().ToString('o')
            $identity = "$($child.ProcessId)/$creation"
            $record = [pscustomobject]@{ processId = $child.ProcessId; parentProcessId = $child.ParentProcessId; actualCreationUtc = $creation; executablePath = $child.ExecutablePath; observedAt = [DateTime]::UtcNow.ToString('o') }
            $known[$identity] = $record
            $observations.Add($record)
        }
    }
}
$process.WaitForExit()
[IO.File]::WriteAllText((Join-Path $work 'stdout.txt'), $stdout.GetAwaiter().GetResult(), [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $work 'stderr.txt'), $stderr.GetAwaiter().GetResult(), [Text.UTF8Encoding]::new($false))
$terminal = @(foreach ($entry in $known.Values)
{
    $actual = Get-CimInstance Win32_Process -Filter "ProcessId=$($entry.processId)"
    $same = $null -ne $actual -and $actual.CreationDate.ToUniversalTime().ToString('o') -eq $entry.actualCreationUtc
    [pscustomobject]@{ processId = $entry.processId; actualRecordedCreationUtc = $entry.actualCreationUtc; actualSameCreationLive = $same }
})
$exit = [ordered]@{
    recordedAt = [DateTime]::UtcNow.ToString('o')
    actualExitCode = $process.ExitCode
    actualRootTerminal = $process.HasExited
    actualStdoutDrained = $stdout.IsCompletedSuccessfully
    actualStderrDrained = $stderr.IsCompletedSuccessfully
    actualObservedDescendantSnapshots = $observations.ToArray()
    actualObservedDescendantTerminalChecks = $terminal
    actualBoundedObservationsNotFullHistoricalProcessClosure = $true
    actualNoBenchmarkWarmupAllocationOrStopwatch = $true
}
$exit | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $work 'exit.json.tmp') -Encoding utf8NoBOM
[IO.File]::Move((Join-Path $work 'exit.json.tmp'), (Join-Path $work 'exit.json'))
if (@($terminal | Where-Object actualSameCreationLive).Count -gt 0)
{
    throw 'A specifically observed descendant is still live; do not claim native closure or kill unrelated processes.'
}
if ($process.ExitCode -ne 0)
{
    throw "F141 $Mode failed with actual native exit $($process.ExitCode); preserve the raw streams and receipt."
}
Write-Output "F141 $Mode native root exit0 and both streams drained."
