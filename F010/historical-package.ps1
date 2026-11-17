$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F010'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$destination=Join-Path $output 'F010'
if((Test-Path $destination) -or @(git -C $output status --porcelain).Count){throw 'Fresh capsule and clean dedicated results checkout required.'}
$audit=Get-Content (Join-Path $run 'measurement-audit.json') -Raw|ConvertFrom-Json
$source=Get-Content (Join-Path $run 'source-branch-publication.json') -Raw|ConvertFrom-Json
if(-not$audit.auditPassed -or -not$audit.actualLiveAuditPassed -or -not$audit.performancePrJustified -or -not$audit.budgetClosed -or
    $audit.proposalDisposition-cne'qualified-draft/existing-set-cpu-tradeoff' -or $audit.pairedComparisons-ne3 -or $audit.successfulReports-ne66 -or
    -not$source.actualRemoteCanonicalBytesVerified -or $source.trackedFilesChanged-ne2 -or $audit.allocationBenefitObserved){throw 'Actual qualified compatible CPU-tradeoff source/audit required.'}
$copies=[System.Collections.Generic.List[object]]::new()
$omissions=[System.Collections.Generic.List[object]]::new()
function CopyExact([string]$Source,[string]$Relative,[string]$Kind,[string]$Original)
{
    if([IO.Path]::GetExtension($Relative)-in'.dll','.exe','.pdb','.binlog','.nupkg','.snupkg','.pfx','.pem','.key','.crt'){throw 'Only classified source/text evidence is published.'}
    $target=Join-Path $destination $Relative
    if(Test-Path $target){throw "Do not overwrite copied evidence:$Relative"}
    New-Item (Split-Path $target -Parent) -ItemType Directory -Force|Out-Null
    Copy-Item -LiteralPath $Source -Destination $target
    $hash=(Get-FileHash $Source).Hash
    if((Get-FileHash $target).Hash-cne$hash){throw 'Copied bytes differ.'}
    $copies.Add([pscustomobject]@{original=$Original;destination=$Relative;kind=$Kind;bytes=(Get-Item $Source).Length;sha256=$hash})
}
function Omit([IO.FileInfo]$Entry,[string]$Reason)
{
    if($Entry.Extension-in'.pfx','.pem','.key','.crt'){throw 'Unexpected nonpublishable key material;stop classification.'}
    $omissions.Add([pscustomobject]@{original=[IO.Path]::GetRelativePath($run,$Entry.FullName);bytes=$Entry.Length;
        sha256=(Get-FileHash $Entry.FullName).Hash;reason=$Reason})
}
function CopyRun([string]$Relative)
{
    $directory=if($Relative){Join-Path $run $Relative}else{$run}
    foreach($entry in Get-ChildItem -LiteralPath $directory -Force)
    {
        $relativePath=if($Relative){"$Relative\$($entry.Name)"}else{$entry.Name}
        if($entry.PSIsContainer)
        {
            if($entry.Name-in'images','bin','obj','test-image','.git','node_modules')
            {
                foreach($omitted in Get-ChildItem $entry.FullName -Recurse -Force -File)
                {Omit $omitted 'Execution/test images or ephemeral build/restore outputs deliberately not distributed.'}
                continue
            }
            CopyRun $relativePath
        }
        elseif($entry.Extension-in'.cs','.csproj','.json','.trx','.log','.txt','.html','.md','.csv','.patch','.diff','.ps1','.mjs','.stdout','.stderr','.config','.xml','.nuspec')
        {
            CopyExact $entry.FullName $relativePath 'run' $relativePath
        }
        elseif($entry.Extension-in'.dll','.exe','.pdb','.binlog','.nupkg','.snupkg')
        {Omit $entry 'Compiled/build/package evidence deliberately omitted;exact hashes,commands,text logs and successful task-event proof retained.'}
        else{throw "Unclassified artifact:$relativePath"}
    }
}
CopyRun ''
foreach($role in 'original','candidate','failed-original')
{
    $prefix=if($role-ceq'failed-original'){'preparation-attempts\attempt-1\images'}else{'images'}
    $variant=if($role-ceq'failed-original'){'original'}else{$role}
    foreach($kind in 'primary','legacy','standard')
    {
        $image=if($kind-ceq'primary'){$variant}else{"$kind-$variant"}
        $names=if($kind-ceq'primary'){@('AutoPerf.Benchmarks.runtimeconfig.json','AutoPerf.Benchmarks.deps.json')}
            elseif($kind-ceq'legacy'){@('AutoPerf.Compatibility.exe.config')}
            else{@('AutoPerf.Compatibility.runtimeconfig.json','AutoPerf.Compatibility.deps.json')}
        foreach($name in $names)
        {
            CopyExact (Join-Path $run "$prefix\$image\$name") "execution-image-metadata\$role\$kind\$name" 'run-image-metadata' "$prefix\$image\$name"
        }
    }
}
foreach($pair in @(@('F010-results-readme.md','README.md'),@('F010-reproduce-analysis.mjs','reproduce-analysis.mjs'),
    @('F010-package-gitattributes.txt','.gitattributes'),@('F010-issue-template.md','issue-template.md'),@('F010-pr-detail-template.md','pr-detail-template.md')))
{
    CopyExact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
foreach($entry in Get-ChildItem $PSScriptRoot -File|Where-Object {$_.Name-like'F010-*' -and $_.Extension-in'.ps1','.mjs'})
{
    if($entry.Name-ceq'F010-reproduce-analysis.mjs'){continue}
    CopyExact $entry.FullName "historical-$($entry.Name.Substring(5))" 'session' $entry.Name
}
$omissions|ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'omitted-file-manifest.json')
$copies|ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'authoritative-copy-manifest.json')
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify
if($LASTEXITCODE){throw 'Copied portable audit failed;retain partial package,never rewrite experiments.'}
$commands=[System.Collections.Generic.List[string]]::new()
$commands.Add('# F010 exact historical commands and observed outcomes');$commands.Add('')
$commands.Add('Every fresh dotnet shell activates `. .\activate.ps1` from `C:\src\aspnetcore`. Three original/candidate comparisons and their six profiles are permanently closed;these are guarded historical commands,not permission to rerun or overwrite evidence.');$commands.Add('')
function Quote([string]$Value){return "'"+$Value.Replace("'","''")+"'"}
foreach($entry in $copies|Where-Object {$_.kind-ceq'run' -and $_.original.EndsWith('execution.json')}|Sort-Object original)
{
    $data=Get-Content (Join-Path $destination $entry.destination) -Raw|ConvertFrom-Json
    $records=if($data-is[array]){@($data)}elseif($data.commands){@($data.commands)}elseif($data.profiles){@($data.profiles)}else{@($data)}
    foreach($record in $records)
    {
        if(-not$record.arguments){continue}
        if(-not$record.entryPoint -or 'actualExitCode'-notin$record.PSObject.Properties.Name){throw 'Exact command entry point/outcome missing.'}
        $commands.Add("## $($entry.original):$($record.label) actual exit$($record.actualExitCode)")
        $commands.Add('```powershell');if($record.entryPoint-ceq'dotnet'){$commands.Add('. .\activate.ps1')}
        $commands.Add($record.entryPoint+' '+(($record.arguments|ForEach-Object {Quote $_})-join' '));$commands.Add('```');$commands.Add('')
    }
}
$commands.Add('## Results and retained failures')
$commands.Add('Original full owner suite214passed/0failed/0skipped=212area+2sentinels;candidate219/0/0=217area+2sentinels. Both rows of UsesOrdinalHashSetValueComparison and UsesLiveAllowedSet plus UsesOverriddenAllowedValuesEnumeration explicitly checked. All3 owner TFMs build;39/39/50 final public checks per role. Actual enabled pack task executes successfully;existing nonservicing released-baseline comparison remains disabled. Scoped whitespace exits0.');$commands.Add('')
$commands.Add('Original preparation1 compiles all consumers with wrong unused Metadata-name warnings,then native net462 exits-532462766 after25 producer records on incorrect harness deferred-count assumption. Actual eager failure formatting explains counts2/3/4;corrected harness/reference passes. Candidate preparation1 owner builds all pass then test build exits1/xUnit2017;Boolean-local repair preserves assertions and reuses exact unchanged owners. Extractor1 exits1 for wrong GC prefix;independent audit1 wrong additional-source folder,audit2 setup-only native field assumption,audit3 passes. No timing repeated or budget reset.');$commands.Add('')
$commands.Add('## Actual measured source publication: exit0,actual fork ref/both canonical source blobs verified')
$commands.Add('```powershell');$commands.Add('git '+(($source.pushArguments|ForEach-Object {Quote $_})-join' '));$commands.Add('```');$commands.Add('')
$commands.Add('## Actual copied portable audit: exit0')
$commands.Add('```powershell');$commands.Add('node '+(Quote (Join-Path $destination 'reproduce-analysis.mjs'))+' '+(Quote $destination)+' --verify')
$commands.Add('```');$commands.Add('Independent copied source/native producer/TRX/raw-sample/GC/statistical consistency passed;omitted binaries/binlogs/packages not rehashed or replayed.')
$commands|Set-Content (Join-Path $destination 'validation-commands.md')
[ordered]@{
    candidate='F010';verified_copy_mappings=$copies.Count;unique_authoritative_destinations=$copies.Count;all_byte_identical=$true;copied_portable_audit_passed=$true
    proposal_disposition=$audit.proposalDisposition;shipping_source_files=2;performance_pr_created=$false;paired_comparisons=3;completed_profiles=6;benchmark_reports=66
    raw_actual_iterations=528;retained_results=491;upper_filtered_samples=37;actual_warmups=198;actual_overheads=1120;original_test_rows=214;candidate_test_rows=219
    producer_records=347;actual_setup_preflights=88;source_snapshots=192;pe_pdb_witnesses=26;source_document_checks=236;settings_records=132
    actual_successful_package_validation_tasks=1;omitted_entries=$omissions.Count;raw_dll_pdb_build_images_binlogs_packages_published=$false;allocation_benefit_observed=$false
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $destination 'raw-file-copy-verification.json')
$files=@(Get-ChildItem $destination -Recurse -Force -File)
if($files.Count-ne$copies.Count+4 -or @($files|Where-Object Extension -In '.dll','.exe','.pdb','.binlog','.nupkg','.snupkg').Count){throw 'Exact immutable count/omissions differ.'}
$files.Count|Set-Content (Join-Path $PSScriptRoot 'F010-immutable-file-count.txt') -Encoding ascii
Write-Output "F010:$($copies.Count) byte-exact mappings/$($files.Count) immutable files;$($omissions.Count) omissions hashed;copied portable audit passed,3/3closed,no allocation/default-app gain claim."
