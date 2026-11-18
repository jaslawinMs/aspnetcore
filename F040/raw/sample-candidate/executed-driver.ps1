param(
    [Parameter(Mandatory)]
    [ValidateSet('original', 'candidate')]
    [string]$Variant
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F040'
$directory = Join-Path $run "sample-$Variant"
if (Test-Path -LiteralPath $directory)
{
    throw "Do not overwrite a sample run: $directory"
}
$build = Get-Content -Raw -LiteralPath (Join-Path $run "validation\SampleBuild-$Variant-1\command.json") | ConvertFrom-Json
if ($build.actualExitCode -ne 0)
{
    throw 'Require the successful source-aware canonical sample build.'
}
New-Item -ItemType Directory -Path $directory | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $directory 'executed-driver.ps1')
Set-Location $root
. .\activate.ps1
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$arguments = @('run', '--project', 'src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj',
    '--configuration', 'Release', '--no-build', '--no-restore', '--no-launch-profile',
    '--', '--urls', 'http://127.0.0.1:0')
$startInfo = [Diagnostics.ProcessStartInfo]::new()
$startInfo.FileName = (Get-Command dotnet).Source
$startInfo.WorkingDirectory = $root
$startInfo.UseShellExecute = $false
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true
foreach ($argument in $arguments)
{
    $startInfo.ArgumentList.Add($argument)
}
$process = [Diagnostics.Process]::new()
$process.StartInfo = $startInfo
$stdout = [IO.File]::Open((Join-Path $directory 'stdout.log'), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
$stderr = [IO.File]::Open((Join-Path $directory 'stderr.log'), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
$owned = @()
$launched = $false
try
{
    if (-not $process.Start())
    {
        throw 'The owned canonical sample did not start.'
    }
    $launched = $true
    $outTask = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
    $errTask = $process.StandardError.BaseStream.CopyToAsync($stderr)
    [ordered]@{
        candidate = 'F040'
        variant = $Variant
        wrapperProcessId = $process.Id
        actualProcessStartedUtc = $process.StartTime.ToUniversalTime().ToString('O')
        startedUtc = [DateTime]::UtcNow.ToString('O')
        executable = $startInfo.FileName
        arguments = $arguments
        boundedOwnedHelper = $true
        detached = $false
        actualSharedMachineNotIsolated = $true
    } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $directory 'launch.json') -Encoding utf8NoBOM
    & (Join-Path $PSHOME 'pwsh.exe') -NoLogo -NoProfile -File (Join-Path $PSScriptRoot 'F040-readiness.ps1') -Variant $Variant
    if ($LASTEXITCODE -ne 0)
    {
        throw 'The actual owned listener did not become ready; preserve startup evidence.'
    }
    $ready = Get-Content -Raw -LiteralPath (Join-Path $directory 'startup-listener.json') | ConvertFrom-Json
    $ids = @($ready.actualOwnedProcessTree.ProcessId)
    $owned = @(Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -in $ids } |
        Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine)
    if ($owned.Count -ne $ids.Count)
    {
        throw 'A recorded owned sample process changed before the browser run.'
    }
    & node (Join-Path $PSScriptRoot 'F040-browser-probe.mjs') $Variant
    if ($LASTEXITCODE -ne 0)
    {
        throw 'The actual cookie-backed browser probe failed; preserve its result.'
    }
}
finally
{
    if ($launched)
    {
        if ($owned.Count -eq 0)
        {
            $all = @(Get-CimInstance Win32_Process)
            $ids = @($process.Id)
            for ($depth = 0; $depth -lt 6; $depth++)
            {
                $expanded = @($all | Where-Object { $_.ProcessId -in $ids -or $_.ParentProcessId -in $ids } |
                    Select-Object -ExpandProperty ProcessId -Unique)
                if ($expanded.Count -eq $ids.Count)
                {
                    break
                }
                $ids = $expanded
            }
            $owned = @($all | Where-Object { $_.ProcessId -in $ids } |
                Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine)
        }
        foreach ($entry in @($owned | Sort-Object { $_.ProcessId -eq $process.Id }))
        {
            $current = Get-CimInstance Win32_Process -Filter "ProcessId=$($entry.ProcessId)"
            if ($current)
            {
                if ($current.CreationDate -ne $entry.CreationDate -or $current.CommandLine -cne $entry.CommandLine)
                {
                    throw "Do not stop a reused or changed process PID $($entry.ProcessId)."
                }
                Stop-Process -Id $entry.ProcessId -ErrorAction Stop
            }
        }
        $process.WaitForExit()
        $outTask.GetAwaiter().GetResult()
        $errTask.GetAwaiter().GetResult()
        $remaining = @(Get-CimInstance Win32_Process | Where-Object {
            $current = $_
            @($owned | Where-Object { $_.ProcessId -eq $current.ProcessId -and $_.CreationDate -eq $current.CreationDate }).Count -gt 0
        })
        [ordered]@{
            candidate = 'F040'
            variant = $Variant
            actualOwnedProcessesStopped = $remaining.Count -eq 0
            actualCapturedOwnedProcesses = $owned
            actualRemainingOwnedProcesses = $remaining | Select-Object ProcessId,ParentProcessId,CreationDate,CommandLine
            actualNoNameBasedOrUnrelatedProcessTermination = $true
            actualVerifiedUtc = [DateTime]::UtcNow.ToString('O')
        } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $directory 'stop-verification.json') -Encoding utf8NoBOM
        if ($remaining.Count -ne 0)
        {
            throw 'The bounded sample left an owned helper running.'
        }
    }
    $stdout.Dispose()
    $stderr.Dispose()
    $process.Dispose()
}
Write-Output "F040:$Variant canonical browser probe passed and its owned sample processes are gone."
