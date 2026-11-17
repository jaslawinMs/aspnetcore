$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F033'
$published = Join-Path $PSScriptRoot 'autoperf-published-results'
$target = Join-Path $published 'F033'
$source = Get-Content -Raw (Join-Path $run 'source-publication\verified-source-publication.json') | ConvertFrom-Json
$decision = Get-Content -Raw (Join-Path $run 'decision.json') | ConvertFrom-Json
$budget = Get-Content -Raw (Join-Path $run 'measurement-budget.json') | ConvertFrom-Json
$live = Get-Content -Raw (Join-Path $run 'live-frozen-closure-audit.json') | ConvertFrom-Json
if ((Test-Path -LiteralPath $target) -or @(git -C $published status --porcelain).Count -or
    !$source.actualAllSourceRefChecksPassed -or $decision.disposition -cne 'qualified-no-callback-scoped-fork-draft' -or
    !$budget.sourceComparisonBudgetClosed -or $budget.actualSourceComparisonsStarted -ne 3 -or
    $budget.actualSourceComparisonsCompleted -ne 3 -or $budget.actualSourceComparisonsConcluded -ne 3 -or
    $decision.actualFinalShippingChangedFiles -ne 1 -or $live.actualConsumerBindings -ne 744 -or
    $live.actualUniquePhysicalFilesRehashed -ne 866 -or $live.actualLoadedRuntimeBindings -ne 5576)
{
    throw 'Require a fresh destination,clean results checkout and audited closed qualified proposal.'
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
        original = $File; destination = $Relative; kind = $Kind; bytes = (Get-Item -LiteralPath $File).Length; sha256 = $hash
    })
}
foreach ($file in @(Get-ChildItem -LiteralPath $run -Recurse -File -Force))
{
    $relative = [IO.Path]::GetRelativePath($run, $file.FullName)
    if ($relative -match '(^|\\)(bin|obj|consumer|image|images|\.git|node_modules)(\\|$)' -or
        $file.Extension -in '.dll','.exe','.pdb','.binlog','.nupkg','.snupkg')
    {
        $omissions.Add([ordered]@{
            original = $relative; bytes = $file.Length; sha256 = (Get-FileHash -LiteralPath $file.FullName).Hash
            reason = 'Compiled,restore,build,package or frozen consumer tree omitted;exact hashes and textual source/native/test/closure receipts remain.'
        })
        continue
    }
    if ($file.Name -cne '.editorconfig' -and $file.Extension -notin '.cs','.csproj','.json','.trx','.log','.txt',
        '.html','.md','.csv','.patch','.diff','.ps1','.mjs','.stdout','.stderr','.config','.xml','.nuspec',
        '.props','.targets','.cmd','.slnx','.sarif','.baseline','.current','.working','.executed-source')
    {
        throw "Unclassified evidence artifact:$relative"
    }
    Copy-Exact $file.FullName $relative 'actual-run'
}
foreach ($file in @(Get-ChildItem -LiteralPath $PSScriptRoot -File |
    Where-Object { $_.Name -like 'F033-*' -and $_.Extension -in '.ps1','.mjs' }))
{
    Copy-Exact $file.FullName $file.Name 'session-driver'
}
foreach ($mapping in @(
    @((Join-Path $PSScriptRoot 'F028-package-gitattributes.txt'),'.gitattributes'),
    @((Join-Path $PSScriptRoot 'F033-results-readme.md'),'publication-templates\results-readme.md'),
    @((Join-Path $PSScriptRoot 'F033-issue-template.md'),'publication-templates\issue-body.md'),
    @((Join-Path $PSScriptRoot 'F033-pr-template.md'),'publication-templates\pr-body.md'),
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
    throw 'Require the actual audited paired-result table.'
}
$readme = (Get-Content -Raw (Join-Path $PSScriptRoot 'F033-results-readme.md')).Replace('@RESULTS_TABLE@', $table)
if ($readme.Contains('@RESULTS_TABLE@'))
{
    throw 'Unfilled evidence README placeholder.'
}
$readme | Set-Content (Join-Path $target 'README.md') -Encoding utf8NoBOM -NoNewline
$commands = [Collections.Generic.List[string]]::new()
$commands.Add('# F033 exact recorded commands and actual outcomes')
$commands.Add('')
$commands.Add('Historical observations,not overwrite/replay instructions. Three complete six-profile comparison pairs;timing budget permanently closed. One compatible Write-only guard. Original/candidate/relocated producer and actual benchmark lifecycles are characterized without timing. Activate repository SDK before every dotnet command.')
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
$commands.Add('Both native owning scopes:15passed,0failed,0skipped;same30exact TRX identities/outcomes parsed,including true/false theory rows. Thirteen full-host and two lower Listener rows per variant;lower rows bypass ResponseStream.')
$commands.Add('Corrected original,candidate and independently rebuilt relocated source each pass6completed+22additional actual OnStarting/default/error/cancel/ranged-byte/argument/first-zero contracts and6actual benchmark lifecycles. All52concrete semantic observations match,including native past-end ArgumentOutOfRangeException(count). All standalone builds have0warnings/0errors.')
$commands.Add('The first untimed original characterization fails an assumed exact base bounds-exception assertion;negative native exit and partial contracts retained. Corrected assertions and concrete error recording pass before shipping edit/timing. Runtime-reported public source-commit lookup returns404,not compiler provenance.')
$commands.Add('Both original/candidate owner-only forced --no-incremental,BuildProjectReferences=false rebuilds byte-match previously tested DLL/PDB/source without test/timing reruns. Initial null listener aggregation retained and corrected from original per-profile counts,not a new native/CIM observation.')
$commands.Add('Six successful timed members:36rows,all288Workload.Result samples match stdout/JSON;mean/sample variance/SD/SE recomputed. Seventy-two before/after settings observations match. No-callback supporting128B profile8.23/11.47/19.10%less time;declared callback primary+3.75/-4.99/+0.54%,preparedzero1.07-2.84%less,scaled/async mixed and allocation residuals retained. Not general/default/nonzero-throughput/structural-allocation/merge-ready gain.')
$commands.Add('Live physical audit:866unique files/6386bindings,including744consumer and5576loaded-assembly bindings. Each186-file measured consumer differs in2owner DLL/PDB;184unchanged total includes2harness files,leaving182other files. Every58started native listener has stopped/disposed receipt;10recorded native PIDs observed absent. Copied audit rehashes text/receipts,not omitted native bytes.')
$commands.Add('Initial source publication guard stops on advanced upstream main;fresh16source/history parity on783dc047 passes without new comparison. Published source053d19c LF-canonical text matches tested snapshot;historical measured build remains baseline37plus uncommitted guard.')
$commands.Add('')
& node (Join-Path $target 'F033-audit.mjs') $target --verify `
    1> (Join-Path $PSScriptRoot 'F033-copied-audit.stdout') 2> (Join-Path $PSScriptRoot 'F033-copied-audit.stderr')
if ($LASTEXITCODE -ne 0)
{
    throw 'Copied text-only audit failed;retain package without additional timing.'
}
$commands.Add('## Copied read-only audit:actual exit0,passed during packaging')
$commands.Add('```powershell')
$commands.Add('node .\F033-audit.mjs . --verify')
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
    candidate = 'F033'; disposition = $decision.disposition; actualByteExactCopies = $copies.Count
    actualHashedOmissions = $omissions.Count; actualCopiedPortableAuditPassed = $true
    actualSourceComparisons = 3; actualCompletedSourceComparisonPairs = 3
    actualFailedUntimedCharacterizationsRetained = 1; actualTimedNativeProfiles = 6; actualRawResultSamples = 288
    actualSourceCommit = $source.sourceCommit; actualHistoricalBuildHead = $source.actualMeasuredBuildHead
    actualFinalShippingChangedFiles = 1; actualPassingStandaloneBuildWarnings = 0
    actualWhitespaceVerifiedBeforeMeasuredSourceFreeze = $true; actualMeasuredHarnessDllAndPdbIdentical = $true
    historicalMeasuredSourcesAndImagesUnchanged = $true; rawNativeImagesPublished = $false
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $target 'raw-file-copy-verification.json') -Encoding utf8NoBOM
$count = @(Get-ChildItem -LiteralPath $target -Recurse -File -Force).Count
if ($count -ne $copies.Count + 5)
{
    throw 'Immutable capsule count differs from copies plus five generated receipts.'
}
$count | Set-Content (Join-Path $PSScriptRoot 'F033-immutable-file-count.txt') -Encoding utf8NoBOM
Write-Output "F033:$count immutable files,$($copies.Count)byte-exact copies,$($omissions.Count)hashed omissions;copied audit passed."
