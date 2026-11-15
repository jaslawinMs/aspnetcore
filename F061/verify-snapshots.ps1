param([Parameter(Mandatory)][ValidateRange(1, 3)][int]$Round)

$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F061'
. C:\src\aspnetcore\activate.ps1
$events = @(Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json |
    Where-Object round -eq $Round)
if ($events.Count -ne 2 -or @($events | Where-Object exit_code -ne 0).Count)
{
    throw 'A closed successful comparison is required before post-measurement verification.'
}
foreach ($event in $events)
{
    $output = Join-Path $run "$($event.label)\verify-contracts.log"
    if (Test-Path $output)
    {
        throw 'Refusing to overwrite an existing post-measurement verification.'
    }
    $started = [DateTimeOffset]::UtcNow
    $dll = Join-Path $run "binaries\$($event.snapshot)\AutoPerf.Benchmarks.dll"
    dotnet $dll --verify-setups *> $output
    if ($LASTEXITCODE -ne 0)
    {
        throw "Post-measurement full original contract verification failed: $($event.label)."
    }
    [ordered]@{
        label = $event.label
        snapshot = $event.snapshot
        phase = 'Separate immutable-snapshot process after measured comparison;not part of timing'
        started_at = $started.ToString('o')
        completed_at = [DateTimeOffset]::UtcNow.ToString('o')
        arguments = @($dll, '--verify-setups')
        exit_code = 0
        expected_contracts = 40
        actual_repeated_workloads = 80
    } | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $run "$($event.label)\verification-execution.json") -Encoding utf8
}
Write-Output "Comparison${Round}: both frozen public owners verified all40 original contracts twice after measurement."
