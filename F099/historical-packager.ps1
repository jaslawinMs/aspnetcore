$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F099'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$destination = Join-Path $output 'F099'
if ((Test-Path -LiteralPath $destination) -or @(git -C $output status --porcelain).Count)
{
    throw 'F099 package requires a new destination and a clean dedicated evidence checkout.'
}
$copies = [System.Collections.Generic.List[object]]::new()
function Copy-Exact([string]$Source, [string]$Relative, [string]$Kind, [string]$Original)
{
    $target = Join-Path $destination $Relative
    New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $target
    $sha = (Get-FileHash -Algorithm SHA256 -LiteralPath $Source).Hash
    if ($sha -cne (Get-FileHash -Algorithm SHA256 -LiteralPath $target).Hash)
    {
        throw "Authoritative copy differs:$Relative"
    }
    $copies.Add([ordered]@{original=$Original; destination=$Relative; kind=$Kind; bytes=(Get-Item -LiteralPath $target).Length; sha256=$sha})
}
function Copy-Run([string]$Relative)
{
    $folder = if ($Relative) { Join-Path $run $Relative } else { $run }
    foreach ($entry in Get-ChildItem -LiteralPath $folder -Force)
    {
        $path = if ($Relative) { "$Relative\$($entry.Name)" } else { $entry.Name }
        if ($entry.PSIsContainer)
        {
            if ($entry.Name -notin 'binaries','bin','obj','node_modules','.git')
            {
                Copy-Run $path
            }
        }
        elseif ($entry.Extension -in '.cs','.csproj','.json','.trx','.log','.txt','.html','.md','.csv','.diff','.patch')
        {
            Copy-Exact $entry.FullName $path 'run' $path
        }
        elseif ($entry.Extension -in '.dll','.pdb','.exe')
        {
            throw "Unexpected binary outside omitted output:$path"
        }
    }
}
Copy-Run ''
foreach ($pair in @(
    @('F099-acceptance.md','acceptance.md'),
    @('F099-results-readme.md','README.md'),
    @('F099-summarize.mjs','reproduce-analysis.mjs'),
    @('F099-xml-audit.ps1','audit-owning-tests.ps1'),
    @('F099-closure.mjs','verify-live-closure.mjs'),
    @('F099-capture-source.ps1','historical-source-capture.ps1'),
    @('F099-capture-snapshot.ps1','historical-freeze.ps1'),
    @('F099-build.ps1','historical-build.ps1'),
    @('F099-reproduce.ps1','historical-probe-runner.ps1'),
    @('F099-measure.ps1','historical-original-profile-runner.ps1'),
    @('F099-package.ps1','historical-packager.ps1'),
    @('F099-package-gitattributes.txt','.gitattributes')
))
{
    Copy-Exact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
foreach ($file in Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'autoperf-runs\F071\tools') -File |
    Where-Object Extension -in '.cs','.csproj')
{
    Copy-Exact $file.FullName "pdb-tools\$($file.Name)" 'pdb-tools' $file.Name
}
if (@($copies.destination | Sort-Object -Unique).Count -ne $copies.Count)
{
    throw 'Authoritative destinations must be unique.'
}
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify > $null
if ($LASTEXITCODE) { throw 'Exact copied source/marker/proof/contract/setup/result/GC/statistics audit failed.' }
& (Join-Path $destination 'audit-owning-tests.ps1') -RunRoot $destination -Verify
$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add('# F099 exact recorded commands and actual outcomes')
$lines.Add('')
$lines.Add('Every fresh dotnet shell starts in C:\src\aspnetcore and activates `. .\activate.ps1`. Owning source stayed at37e809ead5824bc753a1c3d56f11615bdb1296c5 without shipping edits. CPU-heavy work serialized/max2 build nodes; one original9-case actual-void/null-reply sweep, zero source comparisons. Different deadline contracts/adapter costs are not equivalent-contract optimization variants.')
$lines.Add('')
function Quote-Argument([string]$Value)
{
    return "'" + $Value.Replace("'","''") + "'"
}
function Add-Command([string]$Name, [object]$Record)
{
    $names = @($Record.PSObject.Properties.Name)
    $field = @('actualExitCode','exitCode','exit_code' | Where-Object { $_ -in $names }) | Select-Object -First 1
    if (-not $field) { throw "Actual command outcome missing:$Name" }
    $code = $Record.$field
    $lines.Add("## $Name`: Actual exit$code")
    $lines.Add('```powershell')
    if ($Record.arguments)
    {
        $lines.Add('dotnet ' + (($Record.arguments | ForEach-Object { Quote-Argument $_ }) -join ' '))
    }
    elseif ($Record.command)
    {
        $lines.Add([string]$Record.command)
    }
    else
    {
        throw "Actual command arguments missing:$Name"
    }
    $lines.Add('```')
    $lines.Add('')
}
foreach ($file in Get-ChildItem -LiteralPath $run -Filter '*command*.json' -File | Sort-Object Name)
{
    $records = @(Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json)
    for ($i = 0; $i -lt $records.Count; $i++)
    {
        Add-Command "$($file.Name) / row$($i + 1)" $records[$i]
    }
}
Add-Command 'One actual original-only true-void BDN sweep' (Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
$lines.Add('Owning tests: exit0,8 actual passed/0 failed/0 skipped; exact definition/result/execution-ID/positive-duration audit. Existing compiled unchanged baseline was run with --no-build; actual test-source/PDB and local owner equal frozen owner, not assumed freshly compiled. Frozen compatibility: actual/expected exit0 with all20 observations; frozen public-void-reset-equivalence: expected/actual exit1 because earlier successful retained reused token becomes canceled. Not a shipping replacement/red-green fix/speedup. External source format/apply and verification passed before first build; build passed0 warnings/errors. No preparation failure or unfrozen execution was substituted into F099.')
$lines.Add('')
$branch = Get-Content (Join-Path $run 'source-branch-publication.json') -Raw | ConvertFrom-Json
$lines.Add('## Actual independent unchanged source branch: Passed, exits0')
$lines.Add('```powershell')
$lines.Add('git --no-pager diff --check')
$lines.Add('git diff --quiet HEAD --')
$lines.Add('git ' + (($branch.pushArguments | ForEach-Object { Quote-Argument $_ }) -join ' '))
$lines.Add('gh ' + (($branch.verificationArguments | ForEach-Object { Quote-Argument $_ }) -join ' '))
$lines.Add('```')
$lines.Add('Actual remote ref is37e809ead5824bc753a1c3d56f11615bdb1296c5; no shipping source commit or performance PR.')
$lines.Add('')
$lines.Add('`node .\reproduce-analysis.mjs <absolute-capsule> --verify`: Passed, exit0 against exact copied inputs;9 true-void/null-reply outcomes/72 samples/27 warmups/9 owner-harness-PID/protocol setup receipts,11 source/Git identities,12 executable PDB records plus pure-marker source/type binding,20 original observations per frozen mode/resources,8 owning tests and GC/sample/statistical/CI arithmetic. No independent confidence-distribution quantile or omitted DLL/PDB byte check.')
$lines.Add('`.\audit-owning-tests.ps1 -RunRoot <absolute-capsule> -Verify`: Passed;8 exact positive-duration results/definitions/execution IDs, zero skips.')
$lines.Add('`node F099-closure.mjs <absolute-actual-local-run> --verify`: Passed, exit0 before/after actual sweep and before packaging;62 frozen files/20 declared runtime assets. Requires omitted original local binaries, not portable binary rehash.')
$lines | Set-Content -LiteralPath (Join-Path $destination 'validation-commands.md')
$copies | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $destination 'authoritative-copy-manifest.json')
foreach ($copy in $copies)
{
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $destination $copy.destination)).Hash -cne $copy.sha256)
    {
        throw "Copied artifact changed:$($copy.destination)"
    }
}
[ordered]@{candidate='F099';verified_copies=$copies.Count;all_byte_identical=$true;raw_binaries_published=$false;
    copied_analysis_passed=$true;copied_exact_test_audit_passed=$true;source_comparisons=0;original_sweeps=1;
    note='Actual original void/marker/null-reply evidence copied without normalization;recorded source/PDB/closure proofs are not omitted-byte verification.'} |
    ConvertTo-Json -Depth 5 | Set-Content (Join-Path $destination 'raw-file-copy-verification.json')
$files = @(Get-ChildItem -LiteralPath $destination -Recurse -File)
if ($files.Count -ne $copies.Count + 3) { throw 'Only three authored metadata files may be outside authoritative copy mappings.' }
$files.Count | Set-Content (Join-Path $PSScriptRoot 'F099-immutable-file-count.txt')
Write-Output "F099 exact capsule:$($copies.Count) byte-identical copies/$($files.Count) immutable files;copied source/void contract/raw/statistical and8-row test audits passed."
