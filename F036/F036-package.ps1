$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F036'
$published = Join-Path $PSScriptRoot 'autoperf-published-results'
$target = Join-Path $published 'F036'
$source = Get-Content -Raw (Join-Path $run 'source-publication\verified-source-publication.json') | ConvertFrom-Json
$decision = Get-Content -Raw (Join-Path $run 'decision.json') | ConvertFrom-Json
$budget = Get-Content -Raw (Join-Path $run 'source-comparison-budget.json') | ConvertFrom-Json
$live = Get-Content -Raw (Join-Path $run 'live-file-audit.json') | ConvertFrom-Json
$whitespace = Get-Content -Raw (Join-Path $PSScriptRoot 'F036-publication-whitespace.json') | ConvertFrom-Json
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
    $live.actualFrozenConsumerFileChecks -ne 1156 -or $live.actualUniqueRehashedFiles -ne 1255 -or
    $live.actualLoadedAssemblyBindingObservations -ne 824 -or $whitespace.actualAuthoredPublicationWhitespaceExit -ne 0)
{
    throw 'Require a fresh destination,clean fork checkout and complete audited/restored no-gain outcome.'
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
    Where-Object { $_.Name -like 'F036-*' -and $_.Extension -in '.ps1','.mjs' }))
{
    Copy-Exact $file.FullName $file.Name 'session-driver'
}
foreach ($mapping in @(
    @((Join-Path $PSScriptRoot 'F028-package-gitattributes.txt'),'.gitattributes'),
    @((Join-Path $PSScriptRoot 'F036-results-readme.md'),'publication-templates\results-readme.md'),
    @((Join-Path $PSScriptRoot 'F036-issue-template.md'),'publication-templates\issue-body.md'),
    @((Join-Path $PSScriptRoot 'F036-publication-whitespace.json'),'publication-templates\authored-whitespace.json'),
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
    throw 'Require the actual complete audited32-profile paired-result table.'
}
$readme = (Get-Content -Raw (Join-Path $PSScriptRoot 'F036-results-readme.md')).
    Replace('@RESULTS_TABLE@', $table).Replace('@FRESH_DEFAULT@', $source.actualCurrentDefault)
if ($readme -match '@[A-Z_]+@')
{
    throw 'Unfilled evidence README placeholder.'
}
$readme | Set-Content (Join-Path $target 'README.md') -Encoding utf8NoBOM -NoNewline
$commands = [Collections.Generic.List[string]]::new()
$commands.Add('# F036 exact recorded commands and actual outcomes')
$commands.Add('')
$commands.Add('Historical observations,not overwrite/replay instructions. One separate32-profile original-only diagnostic and three complete32-profile source-comparison pairs;both phase budgets permanently closed. Activate the repository SDK before every dotnet command. Original/candidate/restored-original19-row owning runs pass,zero skipped. Four successful characterizations each contain33semantic plus32actual benchmark lifecycle records.')
$commands.Add('')
function Quote([string]$Value)
{
    return "'" + $Value.Replace("'","''") + "'"
}
foreach ($copy in $copies | Where-Object { $_.kind -ceq 'actual-run' -and $_.destination.EndsWith('.json') } | Sort-Object destination)
{
    foreach ($record in @(Get-Content -Raw (Join-Path $target $copy.destination) | ConvertFrom-Json))
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
$commands.Add('All19XMLrows pass on original,candidate and restored original,including every8-row metadata and both null/23 integer theory cases;57executions,not57distinct cases. Preservation work,not a semantic bug-fix red/green claim.')
$commands.Add('Four33semantic/32lifecycle collections exactly match. Real public base/typed/copy producers,live source/first-write detachment,nested/stale cursors,unsuccessful Remove and derived-order materialization are exercised. No injected producer callbacks.')
$commands.Add('Original-only six-file relocation rebuilt0warnings/0errors and reproduced both entire record collections byte-for-byte,without retiming. Comparison harness not separately relocated;timed bodies unchanged across phases;measured original/candidate harness DLL/PDB identical.')
$commands.Add('Three source pairs192rows/1536samples plus separate32diagnostic rows/256samples:all1792stdout/JSONsamples matched;mean,sample variance,SD,SE recomputed. Primary takes1.93/7.54/10.66%more time;56B/opunchanged. All96paired allocation observations match. Favorable scaled rows and adverse controls retained. No fourth comparison.')
$commands.Add('Each measured289-file consumer differs in2owner files:287unchanged includes2harness,leaving285other files. Live audit:1156consumer checks,824loaded bindings,1255unique files;all11captured native runtime PIDs checked. Selected PE/PDB/source witnesses cover99document associations,not full provenance or coverage.')
$commands.Add('Twelve selected current-default files match;TemplateInfo constructor drift does not. Construction,detachment,writes excluded. Shared non-isolated Windows VM;no priority/affinity/power/OS-network changes. No full-current-main construction,Razor/HTTP,application throughput or native JIT-causation proof.')
$commands.Add('All standalone builds and native profiles pass. Non-timing authoring patch,statistics CLI-entry and combined-auditor path/schema corrections are retained separately;no raw timing,source-comparison budget or shipping source changed. Original shipping source/product restored;unchanged independent fork ref verified;no optimization commit or performance PR.')
$commands.Add('')
& node (Join-Path $target 'F036-audit.mjs') $target --verify `
    1> (Join-Path $PSScriptRoot 'F036-copied-audit.stdout') 2> (Join-Path $PSScriptRoot 'F036-copied-audit.stderr')
if ($LASTEXITCODE -ne 0)
{
    throw 'Copied text-only audit failed;retain package without additional timing.'
}
$commands.Add('## Copied read-only audit:actual exit0,passed during packaging')
$commands.Add('```powershell')
$commands.Add('node .\F036-audit.mjs . --verify')
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
    candidate='F036';disposition='no-gain';actualByteExactCopies=$copies.Count
    actualHashedOmissions=$omissions.Count;actualCopiedPortableAuditPassed=$true
    actualSourceComparisons=3;actualCompletedSourceComparisonPairs=3;actualTimedComparisonMembers=6
    actualPairedRawSamples=1536;actualPairedResultRows=192
    actualSeparateOriginalOnlyRuns=1;actualOriginalOnlyRows=32;actualOriginalOnlySamples=256
    actualAllRawSamples=1792;actualAllResultRows=224;actualSourceCommit=$source.sourceCommit
    actualFinalShippingChangedFiles=0;actualFailedBuildsOrNativeProfiles=0
    actualPassingStandaloneBuildWarnings=0;actualMeasuredHarnessDllAndPdbIdentical=$true
    historicalMeasuredSourcesAndImagesUnchanged=$true;rawNativeImagesPublished=$false
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $target 'raw-file-copy-verification.json') -Encoding utf8NoBOM
$count = @(Get-ChildItem -LiteralPath $target -Recurse -File -Force).Count
if ($count -ne $copies.Count + 5)
{
    throw 'Immutable capsule count differs from copies plus five generated receipts.'
}
$count | Set-Content (Join-Path $PSScriptRoot 'F036-immutable-file-count.txt') -Encoding utf8NoBOM
Write-Output "F036:$count immutable files,$($copies.Count)byte-exact copies,$($omissions.Count)hashed omissions;copied audit passed."
