param([string]$RunRoot)
$ErrorActionPreference = 'Stop'
$run = if ($RunRoot) { $RunRoot } else { Join-Path $PSScriptRoot 'autoperf-runs\F069' }
$execution = @(Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
$budget = Get-Content (Join-Path $run 'measurement-budget-closed.json') -Raw | ConvertFrom-Json
if ($execution.Count -ne 6 -or $budget.completed_comparisons -ne 3 -or
    $budget.further_measurement_permitted -or @($execution | Where-Object exit_code -ne 0).Count)
{
    throw 'Exactly three closed actual comparisons are required.'
}
$raw = [Collections.Generic.List[object]]::new()
$pairs = [Collections.Generic.List[object]]::new()
$environment = $null
$canonicalNames = $null
foreach ($round in @(1,2,3))
{
    $events = @($execution | Where-Object round -eq $round)
    $order = if ($round -eq 2) { 'after|before' } else { 'before|after' }
    $afterSnapshot = if ($round -eq 1) { 'after' } else { "after-$round" }
    if ($events.Count -ne 2 -or ($events.variant -join '|') -cne $order -or
        [DateTimeOffset]::Parse($events[1].started_at) -lt [DateTimeOffset]::Parse($events[0].completed_at) -or
        @($events | Where-Object { $_.snapshot -cne $(if ($_.variant -eq 'before') { 'before' } else { $afterSnapshot }) }).Count)
    {
        throw 'Actual launches must retain their serialized alternating order and distinct source snapshots.'
    }
    $variants = @{}
    foreach ($event in $events)
    {
        $manifest = Get-Content (Join-Path $run "$($event.snapshot)-manifest.json") -Raw | ConvertFrom-Json
        $reports = @(Get-ChildItem (Join-Path $run "$($event.label)\results") -File -Filter '*full*.json')
        if ($reports.Count -ne 2)
        {
            throw 'Both complete selection and construction reports must be retained.'
        }
        $variants[$event.variant] = @{}
        foreach ($file in $reports)
        {
            $report = Get-Content $file.FullName -Raw | ConvertFrom-Json
            if ($null -eq $environment)
            {
                $environment = $report.HostEnvironmentInfo
            }
            foreach ($field in @('RuntimeVersion','DotNetCliVersion','BenchmarkDotNetVersion','Architecture','OsVersion','Configuration'))
            {
                if ($report.HostEnvironmentInfo.$field -cne $environment.$field)
                {
                    throw "Actual environment identity changed:$field"
                }
            }
            foreach ($result in $report.Benchmarks)
            {
                $recipe = [regex]::Match($result.FullName, '^AutoPerf\.SniSelectionBenchmark\.SelectOptions\(Recipe: "([^"]+)"\)$')
                $construction = [regex]::Match($result.FullName, '^AutoPerf\.SniConstructionBenchmark\.ConstructSelector\(Patterns: (1|8|64|512)\)$')
                if ((-not $recipe.Success -and -not $construction.Success) -or
                    $variants[$event.variant].ContainsKey($result.FullName) -or
                    $result.Statistics.N -ne 8 -or $result.Statistics.OriginalValues.Count -ne 8 -or
                    -not [double]::IsFinite($result.Statistics.Mean) -or $result.Statistics.Mean -le 0 -or
                    $null -eq $result.Memory.BytesAllocatedPerOperation)
                {
                    throw 'Missing exact case identity, eight samples, finite time or memory diagnostics.'
                }
                $variants[$event.variant][$result.FullName] = $result
                $raw.Add([pscustomobject][ordered]@{
                    round=$round;variant=$event.variant;snapshot=$event.snapshot;full_name=$result.FullName
                    case=$(if ($construction.Success) { "Construct/$($construction.Groups[1].Value)" } else { $recipe.Groups[1].Value })
                    construction=$construction.Success;final_definition=($round -eq 3)
                    mean_ns=$result.Statistics.Mean;median_ns=$result.Statistics.Median
                    standard_deviation_ns=$result.Statistics.StandardDeviation
                    original_values=$result.Statistics.OriginalValues;measured_iterations=$result.Statistics.N
                    bytes_per_operation=$result.Memory.BytesAllocatedPerOperation
                    coefficient_of_variation_percent=100*$result.Statistics.StandardDeviation/$result.Statistics.Mean
                })
            }
        }
        if ($variants[$event.variant].Count -ne 33)
        {
            throw 'Exactly29 selection and4 construction cases are required per role.'
        }
        $owners = @(Get-Content (Join-Path $run "$($event.label)\console.log") |
            Where-Object { $_.StartsWith('AUTOPERF_OWNER ') } |
            ForEach-Object { $_.Substring('AUTOPERF_OWNER '.Length) | ConvertFrom-Json })
        if ($owners.Count -ne 34 -or @($owners | Where-Object {
            $_.sha256 -cne $manifest.target_assembly_sha256 -or
            -not $_.actual_shipping_owner_beside_harness -or
            -not $_.actual_certificate_configuration_loader_no_recording_proxy -or
            -not $_.reflection_only_prepares_constructor_and_typed_delegate_outside_timing -or
            $_.installed_aspnet_framework_fallback
        }).Count)
        {
            throw 'Entrypoint and every timed case must identify the exact frozen shipping owner.'
        }
    }
    $names = @($variants.before.Keys | Sort-Object -CaseSensitive)
    if (($names -join '|') -cne (($variants.after.Keys | Sort-Object -CaseSensitive) -join '|'))
    {
        throw 'Before/after full case identities differ.'
    }
    if ($round -eq 1)
    {
        $canonicalNames = $names
    }
    elseif (($names -join '|') -cne ($canonicalNames -join '|'))
    {
        throw 'Harness case identities changed between source strategies.'
    }
    foreach ($name in $names)
    {
        $before = $variants.before[$name]; $after = $variants.after[$name]
        $row = @($raw | Where-Object { $_.round -eq $round -and $_.variant -eq 'before' -and $_.full_name -ceq $name })[0]
        $pairs.Add([pscustomobject][ordered]@{
            round=$round;after_snapshot=$afterSnapshot;full_name=$name;case=$row.case;construction=$row.construction
            final_definition=($round -eq 3)
            before_ns=$before.Statistics.Mean;after_ns=$after.Statistics.Mean
            time_change_percent=100*($after.Statistics.Mean/$before.Statistics.Mean-1)
            before_bytes=$before.Memory.BytesAllocatedPerOperation;after_bytes=$after.Memory.BytesAllocatedPerOperation
            allocation_change_bytes=$after.Memory.BytesAllocatedPerOperation-$before.Memory.BytesAllocatedPerOperation
            maximum_cv_percent=[Math]::Max(100*$before.Statistics.StandardDeviation/$before.Statistics.Mean,
                100*$after.Statistics.StandardDeviation/$after.Statistics.Mean)
        })
    }
}
if ($raw.Count -ne 198 -or $pairs.Count -ne 99 -or
    @($raw | Where-Object final_definition).Count -ne 66 -or @($pairs | Where-Object final_definition).Count -ne 33)
{
    throw 'Every actual outcome and distinct source definition must be accounted.'
}
$raw.ToArray() | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $run 'raw-case-outcomes.json') -Encoding utf8
$pairs.ToArray() | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $run 'all-paired-outcomes.json') -Encoding utf8
@($pairs | Where-Object final_definition) | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $run 'final-outcomes.json') -Encoding utf8
$environment | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'actual-bdn-environment.json') -Encoding utf8

$tests = [Collections.Generic.List[object]]::new()
$expandedNames = $null
foreach ($phase in @(
    @{name='tests-original';count=31}
    @{name='tests-preservation-original';count=39}
    @{name='tests-proposed-1';count=39}
    @{name='tests-preservation-original-expanded';count=47}
    @{name='tests-proposed-2-corrected';count=47}
    @{name='tests-proposed-3';count=47}
))
{
    [xml]$trx = Get-Content (Join-Path $run "$($phase.name)\results.trx") -Raw
    $ns = [Xml.XmlNamespaceManager]::new($trx.NameTable)
    $ns.AddNamespace('t',$trx.DocumentElement.NamespaceURI)
    $rows = @($trx.SelectNodes('//t:UnitTestResult',$ns))
    if ($rows.Count -ne $phase.count -or @($rows | Where-Object outcome -cne 'Passed').Count)
    {
        throw "Every actual test row must pass:$($phase.name)"
    }
    if ($phase.count -eq 47)
    {
        $rowNames = ($rows.testName | Sort-Object -CaseSensitive) -join '|'
        if ($null -eq $expandedNames) { $expandedNames = $rowNames }
        elseif ($rowNames -cne $expandedNames) { throw 'Expanded original and proposed test-row identities differ.' }
        foreach ($requirement in @(
            @{name='MatchesWildcardSuffixesAtSuccessiveLabelBoundaries';count=8}
            @{name='WildcardSuffixMatchingPreservesOrdinalIgnoreCaseAndRawIdnNames';count=6}
            @{name='ReconstructingSelectorUsesUpdatedSniConfiguration';count=2}
        ))
        {
            if (@($rows | Where-Object { $_.testName.Contains($requirement.name + '(') }).Count -ne $requirement.count)
            {
                throw "A focused preservation row is missing:$($requirement.name)"
            }
        }
    }
    foreach ($row in $rows)
    {
        $tests.Add([pscustomobject][ordered]@{phase=$phase.name;test_name=$row.testName;outcome=$row.outcome})
    }
}
if ($tests.Count -ne 250)
{
    throw 'All six actual test phases must retain250 original/proposed passing outcomes.'
}
$tests.ToArray() | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'all-test-outcomes.json') -Encoding utf8
@{
    comparisons=3;distinct_source_strategies=3;harness_changes_between_measurements=0
    raw_outcomes=198;paired_outcomes=99;actual_samples=1584;owner_markers=204
    final_outcomes=66;final_pairs=33;final_strategy_comparisons=1
    every_actual_outcome_accounted=$true;every_owner_marker_matches_manifest=$true
    all_test_outcomes=250;all_test_outcomes_passed=$true;expanded_original_and_proposed_test_rows_equal=$true
    original_functional_red_claim=$false;further_measurement_permitted=$false
} | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'summary-audit.json') -Encoding utf8
Write-Output '198 outcomes/99 pairs/1584 samples/204 owner markers;final strategy only33 pairs;all250 test rows passed;no aggregation across source strategies.'
