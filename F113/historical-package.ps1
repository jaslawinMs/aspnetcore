$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F113'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$destination=Join-Path $output 'F113'
if ((Test-Path $destination) -or @(git -C $output status --porcelain).Count) {throw 'New F113 capsule and clean dedicated results checkout required.'}
$publication=Get-Content (Join-Path $run 'source-branch-publication.json') -Raw|ConvertFrom-Json
$audit=Get-Content (Join-Path $run 'measurement-audit.json') -Raw|ConvertFrom-Json
if (-not $publication.actualRemoteCanonicalBytesVerified -or $publication.trackedFilesChanged -ne 2 -or
    $audit.actualBenchmarkOutcomes -ne 168 -or $audit.sourceComparisons -ne 3 -or -not $audit.comparisonBudgetClosed) {throw 'Exact source/ref/closed all-row audit required.'}
$copies=[System.Collections.Generic.List[object]]::new()
function Copy-Exact([string]$Source,[string]$Relative,[string]$Kind,[string]$Original)
{
    if (@($Relative -split '[\\/]'|Where-Object {$_ -ieq 'keys'}).Count -or
        [IO.Path]::GetExtension($Relative) -in '.dll','.pdb','.pfx','.pem','.key','.binlog') {throw 'No runtime/build binary/private-key material allowed.'}
    $target=Join-Path $destination $Relative
    if (Test-Path $target) {throw "Never overwrite raw copied artifact:$Relative"}
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
            if ($entry.Name -in 'binaries','bin','obj','node_modules','.git','image') {continue}
            Copy-Run $relativePath
        }
        elseif ($relativePath -cmatch '^(development\\preprofile-settings\\)?fixture\\expected\\[A-Za-z0-9]+\.bin$')
        {
            Copy-Exact $entry.FullName $relativePath 'run-output-fixture' $relativePath
        }
        elseif ($entry.Name -ceq '.editorconfig' -or $entry.Extension -in '.cs','.csproj','.props','.targets','.resx','.json','.trx','.log','.txt','.html','.md','.csv','.diff','.patch','.ps1','.mjs')
        {
            $kind=if ($relativePath -cmatch '^(development\\preprofile-settings\\)?fixture\\inputs\\[A-Za-z0-9]+\.json$') {'run-input'} else {'run'}
            Copy-Exact $entry.FullName $relativePath $kind $relativePath
        }
        elseif ($entry.Extension -cne '.binlog') {throw "Unclassified artifact:$relativePath"}
    }
}
Copy-Run ''
foreach ($name in 'AutoPerf.Benchmarks.runtimeconfig.json','AutoPerf.Benchmarks.deps.json')
{
    Copy-Exact (Join-Path $run "binaries\original\$name") "execution-image-metadata\original\$name" 'run-image-metadata' "binaries\original\$name"
}
foreach ($label in 'original','original-new-controls','candidate1','original-final','candidate1-final')
{
    foreach ($entry in Get-ChildItem (Join-Path $run "tests\$label\image") -File -Filter '*.json')
    {
        Copy-Exact $entry.FullName "tests\$label\image-metadata\$($entry.Name)" 'run-image-metadata' "tests\$label\image\$($entry.Name)"
    }
}
foreach ($pair in @(
    @('F113-results-readme.md','README.md'),@('F113-reproduce-analysis.mjs','reproduce-analysis.mjs'),
    @('F113-closure.mjs','verify-live-closure.mjs'),@('F113-package-gitattributes.txt','.gitattributes'),
    @('F113-investigate.mjs','historical-investigate.mjs'),@('F113-test.ps1','historical-test.ps1'),
    @('F113-build-owner.ps1','historical-build-owner.ps1'),@('F113-build-harness.ps1','historical-build-harness.ps1'),
    @('F113-archive-preprofile.ps1','historical-archive-preprofile.ps1'),@('F113-freeze.ps1','historical-freeze.ps1'),
    @('F113-characterize.ps1','historical-characterize.ps1'),@('F113-resource-check.mjs','historical-resource-check.mjs'),
    @('F113-capture-pdb.ps1','historical-capture-pdb.ps1'),@('F113-measure.ps1','historical-measure.ps1'),
    @('F113-audit-analysis.ps1','historical-audit-analysis.ps1'),@('F113-select.mjs','historical-select.mjs'),
    @('F113-publish-source.ps1','historical-publish-source.ps1'),@('F113-package.ps1','historical-package.ps1'),
    @('F113-render-readme.mjs','historical-render-readme.mjs')
)) {Copy-Exact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]}
foreach ($name in 'Program.cs','AutoPerf.Evidence.csproj')
{
    Copy-Exact (Join-Path $PSScriptRoot "autoperf-runs\F071\tools\$name") "pdb-evidence-tool\$name" 'session' "autoperf-runs\F071\tools\$name"
}
$copies|ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify
if ($LASTEXITCODE) {throw 'Actual copied portable source/fixture/TRX/PDB/settings/overhead/GC/statistics audit failed.'}
$commands=[System.Collections.Generic.List[string]]::new()
$commands.Add('# F113 exact historical commands and actual outcomes');$commands.Add('')
$commands.Add('Every fresh dotnet shell activates `. .\activate.ps1` at `C:\src\aspnetcore`. Exactly six28-case profiles form three closed comparisons;the middle pair reverses order. Existing guards prevent overwrites. Earlier setup/caliper attempts were retained,not hidden timing reruns.');$commands.Add('')
function Quote([string]$Value) {return "'"+$Value.Replace("'","''")+"'"}
foreach ($entry in $copies|Where-Object {$_.kind -like 'run*' -and $_.original.EndsWith('.json') -and
    ($_.original.Contains('command') -or $_.original.Contains('execution'))}|Sort-Object original)
{
    $data=Get-Content (Join-Path $destination $entry.destination) -Raw|ConvertFrom-Json
    $records=if ($data.commands) {@($data.commands)} else {@($data)}
    foreach ($record in $records)
    {
        if (-not $record.arguments) {continue}
        $exitField=@('exitCode','actualExitCode','exit_code','observedExitCode'|Where-Object {$_ -in $record.PSObject.Properties.Name})|Select-Object -First 1
        if (-not $exitField) {throw "Actual command outcome missing:$($entry.original)"}
        $arguments=@($record.arguments);$first=[string]$arguments[0]
        $executable=if ($record.entryPoint) {$record.entryPoint} elseif ($first -in 'node','git','gh','dotnet') {$first}
            elseif ($entry.original -ceq 'source-fetch-command.json') {'git'}
            elseif ($first.EndsWith('.mjs')) {'node'}
            elseif ($first.EndsWith('.dll') -or $first -in 'build','test','format','run','msbuild') {'dotnet'}
            else {throw "Unknown actual executable:$($entry.original):$first"}
        if ($first -ceq $executable) {$arguments=@($arguments|Select-Object -Skip 1)}
        $commands.Add("## $($entry.original): actual exit$($record.$exitField)")
        $commands.Add('```powershell');$commands.Add($executable+' '+(($arguments|ForEach-Object {Quote $_}) -join ' '));$commands.Add('```');$commands.Add('')
    }
}
foreach ($pair in @(@('original-settings',' --expect-original-red'),@('candidate1-settings','')))
{
    $resource=Get-Content (Join-Path $run "resource-check-$($pair[0]).json") -Raw|ConvertFrom-Json
    $commands.Add("## Resource goals $($pair[0]): passed$($resource.passed),failed$($resource.failed);all35 expected rows inspected")
    $commands.Add('```powershell');$commands.Add('node '+(Quote (Join-Path $PSScriptRoot 'F113-resource-check.mjs'))+' '+(Quote $pair[0])+$pair[1]);$commands.Add('```');$commands.Add('')
}
$commands.Add("## Independent source publication: actual push/ref/all2 canonical blobs passed;commit$($publication.commit)")
$commands.Add('```powershell');$commands.Add('git '+(($publication.pushArguments|ForEach-Object {Quote $_}) -join ' '));$commands.Add('```');$commands.Add('')
$commands.Add("## Copied portable audit: actual exit0;$($audit.actualBenchmarkOutcomes) outcomes/$($audit.actualRetainedResultSamples) retained/$($audit.actualRetainedOverheadSamples) overheads/$($audit.actualCompleteContractPasses) current contracts/$($audit.actualSettingsBeforeAfterRecords) settings records/90 passing TRX rows/22 source-document checks")
$commands.Add('```powershell');$commands.Add('node '+(Quote (Join-Path $destination 'reproduce-analysis.mjs'))+' '+(Quote $destination)+' --verify');$commands.Add('```')
$commands|Set-Content (Join-Path $destination 'validation-commands.md') -Encoding utf8
$inputs=@($copies|Where-Object kind -CEQ 'run-input');$outputs=@($copies|Where-Object kind -CEQ 'run-output-fixture')
if ($inputs.Count -ne 56 -or $outputs.Count -ne 56) {throw 'All28 current and28 archived preprofile exact input/output fixtures required without deduplication.'}
[ordered]@{
    candidate='F113';verified_copy_mappings=$copies.Count;unique_authoritative_destinations=$copies.Count;all_byte_identical=$true
    input_byte_mappings=56;output_byte_mappings=56;current_input_byte_mappings=28;current_output_byte_mappings=28
    synthetic_native_prefix_utf8_envelopes_are_not_runtime_binaries=$true;copied_portable_audit_passed=$true
    source_comparisons=3;original_profiles=3;candidate_profiles=3;comparison_budget_closed=$true
    raw_dll_pdb_binlogs_build_images_published=$false;public_audit_rehashes_omitted_binaries_or_runtime=$false
    note='Exact sources/config/deps/PDB-document/test/setup/settings/measurement/GC/actual-overhead evidence plus every preprofile fixture/caliper/source/warning attempt retained. Every binary output fixture is a deterministic native-prefix/key/formatter-payload cache envelope. No runtime DLL/PDB/binlog or build image published;captured identities are not an offline rehash of omitted bytes.'
}|ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'raw-file-copy-verification.json') -Encoding utf8
$files=@(Get-ChildItem $destination -Recurse -Force -File)
if ($files.Count -ne $copies.Count+3 -or @($files|Where-Object Extension -In '.dll','.pdb','.pfx','.pem','.key','.binlog').Count) {throw 'Exact immutable count or binary omission differs.'}
$files.Count|Set-Content (Join-Path $PSScriptRoot 'F113-immutable-file-count.txt') -Encoding ascii
Write-Output "F113:$($copies.Count) byte-exact mappings/56inputs56outputs/$($files.Count) immutable files;copied portable audit passed."
