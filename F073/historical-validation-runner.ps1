param(
    [Parameter(Mandatory)]
    [ValidateSet('before', 'after')]
    [string]$Variant,
    [ValidateSet('after', 'after-2', 'after-3')]
    [string]$AfterSnapshot = 'after'
)

$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F073'
Set-Location $repo
. .\activate.ps1
$flags = @('-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false',
    '-p:CrossgenOutput=false', '-p:GenerateInstallers=false')

function Invoke-RecordedDotNet([string]$label, [string[]]$commandArguments)
{
    $destination = Join-Path $run $label
    if (Test-Path $destination)
    {
        throw "Refusing to overwrite command evidence: $destination"
    }
    New-Item -ItemType Directory $destination | Out-Null
    $started = [DateTimeOffset]::UtcNow
    & dotnet @commandArguments *> (Join-Path $destination 'command.log')
    $exit = $LASTEXITCODE
    @{ command = 'dotnet'; arguments = $commandArguments; exit_code = $exit;
        started_at = $started.ToString('o'); completed_at = [DateTimeOffset]::UtcNow.ToString('o') } |
        ConvertTo-Json -Depth 6 | Set-Content (Join-Path $destination 'command.json') -Encoding utf8
    Get-Content (Join-Path $destination 'command.log') -Tail 6
    if ($exit) { throw "Command $label failed: $exit" }
}

$label = if ($Variant -eq 'before') { 'tests-before' } else { "tests-$AfterSnapshot" }
$destination = Join-Path $run $label
$filter = 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.Formatters.OutputFormatterTests|FullyQualifiedName~Microsoft.AspNetCore.Mvc.Formatters.TextOutputFormatterTests|FullyQualifiedName~Microsoft.AspNetCore.Mvc.Formatters.StringOutputFormatterTests|FullyQualifiedName~Microsoft.AspNetCore.Mvc.Infrastructure.DefaultObjectResultExecutorTest'
Invoke-RecordedDotNet $label (@('test',
    'src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj',
    '--no-restore', '-c', 'Release', '-m:2', '--filter', $filter,
    '--logger', 'trx;LogFileName=results.trx', '--results-directory', $destination) + $flags)
[xml]$trx = Get-Content (Join-Path $destination 'results.trx') -Raw
$rows = @($trx.TestRun.Results.UnitTestResult)
if ($rows.Count -ne 74 -or @($rows | Where-Object outcome -ne Passed).Count)
{
    throw 'All 74 original/new formatter/selector rows must pass.'
}
$rows | Select-Object testName, outcome | ConvertTo-Json |
    Set-Content (Join-Path $destination 'row-validation.json') -Encoding utf8

$harness = Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'
if ($Variant -eq 'before')
{
    Invoke-RecordedDotNet 'restore-harness' (@('restore', $harness,
        '--configfile', (Join-Path $repo 'NuGet.config'), '-m:2') + $flags)
}
$snapshot = if ($Variant -eq 'before') { 'before' } else { $AfterSnapshot }
Invoke-RecordedDotNet "build-harness-$snapshot" (@('build', $harness,
    '--no-restore', '-c', 'Release', '-m:2') + $flags)
$bin = Join-Path $run 'harness\bin\Release\net12.0'
$owner = 'Microsoft.AspNetCore.Mvc.Core.dll'
$tested = Join-Path $repo "artifacts\bin\Microsoft.AspNetCore.Mvc.Core.Test\Release\net12.0\$owner"
if ((Get-FileHash (Join-Path $bin $owner)).Hash -ne (Get-FileHash $tested).Hash)
{
    throw 'Harness owner does not match the actual tested owner.'
}
$contracts = Join-Path $run "contracts-$snapshot.json"
$contractLog = Join-Path $run "contracts-$snapshot.log"
& dotnet (Join-Path $bin 'AutoPerf.Benchmarks.dll') --contracts --output $contracts *> $contractLog
if ($LASTEXITCODE)
{
    Get-Content $contractLog -Tail 25
    throw 'Real owner/selector/virtual producer contracts failed.'
}
$data = Get-Content $contracts -Raw | ConvertFrom-Json
if ($data.cases.Count -ne 40 -or $data.raw_producers.Count -ne 26 -or
    $data.selector_producers.Count -ne 3 -or $data.mutations.Count -ne 1 -or
    $data.type_check_producers.Count -ne 2 -or $data.segment_boundaries.Count -ne 2)
{
    throw 'Incomplete real owner contracts.'
}
if ($Variant -eq 'after' -and (Get-FileHash $contracts).Hash -ne
    (Get-FileHash (Join-Path $run 'contracts-before.json')).Hash)
{
    throw 'Original/proposed observable contracts changed.'
}
$options = @{}
if ($Variant -eq 'after')
{
    $options.ReuseHarnessFrom = 'before'
    $options.SnapshotName = $AfterSnapshot
}
& (Join-Path $PSScriptRoot 'autoperf-benchmarks.ps1') -Action Snapshot -Id F073 `
    -Variant $Variant -ProjectName AutoPerf.Benchmarks -TargetAssembly Microsoft.AspNetCore.Mvc.Core `
    -TargetSource 'src\Mvc\Mvc.Core\src\Formatters\OutputFormatter.cs' `
    -AdditionalTargetSource 'src\Mvc\Mvc.Core\test\Formatters\OutputFormatterTests.cs' `
    -BuildOutput $bin @options
Write-Output "$snapshot`:74 test rows,40 profiles,26 raw producers,3 real selector inputs,live mutation,2 virtual type-check producers and2 segment boundaries passed."
