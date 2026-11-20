param(
    [Parameter(Mandatory)] [string] $Executable,
    [Parameter(Mandatory)] [string[]] $Arguments,
    [Parameter(Mandatory)] [string] $WorkingDirectory,
    [Parameter(Mandatory)] [string] $ReceiptName,
    [string] $Graph
)

$ErrorActionPreference = 'Stop'
$policyPath = Join-Path (Split-Path $PSScriptRoot) 'policy.json'
$leasePath = Join-Path (Split-Path $PSScriptRoot) 'benchmark-exclusive.lease.json'
$evidence = Join-Path $PSScriptRoot ('native\' + $ReceiptName)
New-Item -ItemType Directory -Force -Path (Split-Path $evidence) | Out-Null
if (Test-Path -LiteralPath ($evidence + '.json'))
{
    throw "Refusing to overwrite an existing native receipt: $ReceiptName"
}

function Read-Admission
{
    $policy = Get-Content -LiteralPath $policyPath -Raw | ConvertFrom-Json
    $observation = [ordered]@{
        observedAtUtc = [DateTime]::UtcNow.ToString('O')
        policySha256 = (Get-FileHash -LiteralPath $policyPath -Algorithm SHA256).Hash
        registeredOwner = $policy.independentFindingPreparationWorkers.F214
        scope = $policy.activeWorkerPreparationScopes.F214
        actualWorkerBuildHoldActive = $policy.actualWorkerBuildHoldActive
        explicitWorkerBuildHoldActive = $policy.explicitWorkerBuildHoldActive
        buildAndTestWorkQuiesced = $policy.buildAndTestWorkQuiesced
        leasePresent = (Test-Path -LiteralPath $leasePath)
    }
    $observation['allowed'] = $observation.registeredOwner -eq 'a49af7f8-9952-4ab2-bfea-f0c206589028' -and
        $observation.scope -match '195.*untimed' -and
        $policy.workersMayBuildOrTest -eq $true -and
        $observation.actualWorkerBuildHoldActive -ne $true -and
        $observation.explicitWorkerBuildHoldActive -ne $true -and
        $observation.buildAndTestWorkQuiesced -ne $true -and
        -not $observation.leasePresent
    return $observation
}

$receipt = [ordered]@{
    receiptName = $ReceiptName
    executable = $Executable
    arguments = $Arguments
    workingDirectory = $WorkingDirectory
    graphActivation = $null
    nativeStarted = $false
    comparisonAuthorizations = 0
    performanceCounters = $false
    elapsedMeasurement = $false
}
$process = $null
$observed = @{}
$stdoutTask = $null
$stderrTask = $null
try
{
    if ([IO.Path]::GetFileName($Executable) -eq 'dotnet.exe')
    {
        if ($Arguments[0] -in @('build', 'test', 'restore') -and
            (($Arguments -notcontains '-m:1' -and $Arguments -notcontains '-m:2') -or
                $Arguments -notcontains '-nr:false' -or
                $Arguments -notcontains '-p:UseSharedCompilation=false'))
        {
            throw 'Separate bounded-node, no-node-reuse, and no-shared-compilation argv entries are mandatory; concatenated properties are forbidden.'
        }

        if ($Graph -notin @('C:\src\ap-F214-o195', 'C:\src\ap-F214-d195'))
        {
            throw 'An exact private F214 graph is required before dotnet invocation.'
        }

        Set-Location $Graph
        $env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
        $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
        $env:MSBUILDDISABLENODEREUSE = '1'
        $env:DOTNET_CLI_HOME = Join-Path $Graph 'artifacts\F214\cli-home'
        $env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = '1'
        $env:DOTNET_NOLOGO = '1'
        . (Join-Path $Graph 'activate.ps1')
        $resolvedDotnet = @(Get-Command dotnet -CommandType Application)[0].Source
        if ($resolvedDotnet -ne (Join-Path $Graph '.dotnet\dotnet.exe') -or
            $Executable -ne (Join-Path $Graph '.dotnet\dotnet.exe'))
        {
            throw 'Exact graph-local dotnet resolution failed; ambient fallback is forbidden.'
        }

        $receipt.graphActivation = [ordered]@{
            script = (Join-Path $Graph 'activate.ps1')
            scriptSha256 = (Get-FileHash -LiteralPath (Join-Path $Graph 'activate.ps1') -Algorithm SHA256).Hash
            globalJsonSha256 = (Get-FileHash -LiteralPath (Join-Path $Graph 'global.json') -Algorithm SHA256).Hash
            resolvedDotnet = $resolvedDotnet
            DOTNET_GENERATE_ASPNET_CERTIFICATE = $env:DOTNET_GENERATE_ASPNET_CERTIFICATE
            DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH
            MSBUILDDISABLENODEREUSE = $env:MSBUILDDISABLENODEREUSE
            optimizationEnvironment = @(Get-ChildItem Env: | Where-Object Name -Match '^(DOTNET|COMPlus)_(Tier|Jit|ReadyToRun|GC)' | Sort-Object Name | Select-Object Name, Value)
        }
    }

    $env:GIT_OPTIONAL_LOCKS = '0'
    $startInfo = [Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $Executable
    $startInfo.WorkingDirectory = $WorkingDirectory
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.CreateNoWindow = $true
    foreach ($argument in $Arguments)
    {
        $startInfo.ArgumentList.Add($argument)
    }

    $receipt.admission = Read-Admission
    if (-not $receipt.admission.allowed)
    {
        throw 'F214 native admission denied by actual registration, scope, HOLD, or benchmark lease.'
    }

    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    if (-not $process.Start())
    {
        throw 'Native process did not start.'
    }

    $receipt.nativeStarted = $true
    $receipt.pid = $process.Id
    $receipt.startedAtUtc = $process.StartTime.ToUniversalTime().ToString('O')
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    do
    {
        $allProcesses = @(Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, CreationDate)
        $parents = @($process.Id) + @($observed.Keys)
        do
        {
            $newChildren = @($allProcesses | Where-Object { $_.ParentProcessId -in $parents -and -not $observed.ContainsKey([int]$_.ProcessId) })
            foreach ($child in $newChildren)
            {
                $observed[[int]$child.ProcessId] = $child
            }
            $parents = @($process.Id) + @($observed.Keys)
        } while ($newChildren.Count -gt 0)

        $current = Read-Admission
        if (-not $current.allowed)
        {
            $receipt.holdObserved = $current
            foreach ($child in @($observed.Values))
            {
                $live = Get-CimInstance Win32_Process -Filter "ProcessId=$($child.ProcessId)"
                if ($live -and $live.CreationDate.ToUniversalTime() -eq $child.CreationDate.ToUniversalTime())
                {
                    Stop-Process -Id $live.ProcessId -Force
                }
            }
            if (-not $process.HasExited)
            {
                Stop-Process -Id $process.Id -Force
            }
        }
    } while (-not $process.WaitForExit(500))

    $process.WaitForExit()
    [IO.File]::WriteAllText(($evidence + '.stdout.txt'), $stdoutTask.GetAwaiter().GetResult(), [Text.UTF8Encoding]::new($false))
    [IO.File]::WriteAllText(($evidence + '.stderr.txt'), $stderrTask.GetAwaiter().GetResult(), [Text.UTF8Encoding]::new($false))
    $receipt.exitCode = $process.ExitCode
    $receipt.rootTerminal = $process.HasExited
    $receipt.stdoutTerminal = $stdoutTask.IsCompleted
    $receipt.stderrTerminal = $stderrTask.IsCompleted
    $receipt.observedChildren = @($observed.Values)
    $receipt.liveObservedChildren = @($observed.Values | Where-Object {
        $live = Get-CimInstance Win32_Process -Filter "ProcessId=$($_.ProcessId)"
        $live -and $live.CreationDate.ToUniversalTime() -eq $_.CreationDate.ToUniversalTime()
    })
    if ($receipt.liveObservedChildren.Count -ne 0)
    {
        throw 'An observed child remains live after root exit; no clean-terminal claim is allowed.'
    }
}
catch
{
    $receipt.error = $_.Exception.Message
    throw
}
finally
{
    $receipt.recordedAtUtc = [DateTime]::UtcNow.ToString('O')
    $receipt | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath ($evidence + '.json') -Encoding utf8
}

Write-Output ("F214 " + $ReceiptName + " EXIT=" + $receipt.exitCode + " PID=" + $receipt.pid)
if ($receipt.exitCode -ne 0)
{
    Get-Content -LiteralPath ($evidence + '.stderr.txt')
    Get-Content -LiteralPath ($evidence + '.stdout.txt') | Select-Object -Last 35
    throw "Native command failed; receipt preserved: $ReceiptName"
}
