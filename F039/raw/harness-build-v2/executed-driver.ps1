$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F039'
$harness = Join-Path $run 'harness-v2'
$directory = Join-Path $run 'harness-build-v2'
if (Test-Path -LiteralPath $directory)
{
    throw 'Do not overwrite corrected-harness build evidence.'
}
New-Item -ItemType Directory -Path (Join-Path $directory 'inputs') | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $directory 'executed-driver.ps1')
$inputs = @(Get-ChildItem -LiteralPath $harness -File | Where-Object { $_.Extension -in @('.cs', '.csproj') } | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $directory 'inputs' | Join-Path -ChildPath $_.Name)
    [ordered]@{file=$_.Name;sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash}
})
$inputs | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $directory 'input-manifest.json') -Encoding utf8NoBOM
Set-Location $root
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:AUTOPERF_ASPNETCORE_ROOT = $root
$project = Join-Path $harness 'AutoPerf.Benchmarks.csproj'
foreach ($task in @('restore', 'build'))
{
    $arguments = if ($task -eq 'restore')
    {
        @('restore', $project, '-m:2', '-nr:false', '--verbosity', 'quiet', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false')
    }
    else
    {
        @('build', $project, '--configuration', 'Release', '--no-restore', '-m:2', '-nr:false', '--verbosity', 'quiet',
            '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false')
    }
    $start = [DateTime]::UtcNow
    & dotnet @arguments 1> (Join-Path $directory "$task.stdout.log") 2> (Join-Path $directory "$task.stderr.log")
    $nativeExit = $LASTEXITCODE
    [ordered]@{candidate='F039';actualHarnessVersion=2;task=$task;executable=(Get-Command dotnet).Source;arguments=$arguments;
        actualStartedUtc=$start.ToString('O');actualFinishedUtc=[DateTime]::UtcNow.ToString('O');actualExitCode=$nativeExit;
        actualOnlyNewCorrectedProjectRestored=$true;actualMaximumBuildWorkers=2
    } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $directory "$task-command.json") -Encoding utf8NoBOM
    Get-Content -LiteralPath (Join-Path $directory "$task.stdout.log") -Tail 16
    Get-Content -LiteralPath (Join-Path $directory "$task.stderr.log") -Tail 10
    if ($nativeExit -ne 0)
    {
        throw "Corrected harness $task failed: $nativeExit; this is untimed preparation, not a new source-comparison authorization."
    }
}
