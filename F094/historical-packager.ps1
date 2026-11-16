$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F094'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$destination = Join-Path $output 'F094'
if (Test-Path -LiteralPath $destination) { throw 'F094 package exists; inspect rather than overwrite.' }
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
    @('F094-acceptance.md', 'acceptance.md'), @('F094-results-readme.md', 'README.md'),
    @('F094-summarize.mjs', 'reproduce-analysis.mjs'), @('F094-xml-audit.ps1', 'F094-xml-audit.ps1'),
    @('F094-package-gitattributes.txt', '.gitattributes'), @('F094-package.ps1', 'historical-packager.ps1'),
    @('F094-capture-pdb.ps1', 'historical-pdb-capture.ps1'), @('autoperf-benchmarks.ps1', 'historical-benchmark-runner.ps1'),
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
if ($LASTEXITCODE) { throw 'Copied actual raw/source/setup/resource/committed-source audit failed.' }
& (Join-Path $destination 'F094-xml-audit.ps1') -RunRoot $destination -Verify
$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add('# Exact F094 commands and outcomes')
$lines.Add('')
$lines.Add('Every fresh dotnet shell activates `. .\activate.ps1` from C:\src\aspnetcore. CPU-heavy work is serial/max2 build nodes. Three unchanged-strategy comparisons are closed; no extra timed preparation attempt.')
foreach ($pair in @(
    @('harness-restore-arguments.json', 'Passed, exit0; new pinned external manifest restore'),
    @('harness-build-before-arguments.json', 'Passed, exit0; final original,0 warnings/errors after archived nullability correction'),
    @('harness-build-after-arguments.json', 'Passed, exit0; selected,0 warnings/errors, identical retained original harness'),
    @('test-before-arguments.json', 'Passed, exit0; all14 actual original owning RazorPage test rows'),
    @('test-after-arguments.json', 'Passed, exit0; all14 selected owning RazorPage test rows, matching actual identities/no skips'),
    @('verify-before-arguments.json', 'Passed, exit0; all36 actual cases,4 real full-view faults, public entry/task/token and4x5000-owner calipers'),
    @('verify-after-arguments.json', 'Passed, exit0; identical actual36 signatures/4 faults, synchronous72to0B resource effect, async72B/missing0B retained'),
    @('zero-wrapper-before-arguments.json', 'Expected red, actual exit-532462766; assertion reached,360000 extra completed-sync wrapper bytes across5000 real primed owners'),
    @('zero-wrapper-after-arguments.json', 'Passed, exit0; identical real-producer resource assertion green,0 completed-sync wrapper bytes'),
    @('format-whitespace-arguments.json', 'Passed, exit0; exact RazorPage whitespace seam verified without changes')))
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
    $lines.Add("## $($record.label): Passed, exit0; all36 actual cases,8 results/3 warmups")
    $lines.Add('```powershell')
    $lines.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'", "''") + "'" }) -join ' '))
    $lines.Add('```')
}
$lines.Add('')
$lines.Add('`node .\reproduce-analysis.mjs . --verify`: Passed, exit0;216 actual outcomes/108 pairs/1728 console-linked retained results/648 warmups/216 owner-harness-PID-linked setups, raw GC totals/rounding and sample mean/variance/SD/SE/median/CI-internal arithmetic; three exact source seams, actual committed canonical source bytes (only Git CRLF-to-LF differs from preserved measured source), PDB records, complete266/98 closure, real producer/HTML/pending/fault and resource red/green checks. CI distribution quantiles are not independently recomputed.')
$lines.Add('`.\F094-xml-audit.ps1 -RunRoot . -Verify`: Passed; all28 actual original/selected rows/definitions/positive durations and all14 exact matching identities/no skips. Existing tests and functional probes are green/green preservation, not fabricated correctness red.')
$lines.Add('`git diff --check` and staged check: Passed, exit0; exact one-file8 additions/3 deletions, no unrelated existing edits. Actual fork comparison and source bytes verified. Final declaration discovery: all4 exact public non-sealed benchmark methods. Initial three nullable-interface warnings and source archive retained; corrected before freeze, no extra timed comparison.')
$lines.Add('Razor compiler, hosted HTTP/server, browser, application throughput/frequency and isolated pending task-size checks were not run or claimed. No requested automated test was blocked before its assertion. Public audits cannot rehash omitted actual binary/PDB bytes.')
$lines | Set-Content (Join-Path $destination 'validation-commands.md') -Encoding utf8
$copies | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8
foreach ($copy in $copies)
{
    if ((Get-FileHash (Join-Path $destination $copy.destination)).Hash -cne $copy.sha256) { throw "Authoritative copy changed:$($copy.destination)" }
}
[ordered]@{ candidate = 'F094'; verified_copies = $copies.Count; all_byte_identical = $true;
    raw_binaries_published = $false; all_actual_source_setup_console_gc_test_and_resource_audits_passed = $true;
    nonmutating_audits = $true } | ConvertTo-Json |
    Set-Content (Join-Path $destination 'raw-file-copy-verification.json') -Encoding utf8
$count = @(Get-ChildItem -LiteralPath $destination -Recurse -File -Force).Count
if ($count -ne $copies.Count + 3) { throw 'Exact immutable copies plus3 generated records required.' }
$count | Set-Content (Join-Path $PSScriptRoot 'F094-immutable-file-count.txt') -Encoding ascii
Write-Output "F094:$($copies.Count) byte-identical copies,$count immutable files; actual closed3/3 source/producer/resource/raw/test audits passed."
