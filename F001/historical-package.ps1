$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F001'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$destination=Join-Path $output 'F001'
if((Test-Path $destination) -or @(git -C $output status --porcelain).Count){throw 'Fresh capsule and clean dedicated results checkout required.'}
$audit=Get-Content (Join-Path $run 'measurement-audit.json') -Raw|ConvertFrom-Json
$publication=Get-Content (Join-Path $run 'source-branch-publication.json') -Raw|ConvertFrom-Json
if($audit.disposition -cne 'rejected' -or $audit.sourceComparisons -ne 0 -or $audit.benchmarkOutcomes -ne 3 -or
    -not $publication.actualRemoteRefVerified -or $publication.sourceChanged){throw 'Exact rejected audited original-only evidence/source required.'}
$copies=[System.Collections.Generic.List[object]]::new()
$omissions=[System.Collections.Generic.List[object]]::new()
function Copy-Exact([string]$Source,[string]$Relative,[string]$Kind,[string]$Original)
{
    if(@($Relative -split '[\\/]'|Where-Object {$_ -ieq 'keys'}).Count -or
        [IO.Path]::GetExtension($Relative) -in '.dll','.exe','.pdb','.pfx','.pem','.key','.crt','.binlog'){throw 'No binary/certificate/private-key material allowed.'}
    $target=Join-Path $destination $Relative
    if(Test-Path $target){throw "Never overwrite raw evidence:$Relative"}
    New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force|Out-Null
    Copy-Item -LiteralPath $Source -Destination $target
    $sha=(Get-FileHash $Source).Hash
    if((Get-FileHash $target).Hash -cne $sha){throw 'Copied bytes differ.'}
    $copies.Add([pscustomobject]@{original=$Original;destination=$Relative;kind=$Kind;bytes=(Get-Item $Source).Length;sha256=$sha})
}
function Copy-Run([string]$Relative)
{
    $folder=if($Relative){Join-Path $run $Relative}else{$run}
    foreach($entry in Get-ChildItem -LiteralPath $folder -Force)
    {
        $relativePath=if($Relative){"$Relative\$($entry.Name)"}else{$entry.Name}
        if($entry.PSIsContainer)
        {
            if($entry.Name -ieq 'keys'){throw 'Unexpected key directory;stop and classify.'}
            if($entry.Name -in 'binaries','bin','obj','node_modules','.git','image'){continue}
            Copy-Run $relativePath
        }
        elseif($entry.Name -like 'vstest-diagnostic*.log')
        {
            $omissions.Add([pscustomobject]@{original=$relativePath;bytes=$entry.Length;sha256=(Get-FileHash $entry.FullName).Hash
                reason='Optional detailed host/protocol metadata retained locally,not public. Exact TRX,test command/outcome,all17 GUID associations,source inputs and benchmark raw results are published.'})
        }
        elseif($entry.Extension -in '.cs','.csproj','.props','.targets','.json','.trx','.log','.txt','.html','.md','.csv','.diff','.patch','.ps1','.mjs','.stdout','.stderr')
        {
            Copy-Exact $entry.FullName $relativePath 'run' $relativePath
        }
        elseif($entry.Extension -cne '.binlog'){throw "Unclassified artifact:$relativePath"}
    }
}
Copy-Run ''
foreach($tag in 'original-prep1','original-prep2')
{
    foreach($name in 'AutoPerf.Benchmarks.runtimeconfig.json','AutoPerf.Benchmarks.deps.json')
    {
        Copy-Exact (Join-Path $run "binaries\$tag\$name") "execution-image-metadata\$tag\$name" 'run-image-metadata' "binaries\$tag\$name"
    }
}
foreach($entry in Get-ChildItem (Join-Path $run 'tests\original\image') -File -Filter '*.json')
{
    Copy-Exact $entry.FullName "tests\original\image-metadata\$($entry.Name)" 'run-image-metadata' "tests\original\image\$($entry.Name)"
}
foreach($pair in @(@('F001-results-readme.md','README.md'),@('F001-reproduce-analysis.mjs','reproduce-analysis.mjs'),@('F001-package-gitattributes.txt','.gitattributes')))
{
    Copy-Exact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
foreach($entry in Get-ChildItem $PSScriptRoot -File|Where-Object {$_.Name -like 'F001-*' -and $_.Extension -in '.ps1','.mjs'})
{
    if($entry.Name -ceq 'F001-reproduce-analysis.mjs'){continue}
    Copy-Exact $entry.FullName "historical-$($entry.Name.Substring(5))" 'session' $entry.Name
}
$copies|ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify
if($LASTEXITCODE){throw 'Actual copied portable audit failed;never repair by rerunning successful experiments.'}
$commands=[System.Collections.Generic.List[string]]::new()
$commands.Add('# F001 exact historical commands and observed outcomes');$commands.Add('')
$commands.Add('Every fresh dotnet shell activates `. .\activate.ps1` at `C:\src\aspnetcore`. One original-only3-case diagnostic,zero changed-source profiles/comparisons. Historical overwrite guards intentionally prohibit replaying into completed outputs.');$commands.Add('')
function Quote([string]$Value){return "'"+$Value.Replace("'","''")+"'"}
foreach($entry in $copies|Where-Object {$_.kind -like 'run*' -and $_.original.EndsWith('.json') -and
    ($_.original.Contains('execution') -or $_.original -ceq 'context-amendment.json')}|Sort-Object original)
{
    $data=Get-Content (Join-Path $destination $entry.destination) -Raw|ConvertFrom-Json
    $records=if($data.commands){@($data.commands)}else{@($data)}
    foreach($record in $records)
    {
        if(-not $record.arguments){continue}
        $exitField=@('actualExitCode','exitCode','exit_code','observedExitCode'|Where-Object {$_ -in $record.PSObject.Properties.Name})|Select-Object -First 1
        if(-not $exitField){throw "Actual command outcome missing:$($entry.original)"}
        $executable=if($record.entryPoint){$record.entryPoint}else{throw 'Actual entry point required.'}
        $commands.Add("## $($entry.original): actual exit$($record.$exitField)")
        $commands.Add('```powershell');$commands.Add($executable+' '+(($record.arguments|ForEach-Object {Quote $_}) -join ' '));$commands.Add('```');$commands.Add('')
    }
}
$commands.Add('## Preserved preparation outcomes')
$commands.Add('- Initial discovery child exit0 found17 rows;outer initial display-uniqueness checker exit1 before any test execution because two source rows share truncated text. Same discovery continued without rediscovery;17 unique test/execution IDs passed once,zero skips.')
$commands.Add('- Two standalone builds exit0. First has two redundant missing Pipelines-reference warnings;second removes that reference because net12 provides it and has0 warnings. First producer preparation actual child exit-532462766:incorrect enum namespace after actual session construction. Second preparation fixes exact System.Net.Http type name and passes all six producer/leaf/opposite controls. All original source/logs/negative exits retained.')
$commands.Add('- One original-only three-case monitoring profile actual exit0. Three warmups/eight retained each;no actual overhead samples. Source comparisons0,not a comparative no-gain or optimized candidate.')
$commands.Add('- Independent full live auditor actual exit0:3 outcomes/24 retained/9 warmups/36 prepared+36 checked closed fixtures/17 exact test rows/19 PDB documents;complete frozen image and captured physical runtime identities rehashed.')
$commands.Add('')
$commands.Add('## Actual unchanged independent source-branch publication:push/ref/canonical content verified')
$commands.Add('```powershell');$commands.Add('git '+(($publication.pushArguments|ForEach-Object {Quote $_}) -join ' '));$commands.Add('# Actual exit0,unchanged baseline ref and canonical source matched. No source commit or PR created.');$commands.Add('```');$commands.Add('')
$commands.Add('## Actual public copied audit:exit0')
$commands.Add('```powershell');$commands.Add('node '+(Quote (Join-Path $destination 'reproduce-analysis.mjs'))+' '+(Quote $destination)+' --verify')
$commands.Add('# Passed:3 original-only outcomes/24 retained/9 warmups/36 prepared+36 closed fixtures/17 exact test rows/19 PDB documents. Omitted DLL/PDB/runtime bytes cannot be rehashed offline.');$commands.Add('```')
$commands|Set-Content (Join-Path $destination 'validation-commands.md') -Encoding utf8
if($omissions.Count -ne 2){throw 'Exactly two optional detailed VSTest trace omissions expected.'}
[ordered]@{
    candidate='F001';verified_copy_mappings=$copies.Count;unique_authoritative_destinations=$copies.Count;all_byte_identical=$true
    copied_portable_audit_passed=$true;source_comparisons=0;original_diagnostic_profiles=1;candidate_profiles=0
    original_monitoring_cases=3;raw_retained_results=24;warmups=9;raw_dll_pdb_build_images_certificates_published=$false
    local_only_optional_vstest_traces=$omissions;public_raw_trx_benchmark_measurements_and_source_inputs_complete=$true
    note='Exact source/TRX/fixture snapshots/profiles/GC/PDB-document/config/deps/manifests/failed preparations and analysis. Optional detailed host/protocol traces remain local with exact omission hashes. No public omitted-binary rehash or live QUIC/unestablished comparative benefit claim.'
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $destination 'raw-file-copy-verification.json') -Encoding utf8
$files=@(Get-ChildItem $destination -Recurse -Force -File)
if($files.Count -ne $copies.Count+3 -or @($files|Where-Object Extension -In '.dll','.exe','.pdb','.pfx','.pem','.key','.crt','.binlog').Count){throw 'Exact immutable count/binary omission differs.'}
$files.Count|Set-Content (Join-Path $PSScriptRoot 'F001-immutable-file-count.txt') -Encoding ascii
Write-Output "F001:$($copies.Count) byte-exact mappings/$($files.Count) immutable files;actual portable copied audit passed,no PR."
