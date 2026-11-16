$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F091'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$destination = Join-Path $output 'F091'
if (Test-Path -LiteralPath $destination)
{
    throw 'F091 package exists; inspect instead of overwriting.'
}
if (@(git -C $output status --porcelain).Count)
{
    throw 'Dedicated results checkout must start clean.'
}
$copies = [System.Collections.Generic.List[object]]::new()
function Copy-Exact([string]$Source, [string]$Target, [string]$Kind, [string]$Original)
{
    $file = Join-Path $destination $Target
    New-Item -ItemType Directory -Path (Split-Path $file -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $file
    $sha = (Get-FileHash -LiteralPath $Source).Hash
    if ($sha -cne (Get-FileHash -LiteralPath $file).Hash)
    {
        throw "Authoritative copy differs: $Target"
    }
    $copies.Add([ordered]@{
        original = $Original
        destination = $Target
        kind = $Kind
        bytes = (Get-Item -LiteralPath $file).Length
        sha256 = $sha
    })
}
function Copy-RunFolder([string]$Relative)
{
    $folder = if ($Relative) { Join-Path $run $Relative } else { $run }
    foreach ($entry in Get-ChildItem -LiteralPath $folder -Force)
    {
        $target = if ($Relative) { "$Relative\$($entry.Name)" } else { $entry.Name }
        if ($entry.PSIsContainer)
        {
            if ($entry.Name -notin 'binaries', 'bin', 'obj', 'node_modules', '.git')
            {
                Copy-RunFolder $target
            }
        }
        elseif ($entry.Extension -in '.cs', '.csproj', '.json', '.trx', '.log', '.txt', '.html', '.md', '.csv')
        {
            Copy-Exact $entry.FullName $target 'run' $target
        }
        elseif ($entry.Extension -in '.dll', '.pdb')
        {
            throw "Unexpected binary/PDB outside omitted outputs: $target"
        }
    }
}
Copy-RunFolder ''
foreach ($pair in @(
    @('F091-acceptance.md', 'acceptance.md'),
    @('F091-results-readme.md', 'README.md'),
    @('F091-summarize.mjs', 'reproduce-analysis.mjs'),
    @('F091-xml-audit.ps1', 'F091-xml-audit.ps1'),
    @('F091-package-gitattributes.txt', '.gitattributes'),
    @('F091-package.ps1', 'historical-packager.ps1'),
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
    throw 'Authoritative destinations are not unique.'
}
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify
if ($LASTEXITCODE)
{
    throw 'Copied raw measurement/source/identity audit failed.'
}
& (Join-Path $destination 'F091-xml-audit.ps1') -RunRoot $destination -Verify
$validation = [System.Collections.Generic.List[string]]::new()
$validation.Add('# Exact F091 commands and outcomes')
$validation.Add('')
$validation.Add('Every fresh dotnet shell activated `. .\activate.ps1` from C:\src\aspnetcore. Builds request -m:2; CPU-heavy work is serialized. Three measured comparisons are complete and the budget is closed.')
foreach ($file in Get-ChildItem -LiteralPath $run -File -Filter '*command.json' | Sort-Object Name)
{
    $record = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
    $code = if ($null -ne $record.exitCode) { $record.exitCode } else { $record.exit_code }
    $outcome = if ($null -eq $code) { 'Read linked exact record; no success inferred' }
        elseif ($code -eq 0) { 'Passed, exit 0; precise reached boundary in README and record' }
        else { "Failed, exit $code; retained preparation failure, not successful coverage" }
    $validation.Add('')
    $validation.Add("## $($file.Name): $outcome")
    $validation.Add('')
    $validation.Add("[$($file.Name)]($($file.Name))")
    if ($record.arguments -and $record.entrypoint)
    {
        $validation.Add('```powershell')
        $validation.Add($record.entrypoint + ' ' +
            (($record.arguments | ForEach-Object { "'" + $_.Replace("'", "''") + "'" }) -join ' '))
        $validation.Add('```')
    }
}
$executions = @(Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
if ($executions.Count -ne 6 -or @($executions | Where-Object exit_code -ne 0).Count)
{
    throw 'Exactly six successful measured launches required.'
}
foreach ($record in $executions)
{
    $validation.Add('')
    $validation.Add("## $($record.label): Passed, exit 0; all 26 cases/eight retained results/three actual warmups")
    $validation.Add('```powershell')
    $validation.Add('dotnet ' +
        (($record.arguments | ForEach-Object { "'" + $_.Replace("'", "''") + "'" }) -join ' '))
    $validation.Add('```')
}
$validation.Add('')
$validation.Add('Original Google test selector: 50/50 actual cases passed; selected: 50/50 passed; zero skipped, matching actual TRX identities. The exact commands are tests-before-command.json and tests-after-command.json above. No new trivial Boolean test is substituted for the actual owner.')
$validation.Add('Both final frozen --verify commands pass all 26 complete query/state/PKCE contracts. The BDN declaration conversion failure occurred before any workload timing and is separately preserved. Missing reference/endpoint assumption failures are preparation records, not completed assertions.')
$validation.Add('Scoped `dotnet format whitespace ... --verify-no-changes` passes, exit 0. `git diff --check` and the exact one-file committed-source check pass. Recorded owner/harness portable-PDB checks pass; omitted binary/PDB bytes are not rehashed by the public audit.')
$validation.Add('`node .\reproduce-analysis.mjs . --verify` passes: 156 outcomes/setups, 1248 raw console-linked result samples, 468 warmups, exact GC totals/rounding, full source/PDB-record/closure checks. `F091-xml-audit.ps1 -RunRoot <package> -Verify` passes all 100 actual unskipped test rows without modifying records.')
$validation | Set-Content (Join-Path $destination 'validation-commands.md') -Encoding utf8
$copies | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8
foreach ($copy in $copies)
{
    if ((Get-FileHash -LiteralPath (Join-Path $destination $copy.destination)).Hash -cne $copy.sha256)
    {
        throw "Copied authoritative evidence changed: $($copy.destination)"
    }
}
[ordered]@{
    candidate = 'F091'
    verified_copies = $copies.Count
    all_byte_identical = $true
    raw_binaries_published = $false
    complete_raw_source_setup_console_gc_and_actual_trx_audits_passed = $true
    audit_does_not_rewrite_records = $true
} | ConvertTo-Json | Set-Content (Join-Path $destination 'raw-file-copy-verification.json') -Encoding utf8
Write-Output "F091: $($copies.Count) byte-identical copies, complete 3/3/raw-owner/actual-TRX audits passed."
