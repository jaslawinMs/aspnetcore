$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$run = Join-Path $PSScriptRoot 'autoperf-runs\F018'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$destination = Join-Path $output 'F018'
if ((Test-Path $destination) -or @(git -C $output status --porcelain).Count)
{
    throw 'Fresh capsule and clean dedicated results checkout required.'
}
$audit = Get-Content (Join-Path $run 'measurement-audit.json') -Raw | ConvertFrom-Json
$source = Get-Content (Join-Path $run 'source-publication\verified-source-publication.json') -Raw | ConvertFrom-Json
$fresh = Get-Content (Join-Path $run 'reproduction-prepared\prepared.json') -Raw | ConvertFrom-Json
if (-not $audit.auditPassed -or -not $audit.actualLiveAuditPassed -or -not $audit.performancePrJustified -or
    -not $audit.budgetClosed -or -not $audit.prespecifiedClearGainEarlyStopJustified -or $audit.successfulReports -ne 48 -or
    -not $source.actualRemoteRefVerified -or -not $source.onlyIntendedTwoSourceFilesCommitted -or
    $fresh.mode -cne 'Prepare' -or $fresh.nativeExecutionRequested -or $fresh.historicalCampaignBudgetReopened -or
    $fresh.files.Count -ne 133 -or $fresh.sourceCheckoutRevision -cne $source.commit)
{
    throw 'Actual qualified source/evidence and relocated candidate-only Prepare build required.'
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
            if ($entry.Name -in 'image','images','bin','obj','owning-tests','products','.git','node_modules')
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
foreach ($name in 'F018-analyze.mjs','F018-audit.mjs','F018-run-fresh.ps1')
{
    CopyExact (Join-Path $PSScriptRoot $name) $name 'session' $name
}
foreach ($entry in Get-ChildItem $PSScriptRoot -File | Where-Object { $_.Name -like 'F018-*' -and $_.Extension -in '.ps1','.mjs' })
{
    if ($entry.Name -in 'F018-analyze.mjs','F018-audit.mjs','F018-run-fresh.ps1')
    {
        continue
    }
    CopyExact $entry.FullName "historical-$($entry.Name.Substring(5))" 'session' $entry.Name
}
foreach ($pair in @(
    @('F018-package-gitattributes.txt','.gitattributes'),
    @('F018-issue-template.md','issue-template.md'),
    @('F018-pr-detail-template.md','pr-detail-template.md'),
    @('F018-results-readme.md','readme-template-source.md')
))
{
    CopyExact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
CopyExact 'C:\src\aspnetcore\.github\pull_request_template.md' 'pr-template-source.md' 'repository' 'C:\src\aspnetcore\.github\pull_request_template.md'
CopyExact 'C:\src\aspnetcore\docs\BuildFromSource.md' 'BuildFromSource-captured.md' 'repository' 'C:\src\aspnetcore\docs\BuildFromSource.md'
CopyExact 'C:\src\aspnetcore\LICENSE.txt' 'LICENSE.txt' 'repository' 'C:\src\aspnetcore\LICENSE.txt'
$omissions | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $destination 'omitted-file-manifest.json') -Encoding utf8NoBOM
$copies | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8NoBOM
$readme = (Get-Content (Join-Path $PSScriptRoot 'F018-results-readme.md') -Raw).
    Replace('{{AGGREGATE_TABLE}}',(Get-Content (Join-Path $destination 'analysis-table.md') -Raw).TrimEnd())
if ($readme.Contains('{{'))
{
    throw 'Unfilled README evidence placeholder.'
}
$readme | Set-Content (Join-Path $destination 'README.md') -Encoding utf8NoBOM -NoNewline
$commands = [System.Collections.Generic.List[string]]::new()
$commands.Add('# F018 exact historical commands and observed outcomes')
$commands.Add('')
$commands.Add('Every fresh dotnet shell activates `. .\activate.ps1` from the source checkout. One actual paired comparison met the prespecified clear-gain gate;the budget is permanently closed with two slots unused. Historical drivers are not a recipe to reopen the budget;use the separate fresh helper with a new output directory.')
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
$commands.Add('Original/candidate:68 actual Google owning tests pass each,0failures/skips;all36new UserInfoResponseEncodingPreservesClaims Theory executions individually checked in actual XML-parsed TRX. Both net12 products and the final standalone harness build cleanly. Formatter0of2;existing enabled APICompat pack passes and actual packed net12 owner equals frozen candidate,released baseline version unset. Release products are in a Debug-named package directory,not evidence of a Debug product.')
$commands.Add('')
$commands.Add('Initial default test build stops before assertions on missing ANCM native assets;the successful managed TestServer mode keeps actual references built,using UseIisNativeAssets=false,BuildNodeJS=false,CrossgenOutput=false,GenerateInstallers=false. Initial harness compile error is the unnecessary Newtonsoft import;all failed inputs retained before changing to existing System.Text.Json. The package-check parse-only failure is explicitly transcribed with its unexecuted driver;not a raw redirected shell log or timing attempt.')
$commands.Add('')
$commands.Add('One permanently closed pair:48reports/384raw/357retained/27upper-filtered/144warmups/940actualoverheads. Live audit290frozenfiles/30sources/12PEPDBrecords/32selecteddocuments/192profilecontracts/24real-producer cancellations/48wrapperpreflights/192unchangedsettings. Two124-file images differ onlyGoogleDLLPDB. Selected witnesses are not whole compiler provenance or test-PDB source binding.')
$commands.Add('')
$commands.Add('Qualified synthetic ASCII scaling gain:16KiB time-50.86%,B/op-31.12%;64KiB-80.09%/-32.75%. InvalidUTF8large time+15.19%/B/op+31.26% and all controls retained. Shared VM,precise process-wide inclusive managed diagnostic allocation,no external network/browser/fullcallback or production input distribution established;not merge-ready.')
$commands.Add('')
$commands.Add('Relocated candidate-only Prepare build actually passes,124image+9source files,no native execution or additional timing;not an original relocation check or another measured pair. Use F018-run-fresh.ps1 for new independent work and never relabel it as this closed historical comparison.')
$commands.Add('')
$commands.Add('## Actual copied portable audit: exit0')
$commands.Add('```powershell')
$commands.Add('node .\F018-analyze.mjs . --verify')
$commands.Add('node .\F018-audit.mjs . --verify')
$commands.Add('```')
$commands.Add('Copied raw/sample/source/native/TRX/statistical checks pass;omitted binary/binlog/runtime/package images are not reopened.')
$commands | Set-Content (Join-Path $destination 'validation-commands.md') -Encoding utf8NoBOM
node (Join-Path $destination 'F018-audit.mjs') $destination --verify
if ($LASTEXITCODE)
{
    throw 'Copied portable audit failed;retain package without rewriting measurements.'
}
[ordered]@{
    candidate = 'F018'; verified_copy_mappings = $copies.Count; unique_authoritative_destinations = $copies.Count
    all_byte_identical = $true; copied_portable_audit_passed = $true; omitted_entries = $omissions.Count
    proposal_disposition = $audit.proposalDisposition; performance_pr_justified = $true; shipping_source_files = 2
    paired_comparisons = 1; completed_profiles = 2; benchmark_reports = 48; budget_closed_after_prespecified_clear_gain = $true
    raw_actual_iterations = 384; retained_results = 357; upper_filtered_samples = 27; actual_warmups = 144; actual_overheads = 940
    original_test_rows = 68; candidate_test_rows = 68; new_preservation_theory_executions = 36
    actual_native_profile_contracts = 192; actual_producer_cancellation_contracts = 24; actual_wrapper_preflights = 48
    pe_pdb_witness_records = 12; selected_source_document_checks = 32; copied_source_snapshots = 30; live_frozen_files_rehashed = 290
    enabled_package_validation_passed = $true; fresh_candidate_only_preparation_passed = $true; fresh_native_execution_performed = $false
    raw_dll_pdb_build_images_binlogs_packages_published = $false; network_login_or_production_speedup_claimed = $false
    merge_ready = $false
} | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $destination 'raw-file-copy-verification.json') -Encoding utf8NoBOM
$files = @(Get-ChildItem $destination -Recurse -Force -File)
if ($files.Count -ne $copies.Count + 5 -or @($files | Where-Object Extension -In '.dll','.exe','.pdb','.binlog','.nupkg','.snupkg').Count)
{
    throw 'Exact immutable count/omissions differ.'
}
$files.Count | Set-Content (Join-Path $PSScriptRoot 'F018-immutable-file-count.txt') -Encoding ascii
Write-Output "F018:$($copies.Count) byte-exact mappings/$($files.Count) immutable files;$($omissions.Count) omissions hashed;copied portable audit passed."
