$ErrorActionPreference = 'Stop'
$script:EvidenceRoot = $PSScriptRoot

function Assert-NativeAllowed
{
    $policyPath = Join-Path (Split-Path $script:EvidenceRoot) 'policy.json'
    if (Test-Path -LiteralPath $policyPath)
    {
        $policy = Get-Content -LiteralPath $policyPath -Raw | ConvertFrom-Json
        if ($policy.actualWorkerBuildHoldActive -or ($policy.PSObject.Properties.Name -contains 'workersMayBuildOrTest' -and -not $policy.workersMayBuildOrTest))
        {
            throw 'Coordinator HOLD: no new native work or heavy IO.'
        }
    }
}

function Invoke-Recorded
{
    param([string]$Id, [string]$File, [string[]]$Arguments, [string]$Cwd = 'C:\src\aspnetcore', [hashtable]$Environment = @{})
    $stem = Join-Path $script:EvidenceRoot "commands\$Id"
    if (Test-Path -LiteralPath "$stem.json") { throw "Receipt exists: $Id" }
    $info = [Diagnostics.ProcessStartInfo]::new()
    $info.FileName = $File
    $info.WorkingDirectory = $Cwd
    $info.UseShellExecute = $false
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    foreach ($arg in $Arguments) { $info.ArgumentList.Add($arg) }
    foreach ($key in $Environment.Keys) { $info.Environment[$key] = [string]$Environment[$key] }
    $p = [Diagnostics.Process]::new()
    $p.StartInfo = $info
    $receipt = [ordered]@{
        id=$Id; file=$File; arguments=$Arguments; cwd=$Cwd; environmentOverrides=$Environment
        launcherPid=$PID; startUtc=[DateTime]::UtcNow.ToString('o'); rootPid=$null
        exitCode=$null; exitUtc=$null; rootAwaited=$false; stdoutAwaited=$false; stderrAwaited=$false
        stdout="$Id.stdout.txt"; stderr="$Id.stderr.txt"; descendants=@()
        observationBoundary='Bounded CIM parent-PID polling; short-lived children can be missed. No process counters or profiling.'
    }
    $seen = @{}
    try
    {
        [void]$p.Start()
        $receipt.rootPid = $p.Id
        $out = $p.StandardOutput.ReadToEndAsync()
        $err = $p.StandardError.ReadToEndAsync()
        while (-not $p.WaitForExit(400))
        {
            foreach ($parentId in (@($p.Id) + @($seen.Values | ForEach-Object { $_.pid }) | Select-Object -Unique))
            {
                foreach ($child in @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$parentId" -ErrorAction SilentlyContinue))
                {
                    $created = $child.CreationDate.ToUniversalTime().ToString('o')
                    $key = "$($child.ProcessId)|$created"
                    if (-not $seen.ContainsKey($key))
                    {
                        $seen[$key] = [ordered]@{
                            pid=[int]$child.ProcessId; parentPid=[int]$child.ParentProcessId
                            name=$child.Name; commandLine=$child.CommandLine; creationUtc=$created
                            firstObservedUtc=[DateTime]::UtcNow.ToString('o')
                        }
                    }
                }
            }
        }
        $p.WaitForExit()
        $receipt.rootAwaited = $true
        [IO.File]::WriteAllText("$stem.stdout.txt", $out.GetAwaiter().GetResult(), [Text.UTF8Encoding]::new($false))
        $receipt.stdoutAwaited = $true
        [IO.File]::WriteAllText("$stem.stderr.txt", $err.GetAwaiter().GetResult(), [Text.UTF8Encoding]::new($false))
        $receipt.stderrAwaited = $true
        $receipt.exitCode = $p.ExitCode
        foreach ($child in $seen.Values)
        {
            $current = Get-CimInstance Win32_Process -Filter "ProcessId=$($child.pid)" -ErrorAction SilentlyContinue
            $same = $current -and $current.CreationDate.ToUniversalTime().ToString('o') -eq $child.creationUtc
            if ($same)
            {
                $live = Get-Process -Id $child.pid -ErrorAction SilentlyContinue
                if ($live) { $live.WaitForExit() }
                $child.terminalState = 'same-creation-identity-awaited-after-root'
            }
            else
            {
                $child.terminalState = if ($current) { 'pid-reused-different-creation-time' } else { 'pid-absent-after-root' }
            }
            $child.terminalObservedUtc = [DateTime]::UtcNow.ToString('o')
        }
        $receipt.descendants = @($seen.Values)
        Write-Host "$Id pid=$($p.Id) exit=$($receipt.exitCode)"
        Get-Content -LiteralPath "$stem.stdout.txt" -Tail 10 | ForEach-Object { if ($_.Length -gt 1400) { Write-Host ($_.Substring(0, 1400) + ' [display truncated; full stream retained]') } else { Write-Host $_ } }
        Get-Content -LiteralPath "$stem.stderr.txt" -Tail 10 | ForEach-Object { if ($_.Length -gt 1400) { Write-Host ($_.Substring(0, 1400) + ' [display truncated; full stream retained]') } else { Write-Host $_ } }
    }
    catch
    {
        $receipt.recordingError = $_.ToString()
        throw
    }
    finally
    {
        $receipt.exitUtc = [DateTime]::UtcNow.ToString('o')
        $receipt | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath "$stem.json" -Encoding utf8NoBOM
        $p.Dispose()
    }
    return $receipt.exitCode
}

function Invoke-LocalDotnet
{
    param([string]$Id, [string]$Repo, [string[]]$Arguments, [hashtable]$ExtraEnvironment = @{})
    Assert-NativeAllowed
    Set-Location -LiteralPath $Repo
    foreach ($dir in @('.autoperf\cli','.autoperf\scratch','.autoperf\nuget-http','.autoperf\nuget-plugins'))
    {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
    $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
    $env:MSBUILDDISABLENODEREUSE = '1'
    . .\activate.ps1
    $e = @{
        DOTNET_GENERATE_ASPNET_CERTIFICATE='false'; DOTNET_ADD_GLOBAL_TOOLS_TO_PATH='false'
        MSBUILDDISABLENODEREUSE='1'; DOTNET_ROOT=$env:DOTNET_ROOT; PATH=$env:PATH
        DOTNET_CLI_HOME="$Repo\.autoperf\cli"; TEMP="$Repo\.autoperf\scratch"; TMP="$Repo\.autoperf\scratch"
        NUGET_HTTP_CACHE_PATH="$Repo\.autoperf\nuget-http"; NUGET_PLUGINS_CACHE_PATH="$Repo\.autoperf\nuget-plugins"
        NUGET_PACKAGES='C:\Users\jaslawin\.nuget\packages'
        DOTNET_SKIP_FIRST_TIME_EXPERIENCE='true'; DOTNET_CLI_TELEMETRY_OPTOUT='true'
        DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE='true'; DOTNET_NOLOGO='1'
        DOTNET_STARTUP_HOOKS=''; DOTNET_ADDITIONAL_DEPS=''; DOTNET_SHARED_STORE=''
        DOTNET_ROLL_FORWARD=''; DOTNET_ROLL_FORWARD_TO_PRERELEASE=''; DOTNET_ROOT_X64=$env:DOTNET_ROOT
    }
    foreach ($key in $ExtraEnvironment.Keys) { $e[$key] = $ExtraEnvironment[$key] }
    Invoke-Recorded $Id "$Repo\.dotnet\dotnet.exe" $Arguments $Repo $e
}
