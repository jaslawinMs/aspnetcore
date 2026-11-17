$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F032'
$published = Join-Path $PSScriptRoot 'autoperf-published-results'
$target = Join-Path $published 'F032'
$source = Get-Content -Raw (Join-Path $run 'source-publication\verified-source-publication.json') | ConvertFrom-Json
$decision = Get-Content -Raw (Join-Path $run 'decision.json') | ConvertFrom-Json
$budget = Get-Content -Raw (Join-Path $run 'measurement-budget.json') | ConvertFrom-Json
$live = Get-Content -Raw (Join-Path $run 'live-frozen-closure-audit.json') | ConvertFrom-Json
if ((Test-Path -LiteralPath $target) -or @(git -C $published status --porcelain).Count -or
    !$source.actualAllSourceRefChecksPassed -or $decision.disposition -cne 'no-gain' -or
    !$budget.sourceComparisonBudgetClosed -or $budget.actualSourceComparisonsStarted -ne 3 -or
    $budget.actualSourceComparisonsCompleted -ne 2 -or $budget.actualSourceComparisonsConcluded -ne 3 -or
    $decision.actualFinalShippingChanges -ne 0 -or $live.actualConsumerBindings -ne 1116 -or
    $live.actualUniquePhysicalFilesRehashed -ne 1259 -or $live.actualLoadedRuntimeBindings -ne 4589)
{
    throw 'Require a fresh destination,clean results checkout and audited closed no-gain outcome,including the failed slot.'
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
    Where-Object { $_.Name -like 'F032-*' -and $_.Extension -in '.ps1','.mjs' }))
{
    Copy-Exact $file.FullName $file.Name 'session-driver'
}
foreach ($mapping in @(
    @((Join-Path $PSScriptRoot 'F028-package-gitattributes.txt'),'.gitattributes'),
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
$readme = (Get-Content -Raw (Join-Path $PSScriptRoot 'F032-results-readme.md')).Replace('@RESULTS_TABLE@', $table)
if ($readme.Contains('@RESULTS_TABLE@'))
{
    throw 'Unfilled evidence README placeholder.'
}
$readme | Set-Content (Join-Path $target 'README.md') -Encoding utf8NoBOM -NoNewline
$commands = [Collections.Generic.List[string]]::new()
$commands.Add('# F032 exact recorded commands and actual outcomes')
$commands.Add('')
$commands.Add('Historical observations,not overwrite/replay instructions. Three attempt slots:one setup-only failed original,then two successful six-profile pairs;budget permanently closed. One compatible Flush guard. Producer/lifecycle/relocated reproduction is untimed. Activate the repository SDK before every dotnet command.')
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
$commands.Add('Corrected original,candidate and independently rebuilt relocated images each pass6completed+12additional actual OnStarting/default/error/cancel/wire contracts and6actual benchmark lifecycles. Earlier18-case images and initial11warning/0error uncharacterized preparation remain. Authoritative and relocated standalone builds have0warnings/0errors.')
$commands.Add('The first timed original attempt fails in async global setup before any statistical sample,null statistics and native exit-532462766retained. Void lifecycle adapters outside timing fix the harness;profile/source strategy/emitter/package unchanged. Only two pairs complete,not three;all3slots remain consumed.')
$commands.Add('A first incremental owner rebuild exits0but leaves the candidate product,so source/owner postcondition fails. Retain the wrapper failure;forced --no-incremental,BuildProjectReferences=false owner-only recompilation byte-matches tested original/candidate DLL/PDB without test reruns.')
$commands.Add('Four successful timed members:24reported rows,all192Workload.Result samples match stdout/JSON;mean/sample variance/SD/SE recomputed. Forty-eight successful plus two failed-attempt before/after settings observations match. Prepared Sync Flush regresses about1%in both pairs;ordinary target gains reverse,async controls move and allocations differ. No convincing overall gain or structural allocation/application-throughput claim.')
$commands.Add('Live physical audit:1259unique files/5795bindings,including1116consumer and4589loaded-assembly bindings. Measured harness DLL/PDB and184otherfiles identical;onlytested HTTP.sys DLL/PDB differ. Every successful listener(47)has stopped/disposed receipt;failed process has no graceful disposal receipt but its exit/absence is recorded. Copied audit rehashes text/receipts,not omitted native bytes.')
$commands.Add('')
& node (Join-Path $target 'F032-audit.mjs') $target --verify `
    1> (Join-Path $PSScriptRoot 'F032-copied-audit.stdout') 2> (Join-Path $PSScriptRoot 'F032-copied-audit.stderr')
if ($LASTEXITCODE -ne 0)
{
    throw 'Copied text-only audit failed;retain package without additional timing.'
}
$commands.Add('## Copied read-only audit:actual exit0,passed during packaging')
$commands.Add('```powershell')
$commands.Add('node .\F032-audit.mjs . --verify')
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
    candidate = 'F032'; disposition = 'no-gain'; actualByteExactCopies = $copies.Count
    actualHashedOmissions = $omissions.Count; actualCopiedPortableAuditPassed = $true
    actualSourceComparisons = 3; actualCompletedSourceComparisonPairs = 2; actualFailedSetupAttemptsRetained = 1
    actualTimedNativeProfiles = 4; actualRawResultSamples = 192; actualSourceCommit = $source.sourceCommit
    actualFinalShippingChanges = 0; actualPassingAuthoritativeStandaloneBuildWarnings = 0
    actualInitialUncharacterizedPreparationWarnings = 11; actualWhitespaceVerifiedBeforeMeasuredSourceFreeze = $true
    actualMeasuredHarnessDllAndPdbIdentical = $true; historicalMeasuredSourcesAndImagesUnchanged = $true
    rawNativeImagesPublished = $false
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $target 'raw-file-copy-verification.json') -Encoding utf8NoBOM
$count = @(Get-ChildItem -LiteralPath $target -Recurse -File -Force).Count
if ($count -ne $copies.Count + 5)
{
    throw 'Immutable capsule count differs from copies plus five generated receipts.'
}
$count | Set-Content (Join-Path $PSScriptRoot 'F032-immutable-file-count.txt') -Encoding utf8NoBOM
Write-Output "F032:$count immutable files,$($copies.Count)byte-exact copies,$($omissions.Count)hashed omissions;copied audit passed."
