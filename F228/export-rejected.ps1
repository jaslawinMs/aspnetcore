param()

$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F228'
$dest = Join-Path $PSScriptRoot 'autoperf-published-results\F228'
$target = 'src\Grpc\JsonTranscoding\src\Shared\ServiceDescriptorHelpers.cs'
$test = 'src/Grpc/JsonTranscoding/test/Microsoft.AspNetCore.Grpc.JsonTranscoding.Tests/ServiceDescriptorHelpersTests.cs'
$baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$head = (git -C $repo rev-parse HEAD).Trim()
if ((git -C $repo branch --show-current).Trim() -ne 'autoperf/F228-grpc-query-membership' -or
    @(git -C $repo diff --name-only).Count -or @(git -C $repo diff --cached --name-only).Count)
{
    throw 'Require committed tracked-clean F228 tests-only branch.'
}
$paths = @(git -C $repo diff --name-only $baseline $head)
if ($paths.Count -ne 1 -or $paths[0] -ne $test)
{
    throw 'Rejected source commit must contain only compatibility tests.'
}
$before = Get-Content (Join-Path $run 'before-manifest.json') -Raw | ConvertFrom-Json
$after = Get-Content (Join-Path $run 'after-manifest.json') -Raw | ConvertFrom-Json
$originalHash = (Get-FileHash (Join-Path $run 'source-before.cs')).Hash
$experimentHash = (Get-FileHash (Join-Path $run 'source-experiment.cs')).Hash
$baselineBlob = (git -C $repo rev-parse "${baseline}:$($target.Replace('\', '/'))").Trim()
if ($originalHash -ne $before.target_source_sha256 -or
    $originalHash -ne (Get-FileHash (Join-Path $repo $target)).Hash -or
    $originalHash -ne (Get-FileHash (Join-Path $run 'source-restored.cs')).Hash -or
    $experimentHash -ne $after.target_source_sha256 -or $originalHash -eq $experimentHash -or
    (git -C $repo hash-object (Join-Path $run 'source-before.cs')).Trim() -ne $baselineBlob -or
    $before.source_revision -ne $baseline -or $after.source_revision -ne $baseline)
{
    throw 'Require exact captured original/experiment and byte-for-byte restored baseline shipping source.'
}
New-Item $dest -ItemType Directory -Force | Out-Null
function Redact([string]$Text)
{
    return $Text.Replace($PSScriptRoot.Replace('\', '\\'), '<SESSION_FILES>').Replace($PSScriptRoot, '<SESSION_FILES>')
}
function Write-Json([string]$Path, $Value)
{
    Redact ($Value | ConvertTo-Json -Depth 30) | Set-Content $Path -Encoding utf8
}
function Copy-Text([string]$From, [string]$To)
{
    Redact (Get-Content $From -Raw) | Set-Content $To -Encoding utf8 -NoNewline
}
$roots = @{
    before = Join-Path $run 'binaries\before'
    after = Join-Path $run 'binaries\after'
}
$namesBefore = @(Get-ChildItem $roots.before -Recurse -File | Where-Object Extension -in '.dll', '.json' |
    ForEach-Object { $_.FullName.Substring($roots.before.Length + 1) } | Sort-Object)
$namesAfter = @(Get-ChildItem $roots.after -Recurse -File | Where-Object Extension -in '.dll', '.json' |
    ForEach-Object { $_.FullName.Substring($roots.after.Length + 1) } | Sort-Object)
if (Compare-Object $namesBefore $namesAfter)
{
    throw 'Original/candidate recursive closure paths must match exactly.'
}
$closure = @(foreach ($relative in $namesBefore)
{
    $a = (Get-FileHash (Join-Path $roots.before $relative)).Hash
    $b = (Get-FileHash (Join-Path $roots.after $relative)).Hash
    [ordered]@{ file = $relative; before_sha256 = $a; after_sha256 = $b; equal = $a -eq $b }
})
$different = @($closure | Where-Object { -not $_.equal })
if ($closure.Count -ne 78 -or $different.Count -ne 1 -or
    $different[0].file -ne 'Microsoft.AspNetCore.Grpc.JsonTranscoding.dll' -or
    (Get-FileHash (Join-Path $roots.before 'AutoPerf.Benchmarks.pdb')).Hash -ne
        (Get-FileHash (Join-Path $roots.after 'AutoPerf.Benchmarks.pdb')).Hash)
{
    throw 'Exact original harness/PDB/configuration required; only owner DLL may differ.'
}
foreach ($variant in 'before', 'after')
{
    $manifest = if ($variant -eq 'before') { $before } else { $after }
    foreach ($pair in @(
        @($manifest.target_assembly, $manifest.target_assembly_sha256),
        @($manifest.benchmark_assembly, $manifest.benchmark_assembly_sha256),
        @('AutoPerf.Benchmarks.runtimeconfig.json', $manifest.runtime_configuration_sha256),
        @('AutoPerf.Benchmarks.deps.json', $manifest.dependency_configuration_sha256)))
    {
        if ((Get-FileHash (Join-Path $roots[$variant] $pair[0])).Hash -ne $pair[1])
        {
            throw "Captured binary/configuration hash changed: $variant/$($pair[0])"
        }
    }
}
Write-Json (Join-Path $dest 'assembly-hashes.json') $closure
$execution = @(Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
if ($execution.Count -ne 2 -or @($execution | Where-Object { $_.exit_code -ne 0 -or $_.round -ne 1 }).Count -or
    $execution[0].variant -ne 'before' -or $execution[1].variant -ne 'after')
{
    throw 'Exactly one complete A/B pair; early-stop diagnostic budget is closed.'
}
$expected = @(Get-Content (Join-Path $run 'setups-before-snapshot.log') |
    Where-Object { $_.StartsWith('Verified ') } |
    ForEach-Object { $_.Substring(9) | ConvertFrom-Json } | Sort-Object Case)
if ($expected.Count -ne 16 -or @($expected.Case | Select-Object -Unique).Count -ne 16 -or
    @($expected | Where-Object { $_.Case -eq 'LiveParseRoute_256_16' -and $_.Live }).Count -ne 1)
{
    throw 'All16distinct actual dormant/live fixtures required.'
}
$cases = @()
$receipts = @()
$loads = @()
$environment = $null
foreach ($launch in $execution)
{
    $local = Join-Path $run $launch.label
    $output = Join-Path $dest $launch.label
    New-Item $output -ItemType Directory -Force | Out-Null
    $lines = @(Get-Content (Join-Path $local 'console.log') -TotalCount 2)
    $expectedLoad = Join-Path $roots[$launch.variant] 'Microsoft.AspNetCore.Grpc.JsonTranscoding.dll'
    $setupLoad = @(Get-Content (Join-Path $run "setups-$($launch.variant)-snapshot.log") -TotalCount 2)
    if ($lines[0] -cne "Transcoding assembly: $expectedLoad" -or
        $lines[1] -notmatch '^Transcoding MVID: [0-9a-f-]{36}$' -or (Compare-Object $lines $setupLoad))
    {
        throw "Actual owner load/MVID differs: $($launch.label)"
    }
    $loads += [ordered]@{ label = $launch.label; snapshot = $launch.snapshot; actual_load = $lines }
    $reports = @(Get-ChildItem (Join-Path $local 'results') -File -Filter '*-full*.json')
    $csv = @(Get-ChildItem (Join-Path $local 'results') -File -Filter '*.csv')
    $md = @(Get-ChildItem (Join-Path $local 'results') -File -Filter '*-github.md')
    if ($reports.Count -ne 1 -or $csv.Count -ne 1 -or $md.Count -ne 1)
    {
        throw 'Unique full JSON/CSV/GitHub Markdown raw reports required.'
    }
    $json = Get-Content $reports[0].FullName -Raw | ConvertFrom-Json
    if ($json.Benchmarks.Count -ne 16)
    {
        throw 'All16measured benchmark outcomes required.'
    }
    if ($null -eq $environment)
    {
        $environment = $json.HostEnvironmentInfo
    }
    elseif ($json.HostEnvironmentInfo.RuntimeVersion -ne $environment.RuntimeVersion -or
        $json.HostEnvironmentInfo.DotNetCliVersion -ne $environment.DotNetCliVersion -or
        $json.HostEnvironmentInfo.BenchmarkDotNetVersion -ne $environment.BenchmarkDotNetVersion)
    {
        throw 'Identical SDK/runtime/BenchmarkDotNet required between launches.'
    }
    foreach ($case in $json.Benchmarks)
    {
        if ($case.Statistics.N -lt 8 -or $case.Statistics.Mean -le 0 -or $null -eq $case.Memory.BytesAllocatedPerOperation)
        {
            throw 'Insufficient raw iterations/statistics/allocation.'
        }
        $cases += [ordered]@{
            label = $launch.label
            round = $launch.round
            variant = $launch.variant
            name = $case.FullName
            statistics = $case.Statistics
            memory = $case.Memory
        }
    }
    $actual = @(Get-Content (Join-Path $local 'console.log') |
        Where-Object { $_.StartsWith('Verified ') } |
        ForEach-Object { $_.Substring(9) | ConvertFrom-Json } | Sort-Object Case)
    if ($actual.Count -ne 16 -or
        (Compare-Object ($expected | ConvertTo-Json -Depth 10) ($actual | ConvertTo-Json -Depth 10)))
    {
        throw 'Actual field order/identity/body/live producer receipts differ.'
    }
    $receipts += [ordered]@{ label = $launch.label; receipts = $actual }
    Copy-Text (Join-Path $local 'console.log') (Join-Path $output 'console.log')
    Copy-Text $reports[0].FullName (Join-Path $output 'results.json')
    Copy-Text $csv[0].FullName (Join-Path $output 'results.csv')
    Copy-Text $md[0].FullName (Join-Path $output 'results.md')
}
$audits = @()
foreach ($variant in 'before', 'after')
{
    $text = Get-Content (Join-Path $run "caller-audit-$variant-snapshot.log") -Raw
    $audit = $text.Substring($text.IndexOf('{')) | ConvertFrom-Json
    if ($audit.MethodDefinitions -ne 496 -or $audit.BodiesScanned -ne 490 -or $audit.BodylessMethods -ne 6 -or
        $audit.MetadataMethodOperandsRead -ne 3252 -or $audit.MetadataStringOperandsRead -ne 284 -or
        $audit.MethodOperandNameMatches.Count -or $audit.ExactNameStringReferences.Count -or
        $audit.UnresolvedMetadataOperands -ne 0 -or $audit.ExternalRuntimeDispatchValidated -or
        $audit.ArbitraryExternalReflectionExcluded)
    {
        throw 'Full owner metadata coverage/zero name matches/explicit runtime limits required.'
    }
    $audits += [ordered]@{ variant = $variant; audit = $audit }
}
$tests = @()
$summaries = @()
foreach ($variant in 'before-initial', 'before', 'after', 'restored')
{
    $path = Join-Path $run "tests-$variant\results.trx"
    [xml]$trx = Get-Content $path -Raw
    $rows = @($trx.SelectNodes("//*[local-name()='UnitTestResult']"))
    $focused = @($rows | Where-Object testName -like '*ServiceDescriptorHelpersTests*')
    if ($rows.Count -ne 308 -or $focused.Count -ne 4 -or @($rows | Where-Object outcome -ne 'Passed').Count)
    {
        throw "All308tests/all4class outcomes required: $variant"
    }
    $tests += $rows | ForEach-Object {
        [ordered]@{ variant = $variant; test = $_.testName; outcome = $_.outcome; duration = $_.duration }
    }
    $summaries += [ordered]@{
        variant = $variant
        passed = $rows.Count
        failed = 0
        focused_tests = @($focused | Select-Object testName, outcome, duration)
    }
    $dir = Join-Path $dest "tests-$variant"
    New-Item $dir -ItemType Directory -Force | Out-Null
    Copy-Text $path (Join-Path $dir 'results.trx')
}
foreach ($file in (Get-ChildItem $run -File | Where-Object Extension -in '.log', '.json', '.cs', '.patch'))
{
    if ($file.Length -eq 0 -or $file.Extension -eq '.cs')
    {
        Copy-Item $file.FullName (Join-Path $dest $file.Name)
    }
    else
    {
        Copy-Text $file.FullName (Join-Path $dest $file.Name)
    }
}
$harness = Join-Path $dest 'harness'
New-Item $harness -ItemType Directory -Force | Out-Null
Get-ChildItem (Join-Path $run 'harness') -File | Where-Object Extension -in '.cs', '.csproj' |
    ForEach-Object { Copy-Item $_.FullName (Join-Path $harness $_.Name) }
Copy-Item $PSCommandPath (Join-Path $dest 'export-rejected.ps1')
Copy-Text (Join-Path $PSScriptRoot 'F228-acceptance.md') (Join-Path $dest 'pre-implementation-acceptance.md')
Write-Json (Join-Path $dest 'environment.json') $environment
Write-Json (Join-Path $dest 'raw-case-outcomes.json') $cases
Write-Json (Join-Path $dest 'setup-correctness.json') $receipts
Write-Json (Join-Path $dest 'assembly-loads.json') $loads
Write-Json (Join-Path $dest 'caller-metadata-audits.json') $audits
Write-Json (Join-Path $dest 'all-test-outcomes.json') $tests
Write-Json (Join-Path $dest 'all-correctness.json') $summaries
Write-Json (Join-Path $dest 'variance.json') @($cases | ForEach-Object {
    [ordered]@{
        label = $_.label
        name = $_.name
        n = $_.statistics.N
        mean_ns = $_.statistics.Mean
        sd_ns = $_.statistics.StandardDeviation
        min_ns = $_.statistics.Min
        max_ns = $_.statistics.Max
        bytes = $_.memory.BytesAllocatedPerOperation
    }
})
Write-Json (Join-Path $dest 'provenance.json') ([ordered]@{
    candidate = 'F228'
    disposition = 'rejected'
    reason = 'No supported current consumer after Grpc.Swagger removal; every affected diagnostic case allocates more.'
    baseline_revision = $baseline
    tests_only_source_revision = $head
    tests_only_branch = 'autoperf/F228-grpc-query-membership'
    measured_experiment_not_in_source_commit = $true
    original_and_restored_source_sha256 = $originalHash
    discarded_experiment_source_sha256 = $experimentHash
    source_original_and_experiment_match_capture_manifests = $true
    source_baseline_git_blob = $baselineBlob
    changed_commit_paths = $paths
    comparisons_consumed = 1
    maximum_comparisons = 3
    comparison_budget_closed = $true
    early_stop_reason = 'Four large dormant cases67-89%faster; no supported current consumer and all15affected cases add heap. No tuning or further timing justified.'
    benchmark_outcomes = $cases.Count
    test_outcomes = $tests.Count
    cases_per_launch = 16
    minimum_measured_iterations = 8
    actual_owner_loads_and_mvids_match_each_snapshot = $true
    recursive_dll_json_closure_files = $closure.Count
    only_owner_differs = $true
    exact_original_harness_pdb_config_reused = $true
    former_consumer_removal_commit = '39e1ac975cf138c56fff984dd824ab651a448367'
    former_consumer_removal_pr = 'dotnet/aspnetcore#67919'
    metadata_audit_not_runtime_or_whole_repository_proof = $true
    live_control = 'LiveParseRoute_256_16'
    initial_live128fixture_rejected_by_actual_route_precedence = $true
    large_dormant_templates_do_not_establish_live_reachability = $true
    current_source_restored_and_tests_pass = $true
    public_optimization_issue_or_pr_created = $false
    no_combination_with_F295_or_F272 = $true
    hosted_http_throughput_cold_concurrency_other_platforms_unverified = $true
})
if ($cases.Count -ne 32 -or $tests.Count -ne 1232)
{
    throw 'All32benchmark/all1232test outcomes must be retained.'
}
Write-Output "Verified F228 rejected: tests-only $head;32benchmark/1232test outcomes,16actual receipts per launch,78owner-only closure files."
