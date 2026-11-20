param(
    [Parameter(Mandatory)][ValidateSet('original', 'default')][string]$Role,
    [Parameter(Mandatory)][ValidateSet('baseline', 'candidate')][string]$Variant,
    [Parameter(Mandatory)][ValidateSet('Verify', 'Measure')][string]$Mode,
    [Parameter(Mandatory)][ValidatePattern('^[A-Za-z0-9-]+$')][string]$Label
)

$ErrorActionPreference = 'Stop'
$session = Split-Path $PSCommandPath -Parent
$root = Join-Path $session 'autoperf-runs\F145'
$plan = Get-Content -LiteralPath (Join-Path $root 'plan.json') -Raw | ConvertFrom-Json
$accepted = Get-Content -LiteralPath (Join-Path $root 'accepted-images.json') -Raw | ConvertFrom-Json
$inputRole = $plan.sourceRoles.$Role
$image = $accepted.images.$Role.$Variant
$leasePath = Join-Path $session 'autoperf-parallelism\benchmark-exclusive.lease.json'
if ($Mode -eq 'Measure')
{
    if ($env:AUTOPERF_BENCHMARK_LEASE_PATH -ne $leasePath -or -not (Test-Path -LiteralPath $leasePath))
    {
        throw 'Measurement requires the actual exclusive gateway lease.'
    }
    $lease = Get-Content -LiteralPath $leasePath -Raw | ConvertFrom-Json
    if ($lease.findingId -ne 'F145' -or $lease.purpose -ne 'benchmark' -or
        $lease.token -ne $env:AUTOPERF_BENCHMARK_LEASE_TOKEN -or
        $lease.arguments[0] -ne (Join-Path $session 'F145-compare-008.mjs'))
    {
        throw 'Wrong benchmark lease, driver or native token.'
    }
}
elseif (Test-Path -LiteralPath $leasePath)
{
    throw 'Untimed functional work cannot overlap an active benchmark lease.'
}
foreach ($file in $image.files)
{
    $name = Join-Path $image.imagePath $file.file
    if ((Get-Item -LiteralPath $name).Length -ne $file.bytes -or (Get-FileHash -LiteralPath $name -Algorithm SHA256).Hash -ne $file.sha256)
    {
        throw "Selected image changed: $name"
    }
}
foreach ($file in $accepted.images.$Role.runtimeInputs)
{
    if ((Get-FileHash -LiteralPath $file.file -Algorithm SHA256).Hash -ne $file.sha256)
    {
        throw 'Selected runtime changed.'
    }
}
$execution = Join-Path $root "executions\$Label"
if (Test-Path -LiteralPath $execution)
{
    throw 'Refusing to overwrite an execution.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
$endpointFiles = Join-Path $execution 'endpoint-files'
$clientScratch = Join-Path $execution 'client-scratch'
New-Item -ItemType Directory -Path $endpointFiles, $clientScratch | Out-Null
$record = [ordered]@{
    role = $Role; variant = $Variant; mode = $Mode; label = $Label
    image = $image.imagePath; recordedAt = [DateTime]::UtcNow.ToString('O')
    expectedRuntime = $inputRole.exactRuntime; actualPerformanceTiming = ($Mode -eq 'Measure')
    nativeChildren = @(); hostPid = $null; hostTerminal = $false; hostExit = $null
    outcome = 'pending'; failure = $null
}
$recordPath = Join-Path $execution 'result.json'
$record | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $recordPath -Encoding utf8
$environment = @{
    DOTNET_ROOT = $inputRole.runtimeRoot
    DOTNET_ROOT_X64 = $inputRole.runtimeRoot
    DOTNET_HOST_PATH = Join-Path $inputRole.runtimeRoot 'dotnet.exe'
    DOTNET_ROLL_FORWARD = 'Disable'
    DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
    DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
    MSBUILDDISABLENODEREUSE = '1'
    DOTNET_CLI_TELEMETRY_OPTOUT = '1'
    DOTNET_STARTUP_HOOKS = ''
    ASPNETCORE_HOSTINGSTARTUPASSEMBLIES = ''
    ASPNETCORE_PREVENTHOSTINGSTARTUP = 'true'
    ASPNETCORE_URLS = 'http://127.0.0.1:0'
    TEMP = $endpointFiles
    TMP = $endpointFiles
}
function Get-SelectedDotnet
{
    Set-Location -LiteralPath $inputRole.checkout
    $env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
    $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
    $env:MSBUILDDISABLENODEREUSE = '1'
    . .\activate.ps1 | Out-Null

    return (Join-Path $inputRole.runtimeRoot 'dotnet.exe')
}
function New-StartInfo([string]$Executable, [string[]]$Arguments)
{
    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName = $Executable
    $start.WorkingDirectory = $image.imagePath
    $start.UseShellExecute = $false
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    foreach ($argument in $Arguments)
    {
        $start.ArgumentList.Add($argument)
    }
    foreach ($key in $environment.Keys)
    {
        $start.Environment[$key] = $environment[$key]
    }

    return $start
}
function Invoke-Client([string]$Selector)
{
    $dotnet = Get-SelectedDotnet
    $arguments = @(
        'exec', '--runtimeconfig', (Join-Path $image.imagePath 'InProcessWebSite.runtimeconfig.json'),
        '--roll-forward', 'Disable', '--depsfile', (Join-Path $image.imagePath 'F145ResponseWorkload.deps.json'),
        (Join-Path $image.imagePath 'F145ResponseWorkload.dll'),
        $(if ($Mode -eq 'Verify') { '--verify-only' } else { '--measure-once' }), $Selector, $address
    )
    $process = [Diagnostics.Process]::new()
    $start = New-StartInfo $dotnet $arguments
    $start.Environment['TEMP'] = $clientScratch
    $start.Environment['TMP'] = $clientScratch
    $process.StartInfo = $start
    $native = [ordered]@{
        selector = $Selector; executable = $dotnet; arguments = $arguments
        workingDirectory = $image.imagePath; pid = $null; terminal = $false; exitCode = $null
        actualTiming = ($Mode -eq 'Measure'); startedAt = [DateTime]::UtcNow.ToString('O')
    }
    try
    {
        if (-not $process.Start())
        {
            throw 'Client start failed.'
        }
        $native.pid = $process.Id
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit(240000))
        {
            Stop-Process -Id $process.Id -Force
            $process.WaitForExit()
            throw 'Owned client exceeded its safety deadline.'
        }
        $native.exitCode = $process.ExitCode
        $native.terminal = $true
        $out = $stdout.GetAwaiter().GetResult()
        [IO.File]::WriteAllText((Join-Path $execution "$Selector.stdout.txt"), $out)
        [IO.File]::WriteAllText((Join-Path $execution "$Selector.stderr.txt"), $stderr.GetAwaiter().GetResult())
        if ($process.ExitCode -ne 0)
        {
            throw "Client failed: $Selector"
        }
        $result = $out | ConvertFrom-Json
        $expectedLength = if ($Selector -eq 'primary') { 200000000 } else { 65000 }
        if ($result.role -ne $Selector -or $result.bodyLength -ne $expectedLength)
        {
            throw 'Compiled client did not establish the fixed workload.'
        }
        if ($Mode -eq 'Verify')
        {
            if ($result.mode -ne 'verify-only' -or -not $result.allCharactersExpected -or
                $result.runtime -ne ".NET $($inputRole.exactRuntime)" -or
                $result.PSObject.Properties.Name -contains 'elapsedTicks')
            {
                throw 'Untimed client content/runtime/mode assertion failed.'
            }
        }
        elseif ($result.elapsedTicks -le 0 -or $result.ticksPerSecond -le 0)
        {
            throw 'Compiled client did not return valid full-operation timing.'
        }

        return $result
    }
    finally
    {
        if ($native.pid -and -not $process.HasExited)
        {
            Stop-Process -Id $process.Id -Force
            $process.WaitForExit()
        }
        if ($native.pid)
        {
            $native.terminal = $process.HasExited
            $native.exitCode = $process.ExitCode
        }
        $record.nativeChildren += $native
        $process.Dispose()
    }
}
$hostProcess = [Diagnostics.Process]::new()
$control = [Net.Http.HttpClient]::new()
$control.Timeout = [TimeSpan]::FromSeconds(30)
$address = $null
$stderrTask = $null
$stdoutTail = $null
try
{
    $dotnet = Get-SelectedDotnet
    $hostArguments = @(
        'exec', '--runtimeconfig', (Join-Path $image.imagePath 'InProcessWebSite.runtimeconfig.json'),
        '--roll-forward', 'Disable', '--depsfile', (Join-Path $image.imagePath 'InProcessWebSite.deps.json'),
        (Join-Path $image.imagePath 'F145FunctionalHost.dll'), $image.imagePath, $endpointFiles,
        (Join-Path $execution 'runtime-and-files.json')
    )
    $record['hostCommand'] = @{ executable = $dotnet; arguments = $hostArguments; environment = $environment }
    $hostProcess.StartInfo = New-StartInfo $dotnet $hostArguments
    if (-not $hostProcess.Start())
    {
        throw 'Exact owner host start failed.'
    }
    $record.hostPid = $hostProcess.Id
    $stderrTask = $hostProcess.StandardError.ReadToEndAsync()
    $lineTask = $hostProcess.StandardOutput.ReadLineAsync()
    if (-not $lineTask.Wait(90000))
    {
        throw 'Host did not become ready before its safety deadline.'
    }
    $line = $lineTask.GetAwaiter().GetResult()
    [IO.File]::WriteAllText((Join-Path $execution 'host.stdout.txt'), $line + [Environment]::NewLine)
    $stdoutTail = $hostProcess.StandardOutput.ReadToEndAsync()
    $ready = $line | ConvertFrom-Json
    if ($ready.kind -ne 'ready' -or $ready.pid -ne $hostProcess.Id -or
        $ready.runtime -ne ".NET $($inputRole.exactRuntime)" -or
        $ready.startup.sha256 -ne $image.sourceAssociation.ownerSha256 -or
        $ready.serverType -notlike 'Microsoft.AspNetCore.Server.Kestrel.*')
    {
        throw 'Actual selected owner/runtime/server did not match readiness.'
    }
    $record['ready'] = $ready
    $address = $ready.address
    if ($control.GetStringAsync("$address/RequestPath/ready").GetAwaiter().GetResult() -ne '/ready')
    {
        throw 'Real Startup route readiness failed.'
    }
    if ($Mode -eq 'Verify')
    {
        $response = $control.GetAsync("$address/LargeResponseFile", [Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
        try
        {
            if ([int]$response.StatusCode -ne 200)
            {
                throw 'Actual response status differs.'
            }
            $stream = $response.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
            $sha = [Security.Cryptography.IncrementalHash]::CreateHash([Security.Cryptography.HashAlgorithmName]::SHA256)
            try
            {
                $buffer = [byte[]]::new(1048576)
                $bytes = 0L
                while (($read = $stream.ReadAsync($buffer, 0, $buffer.Length).GetAwaiter().GetResult()) -ne 0)
                {
                    $sha.AppendData($buffer, 0, $read)
                    $bytes += $read
                }
                $actualHash = [Convert]::ToHexString($sha.GetHashAndReset()).ToLowerInvariant()
                if ($bytes -ne 200000000 -or $actualHash -ne $plan.functionalAcceptance.rawSha256)
                {
                    throw 'Actual full raw-byte response differs.'
                }
                $record['rawResponse'] = @{ bytes = $bytes; sha256 = $actualHash; exactKnownAllAsciiInputHash = $true }
            }
            finally
            {
                $sha.Dispose()
                $stream.Dispose()
            }
        }
        finally
        {
            $response.Dispose()
        }
    }
    $record['primary'] = Invoke-Client 'primary'
    $record['control'] = Invoke-Client 'control'
    $record['postFileBarrier'] = $control.GetStringAsync("$address/RequestPath/after-large").GetAwaiter().GetResult()
    if ($record.postFileBarrier -ne '/after-large' -or @(Get-ChildItem -LiteralPath $endpointFiles -File).Count -ne 0)
    {
        throw 'Source endpoint did not finish its normal file disposition.'
    }
    if ($control.GetStringAsync("$address/Shutdown").GetAwaiter().GetResult() -ne 'Shutting down' -or
        -not $hostProcess.WaitForExit(45000))
    {
        throw 'Owned host did not shut down normally.'
    }
    $record.hostTerminal = $hostProcess.HasExited
    $record.hostExit = $hostProcess.ExitCode
    $facts = Get-Content -LiteralPath (Join-Path $execution 'runtime-and-files.json') -Raw | ConvertFrom-Json
    $created = @($facts.fileEvents | Where-Object kind -eq 'created' | ForEach-Object path | Sort-Object -Unique)
    $deleted = @($facts.fileEvents | Where-Object kind -eq 'deleted' | ForEach-Object path | Sort-Object -Unique)
    $expectedFiles = if ($Mode -eq 'Verify') { 2 } else { 1 }
    if ($hostProcess.ExitCode -ne 0 -or $facts.exitCode -ne 0 -or $null -ne $facts.failure -or
        $facts.endpointFilesRemaining.Count -ne 0 -or $created.Count -ne $expectedFiles -or
        $deleted.Count -ne $expectedFiles -or (Compare-Object $created $deleted) -or
        @($facts.fileEvents | Where-Object kind -eq 'watcher-error').Count -ne 0)
    {
        throw 'Actual host/file ownership or terminal outcome differs.'
    }
    $record['actualSameCreatedFilesDeleted'] = $true
    $record['actualEndpointFilesCreatedAndDeleted'] = $expectedFiles
    $record['runtimeAndFileFacts'] = 'runtime-and-files.json'
    $record.outcome = 'pass'
}
catch
{
    $record.failure = $_.Exception.ToString()
    $record.outcome = 'fail'
}
finally
{
    if ($record.hostPid -and -not $hostProcess.HasExited)
    {
        if ($address)
        {
            try
            {
                $record['cleanupShutdown'] = $control.GetStringAsync("$address/Shutdown").GetAwaiter().GetResult()
                $null = $hostProcess.WaitForExit(45000)
            }
            catch
            {
                $record['cleanupShutdownFailure'] = $_.Exception.ToString()
            }
        }
        if (-not $hostProcess.HasExited)
        {
            Stop-Process -Id $hostProcess.Id -Force
            $hostProcess.WaitForExit()
            $record['forcedOwnedHostTermination'] = $true
            $record.outcome = 'fail'
        }
    }
    if ($record.hostPid)
    {
        $record.hostTerminal = $hostProcess.HasExited
        $record.hostExit = $hostProcess.ExitCode
    }
    if ($null -ne $stdoutTail)
    {
        [IO.File]::AppendAllText((Join-Path $execution 'host.stdout.txt'), $stdoutTail.GetAwaiter().GetResult())
    }
    if ($null -ne $stderrTask)
    {
        [IO.File]::WriteAllText((Join-Path $execution 'host.stderr.txt'), $stderrTask.GetAwaiter().GetResult())
    }
    $record | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $recordPath -Encoding utf8
    $control.Dispose()
    $hostProcess.Dispose()
}
if ($record.outcome -ne 'pass')
{
    throw "F145 $Mode $Role/$Variant failed: $($record.failure)"
}
[ordered]@{ result = $recordPath; outcome = $record.outcome; actualHostTerminal = $record.hostTerminal; actualClientChildrenTerminal = @($record.nativeChildren | Where-Object terminal -ne $true).Count -eq 0; actualTiming = $record.actualPerformanceTiming } | ConvertTo-Json
