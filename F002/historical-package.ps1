$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F002'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$destination=Join-Path $output 'F002'
if((Test-Path $destination) -or @(git -C $output status --porcelain).Count){throw 'Fresh capsule and clean dedicated results checkout required.'}
$audit=Get-Content (Join-Path $run 'measurement-audit.json') -Raw|ConvertFrom-Json
$publication=Get-Content (Join-Path $run 'source-branch-publication.json') -Raw|ConvertFrom-Json
if($audit.disposition -cne 'rejected' -or $audit.sourceComparisons -ne 0 -or $audit.benchmarkOutcomes -ne 4 -or
    -not $audit.nativeFinAutomaticallyRemovedBeforeDirectInvocation -or -not $publication.actualRemoteRefVerified -or
    $publication.sourceChanged){throw 'Exact rejected audited original-only/native evidence/source required.'}
$copies=[System.Collections.Generic.List[object]]::new()
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
        elseif($entry.Name -like 'vstest-diagnostic*.log'){throw 'Unexpected new detailed VSTest trace;F002 reuses prior exact test evidence,do not silently publish host metadata.'}
        elseif($entry.Extension -in '.cs','.csproj','.props','.targets','.json','.trx','.log','.txt','.html','.md','.csv','.diff','.patch','.ps1','.mjs','.stdout','.stderr')
        {
            Copy-Exact $entry.FullName $relativePath 'run' $relativePath
        }
        elseif($entry.Extension -cne '.binlog'){throw "Unclassified artifact:$relativePath"}
    }
}
Copy-Run ''
foreach($attempt in 2,3,4,5,6)
{
    foreach($name in 'AutoPerf.Benchmarks.runtimeconfig.json','AutoPerf.Benchmarks.deps.json')
    {
        Copy-Exact (Join-Path $run "binaries\original-prep$attempt\$name") "execution-image-metadata\original-prep$attempt\$name" 'run-image-metadata' "binaries\original-prep$attempt\$name"
    }
}
foreach($relative in 'tests\borrowed-F001\image','quic-owner\image')
{
    foreach($entry in Get-ChildItem (Join-Path $run $relative) -File -Filter '*.json')
    {
        Copy-Exact $entry.FullName "$relative-metadata\$($entry.Name)" 'run-image-metadata' "$relative\$($entry.Name)"
    }
}
foreach($pair in @(@('F002-results-readme.md','README.md'),@('F002-reproduce-analysis.mjs','reproduce-analysis.mjs'),@('F002-package-gitattributes.txt','.gitattributes')))
{
    Copy-Exact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
foreach($entry in Get-ChildItem $PSScriptRoot -File|Where-Object {$_.Name -like 'F002-*' -and $_.Extension -in '.ps1','.mjs'})
{
    if($entry.Name -ceq 'F002-reproduce-analysis.mjs'){continue}
    Copy-Exact $entry.FullName "historical-$($entry.Name.Substring(5))" 'session' $entry.Name
}
$copies|ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify
if($LASTEXITCODE){throw 'Actual copied portable audit failed;never repair by rerunning successful experiments.'}
$commands=[System.Collections.Generic.List[string]]::new()
$commands.Add('# F002 exact historical commands and observed outcomes');$commands.Add('')
$commands.Add('Every fresh dotnet shell activates `. .\activate.ps1` at `C:\src\aspnetcore`. One original-only4-case profile,zero candidate/source comparisons. Native FIN passed at a hybrid lower boundary,not complete network HTTP3/contention proof. Historical overwrite guards intentionally prohibit replaying into completed outputs.');$commands.Add('')
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
        $origin=if($entry.original.StartsWith('tests\borrowed-F001\') -or $entry.original.Contains('borrowed-F118') -or $entry.original.Contains('borrowed-F001')){' (explicitly borrowed historical execution,not newly run for F002)'}else{''}
        $commands.Add("## $($entry.original): actual exit$($record.$exitField)$origin")
        $commands.Add('```powershell');$commands.Add($executable+' '+(($record.arguments|ForEach-Object {Quote $_}) -join ' '));$commands.Add('```');$commands.Add('')
    }
}
$commands.Add('## Preserved preparation outcomes')
$commands.Add('- Build1 actual exit1:CS0122 internal factory access. Builds2..6 actual exit0,0 warnings. Standalone reflection construction uses the existing implementation/public listener-factory contract;no shipping bridge.')
$commands.Add('- Native2/3/4 actual nonzero child exits before association/FIN assertions. Native4 actual server exception:platform does not support ephemeral keys;clientUserCanceled. Native5 uses existing TestResources certificate helper,TLS succeeds,but alignment disposal fails missing IConnectionHeartbeatFeature. Native6 uses owning QUIC test registration-only feature pattern and passes the named actual FIN/automatic-removal assertion. All failed sources/image manifests/logs/exits preserved.')
$commands.Add('- Four component cases/repeat misses/real CONNECT EOF and public Abort actual exit0. Separate native FIN case exit0. Seventeen existing test rows/zero skips explicitly borrowed,zero new existing-test executions.')
$commands.Add('- One original-only4-case profile actual exit0:32 retained,12 warmups,48 setup+48 checked-removal fixtures,zero source comparisons/candidate profiles.')
$commands.Add('- Independent live auditor attempt1 actual exit0:all source/test/PDB/fixture/native/settings/statistics checks;151-file active image and captured physical runtime/managed QUIC/msquic bytes rehashed.')
$commands.Add('')
$commands.Add('## Actual unchanged independent source-branch publication:push/ref/canonical content verified')
$commands.Add('```powershell');$commands.Add('git '+(($publication.pushArguments|ForEach-Object {Quote $_}) -join ' '));$commands.Add('# Actual exit0,unchanged baseline ref and canonical source matched. No source commit or PR created.');$commands.Add('```');$commands.Add('')
$commands.Add('## Actual public copied audit:exit0')
$commands.Add('```powershell');$commands.Add('node '+(Quote (Join-Path $destination 'reproduce-analysis.mjs'))+' '+(Quote $destination)+' --verify')
$commands.Add('# Passed:4 original-only outcomes/32 retained/12 warmups/48 setup+48 checked removals/17 borrowed rows/26 PDB witnesses/actual native FIN. Omitted binaries/runtime cannot be rehashed offline.');$commands.Add('```')
$commands|Set-Content (Join-Path $destination 'validation-commands.md') -Encoding utf8
[ordered]@{
    candidate='F002';verified_copy_mappings=$copies.Count;unique_authoritative_destinations=$copies.Count;all_byte_identical=$true
    copied_portable_audit_passed=$true;source_comparisons=0;original_diagnostic_profiles=1;candidate_profiles=0
    original_monitoring_cases=4;raw_retained_results=32;warmups=12;actual_native_fin_passed=$true
    borrowed_existing_test_rows=17;new_existing_test_executions=0;source_pdb_witnesses=26
    raw_dll_pdb_build_images_certificates_published=$false;new_optional_vstest_traces_omitted=0
    public_copied_raw_trx_benchmark_measurements_and_source_inputs_complete=$true
    note='Exact F002 source/borrowed TRX/native/component/profile/GC/PDB/config/deps/manifests/failed preparations and analysis. Original optional detailed F001 VSTest traces remain local,not newly captured or copied here. No public omitted-binary rehash/full network HTTP3/contention/comparative benefit claim.'
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $destination 'raw-file-copy-verification.json') -Encoding utf8
$files=@(Get-ChildItem $destination -Recurse -Force -File)
if($files.Count -ne $copies.Count+3 -or @($files|Where-Object Extension -In '.dll','.exe','.pdb','.pfx','.pem','.key','.crt','.binlog').Count){throw 'Exact immutable count/binary omission differs.'}
$files.Count|Set-Content (Join-Path $PSScriptRoot 'F002-immutable-file-count.txt') -Encoding ascii
Write-Output "F002:$($copies.Count) byte-exact mappings/$($files.Count) immutable files;actual portable copied audit passed,no PR."
