$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F031'
$published = Join-Path $PSScriptRoot 'autoperf-published-results'
$target = Join-Path $published 'F031'
$source = Get-Content -Raw (Join-Path $run 'source-publication\verified-source-publication.json') | ConvertFrom-Json
$decision = Get-Content -Raw (Join-Path $run 'decision.json') | ConvertFrom-Json
$budget = Get-Content -Raw (Join-Path $run 'measurement-budget.json') | ConvertFrom-Json
$live = Get-Content -Raw (Join-Path $run 'live-frozen-closure-audit.json') | ConvertFrom-Json
if ((Test-Path -LiteralPath $target) -or @(git -C $published status --porcelain).Count -or
    !$source.actualAllSourceRefChecksPassed -or $decision.disposition -cne 'no-gain' -or
    !$budget.sourceComparisonBudgetClosed -or $budget.actualSourceComparisonsStarted -ne 3 -or
    $budget.actualSourceComparisonsCompleted -ne 3 -or $decision.actualFinalShippingChanges -ne 0 -or
    $live.actualConsumerBindings -ne 882 -or $live.actualUniquePhysicalFilesRehashed -ne 1000)
{
    throw 'Require a fresh destination, clean results checkout and fully audited/closed no-gain outcome.'
}
$copies = [Collections.Generic.List[object]]::new()
$omissions = [Collections.Generic.List[object]]::new()
function Copy-Exact([string]$File, [string]$Relative, [string]$Kind)
{
    $destination = Join-Path $target $Relative
    if (Test-Path -LiteralPath $destination)
    {
        throw "Do not overwrite evidence: $Relative"
    }
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination)) | Out-Null
    Copy-Item -LiteralPath $File -Destination $destination
    $hash = (Get-FileHash -LiteralPath $File).Hash
    if ((Get-FileHash -LiteralPath $destination).Hash -cne $hash)
    {
        throw "Copied bytes differ: $Relative"
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
            reason = 'Compiled,restore,build,package or frozen consumer tree omitted; exact hashes and textual source/native/test/closure receipts remain.'
        })
        continue
    }
    if ($file.Name -cne '.editorconfig' -and $file.Extension -notin '.cs','.csproj','.json','.trx','.log','.txt',
        '.html','.md','.csv','.patch','.diff','.ps1','.mjs','.stdout','.stderr','.config','.xml','.nuspec',
        '.props','.targets','.cmd','.slnx','.sarif','.baseline','.current','.working','.executed-source')
    {
        throw "Unclassified evidence artifact: $relative"
    }
    Copy-Exact $file.FullName $relative 'actual-run'
}
foreach ($file in @(Get-ChildItem -LiteralPath $PSScriptRoot -File |
    Where-Object { $_.Name -like 'F031-*' -and $_.Extension -in '.ps1','.mjs' }))
{
    Copy-Exact $file.FullName $file.Name 'session-driver'
}
foreach ($mapping in @(
    @((Join-Path $PSScriptRoot 'F028-package-gitattributes.txt'),'.gitattributes'),
    @('C:\src\aspnetcore\docs\BuildFromSource.md','BuildFromSource-captured.md'),
    @('C:\src\aspnetcore\src\Mvc\AGENTS.md','MVC-AGENTS-captured.md'),
    @('C:\src\aspnetcore\LICENSE.txt','LICENSE.txt')
))
{
    Copy-Exact $mapping[0] $mapping[1] 'publication-source'
}
$copies | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $target 'authoritative-copy-manifest.json') -Encoding utf8NoBOM
$omissions | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $target 'omitted-file-manifest.json') -Encoding utf8NoBOM
$results = Get-Content -Raw (Join-Path $run 'comparison-results.md')
$table = [regex]::Match($results, '(?m)^\| Profile[\s\S]+?(?=\r?\n\r?\n)').Value
if (!$table)
{
    throw 'Require the actual audited paired-result table.'
}
$readme = (Get-Content -Raw (Join-Path $PSScriptRoot 'F031-results-readme.md')).Replace('@RESULTS_TABLE@', $table)
if ($readme.Contains('@RESULTS_TABLE@'))
{
    throw 'Unfilled evidence README placeholder.'
}
$readme | Set-Content (Join-Path $target 'README.md') -Encoding utf8NoBOM -NoNewline
$commands = [Collections.Generic.List[string]]::new()
$commands.Add('# F031 exact recorded commands and actual outcomes')
$commands.Add('')
$commands.Add('Historical observations, not overwrite/replay instructions. Three actual source comparisons, six timed members, one compatible success-guard strategy. Budget permanently closed. Producer gates and relocated reproduction are untimed. Activate the repository SDK before every dotnet command.')
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
        $commands.Add("## $($copy.destination): actual exit $($record.actualExitCode)")
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
$commands.Add('Both fresh owning scopes: 525 passed, 0 failed, 0 skipped. All1050 actual TRX identities/outcomes parsed. Original test runner exits0 but its first wrapper exits1 after tests due an ordered-dictionary Measure-Object null Sum. Old wrapper and unchanged native/TRX/outcome bytes retained; corrected numeric-value aggregation reverifies the same invocation without a native test rerun.')
$commands.Add('Original measured and byte-exact relocated source preparations: direct five-file whitespace checks before freeze and Release builds pass, 0 warnings/0 errors. The candidate does not rebuild the harness: copy the original consumer and replace only actually tested ViewFeatures DLL/PDB. All other292files and measured harness DLL/PDB are identical. Restored original product DLL/PDB match original tested owner; restored owner build0warnings/0errors.')
$commands.Add('Each of original, candidate and relocated images: 6 completed profiles, 2 FindView fallbacks, 4 already-faulted/canceled real producers and 6 pending producer outcomes pass. Actual public Display/Editor, TemplateBuilder/TemplateRenderer and real RazorView/page produce the wait; no harness task wait. Ordered consumed content, encoding, exact errors/tokens, ViewData/model/prefix/additional data, view disposal and caller writer lifetime checked.')
$commands.Add('All6 timed native members succeed: 36 reported rows, all288 Workload.Result samples match native stdout and JSON; mean/sample variance/SD/SE recomputed. Seventy-two before/after settings observations match. Maximum CV32.92%; favorable long Display observations, target regressions, control movement and allocation residuals retained. No convincing overall gain, structural allocation or application-throughput claim.')
$commands.Add('Live physical audit: 1000 unique files/5200 bindings, including882consumer and4242loaded-assembly bindings. Matching frozen consumers hold both historical tested owner variants; current original product verified separately. Copied portable audit rehashes text/receipts, not omitted native bytes. Source/PDB witnesses are selected associations, not complete provenance/coverage.')
$commands.Add('')
$commands.Add('## Copied read-only audit: actual exit 0, passed during packaging')
$commands.Add('```powershell')
$commands.Add('node .\F031-audit.mjs . --verify')
$commands.Add('```')
$commands | Set-Content (Join-Path $target 'validation-commands.md') -Encoding utf8NoBOM
& node (Join-Path $target 'F031-audit.mjs') $target --verify `
    1> (Join-Path $PSScriptRoot 'F031-copied-audit.stdout') 2> (Join-Path $PSScriptRoot 'F031-copied-audit.stderr')
if ($LASTEXITCODE -ne 0)
{
    throw 'Copied text-only audit failed; retain package without additional timing.'
}
foreach ($copy in $copies)
{
    if ((Get-FileHash -LiteralPath (Join-Path $target $copy.destination)).Hash -cne $copy.sha256)
    {
        throw 'Copied authoritative evidence changed during packaging.'
    }
}
[ordered]@{
    candidate = 'F031'; disposition = 'no-gain'; actualByteExactCopies = $copies.Count
    actualHashedOmissions = $omissions.Count; actualCopiedPortableAuditPassed = $true
    actualSourceComparisons = 3; actualTimedNativeProfiles = 6; actualRawResultSamples = 288
    actualSourceCommit = $source.sourceCommit; actualFinalShippingChanges = 0
    actualPassingStandaloneBuildWarnings = 0; actualWhitespaceVerifiedBeforeMeasuredSourceFreeze = $true
    actualMeasuredHarnessDllAndPdbIdentical = $true; historicalMeasuredSourcesAndImagesUnchanged = $true
    rawNativeImagesPublished = $false
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $target 'raw-file-copy-verification.json') -Encoding utf8NoBOM
$count = @(Get-ChildItem -LiteralPath $target -Recurse -File -Force).Count
if ($count -ne $copies.Count + 5)
{
    throw 'Immutable capsule count differs from copies plus five generated receipts.'
}
$count | Set-Content (Join-Path $PSScriptRoot 'F031-immutable-file-count.txt') -Encoding utf8NoBOM
Write-Output "F031: $count immutable files, $($copies.Count) byte-exact copies, $($omissions.Count) hashed omissions; copied audit passed."
