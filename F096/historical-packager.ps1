$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F096'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$destination = Join-Path $output 'F096'
if ((Test-Path -LiteralPath $destination) -or @(git -C $output status --porcelain).Count)
{
    throw 'Package destination must be new and the authorized results checkout clean.'
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
        elseif ($entry.Extension -in '.dll','.pdb')
        {
            throw "Unexpected raw binary outside omitted output:$path"
        }
    }
}
Copy-Run ''
foreach ($pair in @(
    @('F096-acceptance.md','acceptance.md'),
    @('F096-results-readme.md','README.md'),
    @('F096-summarize.mjs','reproduce-analysis.mjs'),
    @('F096-xml-audit.ps1','audit-owning-tests.ps1'),
    @('F096-closure.mjs','verify-live-closure.mjs'),
    @('F096-capture.ps1','historical-capture.ps1'),
    @('F096-measure-original.ps1','historical-original-profile-runner.ps1'),
    @('autoperf-benchmarks.ps1','historical-shared-benchmark-runner.ps1'),
    @('F096-package.ps1','historical-packager.ps1'),
    @('F096-package-gitattributes.txt','.gitattributes')
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
    throw 'Authoritative copy destination identities are not unique.'
}
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify > $null
if ($LASTEXITCODE -ne 0)
{
    throw 'Exact copied source/proof/contract/setup/result/GC/CI-arithmetic audit failed.'
}
& (Join-Path $destination 'audit-owning-tests.ps1') -RunRoot $destination -Verify
$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add('# Exact F096 commands and actual outcomes')
$lines.Add('')
$lines.Add('Each fresh dotnet shell activates `. .\activate.ps1` from C:\src\aspnetcore. Source stayed on the untouched baseline. CPU-heavy work was serialized/max2 build nodes. One original-only20-case sweep, zero source A/B comparisons; finite/infinity are different cancellation contracts, not a compatible optimization.')
$project = Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'
$lines.Add('')
$lines.Add('## New external manifest restore: Passed, exit0')
$lines.Add('```powershell')
$lines.Add("dotnet restore '$project' --disable-parallel --verbosity quiet -m:2 -p:Configuration=Release")
$lines.Add('```')
$lines.Add('')
$lines.Add('## Original and final external builds: Passed, exit0;0 warnings/errors')
$lines.Add('```powershell')
$lines.Add("dotnet build '$project' --no-restore -c Release -m:2 --verbosity minimal")
$lines.Add('```')
$lines.Add('Initial build/setup inputs and exact actual four-source PDB checks remain under preparation/initial-harness. The final frozen build follows the default/infinity controls and whitespace fixes.')
$filter = 'FullyQualifiedName~JSObjectReferenceTest|FullyQualifiedName~JSRuntimeExtensionsTest|FullyQualifiedName~JSRuntimeTest.InvokeAsync_CancelsAsyncTask_AfterDefaultTimeout|FullyQualifiedName~JSRuntimeTest.InvokeAsync_CompletesSuccessfullyBeforeTimeout|FullyQualifiedName~JSRuntimeTest.InvokeAsync_CancelsAsyncTasksWhenCancellationTokenFires|FullyQualifiedName~JSRuntimeTest.InvokeAsync_DoesNotStartWorkWhenCancellationHasBeenRequested'
$lines.Add('')
$lines.Add('## Existing actual owning tests: Passed, exit0;18 passed/0 failed/0 skipped')
$lines.Add('```powershell')
$lines.Add("dotnet test 'src\Components\JSInterop\test\Microsoft.JSInterop.Tests.csproj' --no-restore -c Release -m:2 --filter '$filter' --logger 'trx;LogFileName=owning-before.trx' --results-directory '$(Join-Path $run 'tests\before')'")
$lines.Add('```')
$lines.Add('Every actual result/definition identity and positive duration is checked by the strict18-row TRX audit; this passing completed/mock/runtime coverage does not repair the red object-reference TimeSpan deadline cases.')
$lines.Add('')
$lines.Add('## Initial whitespace verification: Failed, exit2; object-initializer line formatting, not behavior')
$lines.Add('```powershell')
$lines.Add("dotnet format whitespace '$project' --no-restore --verify-no-changes --verbosity quiet")
$lines.Add('```')
$lines.Add('The actual12 formatting diagnostics remain in harness-whitespace-before.log. The initial TRX audit also had an actual PowerShell parser failure (exit1, a leading -or line continuation); corrected before successful row auditing. Neither failed preparation is counted as a passing validation.')
$lines.Add('')
$lines.Add('## External whitespace application and final verification: Passed, exit0 each')
$lines.Add('```powershell')
$lines.Add("dotnet format whitespace '$project' --no-restore --verbosity quiet")
$lines.Add("dotnet format whitespace '$project' --no-restore --verify-no-changes --verbosity quiet")
$lines.Add('```')
foreach ($entry in @(
    @('initial-require-deadlines-execution.json','Initial actual original deadline gate','verification\initial'),
    @('verify-before-command.json','Frozen actual original deadline gate','verify-before')
))
{
    $record = Get-Content -LiteralPath (Join-Path $run $entry[0]) -Raw | ConvertFrom-Json
    $lines.Add('')
    $lines.Add("## $($entry[1]): Expected failure, exit1; exactly9 of15 finite deadline rows did not cancel")
    $lines.Add('```powershell')
    if ($record.arguments)
    {
        $lines.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'","''") + "'" }) -join ' '))
    }
    else
    {
        $lines.Add("dotnet '$(Join-Path $run 'harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll')' --require-deadlines --artifacts '$(Join-Path $run $entry[2])'")
    }
    $lines.Add('```')
    $lines.Add('All constructor/get/set rows reach real pending tasks and fail before their later public cleanup reply; invoke/void controls cancel all6 rows. No green-after-fix or verified performance gain exists. The frozen run also observes all5 live runtime-default/infinity pairs.')
}
foreach ($record in @(Get-Content -LiteralPath (Join-Path $run 'pdb-before-commands.json') -Raw | ConvertFrom-Json))
{
    if ($record.exitCode -ne 0)
    {
        throw 'Cited actual PDB command failed.'
    }
    $lines.Add('')
    $lines.Add('## Actual frozen source/PDB document inspection: Passed, exit0')
    $lines.Add('```powershell')
    $lines.Add('dotnet ' + (($record.arguments | ForEach-Object { "'" + $_.Replace("'","''") + "'" }) -join ' '))
    $lines.Add('```')
}
$execution = Get-Content -LiteralPath (Join-Path $run 'execution-original-profiles.json') -Raw | ConvertFrom-Json
if ($execution.exitCode -ne 0 -or $execution.sourceComparisons -ne 0)
{
    throw 'Actual original-only execution differs.'
}
$lines.Add('')
$lines.Add('## Actual original profile sweep: Passed, exit0; all20 cases/8 retained results/3 actual warmups per case')
$lines.Add('```powershell')
$lines.Add('dotnet ' + (($execution.arguments | ForEach-Object { "'" + $_.Replace("'","''") + "'" }) -join ' '))
$lines.Add('```')
$lines.Add('')
$lines.Add('`node .\reproduce-analysis.mjs <absolute-F096-directory> --verify`: Passed, exit0; every original outcome/sample/GC/statistics/CI arithmetic, source/Git/PDB-record/recorded closure, initial/frozen contract/control and resource observation. No omitted binary byte or distribution-quantile validation is claimed.')
$lines.Add('`.\audit-owning-tests.ps1 -RunRoot <absolute-F096-directory> -Verify`: Passed; all18 exact actual results/definitions and positive durations, zero skips.')
$lines.Add('`node F096-closure.mjs <absolute-actual-run-directory> --verify`: Passed, exit0 before and after actual measurements; all62 recursively copied files and20 declared runtime assets. This live command requires the local omitted binaries.')
$lines.Add('`git diff --check` and `git diff --quiet HEAD --`: Passed, exit0; no shipping changes.')
$lines.Add('`git push autoperf autoperf/F096-js-object-reference-timeouts`: Passed, exit0; authorized independent unchanged fork baseline.')
$lines.Add('`gh api repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf/F096-js-object-reference-timeouts`: Passed, exit0; actual source ref37e809ead5824bc753a1c3d56f11615bdb1296c5.')
$lines | Set-Content -LiteralPath (Join-Path $destination 'validation-commands.md')
$copies | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $destination 'authoritative-copy-manifest.json')
foreach ($copy in $copies)
{
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $destination $copy.destination)).Hash -cne $copy.sha256)
    {
        throw "Exact published copy changed:$($copy.destination)"
    }
}
[ordered]@{
    candidate='F096'; verifiedCopies=$copies.Count; allByteIdentical=$true; rawBinariesPublished=$false
    actualRawSourceSetupGcStatisticsOwningTestsAndContractObservationAuditsPassed=$true
    shippingDeadlineRepairVerified=$false; performanceGainVerified=$false; nonmutatingAudits=$true
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $destination 'raw-file-copy-verification.json')
$files = @(Get-ChildItem -LiteralPath $destination -Recurse -File -Force)
if ($files.Count -ne $copies.Count + 3)
{
    throw 'Authoritative-plus-three-generated immutable package scope differs.'
}
[ordered]@{
    candidate='F096'; authoritativeCopies=$copies.Count; generatedRecords=3; immutableFiles=$files.Count
    allCopiedBytesVerified=$true; rawBinaryBytesOmitted=$true
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'F096-package-counts.json')
"F096:$($copies.Count) exact authoritative copies/$($files.Count) immutable files; recorded source/producer/contract/control/measurement audits reproduced."
