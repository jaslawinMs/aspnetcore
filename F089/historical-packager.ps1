$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F089'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$destination = Join-Path $output 'F089'
if (Test-Path -LiteralPath $destination)
{
    throw 'F089 package already exists; inspect rather than overwrite.'
}
if (@(git -C $output status --porcelain).Count)
{
    throw 'Dedicated evidence checkout must start clean.'
}
$copies = [System.Collections.Generic.List[object]]::new()
function Copy-Exact([string]$Source, [string]$Target, [string]$Kind, [string]$Original)
{
    $file = Join-Path $destination $Target
    New-Item -ItemType Directory -Path (Split-Path $file -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $file
    $hash = (Get-FileHash -LiteralPath $Source).Hash
    if ($hash -cne (Get-FileHash -LiteralPath $file).Hash)
    {
        throw "Authoritative raw copy differs: $Target"
    }
    $copies.Add([ordered]@{
        kind = $Kind
        original = $Original
        destination = $Target
        bytes = (Get-Item -LiteralPath $file).Length
        sha256 = $hash
    })
}
function Copy-RunFolder([string]$Relative)
{
    $folder = Join-Path $run $Relative
    if (-not (Test-Path -LiteralPath $folder))
    {
        throw "Required evidence folder absent: $Relative"
    }
    foreach ($entry in Get-ChildItem -LiteralPath $folder -Force)
    {
        if ($entry.PSIsContainer)
        {
            if ($entry.Name -notin 'bin', 'obj', 'node_modules', '.git')
            {
                Copy-RunFolder "$Relative\$($entry.Name)"
            }
        }
        elseif ($entry.Extension -in '.cs', '.csproj', '.json', '.trx', '.log', '.txt',
            '.html', '.png', '.xml', '.mjs', '.js', '.md', '.csv')
        {
            Copy-Exact $entry.FullName "$Relative\$($entry.Name)" 'run' "$Relative\$($entry.Name)"
        }
    }
}
foreach ($file in Get-ChildItem -LiteralPath $run -File)
{
    if ($file.Extension -in '.dll', '.pdb')
    {
        throw 'Raw binaries/PDBs are intentionally not published.'
    }
    Copy-Exact $file.FullName $file.Name 'run' $file.Name
}
foreach ($folder in 'harness', 'tools', 'sample', 'desktop-states', 'manual-before-states',
    'manual-after-states', 'round-1-before', 'round-1-after', 'round-2-after', 'round-2-before',
    'e2e-results-before', 'e2e-results-after')
{
    Copy-RunFolder $folder
}
foreach ($pair in @(
    @('F089-acceptance.md', 'acceptance.md'),
    @('F089-results-readme.md', 'README.md'),
    @('F089-summarize.mjs', 'reproduce-analysis.mjs'),
    @('F089-xml-audit.ps1', 'F089-xml-audit.ps1'),
    @('F089-browser-probe.mjs', 'browser-probe.mjs'),
    @('F089-native-attribute-isolation.mjs', 'native-attribute-isolation.mjs'),
    @('F089-capture-fixtures.mjs', 'capture-fixtures.mjs'),
    @('F089-package-gitattributes.txt', '.gitattributes'),
    @('F089-package.ps1', 'historical-packager.ps1'),
    @('autoperf-benchmarks.ps1', 'historical-benchmark-runner.ps1'),
    @('autoperf-check-closure.mjs', 'historical-closure-verifier.mjs')))
{
    Copy-Exact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
$pdbTools = Join-Path $PSScriptRoot 'autoperf-runs\F071\tools'
foreach ($file in Get-ChildItem -LiteralPath $pdbTools -File | Where-Object Extension -in '.cs', '.csproj')
{
    Copy-Exact $file.FullName "pdb-tools\$($file.Name)" 'pdb-tools' $file.Name
}
if (@($copies.destination | Sort-Object -Unique).Count -ne $copies.Count)
{
    throw 'Authoritative copy destinations are not unique.'
}
& node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify
if ($LASTEXITCODE)
{
    throw 'Copied raw measurement/source/state arithmetic differs.'
}
& (Join-Path $destination 'F089-xml-audit.ps1') -RunRoot $destination -Verify
$validation = [System.Collections.Generic.List[string]]::new()
$validation.Add('# Exact F089 commands and results')
$validation.Add('')
$validation.Add('Every dotnet shell activated `. .\activate.ps1` from C:\src\aspnetcore. CPU-heavy work was serialized; builds request -m:2. The combined native/desktop budget is closed at 3/3.')
foreach ($file in Get-ChildItem -LiteralPath $run -File -Filter '*command.json' | Sort-Object Name)
{
    $record = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
    $code = if ($null -ne $record.exitCode) { $record.exitCode } else { $record.exit_code }
    $outcome = if ($null -eq $code) { 'read the raw startup/collection record and paired log; no success inferred' }
        elseif ($code -eq 0) { 'exit 0; precise validation boundary is stated in README and raw record' }
        else { "failed, exit $code; preserved prerequisite/collection failure, not credited as completed assertion or comparison" }
    $validation.Add('')
    $validation.Add("## $($file.Name): $outcome")
    $validation.Add('')
    $validation.Add("Exact raw record: [$($file.Name)]($($file.Name)).")
    if ($record.arguments)
    {
        $entrypoint = if ($record.entrypoint) { $record.entrypoint }
            elseif ($record.executable) { $record.executable }
            elseif ($record.arguments[0] -match '\.mjs$') { 'node' }
            elseif ($record.arguments[0] -match '\.dll$|^(build|restore|run|format|test)$') { 'dotnet' }
            else { $null }
        if (-not $entrypoint)
        {
            $validation.Add('Invocation mechanism is in the linked raw record; no executable is inferred.')
            continue
        }
        $validation.Add('```powershell')
        $validation.Add($entrypoint + ' ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'", "''") + "'" }) -join ' '))
        $validation.Add('```')
    }
}
$execution = @(Get-Content -LiteralPath (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
if ($execution.Count -ne 4 -or @($execution | Where-Object exit_code -ne 0).Count)
{
    throw 'Exactly four successful desktop launches required.'
}
foreach ($record in $execution)
{
    $validation.Add('')
    $validation.Add("## $($record.label): passed, exit 0, all 18 measured cases/eight result iterations")
    $validation.Add('')
    $validation.Add('```powershell')
    $validation.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'", "''") + "'" }) -join ' '))
    $validation.Add('```')
}
$validation.Add('')
$validation.Add('## Exact existing Client routing commands: original 5/5 pass, selected 5/5 pass, no skips')
foreach ($variant in 'before', 'after')
{
    $record = Get-Content -LiteralPath (Join-Path $run "e2e-test-$variant-command.json") -Raw | ConvertFrom-Json
    if ($record.exitCode) { throw 'Cited exact routing command failed.' }
    $validation.Add('')
    $validation.Add("**${variant}: all five actual TRX assertions passed; exit 0.**")
    $validation.Add('```powershell')
    $validation.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'", "''") + "'" }) -join ' '))
    $validation.Add('```')
}
$validation.Add('')
$validation.Add('Original/selected dependency-aware Debug E2E builds pass with zero warnings/errors. Original corrected and selected Release sample/harness builds pass with zero warnings/errors. Initial native temporary CA1305 compilation failed before its invariant-culture correction; both logs are retained. Source/PDB/PE verification commands and raw records are retained; their omitted input binaries are not independently reverified by the public-record auditor.')
$validation.Add('')
$validation.Add('Original Debug and original/selected successful Release canonical probes pass all ten actual changed-path owner cases plus same-page JS-only control, with zero real errors/failed requests. Initial bootstrap/event-property/native-Boolean-collection failures are not successes; see README and retained logs. Native custom calipers retain 80 results per phase, exact reused input/counts and unchanged allocation. This is one native pair, not BDN or whole-navigation evidence.')
$validation.Add('')
$validation.Add('`node .\reproduce-analysis.mjs . --verify` passes: 72 desktop outcomes/setups, 216 actual console warmups, 576 desktop/160 native result samples, source hash/PDB-record agreement and documented closure/parity records. `F089-xml-audit.ps1 -RunRoot <package> -Verify` passes all 10 unskipped actual TRX rows. Scoped owner whitespace command and `git diff --check` pass, exit 0.')
$validation | Set-Content -LiteralPath (Join-Path $destination 'validation-commands.md') -Encoding utf8
$copies | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8
foreach ($copy in $copies)
{
    if ((Get-FileHash -LiteralPath (Join-Path $destination $copy.destination)).Hash -cne $copy.sha256)
    {
        throw "Authoritative raw file changed: $($copy.destination)"
    }
}
[ordered]@{
    candidate = 'F089'
    verified_copies = $copies.Count
    all_byte_identical = $true
    raw_binaries_published = $false
    actual_source_state_console_report_trx_arithmetic_verified = $true
    verification_does_not_reserialize_audits = $true
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $destination 'raw-file-copy-verification.json') -Encoding utf8
Write-Output "F089 prepared: $($copies.Count) byte-identical authoritative copies; complete 3/3 and ten-row TRX audits pass."
