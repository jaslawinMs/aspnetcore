$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F111'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$destination=Join-Path $output 'F111'
if ((Test-Path $destination) -or @(git -C $output status --porcelain).Count)
{
    throw 'A new F111 capsule and clean dedicated results checkout are required.'
}
$publication=Get-Content (Join-Path $run 'source-branch-publication.json') -Raw|ConvertFrom-Json
$audit=Get-Content (Join-Path $run 'measurement-audit.json') -Raw|ConvertFrom-Json
if (-not $publication.sourceChanged -or $publication.trackedFilesChanged -ne 3 -or
    -not $publication.actualRemoteCanonicalBytesVerified -or $audit.actualBenchmarkOutcomes -ne 168 -or
    $audit.sourceComparisons -ne 3 -or -not $audit.comparisonBudgetClosed)
{
    throw 'Exact measured source/ref and full three-comparison audit must precede packaging.'
}
$copies=[System.Collections.Generic.List[object]]::new()
$unique=@{}
function Copy-Exact([string]$Source,[string]$Relative,[string]$Kind,[string]$Original)
{
    $sha=(Get-FileHash -LiteralPath $Source).Hash
    $bytes=(Get-Item -LiteralPath $Source).Length
    if ($Kind -ceq 'run-input') { $Relative="input-blobs\$sha.json" }
    if ($Kind -ceq 'run-output-fixture') { $Relative="output-blobs\$sha.bin" }
    if (@($Relative -split '[\\/]'|Where-Object {$_ -ieq 'keys'}).Count -or
        [IO.Path]::GetExtension($Relative) -in '.dll','.pdb','.pfx','.pem','.key','.binlog')
    {
        throw 'No runtime/build binary/private-key material may enter the public capsule.'
    }
    $target=Join-Path $destination $Relative
    if ($unique.ContainsKey($Relative))
    {
        if ($Kind -cnotin 'run-input','run-output-fixture' -or
            $unique[$Relative].sha256 -cne $sha -or $unique[$Relative].bytes -ne $bytes)
        {
            throw 'Unexpected authoritative destination collision.'
        }
    }
    else
    {
        if (Test-Path $target) { throw 'Never overwrite an actual copied artifact.' }
        New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force|Out-Null
        Copy-Item -LiteralPath $Source -Destination $target
        $unique[$Relative]=[pscustomobject]@{sha256=$sha;bytes=$bytes}
    }
    if ((Get-FileHash $target).Hash -cne $sha) { throw "Copied raw bytes differ:$Original" }
    $copies.Add([pscustomobject]@{original=$Original;destination=$Relative;kind=$Kind;bytes=$bytes;sha256=$sha})
}
function Copy-Run([string]$Relative)
{
    $folder=if ($Relative) {Join-Path $run $Relative} else {$run}
    foreach ($entry in Get-ChildItem -LiteralPath $folder -Force)
    {
        $relativePath=if ($Relative) {"$Relative\$($entry.Name)"} else {$entry.Name}
        if ($entry.PSIsContainer)
        {
            if ($entry.Name -ieq 'keys') { throw 'Unexpected private-key directory;classify explicitly before publishing.' }
            if ($entry.Name -in 'binaries','bin','obj','node_modules','.git','image') { continue }
            Copy-Run $relativePath
        }
        elseif ($relativePath -cmatch '^fixture\\expected\\[A-Za-z0-9]+\.bin$')
        {
            Copy-Exact $entry.FullName $relativePath 'run-output-fixture' $relativePath
        }
        elseif ($entry.Name -ceq '.editorconfig' -or
            $entry.Extension -in '.cs','.csproj','.props','.targets','.resx','.razor','.json','.trx','.log',
                '.txt','.html','.md','.csv','.diff','.patch','.ps1','.mjs','.png')
        {
            $input=$relativePath.StartsWith('fixture\inputs\') -and $entry.Extension -ceq '.json'
            Copy-Exact $entry.FullName $relativePath $(if ($input) {'run-input'} else {'run'}) $relativePath
        }
        elseif ($entry.Extension -cne '.binlog')
        {
            throw "Unclassified raw artifact outside explicitly omitted binary/image directories:$relativePath"
        }
    }
}
Copy-Run ''
foreach ($name in 'AutoPerf.Benchmarks.runtimeconfig.json','AutoPerf.Benchmarks.deps.json')
{
    Copy-Exact (Join-Path $run "binaries\original\$name") "execution-image-metadata\original\$name" `
        'run-image-metadata' "binaries\original\$name"
}
foreach ($label in 'original','original-new-controls2','candidate1','candidate2')
{
    foreach ($file in Get-ChildItem (Join-Path $run "tests\$label\image") -File -Filter '*.json')
    {
        Copy-Exact $file.FullName "tests\$label\image-metadata\$($file.Name)" 'run-image-metadata' "tests\$label\image\$($file.Name)"
    }
}
foreach ($pair in @(
    @('F111-results-readme.md','README.md'),@('F111-reproduce-analysis.mjs','reproduce-analysis.mjs'),
    @('F111-closure.mjs','verify-live-closure.mjs'),@('F111-package-gitattributes.txt','.gitattributes'),
    @('F111-investigate.mjs','historical-investigate.mjs'),@('F111-test.ps1','historical-test.ps1'),
    @('F111-build-harness.ps1','historical-build-harness.ps1'),@('F111-freeze.ps1','historical-freeze.ps1'),
    @('F111-characterize.ps1','historical-characterize.ps1'),@('F111-resource-check.mjs','historical-resource-check.mjs'),
    @('F111-capture-pdb.ps1','historical-capture-pdb.ps1'),@('F111-measure.ps1','historical-measure.ps1'),
    @('F111-build-sample.ps1','historical-build-sample.ps1'),@('F111-run-sample.ps1','historical-run-sample.ps1'),
    @('F111-browser.mjs','historical-browser.mjs'),@('F111-audit-analysis.ps1','historical-audit-analysis.ps1'),
    @('F111-publish-source.ps1','historical-publish-source.ps1'),@('F111-package.ps1','historical-package.ps1'),
    @('F111-results-readme-template.md','historical-readme-template.md'),@('F111-render-readme.mjs','historical-render-readme.mjs')
))
{
    Copy-Exact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
if (@($copies|Where-Object {$_.kind -like 'run*'}|ForEach-Object original|Sort-Object -Unique).Count -ne
    @($copies|Where-Object {$_.kind -like 'run*'}).Count) { throw 'Every original run artifact needs exactly one mapping.' }
$copies|ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify
if ($LASTEXITCODE) { throw 'Exact copied source/fixture/contracts/TRX/PDB/overhead/GC/statistical/browser audit failed.' }
$commands=[System.Collections.Generic.List[string]]::new()
$commands.Add('# F111 exact historical commands and actual outcomes')
$commands.Add('')
$commands.Add('Every fresh dotnet shell activates `. .\activate.ps1` at `C:\src\aspnetcore`. Exactly six28-case profiles constitute3 closed comparisons;no fourth run. Failed compiler/formatter-argument/auditor attempts remain failures,not passing tests or extra source comparisons.')
$commands.Add('')
function Quote([string]$Value) { return "'"+$Value.Replace("'","''")+"'" }
foreach ($entry in $copies|Where-Object {$_.kind -like 'run*' -and $_.original.EndsWith('.json') -and
    ($_.original.Contains('command') -or $_.original.Contains('execution'))}|Sort-Object original)
{
    $records=@(Get-Content (Join-Path $destination $entry.destination) -Raw|ConvertFrom-Json)
    foreach ($record in $records)
    {
        if (-not $record.arguments) { continue }
        $exitField=@('exitCode','actualExitCode','exit_code','observedExitCode'|Where-Object {$_ -in $record.PSObject.Properties.Name})|Select-Object -First 1
        if ($entry.original -cmatch '^browser\\(original|candidate2)-server\\execution\.json$')
        {
            $label=$Matches[1]
            $readiness=Get-Content (Join-Path $run "browser\$label-server\readiness.json") -Raw|ConvertFrom-Json
            $shutdown=Get-Content (Join-Path $run "browser\$label-server\shutdown.json") -Raw|ConvertFrom-Json
            if ($readiness.statusCode -ne 200 -or -not $shutdown.bothProcessesObservedStopped -or
                $readiness.controllerPid -ne $record.controllerPid -or
                $shutdown.actualApplicationPid -ne $readiness.actualApplicationPid)
            {
                throw 'An attached sample server needs actual readiness/exact-own-PID shutdown evidence.'
            }
            $outcome='actual HTTP200 readiness;both exact own PIDs observed stopped;natural exit code not captured'
        }
        elseif ($exitField) { $outcome="actual exit$($record.$exitField)" }
        else { throw "Actual command outcome missing:$($entry.original)" }
        $arguments=@($record.arguments)
        $first=[string]$arguments[0]
        $executable=if ($first -in 'node','git','gh','dotnet') {$first}
            elseif ($entry.original -ceq 'source-fetch-command.json') {'git'}
            elseif ($first.EndsWith('.mjs')) {'node'}
            elseif ($first.EndsWith('.dll') -or $first -in 'build','test','format','run','msbuild') {'dotnet'}
            else {throw "Classify actual executable without guessing:$($entry.original):$first"}
        if ($first -ceq $executable) { $arguments=@($arguments|Select-Object -Skip 1) }
        $commands.Add("## $($entry.original): $outcome")
        $commands.Add('```powershell')
        $commands.Add($executable+' '+(($arguments|ForEach-Object {Quote $_}) -join ' '))
        $commands.Add('```')
        $commands.Add('')
    }
}
foreach ($label in 'original','candidate2')
{
    $browser=Get-Content (Join-Path $run "browser\$label\execution.json") -Raw|ConvertFrom-Json
    $commands.Add("## Actual canonical browser $label`: exit$($browser.exitCode),ready/stored/read/consumed passed")
    $commands.Add('```powershell')
    $commands.Add('node '+(Quote (Join-Path $PSScriptRoot 'F111-browser.mjs'))+' '+(Quote $label)+' '+(Quote $browser.baseUrl))
    $commands.Add('```')
    $commands.Add('')
}
$commands.Add('## Independent fork source publication: actual push/ref/all three canonical blobs passed')
$commands.Add('```powershell')
$commands.Add('git '+(($publication.pushArguments|ForEach-Object {Quote $_}) -join ' '))
$commands.Add('gh '+(($publication.verificationArguments|ForEach-Object {Quote $_}) -join ' '))
$commands.Add('```')
$commands.Add("Actual fork commit:$($publication.commit). Measured binaries predate it and retain their captured identities.")
$commands.Add('')
$commands.Add('## Copied portable audit: actual exit0, passed')
$commands.Add('```powershell')
$commands.Add('node '+(Quote (Join-Path $destination 'reproduce-analysis.mjs'))+' '+(Quote $destination)+' --verify')
$commands.Add('```')
$commands.Add('168 outcomes/1344 retained results/504 warmups/3088 actual overheads/168 hash-PID setup state files/252 complete contracts/420 calipers/42 passing exact TRX rows0skips/25 source-PDB document checks verified. Console markers echo label+contract only;no missing binary/runtime rehash,PE/PDB binding,method coverage,cold/retained memory or application-speedup proof is claimed.')
$commands|Set-Content (Join-Path $destination 'validation-commands.md') -Encoding utf8
$inputs=@($copies|Where-Object kind -CEQ 'run-input')
$outputs=@($copies|Where-Object kind -CEQ 'run-output-fixture')
if ($inputs.Count -ne 28 -or $outputs.Count -ne 28 -or
    @($copies|Where-Object original -CEQ 'harness\.editorconfig').Count -ne 1 -or
    @(Get-ChildItem $destination -Recurse -Force -File|Where-Object Extension -In '.dll','.pdb','.pfx','.pem','.key','.binlog').Count)
{
    throw 'Every28 exact typed input/output fixture,hidden config and exclusion of runtime/private-key material are required.'
}
[ordered]@{
    candidate='F111';disposition=$audit.disposition;verified_copy_mappings=$copies.Count
    unique_authoritative_destinations=$unique.Count;all_byte_identical=$true
    input_byte_mappings=$inputs.Count;distinct_input_blobs=@($inputs.destination|Sort-Object -Unique).Count
    output_byte_mappings=$outputs.Count;distinct_output_blobs=@($outputs.destination|Sort-Object -Unique).Count
    exact_synthetic_utf8_bin_output_fixtures_are_not_runtime_binaries=$true
    harness_hidden_editorconfig_preserved=$true;copied_portable_audit_passed=$true
    source_comparisons=3;original_profiles=3;candidate_profiles=3;comparison_budget_closed=$true
    raw_dll_pdb_binlogs_build_images_published=$false;public_audit_rehashes_omitted_binaries_or_runtime=$false
    note='Exact sources/config/deps/PDB-document/probe/test/setup/measurement/GC/actual-overhead/browser evidence and failed development sources/logs retained. All exact synthetic typed inputs/original UTF8 output fixtures retained,with byte-identical output deduplication and complete original-path mappings. Cold/retained heap unmeasured,conditional warmed component draft only.'
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $destination 'raw-file-copy-verification.json') -Encoding utf8
$files=@(Get-ChildItem $destination -Recurse -Force -File)
if ($files.Count -ne $unique.Count+3) { throw 'Only three generated metadata files may lack authoritative mappings.' }
$files.Count|Set-Content (Join-Path $PSScriptRoot 'F111-immutable-file-count.txt') -Encoding ascii
Write-Output "F111:$($copies.Count) exact mappings/28 typed inputs28 exact output paths/$($files.Count) immutable files;portable audit passed."
