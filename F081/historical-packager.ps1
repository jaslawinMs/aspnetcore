$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F081'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$destination = Join-Path $output 'F081'
if (Test-Path $destination)
{
    throw 'Refusing to overwrite an existing F081 evidence package.'
}
$copies = [System.Collections.Generic.List[object]]::new()
function Copy-Exact([string]$Source, [string]$Target, [string]$Kind, [string]$Relative)
{
    $path = Join-Path $destination $Target
    New-Item -ItemType Directory -Path (Split-Path $path -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $path
    $a = (Get-FileHash -LiteralPath $Source).Hash
    $b = (Get-FileHash -LiteralPath $path).Hash
    if ($a -cne $b) { throw "Authoritative copy differs:$Target" }
    $copies.Add([ordered]@{kind = $Kind; original = $Relative; destination = $Target;
        bytes = (Get-Item -LiteralPath $path).Length; sha256 = $a})
}
& (Join-Path $PSScriptRoot 'autoperf-export.ps1') -OutputRoot $output -Id F081 `
    -ExpectedCaseCount 20 -TestNameFilter '*FacebookTests*' -AfterSnapshot after-2
foreach ($file in Get-ChildItem $run -File)
{
    $target = if ($file.Name -eq 'execution.json') { 'execution-original.json' } else { $file.Name }
    Copy-Exact $file.FullName $target 'run' $file.Name
}
foreach ($folder in 'harness', 'cancellation-probe', 'tests-before', 'tests-naive-stream',
    'tests-decoding-stream', 'tests-decoding-stream-v2', 'tests-after', 'tests-before-tuned',
    'tests-gated-naive-stream', 'tests-after-tuned', 'harness-before-build',
    'harness-after-build', 'harness-after-tuned-build', 'cancellation-probe-build')
{
    $extensions = if ($folder -in 'harness', 'cancellation-probe') { @('.cs', '.csproj') } else { @('.json', '.trx', '.log') }
    foreach ($file in Get-ChildItem (Join-Path $run $folder) -File | Where-Object Extension -in $extensions)
    {
        Copy-Exact $file.FullName "$folder\$($file.Name)" 'run' "$folder\$($file.Name)"
    }
}
foreach ($execution in Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
{
    foreach ($file in Get-ChildItem (Join-Path $run "$($execution.label)\results") -File)
    {
        $name = switch -Wildcard ($file.Name)
        {
            '*-full*.json' { 'results.json' }
            '*.csv' { 'results.csv' }
            '*-github.md' { 'results.md' }
            '*.html' { 'results.html' }
            default { throw "Unexpected measured report:$($file.Name)" }
        }
        Copy-Exact $file.FullName "$($execution.label)\$name" 'run' "$($execution.label)\results\$($file.Name)"
    }
    foreach ($file in Get-ChildItem (Join-Path $run $execution.label) -File -Filter '*.log')
    {
        Copy-Exact $file.FullName "$($execution.label)\$($file.Name)" 'run' "$($execution.label)\$($file.Name)"
    }
}
foreach ($pair in @(
    @('F081-acceptance.md', 'acceptance.md'),
    @('F081-results-readme.md', 'README.md'),
    @('F081-reproduce-analysis.mjs', 'reproduce-analysis.mjs'),
    @('autoperf-benchmarks.ps1', 'historical-benchmark-runner.ps1'),
    @('autoperf-check-closure.mjs', 'historical-closure-verifier.mjs'),
    @('F081-package.ps1', 'historical-packager.ps1')))
{
    Copy-Exact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
foreach ($file in Get-ChildItem (Join-Path $PSScriptRoot 'autoperf-runs\F071\tools') -File |
    Where-Object Extension -in '.cs', '.csproj')
{
    Copy-Exact $file.FullName "tools\$($file.Name)" 'pdb-tools' $file.Name
}
$sourceCommit = (Get-Content (Join-Path $run 'source-commit.txt') -Raw).Trim()
$sourceIdentity = foreach ($pair in @(
    @('src\Security\Authentication\Facebook\src\FacebookHandler.cs', 'source-after-2.cs'),
    @('src\Security\Authentication\test\FacebookTests.cs', 'tests-source-final.cs')))
{
    $text = Get-Content (Join-Path $destination $pair[1]) -Raw
    $gitPath = $pair[0].Replace('\', '/')
    $blob = @(git -C 'C:\src\aspnetcore' show "$sourceCommit`:$gitPath") -join "`n"
    if ($LASTEXITCODE -or $text.Replace("`r`n", "`n").TrimEnd("`n") -cne $blob)
    {
        throw 'Measured final source differs from the actual committed source.'
    }
    [ordered]@{
        path = $pair[0]; source_snapshot = $pair[1]
        source_sha256 = (Get-FileHash (Join-Path $destination $pair[1])).Hash
        committed_blob = (git -C 'C:\src\aspnetcore' rev-parse "$sourceCommit`:$gitPath")
        committed_source_equal_after_git_line_ending_canonicalization = $true
    }
}
@{candidate = 'F081'; source_commit = $sourceCommit; documents = @($sourceIdentity)} |
    ConvertTo-Json -Depth 8 | Set-Content (Join-Path $destination 'committed-source-identity.json') -Encoding utf8
node -e "const fs=require('fs'),cp=require('child_process');fs.writeFileSync(process.argv[1],cp.execFileSync('git',['-C','C:\\src\\aspnetcore','diff','--binary','37e809ead5824bc753a1c3d56f11615bdb1296c5',process.argv[2],'--','src/Security/Authentication/Facebook/src/FacebookHandler.cs','src/Security/Authentication/test/FacebookTests.cs']));" (Join-Path $destination 'source.patch') $sourceCommit
if ($LASTEXITCODE) { throw 'Native source patch capture failed.' }
$copies.Add([ordered]@{kind = 'native-git-diff'; original = $sourceCommit; destination = 'source.patch';
    bytes = (Get-Item (Join-Path $destination 'source.patch')).Length;
    sha256 = (Get-FileHash (Join-Path $destination 'source.patch')).Hash})
if (@($copies.destination | Sort-Object -Unique).Count -ne $copies.Count)
{
    throw 'Authoritative copy destinations are duplicated.'
}
$copies | ConvertTo-Json -Depth 6 |
    Set-Content (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8
$validation = [System.Collections.Generic.List[string]]::new()
$validation.Add('# Exact F081 validation commands and results')
$validation.Add('')
$validation.Add('Historical commands ran from C:\src\aspnetcore after `. .\activate.ps1`. Existing project suffix and two MSBuild workers are preserved. Original/selected preservation is green;the two raw-stream prototypes are expected-red compatibility controls,not measured optimizations.')
foreach ($spec in @(
    @('Original owner', 'tests-before\command.json', 'passed41/41,15 encoding rows,exit0'),
    @('Rejected unconditional raw stream', 'tests-naive-stream\command.json', 'expected9 failures/32 passes,exit1'),
    @('Initial transcoding nullable compile', 'tests-decoding-stream\command.json', 'failedCS8604;no tests reached'),
    @('Corrected nullable transcoding owner', 'tests-decoding-stream-v2\command.json', 'passed41/41,exit0'),
    @('Measured initial strategy owner', 'tests-after\command.json', 'passed41/41,exit0'),
    @('Original revised owner', 'tests-before-tuned\command.json', 'passed43/43,17 encoding rows,exit0'),
    @('Rejected gated raw stream', 'tests-gated-naive-stream\command.json', 'expectedInvalidUtf8Large failure/42 passes,exit1'),
    @('Selected size-gated owner', 'tests-after-tuned\command.json', 'passed43/43,17 encoding rows,exit0'),
    @('Original harness build', 'harness-before-build\command.json', 'passed,exit0'),
    @('Initial strategy harness build', 'harness-after-build\command.json', 'passed,exit0'),
    @('Selected strategy harness build', 'harness-after-tuned-build\command.json', 'passed,exit0'),
    @('Large cancellation probe build', 'cancellation-probe-build\command.json', 'passed,exit0;new external manifest justified restore'),
    @('Original standard contracts', 'contracts-before-command.json', 'passed20 ticket/3 small cancellation profiles,exit0'),
    @('Initial strategy standard contracts', 'contracts-after-command.json', 'passed20 ticket/3 small cancellation profiles,exit0'),
    @('Selected standard contracts', 'contracts-after-2-command.json', 'passed20 ticket/3 small cancellation profiles,exit0'),
    @('Initial focused whitespace', 'formatting.json', 'passed,exit0'),
    @('Selected focused whitespace', 'formatting-after-2.json', 'passed,exit0')))
{
    $record = Get-Content (Join-Path $run $spec[1]) -Raw | ConvertFrom-Json
    $command = 'dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'", "''") + "'" }) -join ' ')
    $validation.Add('')
    $validation.Add("## $($spec[0]):$($spec[2])")
    $validation.Add('')
    $validation.Add('```powershell')
    $validation.Add($command)
    $validation.Add('```')
}
foreach ($record in Get-Content (Join-Path $run 'large-cancellation-commands.json') -Raw | ConvertFrom-Json)
{
    $validation.Add('')
    $validation.Add("## $($record.snapshot) large cancellation:passed9/9,exit$($record.exit_code)")
    $validation.Add('')
    $validation.Add('```powershell')
    $validation.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'", "''") + "'" }) -join ' '))
    $validation.Add('```')
}
$validation | Set-Content (Join-Path $destination 'validation-commands.md') -Encoding utf8
[ordered]@{
    candidate = 'F081'; baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
    branch = 'autoperf/F081-facebook-user-info-json-stream'; source_commit = $sourceCommit
    disposition = 'Qualified allocation/scaling proposal;explicitly not merge-ready.'
    source_scope = @{files = 2; additions = 141; deletions = 1}
    public_api_or_default_change = $false; measured_comparisons = 3; measured_source_strategies = 2
    selected_strategy_rounds = @(2,3); comparison_budget_closed = $true
    selected_strategy_excludes_initial_comparison = $true
    unmeasured_rejected_raw_stream_prototypes = 2; unmeasured_nullable_compile_failure = $true
    selected_gate_bytes = 16384; gate_is_measured_optimal_crossover = $false
    actual_producer = 'Real HttpClient.GetAsync/HttpContent buffering -> initialized FacebookHandler.CreateTicketAsync -> actual claim actions/CreatingTicket/ticket/document lifetime'
    external_response_cleanup_uniform_in_both_timings = $true
    getasync_completion_mode_unchanged = $true; shipping_response_disposal_unchanged = $true
    test_only_protected_method_exposure = $true; shipping_visibility_changes = $false
    retained_costs = @('Small UTF8 median+11.72%','TypicalUTF81K+12.57%','UTF16large+14.02%',
        'All fallback/error time and allocation movements,including552B error-path differences in some launches')
    limits = @('No ordinary login/external-provider/browser/network-streaming/production-throughput claim.',
        'Intermediate/exact-boundary payload sizes were not timed;threshold is anchored to observed profiles.',
        'Custom encoding providers,other platforms and runtimes are unverified.',
        'UTF8 transcoding still decodes/re-encodes and buffers;not removal of all materialization.')
    shared_windows_host = $true; cpu_heavy_commands_serialized = $true
    power_or_affinity_changed = $false; raw_binaries_published = $false
    raw_source_reports_and_logs_copied_without_transformation = $true
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $destination 'provenance.json') -Encoding utf8
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --write
if ($LASTEXITCODE) { throw 'F081 raw-derived audit generation failed.' }
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify
if ($LASTEXITCODE) { throw 'F081 raw-derived audit reproduction failed.' }
Write-Output "Packaged $(@(Get-ChildItem $destination -Recurse -File).Count) F081 files before final package log/copy verification."
