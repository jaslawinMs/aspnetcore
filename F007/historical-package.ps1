$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F007'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$destination=Join-Path $output 'F007'
if((Test-Path $destination) -or @(git -C $output status --porcelain).Count){throw 'Fresh capsule and clean dedicated results checkout required.'}
$audit=Get-Content (Join-Path $run 'measurement-audit.json') -Raw|ConvertFrom-Json
$source=Get-Content (Join-Path $run 'source-branch-publication.json') -Raw|ConvertFrom-Json
if($audit.disposition-cne'validated' -or -not$audit.actualLiveAuditPassed -or -not$audit.performancePrJustified -or
    -not$audit.comparisonBudgetClosed -or $audit.attemptedComparisonSlots-ne3 -or $audit.exactHarnessControlledComparisons-ne2 -or
    $audit.benchmarkOutcomes-ne88 -or -not$source.actualRemoteCanonicalBytesVerified -or -not$source.sourceChanged -or
    $source.performancePrCreated -or $audit.practicalDefaultAppBenefitEstablished){throw 'Actual qualified audit and exact published source required.'}
$copies=[System.Collections.Generic.List[object]]::new()
function CopyExact([string]$Source,[string]$Relative,[string]$Kind,[string]$Original)
{
    if([IO.Path]::GetExtension($Relative)-in'.dll','.exe','.pdb','.binlog','.pfx','.pem','.key','.crt'){throw 'Only classified source/text evidence is published.'}
    $target=Join-Path $destination $Relative
    if(Test-Path $target){throw "Do not overwrite copied evidence:$Relative"}
    New-Item (Split-Path $target -Parent) -ItemType Directory -Force|Out-Null
    Copy-Item -LiteralPath $Source -Destination $target
    $sha=(Get-FileHash $Source).Hash
    if((Get-FileHash $target).Hash-cne$sha){throw 'Copied bytes differ.'}
    $copies.Add([pscustomobject]@{original=$Original;destination=$Relative;kind=$Kind;bytes=(Get-Item $Source).Length;sha256=$sha})
}
function CopyRun([string]$Relative)
{
    $directory=if($Relative){Join-Path $run $Relative}else{$run}
    foreach($entry in Get-ChildItem -LiteralPath $directory -Force)
    {
        $relativePath=if($Relative){"$Relative\$($entry.Name)"}else{$entry.Name}
        if($entry.PSIsContainer)
        {
            if($entry.Name-in'binaries','bin','obj','.git','test-image','image','node_modules'){continue}
            CopyRun $relativePath
        }
        elseif($entry.Extension-in'.cs','.csproj','.resx','.props','.targets','.json','.trx','.log','.txt','.html','.md','.csv','.patch','.diff','.ps1','.mjs','.stdout','.stderr','.ts')
        {
            CopyExact $entry.FullName $relativePath 'run' $relativePath
        }
        elseif($entry.Extension-cne'.binlog'){throw "Unclassified artifact:$relativePath"}
    }
}
CopyRun ''
foreach($variant in 'original','candidate-1')
{
    foreach($name in 'AutoPerf.Benchmarks.runtimeconfig.json','AutoPerf.Benchmarks.deps.json')
    {
        CopyExact (Join-Path $run "binaries\$variant\$name") "execution-image-metadata\$variant\$name" 'run-image-metadata' "binaries\$variant\$name"
        CopyExact (Join-Path $run "retired-harness\failed-slot-1\binaries\$variant\$name") "execution-image-metadata\failed-slot-1\$variant\$name" 'run-image-metadata' "retired-harness\failed-slot-1\binaries\$variant\$name"
    }
}
foreach($pair in @(@('F007-results-readme.md','README.md'),@('F007-reproduce-analysis.mjs','reproduce-analysis.mjs'),
    @('F007-package-gitattributes.txt','.gitattributes'),@('F007-issue-template.md','issue-template.md'),@('F007-pr-detail-template.md','pr-detail-template.md')))
{
    CopyExact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
CopyExact 'C:\src\aspnetcore\.github\pull_request_template.md' 'repository-pull-request-template.md' 'repository-template' '.github\pull_request_template.md'
foreach($entry in Get-ChildItem $PSScriptRoot -File|Where-Object {$_.Name-like'F007-*' -and $_.Extension-in'.ps1','.mjs','.targets'})
{
    if($entry.Name-ceq'F007-reproduce-analysis.mjs'){continue}
    CopyExact $entry.FullName "historical-$($entry.Name.Substring(5))" 'session' $entry.Name
}
$copies|ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'authoritative-copy-manifest.json')
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify
if($LASTEXITCODE){throw 'Copied portable audit failed;never rewrite successful experiments.'}
$commands=[System.Collections.Generic.List[string]]::new()
$commands.Add('# F007 exact historical commands and observed outcomes');$commands.Add('')
$commands.Add('Every fresh dotnet shell activates `. .\activate.ps1` from `C:\src\aspnetcore`. Three spent timing slots:failed original-only Setup in1,no samples;two final order-reversed identical-harness pairs in2/3,88 successful reports. No extra timing.');$commands.Add('')
function Quote([string]$Value){return "'"+$Value.Replace("'","''")+"'"}
foreach($entry in $copies|Where-Object {$_.kind-ceq'run' -and $_.original.EndsWith('.json') -and $_.original.Contains('execution')}|Sort-Object original)
{
    $data=Get-Content (Join-Path $destination $entry.destination) -Raw|ConvertFrom-Json
    $records=if($data-is[array]){@($data)}elseif($data.commands){@($data.commands)}else{@($data)}
    foreach($record in $records)
    {
        if(-not$record.arguments){continue}
        if(-not$record.entryPoint -or 'actualExitCode'-notin$record.PSObject.Properties.Name){throw 'Exact command entry point/outcome missing.'}
        $commands.Add("## $($entry.original): actual exit$($record.actualExitCode)")
        $commands.Add('```powershell');$commands.Add($record.entryPoint+' '+(($record.arguments|ForEach-Object {Quote $_})-join' '));$commands.Add('```');$commands.Add('')
    }
}
$commands.Add('## Preserved preparation/setup/audit observations')
$commands.Add('Original build1 preceded larger-path controls;build2 metadata-freeze continuation encountered existing saved test-image bytes. Repair build3 retained the exact candidate owner under restored original source;hash guard rejected it before timing. Forced original owner/harness Rebuild restored exact tested bytes;clean inventory146 legitimately omitted a stale generator DLL versus147. Freeze metadata guard was corrected,not image bytes. Slot1 actual NullLogger GlobalSetup failure remains spent,zero samples. Final actual setup preflights pass. Read-only audit1 assumed lowercase enum wire text;typed serializer emits PascalCase,audit2 passes. No timing rerun or budget reset.');$commands.Add('')
$commands.Add('The first package attempt rejected the actual TypeScript producer source because its explicit allowlist omitted.ts. Its2508 byte-verified partial copies were preserved outside the run/results directories,then.ts was classified and a complete fresh capsule created. No experiment or raw source changed.');$commands.Add('')
$commands.Add('## Actual source publication: exit0,one file+9/-12,remote canonical source verified')
$commands.Add('```powershell');$commands.Add('git '+(($source.pushArguments|ForEach-Object {Quote $_})-join' '));$commands.Add('```');$commands.Add('')
$commands.Add('## Actual copied portable audit: exit0')
$commands.Add('```powershell');$commands.Add('node '+(Quote (Join-Path $destination 'reproduce-analysis.mjs'))+' '+(Quote $destination)+' --verify')
$commands.Add('# Copied source/TRX/input/contract/raw timing/GC/settings/PDB-witness/statistics consistency passed;omitted DLL/PDB/native bytes not rehashed.');$commands.Add('```')
$commands|Set-Content (Join-Path $destination 'validation-commands.md')
[ordered]@{candidate='F007';verified_copy_mappings=$copies.Count;unique_authoritative_destinations=$copies.Count;all_byte_identical=$true;
    copied_portable_audit_passed=$true;attempted_comparison_slots=3;failed_no_sample_slots=@(1);completed_comparison_ids=@(2,3);
    attempted_profiles=5;completed_profiles=4;benchmark_reports=88;raw_actual_iterations=704;retained_results=665;filtered_upper_samples=39;
    actual_warmups=264;actual_overheads=1700;existing_test_rows=66;producer_records=346;validated_owner_records=390;actual_setup_preflights=132;
    pe_pdb_bindings=14;source_document_checks=64;setting_records=176;raw_dll_pdb_build_images_binlogs_published=$false;
    exact_measured_candidate_source_retained=$true;performance_pr_created=$false;practical_default_app_benefit_established=$false}|
    ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'raw-file-copy-verification.json')
$files=@(Get-ChildItem $destination -Recurse -Force -File)
if($files.Count-ne$copies.Count+3 -or @($files|Where-Object Extension -In '.dll','.exe','.pdb','.binlog').Count){throw 'Exact immutable count/omissions differ.'}
$files.Count|Set-Content (Join-Path $PSScriptRoot 'F007-immutable-file-count.txt') -Encoding ascii
Write-Output "F007:$($copies.Count) byte-exact mappings/$($files.Count) immutable files;copied portable audit passed,two controlled pairs plus spent failed slot1."
