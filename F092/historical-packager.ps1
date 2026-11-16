$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F092'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$destination = Join-Path $output 'F092'
if (Test-Path -LiteralPath $destination)
{
    throw 'F092 package exists; inspect instead of overwriting.'
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
        throw "Authoritative copy differs:$Target"
    }
    $copies.Add([ordered]@{ original = $Original; destination = $Target; kind = $Kind;
        bytes = (Get-Item -LiteralPath $file).Length; sha256 = $sha })
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
            throw "Unexpected binary/PDB outside omitted outputs:$target"
        }
    }
}
Copy-RunFolder ''
foreach ($pair in @(
    @('F092-acceptance.md', 'acceptance.md'),
    @('F092-results-readme.md', 'README.md'),
    @('F092-summarize.mjs', 'reproduce-analysis.mjs'),
    @('F092-xml-audit.ps1', 'F092-xml-audit.ps1'),
    @('F092-package-gitattributes.txt', '.gitattributes'),
    @('F092-package.ps1', 'historical-packager.ps1'),
    @('autoperf-benchmarks.ps1', 'historical-benchmark-runner.ps1'),
    @('autoperf-check-closure.mjs', 'historical-closure-verifier.mjs')))
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
    throw 'Authoritative destinations are not unique.'
}
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify > $null
if ($LASTEXITCODE)
{
    throw 'Copied raw measurement/source/actual setup audit failed.'
}
& (Join-Path $destination 'F092-xml-audit.ps1') -RunRoot $destination -Verify
$validation = [System.Collections.Generic.List[string]]::new()
$validation.Add('# Exact F092 commands and outcomes')
$validation.Add('')
$validation.Add('From C:\src\aspnetcore, every fresh dotnet shell activated `. .\activate.ps1`. Builds requested -m:2; CPU-heavy commands ran serially. Three comparisons are closed.')
foreach ($pair in @(
    @('harness-restore-arguments.json', 'Passed, exit0; new external manifest restore'),
    @('harness-build-before-arguments.json', 'Passed, exit0; corrected actual-owner original build, two recorded deprecation warnings'),
    @('harness-build-after-arguments.json', 'Passed, exit0; candidate build, identical retained original harness'),
    @('test-before-arguments.json', 'Passed, exit0; all23 original actual tests, zero skips'),
    @('test-before-preservation-arguments.json', 'Passed, exit0; all26 original actual tests, including each of3 new theory rows'),
    @('test-after-arguments.json', 'Passed, exit0; all26 selected actual tests, including each of3 new theory rows'),
    @('verify-before-arguments.json', 'Expected resource red: nonzero process exit; all24 actual cases/15 probes reach the strict assertion,72 extra B/read'),
    @('verify-after-arguments.json', 'Passed, exit0; all24 actual cases/15 probes; strict resource green,0 extra B/read')))
{
    $arguments = @(Get-Content (Join-Path $run $pair[0]) -Raw | ConvertFrom-Json)
    $validation.Add('')
    $validation.Add("## $($pair[0]): $($pair[1])")
    $validation.Add('```powershell')
    $validation.Add('dotnet ' + (($arguments | ForEach-Object { "'" + $_.Replace("'", "''") + "'" }) -join ' '))
    $validation.Add('```')
}
foreach ($arguments in @(Get-Content (Join-Path $run 'formatting-arguments.json') -Raw | ConvertFrom-Json))
{
    $validation.Add('')
    $validation.Add('## Scoped whitespace verification: Passed, exit0, no changes')
    $validation.Add('```powershell')
    $validation.Add('dotnet ' + (($arguments | ForEach-Object { "'" + $_.Replace("'", "''") + "'" }) -join ' '))
    $validation.Add('```')
}
$executions = @(Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
if ($executions.Count -ne 6 -or @($executions | Where-Object exit_code -ne 0).Count)
{
    throw 'Exactly six successful measured launches required.'
}
foreach ($record in $executions)
{
    $validation.Add('')
    $validation.Add("## $($record.label): Passed, exit0; all24 cases,8 retained results and3 actual warmups")
    $validation.Add('```powershell')
    $validation.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'", "''") + "'" }) -join ' '))
    $validation.Add('```')
}
$validation.Add('')
$validation.Add('`node .\reproduce-analysis.mjs . --verify`: Passed, exit0;144 outcomes,1152 console-linked results,432 actual warmups,144 actual setup receipts, GC totals/report rounding, source/PDB-record/full closure checks. `.\F092-xml-audit.ps1 -RunRoot . -Verify`: Passed;75 actual unskipped rows/definitions/durations, matching26/26 preservation identities and all3 new rows on each owner.')
$validation.Add('`git diff --check` and staged-source whitespace verification: Passed, exit0. Exact remote source comparison confirms only2 owner additions/1 deletion and27 test additions/0 deletions. Actual original-host owner/four harness-source portable-PDB inspections: Passed; public audit rechecks records/source, not omitted binaries/PDB bytes.')
$validation.Add('Three unmeasured setup failures are preserved, not claimed as resource red or successful coverage. The original strict resource failure reached its assertion only after corrected actual-owner setup. One mistaken upstream push failed without modifying upstream; corrected authorized fork source push Passed.')
$validation | Set-Content (Join-Path $destination 'validation-commands.md') -Encoding utf8
$copies | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8
foreach ($copy in $copies)
{
    if ((Get-FileHash -LiteralPath (Join-Path $destination $copy.destination)).Hash -cne $copy.sha256)
    {
        throw "Copied authoritative evidence changed:$($copy.destination)"
    }
}
[ordered]@{
    candidate = 'F092'
    verified_copies = $copies.Count
    all_byte_identical = $true
    raw_binaries_published = $false
    all_actual_source_setup_console_gc_and_trx_audits_passed = $true
    nonmutating_audits = $true
} | ConvertTo-Json | Set-Content (Join-Path $destination 'raw-file-copy-verification.json') -Encoding utf8
Write-Output "F092:$($copies.Count) byte-identical copies;3/3 actual measurement and75-row TRX audits passed."
