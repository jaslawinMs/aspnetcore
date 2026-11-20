$ErrorActionPreference = 'Stop'
$script:EvidenceRoot = $PSScriptRoot

function Invoke-Recorded
{
    param([string]$Id, [string]$File, [string[]]$Arguments, [string]$Cwd = 'C:\src\aspnetcore', [hashtable]$Environment = @{})
    $stem = Join-Path $script:EvidenceRoot "commands\$Id"
    if (Test-Path "$stem.json") { throw "Receipt already exists: $Id" }
    $psi = [System.Diagnostics.ProcessStartInfo]::new()
    $psi.FileName = $File
    $psi.WorkingDirectory = $Cwd
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    foreach ($arg in $Arguments) { $psi.ArgumentList.Add($arg) }
    foreach ($key in $Environment.Keys) { $psi.Environment[$key] = [string]$Environment[$key] }
    $p = [System.Diagnostics.Process]::new()
    $p.StartInfo = $psi
    $receipt = [ordered]@{
        id=$Id; file=$File; arguments=$Arguments; cwd=$Cwd; environmentOverrides=$Environment
        launcherPid=$PID; startUtc=[DateTime]::UtcNow.ToString('o'); rootPid=$null
        exitCode=$null; exitUtc=$null; stdout="$Id.stdout.txt"; stderr="$Id.stderr.txt"
        rootAwaited=$false; stdoutAwaited=$false; stderrAwaited=$false
        descendants=@(); processObservationBoundary='Bounded parent-PID CIM polling; very short-lived descendants may be missed.'
    }
    try
    {
        [void]$p.Start()
        $receipt.rootPid = $p.Id
        $out = $p.StandardOutput.ReadToEndAsync()
        $err = $p.StandardError.ReadToEndAsync()
        $seen = @{}
        while (-not $p.WaitForExit(350))
        {
            $parents = @($p.Id) + @($seen.Keys | ForEach-Object { [int]$_ })
            foreach ($parentId in $parents)
            {
                foreach ($child in @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$parentId" -ErrorAction SilentlyContinue))
                {
                    if (-not $seen.ContainsKey([string]$child.ProcessId))
                    {
                        $seen[[string]$child.ProcessId] = [ordered]@{
                            pid=[int]$child.ProcessId; parentPid=[int]$child.ParentProcessId
                            name=$child.Name; commandLine=$child.CommandLine
                            creationDate=$child.CreationDate.ToUniversalTime().ToString('o')
                            observedUtc=[DateTime]::UtcNow.ToString('o')
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
            $alive = Get-Process -Id $child.pid -ErrorAction SilentlyContinue
            if ($alive -and $alive.StartTime.ToUniversalTime().ToString('o') -eq $child.creationDate)
            {
                $alive.WaitForExit()
                $child.awaitedAfterRoot = $true
            }
            else { $child.awaitedAfterRoot = $false }
            $child.terminalObservedUtc = [DateTime]::UtcNow.ToString('o')
        }
        $receipt.descendants = @($seen.Values)
        Write-Host "$Id pid=$($p.Id) exit=$($receipt.exitCode)"
        Get-Content "$stem.stdout.txt" -Tail 8 | Write-Host
        Get-Content "$stem.stderr.txt" -Tail 8 | Write-Host
    }
    catch
    {
        $receipt.recordingError = $_.ToString()
        throw
    }
    finally
    {
        $receipt.exitUtc = [DateTime]::UtcNow.ToString('o')
        $receipt | ConvertTo-Json -Depth 20 | Set-Content "$stem.json" -Encoding utf8NoBOM
        $p.Dispose()
    }
    return $receipt.exitCode
}

function Assert-NativeAllowed
{
    $policy = Get-Content (Join-Path (Split-Path $script:EvidenceRoot) 'policy.json') -Raw | ConvertFrom-Json
    if (-not $policy.workersMayBuildOrTest -or $policy.actualWorkerBuildHoldActive)
    {
        throw 'Coordinator HOLD: no new native work may start.'
    }
}

function Invoke-LocalDotnet
{
    param([string]$Id, [string]$Repo, [string[]]$Arguments, [hashtable]$ExtraEnvironment = @{})
    Assert-NativeAllowed
    $env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
    $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
    $env:MSBUILDDISABLENODEREUSE = '1'
    Set-Location $Repo
    . .\activate.ps1
    $e = @{
        DOTNET_GENERATE_ASPNET_CERTIFICATE='false'
        DOTNET_ADD_GLOBAL_TOOLS_TO_PATH='false'
        MSBUILDDISABLENODEREUSE='1'
        DOTNET_ROOT=$env:DOTNET_ROOT
        PATH=$env:PATH
    }
    foreach ($k in $ExtraEnvironment.Keys) { $e[$k] = $ExtraEnvironment[$k] }
    Invoke-Recorded -Id $Id -File "$Repo\.dotnet\dotnet.exe" -Arguments $Arguments -Cwd $Repo -Environment $e
}
