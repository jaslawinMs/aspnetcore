$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
Set-Location $repo
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F103'
$project = Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'
if (Test-Path (Join-Path $run 'binaries\original')) { throw 'Original frozen;do not change its harness.' }
foreach ($entry in @(
    @('harness-whitespace-apply',@('format','whitespace',$project,'--no-restore','--verbosity','quiet')),
    @('harness-whitespace-verify',@('format','whitespace',$project,'--no-restore','--verify-no-changes','--verbosity','quiet')),
    @('harness-build-final',@('build',$project,'--no-restore','-c','Release','-m:2','-p:UseIisNativeAssets=false','--verbosity','minimal'))
))
{
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    dotnet @($entry[1]) *> (Join-Path $run "$($entry[0]).log")
    $code = $LASTEXITCODE
    [ordered]@{arguments=$entry[1];exitCode=$code;startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')} |
        ConvertTo-Json -Depth 5 | Set-Content (Join-Path $run "$($entry[0])-command.json")
    if ($code) { throw "Final unchanged harness command failed:$($entry[0])" }
}
if (@(git status --porcelain --untracked-files=no).Count) { throw 'Shipping source unexpectedly changed before original freeze.' }
Get-Content (Join-Path $run 'harness-build-final.log') -Tail 10
