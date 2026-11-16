$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F115'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$destination=Join-Path $output 'F115'
if ((Test-Path $destination) -or @(git -C $output status --porcelain).Count) {throw 'New F115 capsule and clean dedicated results checkout required.'}
$publication=Get-Content (Join-Path $run 'source-branch-publication.json') -Raw|ConvertFrom-Json
$audit=Get-Content (Join-Path $run 'measurement-audit.json') -Raw|ConvertFrom-Json
if (-not $publication.actualRemoteRefVerified -or $publication.trackedFilesChanged -ne 0 -or
    $audit.actualBenchmarkOutcomes -ne 28 -or $audit.sourceComparisons -ne 0 -or $audit.performancePrJustified) {throw 'Exact rejected evaluation/unchanged fork branch required.'}
$copies=[System.Collections.Generic.List[object]]::new()
function Copy-Exact([string]$Source,[string]$Relative,[string]$Kind,[string]$Original)
{
    if (@($Relative -split '[\\/]'|Where-Object {$_ -ieq 'keys'}).Count -or
        [IO.Path]::GetExtension($Relative) -in '.dll','.exe','.pdb','.pfx','.pem','.key','.binlog') {throw 'No runtime/build binary/private-key material allowed.'}
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
        elseif ($entry.Name -ceq '.editorconfig' -or $entry.Extension -in '.cs','.csproj','.props','.targets','.resx','.json','.trx','.log','.txt','.html','.md','.csv','.diff','.patch','.ps1','.mjs')
        {
            $kind=if ($relativePath -cmatch '^fixture\\inputs\\[A-Za-z0-9]+\.json$') {'run-input'}
                elseif ($relativePath -cmatch '^fixture\\expected\\[A-Za-z0-9]+\.json$') {'run-output-fixture'} else {'run'}
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
foreach ($entry in Get-ChildItem (Join-Path $run 'tests\original\image') -File -Filter '*.json')
{
    Copy-Exact $entry.FullName "tests\original\image-metadata\$($entry.Name)" 'run-image-metadata' "tests\original\image\$($entry.Name)"
}
foreach ($pair in @(
    @('F115-results-readme.md','README.md'),@('F115-reproduce-analysis.mjs','reproduce-analysis.mjs'),
    @('F115-closure.mjs','verify-live-closure.mjs'),@('F115-package-gitattributes.txt','.gitattributes'),
    @('F115-investigate.mjs','historical-investigate.mjs'),@('F115-test.ps1','historical-test.ps1'),
    @('F115-audit-tests.ps1','historical-audit-tests.ps1'),@('F115-build-harness.ps1','historical-build-harness.ps1'),
    @('F115-archive-invalid-exporter.ps1','historical-archive-invalid-exporter.ps1'),@('F115-freeze.ps1','historical-freeze.ps1'),
    @('F115-characterize.ps1','historical-characterize.ps1'),@('F115-capture-pdb.ps1','historical-capture-pdb.ps1'),
    @('F115-measure.ps1','historical-measure.ps1'),@('F115-close-evaluation.ps1','historical-close-evaluation.ps1'),
    @('F115-publish-source.ps1','historical-publish-source.ps1'),@('F115-package.ps1','historical-package.ps1'),
    @('F115-render-readme.mjs','historical-render-readme.mjs')
)) {Copy-Exact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]}
foreach ($name in 'Program.cs','AutoPerf.Evidence.csproj')
{
    Copy-Exact (Join-Path $PSScriptRoot "autoperf-runs\F071\tools\$name") "pdb-evidence-tool\$name" 'session' "autoperf-runs\F071\tools\$name"
}
$copies|ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify
if ($LASTEXITCODE) {throw 'Actual copied portable source/fixture/TRX/PDB/settings/overhead/GC/statistics audit failed.'}
$commands=[System.Collections.Generic.List[string]]::new()
$commands.Add('# F115 exact historical commands and actual outcomes');$commands.Add('')
$commands.Add('Every fresh dotnet shell activates `. .\activate.ps1` at `C:\src\aspnetcore`. One actual original28-case profile,zero source comparisons. Parser and audit-only failures are retained;no tests or actual profiles were rerun to repair checkers. Existing overwrite/budget guards intentionally prevent replaying these historical helpers against closed artifacts.');$commands.Add('')
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
$commands.Add('## Preserved outer-helper and analysis outcomes')
$commands.Add('- Initial F115-test.ps1: outer exit1 due61-definition/81-result audit error;actual rebuild/discovery/test children exit0,81 rows passed. F115-audit-tests.ps1: audit-only exit0,no test rerun.')
$commands.Add('- First F115-measure.ps1: parser exit-532462766,outer exit1,zero workload/setups/results;exact archive and correction retained.')
$commands.Add('- Corrected F115-measure.ps1: actual child exit0,28cases/224 results;outer exit1 only because report glob missed full-compressed name. F115-close-evaluation.ps1: audit-only exit0,no timing rerun.')
$commands.Add('- First F115-reproduce-analysis.mjs: exit1 due truncated display-name collision;exact source/log retained. Corrected exact-Case/full-identity analysis: exit0,all28 outcomes.')
$commands.Add('')
$commands.Add("## Independent unchanged source branch: actual push/ref passed,baseline$($publication.commit)")
$commands.Add('```powershell');$commands.Add('git '+(($publication.pushArguments|ForEach-Object {Quote $_}) -join ' '));$commands.Add('```');$commands.Add('')
$commands.Add("## Copied portable audit: actual exit0;$($audit.actualBenchmarkOutcomes) original outcomes/$($audit.actualRetainedResultSamples) retained/$($audit.actualRetainedOverheadSamples) overheads/56 contracts/140+10 calipers/81 passing test rows/15 source-document checks")
$commands.Add('```powershell');$commands.Add('node '+(Quote (Join-Path $destination 'reproduce-analysis.mjs'))+' '+(Quote $destination)+' --verify');$commands.Add('```')
$commands|Set-Content (Join-Path $destination 'validation-commands.md') -Encoding utf8
if (@($copies|Where-Object kind -CEQ 'run-input').Count -ne 28 -or @($copies|Where-Object kind -CEQ 'run-output-fixture').Count -ne 28) {throw 'All exact28 input/output fixtures required.'}
[ordered]@{
    candidate='F115';verified_copy_mappings=$copies.Count;unique_authoritative_destinations=$copies.Count;all_byte_identical=$true
    input_byte_mappings=28;output_byte_mappings=28;copied_portable_audit_passed=$true
    source_comparisons=0;original_profiles=1;candidate_profiles=0;comparison_budget_closed=$true
    parser_and_outer_helper_and_first_analysis_failures_preserved=$true
    raw_dll_pdb_binlogs_build_images_published=$false;public_audit_rehashes_omitted_binaries_or_runtime=$false
    note='Exact unchanged source/config/deps/PDB-document/test/setup/settings/measurement/GC/actual-overhead evidence plus all parser/audit attempts retained. No runtime DLL/PDB/binlog or build image published;captured identities are not an offline rehash of omitted bytes.'
}|ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'raw-file-copy-verification.json') -Encoding utf8
$files=@(Get-ChildItem $destination -Recurse -Force -File)
if ($files.Count -ne $copies.Count+3 -or @($files|Where-Object Extension -In '.dll','.exe','.pdb','.pfx','.pem','.key','.binlog').Count) {throw 'Exact immutable count or binary omission differs.'}
$files.Count|Set-Content (Join-Path $PSScriptRoot 'F115-immutable-file-count.txt') -Encoding ascii
Write-Output "F115:$($copies.Count) byte-exact mappings/28inputs28outputs/$($files.Count) immutable files;copied portable audit passed."
