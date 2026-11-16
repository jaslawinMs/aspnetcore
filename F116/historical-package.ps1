$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F116'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$destination=Join-Path $output 'F116'
if ((Test-Path $destination) -or @(git -C $output status --porcelain).Count) {throw 'New capsule and clean dedicated results checkout required.'}
$publication=Get-Content (Join-Path $run 'source-branch-publication.json') -Raw|ConvertFrom-Json
$audit=Get-Content (Join-Path $run 'measurement-audit.json') -Raw|ConvertFrom-Json
if (-not $publication.actualRemoteRefVerified -or $publication.trackedFilesChanged -ne 1 -or
    $audit.actualBenchmarkOutcomes -ne 144 -or $audit.sourceComparisons -ne 3 -or -not $audit.performancePrJustified) {throw 'Exact source/evidence required.'}
$copies=[System.Collections.Generic.List[object]]::new()
function Copy-Exact([string]$Source,[string]$Relative,[string]$Kind,[string]$Original)
{
    if (@($Relative -split '[\\/]'|Where-Object {$_ -ieq 'keys'}).Count -or
        [IO.Path]::GetExtension($Relative) -in '.dll','.exe','.pdb','.pfx','.pem','.key','.binlog') {throw 'No runtime/build binary/private-key material allowed.'}
    $target=Join-Path $destination $Relative
    if (Test-Path $target) {throw "Never overwrite copied raw evidence:$Relative"}
    New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force|Out-Null
    Copy-Item -LiteralPath $Source -Destination $target
    $sha=(Get-FileHash $Source).Hash
    if ((Get-FileHash $target).Hash -cne $sha) {throw 'Actual copied bytes differ.'}
    $copies.Add([pscustomobject]@{original=$Original;destination=$Relative;kind=$Kind;bytes=(Get-Item $Source).Length;sha256=$sha})
}
function Copy-Run([string]$Relative)
{
    $folder=if ($Relative) {Join-Path $run $Relative} else {$run}
    foreach ($entry in Get-ChildItem -LiteralPath $folder -Force)
    {
        $relativePath=if ($Relative) {"$Relative\$($entry.Name)"} else {$entry.Name}
        if ($entry.PSIsContainer)
        {
            if ($entry.Name -ieq 'keys') {throw 'Unexpected key directory;stop and classify.'}
            if ($entry.Name -in 'binaries','bin','obj','node_modules','.git','image','image-kestrel','image-signalr') {continue}
            Copy-Run $relativePath
        }
        elseif ($entry.Name -ceq '.editorconfig' -or $entry.Extension -in '.cs','.csproj','.props','.targets','.resx','.json','.trx','.log','.txt','.html','.md','.csv','.diff','.patch','.ps1','.mjs')
        {
            $kind=if ($relativePath -cmatch '^fixtures\\original-prep2\\inputs\\[A-Za-z0-9]+\.json$') {'run-input'}
                elseif ($relativePath -cmatch '^fixtures\\original-prep2\\expected\\[A-Za-z0-9]+\.json$') {'run-output-fixture'} else {'run'}
            Copy-Exact $entry.FullName $relativePath $kind $relativePath
        }
        elseif ($entry.Extension -cne '.binlog') {throw "Unclassified artifact:$relativePath"}
    }
}
Copy-Run ''
foreach ($variant in 'original-prep1','original-prep2','candidate1')
{
    foreach ($name in 'AutoPerf.Benchmarks.runtimeconfig.json','AutoPerf.Benchmarks.deps.json')
    {
        Copy-Exact (Join-Path $run "binaries\$variant\$name") "execution-image-metadata\$variant\$name" 'run-image-metadata' "binaries\$variant\$name"
    }
}
foreach ($variant in 'original','candidate1')
{
    foreach ($scope in 'kestrel','signalr')
    {
        foreach ($entry in Get-ChildItem (Join-Path $run "tests\$variant\image-$scope") -File -Filter '*.json')
        {
            Copy-Exact $entry.FullName "tests\$variant\image-metadata-$scope\$($entry.Name)" 'run-image-metadata' "tests\$variant\image-$scope\$($entry.Name)"
        }
    }
}
foreach ($name in 'ColdProbe.runtimeconfig.json','ColdProbe.deps.json')
{
    Copy-Exact (Join-Path $run "cold-probe\bin\Release\net12.0\$name") "execution-image-metadata\cold-probe\$name" 'run-image-metadata' "cold-probe\bin\Release\net12.0\$name"
}
foreach ($pair in @(
    @('F116-results-readme.md','README.md'),@('F116-reproduce-analysis.mjs','reproduce-analysis.mjs'),
    @('F116-closure.mjs','verify-live-closure.mjs'),@('F116-package-gitattributes.txt','.gitattributes')
)) {Copy-Exact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]}
foreach ($entry in Get-ChildItem $PSScriptRoot -File|Where-Object {$_.Name -like 'F116-*' -and $_.Extension -in '.ps1','.mjs'})
{
    if ($entry.Name -in 'F116-reproduce-analysis.mjs','F116-closure.mjs') {continue}
    Copy-Exact $entry.FullName "historical-$($entry.Name.Substring(5))" 'session' $entry.Name
}
foreach ($name in 'Program.cs','AutoPerf.Evidence.csproj')
{
    Copy-Exact (Join-Path $PSScriptRoot "autoperf-runs\F071\tools\$name") "pdb-evidence-tool\$name" 'session' "autoperf-runs\F071\tools\$name"
}
$copies|ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify
if ($LASTEXITCODE) {throw 'Actual copied portable evidence audit failed.'}
$commands=[System.Collections.Generic.List[string]]::new()
$commands.Add('# F116 exact historical commands and observed outcomes');$commands.Add('')
$commands.Add('Every fresh dotnet shell activates `. .\activate.ps1` at `C:\src\aspnetcore`. Three source comparisons/six actual24-case profiles;one source shape,closed budget. Historical guards prohibit overwriting results. Six supplemental cold-only diagnostics repair deferred point-snapshot evidence without retiming.');$commands.Add('')
function Quote([string]$Value) {return "'"+$Value.Replace("'","''")+"'"}
foreach ($entry in $copies|Where-Object {$_.kind -like 'run*' -and $_.original.EndsWith('.json') -and
    ($_.original.Contains('command') -or $_.original.Contains('execution') -or $_.original -ceq 'current-source-investigation.json')}|Sort-Object original)
{
    $data=Get-Content (Join-Path $destination $entry.destination) -Raw|ConvertFrom-Json
    $records=if ($data.commands) {@($data.commands)} else {@($data)}
    foreach ($record in $records)
    {
        if (-not $record.arguments) {continue}
        $exitField=@('exitCode','actualExitCode','exit_code','observedExitCode'|Where-Object {$_ -in $record.PSObject.Properties.Name})|Select-Object -First 1
        if (-not $exitField) {throw "Actual command outcome missing:$($entry.original)"}
        $arguments=@($record.arguments);$first=[string]$arguments[0]
        $executable=if ($record.entryPoint) {$record.entryPoint} elseif ($record.command) {$record.command}
            elseif ($first -in 'node','git','gh','dotnet') {$first}
            elseif ($first.EndsWith('.mjs')) {'node'}
            elseif ($first.EndsWith('.dll') -or $first -in 'build','test','format','run','msbuild') {'dotnet'}
            else {throw "Unknown actual executable:$($entry.original):$first"}
        if ($first -ceq $executable) {$arguments=@($arguments|Select-Object -Skip 1)}
        $commands.Add("## $($entry.original): actual exit$($record.$exitField)")
        $commands.Add('```powershell');$commands.Add($executable+' '+(($arguments|ForEach-Object {Quote $_}) -join ' '));$commands.Add('```');$commands.Add('')
    }
}
$commands.Add('## Preserved preparation and checker outcomes')
$commands.Add('- Initial investigation outer assertion failed after actual child commands succeeded:21/22 source files exact,the only difference is the current Kestrel owning-test observation wait. Completion audit-only helper passed before shipping edit/timing.')
$commands.Add('- First original preparation used the wrong main-thread-only memory annotation;actual pinned BDN source/runtime delegate audit corrected this before source edit/timing. Second original preparation reused byte-exact input fixtures;both versions remain archived.')
$commands.Add('- Candidate initial preparation failed before characterization/timing on PowerShell pipeline syntax. Partial image was byte-verified and continuation passed;no measurement recopy/rerun.')
$commands.Add('- First full auditor exit1 exposed deferred before/intermediate cold JSON snapshots. All frozen evidence preserved;independent immediately-materialized cold driver build and six child processes exit0. No timing rerun. Corrected auditor exit0 verifies all144 outcomes.')
$commands.Add('')
$commands.Add('## Actual independent source publication: push/ref/canonical content verified')
$commands.Add('```powershell');$commands.Add('git '+(($publication.pushArguments|ForEach-Object {Quote $_}) -join ' '));$commands.Add('# Actual exit0,remote ref and canonical source bytes matched.');$commands.Add('```');$commands.Add('')
$commands.Add('## Actual public copied audit: exit0')
$commands.Add('```powershell');$commands.Add('node '+(Quote (Join-Path $destination 'reproduce-analysis.mjs'))+' '+(Quote $destination)+' --verify')
$commands.Add('# Passed:144 outcomes/1152 retained/432 warmups/2249 actual overheads;192 contracts/240 calipers/62 exact owning rows/40 PDB documents,six independent materialized cold probes. Omitted DLL/PDB/runtime bytes cannot be rehashed offline.');$commands.Add('```')
$commands|Set-Content (Join-Path $destination 'validation-commands.md') -Encoding utf8
if (@($copies|Where-Object kind -CEQ 'run-input').Count -ne 24 -or @($copies|Where-Object kind -CEQ 'run-output-fixture').Count -ne 24) {throw 'All exact24 active input/output fixtures required.'}
[ordered]@{
    candidate='F116';verified_copy_mappings=$copies.Count;unique_authoritative_destinations=$copies.Count;all_byte_identical=$true
    input_byte_mappings=24;output_byte_mappings=24;copied_portable_audit_passed=$true
    source_comparisons=3;original_profiles=3;candidate_profiles=3;comparison_budget_closed=$true
    preparation_annotations_scope_pipeline_and_cold_capture_failures_preserved=$true
    raw_dll_pdb_binlogs_build_images_published=$false;public_audit_rehashes_omitted_binaries_or_runtime=$false
    note='Exact source/fixtures/config/deps/owner manifests/TRX/PDB-document/test/setup/settings/measurement/GC/actual-overhead evidence,all failures and independent cold-only repair. Public audit cannot rehash deliberately omitted binaries or independently compute confidence critical values.'
}|ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'raw-file-copy-verification.json') -Encoding utf8
$files=@(Get-ChildItem $destination -Recurse -Force -File)
if ($files.Count -ne $copies.Count+3 -or @($files|Where-Object Extension -In '.dll','.exe','.pdb','.pfx','.pem','.key','.binlog').Count) {throw 'Exact immutable count or binary omission differs.'}
$files.Count|Set-Content (Join-Path $PSScriptRoot 'F116-immutable-file-count.txt') -Encoding ascii
Write-Output "F116:$($copies.Count) byte-exact mappings/24 active inputs+24 outputs/$($files.Count) immutable files;actual copied portable audit passed."
