$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F014'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$destination = Join-Path $output 'F014'
if ((Test-Path $destination) -or @(git -C $output status --porcelain).Count)
{
    throw 'Fresh capsule and clean dedicated results checkout required.'
}
$audit = Get-Content (Join-Path $run 'measurement-audit.json') -Raw | ConvertFrom-Json
$source = Get-Content (Join-Path $run 'source-branch-publication.json') -Raw | ConvertFrom-Json
if (-not $audit.auditPassed -or -not $audit.actualLiveAuditPassed -or $audit.performancePrJustified -or
    $audit.proposalDisposition -cne 'rejected/design-blocked' -or -not $audit.budgetClosed -or
    $audit.originalOnlyDiagnosticProfiles -ne 1 -or $audit.pairedComparisons -ne 0 -or $audit.benchmarkOutcomes -ne 14 -or
    -not $source.actualRemoteCanonicalBytesVerified -or $source.sourceChanged -or $source.performancePrCreated)
{
    throw 'Audited rejected proposal, original-only data and unchanged published source required.'
}
$copies = [System.Collections.Generic.List[object]]::new()
$omissions = [System.Collections.Generic.List[object]]::new()
function CopyExact([string]$Source, [string]$Relative, [string]$Kind, [string]$Original)
{
    if ([IO.Path]::GetExtension($Relative) -in '.dll', '.exe', '.pdb', '.binlog', '.pfx', '.pem', '.key', '.crt')
    {
        throw 'Only classified source/text evidence is published.'
    }
    $target = Join-Path $destination $Relative
    if (Test-Path $target)
    {
        throw "Do not overwrite copied evidence: $Relative"
    }
    New-Item (Split-Path $target -Parent) -ItemType Directory -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $target
    $hash = (Get-FileHash $Source).Hash
    if ((Get-FileHash $target).Hash -cne $hash)
    {
        throw 'Copied bytes differ.'
    }
    $copies.Add([pscustomobject]@{
        original = $Original; destination = $Relative; kind = $Kind; bytes = (Get-Item $Source).Length; sha256 = $hash
    })
}
function Omit([IO.FileInfo]$Entry, [string]$Reason)
{
    $omissions.Add([pscustomobject]@{
        original = [IO.Path]::GetRelativePath($run, $Entry.FullName)
        bytes = $Entry.Length; sha256 = (Get-FileHash $Entry.FullName).Hash; reason = $Reason
    })
}
function CopyRun([string]$Relative)
{
    $directory = if ($Relative) { Join-Path $run $Relative } else { $run }
    foreach ($entry in Get-ChildItem -LiteralPath $directory -Force)
    {
        $relativePath = if ($Relative) { "$Relative\$($entry.Name)" } else { $entry.Name }
        if ($entry.PSIsContainer)
        {
            if ($entry.Name -in 'images', 'bin', 'obj', 'test-image', '.git', 'node_modules')
            {
                foreach ($omitted in Get-ChildItem $entry.FullName -Recurse -Force -File)
                {
                    Omit $omitted 'Execution/test images or ephemeral build/restore outputs deliberately not distributed.'
                }
                continue
            }
            CopyRun $relativePath
        }
        elseif ($entry.Extension -in '.cs', '.csproj', '.json', '.trx', '.log', '.txt', '.html', '.md',
            '.csv', '.patch', '.diff', '.ps1', '.mjs', '.props', '.targets', '.cmd', '.stdout', '.stderr')
        {
            CopyExact $entry.FullName $relativePath 'run' $relativePath
        }
        elseif ($entry.Extension -ceq '.binlog')
        {
            Omit $entry 'Build binary log omitted; exact commands/text logs/outcomes retained.'
        }
        else
        {
            throw "Unclassified artifact: $relativePath"
        }
    }
}
CopyRun ''
foreach ($role in 'original', 'captured-default-json')
{
    foreach ($name in 'AutoPerf.Benchmarks.runtimeconfig.json', 'AutoPerf.Benchmarks.deps.json')
    {
        CopyExact (Join-Path $run "images\$role\$name") "execution-image-metadata\$role\$name" 'run-image-metadata' "images\$role\$name"
    }
}
foreach ($pair in @(@('F014-results-readme.md', 'README.md'), @('F014-reproduce-analysis.mjs', 'reproduce-analysis.mjs'),
    @('F014-package-gitattributes.txt', '.gitattributes')))
{
    CopyExact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
foreach ($entry in Get-ChildItem $PSScriptRoot -File | Where-Object { $_.Name -like 'F014-*' -and $_.Extension -in '.ps1', '.mjs' })
{
    if ($entry.Name -ceq 'F014-reproduce-analysis.mjs')
    {
        continue
    }
    CopyExact $entry.FullName "historical-$($entry.Name.Substring(5))" 'session' $entry.Name
}
$omissions | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $destination 'omitted-file-manifest.json')
$copies | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $destination 'authoritative-copy-manifest.json')
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify
if ($LASTEXITCODE)
{
    throw 'Copied portable audit failed; retain partial package, never rewrite experiments.'
}
$commands = [System.Collections.Generic.List[string]]::new()
$commands.Add('# F014 exact historical commands and observed outcomes')
$commands.Add('')
$commands.Add('Borrowed F011 commands under tests/original and borrowed-producer-build-execution retain their actual original timestamps/outcomes; they did not run again under F014. Every fresh .NET shell activates `. .\activate.ps1` from `C:\src\aspnetcore`. One actual original-only 14-case user-send profile completed; zero paired comparisons/candidate profiles, no shipping fix or improvement percentage. These guarded historical commands preserve actual paths, not replay/overwrite instructions.')
$commands.Add('')
function Quote([string]$Value)
{
    return "'" + $Value.Replace("'", "''") + "'"
}
foreach ($entry in $copies | Where-Object {
    $_.kind -ceq 'run' -and $_.original.EndsWith('.json') -and $_.original.Contains('execution')
} | Sort-Object original)
{
    $data = Get-Content (Join-Path $destination $entry.destination) -Raw | ConvertFrom-Json
    $records = if ($data -is [array]) { @($data) } elseif ($data.commands) { @($data.commands) } else { @($data) }
    foreach ($record in $records)
    {
        if (-not $record.arguments)
        {
            continue
        }
        if (-not $record.entryPoint -or 'actualExitCode' -notin $record.PSObject.Properties.Name)
        {
            throw 'Exact command entry point/outcome missing.'
        }
        $commands.Add("## $($entry.original): actual exit $($record.actualExitCode)")
        $commands.Add('```powershell')
        $commands.Add($record.entryPoint + ' ' + (($record.arguments | ForEach-Object { Quote $_ }) -join ' '))
        $commands.Add('```')
        $commands.Add('')
    }
}
$commands.Add('## Preserved preparation outcomes')
$commands.Add('No fresh reader/native/timing failure or rerun. Four new F014 native preparation commands exit0: one restore, one build, two independent19-check/14-wrapper user-send characterizations with actual default user-ID provider/principal setup. F01127-row owning-suite/current JSON bytes explicitly reused/rehashed, not rerun/rebuilt. Repository outputs unchanged. One14-shape original-only profile passes; zero paired comparisons/candidate profiles, no prior group/broadcast/connection timing reused. The guarded profiler also executes dotnet --info successfully before timing; its exact output is measurements/original-diagnostic-only/dotnet-info.log.')
$commands.Add('')
$commands.Add('## Actual unchanged independent source-branch publication: exit0, remote ref and owner bytes verified')
$commands.Add('```powershell')
$commands.Add('git ' + (($source.pushArguments | ForEach-Object { Quote $_ }) -join ' '))
$commands.Add('```')
$commands.Add('')
$commands.Add('## Actual copied portable audit: exit0')
$commands.Add('```powershell')
$commands.Add('node ' + (Quote (Join-Path $destination 'reproduce-analysis.mjs')) + ' ' + (Quote $destination) + ' --verify')
$commands.Add('# Copied source/TRX/real JSON-getter/recipient/Pipe/raw timing/GC/settings/PDB-witness/statistics consistency passed; omitted binaries not rehashed.')
$commands.Add('```')
$commands | Set-Content (Join-Path $destination 'validation-commands.md')
[ordered]@{
    candidate = 'F014'; verified_copy_mappings = $copies.Count; unique_authoritative_destinations = $copies.Count
    all_byte_identical = $true; copied_portable_audit_passed = $true
    proposal_disposition = 'rejected/design-blocked'; performance_pr_created = $false; shipping_source_changed = $false
    paired_comparisons = 0; candidate_profiles = 0; original_only_profiles = 1
    benchmark_reports = $audit.benchmarkOutcomes; raw_actual_iterations = $audit.actualWorkloadIterations
    retained_results = $audit.retainedResults; upper_filtered_samples = $audit.upperFilteredSamples
    actual_warmups = $audit.actualWarmups; actual_overheads = $audit.actualOverheadIterations
    actual_area_rows = 27; explicitly_reused_original_area_rows = 27; actual_new_owning_test_runs = 0; repository_sentinel_rows = 0
    producer_records = $audit.producerRecordsAudited; validated_benchmark_records = $audit.validatedBenchmarkRecordsAudited
    actual_setup_preflights = $audit.actualTimedSetupPreflightsAudited; source_snapshots = $audit.sourceSnapshotsVerified
    pe_pdb_witnesses = $audit.pePdbBindings; source_document_checks = $audit.sourcePdbDocumentChecks
    settings_records = $audit.capturedSettingsRecords; omitted_entries = $omissions.Count
    raw_dll_pdb_build_images_binlogs_published = $false
} | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $destination 'raw-file-copy-verification.json')
$files = @(Get-ChildItem $destination -Recurse -Force -File)
if ($files.Count -ne $copies.Count + 4 -or @($files | Where-Object Extension -In '.dll', '.exe', '.pdb', '.binlog').Count)
{
    throw 'Exact immutable count or omissions differ.'
}
$files.Count | Set-Content (Join-Path $PSScriptRoot 'F014-immutable-file-count.txt') -Encoding ascii
Write-Output "F014: $($copies.Count) byte-exact mappings/$($files.Count) immutable files; $($omissions.Count) omissions hashed; copied portable audit passed."
