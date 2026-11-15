$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F084'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$destination = Join-Path $output 'F084'
if (Test-Path $destination) { throw 'Refusing to overwrite an existing F084 package.' }
$copies = [System.Collections.Generic.List[object]]::new()
function Copy-Exact([string]$Source, [string]$Target, [string]$Kind, [string]$Relative)
{
    $path = Join-Path $destination $Target
    New-Item -ItemType Directory -Path (Split-Path $path -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $path
    $a = (Get-FileHash $Source).Hash
    if ($a -cne (Get-FileHash $path).Hash) { throw "Authoritative raw copy differs:$Target" }
    $copies.Add([ordered]@{kind=$Kind;original=$Relative;destination=$Target;
        bytes=(Get-Item $path).Length;sha256=$a})
}
& (Join-Path $PSScriptRoot 'autoperf-export.ps1') -OutputRoot $output -Id F084 `
    -ExpectedCaseCount 24 -TestNameFilter '*HtmlDirectoryFormatterTests*' -AfterSnapshot after-2
foreach ($file in Get-ChildItem $run -File)
{
    $target = if ($file.Name -eq 'execution.json') { 'execution-original.json' } else { $file.Name }
    Copy-Exact $file.FullName $target 'run' $file.Name
}
foreach ($folder in 'harness','tests-before','tests-naive-defaultless','tests-after','tests-after-2',
    'contracts-before-responses','contracts-after-responses','contracts-after-2-responses')
{
    $extensions = if ($folder -eq 'harness') { @('.cs','.csproj') }
        elseif ($folder -like '*responses') { @('.html') } else { @('.json','.trx','.log') }
    foreach ($file in Get-ChildItem (Join-Path $run $folder) -File | Where-Object Extension -in $extensions)
    {
        Copy-Exact $file.FullName "$folder\$($file.Name)" 'run' "$folder\$($file.Name)"
    }
}
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
            default { throw "Unexpected measured report:$($file.Name)" }
        }
        Copy-Exact $file.FullName "$($execution.label)\$name" 'run' "$($execution.label)\results\$($file.Name)"
    }
    foreach ($file in Get-ChildItem (Join-Path $run $execution.label) -File -Filter '*.log')
    {
        Copy-Exact $file.FullName "$($execution.label)\$($file.Name)" 'run' "$($execution.label)\$($file.Name)"
    }
}
foreach ($pair in @(
    @('F084-acceptance.md','acceptance.md'),@('F084-results-readme.md','README.md'),
    @('F084-reproduce-analysis.mjs','reproduce-analysis.mjs'),
    @('autoperf-benchmarks.ps1','historical-benchmark-runner.ps1'),
    @('autoperf-check-closure.mjs','historical-closure-verifier.mjs'),
    @('F084-package.ps1','historical-packager.ps1')))
{
    Copy-Exact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
foreach ($file in Get-ChildItem (Join-Path $PSScriptRoot 'autoperf-runs\F071\tools') -File |
    Where-Object Extension -in '.cs','.csproj')
{
    Copy-Exact $file.FullName "tools\$($file.Name)" 'pdb-tools' $file.Name
}
$sourceCommit = (Get-Content (Join-Path $run 'source-commit.txt') -Raw).Trim()
$sourceIdentity = foreach ($spec in @(
    @('37e809ead5824bc753a1c3d56f11615bdb1296c5','src\Middleware\StaticFiles\src\HtmlDirectoryFormatter.cs','source-before.cs'),
    @($sourceCommit,'src\Middleware\StaticFiles\src\HtmlDirectoryFormatter.cs','source-after-2.cs'),
    @($sourceCommit,'src\Middleware\StaticFiles\test\UnitTests\HtmlDirectoryFormatterTests.cs','source-tests.cs')))
{
    $gitPath = $spec[1].Replace('\','/')
    $text = Get-Content (Join-Path $destination $spec[2]) -Raw
    $blob = @(git -C 'C:\src\aspnetcore' show "$($spec[0]):$gitPath") -join "`n"
    if ($LASTEXITCODE -or $text.Replace("`r`n","`n").TrimEnd("`n") -cne $blob)
    {
        throw 'Actual committed source differs from the tested/measured snapshot.'
    }
    [ordered]@{revision=$spec[0];path=$spec[1];source_snapshot=$spec[2];
        source_sha256=(Get-FileHash (Join-Path $destination $spec[2])).Hash;
        committed_blob=(git -C 'C:\src\aspnetcore' rev-parse "$($spec[0]):$gitPath");
        committed_source_equal_after_git_line_ending_canonicalization=$true}
}
@{candidate='F084';source_commit=$sourceCommit;documents=@($sourceIdentity)} |
    ConvertTo-Json -Depth 8 | Set-Content (Join-Path $destination 'committed-source-identity.json') -Encoding utf8
node -e "const fs=require('fs'),cp=require('child_process');fs.writeFileSync(process.argv[1],cp.execFileSync('git',['-C','C:\\src\\aspnetcore','diff','--binary','37e809ead5824bc753a1c3d56f11615bdb1296c5',process.argv[2],'--','src/Middleware/StaticFiles/src/HtmlDirectoryFormatter.cs','src/Middleware/StaticFiles/test/UnitTests/HtmlDirectoryFormatterTests.cs']));" (Join-Path $destination 'source.patch') $sourceCommit
if ($LASTEXITCODE) { throw 'Native source patch capture failed.' }
$copies.Add([ordered]@{kind='native-git-diff';original=$sourceCommit;destination='source.patch';
    bytes=(Get-Item (Join-Path $destination 'source.patch')).Length;
    sha256=(Get-FileHash (Join-Path $destination 'source.patch')).Hash})
if (@($copies.destination | Sort-Object -Unique).Count -ne $copies.Count)
{
    throw 'Duplicated authoritative raw copy destinations.'
}
$copies | ConvertTo-Json -Depth 6 |
    Set-Content (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8
$validation = [System.Collections.Generic.List[string]]::new()
$validation.Add('# Exact F084 validation commands and results')
$validation.Add('')
$validation.Add('Commands ran from C:\src\aspnetcore after `. .\activate.ps1`. CPU-heavy commands were serialized and builds used two workers. All20 new rows and78 existing directory-browser rows are validated individually;the unguarded prototype is an expected-red control.')
foreach ($spec in @(
    @('Original owning suite','tests-before\command.json','passed98/98,all20 new rows,exit0'),
    @('Rejected unguarded prototype','tests-naive-defaultless\command.json','96 passes/2 expected custom-override failures,exit1'),
    @('First guarded owning suite','tests-after\command.json','passed98/98,all20 new rows,exit0'),
    @('Selected depth-gated owning suite','tests-after-2\command.json','passed98/98,all20 new rows,exit0'),
    @('Original harness build','harness-build-before.json','passed,exit0;new external manifest justified restore'),
    @('First guarded harness build','harness-build-after.json','passed,exit0'),
    @('Selected harness build','harness-build-after-2.json','passed,exit0'),
    @('Original complete response contracts','contracts-before-command.json','passed24/24,exit0'),
    @('First guarded response contracts','contracts-after-command.json','passed24/24,exit0'),
    @('Selected response contracts','contracts-after-2-command.json','passed24/24,exit0'),
    @('Focused whitespace','formatting.json','passed,exit0')))
{
    $record = Get-Content (Join-Path $run $spec[1]) -Raw | ConvertFrom-Json
    $validation.Add('')
    $validation.Add("## $($spec[0]):$($spec[2])")
    $validation.Add('')
    $validation.Add('```powershell')
    $validation.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'","''") + "'" }) -join ' '))
    $validation.Add('```')
}
foreach ($record in Get-Content (Join-Path $run 'pdb-commands.json') -Raw | ConvertFrom-Json)
{
    if ($record.exit_code) { throw 'A source/PDB check did not pass.' }
    $validation.Add('')
    $validation.Add("## $($record.name) source/PDB:passed,exit0")
    $validation.Add('')
    $validation.Add('```powershell')
    $validation.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'","''") + "'" }) -join ' '))
    $validation.Add('```')
}
$validation | Set-Content (Join-Path $destination 'validation-commands.md') -Encoding utf8
[ordered]@{
    candidate='F084';baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5';
    branch='autoperf/F084-directory-breadcrumb-path-allocation';source_commit=$sourceCommit;
    disposition='Qualified default-encoder allocation/scaling draft;not merge-ready because HEAD/two-level/custom control timing costs remain.';
    source_scope=(Get-Content (Join-Path $run 'source-scope.json') -Raw | ConvertFrom-Json);
    selected_snapshot='after-2';selected_rounds=@(2,3);measured_comparisons=3;measured_source_strategies=2;
    comparison_budget_closed=$true;unmeasured_rejected_prototypes=1;
    public_api_or_default_change=$false;shipping_visibility_changes=$false;
    actual_producer='Real DirectoryBrowserMiddleware matching/provider -> HtmlDirectoryFormatter/encoder/prefixes/rows -> full UTF8 response/counting stream';
    unchanged_external_sink_and_provider=$true;raw_binaries_published=$false;
    retained_costs=@('Selected HEAD64/root medians+52.86/+49.41%;about36ns to55ns,zero heap',
        'Selected defaultTwo+4.12%,unchanged13624B/op','Selected customoverride64+8.59%,original override call behavior',
        'First strategy longTwo1K+14.26%,2048B/op extra;retained,not averaged with selected strategy');
    limits=@('No cause established for control timing movements;not harmless-noise or universal-benefit claims.',
        'Three-to-seven segment timing crossover unmeasured;two/three functional boundary tested.',
        'Full HTML prefix output growth,Split/join/full-string/UTF8 allocations remain.',
        'No physical-filesystem,hosted/browser,production-depth-distribution/throughput orother-platform/runtime claim.');
    shared_windows_host=$true;cpu_heavy_commands_serialized=$true;msbuild_max_workers=2;
    power_or_affinity_changed=$false;raw_source_reports_logs_copied_without_transformation=$true
} | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $destination 'provenance.json') -Encoding utf8
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --write
if ($LASTEXITCODE) { throw 'Raw-derived prepared-package audit failed.' }
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify
if ($LASTEXITCODE) { throw 'Prepared-package audit reproduction failed.' }
Write-Output "Packaged $(@(Get-ChildItem $destination -Recurse -File).Count) immutable F084 files before package-log/raw-copy verification."
