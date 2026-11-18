$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F039'
$directory = Join-Path $run 'reproduction-candidate-001'
if (Test-Path -LiteralPath $directory)
{
    throw 'Do not overwrite independent reproduction evidence.'
}
$budget = Get-Content -Raw -LiteralPath (Join-Path $run 'source-comparison-budget.json') | ConvertFrom-Json
if (-not $budget.closed)
{
    throw 'Close timing before independently rebuilding the exact project.'
}
New-Item -ItemType Directory -Path (Join-Path $directory 'project') | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $directory 'executed-driver.ps1')
$inputs = @(Get-ChildItem -LiteralPath (Join-Path $run 'harness-v2') -File |
    Where-Object { $_.Extension -in @('.cs', '.csproj') } | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $directory "project\$($_.Name)")
        [ordered]@{file=$_.Name;sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash}
    })
if ($inputs.Count -ne 7)
{
    throw 'Relocate exactly the seven corrected measured source inputs.'
}
$inputs | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $directory 'relocated-inputs.json') -Encoding utf8NoBOM
Set-Location $root
. .\activate.ps1
$env:AUTOPERF_ASPNETCORE_ROOT = $root
$env:MSBUILDDISABLENODEREUSE = '1'
$env:UseIisNativeAssets = 'false'
$project = Join-Path $directory 'project\AutoPerf.Benchmarks.csproj'
$common = @('-m:2', '-nr:false', '--verbosity', 'quiet', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false')
$commands = @()
foreach ($task in @('restore', 'build'))
{
    $arguments = if ($task -eq 'restore') { @('restore', $project) + $common } else { @('build', $project, '--configuration', 'Release', '--no-restore') + $common }
    $started = [DateTime]::UtcNow
    & dotnet @arguments 1> (Join-Path $directory "$task.stdout.log") 2> (Join-Path $directory "$task.stderr.log")
    $nativeExit = $LASTEXITCODE
    $commands += [ordered]@{executable=(Get-Command dotnet).Source;arguments=$arguments;actualExitCode=$nativeExit;
        actualStartedUtc=$started.ToString('O');actualFinishedUtc=[DateTime]::UtcNow.ToString('O')}
    $commands | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $directory 'build-commands.json') -Encoding utf8NoBOM
    Get-Content -LiteralPath (Join-Path $directory "$task.stdout.log") -Tail 16
    Get-Content -LiteralPath (Join-Path $directory "$task.stderr.log") -Tail 10
    if ($nativeExit -ne 0)
    {
        throw "Independent exact-project $task failed with native exit $nativeExit."
    }
}
node (Join-Path $PSScriptRoot 'F039-verify-reproduction.mjs') prepare
if ($LASTEXITCODE -ne 0)
{
    throw 'The independently compiled image or source inputs differ beyond their declared boundary.'
}
New-Item -ItemType Directory -Path (Join-Path $directory 'state') | Out-Null
$arguments = @((Join-Path $directory 'consumer\AutoPerf.Benchmarks.dll'), 'characterize', 'candidate',
    (Join-Path $directory 'state'), (Join-Path $directory 'consumer-closure.json'), (Join-Path $directory 'sources'),
    (Join-Path $directory 'reports'))
$startInfo = [Diagnostics.ProcessStartInfo]::new()
$startInfo.FileName = (Get-Command dotnet).Source
$startInfo.WorkingDirectory = $directory
$startInfo.UseShellExecute = $false
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true
foreach ($argument in $arguments)
{
    $startInfo.ArgumentList.Add($argument)
}
$process = [Diagnostics.Process]::new()
$process.StartInfo = $startInfo
$stdout = [IO.File]::Open((Join-Path $directory 'characterize.stdout.log'), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
$stderr = [IO.File]::Open((Join-Path $directory 'characterize.stderr.log'), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
try
{
    if (-not $process.Start())
    {
        throw 'Independent native characterization did not start.'
    }
    $outTask = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
    $errTask = $process.StandardError.BaseStream.CopyToAsync($stderr)
    $receipt = [ordered]@{candidate='F039';actualIndependentRelocatedProject=$true;actualTimed=$false;
        executable=$startInfo.FileName;arguments=$arguments;actualProcessId=$process.Id;actualPidCapturedBeforeWait=$true;
        actualStartedUtc=$process.StartTime.ToUniversalTime().ToString('O');actualExitCode=$null;actualFinishedUtc=$null}
    $receipt | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $directory 'characterize-launch.json') -Encoding utf8NoBOM
    $process.WaitForExit()
    [void]$outTask.GetAwaiter().GetResult()
    [void]$errTask.GetAwaiter().GetResult()
    $receipt.actualExitCode = $process.ExitCode
    $receipt.actualFinishedUtc = [DateTime]::UtcNow.ToString('O')
    $receipt | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $directory 'characterize-command.json') -Encoding utf8NoBOM
}
finally
{
    $stdout.Dispose()
    $stderr.Dispose()
    $process.Dispose()
}
if ($receipt.actualExitCode -ne 0)
{
    throw "Independent native characterization failed with native exit $($receipt.actualExitCode)."
}
node (Join-Path $PSScriptRoot 'F039-verify-reproduction.mjs') verify
if ($LASTEXITCODE -ne 0)
{
    throw 'Independent characterization audit failed.'
}
