$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F086'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$destination = Join-Path $output 'F086'
if (Test-Path $destination) { throw 'Refusing to overwrite an existing F086 package.' }
$copies = [System.Collections.Generic.List[object]]::new()
function Copy-Exact([string]$Source, [string]$Target, [string]$Kind, [string]$Relative)
{
    $file = Join-Path $destination $Target
    New-Item -ItemType Directory -Path (Split-Path $file -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $file
    $hash = (Get-FileHash $Source).Hash
    if ($hash -cne (Get-FileHash $file).Hash) { throw "Authoritative raw copy differs:$Target" }
    $copies.Add([ordered]@{kind=$Kind;original=$Relative;destination=$Target;
        bytes=(Get-Item $file).Length;sha256=$hash})
}
& (Join-Path $PSScriptRoot 'autoperf-export.ps1') -OutputRoot $output -Id F086 `
    -ExpectedCaseCount 28 -TestNameFilter '*' -AfterSnapshot after
foreach ($file in Get-ChildItem $run -File)
{
    $target = if ($file.Name -eq 'execution.json') { 'execution-original.json' } else { $file.Name }
    Copy-Exact $file.FullName $target 'run' $file.Name
}
foreach ($folder in 'harness','tests-before','tests-naive-strong','tests-after',
    'contracts-before-states','contracts-after-states','formatting-before-report','formatting-after-report')
{
    $extensions = if ($folder -eq 'harness') { @('.cs','.csproj') } else { @('.json','.trx','.log') }
    foreach ($file in Get-ChildItem (Join-Path $run $folder) -File | Where-Object Extension -in $extensions)
    {
        Copy-Exact $file.FullName "$folder\$($file.Name)" 'run' "$folder\$($file.Name)"
    }
}
Copy-Exact (Join-Path $run 'formatting-baseline\.editorconfig') 'formatting-editorconfig.txt' 'run' 'formatting-baseline\.editorconfig'
foreach ($execution in Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
{
    foreach ($file in Get-ChildItem (Join-Path $run "$($execution.label)\results") -File)
    {
        $name = switch -Wildcard ($file.Name)
        {
            '*-full*.json' { 'results.json' }
            '*.csv' { 'results.csv' }
            '*-github.md' { 'results.md' }
            '*.html' { 'results.html' }
            default { throw "Unexpected raw measured report:$($file.Name)" }
        }
        Copy-Exact $file.FullName "$($execution.label)\$name" 'run' "$($execution.label)\results\$($file.Name)"
    }
    foreach ($file in Get-ChildItem (Join-Path $run $execution.label) -File -Filter '*.log')
    {
        Copy-Exact $file.FullName "$($execution.label)\$($file.Name)" 'run' "$($execution.label)\$($file.Name)"
    }
}
foreach ($pair in @(
    @('F086-acceptance.md','acceptance.md'),@('F086-results-readme.md','README.md'),
    @('F086-reproduce-analysis.mjs','reproduce-analysis.mjs'),
    @('F086-formatting-audit.mjs','formatting-audit.mjs'),
    @('autoperf-benchmarks.ps1','historical-benchmark-runner.ps1'),
    @('autoperf-check-closure.mjs','historical-closure-verifier.mjs'),
    @('F086-package.ps1','historical-packager.ps1')))
{
    Copy-Exact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
foreach ($file in Get-ChildItem (Join-Path $PSScriptRoot 'autoperf-runs\F071\tools') -File |
    Where-Object Extension -in '.cs','.csproj')
{
    Copy-Exact $file.FullName "tools\$($file.Name)" 'pdb-tools' $file.Name
}
$sourceCommit = (Get-Content (Join-Path $run 'source-commit.txt') -Raw).Trim()
$documents = foreach ($spec in @(
    @('37e809ead5824bc753a1c3d56f11615bdb1296c5','src\Features\JsonPatch.SystemTextJson\src\Internal\ListAdapter.cs','source-before.cs'),
    @($sourceCommit,'src\Features\JsonPatch.SystemTextJson\src\Internal\ListAdapter.cs','source-after.cs'),
    @('37e809ead5824bc753a1c3d56f11615bdb1296c5','src\Features\JsonPatch.SystemTextJson\test\Internal\ListAdapterTest.cs','source-tests-before.cs'),
    @($sourceCommit,'src\Features\JsonPatch.SystemTextJson\test\Internal\ListAdapterTest.cs','source-tests.cs')))
{
    $gitPath = $spec[1].Replace('\','/')
    $text = Get-Content (Join-Path $destination $spec[2]) -Raw
    $blob = @(git -C 'C:\src\aspnetcore' show "$($spec[0]):$gitPath") -join "`n"
    if ($LASTEXITCODE -or $text.Replace("`r`n","`n").TrimEnd("`n") -cne $blob)
    {
        throw 'Actual committed source differs from tested/measured source.'
    }
    [ordered]@{revision=$spec[0];path=$spec[1];source_snapshot=$spec[2];
        source_sha256=(Get-FileHash (Join-Path $destination $spec[2])).Hash;
        committed_blob=(git -C 'C:\src\aspnetcore' rev-parse "$($spec[0]):$gitPath");
        equal_after_git_line_ending_canonicalization=$true}
}
@{candidate='F086';source_commit=$sourceCommit;documents=@($documents)} |
    ConvertTo-Json -Depth 8 | Set-Content (Join-Path $destination 'committed-source-identity.json') -Encoding utf8
node -e "const fs=require('fs'),cp=require('child_process');fs.writeFileSync(process.argv[1],cp.execFileSync('git',['-C','C:\\src\\aspnetcore','diff','--binary','37e809ead5824bc753a1c3d56f11615bdb1296c5',process.argv[2],'--','src/Features/JsonPatch.SystemTextJson/src/Internal/ListAdapter.cs','src/Features/JsonPatch.SystemTextJson/test/Internal/ListAdapterTest.cs']));" (Join-Path $destination 'source.patch') $sourceCommit
if ($LASTEXITCODE) { throw 'Native source patch capture failed.' }
$copies.Add([ordered]@{kind='native-git-diff';original=$sourceCommit;destination='source.patch';
    bytes=(Get-Item (Join-Path $destination 'source.patch')).Length;
    sha256=(Get-FileHash (Join-Path $destination 'source.patch')).Hash})
if (@($copies.destination | Sort-Object -Unique).Count -ne $copies.Count)
{
    throw 'Duplicated authoritative copy destinations.'
}
$copies | ConvertTo-Json -Depth 6 |
    Set-Content (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8
$validation = [System.Collections.Generic.List[string]]::new()
$validation.Add('# Exact F086 validation commands andresults')
$validation.Add('')
$validation.Add('Dotnet ran after `. .\activate.ps1` fromC:\src\aspnetcore. CPU-heavy work serialized,MSBuild two workers. Full-file formatter isnot green:baseline/current both reportthe same3 untouched diagnostics;actual changed-line audit isgreen.')
foreach ($spec in @(
    @('Initial new-test compile','baseline-build-attempt1.json','exit1,missing System import,no assertions reached;corrected before original proof'),
    @('Original owning suite','tests-before\command.json','passed83/83,all7 new rows,exit0'),
    @('Rejected strong-cache prototype','tests-naive-strong\command.json','82pass/1 expected real list-Type lifetime failure,exit1;following element-Type assertion not reached'),
    @('Selected weak-cache owning suite','tests-after\command.json','passed83/83,all7 new rows,exit0'),
    @('Original harness build','harness-build-before.json','passed,exit0,new external manifest justifies restore'),
    @('Selected harness build','harness-build-after.json','passed,exit0,--no-restore'),
    @('Original actual public/state/cold contracts','contracts-before-command.json','passed28/28,exit0'),
    @('Selected actual public/state/cold contracts','contracts-after-command.json','passed28/28,exit0;56 exact state files equal'),
    @('Actual main full-file formatter reproduction','formatting-before.json','exit2,three original test-file whitespace diagnostics'),
    @('Selected full-file formatter','formatting-after.json','exit2,same three original diagnostics;zero added-line violations')))
{
    $record = Get-Content (Join-Path $run $spec[1]) -Raw | ConvertFrom-Json
    $validation.Add('')
    $validation.Add("## $($spec[0]):$($spec[2])")
    $validation.Add('')
    if ($record.working_directory) { $validation.Add("Working directory:$($record.working_directory).") }
    $validation.Add('```powershell')
    $validation.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'","''") + "'" }) -join ' '))
    $validation.Add('```')
}
foreach ($record in Get-Content (Join-Path $run 'pdb-commands.json') -Raw | ConvertFrom-Json)
{
    if ($record.exit_code) { throw 'A PDB-source check didnot pass.' }
    $validation.Add('')
    $validation.Add("## $($record.name) source/PDB:passed,exit0")
    $validation.Add('')
    $validation.Add('```powershell')
    $validation.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'","''") + "'" }) -join ' '))
    $validation.Add('```')
}
$validation.Add('')
$validation.Add('## Raw arithmetic/XML/fresh-type/source/closure/changed-line audit:passed,exit0')
$validation.Add('')
$validation.Add('`node .\reproduce-analysis.mjs . --verify`')
$validation.Add('')
$validation.Add('`node .\formatting-audit.mjs . --verify` passed,exit0:baseline-only violations mapped exactly. `git diff --check` passed,exit0. Complete closure verifier passed,exit0:152 files/70 runtime assets,owner DLL/PDB only.')
$validation | Set-Content (Join-Path $destination 'validation-commands.md') -Encoding utf8
[ordered]@{
    candidate='F086';baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5';
    branch='autoperf/F086-jsonpatch-list-element-type-cache';source_commit=$sourceCommit;
    disposition='Qualified weak-key warm list metadata cache;not merge-ready,cold heap/control timing costs andsingle-pair uncertainty retained.';
    source_scope=(Get-Content (Join-Path $run 'source-scope.json') -Raw | ConvertFrom-Json);
    selected_snapshot='after';selected_rounds=@(1);measured_comparisons=1;measured_strategies=1;
    comparison_budget_closed=$true;unused_comparisons=2;unmeasured_rejected_prototypes=1;
    public_api_or_default_change=$false;shipping_visibility_changes=$false;
    actual_producer='Public JsonPatchDocument.ApplyTo/default factory/object visitor/list adapter/conversion/actual list orJsonArray mutation,error orreference effect';
    raw_binaries_published=$false;copied_execution_files=152;declared_runtime_assets=70;
    actual_result_samples=448;console_actual_workload_rows=448;actual_xml_outcomes=249;
    cold_fresh_type_counts=64;cold_invocation_count=1;cold_unroll_factor=1;
    full_file_formatter_passed=$false;unchanged_main_formatter_diagnostics=3;added_line_violations=0;
    retained_costs=@('NonGenericRejected+8.75%,PocoControl+6.70%,ArrayRejected+2.11%;heaps unchanged',
        'FreshList64/FreshElement64 both+81B first-use managed heap;cold timeuncertain');
    limits=@('Single AB pair,no repeated stability oruniversal/production-throughput claim.',
        'No established cause for unchanged control timing movements;not harmless-noise claims.',
        'Cold runtime emission/constructor/document setup andprocess-first cache construction excluded;short fixed-invoke batches.',
        'Native handles/cache capacity/whole-process footprint andproduction reuse/type distributions unmeasured.',
        'No live-delta/trimmed/NativeAOT/host/network/browser/otherOS/runtime claim.');
    shared_host=$true;heavy_work_serialized=$true;max_build_workers=2;power_or_affinity_changed=$false;
    raw_source_reports_logs_copied_without_transformation=$true
} | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $destination 'provenance.json') -Encoding utf8
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify
if ($LASTEXITCODE) { throw 'Prepared-package raw audit differs fromsource audit.' }
Write-Output "F086 prepared:exact authoritative mappings=$($copies.Count),no source/timing/evidence overwritten."
