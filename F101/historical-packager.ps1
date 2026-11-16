$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F101'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$destination = Join-Path $output 'F101'
if ((Test-Path -LiteralPath $destination) -or @(git -C $output status --porcelain).Count)
{
    throw 'F101 package requires a new destination and clean dedicated evidence checkout.'
}
$copies = [System.Collections.Generic.List[object]]::new()
function Copy-Exact([string]$Source, [string]$Relative, [string]$Kind, [string]$Original)
{
    $target = Join-Path $destination $Relative
    New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $target
    $sha = (Get-FileHash -Algorithm SHA256 -LiteralPath $Source).Hash
    if ($sha -cne (Get-FileHash -Algorithm SHA256 -LiteralPath $target).Hash) { throw "Authoritative copy differs:$Relative" }
    $copies.Add([ordered]@{original=$Original;destination=$Relative;kind=$Kind;bytes=(Get-Item -LiteralPath $target).Length;sha256=$sha})
}
function Copy-Run([string]$Relative)
{
    $folder = if ($Relative) { Join-Path $run $Relative } else { $run }
    foreach ($entry in Get-ChildItem -LiteralPath $folder -Force)
    {
        $path = if ($Relative) { "$Relative\$($entry.Name)" } else { $entry.Name }
        if ($entry.PSIsContainer)
        {
            if ($entry.Name -notin 'binaries','bin','obj','node_modules','.git') { Copy-Run $path }
        }
        elseif ($entry.Extension -in '.cs','.csproj','.json','.trx','.log','.txt','.html','.md','.csv','.diff','.patch','.ps1')
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
    @('F101-acceptance.md','acceptance.md'),
    @('F101-results-readme.md','README.md'),
    @('F101-summarize.mjs','reproduce-analysis.mjs'),
    @('F101-xml-audit.ps1','audit-owning-tests.ps1'),
    @('F101-closure.mjs','verify-live-closure.mjs'),
    @('F101-prepare.ps1','historical-prepare.ps1'),
    @('F101-capture-snapshot.ps1','historical-freeze.ps1'),
    @('F101-build.ps1','historical-build.ps1'),
    @('F101-reproduce.ps1','historical-probe-runner.ps1'),
    @('F101-measure.ps1','historical-original-profile-runner.ps1'),
    @('F101-publish-source.ps1','historical-source-branch-runner.ps1'),
    @('F101-package.ps1','historical-packager.ps1'),
    @('F101-package-gitattributes.txt','.gitattributes')
))
{
    Copy-Exact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
foreach ($file in Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'autoperf-runs\F071\tools') -File |
    Where-Object Extension -in '.cs','.csproj')
{
    Copy-Exact $file.FullName "pdb-tools\$($file.Name)" 'pdb-tools' $file.Name
}
if (@($copies.destination | Sort-Object -Unique).Count -ne $copies.Count) { throw 'Authoritative destinations must be unique.' }
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify > $null
if ($LASTEXITCODE) { throw 'Exact copied property/source/proof/contract/setup/preparation/raw/GC/statistical audit failed.' }
& (Join-Path $destination 'audit-owning-tests.ps1') -RunRoot $destination -Verify
$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add('# F101 exact recorded commands and actual outcomes')
$lines.Add('')
$lines.Add('Every fresh dotnet shell starts in C:\src\aspnetcore and activates `. .\activate.ps1`. Owning source remained37e809ead5824bc753a1c3d56f11615bdb1296c5 without shipping edits. CPU-heavy work serialized/max2 build nodes;one original9-case actual int-property sweep,zero source comparisons. Original deadline failure not repaired/credited as speedup;Get has no input args or serialization.')
$lines.Add('')
function Quote-Argument([string]$Value) { return "'" + $Value.Replace("'","''") + "'" }
function Add-Command([string]$Name, [object]$Record)
{
    $names = @($Record.PSObject.Properties.Name)
    $field = @('actualExitCode','exitCode','exit_code' | Where-Object { $_ -in $names }) | Select-Object -First 1
    if (-not $field) { throw "Actual command outcome missing:$Name" }
    $code = $Record.$field
    $lines.Add("## $Name`: Actual exit$code")
    $lines.Add('```powershell')
    if ($Record.arguments) { $lines.Add('dotnet ' + (($Record.arguments | ForEach-Object { Quote-Argument $_ }) -join ' ')) }
    elseif ($Record.command) { $lines.Add([string]$Record.command) }
    else { throw "Actual command arguments missing:$Name" }
    $lines.Add('```')
    $lines.Add('')
}
foreach ($file in Get-ChildItem -LiteralPath $run -Filter '*command*.json' -File | Sort-Object Name)
{
    $records = @(Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json)
    for ($i = 0; $i -lt $records.Count; $i++) { Add-Command "$($file.Name) / row$($i + 1)" $records[$i] }
}
Add-Command 'One actual original-only typed property BDN sweep' (Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
Add-Command 'Actual preparation parser failure before any statements executed' (Get-Content (Join-Path $run 'preparation-parser-failure.json') -Raw | ConvertFrom-Json)
$lines.Add('Preparation:firstscript actualexit1,redirection target on following physical line;exact originalscript/error/hash and unchanged priorbranch/no run retained. Corrected before new C# formatting/build;not benchmark/probe/source-comparison failure. Format/apply and verify passed before first build;0 warnings/errors.')
$lines.Add('Owning tests:exit0,16 exact passed/0 failed/0 skipped/positive durations. Existing baseline controls reused with --no-build and three exact test-source/PDB/local-owner associations;not dedicated timed-property coverage. Frozen characterization:actual/expected0;require-original-deadlines:actual/expected1;require-public-reuse-equivalence:actual/expected1. All three reach25 observations/3original failed deadlines/3actual awaited controls/3warm+3fresh rows. Not a compiled source replacement/redgreen fix/speedup.')
$branch = Get-Content (Join-Path $run 'source-branch-publication.json') -Raw | ConvertFrom-Json
$lines.Add('')
$lines.Add('## Actual independent unchanged source branch: Passed,exits0')
$lines.Add('```powershell')
$lines.Add('git --no-pager diff --check')
$lines.Add('git diff --quiet HEAD --')
$lines.Add('git ' + (($branch.pushArguments | ForEach-Object { Quote-Argument $_ }) -join ' '))
$lines.Add('gh ' + (($branch.verificationArguments | ForEach-Object { Quote-Argument $_ }) -join ' '))
$lines.Add('```')
$lines.Add('Actual remote ref37e809ead5824bc753a1c3d56f11615bdb1296c5;no source optimization commit or performance PR.')
$lines.Add('')
$lines.Add('`node .\reproduce-analysis.mjs <absolute-capsule> --verify`:Passed,exit0 on exact copied inputs;9 int-property outcomes/72 results/27 warmups/9 owner-harness-PID/GetValue3/Default0/typed731/reference-property-target47 setups,19 source/Git identities,16 executable PBD records,25 observations in three modes/resources/real pending/deadline/token/result producers,16 control tests/3 source proofs,all GC/rounding/sample-statistics/CI arithmetic and exact preparation failure. Not independent confidence-distribution quantiles or omitted binary rehash.')
$lines.Add('`.\audit-owning-tests.ps1 -RunRoot <absolute-capsule> -Verify`:Passed;16 exact result/definition/execution IDs,positive durations,zero skips.')
$lines.Add('`node F101-closure.mjs <absolute-actual-local-run> --verify`:Passed,exit0 before/after actual sweep and before packaging;62 frozen files/20 declared runtime assets. Requires omitted original local binaries,not portable binary rehash.')
$lines | Set-Content -LiteralPath (Join-Path $destination 'validation-commands.md')
$copies | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $destination 'authoritative-copy-manifest.json')
foreach ($copy in $copies)
{
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $destination $copy.destination)).Hash -cne $copy.sha256)
    {
        throw "Copied artifact changed:$($copy.destination)"
    }
}
[ordered]@{candidate='F101';verified_copies=$copies.Count;all_byte_identical=$true;raw_binaries_published=$false;
    copied_analysis_passed=$true;copied_exact_test_audit_passed=$true;source_comparisons=0;original_sweeps=1;
    note='Actual original GetValue/int731/CTS/lost deadline/reference scope/token evidence copied without normalization;pre-execution script failure retained. Recorded source/PDB/closure proofs are not omitted-byte verification.'} |
    ConvertTo-Json -Depth 5 | Set-Content (Join-Path $destination 'raw-file-copy-verification.json')
$files = @(Get-ChildItem -LiteralPath $destination -Recurse -File)
if ($files.Count -ne $copies.Count + 3) { throw 'Only three authored metadata files may be outside exact copy mappings.' }
$files.Count | Set-Content (Join-Path $PSScriptRoot 'F101-immutable-file-count.txt')
Write-Output "F101 exact capsule:$($copies.Count) byte-identical copies/$($files.Count) immutable files;copied property/raw/statistical/preparation and16-row test audits passed."
