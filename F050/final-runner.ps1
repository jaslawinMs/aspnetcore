param()

$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F050'
$execution = @(Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
if ($execution.Count -ne 4 -or @($execution | Where-Object exit_code -ne 0).Count -or
    ($execution.label -join '|') -cne 'round-1-before|round-1-after|round-2-after|round-2-before')
{
    throw 'The final run must be exactly comparison3 following two preserved complete comparisons.'
}
. (Join-Path $repo 'activate.ps1')
$sdk = dotnet --version
if ($LASTEXITCODE -ne 0)
{
    throw 'Pinned SDK activation failed.'
}
$before = Get-Content (Join-Path $run 'before-final-manifest.json') -Raw | ConvertFrom-Json
$after = Get-Content (Join-Path $run 'after-3-manifest.json') -Raw | ConvertFrom-Json
if ($before.benchmark_assembly_sha256 -cne $after.benchmark_assembly_sha256 -or
    $before.runtime_configuration_sha256 -cne $after.runtime_configuration_sha256 -or
    $before.dependency_configuration_sha256 -cne $after.dependency_configuration_sha256 -or
    $before.target_assembly_sha256 -ceq $after.target_assembly_sha256)
{
    throw 'The final paired harness/dependencies must match and owners must differ.'
}
foreach ($manifest in @($before, $after))
{
    foreach ($pair in @(
        @($manifest.target_assembly, $manifest.target_assembly_sha256),
        @('AutoPerf.Benchmarks.dll', $manifest.benchmark_assembly_sha256),
        @('AutoPerf.Benchmarks.runtimeconfig.json', $manifest.runtime_configuration_sha256),
        @('AutoPerf.Benchmarks.deps.json', $manifest.dependency_configuration_sha256)
    ))
    {
        if ((Get-FileHash (Join-Path $run "binaries\$($manifest.snapshot)\$($pair[0])")).Hash -cne $pair[1])
        {
            throw 'An immutable final executable or configuration changed.'
        }
    }
}
foreach ($variant in @('before', 'after'))
{
    $snapshot = if ($variant -eq 'before') { 'before-final' } else { 'after-3' }
    $label = "round-3-$variant"
    $output = Join-Path $run $label
    if (Test-Path -LiteralPath $output)
    {
        throw "Refusing to replace existing final comparison artifacts: $label"
    }
    New-Item -ItemType Directory -Path $output | Out-Null
    $arguments = @(
        (Join-Path $run "binaries\$snapshot\AutoPerf.Benchmarks.dll"),
        '--filter', '*AcceptHeaderParsingBenchmark*', '--inProcess',
        '--exporters', 'json', 'csv', '--artifacts', $output,
        '--job', 'Short', '--warmupCount', '3', '--iterationCount', '8',
        '--iterationTime', '100', '--outliers', 'DontRemove'
    )
    $started = [DateTimeOffset]::UtcNow
    Write-Output "Starting $label with final harness and immutable $snapshot owner."
    dotnet @arguments *> (Join-Path $output 'console.log')
    $code = $LASTEXITCODE
    $execution += [pscustomobject]@{
        round = 3
        variant = $variant
        snapshot = $snapshot
        label = $label
        started_at = $started.ToString('o')
        completed_at = [DateTimeOffset]::UtcNow.ToString('o')
        sdk = $sdk
        arguments = $arguments
        exit_code = $code
        harness_revision = 'final-indexed-checksum'
        oracle_file = 'contract-oracles-final.json'
    }
    $execution | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'execution.json') -Encoding utf8
    if ($code -ne 0)
    {
        throw "Final measured launch failed: $label; preserved its artifacts and consumed budget."
    }
    $files = @(Get-ChildItem (Join-Path $output 'results') -File -Filter '*full*.json')
    if ($files.Count -ne 1)
    {
        throw 'Final launch must produce one full original report.'
    }
    $results = Get-Content $files[0].FullName -Raw | ConvertFrom-Json
    if ($results.Benchmarks.Count -ne 39 -or
        @($results.Benchmarks | Where-Object { $_.Statistics.N -ne 8 -or $_.Statistics.Mean -le 0 -or
            $null -eq $_.Memory.BytesAllocatedPerOperation }).Count)
    {
        throw 'Final launch contains an incomplete measured case or missing memory diagnostics.'
    }
    Write-Output "Completed $label,39 measured cases."
}
& (Join-Path $PSScriptRoot 'F050-summarize.ps1')
