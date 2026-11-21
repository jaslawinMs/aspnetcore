param(
    [Parameter(Mandatory)][string]$Graph,
    [Parameter(Mandatory)][string]$RecordName,
    [Parameter(Mandatory)][string[]]$DotnetArguments,
    [string]$ApplicationRuntimeRoot
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (Test-Path -LiteralPath $RecordName)
{
    throw "Refusing to overwrite $RecordName"
}
$recordDirectory = (New-Item -ItemType Directory -Path $RecordName).FullName
$parallel = Split-Path $PSScriptRoot
$policyPath = Join-Path $parallel 'policy.json'
$leasePath = Join-Path $parallel 'benchmark-exclusive.lease.json'
$record = [ordered]@{
    finding = 'F208'
    graph = $Graph
    arguments = $DotnetArguments
    recordedAtUtc = [DateTime]::UtcNow.ToString('o')
    nativeStarted = $false
    exitCode = $null
    root = $null
    observedChildren = @()
    stdoutTerminal = $false
    stderrTerminal = $false
    performanceAuthorizations = 0
}
$owned = @{}
$process = $null

function Observe-Children
{
    $parents = @($process.Id) + @($owned.Keys)
    foreach ($parentId in $parents)
    {
        foreach ($child in @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$parentId" -Property ProcessId, ParentProcessId, CreationDate, Name, CommandLine))
        {
            $owned[[int]$child.ProcessId] = [ordered]@{
                pid = [int]$child.ProcessId
                parentPid = [int]$child.ParentProcessId
                createdAtUtc = $child.CreationDate.ToUniversalTime().ToString('o')
                name = $child.Name
                commandLine = $child.CommandLine
                terminal = $false
            }
        }
    }
}

try
{
    $policyText = Get-Content -Raw -LiteralPath $policyPath
    $policy = $policyText | ConvertFrom-Json
    if ($policy.independentFindingPreparationWorkers.F208 -ne '29622a0c-13a4-4021-af23-9d5e8e80b820' -or
        $policy.activeWorkerPreparationScopes.F208 -notmatch 'untimed native builds/tests authorized' -or
        -not $policy.workersMayBuildOrTest -or $policy.actualWorkerBuildHoldActive -or
        $policy.explicitWorkerBuildHoldActive -or (Test-Path -LiteralPath $leasePath) -or
        (Test-Path -LiteralPath (Join-Path $parallel 'HOLD')))
    {
        throw 'F208 native admission blocked by actual policy, lease, or HOLD.'
    }
    $record.admission = [ordered]@{
        checkedAtUtc = [DateTime]::UtcNow.ToString('o')
        policySha256 = (Get-FileHash -LiteralPath $policyPath -Algorithm SHA256).Hash
        scope = $policy.activeWorkerPreparationScopes.F208
        actualBenchmarkLeasePresent = $false
        actualWorkerBuildHoldActive = $false
    }
    $policyText | Set-Content -LiteralPath (Join-Path $recordDirectory 'policy-snapshot.json') -Encoding utf8

    $env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
    $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
    $env:MSBUILDDISABLENODEREUSE = '1'
    $env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
    $env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = '1'
    $env:DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE = 'true'
    $scratch = (New-Item -ItemType Directory -Path (Join-Path $recordDirectory 'scratch')).FullName
    $env:TEMP = $scratch
    $env:TMP = $scratch
    Set-Location $Graph
    . .\activate.ps1
    $env:DOTNET_ROOT_X64 = $env:DOTNET_ROOT
    if ($ApplicationRuntimeRoot)
    {
        $runtimeManifestPath = Join-Path $PSScriptRoot 'cached-default-runtime.json'
        $runtimeManifest = Get-Content -Raw -LiteralPath $runtimeManifestPath | ConvertFrom-Json
        if ($runtimeManifest.runtimeRoot -ne $ApplicationRuntimeRoot)
        {
            throw 'Unexpected application runtime root.'
        }
        foreach ($file in $runtimeManifest.files)
        {
            if ((Get-FileHash -LiteralPath (Join-Path $ApplicationRuntimeRoot $file.path) -Algorithm SHA256).Hash -ne $file.sha256)
            {
                throw "Cached runtime file differs: $($file.path)"
            }
        }
        $env:DOTNET_ROOT_X64 = $ApplicationRuntimeRoot
        $record.applicationRuntime = [ordered]@{
            runtimeRoot = $ApplicationRuntimeRoot
            version = $runtimeManifest.version
            manifestSha256 = (Get-FileHash -LiteralPath $runtimeManifestPath -Algorithm SHA256).Hash
        }
    }
    $sdk = (Get-Content -Raw .\global.json | ConvertFrom-Json).sdk.version
    $hostPath = Join-Path $Graph '.dotnet\dotnet.exe'
    if ((Get-Command dotnet).Source -ne $hostPath -or
        -not (Test-Path -LiteralPath (Join-Path $Graph ".dotnet\sdk\$sdk\dotnet.dll")))
    {
        throw 'Exact graph SDK is unavailable; ambient fallback is forbidden.'
    }
    $record.sdk = $sdk
    $record.hostPath = $hostPath
    $record.hostSha256 = (Get-FileHash -LiteralPath $hostPath -Algorithm SHA256).Hash
    $record.runnerSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
    $record.sourceInputs = @(
        'src\Middleware\Spa\SpaServices.Extensions\src\Npm\NodeScriptRunner.cs',
        'src\Middleware\Spa\SpaServices.Extensions\test\NodeScriptRunnerTests.cs',
        'src\Middleware\Spa\SpaServices.Extensions\test\Microsoft.AspNetCore.SpaServices.Extensions.Tests.csproj',
        'src\Middleware\Spa\SpaServices.Extensions\testassets\NodeScriptRunner\run'
    ) | ForEach-Object {
        $file = Join-Path $Graph $_
        if (Test-Path -LiteralPath $file)
        {
            [ordered]@{path=$_; sha256=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash}
        }
    }
    $record.environment = [ordered]@{
        DOTNET_GENERATE_ASPNET_CERTIFICATE = $env:DOTNET_GENERATE_ASPNET_CERTIFICATE
        DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH
        MSBUILDDISABLENODEREUSE = $env:MSBUILDDISABLENODEREUSE
        DOTNET_ROOT = $env:DOTNET_ROOT
        DOTNET_ROOT_X64 = $env:DOTNET_ROOT_X64
        TEMP = $env:TEMP
        TMP = $env:TMP
    }
    $info = [Diagnostics.ProcessStartInfo]::new($hostPath)
    $info.WorkingDirectory = $Graph
    $info.UseShellExecute = $false
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    foreach ($argument in $DotnetArguments)
    {
        $info.ArgumentList.Add($argument)
    }
    $process = [Diagnostics.Process]::Start($info)
    $record.nativeStarted = $true
    $record.root = [ordered]@{pid=$process.Id; createdAtUtc=$process.StartTime.ToUniversalTime().ToString('o'); terminal=$false}
    $stdout = $process.StandardOutput.ReadToEndAsync()
    $stderr = $process.StandardError.ReadToEndAsync()
    $attempt = 0
    while (-not $process.WaitForExit(1000))
    {
        Observe-Children
        $attempt++
        if ($attempt -ge 900)
        {
            Stop-Process -Id $process.Id -Force
            throw 'Bounded native root exceeded its correctness timeout.'
        }
    }
    Observe-Children
    $record.root.terminal = $true
    $record.exitCode = $process.ExitCode
    $stdout.GetAwaiter().GetResult() | Set-Content -LiteralPath (Join-Path $recordDirectory 'stdout.txt') -Encoding utf8
    $stderr.GetAwaiter().GetResult() | Set-Content -LiteralPath (Join-Path $recordDirectory 'stderr.txt') -Encoding utf8
    $record.stdoutTerminal = $true
    $record.stderrTerminal = $true
    foreach ($child in $owned.Values)
    {
        $identity = Get-CimInstance Win32_Process -Filter "ProcessId=$($child.pid)" -Property ProcessId, CreationDate
        if ($null -ne $identity -and $identity.CreationDate.ToUniversalTime().ToString('o') -eq $child.createdAtUtc)
        {
            $candidate = Get-Process -Id $child.pid
            if (-not $candidate.WaitForExit(30000))
            {
                Stop-Process -Id $child.pid -Force
                $candidate.WaitForExit()
                $child.stoppedOwnedProcess = $true
            }
            $candidate.Dispose()
        }
        $child.terminal = $true
    }
    $record.observedChildren = @($owned.Values)
    $record.allObservedOwnedNativeTerminal = $true
}
catch
{
    $record.failure = $_.Exception.ToString()
    if ($null -ne $process)
    {
        if (-not $process.HasExited)
        {
            Stop-Process -Id $process.Id -Force
            $process.WaitForExit()
        }
        $record.root.terminal = $true
        foreach ($child in $owned.Values)
        {
            $identity = Get-CimInstance Win32_Process -Filter "ProcessId=$($child.pid)" -Property ProcessId, CreationDate
            if ($null -ne $identity -and $identity.CreationDate.ToUniversalTime().ToString('o') -eq $child.createdAtUtc)
            {
                Stop-Process -Id $child.pid -Force
                $remaining = Get-Process -Id $child.pid -ErrorAction SilentlyContinue
                if ($null -ne $remaining)
                {
                    $remaining.WaitForExit()
                    $remaining.Dispose()
                }
            }
            $child.terminal = $true
        }
        if ($null -ne $stdout)
        {
            $stdout.GetAwaiter().GetResult() | Set-Content -LiteralPath (Join-Path $recordDirectory 'stdout.txt') -Encoding utf8
            $record.stdoutTerminal = $true
        }
        if ($null -ne $stderr)
        {
            $stderr.GetAwaiter().GetResult() | Set-Content -LiteralPath (Join-Path $recordDirectory 'stderr.txt') -Encoding utf8
            $record.stderrTerminal = $true
        }
        $record.observedChildren = @($owned.Values)
        $record.allObservedOwnedNativeTerminal = $true
    }
}
finally
{
    if ($null -ne $process)
    {
        $process.Dispose()
    }
    $record.terminalRecordedAtUtc = [DateTime]::UtcNow.ToString('o')
    $record | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $recordDirectory 'record.json') -Encoding utf8
}

[ordered]@{
    record = (Join-Path $recordDirectory 'record.json')
    exitCode = $record.exitCode
    nativeStarted = $record.nativeStarted
    root = $record.root
    observedChildCount = $record.observedChildren.Count
    allObservedOwnedNativeTerminal = $record.allObservedOwnedNativeTerminal
    stdoutTerminal = $record.stdoutTerminal
    stderrTerminal = $record.stderrTerminal
    failure = $record.failure
} | ConvertTo-Json -Depth 4
if ($record.Contains('failure'))
{
    exit 97
}
exit $record.exitCode
