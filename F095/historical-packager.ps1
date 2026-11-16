$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F095'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$destination = Join-Path $output 'F095'
if (Test-Path -LiteralPath $destination)
{
    throw 'F095 evidence package exists; inspect instead of overwriting.'
}
if (@(git -C $output status --porcelain).Count)
{
    throw 'Dedicated results checkout must start clean.'
}
$copies = [System.Collections.Generic.List[object]]::new()
function Copy-Exact([string]$Source, [string]$Relative, [string]$Kind, [string]$Original)
{
    $target = Join-Path $destination $Relative
    New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $target
    $sha = (Get-FileHash -LiteralPath $Source).Hash
    if ($sha -cne (Get-FileHash -LiteralPath $target).Hash)
    {
        throw "Authoritative byte copy differs:$Relative"
    }
    $copies.Add([ordered]@{
        original = $Original
        destination = $Relative
        kind = $Kind
        bytes = (Get-Item -LiteralPath $target).Length
        sha256 = $sha
    })
}
function Copy-Run([string]$Relative)
{
    $folder = if ($Relative) { Join-Path $run $Relative } else { $run }
    foreach ($entry in Get-ChildItem -LiteralPath $folder -Force)
    {
        $path = if ($Relative) { "$Relative\$($entry.Name)" } else { $entry.Name }
        if ($entry.PSIsContainer)
        {
            if ($entry.Name -notin 'binaries', 'bin', 'obj', 'node_modules', '.git')
            {
                Copy-Run $path
            }
        }
        elseif ($entry.Extension -in '.cs', '.csproj', '.json', '.trx', '.log', '.txt', '.html', '.md', '.csv', '.diff', '.patch')
        {
            Copy-Exact $entry.FullName $path 'run' $path
        }
        elseif ($entry.Extension -in '.dll', '.pdb')
        {
            throw "Raw binary unexpectedly outside omitted outputs:$path"
        }
    }
}
Copy-Run ''
foreach ($pair in @(
    @('F095-acceptance.md', 'acceptance.md'),
    @('F095-results-readme.md', 'README.md'),
    @('F095-summarize.mjs', 'reproduce-analysis.mjs'),
    @('F095-xml-audit.ps1', 'F095-xml-audit.ps1'),
    @('F095-package-gitattributes.txt', '.gitattributes'),
    @('F095-package.ps1', 'historical-packager.ps1'),
    @('F095-verify-snapshot.ps1', 'historical-snapshot-verifier.ps1'),
    @('F095-measure.ps1', 'historical-budget-runner.ps1'),
    @('autoperf-benchmarks.ps1', 'historical-benchmark-runner.ps1'),
    @('autoperf-check-closure.mjs', 'historical-closure-verifier.mjs')
))
{
    Copy-Exact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
foreach ($file in Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'autoperf-runs\F071\tools') -File |
    Where-Object Extension -in '.cs', '.csproj')
{
    Copy-Exact $file.FullName "pdb-tools\$($file.Name)" 'pdb-tools' $file.Name
}
if (@($copies.destination | Sort-Object -Unique).Count -ne $copies.Count)
{
    throw 'Authoritative copy destinations must be unique.'
}
& node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify > $null
if ($LASTEXITCODE -ne 0)
{
    throw 'Copied raw/source/setup/GC/statistics/test/resource/restoration audit failed.'
}
& (Join-Path $destination 'F095-xml-audit.ps1') -RunRoot $destination -Variants before,after,restored -Verify
$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add('# Exact F095 commands and actual outcomes')
$lines.Add('')
$lines.Add('Every fresh dotnet shell activates `. .\activate.ps1` from C:\src\aspnetcore. CPU-heavy work is serialized; builds use max2 nodes. Three unchanged-strategy AB/BA/AB comparisons are closed3/3. The guarded prototype is not retained in shipping source.')
foreach ($entry in @(
    @('harness-restore-command.json', 'New external manifest restore'),
    @('harness-preparation1-command.json', 'Initial preparation build only; not producer verification'),
    @('harness-preparation2-command.json', 'Failed preparation compile:CS0173; corrected before freeze'),
    @('harness-preparation3-command.json', 'Corrected preparation build only'),
    @('original-preparation-verify-command.json', 'Failed initial producer setup:incomplete normal RazorPages service registration; not a passing behavioral check'),
    @('harness-preparation4-command.json', 'Final original harness build:0 warnings/errors'),
    @('original-preparation2-verify-command.json', 'Corrected actual original producer:12 cases/4 pending fault-cancel callers/4x5000 zero-byte batches'),
    @('test-before-command.json', 'All6 actual original owning test rows'),
    @('test-after-command.json', 'All6 actual prototype owning test rows'),
    @('harness-build-after-command.json', 'Prototype build:0 warnings/errors; identical retained original harness'),
    @('verify-before-command.json', 'Frozen original:12 actual cases/4 actual pending faults-cancellation/4x5000 zero-byte batches'),
    @('verify-after-command.json', 'Frozen prototype:matching actual producer/functional/resource observations; green/green, not allocation red/green'),
    @('build-restored-command.json', 'Actual original shipping owner rebuilt byte-identically:0 warnings/errors'),
    @('test-restored-command.json', 'All6 actual restored owning test rows; test-loaded owner DLL matches measured original')
))
{
    $record = Get-Content -LiteralPath (Join-Path $run $entry[0]) -Raw | ConvertFrom-Json
    $status = if ($record.exit_code -eq 0) { 'Passed' } else { 'Failed' }
    $lines.Add('')
    $lines.Add("## $($entry[0]): $status, exit$($record.exit_code); $($entry[1])")
    $lines.Add('```powershell')
    $lines.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'", "''") + "'" }) -join ' '))
    $lines.Add('```')
}
foreach ($variant in 'before', 'after')
{
    foreach ($record in @(Get-Content -LiteralPath (Join-Path $run "pdb-$variant-commands.json") -Raw | ConvertFrom-Json))
    {
        if ($record.exitCode -ne 0)
        {
            throw 'An actual cited PDB inspection failed.'
        }
        $lines.Add('')
        $lines.Add("## Actual $variant source portable-PDB inspection: Passed, exit0")
        $lines.Add('```powershell')
        $lines.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'", "''") + "'" }) -join ' '))
        $lines.Add('```')
    }
}
$execution = @(Get-Content -LiteralPath (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
if ($execution.Count -ne 6 -or @($execution | Where-Object exit_code -ne 0).Count)
{
    throw 'Six successful measured launches required.'
}
foreach ($record in $execution)
{
    $lines.Add('')
    $lines.Add("## $($record.label): Passed, exit0; all12 actual cases/8 retained results/3 actual warmups")
    $lines.Add('```powershell')
    $lines.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'", "''") + "'" }) -join ' '))
    $lines.Add('```')
}
$lines.Add('')
$lines.Add('`node .\reproduce-analysis.mjs . --verify`: Passed, exit0; all72 raw outcomes/36 pairs/576 actual console-linked results/216 warmups/72 hash-PID-linked setups, GC/statistics/CI arithmetic, actual source/PDB-record/full recorded closure/default-blob/producer/resource/test/restoration checks. Distribution quantiles and omitted DLL/PDB bytes are not independently revalidated by this public command.')
$lines.Add('`.\F095-xml-audit.ps1 -RunRoot . -Variants before,after,restored -Verify`: Passed; all18 actual rows/definitions/positive durations/6 exact matching identities per variant, no skips.')
$lines.Add('`git diff --check` and `git diff --quiet`: Passed, exit0; shipping source restored clean while unrelated untracked reports remain.')
$lines.Add('`git push autoperf autoperf/F095-sync-page-loader`: Passed, exit0; fork-only independent unchanged baseline branch.')
$lines.Add('`gh api repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf/F095-sync-page-loader`: Passed, exit0; actual source ref is37e809ead5824bc753a1c3d56f11615bdb1296c5.')
$lines | Set-Content -LiteralPath (Join-Path $destination 'validation-commands.md') -Encoding utf8
$copies | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8
foreach ($copy in $copies)
{
    if ((Get-FileHash -LiteralPath (Join-Path $destination $copy.destination)).Hash -cne $copy.sha256)
    {
        throw "Authoritative public copy changed:$($copy.destination)"
    }
}
[ordered]@{
    candidate = 'F095'
    verifiedCopies = $copies.Count
    allByteIdentical = $true
    rawBinariesPublished = $false
    actualRawSourceSetupGcStatisticsTestResourceAndRestorationAuditsPassed = $true
    nonmutatingAudits = $true
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $destination 'raw-file-copy-verification.json') -Encoding utf8
$files = @(Get-ChildItem -LiteralPath $destination -Recurse -File -Force)
if ($files.Count -ne $copies.Count + 3)
{
    throw 'Exact authoritative-plus-three-generated immutable file scope differs.'
}
[ordered]@{
    candidate = 'F095'
    authoritativeCopies = $copies.Count
    generatedRecords = 3
    immutableFiles = $files.Count
    allCopiedBytesVerified = $true
    rawBinaryBytesOmitted = $true
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'F095-package-counts.json') -Encoding utf8
Write-Output "F095:$($copies.Count) byte-identical authoritative copies/$($files.Count) immutable files; all source/raw/producer/test/restoration audits reproduced."
