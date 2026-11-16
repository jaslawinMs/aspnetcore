$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F093'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$destination = Join-Path $output 'F093'
if (Test-Path -LiteralPath $destination) { throw 'F093 package exists; inspect rather than overwrite.' }
if (@(git -C $output status --porcelain).Count) { throw 'Evidence checkout must start clean.' }
$copies = [System.Collections.Generic.List[object]]::new()
function Copy-Exact([string]$Source, [string]$Target, [string]$Kind, [string]$Original)
{
    $file = Join-Path $destination $Target
    New-Item -ItemType Directory -Path (Split-Path $file -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $file
    $sha = (Get-FileHash $Source).Hash
    if ($sha -cne (Get-FileHash $file).Hash) { throw "Authoritative copy differs:$Target" }
    $copies.Add([ordered]@{ original = $Original; destination = $Target; kind = $Kind;
        bytes = (Get-Item $file).Length; sha256 = $sha })
}
function Copy-RunFolder([string]$Relative)
{
    $folder = if ($Relative) { Join-Path $run $Relative } else { $run }
    foreach ($entry in Get-ChildItem -LiteralPath $folder -Force)
    {
        $target = if ($Relative) { "$Relative\$($entry.Name)" } else { $entry.Name }
        if ($entry.PSIsContainer)
        {
            if ($entry.Name -notin 'binaries', 'bin', 'obj', 'node_modules', '.git') { Copy-RunFolder $target }
        }
        elseif ($entry.Extension -in '.cs', '.csproj', '.json', '.trx', '.log', '.txt', '.html', '.md', '.csv', '.diff', '.patch')
        {
            Copy-Exact $entry.FullName $target 'run' $target
        }
        elseif ($entry.Extension -in '.dll', '.pdb') { throw "Unexpected raw binary outside omitted outputs:$target" }
    }
}
Copy-RunFolder ''
foreach ($pair in @(
    @('F093-acceptance.md', 'acceptance.md'), @('F093-results-readme.md', 'README.md'),
    @('F093-summarize.mjs', 'reproduce-analysis.mjs'), @('F093-xml-audit.ps1', 'F093-xml-audit.ps1'),
    @('F093-package-gitattributes.txt', '.gitattributes'), @('F093-package.ps1', 'historical-packager.ps1'),
    @('F093-capture-pdb.ps1', 'historical-pdb-capture.ps1'), @('autoperf-benchmarks.ps1', 'historical-benchmark-runner.ps1'),
    @('autoperf-check-closure.mjs', 'historical-closure-verifier.mjs')))
{
    Copy-Exact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
foreach ($file in Get-ChildItem (Join-Path $PSScriptRoot 'autoperf-runs\F071\tools') -File |
    Where-Object Extension -in '.cs', '.csproj')
{
    Copy-Exact $file.FullName "pdb-tools\$($file.Name)" 'pdb-tools' $file.Name
}
if (@($copies.destination | Sort-Object -Unique).Count -ne $copies.Count) { throw 'Copy destinations are not unique.' }
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify > $null
if ($LASTEXITCODE) { throw 'Copied actual raw/source/setup/resource/restoration audit failed.' }
& (Join-Path $destination 'F093-xml-audit.ps1') -RunRoot $destination -Verify
$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add('# Exact F093 commands and outcomes')
$lines.Add('')
$lines.Add('Every fresh dotnet shell activates `. .\activate.ps1` from C:\src\aspnetcore. CPU-heavy work is serial/max2 build nodes. Three unchanged-strategy comparisons are closed.')
foreach ($pair in @(
    @('harness-restore-arguments.json', 'Passed, exit0; new/changed external manifest restore'),
    @('harness-build-before-arguments.json', 'Passed, exit0; final original, two deprecation warnings retained'),
    @('harness-build-after-arguments.json', 'Passed, exit0; selected, identical retained original harness'),
    @('test-before-arguments.json', 'Passed, exit0; all3 actual original request-services rows'),
    @('test-after-arguments.json', 'Passed, exit0; all3 actual candidate request-services rows'),
    @('verify-before-arguments.json', 'Passed, exit0; all28 actual cases/10 probes/four genuine waits/4x5000 zero-byte disposal batches'),
    @('verify-after-arguments.json', 'Passed, exit0; identical actual producer/functional/resource observations; green/green, not red/green'),
    @('format-whitespace-arguments.json', 'Passed, exit0; scoped whitespace/no changes'),
    @('build-restored-arguments.json', 'Passed, exit0; actual Http DLL restored byte-identically'),
    @('test-restored-arguments.json', 'Passed, exit0; all3 actual restored rows, matching identities/no skips')))
{
    $arguments = @(Get-Content (Join-Path $run $pair[0]) -Raw | ConvertFrom-Json)
    $lines.Add('')
    $lines.Add("## $($pair[0]): $($pair[1])")
    $lines.Add('```powershell')
    $lines.Add('dotnet ' + (($arguments | ForEach-Object { "'" + $_.Replace("'", "''") + "'" }) -join ' '))
    $lines.Add('```')
}
foreach ($variant in 'before', 'after')
{
    foreach ($record in @(Get-Content (Join-Path $run "pdb-$variant-commands.json") -Raw | ConvertFrom-Json))
    {
        if ($record.exitCode) { throw 'Cited actual PDB command failed.' }
        $lines.Add('')
        $lines.Add("## Actual $variant portable-PDB source document: Passed, exit0")
        $lines.Add('```powershell')
        $lines.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'", "''") + "'" }) -join ' '))
        $lines.Add('```')
    }
}
$execution = @(Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
if ($execution.Count -ne 6 -or @($execution | Where-Object exit_code -ne 0).Count) { throw 'Six successful measured launches required.' }
foreach ($record in $execution)
{
    $lines.Add('')
    $lines.Add("## $($record.label): Passed, exit0; all28 actual cases,8 results/3 warmups")
    $lines.Add('```powershell')
    $lines.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'", "''") + "'" }) -join ' '))
    $lines.Add('```')
}
$lines.Add('')
$lines.Add('`node .\reproduce-analysis.mjs . --verify`: Passed, exit0;168 outcomes/84 pairs/1344 actual console results/504 warmups/168 hash-linked setup receipts, actual GC totals/rounding, source/PDB-record/full closure/resource/lifetime/restoration checks.')
$lines.Add('`.\F093-xml-audit.ps1 -RunRoot . -Verify`: Passed; all9 actual original/candidate/restored rows/definitions/positive durations and all3 exact matching identities/no skips. Original6 remain in actual-test-audit.json; restored3 are separately preserved in restored-test-audit.json/restoration.json. Source and actual owner DLL/PDB match measured original hashes.')
$lines.Add('`git diff --check`: Passed, exit0; source was restored clean. BDN declaration discovery: final4 exact public non-sealed methods found; earlier sealed-class command exited0 with no benchmarks and is not treated as a successful measurement. Corrected WebEncoders warning/metadata-host failure/prior logical verification are retained; no additional timed comparison.')
$lines | Set-Content (Join-Path $destination 'validation-commands.md') -Encoding utf8
$copies | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8
foreach ($copy in $copies)
{
    if ((Get-FileHash (Join-Path $destination $copy.destination)).Hash -cne $copy.sha256) { throw "Authoritative copy changed:$($copy.destination)" }
}
[ordered]@{ candidate = 'F093'; verified_copies = $copies.Count; all_byte_identical = $true;
    raw_binaries_published = $false; all_actual_source_setup_console_gc_test_and_restoration_audits_passed = $true;
    nonmutating_audits = $true } | ConvertTo-Json |
    Set-Content (Join-Path $destination 'raw-file-copy-verification.json') -Encoding utf8
Write-Output "F093:$($copies.Count) byte-identical copies; actual closed3/3 measurement/source/producer/restoration audits passed."
