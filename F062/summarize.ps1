param([string]$RunRoot)
$ErrorActionPreference = 'Stop'
$run = if ($RunRoot) { $RunRoot } else { Join-Path $PSScriptRoot 'autoperf-runs\F062' }
$execution = @(Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
$budget = Get-Content (Join-Path $run 'measurement-budget-closed.json') -Raw | ConvertFrom-Json
if ($execution.Count -ne 6 -or $budget.completed_comparisons -ne 3 -or
    $budget.further_measurement_permitted -or @($execution | Where-Object exit_code -ne 0).Count)
{
    throw 'Exactly three closed actual pairs, not three pairs per harness, are required.'
}
$raw = [Collections.Generic.List[object]]::new()
$pairs = [Collections.Generic.List[object]]::new()
$environment = $null
$canonicalNames = $null
foreach ($round in @(1,2,3))
{
    $events = @($execution | Where-Object round -eq $round)
    $order = if ($round -eq 2) { 'after|before' } else { 'before|after' }
    $count = if ($round -eq 1) { 18 } else { 22 }
    if ($events.Count -ne 2 -or ($events.variant -join '|') -cne $order -or
        [DateTimeOffset]::Parse($events[1].started_at) -lt [DateTimeOffset]::Parse($events[0].completed_at))
    {
        throw 'All actual pairs must be serialized in their recorded alternating order.'
    }
    $variants = @{}
    foreach ($event in $events)
    {
        $manifest = Get-Content (Join-Path $run "$($event.snapshot)-manifest.json") -Raw | ConvertFrom-Json
        $reports = @(Get-ChildItem (Join-Path $run "$($event.label)\results") -File -Filter '*full*.json')
        if ($reports.Count -ne 2)
        {
            throw 'Both full request/shutdown JSON reports must be retained.'
        }
        $variants[$event.variant] = @{}
        foreach ($file in $reports)
        {
            $report = Get-Content $file.FullName -Raw | ConvertFrom-Json
            if ($null -eq $environment)
            {
                $environment = $report.HostEnvironmentInfo
            }
            elseif ($report.HostEnvironmentInfo.RuntimeVersion -cne $environment.RuntimeVersion -or
                $report.HostEnvironmentInfo.DotNetCliVersion -cne $environment.DotNetCliVersion -or
                $report.HostEnvironmentInfo.BenchmarkDotNetVersion -cne $environment.BenchmarkDotNetVersion)
            {
                throw 'Actual SDK/runtime/BenchmarkDotNet identity changed.'
            }
            foreach ($result in $report.Benchmarks)
            {
                $recipe = [regex]::Match($result.FullName, 'Recipe: "([^"]+)"')
                $prepared = [regex]::Match($result.FullName, 'CompletedRequests: (\d+)')
                $shutdown = $result.Type -ceq 'ProxyShutdownBenchmark'
                if (-not $recipe.Success -or ($shutdown -and -not $prepared.Success) -or
                    $variants[$event.variant].ContainsKey($result.FullName) -or
                    $result.Statistics.N -ne 8 -or $result.Statistics.OriginalValues.Count -ne 8 -or
                    $result.Statistics.Mean -le 0 -or $null -eq $result.Memory.BytesAllocatedPerOperation)
                {
                    throw 'Missing/duplicate exact FullName identity, sample, time or heap result.'
                }
                $variants[$event.variant][$result.FullName] = $result
                $raw.Add([pscustomobject][ordered]@{
                    round=$round;variant=$event.variant;snapshot=$event.snapshot;full_name=$result.FullName
                    recipe=$recipe.Groups[1].Value;shutdown=$shutdown
                    completed_requests=$(if ($shutdown) { [int]$prepared.Groups[1].Value } else { $null })
                    canonical_definition=($round -ge 2);mean_ns=$result.Statistics.Mean
                    median_ns=$result.Statistics.Median;standard_deviation_ns=$result.Statistics.StandardDeviation
                    measured_iterations=$result.Statistics.N;original_values=$result.Statistics.OriginalValues
                    bytes_per_operation=$result.Memory.BytesAllocatedPerOperation
                    coefficient_of_variation_percent=100*$result.Statistics.StandardDeviation/$result.Statistics.Mean
                })
            }
        }
        if ($variants[$event.variant].Count -ne $count)
        {
            throw 'Each role must contain exactly its original18 or corrected22 cases.'
        }
        $owners = @(Get-Content (Join-Path $run "$($event.label)\console.log") |
            Where-Object { $_.StartsWith('AUTOPERF_OWNER ') } |
            ForEach-Object { $_.Substring('AUTOPERF_OWNER '.Length) | ConvertFrom-Json })
        if ($owners.Count -ne $count + 1 -or @($owners | Where-Object {
            $_.sha256 -cne $manifest.target_assembly_sha256 -or -not $_.actual_public_owner_beside_harness -or
            $_.installed_aspnet_framework_fallback
        }).Count)
        {
            throw 'Entrypoint and every actual case must identify the frozen shipping owner.'
        }
    }
    $names = @($variants.before.Keys | Sort-Object -CaseSensitive)
    if (($names -join '|') -cne (($variants.after.Keys | Sort-Object -CaseSensitive) -join '|'))
    {
        throw 'Before/after full case identities differ.'
    }
    if ($round -eq 2)
    {
        $canonicalNames = $names
    }
    elseif ($round -eq 3 -and ($names -join '|') -cne ($canonicalNames -join '|'))
    {
        throw 'Final corrected definition changed between comparisons.'
    }
    foreach ($name in $names)
    {
        $before = $variants.before[$name]; $after = $variants.after[$name]
        $recipe = [regex]::Match($name, 'Recipe: "([^"]+)"').Groups[1].Value
        $prepared = [regex]::Match($name, 'CompletedRequests: (\d+)')
        $shutdown = $before.Type -ceq 'ProxyShutdownBenchmark'
        $reached = $recipe -cne 'FactoryThrows' -and (-not $shutdown -or [int]$prepared.Groups[1].Value -gt 0)
        $pairs.Add([pscustomobject][ordered]@{
            round=$round;full_name=$name;recipe=$recipe;shutdown=$shutdown
            completed_requests=$(if ($shutdown) { [int]$prepared.Groups[1].Value } else { $null })
            owner_link_creation_reached=$reached;host_only_link=($reached -and $recipe -ceq 'Http200UncancelableRequest')
            canonical_definition=($round -ge 2)
            time_change_percent=100*($after.Statistics.Mean/$before.Statistics.Mean-1)
            before_ns=$before.Statistics.Mean;after_ns=$after.Statistics.Mean
            before_bytes=$before.Memory.BytesAllocatedPerOperation;after_bytes=$after.Memory.BytesAllocatedPerOperation
            allocation_change_bytes=$after.Memory.BytesAllocatedPerOperation-$before.Memory.BytesAllocatedPerOperation
            maximum_cv_percent=[Math]::Max(100*$before.Statistics.StandardDeviation/$before.Statistics.Mean,
                100*$after.Statistics.StandardDeviation/$after.Statistics.Mean)
        })
    }
}
$aggregate = foreach ($name in $canonicalNames)
{
    $rows = @($pairs | Where-Object { $_.full_name -ceq $name -and $_.canonical_definition })
    if ($rows.Count -ne 2)
    {
        throw 'Only corrected comparisons2/3 may enter aggregation.'
    }
    [pscustomobject][ordered]@{
        full_name=$name;recipe=$rows[0].recipe;shutdown=$rows[0].shutdown;completed_requests=$rows[0].completed_requests
        owner_link_creation_reached=$rows[0].owner_link_creation_reached;host_only_link=$rows[0].host_only_link
        comparisons=2;median_time_change_percent=($rows[0].time_change_percent+$rows[1].time_change_percent)/2
        faster_every_pair=(@($rows | Where-Object time_change_percent -ge 0).Count -eq 0)
        every_heap_pair_reduced=(@($rows | Where-Object allocation_change_bytes -ge 0).Count -eq 0)
        maximum_cv_percent=($rows.maximum_cv_percent | Measure-Object -Maximum).Maximum
        pairs=$rows
    }
}
if ($raw.Count -ne 124 -or $pairs.Count -ne 62 -or @($raw | Where-Object canonical_definition).Count -ne 88 -or
    @($pairs | Where-Object canonical_definition).Count -ne 44 -or @($aggregate).Count -ne 22)
{
    throw 'All first and corrected definitions must be fully accounted, never reset or silently dropped.'
}
$raw.ToArray() | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $run 'raw-case-outcomes.json') -Encoding utf8
$pairs.ToArray() | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $run 'all-paired-outcomes.json') -Encoding utf8
@($pairs | Where-Object canonical_definition -eq $false) | ConvertTo-Json -Depth 10 |
    Set-Content (Join-Path $run 'comparison-one-paired-outcomes.json') -Encoding utf8
$aggregate | ConvertTo-Json -Depth 14 | Set-Content (Join-Path $run 'aggregate-outcomes.json') -Encoding utf8
$environment | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'actual-bdn-environment.json') -Encoding utf8
$aggregate | Select-Object recipe,shutdown,completed_requests,median_time_change_percent,faster_every_pair,every_heap_pair_reduced,maximum_cv_percent | Format-Table -AutoSize
Write-Output '124 actual outcomes/62 pairs;first18 pairs excluded from aggregation;corrected88 outcomes/44 pairs/22 rows;all992 samples and130 actual owner markers accounted.'
