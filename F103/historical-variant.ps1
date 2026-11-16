param([Parameter(Mandatory)][ValidateSet('candidate-1','candidate-2','candidate-3')][string]$Variant)
$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
Set-Location $repo
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F103'
$project = Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'
if (Test-Path (Join-Path $run "binaries\$Variant")) { throw 'Variant frozen;do not overwrite/rebuild it.' }
$original = Get-Content (Join-Path $run 'original-manifest.json') -Raw | ConvertFrom-Json
if ((git rev-parse HEAD).Trim() -cne $original.baselineSourceRevision) { throw 'Source baseline changed unexpectedly.' }
foreach ($entry in @(
    @("source-whitespace-$Variant",@('format','whitespace','src\Components\Analyzers\src\Microsoft.AspNetCore.Components.Analyzers.csproj',
        '--no-restore','--verify-no-changes','--include','src\Components\Analyzers\src\StateHasChangedAnalyzer.cs','--verbosity','quiet')),
    @("harness-build-$Variant",@('build',$project,'--no-restore','-c','Release','-m:2','-p:UseIisNativeAssets=false','--verbosity','minimal'))
))
{
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    dotnet @($entry[1]) *> (Join-Path $run "$($entry[0]).log")
    $code = $LASTEXITCODE
    [ordered]@{arguments=$entry[1];exitCode=$code;startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')} |
        ConvertTo-Json -Depth 5 | Set-Content (Join-Path $run "$($entry[0])-command.json")
    if ($code) { Get-Content (Join-Path $run "$($entry[0]).log") -Tail 35;throw 'Actual scoped format/build failed;no sweep.' }
}
& (Join-Path $PSScriptRoot 'F103-freeze.ps1') -Variant $Variant
$a = @((Join-Path $run "binaries\$Variant\AutoPerf.Benchmarks.dll"),'--characterize','--artifacts',(Join-Path $run "verification\$Variant"))
dotnet @a *> (Join-Path $run "verification-$Variant-console.log")
$code = $LASTEXITCODE
[ordered]@{arguments=$a;exitCode=$code;expectedObservations=17;expectedResourceCases=10;expectedRealProducerCases=10} |
    ConvertTo-Json -Depth 5 | Set-Content (Join-Path $run "verification-$Variant-command.json")
if ($code) { Get-Content (Join-Path $run "verification-$Variant-console.log") -Tail 18;throw 'Actual frozen variant diagnostic/producer/resource probe failed;no sweep.' }
Get-Content (Join-Path $run "verification-$Variant-console.log") -Tail 2
$comparison = [int]$Variant.Substring($Variant.Length - 1)
if ($comparison -gt 1)
{
    & (Join-Path $PSScriptRoot 'F103-reference-repeat.ps1') -Comparison $comparison
}
& (Join-Path $PSScriptRoot 'F103-measure.ps1') -Variant $Variant
