param(
    [string] $RequestPath,
    [switch] $Status
)

$ErrorActionPreference = 'Stop'
$directory = $PSScriptRoot
$policyPath = Join-Path $directory 'policy.json'
$leasePath = Join-Path $directory 'benchmark-exclusive.lease.json'
$eventsPath = Join-Path $directory 'benchmark-gate-events.jsonl'
$mutexName = 'Global\AspNetCore.AutoPerf.ExclusiveBenchmark.v1'

function Write-GateEvent([hashtable] $Entry)
{
    $Entry['recordedAt'] = [DateTime]::UtcNow.ToString('O')
    [IO.File]::AppendAllText($eventsPath, ($Entry | ConvertTo-Json -Compress -Depth 8) + "`n")
}

function Get-RecognizedBenchmarkProcesses
{
    @(
        Get-CimInstance Win32_Process |
            Where-Object {
                $_.Name -match '^(dotnet|node|corerun|BenchmarkDotNet.*)\.exe$' -and
                $_.CommandLine -match '(?i)(AutoPerf[.\\]|BenchmarkDotNet|F[0-9]{3}-(compare|benchmark)|[ .]measure[ .])'
            } |
            Select-Object ProcessId, ParentProcessId, Name, CreationDate, CommandLine
    )
}

if ($Status)
{
    $lease = if (Test-Path -LiteralPath $leasePath) { Get-Content -LiteralPath $leasePath -Raw | ConvertFrom-Json } else { $null }
    @{
        mutexName = $mutexName
        persistentLeasePresent = $null -ne $lease
        lease = $lease
        recognizedBenchmarkProcesses = @(Get-RecognizedBenchmarkProcesses)
        automaticStaleLeaseRecovery = $false
    } | ConvertTo-Json -Depth 8
    exit 0
}

if ([string]::IsNullOrWhiteSpace($RequestPath))
{
    throw 'A sealed coordinator request is required.'
}
$policy = Get-Content -LiteralPath $policyPath -Raw | ConvertFrom-Json
$request = Get-Content -LiteralPath $RequestPath -Raw | ConvertFrom-Json
$node = (Get-Command node -CommandType Application).Source
if ($request.purpose -eq 'gate-self-test')
{
    $childScript = Join-Path $directory 'guard-test-child.mjs'
    if ($request.executable -ne $node -or $request.arguments.Count -ne 3 -or
        $request.arguments[0] -ne $childScript -or
        (Get-FileHash -LiteralPath $childScript -Algorithm SHA256).Hash -ne $policy.selfTestChildSha256)
    {
        throw 'Only the pinned, non-measuring guard fixture is allowed for gate self-tests.'
    }
}
elseif ($request.purpose -eq 'benchmark')
{
    if ($request.findingId -notmatch '^F[0-9]{3}$' -or $request.arguments.Count -lt 1)
    {
        throw 'Invalid benchmark finding or driver.'
    }
    $approved = @($policy.approvedBenchmarkDrivers | Where-Object {
        $_.findingId -eq $request.findingId -and $_.path -eq $request.arguments[0]
    })
    if ($approved.Count -ne 1 -or $request.executable -ne $node -or
        (Get-FileHash -LiteralPath $approved[0].path -Algorithm SHA256).Hash -ne $approved[0].sha256 -or
        $approved[0].awaitsAllChildren -ne $true)
    {
        throw 'The coordinator must review and pin a child-awaiting driver before any benchmark can run.'
    }
    $caseRoot = Join-Path $policy.runsRoot $request.findingId
    $budget = Get-Content -LiteralPath (Join-Path $caseRoot 'diagnostic-budget.json') -Raw | ConvertFrom-Json
    $seal = Get-Content -LiteralPath (Join-Path $caseRoot 'plan-seal.json') -Raw | ConvertFrom-Json
    if ($budget.closed -ne $false -or @($budget.authorizations).Count -ge 3 -or
        (Get-FileHash -LiteralPath (Join-Path $caseRoot 'plan.json') -Algorithm SHA256).Hash -ne $seal.sha256)
    {
        throw 'The finding budget is closed/exhausted or its acceptance plan is not sealed.'
    }
    if ($policy.buildAndTestWorkQuiesced -ne $true)
    {
        throw 'Coordinator build/test work must be quiesced before timing.'
    }
}
else
{
    throw 'Unknown operation. Workers cannot obtain a timing slot.'
}

$mutex = [Threading.Mutex]::new($false, $mutexName)
$acquired = $false
$lease = $null
$completedSuccessfully = $false
$token = [Guid]::NewGuid().ToString()
$exitCode = 74
try
{
    try
    {
        $acquired = $mutex.WaitOne(0)
    }
    catch [Threading.AbandonedMutexException]
    {
        $acquired = $true
        throw 'An earlier benchmark gate was abandoned. Refusing automatic recovery; inspect the persistent lease and owned processes.'
    }
    if (-not $acquired)
    {
        Write-GateEvent @{ event = 'denied-busy'; purpose = $request.purpose; requestPath = $RequestPath; gatePid = $PID }
        Write-Output '{"acquired":false,"reason":"Another operation owns the single benchmark slot."}'
        $exitCode = 73
    }
    else
    {
        if (Test-Path -LiteralPath $leasePath)
        {
            throw 'An existing benchmark lease requires explicit owner/process review; it is never automatically removed.'
        }
        $alreadyRunning = @(Get-RecognizedBenchmarkProcesses)
        if ($alreadyRunning.Count -ne 0)
        {
            throw ('Recognized benchmark/AutoPerf processes are already running: ' + ($alreadyRunning.ProcessId -join ', '))
        }
        $lease = [IO.File]::Open($leasePath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
        $owner = @{
            token = $token
            purpose = $request.purpose
            findingId = $request.findingId
            gatePid = $PID
            gateStartedAt = (Get-Process -Id $PID).StartTime.ToUniversalTime().ToString('O')
            requestPath = [IO.Path]::GetFullPath($RequestPath)
            executable = $request.executable
            arguments = @($request.arguments)
            mutexName = $mutexName
        }
        $bytes = [Text.Encoding]::UTF8.GetBytes(($owner | ConvertTo-Json -Depth 8) + "`n")
        $lease.Write($bytes, 0, $bytes.Length)
        $lease.Flush($true)
        $lease.Dispose()
        $lease = [IO.File]::Open($leasePath, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
        Write-GateEvent @{ event = 'acquired'; purpose = $request.purpose; findingId = $request.findingId; token = $token; gatePid = $PID }
        $start = [Diagnostics.ProcessStartInfo]::new()
        $start.FileName = $request.executable
        $start.WorkingDirectory = $request.workingDirectory
        $start.UseShellExecute = $false
        $start.CreateNoWindow = $true
        $start.RedirectStandardOutput = $true
        $start.RedirectStandardError = $true
        foreach ($argument in $request.arguments)
        {
            $start.ArgumentList.Add([string] $argument)
        }
        $child = [Diagnostics.Process]::Start($start)
        Write-GateEvent @{ event = 'child-started'; purpose = $request.purpose; token = $token; gatePid = $PID; childPid = $child.Id }
        $stdout = $child.StandardOutput.ReadToEndAsync()
        $stderr = $child.StandardError.ReadToEndAsync()
        $child.WaitForExit()
        [Console]::Out.Write($stdout.GetAwaiter().GetResult())
        [Console]::Error.Write($stderr.GetAwaiter().GetResult())
        $exitCode = $child.ExitCode
        if ($exitCode -eq 0)
        {
            $remaining = @(Get-RecognizedBenchmarkProcesses)
            if ($remaining.Count -ne 0)
            {
                throw ('Recognized benchmark processes remain after driver exit: ' + ($remaining.ProcessId -join ', '))
            }
            $completedSuccessfully = $true
        }
        Write-GateEvent @{ event = 'child-ended'; purpose = $request.purpose; token = $token; actualExitCode = $exitCode; leaseMayRelease = $completedSuccessfully }
        $child.Dispose()
    }
}
catch
{
    Write-GateEvent @{ event = 'failed-closed'; purpose = $request.purpose; gatePid = $PID; token = $token; message = $_.Exception.Message }
    [Console]::Error.WriteLine($_.Exception.Message)
    $exitCode = 74
}
finally
{
    if ($null -ne $lease)
    {
        $lease.Dispose()
        if ($completedSuccessfully)
        {
            $actualOwner = Get-Content -LiteralPath $leasePath -Raw | ConvertFrom-Json
            if ($actualOwner.token -ne $token)
            {
                throw 'Lease identity changed; refusing removal.'
            }
            Remove-Item -LiteralPath $leasePath
            Write-GateEvent @{ event = 'released'; purpose = $request.purpose; token = $token; gatePid = $PID }
        }
    }
    if ($acquired)
    {
        $mutex.ReleaseMutex()
    }
    $mutex.Dispose()
}
exit $exitCode
