$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F088'
$destination = Join-Path $PSScriptRoot 'autoperf-published-results\F088'
$manifest = Join-Path $destination 'authoritative-copy-manifest.json'
if (-not (Test-Path $manifest)) { throw 'The already-prepared F088 raw package is required.' }
if (Test-Path (Join-Path $destination 'raw-file-copy-verification.json')) { throw 'F088 package already finalized.' }
Copy-Item -LiteralPath (Join-Path $destination 'historical-packager.ps1') -Destination (Join-Path $run 'packager-original.ps1')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'F088-package.log') -Destination (Join-Path $run 'packager-attempt-1.log')
$copies = [System.Collections.Generic.List[object]]::new()
foreach ($copy in Get-Content $manifest -Raw | ConvertFrom-Json) { $copies.Add($copy) }
function Copy-Tracked([string]$Source, [string]$Target, [string]$Kind, [string]$Original)
{
    $file = Join-Path $destination $Target
    Copy-Item -LiteralPath $Source -Destination $file
    $hash = (Get-FileHash $Source).Hash
    if ($hash -cne (Get-FileHash $file).Hash) { throw "Raw copy differs:$Target" }
    $old = @($copies | Where-Object destination -ceq $Target)
    if ($old.Count -gt 1) { throw 'Ambiguous existing copy mapping.' }
    if ($old.Count)
    {
        $old[0].sha256 = $hash
        $old[0].bytes = (Get-Item $file).Length
    }
    else
    {
        $copies.Add([ordered]@{kind=$Kind;original=$Original;destination=$Target;
            bytes=(Get-Item $file).Length;sha256=$hash})
    }
}
Copy-Tracked (Join-Path $run 'actual-xml-audit.json') 'actual-xml-audit.json' 'run' 'actual-xml-audit.json'
foreach ($pair in @(
    @('F088-xml-audit.ps1','F088-xml-audit.ps1'),
    @('F088-package.ps1','historical-packager.ps1'),
    @('F088-results-readme.md','README.md'),
    @('F088-finish-package.ps1','historical-package-finisher.ps1')))
{
    Copy-Tracked (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
foreach ($name in 'xml-auditor-original.ps1','packager-original.ps1','packager-attempt-1.log','packaging-diagnosis.json')
{
    Copy-Tracked (Join-Path $run $name) $name 'run' $name
}
& (Join-Path $destination 'F088-xml-audit.ps1') -RunRoot $destination -Verify
& node (Join-Path $destination 'reproduce-analysis.mjs') $destination --published-records --verify
if ($LASTEXITCODE) { throw 'Prepared public-record audit differs from original host.' }
foreach ($copy in $copies)
{
    if ((Get-FileHash (Join-Path $destination $copy.destination)).Hash -cne $copy.sha256)
    {
        throw "Authoritative raw copy changed:$($copy.destination)"
    }
}
$copies | ConvertTo-Json -Depth 6 | Set-Content $manifest -Encoding utf8
@{candidate='F088';verified_copies=$copies.Count;all_byte_identical=$true;raw_binaries_published=$false;
    actual_source_state_console_report_xml_arithmetic_verified=$true;xml_verification_does_not_reserialize=$true} |
    ConvertTo-Json | Set-Content (Join-Path $destination 'raw-file-copy-verification.json') -Encoding utf8
Write-Output "F088 package finished: $($copies.Count) exact authoritative raw mappings;all33 pairs and82 actual XML outcomes verified."
