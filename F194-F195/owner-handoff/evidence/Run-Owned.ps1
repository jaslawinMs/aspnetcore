param(
    [Parameter(Mandatory)][string]$Id,
    [Parameter(Mandatory)][string]$Graph,
    [Parameter(Mandatory)][string]$Command,
    [hashtable]$ExtraEnvironment = @{}
)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$attempt = Join-Path $root "attempts\$Id"
if (Test-Path -LiteralPath $attempt)
{
    throw "Attempt already exists: $Id"
}
New-Item -ItemType Directory -Path $attempt -Force | Out-Null
$prefix = @'
$ErrorActionPreference = 'Stop'
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = '1'
$env:DOTNET_NOLOGO = '1'
'@
$prefix += "`r`nSet-Location -LiteralPath '$($Graph.Replace("'", "''"))'`r`n. .\activate.ps1`r`n"
$prefix += "`$env:DOTNET_CLI_HOME = '$($root.Replace("'", "''"))\cli-home'`r`n"
foreach ($key in $ExtraEnvironment.Keys)
{
    $prefix += "`$env:$key = '$($ExtraEnvironment[$key].Replace("'", "''"))'`r`n"
}
$script = $prefix + $Command + "`r`nexit `$LASTEXITCODE`r`n"
$scriptPath = Join-Path $attempt 'command.ps1'
[IO.File]::WriteAllText($scriptPath, $script)
$psi = [Diagnostics.ProcessStartInfo]::new()
$psi.FileName = (Get-Process -Id $PID).Path
$psi.ArgumentList.Add('-NoLogo')
$psi.ArgumentList.Add('-NoProfile')
$psi.ArgumentList.Add('-File')
$psi.ArgumentList.Add($scriptPath)
$psi.WorkingDirectory = $Graph
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$process = [Diagnostics.Process]::new()
$process.StartInfo = $psi
$startedAt = [DateTime]::UtcNow.ToString('o')
$null = $process.Start()
$rootIdentity = [ordered]@{
    pid = $process.Id
    creationUtc = $process.StartTime.ToUniversalTime().ToString('o')
    creationTicks = $process.StartTime.ToUniversalTime().Ticks.ToString()
}
$outTask = $process.StandardOutput.ReadToEndAsync()
$errTask = $process.StandardError.ReadToEndAsync()
$observed = @{}
$samplingErrors = [Collections.Generic.List[string]]::new()
do
{
    try
    {
        $all = @(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,CreationDate,Name,ExecutablePath,CommandLine)
        $known = @([int]$rootIdentity.pid)
        $changed = $true
        while ($changed)
        {
            $changed = $false
            foreach ($child in $all)
            {
                if (($known -contains [int]$child.ParentProcessId) -and ($known -notcontains [int]$child.ProcessId))
                {
                    $known += [int]$child.ProcessId
                    $changed = $true
                    if ($null -eq $child.CreationDate)
                    {
                        $samplingErrors.Add("Missing creation identity for observed PID $($child.ProcessId)")
                        continue
                    }
                    $created = $child.CreationDate.ToUniversalTime()
                    $identity = "$($child.ProcessId):$($created.Ticks)"
                    if (-not $observed.ContainsKey($identity))
                    {
                        $observed[$identity] = [ordered]@{
                            pid = [int]$child.ProcessId
                            parentPid = [int]$child.ParentProcessId
                            creationUtc = $created.ToString('o')
                            creationTicks = $created.Ticks.ToString()
                            executablePath = $child.ExecutablePath
                            commandLine = $child.CommandLine
                            firstObservedUtc = [DateTime]::UtcNow.ToString('o')
                        }
                    }
                }
            }
        }
    }
    catch
    {
        $samplingErrors.Add($_.Exception.Message)
    }
    $null = $process.WaitForExit(600)
}
while (-not $process.HasExited)
$process.WaitForExit()
$stdout = $outTask.GetAwaiter().GetResult()
$stderr = $errTask.GetAwaiter().GetResult()
[IO.File]::WriteAllText((Join-Path $attempt 'stdout.txt'), $stdout)
[IO.File]::WriteAllText((Join-Path $attempt 'stderr.txt'), $stderr)
$checks = @()
foreach ($child in $observed.Values)
{
    $current = Get-CimInstance Win32_Process -Filter "ProcessId=$($child.pid)" -Property ProcessId,CreationDate -ErrorAction SilentlyContinue
    $state = if ($null -eq $current)
    {
        'pid-absent'
    }
    elseif ($null -eq $current.CreationDate)
    {
        'identity-unavailable'
    }
    elseif ($current.CreationDate.ToUniversalTime().Ticks.ToString() -ne $child.creationTicks)
    {
        'pid-reused-original-identity-absent'
    }
    else
    {
        'same-identity-still-observed'
    }
    $checks += [ordered]@{
        observed = $child
        checkedUtc = [DateTime]::UtcNow.ToString('o')
        state = $state
        currentCreationUtc = if ($null -ne $current -and $null -ne $current.CreationDate) { $current.CreationDate.ToUniversalTime().ToString('o') } else { $null }
    }
}
$receipt = [ordered]@{
    id = $Id
    graph = $Graph
    command = $Command
    commandScript = 'command.ps1'
    startedUtc = $startedAt
    completedUtc = [DateTime]::UtcNow.ToString('o')
    ownedRoot = $rootIdentity
    rootHasExited = $process.HasExited
    rootExitCode = $process.ExitCode
    stdoutTaskCompleted = $outTask.IsCompletedSuccessfully
    stderrTaskCompleted = $errTask.IsCompletedSuccessfully
    stdoutUtf8Bytes = [Text.Encoding]::UTF8.GetByteCount($stdout)
    stderrUtf8Bytes = [Text.Encoding]::UTF8.GetByteCount($stderr)
    observedChildChecks = $checks
    samplingErrors = @($samplingErrors)
    closureLimit = 'Sampled descendants only. PID absence is an observed terminal identity check, not an exit-code receipt or universal process closure.'
}
$receipt | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath (Join-Path $attempt 'receipt.json') -Encoding utf8
$stdout
if ($stderr.Length -gt 0)
{
    [Console]::Error.Write($stderr)
}
Write-Output "RECORDED $Id root=$($process.Id) exit=$($process.ExitCode) observedChildren=$($checks.Count)"
