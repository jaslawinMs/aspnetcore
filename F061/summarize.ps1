param([string]$RunRoot)

$ErrorActionPreference = 'Stop'
$run = if ($RunRoot) { $RunRoot } else { Join-Path $PSScriptRoot 'autoperf-runs\F061' }
$execution = @(Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
if ($execution.Count -notin 2, 4, 6 -or @($execution | Where-Object exit_code -ne 0).Count)
{
    throw 'One to three complete successful comparison pairs required.'
}
$rounds = $execution.Count / 2
$oracles = @(Get-Content (Join-Path $run 'contract-oracles.json') -Raw | ConvertFrom-Json)
$names = @($oracles.Case | Sort-Object -CaseSensitive)
if ($names.Count -ne 40 -or @($names | Sort-Object -CaseSensitive -Unique).Count -ne 40 -or
    @($oracles | Where-Object Scope -Like 'Actual chunk append*').Count -ne 34)
{
    throw 'Exactly40 named contracts,34 normal producer-owned and6 caller diagnostics,required.'
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
        throw 'Complete serialized alternating pairs required.'
    }
    $variants = @{}
    foreach ($event in $events)
    {
        $manifest = Get-Content (Join-Path $run "$($event.snapshot)-manifest.json") -Raw | ConvertFrom-Json
        $files = @(Get-ChildItem (Join-Path $run "$($event.label)\results") -File -Filter '*full*.json')
        if ($files.Count -ne 1)
        {
            throw 'Exactly one complete actual BDN JSON per launch required.'
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
            throw 'SDK/runtime/BenchmarkDotNet changed between paired launches.'
        }
        $variants[$event.variant] = @{}
        foreach ($result in $data.Benchmarks)
        {
            if ($result.FullName -notmatch 'Recipe:\s*([^)]+)\)')
            {
                throw 'Exact untruncated recipe identity missing;do not parse shortened Parameters/display columns.'
            }
            $name = $Matches[1]
            if ($name -cnotin $names -or $variants[$event.variant].ContainsKey($name) -or
                $result.Statistics.N -ne 8 -or $result.Statistics.OriginalValues.Count -ne 8 -or
                $result.Statistics.Mean -le 0 -or $null -eq $result.Memory.BytesAllocatedPerOperation)
            {
                throw 'Missing/duplicate/unmeasured exact actual case or iteration.'
            }
            $variants[$event.variant][$name] = $result
            $raw.Add([pscustomobject][ordered]@{
                round = $round; variant = $event.variant; snapshot = $event.snapshot; case = $name
                full_name = $result.FullName; shortened_display_parameters = $result.Parameters
                mean_ns = $result.Statistics.Mean; median_ns = $result.Statistics.Median
                standard_deviation_ns = $result.Statistics.StandardDeviation
                bytes_per_operation = $result.Memory.BytesAllocatedPerOperation
                measured_iterations = $result.Statistics.N; original_values = $result.Statistics.OriginalValues
                coefficient_of_variation_percent = 100 * $result.Statistics.StandardDeviation / $result.Statistics.Mean
            })
        }
        if ((($variants[$event.variant].Keys | Sort-Object -CaseSensitive) -join '|') -cne ($names -join '|'))
        {
            throw 'Every exact40-case recipe must be measured.'
        }
        foreach ($log in @('console.log', 'verify-contracts.log'))
        {
            $owners = @(Get-Content (Join-Path $run "$($event.label)\$log") |
                Where-Object { $_.StartsWith('AUTOPERF_OWNER ') } |
                ForEach-Object { $_.Substring('AUTOPERF_OWNER '.Length) | ConvertFrom-Json })
            if ($owners.Count -ne 1 -or $owners[0].SHA256 -cne $manifest.target_assembly_sha256)
            {
                throw 'Actual BDN or post-measurement process did not load the frozen public owner.'
            }
        }
        $verification = Get-Content (Join-Path $run "$($event.label)\verification-execution.json") -Raw | ConvertFrom-Json
        if ($verification.exit_code -ne 0 -or $verification.expected_contracts -ne 40 -or
            $verification.actual_repeated_workloads -ne 80 -or
            [DateTimeOffset]::Parse($verification.started_at) -lt [DateTimeOffset]::Parse($event.completed_at))
        {
            throw 'Actual separate post-measurement verification timing/outcomes missing.'
        }
        $receipts = @(Get-Content (Join-Path $run "$($event.label)\verify-contracts.log") |
            Where-Object { $_.StartsWith('AUTOPERF_CONTRACT ') } |
            ForEach-Object { $_.Substring('AUTOPERF_CONTRACT '.Length) | ConvertFrom-Json })
        if ((($receipts.Case | Sort-Object -CaseSensitive) -join '|') -cne ($names -join '|'))
        {
            throw 'Every full original protocol/error contract must occur exactly once.'
        }
        foreach ($receipt in $receipts)
        {
            $expected = @($oracles | Where-Object Case -ceq $receipt.Case)
            if ($expected.Count -ne 1 -or
                ($receipt | ConvertTo-Json -Depth 18 -Compress) -cne ($expected[0] | ConvertTo-Json -Depth 18 -Compress))
            {
                throw 'Complete ordered cookie producer/output/request/error/partial-header state changed.'
            }
            $contracts.Add([pscustomobject][ordered]@{
                label = $event.label; phase = 'Separate post-measurement immutable-owner process'
                actual_repeated_workloads_checked = 2
                bdn_global_setup_also_checks_same_contract_twice_but_does_not_emit_receipts = $true
                verified_original_contract = $receipt
            })
        }
    }
    foreach ($name in $names)
    {
        $before = $variants.before[$name]
        $after = $variants.after[$name]
        $oracle = @($oracles | Where-Object Case -ceq $name)[0]
        $pairs.Add([pscustomobject][ordered]@{
            round = $round; case = $name; scope = $oracle.Scope
            normal_append_producer = $oracle.Scope.StartsWith('Actual chunk append')
            response_filter_reached = $oracle.InitialSetCookie.Count -gt 0
            initial_response_headers = $oracle.InitialSetCookie.Count; produced_chunks = $oracle.ActualProducedChunks
            after_snapshot = @($events | Where-Object variant -eq after)[0].snapshot
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
$aggregate = foreach ($name in $names)
{
    $rows = @($pairs | Where-Object case -ceq $name)
    $ratios = @($rows.time_change_percent | Sort-Object)
    $median = if ($ratios.Count % 2) { $ratios[[int][Math]::Floor($ratios.Count / 2)] }
        else { ($ratios[$ratios.Count / 2 - 1] + $ratios[$ratios.Count / 2]) / 2 }
    [pscustomobject][ordered]@{
        case = $name; scope = $rows[0].scope; normal_append_producer = $rows[0].normal_append_producer
        response_filter_reached = $rows[0].response_filter_reached
        comparisons = $rows.Count; median_time_change_percent = $median
        faster_every_pair = @($rows | Where-Object time_change_percent -ge 0).Count -eq 0
        slower_every_pair = @($rows | Where-Object time_change_percent -le 0).Count -eq 0
        every_heap_pair_unchanged = @($rows | Where-Object allocation_change_bytes -ne 0).Count -eq 0
        every_heap_pair_reduced = @($rows | Where-Object allocation_change_bytes -ge 0).Count -eq 0
        maximum_cv_percent = ($rows.maximum_cv_percent | Measure-Object -Maximum).Maximum
        pairs = $rows
    }
}
$raw.ToArray() | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $run 'raw-case-outcomes.json') -Encoding utf8
$pairs.ToArray() | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $run 'all-paired-outcomes.json') -Encoding utf8
$aggregate | ConvertTo-Json -Depth 14 | Set-Content (Join-Path $run 'aggregate-outcomes.json') -Encoding utf8
$contracts.ToArray() | ConvertTo-Json -Depth 20 | Set-Content (Join-Path $run 'setup-correctness.json') -Encoding utf8
$aggregate | Select-Object case,median_time_change_percent,every_heap_pair_reduced,maximum_cv_percent | Format-Table -AutoSize
Write-Output "$rounds pairs;$($raw.Count) actual outcomes;$($pairs.Count) ratios;$($contracts.Count) original post-measurement contracts;$($contracts.Count * 2) complete repeated workloads."
