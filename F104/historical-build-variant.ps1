param([Parameter(Mandatory)][ValidateSet('candidate-1','candidate-2','candidate-3')][string]$Variant)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F104'
if (Test-Path (Join-Path $run "binaries\$Variant")) { throw 'Variant frozen;do not rebuild or overwrite.' }
$original = Get-Content (Join-Path $run 'original-manifest.json') -Raw | ConvertFrom-Json
if ((git rev-parse HEAD).Trim() -cne $original.baselineSourceRevision) { throw 'Actual source baseline unexpectedly changed.' }
$project = 'src\Framework\AspNetCoreAnalyzers\src\Analyzers\Microsoft.AspNetCore.App.Analyzers.csproj'
foreach ($entry in @(
    @("source-whitespace-$Variant",@('format','whitespace',$project,'--no-restore','--verify-no-changes',
        '--include','src\Framework\AspNetCoreAnalyzers\src\Analyzers\RouteHandlers\RouteHandlerAnalyzer.cs','--verbosity','quiet')),
    @("owner-build-$Variant",@('build',$project,'--no-restore','-c','Release','-m:2','-p:UseIisNativeAssets=false','--verbosity','minimal'))
))
{
    $record = Join-Path $run "$($entry[0])-command.json"
    if (Test-Path $record) { throw 'Actual build/format record exists;retain it.' }
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    dotnet @($entry[1]) *> (Join-Path $run "$($entry[0]).log")
    $code = $LASTEXITCODE
    [ordered]@{arguments=$entry[1];exitCode=$code;startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')} |
        ConvertTo-Json -Depth 5 | Set-Content $record -Encoding utf8
    if ($code)
    {
        Get-Content (Join-Path $run "$($entry[0]).log") -Tail 30
        throw 'Actual scoped owner build/format failed;no frozen sweep.'
    }
}
& (Join-Path $PSScriptRoot 'F104-freeze.ps1') -Variant $Variant
if (-not $?) { throw 'Actual same-harness freeze failed.' }
& (Join-Path $PSScriptRoot 'F104-probe.ps1') -Variant $Variant
if (-not $?) { throw 'Actual proposed owner semantics/producer/resource proof failed;no sweep.' }
Get-Content (Join-Path $run "owner-build-$Variant.log") -Tail 10
