$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F047'
$directory = Join-Path $run 'selenium-candidate-001'
if (Test-Path -LiteralPath $directory)
{
    throw 'Do not replace an owning browser run.'
}
$buildDirectory = Join-Path $run 'validation\candidate-selenium-build-001'
$build = Get-Content -Raw -LiteralPath (Join-Path $buildDirectory 'result.json') | ConvertFrom-Json
$buildCommand = Get-Content -Raw -LiteralPath (Join-Path $buildDirectory 'command.ps1')
if ($build.exitCode -ne 0 -or $buildCommand.Contains('--no-dependencies') -or
    -not $buildCommand.Contains('Microsoft.AspNetCore.Components.E2ETests.csproj') -or
    -not $buildCommand.Contains("'Debug'"))
{
    throw 'First complete the dependency-aware Debug E2E build and its referenced applications.'
}
New-Item -ItemType Directory -Path $directory | Out-Null
Set-Location $root
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$arguments = @('test', 'src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj',
    '--configuration', 'Debug', '--no-build', '--no-restore', '-m:2', '-nr:false', '--verbosity', 'quiet',
    '-p:UseIisNativeAssets=false', '--filter',
    'FullyQualifiedName~Microsoft.AspNetCore.Components.E2ETests.ServerRenderingTests.RenderFragmentSerializationTest',
    '--logger', 'trx;LogFileName=F047-RenderFragmentSerialization.trx', '--results-directory', $directory)
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
$owned = @{}
$deadline = [DateTime]::UtcNow.AddMinutes(12)
try
{
    if (-not $process.Start())
    {
        throw 'The owning browser command did not start.'
    }
    $outTask = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
    $errTask = $process.StandardError.BaseStream.CopyToAsync($stderr)
    $receipt = [ordered]@{
        candidate = 'F047'
        executable = $startInfo.FileName
        arguments = $arguments
        actualProcessId = $process.Id
        actualPidCapturedBeforeWait = $true
        actualStartedUtc = $process.StartTime.ToUniversalTime().ToString('O')
        actualExitCode = $null
        actualFinishedUtc = $null
        actualDependencyAwareDebugPrerequisitePassed = $true
    }
    $receipt | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $directory 'launch.json') -Encoding utf8NoBOM
    do
    {
        $processes = @(Get-CimInstance Win32_Process)
        $queue = [Collections.Generic.Queue[int]]::new()
        $queue.Enqueue($process.Id)
        foreach ($knownId in @($owned.Keys))
        {
            $known = $owned[$knownId]
            if (@($processes | Where-Object { $_.ProcessId -eq $knownId -and $_.CreationDate -eq $known.CreationDate }).Count -eq 1)
            {
                $queue.Enqueue([int]$knownId)
            }
        }
        $seen = [Collections.Generic.HashSet[int]]::new()
        while ($queue.Count -gt 0)
        {
            $currentId = $queue.Dequeue()
            if (-not $seen.Add($currentId))
            {
                continue
            }
            $current = @($processes | Where-Object { $_.ProcessId -eq $currentId })
            if ($current.Count -eq 1)
            {
                $owned[$currentId] = $current[0] | Select-Object ProcessId,ParentProcessId,Name,CommandLine,CreationDate
                foreach ($child in @($processes | Where-Object { $_.ParentProcessId -eq $currentId }))
                {
                    $queue.Enqueue([int]$child.ProcessId)
                }
            }
        }
        @($owned.Values) | ConvertTo-Json -Depth 7 |
            Set-Content -LiteralPath (Join-Path $directory 'captured-owned-processes.json') -Encoding utf8NoBOM
        if ([DateTime]::UtcNow -gt $deadline)
        {
            foreach ($entry in @($owned.Values | Sort-Object ProcessId -Descending))
            {
                $current = @(Get-CimInstance Win32_Process -Filter "ProcessId=$($entry.ProcessId)")
                if ($current.Count -eq 1 -and $current[0].CreationDate -eq $entry.CreationDate)
                {
                    Stop-Process -Id ([int]$entry.ProcessId) -Force -ErrorAction Stop
                }
            }
            throw 'The bounded owning browser command timed out; no pass is claimed.'
        }
    } while (-not $process.WaitForExit(1000))
    [void]$outTask.GetAwaiter().GetResult()
    [void]$errTask.GetAwaiter().GetResult()
    $receipt.actualExitCode = $process.ExitCode
    $receipt.actualFinishedUtc = [DateTime]::UtcNow.ToString('O')
    $receipt | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $directory 'command.json') -Encoding utf8NoBOM
}
finally
{
    $stdout.Dispose()
    $stderr.Dispose()
    $process.Dispose()
}
Get-Content -LiteralPath (Join-Path $directory 'stdout.log') -Tail 30
Get-Content -LiteralPath (Join-Path $directory 'stderr.log') -Tail 15
if ($receipt.actualExitCode -ne 0)
{
    throw 'The selected browser suite did not pass; retain its exact failing prerequisite/assertion.'
}
$auditJson = & (Join-Path $PSScriptRoot 'F047-audit-trx.ps1') -Kind Browser `
    -TrxPath (Join-Path $directory 'F047-RenderFragmentSerialization.trx')
$auditJson | Set-Content -LiteralPath (Join-Path $directory 'all-trx-rows.json') -Encoding utf8NoBOM
$audit = $auditJson | ConvertFrom-Json
$remaining = @()
$cleanupDeadline = [DateTime]::UtcNow.AddSeconds(15)
do
{
    $currentProcesses = @(Get-CimInstance Win32_Process)
    $remaining = @($owned.Values | Where-Object {
        $known = $_
        @($currentProcesses | Where-Object { $_.ProcessId -eq $known.ProcessId -and $_.CreationDate -eq $known.CreationDate }).Count -ne 0
    })
    if ($remaining.Count -gt 0)
    {
        Start-Sleep -Milliseconds 100
    }
} while ($remaining.Count -gt 0 -and [DateTime]::UtcNow -lt $cleanupDeadline)
if ($remaining.Count -ne 0)
{
    throw "Captured owned browser helpers remain: $($remaining.ProcessId -join ',')"
}
[ordered]@{
    candidate = 'F047'
    actualPassed = $audit.actualPassed
    actualSkipped = 0
    actualAllIndividualParameterizedRowsChecked = $true
    actualCapturedOwnedProcesses = $owned.Count
    actualAllCapturedOwnedHelpersGone = $true
    actualConfiguration = 'Debug'
    actualBrowserCorrectnessNotPerformance = $true
} | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $directory 'verified-result.json') -Encoding utf8NoBOM
Write-Output 'F047: 14 existing Server/WebAssembly browser rows passed; all captured owned helpers gone.'
