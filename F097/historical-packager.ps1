$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F097'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$destination = Join-Path $output 'F097'
if (Test-Path -LiteralPath $destination) { throw 'F097 package exists; inspect rather than overwrite.' }
if (@(git -C $output status --porcelain).Count) { throw 'Evidence checkout must start clean.' }
$copies = [System.Collections.Generic.List[object]]::new()
function Copy-Exact([string]$Source, [string]$Target, [string]$Kind, [string]$Original)
{
    $file = Join-Path $destination $Target
    New-Item -ItemType Directory -Path (Split-Path $file -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $file
    $sha = (Get-FileHash -LiteralPath $Source).Hash
    if ($sha -cne (Get-FileHash -LiteralPath $file).Hash) { throw "Authoritative copy differs:$Target" }
    $copies.Add([ordered]@{original=$Original;destination=$Target;kind=$Kind;bytes=(Get-Item $file).Length;sha256=$sha})
}
function Copy-RunFolder([string]$Relative)
{
    $folder = if ($Relative) { Join-Path $run $Relative } else { $run }
    foreach ($entry in Get-ChildItem -LiteralPath $folder -Force)
    {
        $target = if ($Relative) { "$Relative\$($entry.Name)" } else { $entry.Name }
        if ($entry.PSIsContainer)
        {
            if ($entry.Name -notin 'binaries','bin','obj','node_modules','.git','executed-unfrozen-build','baseline-tunedtests-binaries')
            {
                Copy-RunFolder $target
            }
        }
        elseif ($entry.Extension -in '.cs','.csproj','.json','.trx','.log','.txt','.html','.md','.csv','.diff','.patch')
        {
            Copy-Exact $entry.FullName $target 'run' $target
        }
        else { throw "Unexpected file outside explicitly omitted executable outputs:$target" }
    }
}
Copy-RunFolder ''
foreach ($pair in @(
    @('F097-acceptance.md','acceptance.md'),@('F097-results-readme.md','README.md'),
    @('F097-summarize.mjs','reproduce-analysis.mjs'),@('F097-xml-audit.ps1','F097-xml-audit.ps1'),
    @('F097-package-gitattributes.txt','.gitattributes'),@('F097-package.ps1','historical-packager.ps1'),
    @('F097-capture-snapshot.ps1','historical-snapshot-capture.ps1'),@('F097-closure.mjs','historical-closure-verifier.mjs'),
    @('F097-measure.ps1','historical-benchmark-runner.ps1'),@('F097-run-probe.ps1','historical-resource-probe-runner.ps1'),
    @('F097-verify-source.ps1','historical-remote-source-verifier.ps1')))
{
    Copy-Exact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
foreach ($file in Get-ChildItem (Join-Path $PSScriptRoot 'autoperf-runs\F071\tools') -File |
    Where-Object Extension -in '.cs','.csproj')
{
    Copy-Exact $file.FullName "pdb-tools\$($file.Name)" 'pdb-tools' $file.Name
}
if (@($copies.destination | Sort-Object -Unique).Count -ne $copies.Count) { throw 'Copy destinations are not unique.' }
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify > $null
if ($LASTEXITCODE) { throw 'Copied actual raw/source/setup/resource/committed-source audit failed.' }
foreach ($phase in 'before','baseline-newtests','baseline-tunedtests','after')
{
    $parameters = @{RunRoot=$destination;Phase=$phase;Verify=$true}
    if ($phase -ne 'before') { $parameters.IncludeProposedTests=$true }
    if ($phase -in 'baseline-tunedtests','after') { $parameters.IncludeExplicitTokenTest=$true }
    & (Join-Path $destination 'F097-xml-audit.ps1') @parameters
}
$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add('# Exact F097 commands and outcomes')
$lines.Add('')
$lines.Add('Every fresh dotnet shell activates `. .\activate.ps1` from C:\src\aspnetcore. CPU-heavy work serial/max2 build nodes. Three unchanged final-candidate comparisons are closed; prototype1 resource failure is retained, not a fabricated timed run.')
foreach ($name in 'owning-tests-before','owning-tests-baseline-newtests','owning-tests-baseline-tunedtests','owning-tests-after',
    'baseline-reuse-red','complete-baseline-red','candidate-reuse-green','frozen-baseline-reuse-red',
    'frozen-prototype1-reuse-red','frozen-candidate-reuse-green','surgical-whitespace-format-verify')
{
    $record = Get-Content -LiteralPath (Join-Path $run "$name-command.json") -Raw | ConvertFrom-Json
    $code = if ($null -ne $record.actualExitCode) { $record.actualExitCode } else { $record.exitCode }
    $expected = if ($null -ne $record.expectedExitCode) { "; originally expected$($record.expectedExitCode)" } else { '' }
    $lines.Add('')
    $lines.Add("## $name`: actual exit$code$expected")
    $lines.Add('```powershell')
    $lines.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'","''") + "'" }) -join ' '))
    $lines.Add('```')
}
foreach ($variant in 'before','after')
{
    foreach ($record in @(Get-Content (Join-Path $run "pdb-$variant-commands.json") -Raw | ConvertFrom-Json))
    {
        if ($record.exitCode) { throw 'Cited actual PDB command failed.' }
        $lines.Add('')
        $lines.Add("## Actual $variant portable-PDB source document: passed, exit0")
        $lines.Add('```powershell')
        $lines.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'","''") + "'" }) -join ' '))
        $lines.Add('```')
    }
}
$execution = @(Get-Content (Join-Path $run 'execution.json') -Raw | ConvertFrom-Json)
if ($execution.Count -ne 6 -or @($execution | Where-Object exit_code -ne 0).Count) { throw 'Six successful measured launches required.' }
foreach ($record in $execution)
{
    $lines.Add('')
    $lines.Add("## $($record.label): passed, exit0;50 actual cases,8 results/3 warmups")
    $lines.Add('```powershell')
    $lines.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'","''") + "'" }) -join ' '))
    $lines.Add('```')
}
$lines.Add('')
$lines.Add('## Source-associated final audits: passed')
$lines.Add('`node .\reproduce-analysis.mjs <absolute-capsule-path> --verify`: exit0;300 outcomes/150 pairs/2400 raw console-linked retained results/900 warmups/300 owner-harness-PID setups, raw GC/report rounding and sample mean/variance/SD/SE/median/CI-internal arithmetic,28 actual owner/producer/harness PDB proofs and one final test source proof, identical62/20 closures differing only owner DLL/PDB, same actual test assembly/original-proposed41-case owner associations, actual53 semantic rows and unchanged strict100B resource objective red/green; current-default14 blobs and later committed canonical source verified. CI distribution quantiles and omitted binary/PDB bytes are not independently recomputed.')
foreach ($phase in 'before','baseline-newtests','baseline-tunedtests','after')
{
    $count = switch ($phase) { before {34} baseline-newtests {40} default {41} }
    $options = if ($phase -eq 'before') { '' } elseif ($phase -eq 'baseline-newtests') { ' -IncludeProposedTests' } else { ' -IncludeProposedTests -IncludeExplicitTokenTest' }
    $lines.Add("``.\F097-xml-audit.ps1 -RunRoot <absolute-capsule-path> -Phase $phase$options -Verify``: passed; all$count exact actual definitions/results, positive durations/no skips.")
}
$lines.Add('Semantic probes and original/proposed41-case suites are green/green preservation; same frozen original/final-harness resource test is genuinely expected exit1/red to exit0/green. Prototype1 preserved112B failure, final96B <100B; shutdown difference288B >=200B. The candidate-reuse-green attempt originally expected0 but actually exited1 on a rebuilt harness; frozen-prototype1 repeats the same failure using the actual unchanged measured harness.')
$lines.Add('Exact final external harness build log: passed,0 warnings/errors, `harness-build-tuned-after.log`. Earlier original/final builds and initial nullable-preparation adjustments remain in raw logs; no invented argument/exit-code record for uninstrumented builds. For a fresh reproduction from the repository root after activation: `dotnet build <absolute-capsule-path>\harness\AutoPerf.Benchmarks.csproj -c Release -m:2 -p:AspNetCoreRoot=C:\src\aspnetcore -p:UseIisNativeAssets=false`; this portable-path example is not an additional measured comparison or claimed new execution.')
$lines.Add('`git diff --check` and staged source check: passed, exit0; only JSRuntime54 additions/8 deletions and JSRuntimeTest132 additions, no behavior-neutral existing cleanup. `F097-verify-source.ps1`: passed, actual remote independent source/source blobs match; only permitted Git CRLF-to-LF differs from preserved measured/PDB source. Exact whitespace command above passed, exit0.')
$lines.Add('No requested automated test was blocked before its assertion. Browser/UI/JavaScript/circuit/transport/server/WebAssembly interoperability, every-disposal-race, application frequency/hot-path/throughput and isolated object-layout/first-use performance are intentionally unverified. Public audits recheck recorded proofs/closure, not omitted raw executables.')
$lines | Set-Content (Join-Path $destination 'validation-commands.md') -Encoding utf8
$copies | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8
foreach ($copy in $copies)
{
    if ((Get-FileHash -LiteralPath (Join-Path $destination $copy.destination)).Hash -cne $copy.sha256)
    {
        throw "Authoritative copy changed:$($copy.destination)"
    }
}
[ordered]@{candidate='F097';verified_copies=$copies.Count;all_byte_identical=$true;raw_binaries_published=$false;
    all_actual_source_setup_console_gc_test_and_resource_audits_passed=$true;nonmutating_audits=$true} |
    ConvertTo-Json | Set-Content (Join-Path $destination 'raw-file-copy-verification.json') -Encoding utf8
$count = @(Get-ChildItem -LiteralPath $destination -Recurse -File -Force).Count
if ($count -ne $copies.Count + 3) { throw 'Exact immutable copies plus3 generated records required.' }
$count | Set-Content (Join-Path $PSScriptRoot 'F097-immutable-file-count.txt') -Encoding ascii
Write-Output "F097:$($copies.Count) byte-identical copies,$count immutable files; copied source/resource/raw/53-semantic/34-40-41-41-test audits passed."
