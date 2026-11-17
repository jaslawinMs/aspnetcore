$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F004'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$destination=Join-Path $output 'F004'
if((Test-Path $destination) -or @(git -C $output status --porcelain).Count){throw 'Fresh capsule and clean dedicated results checkout required.'}
$audit=Get-Content (Join-Path $run 'measurement-audit.json') -Raw|ConvertFrom-Json
$source=Get-Content (Join-Path $run 'source-branch-publication.json') -Raw|ConvertFrom-Json
if($audit.disposition-cne'no-gain' -or $audit.sourceComparisons-ne3 -or $audit.benchmarkOutcomes-ne60 -or
    -not $audit.actualLiveAuditPassed -or -not $source.actualRemoteRefVerified -or $source.sourceChanged -or $source.performancePrCreated){throw 'Actual audited no-gain/unchanged fork source required.'}
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
foreach($pair in @(@('F004-results-readme.md','README.md'),@('F004-reproduce-analysis.mjs','reproduce-analysis.mjs'),@('F004-package-gitattributes.txt','.gitattributes')))
{
    CopyExact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
foreach($entry in Get-ChildItem $PSScriptRoot -File|Where-Object {$_.Name-like'F004-*' -and $_.Extension-in'.ps1','.mjs','.targets'})
{
    if($entry.Name-ceq'F004-reproduce-analysis.mjs'){continue}
    CopyExact $entry.FullName "historical-$($entry.Name.Substring(5))" 'session' $entry.Name
}
$copies|ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'authoritative-copy-manifest.json')
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify
if($LASTEXITCODE){throw 'Actual copied portable audit failed;do not rerun or rewrite successful experiments.'}
$commands=[System.Collections.Generic.List[string]]::new()
$commands.Add('# F004 exact historical commands and observed outcomes');$commands.Add('')
$commands.Add('Every fresh dotnet shell activates `. .\activate.ps1` from `C:\src\aspnetcore`. Three paired comparisons/six10-case profiles;source/owner restored. These immutable historical drivers refuse overwrite.');$commands.Add('')
function Quote([string]$Value){return "'"+$Value.Replace("'","''")+"'"}
foreach($entry in $copies|Where-Object {$_.kind-ceq'run' -and $_.original.EndsWith('.json') -and $_.original.Contains('execution')}|Sort-Object original)
{
    $data=Get-Content (Join-Path $destination $entry.destination) -Raw|ConvertFrom-Json
    $records=if($data-is[array]){@($data)}elseif($data.commands){@($data.commands)}else{@($data)}
    foreach($record in $records)
    {
        if(-not $record.arguments){continue}
        if(-not $record.entryPoint -or 'actualExitCode'-notin$record.PSObject.Properties.Name){throw 'Exact command entry point/outcome missing.'}
        $commands.Add("## $($entry.original): actual exit$($record.actualExitCode)")
        $commands.Add('```powershell');$commands.Add($record.entryPoint+' '+(($record.arguments|ForEach-Object {Quote $_})-join' '));$commands.Add('```');$commands.Add('')
    }
}
$commands.Add('## Preserved outer observations and unchanged source publication')
$commands.Add('Observed initial-source/context1/context2 guard exits and original-build1/analysis1 failures are retained,not rerun or relabeled. Guard-command inner logs are complete;separate outer-console files were not captured for the first four preparation observations. Original build2/candidate build1,20 existing facts per source and72 compiler checks per original/candidate/captured-current class passed. Actual source push/ref/canonical content verified;no source commit/PR.');$commands.Add('')
$commands.Add('```powershell');$commands.Add('git '+(($source.pushArguments|ForEach-Object {Quote $_})-join' '));$commands.Add('# Actual exit0,unchanged baseline ref/canonical source verified.');$commands.Add('```');$commands.Add('')
$commands.Add('## Actual copied portable audit: exit0')
$commands.Add('```powershell');$commands.Add('node '+(Quote (Join-Path $destination 'reproduce-analysis.mjs'))+' '+(Quote $destination)+' --verify')
$commands.Add('# Passed copied source/TRX/compiler/raw timing/GC/settings/PE-PDB witness/statistics consistency. Omitted DLL/PDB/runtime bytes cannot be rehashed offline.');$commands.Add('```')
$commands|Set-Content (Join-Path $destination 'validation-commands.md')
[ordered]@{candidate='F004';verified_copy_mappings=$copies.Count;unique_authoritative_destinations=$copies.Count;all_byte_identical=$true;
    copied_portable_audit_passed=$true;source_comparisons=3;profiles=6;benchmark_reports=60;raw_actual_iterations=480;retained_results=461;
    filtered_upper_samples=19;actual_warmups=180;actual_overheads=1200;existing_test_rows=40;compiler_checks=216;pe_pdb_bindings=20;source_document_checks=38;
    setting_records=120;raw_dll_pdb_build_images_binlogs_published=$false;shipping_source_restored=$true;performance_pr_created=$false}|
    ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'raw-file-copy-verification.json')
$files=@(Get-ChildItem $destination -Recurse -Force -File)
if($files.Count-ne$copies.Count+3 -or @($files|Where-Object Extension -In '.dll','.exe','.pdb','.binlog').Count){throw 'Exact immutable count/omissions differ.'}
$files.Count|Set-Content (Join-Path $PSScriptRoot 'F004-immutable-file-count.txt') -Encoding ascii
Write-Output "F004:$($copies.Count) byte-exact mappings/$($files.Count) immutable files;actual copied portable audit passed,no PR."
