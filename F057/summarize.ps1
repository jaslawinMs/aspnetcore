param([string]$RunRoot)

$ErrorActionPreference = 'Stop'
$run = if ($RunRoot) { (Resolve-Path -LiteralPath $RunRoot).Path } else { Join-Path $PSScriptRoot 'autoperf-runs\F057' }
$execution = @(Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
$order = @('round-1-before', 'round-1-after', 'round-2-after', 'round-2-before', 'round-3-before', 'round-3-after')
if ($execution.Count -notin @(2, 4, 6) -or @($execution | Where-Object exit_code -ne 0).Count -or
    ($execution.label -join '|') -cne (($order | Select-Object -First $execution.Count) -join '|'))
{
    throw 'Complete successful serialized alternating comparisons required.'
}
$previous = [DateTimeOffset]::MinValue
foreach ($launch in $execution)
{
    $start = [DateTimeOffset]::Parse($launch.started_at)
    $end = [DateTimeOffset]::Parse($launch.completed_at)
    if ($start -lt $previous -or $end -le $start)
    {
        throw 'Overlapping or invalid launch timestamps.'
    }
    $previous = $end
}
$comparisons = [int]($execution.Count / 2)
$oracle = @(Get-Content (Join-Path $run 'contract-oracles.json') -Raw | ConvertFrom-Json)
$names = @($oracle.Case | Sort-Object)
$targets = @(
    'Helper_Int_Equal', 'Helper_Int_Different', 'Helper_Long_Equal', 'Helper_Bool_Equal',
    'Helper_Guid_Equal', 'Helper_DateOnly_Equal', 'Helper_TimeOnly_Equal', 'Helper_Enum_Equal',
    'Helper_WideStruct_Equal', 'Cascade_Int_Equal', 'Cascade_Int_Different', 'Cascade_Guid_Equal',
    'Cascade_WideStruct_Equal', 'Cascade_Enum_Equal'
)
if ($names.Count -ne 38 -or @($names | Sort-Object -Unique).Count -ne 38 -or
    @($oracle | Where-Object ActualSubscribers -eq 1).Count -ne 12)
{
    throw 'Original fixed38-case corpus/live12-subscriber producer proof differs.'
}
$raw = [Collections.Generic.List[object]]::new()
$pairs = [Collections.Generic.List[object]]::new()
$receipts = [Collections.Generic.List[object]]::new()
$environment = $null
foreach ($round in 1..$comparisons)
{
    $afterLaunch = @($execution | Where-Object { $_.round -eq $round -and $_.variant -eq 'after' })
    if ($afterLaunch.Count -ne 1 -or $afterLaunch[0].snapshot -notin @('after', 'after-2', 'after-3'))
    {
        throw 'Missing actual source-specific snapshot.'
    }
    $variants = @{}
    foreach ($variant in @('before', 'after'))
    {
        $label = "round-$round-$variant"
        $file = @(Get-ChildItem (Join-Path $run "$label\results") -File -Filter '*full*.json')
        if ($file.Count -ne 1)
        {
            throw 'Missing complete actual BenchmarkDotNet JSON.'
        }
        $data = Get-Content $file[0].FullName -Raw | ConvertFrom-Json
        if ($null -eq $environment)
        {
            $environment = $data.HostEnvironmentInfo
        }
        elseif ($data.HostEnvironmentInfo.RuntimeVersion -cne $environment.RuntimeVersion -or
            $data.HostEnvironmentInfo.DotNetCliVersion -cne $environment.DotNetCliVersion -or
            $data.HostEnvironmentInfo.BenchmarkDotNetVersion -cne $environment.BenchmarkDotNetVersion)
        {
            throw 'Actual runtime/SDK/benchmark environment differs.'
        }
        $variants[$variant] = @{}
        foreach ($result in $data.Benchmarks)
        {
            if ($result.FullName -notmatch 'Case:\s*"([^"]+)"')
            {
                throw 'Unresolved exact benchmark identity.'
            }
            $name = $Matches[1]
            if ($name -notin $names -or $variants[$variant].ContainsKey($name) -or
                $result.Statistics.N -ne 8 -or $result.Statistics.OriginalValues.Count -ne 8 -or
                $result.Statistics.Mean -le 0 -or $null -eq $result.Memory.BytesAllocatedPerOperation)
            {
                throw 'Incomplete or duplicate measured case.'
            }
            $variants[$variant][$name] = $result
            $raw.Add([pscustomobject][ordered]@{
                round = $round; variant = $variant; case = $name; full_name = $result.FullName
                mean_ns = $result.Statistics.Mean; standard_deviation_ns = $result.Statistics.StandardDeviation
                coefficient_of_variation_percent = 100 * $result.Statistics.StandardDeviation / $result.Statistics.Mean
                bytes_per_operation = $result.Memory.BytesAllocatedPerOperation; measured_iterations = $result.Statistics.N
            })
        }
        if ((($variants[$variant].Keys | Sort-Object) -join '|') -cne ($names -join '|'))
        {
            throw 'Incomplete fixed corpus.'
        }
        $verified = @(Get-Content (Join-Path $run "$label\console.log") |
            Where-Object { $_.StartsWith('AUTOPERF_CONTRACT ') } |
            ForEach-Object { $_.Substring('AUTOPERF_CONTRACT '.Length) | ConvertFrom-Json })
        if ((($verified.Case | Sort-Object) -join '|') -cne ($names -join '|'))
        {
            throw 'Missing or duplicate actual complete original contracts.'
        }
        foreach ($receipt in $verified)
        {
            $expected = @($oracle | Where-Object Case -ceq $receipt.Case)
            if ($expected.Count -ne 1 -or
                ($receipt | ConvertTo-Json -Depth 16 -Compress) -cne ($expected[0] | ConvertTo-Json -Depth 16 -Compress))
            {
                throw 'Actual typed/helper/frame/consumer/identity/render-batch result differs from original.'
            }
            $receipts.Add([pscustomobject]@{ label = $label; actual_repeated_workloads_checked = 2; verified_original_contract = $receipt })
        }
    }
    foreach ($name in $names)
    {
        $before = $variants.before[$name]
        $after = $variants.after[$name]
        $definition = @($oracle | Where-Object Case -ceq $name)[0]
        $scope = if ($name.StartsWith('Cascade_')) { 'Real renderer/cascading producer' }
            elseif ($name.StartsWith('ParameterView_')) { 'Real object-valued ParameterView comparer' }
            elseif ($name -eq 'Helper_Int_Object_Equal') { 'Helper-only mixed instantiation;no located producer' }
            else { 'Typed helper-only;not producer evidence alone' }
        $pairs.Add([pscustomobject][ordered]@{
            round = $round; after_snapshot = $afterLaunch[0].snapshot; case = $name; scope = $scope
            first_declared_type = $definition.FirstDeclaredType; second_declared_type = $definition.SecondDeclaredType
            target = $name -in $targets; actual_subscribers = $definition.ActualSubscribers
            actual_result = $definition.ActualResult; actual_display_batches = $definition.DisplayBatches
            actual_updated_components = $definition.UpdatedComponents
            time_change_percent = 100 * ($after.Statistics.Mean / $before.Statistics.Mean - 1)
            before_ns = $before.Statistics.Mean; after_ns = $after.Statistics.Mean
            before_bytes = $before.Memory.BytesAllocatedPerOperation; after_bytes = $after.Memory.BytesAllocatedPerOperation
            allocation_change_bytes = $after.Memory.BytesAllocatedPerOperation - $before.Memory.BytesAllocatedPerOperation
            maximum_cv_percent = [Math]::Max(100 * $before.Statistics.StandardDeviation / $before.Statistics.Mean,
                100 * $after.Statistics.StandardDeviation / $after.Statistics.Mean)
        })
    }
}
function Median([double[]]$Values)
{
    $sorted = @($Values | Sort-Object)
    $middle = [int][Math]::Floor($sorted.Count / 2)
    if ($sorted.Count % 2)
    {
        return $sorted[$middle]
    }

    return ($sorted[$middle - 1] + $sorted[$middle]) / 2
}
function Summarize([object[]]$Rows)
{
    return @($Rows | Group-Object case, after_snapshot | ForEach-Object {
        $group = @($_.Group | Sort-Object round)
        [pscustomobject][ordered]@{
            case = $group[0].case; after_snapshot = $group[0].after_snapshot; scope = $group[0].scope
            target = $group[0].target; comparisons = $group.Count; actual_subscribers = $group[0].actual_subscribers
            actual_result = $group[0].actual_result; actual_display_batches = $group[0].actual_display_batches
            actual_updated_components = $group[0].actual_updated_components
            median_time_change_percent = Median ([double[]]$group.time_change_percent)
            minimum_time_change_percent = ($group.time_change_percent | Measure-Object -Minimum).Minimum
            maximum_time_change_percent = ($group.time_change_percent | Measure-Object -Maximum).Maximum
            every_pair_faster = @($group | Where-Object time_change_percent -ge 0).Count -eq 0
            median_before_ns = Median ([double[]]$group.before_ns); median_after_ns = Median ([double[]]$group.after_ns)
            median_before_bytes = Median ([double[]]$group.before_bytes); median_after_bytes = Median ([double[]]$group.after_bytes)
            minimum_allocation_change_bytes = ($group.allocation_change_bytes | Measure-Object -Minimum).Minimum
            maximum_allocation_change_bytes = ($group.allocation_change_bytes | Measure-Object -Maximum).Maximum
            maximum_cv_percent = ($group.maximum_cv_percent | Measure-Object -Maximum).Maximum
            time_changes_percent = @($group.time_change_percent)
        }
    } | Sort-Object case, after_snapshot)
}
$summary = Summarize $pairs.ToArray()
$finalSnapshot = @($execution | Where-Object variant -eq 'after' | Sort-Object round)[-1].snapshot
$finalSummary = Summarize @($pairs | Where-Object after_snapshot -ceq $finalSnapshot)
$raw.ToArray() | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'raw-case-outcomes.json') -Encoding utf8
$pairs.ToArray() | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'all-paired-outcomes.json') -Encoding utf8
$summary | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'all-paired-summary.json') -Encoding utf8
$finalSummary | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'final-paired-summary.json') -Encoding utf8
$receipts.ToArray() | ConvertTo-Json -Depth 18 | Set-Content (Join-Path $run 'setup-correctness.json') -Encoding utf8
$finalSummary | Select-Object case, median_time_change_percent, median_before_bytes, median_after_bytes, maximum_cv_percent |
    Format-Table -AutoSize
Write-Output "Comparisons=$comparisons;outcomes=$($raw.Count);pairs=$($pairs.Count);complete contracts=$($receipts.Count);actual repeated workloads=$($receipts.Count * 2)."
