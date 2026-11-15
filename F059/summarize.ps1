param([string]$RunRoot)

$ErrorActionPreference = 'Stop'
$run = if ($RunRoot) { $RunRoot } else { Join-Path $PSScriptRoot 'autoperf-runs\F059' }
$execution = @(Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
if ($execution.Count -notin 2, 4, 6 -or @($execution | Where-Object exit_code -ne 0).Count)
{
    throw 'One to three complete actual successful pairs required.'
}
$rounds = $execution.Count / 2
$oracles = @(Get-Content (Join-Path $run 'contract-oracles.json') -Raw | ConvertFrom-Json)
$names = @($oracles.Case | Sort-Object)
if ($names.Count -ne 26 -or @($names | Sort-Object -Unique).Count -ne 26 -or
    @($oracles | Where-Object Scope -Like 'Actual RazorView*').Count -ne 14)
{
    throw 'Fixed26-case corpus and14 actual RazorView producers required.'
}
$raw = [Collections.Generic.List[object]]::new()
$pairs = [Collections.Generic.List[object]]::new()
$contracts = [Collections.Generic.List[object]]::new()
$environment = $null
for ($round = 1; $round -le $rounds; $round++)
{
    $events = @($execution | Where-Object round -eq $round)
    $order = if ($round % 2) { 'before|after' } else { 'after|before' }
    if ($events.Count -ne 2 -or ($events.variant -join '|') -cne $order -or
        [DateTimeOffset]::Parse($events[1].started_at) -lt [DateTimeOffset]::Parse($events[0].completed_at))
    {
        throw 'Serialized alternating complete pair order required.'
    }
    $variants = @{}
    foreach ($event in $events)
    {
        $label = $event.label
        $manifest = Get-Content (Join-Path $run "$($event.snapshot)-manifest.json") -Raw | ConvertFrom-Json
        $files = @(Get-ChildItem (Join-Path $run "$label\results") -File -Filter '*full*.json')
        if ($files.Count -ne 1)
        {
            throw 'Exactly one actual complete BDN JSON required.'
        }
        $data = Get-Content $files[0].FullName -Raw | ConvertFrom-Json
        if ($null -eq $environment)
        {
            $environment = $data.HostEnvironmentInfo
        }
        elseif ($data.HostEnvironmentInfo.RuntimeVersion -cne $environment.RuntimeVersion -or
            $data.HostEnvironmentInfo.DotNetCliVersion -cne $environment.DotNetCliVersion -or
            $data.HostEnvironmentInfo.BenchmarkDotNetVersion -cne $environment.BenchmarkDotNetVersion)
        {
            throw 'Actual SDK/runtime/BDN environments differ.'
        }
        $variants[$event.variant] = @{}
        foreach ($result in $data.Benchmarks)
        {
            if ($result.FullName -notmatch 'Case:\s*"([^"]+)"')
            {
                throw 'Unresolved exact named case.'
            }
            $name = $Matches[1]
            if ($name -notin $names -or $variants[$event.variant].ContainsKey($name) -or
                $result.Statistics.N -ne 8 -or $result.Statistics.OriginalValues.Count -ne 8 -or
                $result.Statistics.Mean -le 0 -or $null -eq $result.Memory.BytesAllocatedPerOperation)
            {
                throw 'Missing/duplicate/unmeasured actual case or iteration.'
            }
            $variants[$event.variant][$name] = $result
            $raw.Add([pscustomobject]@{
                round = $round; variant = $event.variant; snapshot = $event.snapshot; case = $name
                full_name = $result.FullName; mean_ns = $result.Statistics.Mean
                standard_deviation_ns = $result.Statistics.StandardDeviation
                bytes_per_operation = $result.Memory.BytesAllocatedPerOperation
                measured_iterations = $result.Statistics.N
                coefficient_of_variation_percent = 100 * $result.Statistics.StandardDeviation / $result.Statistics.Mean
            })
        }
        if ((($variants[$event.variant].Keys | Sort-Object) -join '|') -cne ($names -join '|'))
        {
            throw 'Complete26-case corpus missing.'
        }
        $console = @(Get-Content (Join-Path $run "$label\console.log"))
        $owners = @($console | Where-Object { $_.StartsWith('AUTOPERF_OWNER ') } |
            ForEach-Object { $_.Substring('AUTOPERF_OWNER '.Length) | ConvertFrom-Json })
        if ($owners.Count -ne 1 -or $owners[0].SHA256 -cne $manifest.target_assembly_sha256)
        {
            throw 'Actual loaded frozen owner differs from its manifest.'
        }
        $receipts = @($console | Where-Object { $_.StartsWith('AUTOPERF_CONTRACT ') } |
            ForEach-Object { $_.Substring('AUTOPERF_CONTRACT '.Length) | ConvertFrom-Json })
        if ((($receipts.Case | Sort-Object) -join '|') -cne ($names -join '|'))
        {
            throw 'Every actual complete contract must occur exactly once.'
        }
        foreach ($receipt in $receipts)
        {
            $expected = @($oracles | Where-Object Case -ceq $receipt.Case)
            if ($expected.Count -ne 1 -or
                ($receipt | ConvertTo-Json -Depth 16 -Compress) -cne ($expected[0] | ConvertTo-Json -Depth 16 -Compress))
            {
                throw 'Actual output/body/token/section/error/dictionary state differs from original.'
            }
            $contracts.Add([pscustomobject]@{ label = $label; actual_repeated_workloads_checked = 2; verified_original_contract = $receipt })
        }
    }
    foreach ($name in $names)
    {
        $before = $variants.before[$name]
        $after = $variants.after[$name]
        $oracle = @($oracles | Where-Object Case -ceq $name)[0]
        $pairs.Add([pscustomobject][ordered]@{
            round = $round; case = $name; scope = $oracle.Scope
            actual_view_producer = $name.StartsWith('View_'); after_snapshot = @($events | Where-Object variant -eq after)[0].snapshot
            verified_original_contract = $true
            time_change_percent = 100 * ($after.Statistics.Mean / $before.Statistics.Mean - 1)
            before_ns = $before.Statistics.Mean; after_ns = $after.Statistics.Mean
            before_bytes = $before.Memory.BytesAllocatedPerOperation; after_bytes = $after.Memory.BytesAllocatedPerOperation
            allocation_change_bytes = $after.Memory.BytesAllocatedPerOperation - $before.Memory.BytesAllocatedPerOperation
            maximum_cv_percent = [Math]::Max(100 * $before.Statistics.StandardDeviation / $before.Statistics.Mean,
                100 * $after.Statistics.StandardDeviation / $after.Statistics.Mean)
        })
    }
}
$finalSnapshot = @($execution | Where-Object variant -eq after)[-1].snapshot
$aggregate = foreach ($name in $names)
{
    $rows = @($pairs | Where-Object { $_.case -ceq $name -and $_.after_snapshot -ceq $finalSnapshot })
    $ratios = @($rows.time_change_percent | Sort-Object)
    $median = if ($ratios.Count % 2) { $ratios[[int][Math]::Floor($ratios.Count / 2)] }
        else { ($ratios[$ratios.Count / 2 - 1] + $ratios[$ratios.Count / 2]) / 2 }
    [pscustomobject][ordered]@{
        case = $name; scope = $rows[0].scope; actual_view_producer = $rows[0].actual_view_producer
        comparisons = $rows.Count; after_snapshot = $finalSnapshot
        median_time_change_percent = $median; faster_every_pair = @($rows | Where-Object time_change_percent -ge 0).Count -eq 0
        slower_every_pair = @($rows | Where-Object time_change_percent -le 0).Count -eq 0
        every_heap_pair_unchanged = @($rows | Where-Object allocation_change_bytes -ne 0).Count -eq 0
        maximum_cv_percent = ($rows.maximum_cv_percent | Measure-Object -Maximum).Maximum
        pairs = $rows
    }
}
$raw.ToArray() | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'raw-case-outcomes.json') -Encoding utf8
$pairs.ToArray() | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'all-paired-outcomes.json') -Encoding utf8
$aggregate | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $run 'aggregate-outcomes.json') -Encoding utf8
$contracts.ToArray() | ConvertTo-Json -Depth 18 | Set-Content (Join-Path $run 'setup-correctness.json') -Encoding utf8
$aggregate | Select-Object case,median_time_change_percent,every_heap_pair_unchanged,maximum_cv_percent | Format-Table -AutoSize
Write-Output "$rounds pairs;$($raw.Count) outcomes;$($pairs.Count) ratios;$($contracts.Count) complete original contracts;$($contracts.Count * 2) actual repeated workloads."
