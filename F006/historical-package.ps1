$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F006'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$destination=Join-Path $output 'F006'
if((Test-Path $destination) -or @(git -C $output status --porcelain).Count){throw 'Fresh capsule and clean dedicated results checkout required.'}
$audit=Get-Content (Join-Path $run 'measurement-audit.json') -Raw|ConvertFrom-Json
$source=Get-Content (Join-Path $run 'source-branch-publication.json') -Raw|ConvertFrom-Json
$restored=Get-Content (Join-Path $run 'source-restoration.json') -Raw|ConvertFrom-Json
if($audit.disposition-cne'validated' -or $audit.recommendedCampaignDisposition-cne'no-gain' -or $audit.performancePrJustified -or
    $audit.sourceComparisons-ne3 -or $audit.benchmarkOutcomes-ne132 -or $audit.exactHarnessControlledComparisons-ne3 -or
    -not$audit.actualLiveAuditPassed -or -not$source.actualRemoteRefVerified -or -not$source.actualRemoteCanonicalSourceVerified -or
    $source.sourceChanged -or $source.performancePrCreated -or -not$restored.sourceByteExact -or -not$restored.restoredOwnerDllAndPdbByteExact){throw 'Actual audited no-gain,exact restoration and unchanged fork source required.'}
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
        elseif($entry.Extension-in'.cs','.csproj','.resx','.props','.targets','.json','.trx','.log','.txt','.html','.md','.csv','.patch','.diff','.ps1','.mjs','.stdout','.stderr')
        {
            CopyExact $entry.FullName $relativePath 'run' $relativePath
        }
        elseif($entry.Extension-cne'.binlog'){throw "Unclassified artifact:$relativePath"}
    }
}
CopyRun ''
foreach($variant in 'original','candidate-1','current-default-class')
{
    foreach($name in 'AutoPerf.Benchmarks.runtimeconfig.json','AutoPerf.Benchmarks.deps.json')
    {
        CopyExact (Join-Path $run "binaries\$variant\$name") "execution-image-metadata\$variant\$name" 'run-image-metadata' "binaries\$variant\$name"
    }
}
foreach($variant in 'original','candidate-1')
{
    foreach($entry in Get-ChildItem (Join-Path $run "tests\$variant\test-image") -Filter '*.json' -File)
    {
        CopyExact $entry.FullName "execution-test-metadata\$variant\$($entry.Name)" 'run-image-metadata' "tests\$variant\test-image\$($entry.Name)"
    }
}
foreach($pair in @(@('F006-results-readme.md','README.md'),@('F006-reproduce-analysis.mjs','reproduce-analysis.mjs'),@('F006-package-gitattributes.txt','.gitattributes')))
{
    CopyExact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
foreach($entry in Get-ChildItem $PSScriptRoot -File|Where-Object {$_.Name-like'F006-*' -and $_.Extension-in'.ps1','.mjs','.targets'})
{
    if($entry.Name-ceq'F006-reproduce-analysis.mjs'){continue}
    CopyExact $entry.FullName "historical-$($entry.Name.Substring(5))" 'session' $entry.Name
}
$copies|ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'authoritative-copy-manifest.json')
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify
if($LASTEXITCODE){throw 'Actual copied portable audit failed;never rewrite successful experiments.'}
$commands=[System.Collections.Generic.List[string]]::new()
$commands.Add('# F006 exact historical commands and observed outcomes');$commands.Add('')
$commands.Add('Every fresh dotnet shell activates `. .\activate.ps1` from `C:\src\aspnetcore`. Three exact-harness owner comparisons,six22-case profiles;source and original DLL/PDB restored byte-exact. No extra measurement.');$commands.Add('')
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
$commands.Add('## Actual unchanged independent source publication: exit0,remote ref/canonical source verified')
$commands.Add('```powershell');$commands.Add('git '+(($source.pushArguments|ForEach-Object {Quote $_})-join' '));$commands.Add('```');$commands.Add('')
$commands.Add('## Actual copied portable audit: exit0')
$commands.Add('```powershell');$commands.Add('node '+(Quote (Join-Path $destination 'reproduce-analysis.mjs'))+' '+(Quote $destination)+' --verify')
$commands.Add('# Passed copied source/TRX/compiler/raw timing/GC/settings/PDB-witness/statistics consistency. Omitted DLL/PDB/runtime bytes cannot be rehashed offline.');$commands.Add('```')
$commands.Add('');$commands.Add('All recorded builds/tests/characterizations/profiles and the first independent live audit passed. Historical preimplementation acceptance and pre-audit evaluation remain unchanged;post-audit restoration/decision resolves their earlier status. No performance PR or extra profiling run.')
$commands|Set-Content (Join-Path $destination 'validation-commands.md')
[ordered]@{candidate='F006';verified_copy_mappings=$copies.Count;unique_authoritative_destinations=$copies.Count;all_byte_identical=$true;
    copied_portable_audit_passed=$true;source_comparisons=3;profiles=6;benchmark_reports=132;controlled_comparisons=3;controlled_reports=132;exploratory_reports=0;
    raw_actual_iterations=1056;retained_results=1014;filtered_upper_samples=42;actual_warmups=396;actual_overheads=2635;
    existing_test_rows=40;compiler_checks=360;bl0014_observations=4248;normal_membership_producer_proofs=312;pe_pdb_bindings=20;source_document_checks=38;setting_records=264;
    raw_dll_pdb_build_images_binlogs_published=$false;shipping_source_and_original_owner_restored=$true;performance_pr_created=$false}|
    ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'raw-file-copy-verification.json')
$files=@(Get-ChildItem $destination -Recurse -Force -File)
if($files.Count-ne$copies.Count+3 -or @($files|Where-Object Extension -In '.dll','.exe','.pdb','.binlog').Count){throw 'Exact immutable count/omissions differ.'}
$files.Count|Set-Content (Join-Path $PSScriptRoot 'F006-immutable-file-count.txt') -Encoding ascii
Write-Output "F006:$($copies.Count) byte-exact mappings/$($files.Count) immutable files;actual copied portable audit passed,3 exact-harness comparisons,no PR."
