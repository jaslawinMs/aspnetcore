param([Parameter(Mandatory)][ValidateRange(2,3)][int]$Round)
$ErrorActionPreference = 'Stop'
. 'C:\src\aspnetcore\activate.ps1'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F062'
foreach ($role in @('before','after'))
{
    $manifest = Get-Content (Join-Path $run "$role-2-manifest.json") -Raw | ConvertFrom-Json
    $root = Join-Path $run "binaries\$role-2"
    foreach ($file in $manifest.files.PSObject.Properties)
    {
        if ((Get-FileHash (Join-Path $root $file.Name.Replace('/','\'))).Hash -cne $file.Value)
        {
            throw "Frozen$role recursive dependency changed."
        }
    }
    $output = Join-Path $run "round-$Round-$role"
    $contracts = Join-Path $output 'verify-public-contracts.json'
    $retention = Join-Path $output 'verify-retention.json'
    $started = [DateTimeOffset]::UtcNow
    if (-not (Test-Path $contracts))
    {
        dotnet (Join-Path $root 'AutoPerf.Benchmarks.dll') --verify-public-contracts $contracts *> (Join-Path $output 'verify-public-contracts.log')
        if ($LASTEXITCODE)
        {
            throw "Actual frozen$role public TCP contracts failed."
        }
    }
    if ((Get-FileHash $contracts).Hash -cne (Get-FileHash (Join-Path $run 'public-original-contracts.json')).Hash)
    {
        throw 'All18 original public contract records must match,including all real TCP HTTP/WebSocket producer cases.'
    }
    if (-not (Test-Path $retention))
    {
        dotnet (Join-Path $root 'AutoPerf.Benchmarks.dll') --verify-retention $retention *> (Join-Path $output 'verify-retention.log')
        if ($LASTEXITCODE)
        {
            throw "Actual frozen$role real-host retention failed."
        }
    }
    $rows = @(Get-Content $retention -Raw | ConvertFrom-Json)
    if ($rows.Count -ne 24)
    {
        throw 'Exactly24 request-weak-witness rows are required.'
    }
    $unmatched = @()
    foreach ($row in $rows)
    {
        $expected = if ($role -eq 'before' -and $row.recipe -in @('Http200','Http404','EmptyHttp','FaultedUri')) { $row.completed_requests } else { 0 }
        if ($row.request_sources_retained_before_real_host_stop -ne $expected -or $row.request_sources_retained_after_real_host_stop -ne 0)
        {
            $unmatched += $row
        }
    }
    if ($unmatched.Count -and $role -eq 'before')
    {
        throw 'Original live-parent retention must be reached exactly in all expected rows.'
    }
    $settled = @(Get-Content (Join-Path $run "quiescence-$role.json") -Raw | ConvertFrom-Json)
    if ($settled.Count -ne 18 -or @($settled | Where-Object {
        $_.owner_sha256 -cne $manifest.target_assembly_sha256 -or
        -not $_.real_host_parent_not_canceled_during_observation -or
        $_.checkpoints.Count -ne 8 -or
        $_.final_alive_before_any_host_stop -ne $(if ($role -eq 'before' -and $_.recipe -in @('Http200','Http404','EmptyHttp','FaultedUri')) { $_.completed_requests } else { 0 })
    }).Count)
    {
        throw 'Independent settled observations with the same owner and a never-stopped parent must match every expected row.'
    }
    if ($unmatched.Count)
    {
        Write-Warning "$role post-comparison$Round single-GC observation has $($unmatched.Count) nonzero rows; retain them as an immediate-quiescence limitation, not a zero-retention result."
    }
    $receipt = Join-Path $output 'verification-execution.json'
    if (Test-Path $receipt)
    {
        Write-Output "Reused verified, unchanged post-comparison$Round/${role} raw receipts."
        continue
    }
    [ordered]@{
        round=$Round;variant=$role;snapshot="$role-2";started_at=$started.ToString('o')
        completed_at=[DateTimeOffset]::UtcNow.ToString('o');public_contract_records=18;actual_public_workloads=24
        actual_real_tcp_http_workloads=6;actual_real_tcp_websocket_workloads=6;request_witness_rows=24
        request_witness_positive_before_rows=12;actual_unreached_request_witness_controls=9
        reached_host_only_link_request_witness_negative_rows=3
        host_only_stopping_is_measured_separately_and_not_an_unreached_control=$true
        owner_sha256=$manifest.target_assembly_sha256;harness_sha256=$manifest.benchmark_assembly_sha256
        all_original_public_records_match_exactly=$true;all_request_witness_rows_match_role=($unmatched.Count -eq 0)
        single_gc_unmatched_rows=$unmatched;single_gc_observation_is_not_guaranteed_quiescence=$true
        separate_settled_live_parent_observations_match_role=$true;settled_observer_rows=18
        public_contract_sha256=(Get-FileHash $contracts).Hash;retention_sha256=(Get-FileHash $retention).Hash
        verification_outside_benchmark_timing=$true;recursive_frozen_files=$manifest.files.PSObject.Properties.Count
    } | ConvertTo-Json -Depth 8 | Set-Content $receipt -Encoding utf8
    Write-Output "Post-comparison$Round/${role}:18 exact public records/24 workloads;24 observed request-witness rows ($($unmatched.Count) single-GC mismatches);18 separate settled rows;host-only reached boundary explicit."
}
