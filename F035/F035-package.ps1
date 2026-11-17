$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F035'
$published = Join-Path $PSScriptRoot 'autoperf-published-results'
$target = Join-Path $published 'F035'
$source = Get-Content -Raw (Join-Path $run 'source-publication\verified-source-publication.json') | ConvertFrom-Json
$decision = Get-Content -Raw (Join-Path $run 'decision.json') | ConvertFrom-Json
$budget = Get-Content -Raw (Join-Path $run 'measurement-budget.json') | ConvertFrom-Json
$live = Get-Content -Raw (Join-Path $run 'live-file-audit.json') | ConvertFrom-Json
$whitespace = Get-Content -Raw (Join-Path $PSScriptRoot 'F035-publication-whitespace.json') | ConvertFrom-Json
$status = @(& git -C $published status --porcelain=v1)
if ($LASTEXITCODE -ne 0)
{
    throw 'Results checkout status probe failed.'
}
if ((Test-Path -LiteralPath $target) -or $status.Count -or
    !$source.actualAllSourceRefChecksPassed -or !$source.actualSourceTrackedUnchanged -or
    $decision.disposition -cne 'no-gain' -or $decision.actualFinalShippingChangedFiles -ne 0 -or
    !$budget.sourceComparisonBudgetClosed -or $budget.actualSourceComparisonsStarted -ne 3 -or
    $budget.actualSourceComparisonsCompleted -ne 3 -or $budget.actualSourceComparisonsConcluded -ne 3 -or
    $live.actualFrozenConsumerFileChecks -ne 1216 -or $live.actualUniqueRehashedFiles -ne 1318 -or
    $live.actualLoadedAssemblyBindingObservations -ne 834 -or $whitespace.actualAuthoredPublicationWhitespaceExit -ne 0)
{
    throw 'Require fresh destination,clean results checkout and complete audited/restored no-gain outcome.'
}
$origin = (& git -C $published remote get-url origin).Trim()
if ($LASTEXITCODE -ne 0 -or $origin -notmatch '^https://github\.com/jaslawinMs/aspnetcore(?:\.git)?$')
{
    throw 'Evidence writes belong only in the public fork results checkout.'
}
$files = @(Get-ChildItem -LiteralPath $run -Recurse -File -Force)
$allowed = '.cs','.csproj','.json','.trx','.log','.txt','.html','.md','.csv','.patch','.diff','.ps1',
    '.mjs','.stdout','.stderr','.config','.xml','.nuspec','.props','.targets','.cmd','.slnx','.sarif',
    '.baseline','.current','.working','.executed-source'
function Is-Omitted([string]$Relative, [string]$Extension)
{
    return $Relative -match '(^|\\)(bin|obj|consumer|image|images|\.git|node_modules)(\\|$)' -or
        $Extension -in '.dll','.exe','.pdb','.binlog','.nupkg','.snupkg'
}
foreach ($file in $files)
{
    $relative = [IO.Path]::GetRelativePath($run, $file.FullName)
    if (!(Is-Omitted $relative $file.Extension) -and $file.Name -cne '.editorconfig' -and $file.Extension -notin $allowed)
    {
        throw "Unclassified evidence artifact before packaging:$relative"
    }
}
$copies = [Collections.Generic.List[object]]::new()
$omissions = [Collections.Generic.List[object]]::new()
function Copy-Exact([string]$File, [string]$Relative, [string]$Kind)
{
    $destination = Join-Path $target $Relative
    if (Test-Path -LiteralPath $destination)
    {
        throw "Do not overwrite evidence:$Relative"
    }
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination)) | Out-Null
    Copy-Item -LiteralPath $File -Destination $destination
    $hash = (Get-FileHash -LiteralPath $File).Hash
    if ((Get-FileHash -LiteralPath $destination).Hash -cne $hash)
    {
        throw "Copied bytes differ:$Relative"
    }
    $copies.Add([ordered]@{
        original=$File;destination=$Relative;kind=$Kind;bytes=(Get-Item -LiteralPath $File).Length;sha256=$hash
    })
}
foreach ($file in $files)
{
    $relative = [IO.Path]::GetRelativePath($run, $file.FullName)
    if (Is-Omitted $relative $file.Extension)
    {
        $omissions.Add([ordered]@{
            original=$relative;bytes=$file.Length;sha256=(Get-FileHash -LiteralPath $file.FullName).Hash
            reason='Compiled,restore,build,package or frozen consumer tree omitted;exact hashes and textual source/native/test/closure receipts remain.'
        })
    }
    else
    {
        Copy-Exact $file.FullName $relative 'actual-run'
    }
}
foreach ($file in @(Get-ChildItem -LiteralPath $PSScriptRoot -File |
    Where-Object { $_.Name -like 'F035-*' -and $_.Extension -in '.ps1','.mjs' }))
{
    Copy-Exact $file.FullName $file.Name 'session-driver'
}
foreach ($mapping in @(
    @((Join-Path $PSScriptRoot 'F028-package-gitattributes.txt'),'.gitattributes'),
    @((Join-Path $PSScriptRoot 'F035-results-readme.md'),'publication-templates\results-readme.md'),
    @((Join-Path $PSScriptRoot 'F035-issue-template.md'),'publication-templates\issue-body.md'),
    @((Join-Path $PSScriptRoot 'F035-publication-whitespace.json'),'publication-templates\authored-whitespace.json'),
    @('C:\src\aspnetcore\docs\BuildFromSource.md','BuildFromSource-captured.md'),
    @('C:\src\aspnetcore\docs\CrossCuttingGuidance.md','CrossCuttingGuidance-captured.md'),
    @('C:\src\aspnetcore\LICENSE.txt','LICENSE.txt')
))
{
    Copy-Exact $mapping[0] $mapping[1] 'publication-source'
}
$copies | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $target 'authoritative-copy-manifest.json') -Encoding utf8NoBOM
$omissions | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $target 'omitted-file-manifest.json') -Encoding utf8NoBOM
$table = [regex]::Match((Get-Content -Raw (Join-Path $run 'comparison-results.md')), '(?m)^\| Profile[\s\S]+?(?=\r?\n\r?\n)').Value
if (!$table)
{
    throw 'Require actual complete audited paired-result table.'
}
$readme = (Get-Content -Raw (Join-Path $PSScriptRoot 'F035-results-readme.md')).
    Replace('@RESULTS_TABLE@', $table).Replace('@FRESH_DEFAULT@', $source.actualCurrentDefault)
if ($readme -match '@[A-Z_]+@')
{
    throw 'Unfilled evidence README placeholder.'
}
$readme | Set-Content (Join-Path $target 'README.md') -Encoding utf8NoBOM -NoNewline
$commands = [Collections.Generic.List[string]]::new()
$commands.Add('# F035 exact recorded commands and actual outcomes')
$commands.Add('')
$commands.Add('Historical observations,not overwrite/replay instructions. Three complete20-profile comparison pairs;timing budget permanently closed. One same-signature cast,withdrawn. Activate repository SDK before every dotnet command. Both34-row owning suites pass,0skipped. Three successful61-observation characterizations include20actual benchmark lifecycles each,not61additional E2E cases.')
$commands.Add('')
function Quote([string]$Value)
{
    return "'" + $Value.Replace("'","''") + "'"
}
foreach ($copy in $copies | Where-Object { $_.kind -ceq 'actual-run' -and $_.destination.EndsWith('.json') } | Sort-Object destination)
{
    $data = Get-Content -Raw (Join-Path $target $copy.destination) | ConvertFrom-Json
    foreach ($record in @($data))
    {
        $executable = if ($record.executable) { $record.executable } elseif ($record.command) { $record.command } else { '' }
        $arguments = if ($record.arguments) { @($record.arguments) } elseif ($record.args) { @($record.args) } else { @() }
        if (!$executable -or !$arguments.Count -or 'actualExitCode' -notin $record.PSObject.Properties.Name)
        {
            continue
        }
        $commands.Add("## $($copy.destination):actual exit $($record.actualExitCode)")
        $commands.Add('```powershell')
        if ($record.workingDirectory)
        {
            $commands.Add('Set-Location ' + (Quote $record.workingDirectory))
        }
        if ([IO.Path]::GetFileNameWithoutExtension($executable) -ceq 'dotnet')
        {
            $commands.Add('. .\activate.ps1')
        }
        $commands.Add('& ' + (Quote $executable) + ' ' + (($arguments | ForEach-Object { Quote $_ }) -join ' '))
        $commands.Add('```')
        $commands.Add('')
    }
}
$commands.Add('## Interpretation and boundaries')
$commands.Add('Both original/candidate owning34/34rows pass:29ValueProviderResult+5actual collection-binding rows,including both Boolean theory values;0skipped. Exact XML rows/outcomes/execution IDs and name multisets checked. Semantics preserved,not a behavioral bug-fix red/green claim.')
$commands.Add('Original/candidate/independently rebuilt relocated original each pass61exact concrete observations,including20actual benchmark lifecycles. Real request-query parsing/factory/provider and collection/simple binders;complete cursor data/Current/Reset/Dispose/null/culture/mutation/query/model/error records retained.')
$commands.Add('Initial standalone build fails2warnings/1error;correct context base type and explicit nullable entry guards produce0warnings/0errors thereafter. First untimed metadata characterization exits-532462766 on assumed generated state-machine name;actual compiler uses runtime Async IL. Failed image/partial witnesses retained;that process has no captured runtime PID.')
$commands.Add('Both forced owner-only --no-incremental rebuilds byte-match earlier tested source/DLL/PDB;Core unchanged. Restored test-bin owner copies are not new test executions. All6relocated source/project files byte-exact;path-dependent rebuilt harness PE/PDB identity not claimed.')
$commands.Add('Three successful timed pairs:120rows/960stdout-matched/recomputed samples,240settings observations. Primary-2.89/+1.85/-18.07%less time and1456B/op unchanged. Prepared8/64regress;Query8/64small positives/adverse controls/Count64round2+1Bop residual retained. MaxCV15.09%;no convincing general gain/native JIT-causation/structural-allocation/application-throughput claim.')
$commands.Add('Each measured304-file consumer differs in2owner files:302unchanged total includes2harness,leaving300other files. Live audit:1216consumer checks,834loaded-assembly binding observations,1318unique files. Nine recorded successful native processes checked;failed untimed metadata PID unknown. One hundred selected PE/PDB/source associations across10profiles,not complete provenance/coverage.')
$commands.Add('Original source/product restored,independent unchanged fork branch verified;no optimization commit or performance PR. Two non-timing presentation/patch-generation probes initially fail and are corrected;see postmeasurement-probe-limitations.json. Publication authoring checker also initially fails hash-table-expression parsing,corrected before successful checking/packaging;see authoring-check-correction.json. Shared,non-isolated Windows VM;no priority/affinity/power/OS-policy changes.')
$commands.Add('')
& node (Join-Path $target 'F035-audit.mjs') $target --verify `
    1> (Join-Path $PSScriptRoot 'F035-copied-audit.stdout') 2> (Join-Path $PSScriptRoot 'F035-copied-audit.stderr')
if ($LASTEXITCODE -ne 0)
{
    throw 'Copied text-only audit failed;retain package without additional timing.'
}
$commands.Add('## Copied read-only audit:actual exit0,passed during packaging')
$commands.Add('```powershell')
$commands.Add('node .\F035-audit.mjs . --verify')
$commands.Add('```')
$commands | Set-Content (Join-Path $target 'validation-commands.md') -Encoding utf8NoBOM
foreach ($copy in $copies)
{
    if ((Get-FileHash -LiteralPath (Join-Path $target $copy.destination)).Hash -cne $copy.sha256)
    {
        throw 'Copied authoritative evidence changed during packaging.'
    }
}
[ordered]@{
    candidate='F035';disposition='no-gain';actualByteExactCopies=$copies.Count
    actualHashedOmissions=$omissions.Count;actualCopiedPortableAuditPassed=$true
    actualSourceComparisons=3;actualCompletedSourceComparisonPairs=3;actualTimedNativeProfiles=6
    actualRawResultSamples=960;actualResultRows=120;actualSourceCommit=$source.sourceCommit
    actualFinalShippingChangedFiles=0;actualFailedInitialStandaloneBuildsRetained=1
    actualFailedUntimedCharacterizationsRetained=1;actualFailedUntimedMetadataRuntimePidCaptured=$false
    actualPassingStandaloneBuildWarnings=0;actualMeasuredHarnessDllAndPdbIdentical=$true
    historicalMeasuredSourcesAndImagesUnchanged=$true;rawNativeImagesPublished=$false
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $target 'raw-file-copy-verification.json') -Encoding utf8NoBOM
$count = @(Get-ChildItem -LiteralPath $target -Recurse -File -Force).Count
if ($count -ne $copies.Count + 5)
{
    throw 'Immutable capsule count differs from copies plus five generated receipts.'
}
$count | Set-Content (Join-Path $PSScriptRoot 'F035-immutable-file-count.txt') -Encoding utf8NoBOM
Write-Output "F035:$count immutable files,$($copies.Count)byte-exact copies,$($omissions.Count)hashed omissions;copied audit passed."
