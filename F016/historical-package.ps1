$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F016'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$destination = Join-Path $output 'F016'
if ((Test-Path $destination) -or @(git -C $output status --porcelain).Count)
{
    throw 'Fresh capsule and clean dedicated results checkout required.'
}
$audit = Get-Content (Join-Path $run 'measurement-audit.json') -Raw | ConvertFrom-Json
$source = Get-Content (Join-Path $run 'source-branch-publication.json') -Raw | ConvertFrom-Json
if (-not $audit.auditPassed -or -not $audit.actualLiveAuditPassed -or $audit.performancePrJustified -or
    -not $audit.budgetClosed -or $audit.successfulReports -ne 126 -or -not $source.actualRemoteCanonicalBytesVerified -or $source.sourceChanged)
{
    throw 'Complete conservative no-gain audit and restored remote original source required.'
}
foreach ($role in 'original','candidate')
{
    $fresh = Get-Content (Join-Path $run "reproduction-preparation\$role\prepared.json") -Raw | ConvertFrom-Json
    if ($fresh.nativeExecutionRequested -or $fresh.historicalCampaignReexecuted -or $fresh.mode -cne 'Prepare')
    {
        throw 'Only actual successful relocated Prepare builds may be claimed.'
    }
}
$copies = [System.Collections.Generic.List[object]]::new()
$omissions = [System.Collections.Generic.List[object]]::new()
function CopyExact([string] $Source, [string] $Relative, [string] $Kind, [string] $Original)
{
    $target = Join-Path $destination $Relative
    if (Test-Path $target)
    {
        throw "Never overwrite authoritative copied evidence:$Relative"
    }
    New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $target
    $hash = (Get-FileHash $Source).Hash
    if ((Get-FileHash $target).Hash -cne $hash)
    {
        throw 'Copied authoritative bytes differ.'
    }
    $copies.Add([ordered]@{
        original = $Original; destination = $Relative; kind = $Kind; bytes = (Get-Item $Source).Length; sha256 = $hash
    })
}
function Omit([IO.FileInfo] $Entry, [string] $Reason)
{
    $omissions.Add([ordered]@{
        original = [IO.Path]::GetRelativePath($run, $Entry.FullName)
        bytes = $Entry.Length; sha256 = (Get-FileHash $Entry.FullName).Hash; reason = $Reason
    })
}
function CopyRun([string] $Relative)
{
    $directory = if ($Relative) { Join-Path $run $Relative } else { $run }
    foreach ($entry in Get-ChildItem -LiteralPath $directory -Force)
    {
        $relativePath = if ($Relative) { "$Relative\$($entry.Name)" } else { $entry.Name }
        if ($entry.PSIsContainer)
        {
            if ($entry.Name -in 'image','framework-image','images','bin','obj','owning-tests','products','.git','node_modules')
            {
                foreach ($omitted in Get-ChildItem -LiteralPath $entry.FullName -Recurse -Force -File)
                {
                    Omit $omitted 'Frozen/fresh execution/product/test images or ephemeral build/restore outputs are deliberately not redistributed.'
                }
                continue
            }
            CopyRun $relativePath
        }
        elseif ($entry.Extension -in '.dll','.exe','.pdb','.binlog','.nupkg','.snupkg')
        {
            Omit $entry 'Compiled/build/package evidence deliberately omitted;exact hashes and actual text command/output/native observations remain.'
        }
        elseif ($entry.Extension -in '.cs','.csproj','.json','.trx','.log','.txt','.html','.md','.csv','.patch','.diff',
            '.ps1','.mjs','.stdout','.stderr','.config','.xml','.nuspec','.editorconfig','.props','.targets','.cmd')
        {
            CopyExact $entry.FullName $relativePath 'run' $relativePath
        }
        else
        {
            throw "Unclassified artifact:$relativePath"
        }
    }
}
CopyRun ''
foreach ($name in 'F016-analyze.mjs','F016-audit.mjs','F016-run-fresh.ps1')
{
    CopyExact (Join-Path $PSScriptRoot $name) $name 'session' $name
}
foreach ($entry in Get-ChildItem $PSScriptRoot -File | Where-Object { $_.Name -like 'F016-*' -and $_.Extension -in '.ps1','.mjs' })
{
    if ($entry.Name -in 'F016-analyze.mjs','F016-audit.mjs','F016-run-fresh.ps1')
    {
        continue
    }
    CopyExact $entry.FullName "historical-$($entry.Name.Substring(5))" 'session' $entry.Name
}
foreach ($pair in @(
    @('F016-package-gitattributes.txt','.gitattributes'),
    @('F016-issue-template.md','issue-template.md'),
    @('F016-results-readme.md','readme-template-source.md')
))
{
    CopyExact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
CopyExact 'C:\src\aspnetcore\LICENSE.txt' 'LICENSE.txt' 'repository' 'C:\src\aspnetcore\LICENSE.txt'
$omissions | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $destination 'omitted-file-manifest.json') -Encoding utf8NoBOM
$copies | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8NoBOM
$analysis = Get-Content (Join-Path $destination 'analysis.json') -Raw | ConvertFrom-Json
$rounds = [System.Collections.Generic.List[string]]::new()
$rounds.Add('| Shape | C1 time | C2 time | C3 time |')
$rounds.Add('|---|---:|---:|---:|')
foreach ($row in $analysis.rows)
{
    $values = @($row.rounds | ForEach-Object { '{0:+0.00;-0.00;0.00}%' -f $_.timeChangePercent })
    $rounds.Add("| $($row.shape) | $($values -join ' | ') |")
}
$readme = (Get-Content (Join-Path $PSScriptRoot 'F016-results-readme.md') -Raw).
    Replace('{{AGGREGATE_TABLE}}',(Get-Content (Join-Path $destination 'analysis-table.md') -Raw).TrimEnd()).
    Replace('{{ROUND_TABLE}}',($rounds -join "`n"))
if ($readme.Contains('{{'))
{
    throw 'Unfilled README evidence placeholder.'
}
$readme | Set-Content (Join-Path $destination 'README.md') -Encoding utf8NoBOM -NoNewline
$commands = [System.Collections.Generic.List[string]]::new()
$commands.Add('# F016 exact historical commands and observed outcomes')
$commands.Add('')
$commands.Add('Every fresh dotnet shell activates `. .\activate.ps1` from the source checkout. All3 paired comparisons are permanently closed;historical drivers refuse overwrites. These records are not authorization for a fourth run. No optimization PR is recommended.')
$commands.Add('')
function Quote([string] $Value)
{
    return "'" + $Value.Replace("'","''") + "'"
}
foreach ($entry in $copies | Where-Object { $_.kind -ceq 'run' -and $_.destination.EndsWith('.json') } | Sort-Object destination)
{
    $data = Get-Content (Join-Path $destination $entry.destination) -Raw | ConvertFrom-Json
    $records = if ($data -is [array]) { @($data) } elseif ($data.commands) { @($data.commands) } else { @($data) }
    foreach ($record in $records)
    {
        if (-not $record.arguments -or 'actualExitCode' -notin $record.PSObject.Properties.Name)
        {
            continue
        }
        $executable = if ($record.executable) { $record.executable } elseif ($record.entryPoint) { $record.entryPoint } else { '' }
        if (-not $executable)
        {
            throw "Actual command entry point missing:$($entry.destination)"
        }
        $commands.Add("## $($entry.destination): actual exit$($record.actualExitCode)")
        $commands.Add('```powershell')
        if ([IO.Path]::GetFileNameWithoutExtension($executable) -ceq 'dotnet')
        {
            $commands.Add('. .\activate.ps1')
        }
        $commands.Add('& ' + (Quote $executable) + ' ' + (($record.arguments | ForEach-Object { Quote $_ }) -join ' '))
        $commands.Add('```')
        $commands.Add('')
    }
}
$commands.Add('## Observed results and limits')
$commands.Add('Original/candidate:40net12+24net472 passed each,0skips/failures;all36new Decrypt_BlockAndStreamBoundaries_PreservesPayloadAndInputs Theory executions individually checked in actual XML-parsed TRX. Both roles build all3productTFMs;dual-target standalone harness builds cleanly;formatter0of2;enabled APICompat pack actually passes,all3packed owners match frozen products,released baseline version unset.')
$commands.Add('')
$commands.Add('Four real untimed contexts give252roundtrips/12contracts;6actual Framework profiles add252roundtrips and126successful reports. All3slotsclosed:1008raw/952retained/56upper-filtered/378warmups/2256actual overheads. Shared VM,AppDomain-inclusive managed allocation,no modern-path/whole-app/production-frequency throughput claim.406frozen files rehashed,20PEPDB/110selected documents,128TRXrows,28copied sources,252unchanged settings records.')
$commands.Add('')
$commands.Add('Large partial-block allocation benefits39.69-39.95% are retained,but SHA5121MiB+1 C3+57.11% time/aggregate+8.91% and small/aligned/empty costs prevent the combined gate passing. Conservative no-gain/inconclusive,not zero-allocation-benefit. Exact two-file +37/-1 candidate patch retained;source restored and unchanged remote baseline branch verified,no new source commit/PR. Relocated original and candidate Prepare builds pass,91-file images;no native execution or extra timing.')
$commands.Add('')
$commands.Add('## Actual copied portable audit: exit0')
$commands.Add('```powershell')
$commands.Add('node .\F016-analyze.mjs . --verify')
$commands.Add('node .\F016-audit.mjs . --verify')
$commands.Add('```')
$commands.Add('Copied raw/sample/source/native/TRX/statistical checks pass;omitted binary/binlog/package images are not reopened.')
$commands | Set-Content (Join-Path $destination 'validation-commands.md') -Encoding utf8NoBOM
node (Join-Path $destination 'F016-audit.mjs') $destination --verify
if ($LASTEXITCODE)
{
    throw 'Copied portable audit failed;retain package without rewriting measurements.'
}
[ordered]@{
    candidate = 'F016'; verified_copy_mappings = $copies.Count; unique_authoritative_destinations = $copies.Count
    all_byte_identical = $true; copied_portable_audit_passed = $true; omitted_entries = $omissions.Count
    proposal_disposition = $audit.proposalDisposition; performance_pr_justified = $false; shipping_source_files = 0
    retained_candidate_patch_files = 2; paired_comparisons = 3; completed_profiles = 6; benchmark_reports = 126
    raw_actual_iterations = 1008; retained_results = 952; upper_filtered_samples = 56; actual_warmups = 378; actual_overheads = 2256
    original_test_rows = 64; candidate_test_rows = 64; new_preservation_theory_executions = 36
    actual_native_roundtrips = 504; actual_argument_contracts = 12; pe_pdb_witness_records = 20
    selected_source_document_checks = 110; copied_source_snapshots = 28; live_frozen_files_rehashed = 406
    enabled_package_validation_passed = $true; fresh_original_and_candidate_preparation_passed = $true; fresh_native_execution_performed = $false
    raw_dll_pdb_build_images_binlogs_packages_published = $false; modern_path_performance_claimed = $false
} | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $destination 'raw-file-copy-verification.json') -Encoding utf8NoBOM
$files = @(Get-ChildItem $destination -Recurse -Force -File)
if ($files.Count -ne $copies.Count + 5 -or @($files | Where-Object Extension -In '.dll','.exe','.pdb','.binlog','.nupkg','.snupkg').Count)
{
    throw 'Exact immutable count/omissions differ.'
}
$files.Count | Set-Content (Join-Path $PSScriptRoot 'F016-immutable-file-count.txt') -Encoding ascii
Write-Output "F016:$($copies.Count) byte-exact mappings/$($files.Count) immutable files;$($omissions.Count) omissions hashed;copied portable audit passed."
