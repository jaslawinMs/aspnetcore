$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F013'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$destination = Join-Path $output 'F013'
if ((Test-Path $destination) -or @(git -C $output status --porcelain).Count)
{
    throw 'Fresh capsule and clean dedicated results checkout required.'
}
$audit = Get-Content (Join-Path $run 'measurement-audit.json') -Raw | ConvertFrom-Json
$source = Get-Content (Join-Path $run 'source-branch-publication.json') -Raw | ConvertFrom-Json
if (-not $audit.auditPassed -or -not $audit.actualLiveAuditPassed -or $audit.performancePrJustified -or
    $audit.proposalDisposition -cne 'no-gain' -or -not $audit.budgetClosed -or
    $audit.pairedComparisons -ne 3 -or $audit.originalProfiles -ne 3 -or $audit.candidateProfiles -ne 3 -or
    $audit.sourceCandidateShapesMeasured -ne 2 -or $audit.benchmarkOutcomes -ne 84 -or
    $audit.actualFreshOwningTestRuns -ne 3 -or $audit.actualFreshOwningRows -ne 84 -or
    -not $source.actualRemoteCanonicalBytesVerified -or $source.sourceChanged -or $source.performancePrCreated)
{
    throw 'Audited two-variant/three-comparison no-gain data and unchanged published source required.'
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
foreach ($role in 'original', 'captured-default-json', 'native-specialization-001', 'native-specialization-001-current-json', 'native-specialization-002', 'native-specialization-002-current-json')
{
    foreach ($name in 'AutoPerf.Benchmarks.runtimeconfig.json', 'AutoPerf.Benchmarks.deps.json')
    {
        CopyExact (Join-Path $run "images\$role\$name") "execution-image-metadata\$role\$name" 'run-image-metadata' "images\$role\$name"
    }
}
foreach ($pair in @(@('F013-results-readme.md', 'README.md'), @('F013-reproduce-analysis.mjs', 'reproduce-analysis.mjs'),
    @('F013-package-gitattributes.txt', '.gitattributes')))
{
    CopyExact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
foreach ($entry in Get-ChildItem $PSScriptRoot -File | Where-Object { $_.Name -like 'F013-*' -and $_.Extension -in '.ps1', '.mjs' })
{
    if ($entry.Name -ceq 'F013-reproduce-analysis.mjs')
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
$commands.Add('# F013 exact historical commands and observed outcomes')
$commands.Add('')
$commands.Add('Borrowed F011 commands under tests/original and borrowed-producer-build-execution retain their actual timestamps/outcomes and were not rerun. Fresh unchanged-original and each candidate actually ran28 rows. Every fresh .NET shell activates `. .\activate.ps1` from `C:\src\aspnetcore`. Three actual14-case comparisons: variant1 once, array-only variant2 twice, six profiles total. No shipping fix or selected gain. Budget permanently closed. These guarded historical commands preserve actual paths, not replay/overwrite instructions.')
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
    $records = if ($data -is [array]) { @($data) } elseif ($data.commands) { @($data.commands) } elseif ($data.profiles) { @($data.profiles) } else { @($data) }
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
$commands.Add('One new preservation-test helper was initially placed inside an existing method: test build exits1 with CS1513/CS1519, before any owning test/assertion. Exact failed source/log/binlog hash retained; premature test-run plan marker explicitly qualified. Distinct corrected original attempt passes28 rows. Both candidate suites pass28 rows each. Two auditor readers exit1 on actual-row schema and exact padding-ID expectations, then corrected independent audit passes; exact failed sources/full stderr retained. Preparation:17 actual native commands,16 successful/one failed build, plus4 successful changed-file whitespace checks; six independent18+14 producer contexts. First original successful runner has one display-only interpolation typo; actual TRX/audit correct. Original owner/current JSON and initial old27-row evidence explicitly reused/rehashed, not new builds/runs. Three actual comparisons, no borrowed group/broadcast timing. Twenty source files restored byte-exact and eight known output identities verified; six files actually restored, no new test/build claimed.')
$commands.Add('')
$commands.Add('## Actual unchanged independent source-branch publication: exit0, remote ref and owner bytes verified')
$commands.Add('```powershell')
$commands.Add('git ' + (($source.pushArguments | ForEach-Object { Quote $_ }) -join ' '))
$commands.Add('```')
$commands.Add('')
$commands.Add('## Actual copied portable audit: exit0')
$commands.Add('```powershell')
$commands.Add('node ' + (Quote (Join-Path $destination 'reproduce-analysis.mjs')) + ' ' + (Quote $destination) + ' --verify')
$commands.Add('# Copied source/111 separated fresh-borrowed TRX rows/real JSON-getter/recipient/Pipe/raw timing/GC/settings/PDB-witness/statistics consistency passed; omitted binaries not rehashed.')
$commands.Add('```')
$commands | Set-Content (Join-Path $destination 'validation-commands.md')
[ordered]@{
    candidate = 'F013'; verified_copy_mappings = $copies.Count; unique_authoritative_destinations = $copies.Count
    all_byte_identical = $true; copied_portable_audit_passed = $true
    proposal_disposition = 'no-gain'; performance_pr_created = $false; shipping_source_changed = $false
    source_candidate_shapes = $audit.sourceCandidateShapesMeasured; paired_comparisons = $audit.pairedComparisons
    original_profiles = $audit.originalProfiles; candidate_profiles = $audit.candidateProfiles; original_only_profiles = 0
    benchmark_reports = $audit.benchmarkOutcomes; raw_actual_iterations = $audit.actualWorkloadIterations
    retained_results = $audit.retainedResults; upper_filtered_samples = $audit.upperFilteredSamples
    actual_warmups = $audit.actualWarmups; actual_overheads = $audit.actualOverheadIterations
    actual_fresh_owning_test_runs = $audit.actualFreshOwningTestRuns; actual_fresh_owning_rows = $audit.actualFreshOwningRows
    explicitly_reused_original_area_rows = $audit.explicitlyReusedOriginalAreaRows; repository_sentinel_rows = 0
    producer_records = $audit.producerRecordsAudited; validated_benchmark_records = $audit.validatedBenchmarkRecordsAudited
    actual_setup_preflights = $audit.actualTimedSetupPreflightsAudited; source_snapshots = $audit.sourceSnapshotsVerified
    pe_pdb_witnesses = $audit.pePdbBindings; source_document_checks = $audit.sourcePdbDocumentChecks
    settings_records = $audit.capturedSettingsRecords; observed_allocation_changes = $audit.observedProcessWideAllocationChanges
    omitted_entries = $omissions.Count; raw_dll_pdb_build_images_binlogs_published = $false
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $destination 'raw-file-copy-verification.json')
$files = @(Get-ChildItem $destination -Recurse -Force -File)
if ($files.Count -ne $copies.Count + 4 -or @($files | Where-Object Extension -In '.dll', '.exe', '.pdb', '.binlog').Count)
{
    throw 'Exact immutable count or omissions differ.'
}
$files.Count | Set-Content (Join-Path $PSScriptRoot 'F013-immutable-file-count.txt') -Encoding ascii
Write-Output "F013: $($copies.Count) byte-exact mappings/$($files.Count) immutable files; $($omissions.Count) omissions hashed; copied portable audit passed."
