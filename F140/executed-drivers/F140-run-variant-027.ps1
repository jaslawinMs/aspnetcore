param(
    [Parameter(Mandatory)][ValidateSet('Original37', 'Default90')][string] $Role,
    [Parameter(Mandatory)][ValidateSet('baseline', 'candidate')][string] $Variant,
    [Parameter(Mandatory)][ValidateRange(0, 6)][int] $Pair,
    [Parameter(Mandatory)][ValidatePattern('^[A-Za-z0-9-]+$')][string] $Label
)

$ErrorActionPreference = 'Stop'
$session = $PSScriptRoot
$root = Join-Path $session 'autoperf-runs\F140'
$parallel = Join-Path $session 'autoperf-parallelism'
$plan = Get-Content -LiteralPath (Join-Path $root 'plan.json') -Raw | ConvertFrom-Json
$accepted = Get-Content -LiteralPath (Join-Path $root 'accepted-images.json') -Raw | ConvertFrom-Json
$image = $accepted.images.$Role.$Variant
$runtime = $accepted.runtimeInputs.$Role
$leasePath = Join-Path $parallel 'benchmark-exclusive.lease.json'
if ($env:AUTOPERF_BENCHMARK_LEASE_PATH -cne $leasePath)
{
    throw 'Only the actual exclusive benchmark gateway may start a measured process.'
}
$lease = Get-Content -LiteralPath $leasePath -Raw | ConvertFrom-Json
$driverPath = Join-Path $session 'F140-compare-027.mjs'
if ($lease.findingId -cne 'F140' -or $lease.purpose -cne 'benchmark' -or
    $lease.token -cne $env:AUTOPERF_BENCHMARK_LEASE_TOKEN -or
    $lease.arguments.Count -ne 3 -or $lease.arguments[0] -cne $driverPath -or
    $lease.arguments[1] -cne 'F140' -or $lease.arguments[2] -cne $Role)
{
    throw 'The benchmark lease does not authorize this driver and source role.'
}
$self = Get-CimInstance Win32_Process -Filter "ProcessId = $PID"
$driver = Get-CimInstance Win32_Process -Filter "ProcessId = $($self.ParentProcessId)"
$gate = Get-CimInstance Win32_Process -Filter "ProcessId = $($lease.gatePid)"
if ($driver.ProcessId -ne [int]$env:AUTOPERF_GATE_DRIVER_PID -or $driver.ParentProcessId -ne $lease.gatePid -or
    -not $driver.CommandLine.Contains($driverPath) -or $gate.ExecutablePath -ine $plan.powershell -or
    [Math]::Abs(($gate.CreationDate.ToUniversalTime() - [DateTimeOffset]::Parse($lease.gateStartedAt).UtcDateTime).TotalMilliseconds) -ge 1)
{
    throw 'The actual native ancestry or gateway process-creation identity differs.'
}
function Assert-Inventory([string] $Directory, $Entries)
{
    if (@(Get-ChildItem -LiteralPath $Directory -File -Recurse).Count -ne $Entries.Count)
    {
        throw "The selected file set changed: $Directory"
    }
    foreach ($entry in $Entries)
    {
        $file = Join-Path $Directory $entry.file
        if ((Get-Item -LiteralPath $file).Length -ne $entry.bytes -or
            (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -cne $entry.sha256)
        {
            throw "A selected file changed: $file"
        }
    }
}
$execution = Join-Path $root "executions\$Label"
if (Test-Path -LiteralPath $execution)
{
    throw 'Refusing to overwrite an actual measured execution.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
$record = [ordered]@{
    role = $Role; variant = $Variant; pair = $Pair; label = $Label
    recordedAt = [DateTime]::UtcNow.ToString('o')
    actualPerformanceMeasurement = $true; actualMachine = $env:COMPUTERNAME
    actualNativePid = $null; actualNativeExitCode = $null; actualNativeTerminal = $false
    actualStdoutCompletelyDrained = $false; actualStderrCompletelyDrained = $false
    actualObservedDescendants = @(); actualExhaustiveProcessCensusClaimed = $false
    actualDescendantObservationBoundary = 'Direct exec consumer has no child-launching code; one post-root child snapshot only, no polling or hashing during counters and no historical census claim.'
    outcome = 'pending'; failure = $null
}
$recordPath = Join-Path $execution 'result.json'
function Save-Record
{
    $record | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $recordPath -Encoding utf8
}
Save-Record
try
{
    Assert-Inventory $image.directory $image.files
    Assert-Inventory $accepted.common.directory $accepted.common.files
    Assert-Inventory $runtime.directory $runtime.files
    Set-Location -LiteralPath $plan.roles.$Role.graph
    $env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
    $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
    $env:MSBUILDDISABLENODEREUSE = '1'
    . .\activate.ps1
    $info = [Diagnostics.ProcessStartInfo]::new((Join-Path $plan.roles.$Role.graph '.dotnet\dotnet.exe'))
    $info.WorkingDirectory = $plan.roles.$Role.graph
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.Environment.Remove('DOTNET_STARTUP_HOOKS') | Out-Null
    $info.Environment.Remove('AUTOPERF_IDENTITY_DIR') | Out-Null
    $info.Environment['AUTOPERF_F140_GATE_ADMITTED'] = '1'
    $info.Environment['DOTNET_TieredCompilation'] = '0'
    $info.Environment['DOTNET_ROLL_FORWARD'] = 'Disable'
    $measurement = Join-Path $execution 'measurement.json'
    $arguments = @('exec', '--fx-version', $runtime.version,
        (Join-Path $accepted.common.directory 'AutoPerf.SignalR.Probe.dll'),
        'measure', $Role, $image.directory, $measurement, [string]$Pair)
    foreach ($argument in $arguments)
    {
        $info.ArgumentList.Add($argument)
    }
    $record.actualExecutable = $info.FileName
    $record.actualArguments = $arguments
    $record.actualWorkingDirectory = $info.WorkingDirectory
    $record.actualGatewayAncestryVerified = $true
    $record.actualNoIdentityHookDuringCounters = $true
    $process = [Diagnostics.Process]::Start($info)
    $record.actualNativePid = $process.Id
    $record.actualNativeStartedAt = $process.StartTime.ToUniversalTime().ToString('o')
    Save-Record
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    $record.actualNativeExitCode = $process.ExitCode
    $record.actualNativeTerminal = $process.HasExited
    $nativeExitedAt = $process.ExitTime.ToUniversalTime()
    $record.actualNativeCompletedAt = $nativeExitedAt.ToString('o')
    [IO.File]::WriteAllText((Join-Path $execution 'native.stdout.txt'), $stdoutTask.GetAwaiter().GetResult())
    [IO.File]::WriteAllText((Join-Path $execution 'native.stderr.txt'), $stderrTask.GetAwaiter().GetResult())
    $record.actualStdoutCompletelyDrained = $stdoutTask.IsCompletedSuccessfully
    $record.actualStderrCompletelyDrained = $stderrTask.IsCompletedSuccessfully
    foreach ($child in @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $($record.actualNativePid)"))
    {
        if ($child.CreationDate.ToUniversalTime() -lt [DateTimeOffset]::Parse($record.actualNativeStartedAt).UtcDateTime -or
            $child.CreationDate.ToUniversalTime() -gt $nativeExitedAt)
        {
            continue
        }
        $current = Get-Process -Id $child.ProcessId -ErrorAction SilentlyContinue
        $same = $null -ne $current -and
            [Math]::Abs(($current.StartTime.ToUniversalTime() - $child.CreationDate.ToUniversalTime()).TotalMilliseconds) -lt 1
        if ($same -and -not $current.WaitForExit(30000))
        {
            throw "An observed owned child remains after its measured root: $($child.ProcessId)"
        }
        $record.actualObservedDescendants += @{
            pid = $child.ProcessId; createdAt = $child.CreationDate.ToUniversalTime().ToString('o')
            actualTerminal = $true; actualCreationIdentityMatched = $same
        }
    }
    if ($process.ExitCode -ne 0)
    {
        throw "The measured public-client consumer exited $($process.ExitCode)."
    }
    $record.actualMeasurement = Get-Content -LiteralPath $measurement -Raw | ConvertFrom-Json
    $record.actualMeasurementFile = $measurement
    $record.actualMeasurementSha256 = (Get-FileHash -LiteralPath $measurement -Algorithm SHA256).Hash
    Assert-Inventory $image.directory $image.files
    Assert-Inventory $accepted.common.directory $accepted.common.files
    Assert-Inventory $runtime.directory $runtime.files
    $record.outcome = 'pass'
    $process.Dispose()
}
catch
{
    $record.outcome = 'failed'
    $record.failure = $_.Exception.ToString()
    throw
}
finally
{
    $record.completedAt = [DateTime]::UtcNow.ToString('o')
    Save-Record
}
$record | ConvertTo-Json -Depth 30
