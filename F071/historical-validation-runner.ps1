param(
    [Parameter(Mandatory)]
    [ValidateSet('before', 'after')]
    [string]$Variant,
    [ValidateSet('after', 'after-2', 'after-3')]
    [string]$AfterSnapshot = 'after'
)

$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F071'
Set-Location $repo
. .\activate.ps1
$flags = @('-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false',
    '-p:CrossgenOutput=false', '-p:GenerateInstallers=false')

function Invoke-RecordedDotNet([string]$label, [string[]]$commandArguments)
{
    $destination = Join-Path $run $label
    if (Test-Path -LiteralPath $destination)
    {
        throw "Refusing to overwrite command evidence: $destination"
    }
    New-Item -ItemType Directory -Path $destination | Out-Null
    $started = [DateTimeOffset]::UtcNow
    & dotnet @commandArguments *> (Join-Path $destination 'command.log')
    $exit = $LASTEXITCODE
    [ordered]@{
        command = 'dotnet'
        arguments = $commandArguments
        exit_code = $exit
        started_at = $started.ToString('o')
        completed_at = [DateTimeOffset]::UtcNow.ToString('o')
        variant = $Variant
    } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $destination 'command.json') -Encoding utf8
    if ($exit)
    {
        Get-Content (Join-Path $destination 'command.log') -Tail 35
        throw "Command $label exited $exit."
    }
    Get-Content (Join-Path $destination 'command.log') -Tail 5
}

$testLabel = if ($Variant -eq 'before') { 'tests-original-expanded' }
    elseif ($AfterSnapshot -eq 'after') { 'tests-proposed' } else { "tests-$AfterSnapshot" }
$tests = Join-Path $run $testLabel
Invoke-RecordedDotNet $testLabel (@('test',
    'src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj',
    '--no-restore', '-c', 'Release', '-m:2',
    '--filter', 'FullyQualifiedName~FormatFilterTests',
    '--logger', 'trx;LogFileName=results.trx', '--results-directory', $tests) + $flags)
[xml]$trx = Get-Content (Join-Path $tests 'results.trx') -Raw
$rows = @($trx.TestRun.Results.UnitTestResult)
if ($rows.Count -ne 36 -or @($rows | Where-Object outcome -ne Passed).Count)
{
    throw "Expected all 36 original/preservation rows, obtained $($rows.Count)."
}
$rows | Select-Object testName, outcome | ConvertTo-Json -Depth 4 |
    Set-Content (Join-Path $tests 'row-validation.json') -Encoding utf8
Write-Output "$Variant`: all 36 owning rows inspected and passed."

$harness = Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'
if ($Variant -eq 'before')
{
    Invoke-RecordedDotNet 'restore-harness' (@('restore', $harness,
        '--configfile', (Join-Path $repo 'NuGet.config'), '-m:2') + $flags)
}
$buildLabel = if ($Variant -eq 'before') { 'build-harness-before' } else { "build-harness-$AfterSnapshot" }
Invoke-RecordedDotNet $buildLabel (@('build', $harness,
    '--no-restore', '-c', 'Release', '-m:2') + $flags)
$bin = Join-Path $run 'harness\bin\Release\net12.0'
$owner = 'Microsoft.AspNetCore.Mvc.Core.dll'
$tested = Join-Path $repo "artifacts\bin\Microsoft.AspNetCore.Mvc.Core.Test\Release\net12.0\$owner"
if ((Get-FileHash (Join-Path $bin $owner)).Hash -ne (Get-FileHash $tested).Hash)
{
    throw 'Harness does not contain the actual tested MVC owner.'
}
$contractLabel = if ($Variant -eq 'before') { 'before' } else { $AfterSnapshot }
$contracts = Join-Path $run "contracts-$contractLabel.json"
if (Test-Path -LiteralPath $contracts)
{
    throw 'Refusing to overwrite contracts.'
}
& dotnet (Join-Path $bin 'AutoPerf.Benchmarks.dll') --contracts --output $contracts *> (Join-Path $run "contracts-$contractLabel.log")
if ($LASTEXITCODE)
{
    Get-Content (Join-Path $run "contracts-$contractLabel.log") -Tail 25
    throw 'Actual owner contracts failed.'
}
$data = Get-Content $contracts -Raw | ConvertFrom-Json
if ($data.cases.Count -ne 30 -or $data.metadata_updates.Count -ne 4)
{
    throw 'Incomplete actual-owner contract report.'
}
if ($Variant -eq 'after' -and
    (Get-FileHash $contracts).Hash -ne (Get-FileHash (Join-Path $run 'contracts-before.json')).Hash)
{
    throw 'Original/proposed observable contracts changed.'
}
$snapshotOptions = @{}
if ($Variant -eq 'after')
{
    $snapshotOptions.ReuseHarnessFrom = 'before'
    $snapshotOptions.SnapshotName = $AfterSnapshot
}
& (Join-Path $PSScriptRoot 'autoperf-benchmarks.ps1') -Action Snapshot -Id F071 -Variant $Variant `
    -ProjectName AutoPerf.Benchmarks -TargetAssembly Microsoft.AspNetCore.Mvc.Core `
    -TargetSource 'src\Mvc\Mvc.Core\src\Formatters\FormatFilter.cs' `
    -AdditionalTargetSource 'src\Mvc\Mvc.Core\test\Formatters\FormatFilterTest.cs' `
    -BuildOutput $bin @snapshotOptions
Write-Output "$Variant`: 30 real-owner profiles, ordered live metadata updates, owner identity and frozen harness complete."
